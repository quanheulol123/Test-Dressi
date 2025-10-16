import os, json, random, string, io, base64, re, requests
from urllib.parse import quote
from dotenv import load_dotenv
from pymongo import MongoClient
from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib import messages
from django.contrib.auth.hashers import make_password, check_password
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
import time
from datetime import datetime, timedelta
import jwt
from django.conf import settings
from google import genai
import threading
import boto3
from bson.objectid import ObjectId
from bson.errors import InvalidId
try:
    from .detectron2_helpers import segment_clothing, visualise_masks
    _SEGMENTATION_AVAILABLE = True
except ModuleNotFoundError as exc:
    segment_clothing = None
    visualise_masks = None
    _SEGMENTATION_AVAILABLE = False
    _SEGMENTATION_IMPORT_ERROR = exc
from botocore.exceptions import BotoCoreError, ClientError

load_dotenv()

# --- Mongo & R2 setup ---
MONGO_URI = os.getenv("MONGO_URI")
ACCOUNT_ID = os.getenv("CF_ACCOUNT_ID")
ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID")
SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY")
BUCKET = os.getenv("R2_BUCKET")
PUBLIC_URL_BASE = os.getenv("PUBLIC_URL_BASE")
GENAI_API_KEY = os.getenv("GENAI_API_KEY")

client = MongoClient(MONGO_URI)
images_db = client["outfits"]
collection = images_db["images"]
users_db = client["users_db"]
users_collection = users_db["users"]

s3 = boto3.client(
    's3',
    endpoint_url=f'https://{ACCOUNT_ID}.r2.cloudflarestorage.com',
    aws_access_key_id=ACCESS_KEY_ID,
    aws_secret_access_key=SECRET_ACCESS_KEY
)

genai_client = genai.Client(api_key=GENAI_API_KEY)
TOTAL_IMAGES = 20

# --- Helpers ---
fashion_synonyms = {
    "dress": ["gown", "cocktail dress", "evening wear"],
    "red": ["scarlet", "crimson", "burgundy"],
    "jacket": ["blazer", "coat", "cardigan"],
    "shirt": ["top", "blouse", "tee"],
    "pants": ["trousers", "slacks", "leggings"],
    "shoes": ["sneakers", "heels", "boots"]
}

def expand_queries(keywords):
    expanded = []
    for term in keywords:
        expanded.append(term.lower())
        if term.lower() in fashion_synonyms:
            expanded.extend(fashion_synonyms[term.lower()])
    return list(set(expanded))

def _normalize_to_list(value):
    if value is None:
        return []
    if isinstance(value, (list, tuple, set)):
        normalized = []
        for item in value:
            text = str(item).strip()
            if text:
                normalized.append(text)
        return normalized
    text = str(value).strip()
    return [text] if text else []

def _collect_values(data, *keys):
    collected = []
    for key in keys:
        if key in data:
            collected.extend(_normalize_to_list(data.get(key)))
    return collected

def safe_filename(name: str) -> str:
    return quote(name, safe='-_.')  

def get_weather_bucket(city: str = "Sydney") -> dict[str, object] | None:
    api_key = os.getenv("WEATHER_API")
    if not api_key:
        return None

    url = f"https://api.weatherapi.com/v1/current.json?key={api_key}&q={quote(city)}"
    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        data = response.json()
    except (requests.RequestException, ValueError):
        return None

    try:
        temp_c = float(data["current"]["temp_c"])
    except (KeyError, TypeError, ValueError):
        temp_c = None

    bucket = None
    if temp_c is not None:
        bucket = "hot" if temp_c >= 20 else "cold"

    location = data.get("location") if isinstance(data, dict) else {}
    resolved_city = None
    country = None
    if isinstance(location, dict):
        resolved_city = location.get("name")
        country = location.get("country")

    return {
        "bucket": bucket,
        "temperature": temp_c,
        "city": resolved_city or city,
        "country": country,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }
PASSWORD_REQUIREMENTS = re.compile(
    r"^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?\":{}|<>\\/~`_\[\]\-+=]).{8,}$"
)

def is_valid_password(password: str) -> bool:
    if not isinstance(password, str):
        return False
    return bool(PASSWORD_REQUIREMENTS.match(password))

