import { useEffect, useMemo, useState } from "react";
import { Cloud, Loader2, Snowflake, Sun } from "lucide-react";
import { apiUrl } from "../lib/api";

type WeatherPayload = {
  status?: string;
  bucket?: string | null;
  temperature?: number | string | null;
  city?: string | null;
  fetched_at?: string | null;
};

const ENDPOINT = apiUrl("/quiz/api/weather_status/");
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export default function WeatherBadge() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherPayload | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(ENDPOINT);
        if (!response.ok) {
          throw new Error(`Status ${response.status}`);
        }
        const payload = (await response.json()) as WeatherPayload;
        if (!cancelled) {
          setWeather(payload);
        }
      } catch (err) {
        if (!cancelled) {
          setError("offline");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    const intervalId = window.setInterval(load, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const resolved = useMemo(() => {
    if (!weather) {
      return null;
    }
    const bucket = typeof weather.bucket === "string" ? weather.bucket : null;
    const temperature =
      typeof weather.temperature === "number"
        ? weather.temperature
        : typeof weather.temperature === "string"
        ? Number.parseFloat(weather.temperature)
        : null;
    const city =
      typeof weather.city === "string" && weather.city.trim().length > 0
        ? weather.city.trim()
        : null;

    return { bucket, temperature, city };
  }, [weather]);

  if (loading) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Updating weather...
      </span>
    );
  }

  if (error) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-3 py-1 text-xs text-red-100">
        <Cloud className="h-3.5 w-3.5" />
        Weather offline
      </span>
    );
  }

  const bucket = resolved?.bucket;
  const temperature = resolved?.temperature;
  const city = resolved?.city;

  let icon = <Cloud className="h-3.5 w-3.5 text-white/80" />;
  let label = "Weather neutral";
  let accentClasses = "bg-white/10 text-white/80";

  if (bucket === "hot") {
    icon = <Sun className="h-3.5 w-3.5 text-amber-300" />;
    label = "Hot day picks";
    accentClasses = "bg-amber-500/20 text-amber-100";
  } else if (bucket === "cold") {
    icon = <Snowflake className="h-3.5 w-3.5 text-sky-200" />;
    label = "Cold day picks";
    accentClasses = "bg-sky-500/20 text-sky-100";
  }

  const temperatureText =
    typeof temperature === "number" && Number.isFinite(temperature)
      ? `about ${Math.round(temperature)}C`
      : null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${accentClasses}`}
    >
      {icon}
      <span>{label}</span>
      {temperatureText && <span>| {temperatureText}</span>}
      {city && <span>| {city}</span>}
    </span>
  );
}
