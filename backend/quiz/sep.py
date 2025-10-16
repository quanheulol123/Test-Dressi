import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

# --- MongoDB setup ---
MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
images_db = client["outfits"]
collection = images_db["images"]

# --- Valid tags from the quiz ---
VALID_TAGS = {
    "womenswear",  # always included
    "casual", "sporty", "formal", "party", "vintage", "summer",
    "red", "blue", "black", "white", "green",
    "fair", "medium", "olive", "dark",
    "rectangle", "hourglass", "pear", "apple", "inverted triangle"
}

def clean_tags(tags):
    """Return tags that are valid."""
    cleaned = []
    for tag in tags:
        tag_lower = tag.lower()
        if tag_lower == "invertedtriangle":
            tag_lower = "inverted triangle"
        if tag_lower in VALID_TAGS:
            cleaned.append(tag_lower)
    return cleaned

def main():
    all_images = list(collection.find({}))
    print(f"Found {len(all_images)} images in DB")

    for img in all_images:
        old_tags = img.get("tags", [])
        old_tags = old_tags if old_tags else []

        # Clean existing tags
        new_tags = clean_tags(old_tags)

        filename_lower = img.get("filename", "").lower()

        # Always include 'womenswear' if in filename
        if "womenswear" in filename_lower and "womenswear" not in new_tags:
            new_tags.append("womenswear")

        # Append any other valid tags derived from filename
        for tag in VALID_TAGS:
            if tag not in new_tags and tag in filename_lower:
                new_tags.append(tag)

        if old_tags != new_tags:
            collection.update_one(
                {"_id": img["_id"]},
                {"$set": {"tags": new_tags}}
            )
            print(f"Updated {img.get('filename')} | Old: {old_tags} -> New: {new_tags}")

    print("Tag cleanup complete.")

if __name__ == "__main__":
    main()