def upload_to_r2(filename: str, file_bytes: bytes) -> str:
    if not file_bytes:
        return None
    try:
        s3.upload_fileobj(io.BytesIO(file_bytes), BUCKET, filename)
        return f"{PUBLIC_URL_BASE}{safe_filename(filename)}"
    except (BotoCoreError, ClientError) as e:
        print(f"Upload failed for {filename}: {e}")
        return None

def save_image_metadata(filename: str, keywords: list, r2_url: str, user_id=None):
    """
    Save image metadata and ensure all keywords are included as tags.
    """
    # Lowercase and deduplicate
    tags = list(set([k.lower() for k in keywords if k]))

    # Optional: add 'womenswear' if it’s in the filename but not in tags
    if "womenswear" in filename.lower() and "womenswear" not in tags:
        tags.append("womenswear")

    doc = {
        "filename": filename,
        "tags": tags,
        "created_at": datetime.utcnow(),
        "images": {"full": r2_url, "thumbnail": r2_url},
        "source_url": r2_url,
        "user_id": user_id
    }
    collection.insert_one(doc)

@csrf_exempt
def upload_and_segment(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=400)

    if not _SEGMENTATION_AVAILABLE:
        return JsonResponse({
            "error": "Clothing segmentation service is unavailable.",
            "details": str(_SEGMENTATION_IMPORT_ERROR)
        }, status=503)

    file = request.FILES.get("image")
    if not file:
        return JsonResponse({"error": "No image uploaded"}, status=400)

    image_bytes = file.read()
    masks, classes = segment_clothing(image_bytes)
    
    # Optional: return visualization
    vis_bytes = visualise_masks(image_bytes, masks)
    vis_base64 = base64.b64encode(vis_bytes).decode("utf-8")

    return JsonResponse({
        "num_items": len(masks),
        "visualization": f"data:image/jpeg;base64,{vis_base64}"
    })

# --- Views ---
def recommend_page(request):
    return render(request, "recommend.html")

@csrf_exempt
def signup(request):
    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")
        if not username or not password:
            messages.error(request, "Username and password required.")
            return redirect("signup")
        if not is_valid_password(password):
            messages.error(
                request,
                "Password must be at least 8 characters long and include one uppercase letter and one special character.",
            )
            return redirect("signup")
        if users_collection.find_one({"username": username}):
            messages.error(request, "Username already taken.")
            return redirect("signup")
        password_hash = make_password(password)
        users_collection.insert_one({
            "username": username,
            "password_hash": password_hash,
            "created_at": datetime.utcnow()
        })
        messages.success(request, "Signup successful! You can log in.")
        return redirect("login")
    return render(request, "signup.html")

