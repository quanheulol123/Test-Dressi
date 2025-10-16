import requests
import psycopg2

API_KEY = "0a091b20410a455486992546252507"
LOCATION = "Chile"

DB_CONFIG = {
    "dbname": "clothingbase",
    "user": "postgres",
    "password": "newpassword",
    "host": "localhost",
    "port": "54876"
}

def get_current_weather():
    url = f"https://api.weatherapi.com/v1/current.json?key={API_KEY}&q={LOCATION}"
    response = requests.get(url)
    data = response.json()
    temp = data['current']['temp_c']
    country = data['location']['country']
    return temp, country

def get_current_season():
    temp, _ = get_current_weather()

def get_recommendations(style, colour):
    season = get_current_season()
    temp, country = get_current_weather()

    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    cur.execute("""
        SELECT ci.name, c.name, s.name, co.name, se.name
        FROM clothingitem ci
        JOIN category c ON ci.category_id = c.category_id
        JOIN style s ON ci.style_id = s.style_id
        JOIN colour co ON ci.colour_id = co.colour_id
        JOIN season se ON ci.season_id = se.season_id
        WHERE se.name = %s
          AND (%s = '{}' OR s.name = ANY(%s))
          AND (%s = '{}' OR co.name = ANY(%s))
    """, (season, style, style, colour, colour))

    results = cur.fetchall()
    conn.close()

    return {
        "outfits": results,
        "temperature": temp,
        "country": country
    }
