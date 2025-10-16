import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Briefcase,
  Cloud,
  Dumbbell,
  Shirt,
  Sparkles,
  Sun,
  Snowflake,
  Users,
} from "lucide-react";
import { apiUrl } from "../lib/api";

const questions = [
  {
    key: "style",
    question: "What's your preferred style?",
    options: [
      { label: "Casual", icon: <Shirt size={28} /> },
      { label: "Sporty", icon: <Dumbbell size={28} /> },
      { label: "Formal", icon: <Briefcase size={28} /> },
      { label: "Party", icon: <Sparkles size={28} /> },
    ],
  },
  {
    key: "bodyShape",
    question: "What's your body shape?",
    options: [
      { label: "Rectangle", icon: <Users size={28} /> },
      { label: "Hourglass", icon: <Users size={28} /> },
      { label: "Pear", icon: <Users size={28} /> },
      { label: "Round", icon: <Users size={28} /> },
    ],
  },
];

type OutfitResponse = {
  image?: string | null;
  name?: string | null;
  [key: string]: unknown;
};

type WeatherMeta = {
  requested: boolean;
  applied: boolean;
  tag: "hot" | "cold" | null;
  source: string | null;
  temperature: number | null;
  city: string | null;
};

function uniqueOutfits(outfits: OutfitResponse[]): OutfitResponse[] {
  const seen = new Set<string>();

  return outfits.filter((outfit) => {
    if (!outfit) {
      return false;
    }

    const key =
      typeof outfit.image === "string" && outfit.image.trim().length > 0
        ? `image:${outfit.image}`
        : typeof outfit.name === "string" && outfit.name.trim().length > 0
        ? `name:${outfit.name}`
        : JSON.stringify(outfit);

    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function normalizeWeather(payload: unknown): WeatherMeta | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const data = payload as Record<string, unknown>;
  const rawTag =
    typeof data.tag === "string" ? data.tag.trim().toLowerCase() : null;
  const tag = rawTag === "hot" || rawTag === "cold" ? rawTag : null;
  const tempValue =
    typeof data.temperature === "number"
      ? data.temperature
      : typeof data.temperature === "string"
      ? Number.parseFloat(data.temperature)
      : null;
  const temperature =
    typeof tempValue === "number" && Number.isFinite(tempValue)
      ? tempValue
      : null;
  const city =
    typeof data.city === "string" && data.city.trim().length > 0
      ? data.city.trim()
      : null;

  return {
    requested: Boolean(data.requested),
    applied: Boolean(data.applied) && Boolean(tag),
    tag,
    source: typeof data.source === "string" ? data.source : null,
    temperature,
    city,
  };
}

export default function StyleDiscovery() {
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);
  const [useWeather, setUseWeather] = useState(true);
  const [weatherInfo, setWeatherInfo] = useState<WeatherMeta | null>(null);
  const navigate = useNavigate();

  const activeQuestion = questions[current];
  const options = activeQuestion.options;
  const isOddOptionCount = options.length % 2 === 1;

  function handleSelect(option: string) {
    if (locked) return;
    const key = activeQuestion.key;
    setAnswers((prev) => ({ ...prev, [key]: option }));
  }

  function handleNext() {
    if (current < questions.length - 1) {
      setCurrent((prev) => prev + 1);
    } else {
      setLocked(true);
      handleSubmit();
    }
  }

  async function handleSubmit() {
    const requestBody = {
      styles: [answers.style],
      bodyShapes: [answers.bodyShape],
      image_count: 16,
      use_weather: useWeather,
    };
    setLoading(true);
    try {
      const response = await fetch(apiUrl("/quiz/recommend/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const data = await response.json();
      const weatherPayload = normalizeWeather(data?.weather);
      setWeatherInfo(weatherPayload);
      const dedupedOutfits = uniqueOutfits(
        Array.isArray(data.outfits) ? data.outfits : []
      );
      navigate("/outfit-swipe", {
        state: { outfits: dedupedOutfits, answers, weather: weatherPayload },
      });

      fetch(apiUrl("/quiz/generate/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          styles: [answers.style],
          bodyShapes: [answers.bodyShape],
          image_count: 4,
        }),
      })
        .then((res) => res.json())
        .then((aiData) => {
          const uniqueAiOutfits = uniqueOutfits(
            Array.isArray(aiData.outfits) ? aiData.outfits : []
          );
          window.dispatchEvent(
            new CustomEvent("appendAIOutfits", { detail: uniqueAiOutfits })
          );
        });
    } catch (err) {
      alert("Error fetching recommendations");
    }
    setLoading(false);
  }

  const toggleWeather = () => {
    setUseWeather((prev) => {
      const next = !prev;
      if (!next) {
        setWeatherInfo(null);
      }
      return next;
    });
  };

  const weatherStatus = useMemo(() => {
    if (!useWeather) {
      return {
        icon: <Cloud className="h-4 w-4 text-white/70" />,
        label: "Weather filtering off",
        description: "Showing broad recommendations for all climates.",
        accent: "bg-white/5 text-white/70 border-white/10",
      };
    }

    if (weatherInfo?.applied && weatherInfo.tag) {
      const isHot = weatherInfo.tag === "hot";
      return {
        icon: isHot ? (
          <Sun className="h-4 w-4 text-amber-300" />
        ) : (
          <Snowflake className="h-4 w-4 text-sky-200" />
        ),
        label: isHot ? "Filtering for warm weather" : "Filtering for cooler days",
        description: weatherInfo.city
          ? `Dialed in for ${weatherInfo.city}${
              typeof weatherInfo.temperature === "number"
                ? ` (about ${Math.round(weatherInfo.temperature)}C)`
                : ""
            }`
          : "Tailored to today's forecast.",
        accent: isHot
          ? "bg-amber-500/10 text-amber-100 border-amber-500/30"
          : "bg-sky-500/10 text-sky-100 border-sky-500/30",
      };
    }

    return {
      icon: <Cloud className="h-4 w-4 text-yellow-200" />,
      label: "Weather filtering on",
      description: "Showing best matches according to the weather.",
      accent: "bg-yellow-500/10 text-yellow-100 border-yellow-500/30",
    };
  }, [useWeather, weatherInfo]);

  return (
    <section className="relative flex min-h-[calc(100vh-4rem)] flex-col overflow-hidden bg-[#04030f] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.16),_transparent_55%),_radial-gradient(circle_at_bottom,_rgba(236,72,153,0.22),_transparent_50%)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-45"
        style={{
          background:
            "linear-gradient(135deg, rgba(5,8,20,0.9) 0%, rgba(5,8,20,0.4) 35%, rgba(11,3,28,0.65) 100%)",
        }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 sm:px-6">
        <div className="flex items-center justify-between py-5">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-white/80 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>

        <div className="relative mx-auto flex w-full max-w-xl flex-1 items-center justify-center pb-6">
          <div className="absolute -top-14 left-2 h-40 w-40 rounded-full bg-pink-500/20 blur-3xl" />
          <div className="absolute -bottom-10 right-0 h-44 w-44 rounded-full bg-violet-500/25 blur-3xl" />

          <div className="relative z-10 w-full rounded-[24px] border border-white/10 bg-[#090b1c]/80 p-6 shadow-[0_28px_80px_rgba(12,10,30,0.45)] backdrop-blur-xl sm:p-7">
            <header className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 via-fuchsia-500 to-violet-500 text-white shadow-lg">
                <Sparkles className="h-6 w-6" />
              </div>
              <h1 className="mt-4 text-[1.65rem] font-bold tracking-tight">
                Discover Your Signature Style
              </h1>
              <p className="mt-2 text-xs text-white/70">
                Answer a few quick questions so we can curate looks made for
                you.
              </p>
            </header>

            <div
              className={`mt-6 rounded-2xl border px-4 py-4 text-xs sm:text-sm ${weatherStatus.accent}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 font-semibold uppercase tracking-[0.18em] text-[0.55rem] sm:text-[0.6rem]">
                  {weatherStatus.icon}
                  <span>{weatherStatus.label}</span>
                </div>
                <button
                  type="button"
                  onClick={toggleWeather}
                  className={`inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-[0.6rem] font-semibold transition ${
                    useWeather
                      ? "bg-white/15 text-white hover:bg-white/25"
                      : "bg-white/5 text-white/70 hover:text-white"
                  }`}
                >
                  <span>{useWeather ? "Disable" : "Enable"} weather</span>
                </button>
              </div>
              <p className="mt-2 leading-relaxed text-white/70">
                {weatherStatus.description}
              </p>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <div className="flex items-center justify-between text-[0.55rem] font-semibold uppercase tracking-[0.28em] text-white/50">
                  <span>Question {current + 1}</span>
                  <span>of {questions.length}</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 transition-all duration-500"
                    style={{
                      width: `${((current + 1) / questions.length) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <h2 className="text-center text-lg font-semibold text-white">
                {activeQuestion.question}
              </h2>

              <div className="grid gap-3 sm:grid-cols-2">
                {options.map((option, index) => {
                  const isSelected =
                    answers[activeQuestion.key] === option.label;
                  const spanClass =
                    isOddOptionCount && index === options.length - 1
                      ? "sm:col-span-2 sm:mx-auto sm:max-w-[16rem] sm:justify-self-center"
                      : "";

                  return (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => handleSelect(option.label)}
                      disabled={locked || loading}
                      className={`relative flex h-full flex-col items-center justify-center gap-3 rounded-2xl border px-4 py-5 text-center transition duration-300 focus:outline-none focus:ring-2 focus:ring-pink-400/40 ${
                        isSelected
                          ? "border-white/30 bg-white/10 text-white shadow-[0_14px_32px_rgba(236,72,153,0.25)]"
                          : "border-white/5 bg-white/5 text-white/70 hover:border-pink-400/60 hover:text-white hover:shadow-[0_12px_28px_rgba(217,70,239,0.2)]"
                      } ${spanClass}`}
                    >
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-white">
                        {option.icon}
                      </span>
                      <span className="text-sm font-semibold">
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => setCurrent((prev) => prev - 1)}
                  disabled={current === 0 || locked || loading}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-semibold text-white/80 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!answers[activeQuestion.key] || locked || loading}
                  className="w-full rounded-2xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 px-6 py-2.5 text-xs font-semibold text-white transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-white/40 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {current < questions.length - 1
                    ? "Next Question"
                    : loading
                    ? "Loading..."
                    : "Get Recommendations"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