@csrf_exempt
def signup_mongo(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid request"}, status=400)

    try:
        data = json.loads(request.body.decode("utf-8"))
    except (TypeError, json.JSONDecodeError):
        return JsonResponse({"error": "Invalid JSON payload"}, status=400)

    email = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()
    display_name = (data.get("displayName") or data.get("name") or "").strip()

    if not email or not password:
        return JsonResponse({"error": "Email and password are required."}, status=400)
    if not is_valid_password(password):
        return JsonResponse({
            "error": "Password must be at least 8 characters long and include one uppercase letter and one special character."
        }, status=400)

    existing_user = users_collection.find_one({
        "$or": [{"email": email}, {"username": email}]
    })
    if existing_user:
        return JsonResponse({"error": "Email already registered."}, status=409)

    password_hash = make_password(password)
    user_doc = {
        "email": email,
        "username": email,
        "password_hash": password_hash,
        "display_name": display_name,
        "created_at": datetime.utcnow()
    }
    result = users_collection.insert_one(user_doc)

    token = create_jwt(result.inserted_id)

    return JsonResponse({
        "access": token,
        "user": {
            "email": email,
            "displayName": display_name,
        }
    }, status=201)

@csrf_exempt
def login_page(request):
    return render(request, "login.html")

# --- JWT helpers ---
def create_jwt(mongo_id, expires_minutes=60*24):
    payload = {
        "user_id": str(mongo_id),
        "exp": datetime.utcnow() + timedelta(minutes=expires_minutes),
        "iat": datetime.utcnow()
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
    return token

def decode_jwt(token):
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        print("JWT expired")
        return None
    except jwt.InvalidTokenError as e:
        print(f"Invalid JWT: {e}")
        return None

# --- Login ---
@csrf_exempt
def login_mongo(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid request"}, status=400)

    try:
        data = json.loads(request.body.decode("utf-8"))
    except (TypeError, json.JSONDecodeError):
        return JsonResponse({"error": "Invalid JSON payload"}, status=400)

    email = (data.get("email") or data.get("username") or "").strip().lower()
    password = (data.get("password") or "").strip()

    if not email or not password:
        return JsonResponse({"error": "Email and password are required."}, status=400)

    user = users_collection.find_one({
        "$or": [{"email": email}, {"username": email}]
    })

    if not user or not check_password(password, user.get("password_hash", "")):
        return JsonResponse({"error": "Invalid credentials"}, status=401)

    token = create_jwt(user["_id"])
    display_name = user.get("display_name") or (user.get("username") or "").split("@")[0]

    return JsonResponse({
        "access": token,
        "user": {
            "email": user.get("email") or user.get("username"),
            "displayName": display_name.strip() if display_name else "",
        }
    })

# --- Views using custom JWT ---

wardrobe_collection = users_db["wardrobe"]

def get_auth_token(request):
    """Extract the Bearer token from headers."""
    auth = request.headers.get("Authorization") or request.META.get("HTTP_AUTHORIZATION")
    if auth and auth.startswith("Bearer "):
        return auth.split(" ")[1]
    return None

@csrf_exempt
def save_image(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid request"}, status=400)

    token = get_auth_token(request)
    if not token:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    decoded = decode_jwt(token)
    if not decoded:
        return JsonResponse({"error": "Invalid token"}, status=401)

    user_id = str(decoded["user_id"])
    data = json.loads(request.body)
    filename = data.get("filename")
    image_url = data.get("image_url")
    tags = data.get("tags", [])

    if not filename or not image_url:
        return JsonResponse({"error": "Missing data"}, status=400)

    wardrobe_collection.insert_one({
        "user_id": user_id,
        "filename": filename,
        "image_url": image_url,
        "tags": tags,
        "saved_at": datetime.utcnow()
    })

    return JsonResponse({"success": True})

@csrf_exempt
def get_wardrobe(request):
    if request.method != "GET":
        return JsonResponse({"error": "Invalid request"}, status=400)

    token = get_auth_token(request)
    if not token:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    decoded = decode_jwt(token)
    if not decoded:
        return JsonResponse({"error": "Invalid token"}, status=401)

    user_id = str(decoded["user_id"])
    saved_items = list(wardrobe_collection.find({"user_id": user_id}))
    wardrobe = []
    for item in saved_items:
        wardrobe.append({
            "id": str(item.get("_id")),
            "name": item.get("filename", ""),
            "image": item.get("image_url", ""),
            "tags": item.get("tags", [])
        })

    return JsonResponse({"wardrobe": wardrobe})

@csrf_exempt
def delete_wardrobe_item(request):
    if request.method != "DELETE":
        return JsonResponse({"error": "Invalid request method"}, status=405)

    token = get_auth_token(request)
    if not token:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    decoded = decode_jwt(token)
    if not decoded:
        return JsonResponse({"error": "Invalid token"}, status=401)

    try:
        payload = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        payload = {}

    item_id = payload.get("id") or payload.get("item_id")
    if not item_id:
        return JsonResponse({"error": "Missing wardrobe item id"}, status=400)

    try:
        object_id = ObjectId(item_id)
    except (InvalidId, TypeError):
        return JsonResponse({"error": "Invalid wardrobe item id"}, status=400)

    user_id = str(decoded["user_id"])
    result = wardrobe_collection.delete_one({"_id": object_id, "user_id": user_id})
    if result.deleted_count == 0:
        return JsonResponse({"error": "Wardrobe item not found"}, status=404)

    return JsonResponse({"success": True})

def generate(base_tags, image_count_per_weather=3, user_id=None):
    weather_types = ["hot", "cold"]

    normalized_tags = []
    for tag in base_tags or []:
        text = str(tag).strip().lower()
        if text and text not in normalized_tags:
            normalized_tags.append(text)

    if not normalized_tags:
        normalized_tags = ["casual", "womenswear"]

    # Join the normalized tags into a single query prompt
    query = " ".join(normalized_tags)

    time.sleep(1)

    for weather in weather_types:
        for i in range(image_count_per_weather):
            try:
                prompt_text = (
                    f"{query} women's fashion single outfit flatlay, "
                    f"high quality, white background, {weather} style"
                )
                print(f"[DEBUG] Generating {weather} image for query '{query}', attempt {i+1}")
                print(f"[DEBUG] Prompt text: {prompt_text}")

                response = genai_client.models.generate_content(
                    model='gemini-2.5-flash-image-preview',
                    contents=[prompt_text],
                )

                # Loop through all parts to find inline images
                for part in response.candidates[0].content.parts:
                    if getattr(part, 'inline_data', None):
                        image_bytes = part.inline_data.data
                        random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
                        safe_keywords = '___'.join(normalized_tags) or "outfit"
                        storage_filename = f"{safe_keywords}___{weather}___{random_suffix}.png"
                        search_filename = f"GENERATED_{safe_keywords}___{weather}___{random_suffix}.png"

                        # Upload to R2
                        r2_url = upload_to_r2(storage_filename, image_bytes)
                        if r2_url:
                            print(f"[DEBUG] Uploaded image to R2: {r2_url}")

                            # Save metadata in DB with the selected quiz tags
                            save_image_metadata(
                                storage_filename,
                                normalized_tags,
                                r2_url,
                                user_id=user_id
                            )
                            print(f"[DEBUG] Saved image metadata to DB: {storage_filename}")

                            # Mark as AI-generated
                            collection.update_one(
                                {"filename": storage_filename},
                                {"$set": {"search_filename": search_filename, "is_ai": True}}
                            )
                            print(f"[DEBUG] Marked image as AI-generated")

                            # Save to user's wardrobe if logged in
                            if user_id:
                                wardrobe_collection.insert_one({
                                    "user_id": user_id,
                                    "filename": storage_filename,
                                    "image_url": r2_url,
                                    "tags": normalized_tags,
                                    "saved_at": datetime.utcnow()
                                })

            except Exception as e:
                print(f"[DEBUG] Error generating {weather} image for '{query}': {e}")

# --- Get AI-generated Images ---
@api_view(["POST"])
@permission_classes([AllowAny])
@csrf_exempt
def get_generated_images(request):
    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    styles = _collect_values(data, "styles", "style")
    colours = _collect_values(data, "colours", "colour", "colors", "color")
    occasions = _collect_values(data, "occasions", "occasion")
    body_shapes = _collect_values(data, "bodyShapes", "bodyShape")
    skin_tones = _collect_values(data, "skinTones", "skinTone", "skin")

    keywords = [k.lower() for k in (styles + colours + occasions + body_shapes + skin_tones) if k]
    if not keywords:
        keywords = ["casual", "womenswear", "outfit"]
    keywords = expand_queries(keywords)

    print(f"[DEBUG] get_generated_images keywords: {keywords}")

    # Only fetch AI-generated images
    ai_images = list(collection.find(
        {"tags": {"$in": keywords}, "is_ai": True},
        {"filename": 1, "tags": 1, "images": 1}
    ).sort("created_at", -1).limit(TOTAL_IMAGES))

    print(f"[DEBUG] Found {len(ai_images)} AI-generated images in DB")

    output = []
    for doc in ai_images:
        url = doc["images"]["full"]
        output.append({
            "name": doc["filename"],
            "image": url,
            "tags": doc.get("tags", []),
            "source_url": url
        })

    return JsonResponse({"outfits": output})

@api_view(["POST"])
@permission_classes([AllowAny])
@csrf_exempt
def generate_outfits(request):
    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    styles = _collect_values(data, "styles", "style")
    body_shapes = _collect_values(data, "bodyShapes", "bodyShape")
    occasions = _collect_values(data, "occasions", "occasion")

    image_count = data.get("image_count", 4)
    try:
        image_count = int(image_count)
    except (TypeError, ValueError):
        image_count = 4
    image_count = max(1, min(image_count, 8))

    primary_style = (styles + ["casual"])[0]
    primary_body_shape = (body_shapes + ["womenswear"])[0]
    primary_occasion = occasions[0] if occasions else ""

    prompt_tokens = [primary_style, primary_body_shape]
    if primary_occasion:
        prompt_tokens.append(primary_occasion)
    prompt_tokens = [token for token in prompt_tokens if token]
    prompt_query = " ".join(prompt_tokens) or "casual womenswear"

    ai_images = []
    for idx in range(image_count):
        prompt_text = (
            f"{prompt_query} women's fashion single outfit flatlay, "
            f"high quality, white background, different accessories, variation {idx + 1}"
        )
        try:
            response = genai_client.models.generate_content(
                model='gemini-2.5-flash-image-preview',
                contents=[prompt_text],
            )

            for part in response.candidates[0].content.parts:
                if getattr(part, 'inline_data', None):
                    ai_images.append(part.inline_data.data)
                    break
        except Exception as exc:
            print(f"[DEBUG] Error generating image for '{prompt_text}': {exc}")

    outfits = []
    for image_bytes in ai_images:
        img_b64 = base64.b64encode(image_bytes).decode("utf-8")
        random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
        keywords_slug = '___'.join(prompt_tokens) if prompt_tokens else 'casual_womenswear'
        storage_name = f"{keywords_slug}___ai___{random_suffix}.png"
        display_name = f"GENERATED_{storage_name}"

        outfits.append({
            "name": display_name,
            "image": f"data:image/png;base64,{img_b64}",
            "tags": prompt_tokens,
            "source_url": None
        })

        r2_url = upload_to_r2(storage_name, image_bytes)
        if r2_url:
            save_image_metadata(storage_name, prompt_tokens, r2_url)

    random.shuffle(outfits)
    return JsonResponse({"outfits": outfits[:image_count]})

@api_view(["POST"])
@permission_classes([AllowAny])
@csrf_exempt
def recommend(request):
    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    collection_name = data.get("collection") or data.get("collectionName")
    if isinstance(collection_name, str):
        collection_name = collection_name.strip().lower() or None
    else:
        collection_name = None

    image_collection = collection
    if collection_name:
        try:
            image_collection = images_db[collection_name]
        except Exception:
            image_collection = collection
    should_generate = image_collection.name == collection.name

    styles = _collect_values(data, "styles", "style")
    body_shapes = _collect_values(data, "bodyShapes", "bodyShape")
    temperature = data.get('temperature')
    city = data.get('city') or data.get('location')
    if isinstance(city, str):
        city = city.strip() or None
    else:
        city = None

    token = get_auth_token(request)
    user_id = None
    if token:
        decoded = decode_jwt(token)
        if decoded:
            user_id = str(decoded["user_id"])

    style_tags = [str(k).strip().lower() for k in styles if k]
    body_shape_tags = [str(k).strip().lower() for k in body_shapes if k]

    base_tags: list[str] = []
    for tag in style_tags + body_shape_tags:
        if tag and tag not in base_tags:
            base_tags.append(tag)

    if not base_tags:
        base_tags = ["casual", "womenswear"]

    use_weather_value = data.get("use_weather")
    if use_weather_value is None:
        use_weather_value = data.get("useWeather")
    if isinstance(use_weather_value, str):
        use_weather = use_weather_value.strip().lower() in {"true", "1", "yes", "on"}
    else:
        use_weather = bool(use_weather_value)

    weather_info = {
        "requested": bool(use_weather),
        "applied": False,
        "tag": None,
        "source": None,
        "temperature": None,
        "city": city,
        "country": None,
        "fetched_at": None,
    }

    preferred_weather = None
    weather_data = None
    if use_weather:
        temp_value = None
        if temperature is not None:
            try:
                temp_value = float(temperature)
                preferred_weather = "hot" if temp_value >= 20 else "cold"
                weather_info.update(
                    applied=True,
                    tag=preferred_weather,
                    source="request",
                    temperature=temp_value,
                )
            except (TypeError, ValueError):
                preferred_weather = None
                temp_value = None
        if not preferred_weather:
            weather_data = get_weather_bucket(city or "Sydney")
            if weather_data:
                bucket = weather_data.get("bucket")
                if bucket:
                    preferred_weather = bucket
                    weather_info.update(
                        applied=True,
                        tag=bucket,
                        source="api",
                        temperature=weather_data.get("temperature"),
                    )
                weather_info["city"] = weather_data.get("city") or weather_info["city"]
                weather_info["country"] = weather_data.get("country")
                weather_info["fetched_at"] = weather_data.get("timestamp")
        if preferred_weather and preferred_weather not in base_tags:
            base_tags.append(preferred_weather)
    else:
        weather_data = None

    enforce_filters = should_generate
    expanded_queries = expand_queries(base_tags) if enforce_filters else []
    required_tags = set(base_tags) if enforce_filters else set()

    image_count = data.get('image_count', 4)
    try:
        image_count = int(image_count)
    except (TypeError, ValueError):
        image_count = 4
    image_count = max(1, min(image_count, TOTAL_IMAGES))

    exclude_names = set(_collect_values(data, "exclude_names", "excludeNames"))

    max_candidates = max(image_count * 4, 32)

    query_conditions = []
    if expanded_queries:
        query_conditions.append({"tags": {"$in": expanded_queries}})
    if preferred_weather:
        query_conditions.append({"tags": preferred_weather})

    if not query_conditions:
        query_filter: dict[str, object] = {}
    elif len(query_conditions) == 1:
        query_filter = query_conditions[0]
    else:
        query_filter = {"$and": query_conditions}

    seen_names = set()
    seen_images = set()
    response_images = []
    unique_exhausted = False

    def append_doc(doc, allow_repeat=False):
        filename = doc.get("filename")
        if not filename:
            return False
        if filename in seen_names:
            return False
        if not allow_repeat and filename in exclude_names:
            return False

        url = None
        images = doc.get("images") or {}
        if isinstance(images, dict):
            url = images.get("full") or images.get("thumbnail")
        if not url:
            url = doc.get("image")
        if not url:
            url = f"{PUBLIC_URL_BASE}{safe_filename(filename)}"

        if not url:
            return False

        if url in seen_images:
            return False

        source_url = doc.get("source_url") or url

        tags = doc.get("tags") or []
        normalized_tags = {str(tag).strip().lower() for tag in tags if isinstance(tag, str)}
        if required_tags and not required_tags.issubset(normalized_tags):
            return False

        response_images.append({
            "name": filename,
            "image": url,
            "tags": doc.get("tags", []),
            "source_url": source_url
        })
        seen_names.add(filename)
        seen_images.add(url)
        return len(response_images) >= image_count

    for doc in image_collection.find(query_filter).sort("created_at", -1).limit(max_candidates):
        if append_doc(doc):
            break

    if len(response_images) < image_count:
        fallback_conditions = [
            {"filename": {"$nin": list(seen_names.union(exclude_names))}}
        ]
        if preferred_weather:
            fallback_conditions.append({"tags": preferred_weather})
        if len(fallback_conditions) == 1:
            fallback_filter = fallback_conditions[0]
        else:
            fallback_filter = {"$and": fallback_conditions}
        for doc in image_collection.find(fallback_filter).sort("created_at", -1).limit(max_candidates):
            if append_doc(doc):
                break

    if len(response_images) < image_count:
        unique_exhausted = True
        repeat_conditions = []
        if expanded_queries:
            repeat_conditions.append({"tags": {"$in": expanded_queries}})
        if preferred_weather:
            repeat_conditions.append({"tags": preferred_weather})

        if not repeat_conditions:
            repeat_query: dict[str, object] = {}
        elif len(repeat_conditions) == 1:
            repeat_query = repeat_conditions[0]
        else:
            repeat_query = {"$and": repeat_conditions}
        for doc in image_collection.find(repeat_query).sort("created_at", -1).limit(max_candidates):
            if append_doc(doc, allow_repeat=True):
                if len(response_images) >= image_count:
                    break
        if len(response_images) < image_count:
            for doc in image_collection.find({}).sort("created_at", -1).limit(max_candidates):
                if append_doc(doc, allow_repeat=True):
                    if len(response_images) >= image_count:
                        break

    random.shuffle(response_images)

    if base_tags and should_generate:
        threading.Thread(
            target=generate,
            args=(base_tags, min(image_count, 2), user_id),
            daemon=True
        ).start()

    return JsonResponse({
        "outfits": response_images[:image_count],
        "uniqueExhausted": unique_exhausted,
        "weather": weather_info,
    })


@api_view(["GET"])
@permission_classes([AllowAny])
def weather_status(request):
    city = request.GET.get("city") or request.GET.get("location") or "Sydney"
    if isinstance(city, str):
        city = city.strip() or "Sydney"
    else:
        city = "Sydney"

    weather_data = get_weather_bucket(city)
    if not weather_data:
        return JsonResponse(
            {
                "status": "unavailable",
                "city": city,
                "message": "Weather provider did not return data.",
            },
            status=503,
        )

    bucket = weather_data.get("bucket")
    status_label = "ok" if bucket else "no_bucket"

    return JsonResponse(
        {
            "status": status_label,
            "bucket": bucket,
            "temperature": weather_data.get("temperature"),
            "city": weather_data.get("city") or city,
            "country": weather_data.get("country"),
            "fetched_at": weather_data.get("timestamp"),
        }
    )
