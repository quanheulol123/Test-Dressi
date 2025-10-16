let style = [];
let colour = [];
let season = [];
let results = [];
let token = localStorage.getItem("token") || "";
let currentTemp = null;
let currentCountry = null;

async function handleSubmit() {
  try {
    const response = await fetch("http://localhost:8000/recommend", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` })
      },
      body: JSON.stringify({ style, colour, season, weather_enabled: true })
    });

    if (!response.ok) {
      console.error("Server error");
      return;
    }

    const data = await response.json();
    results = data.outfits || [];
    currentTemp = data.temperature || null;
    currentCountry = data.country || null;

    console.log("Results:", results, currentTemp, currentCountry);
  } catch (err) {
    console.error("Network error:", err);
  }
}
