import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sun,
  Cloud,
  Snowflake,
  Briefcase,
  Shirt,
  Heart,
  RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";
import { apiUrl } from "../lib/api";

type InstantOption = {
  label: string;
  value: string;
  vibe: string;
  description: string;
  icon: React.JSX.Element;
  style: string;
  occasion: string;
  featured: string;
  title: string;
  bg: string;
};

type OutfitResult = {
  name: string;
  image: string;
  tags?: string[];
  source_url?: string | null;
};

const MAX_BATCH = 12;

const weatherOptions: InstantOption[] = [
  {
    label: "Sunny Vibes",
    value: "Sunny",
    vibe: "sunny",
    description:
      "Effortless summer elegance with flowing fabrics, radiant colors, and that golden-hour glow that turns heads everywhere you go.",
    icon: <Sun className="h-8 w-8 text-yellow-400" />,
    style: "Casual",
    occasion: "Weekend",
    featured: "AI Curated",
    title: "Sunny Day Goddess",
    bg: "bg-gradient-to-br from-yellow-50 via-white to-yellow-100",
  },
  {
    label: "Cloudy Vibes",
    value: "Cloudy",
    vibe: "cloudy",
    description:
      "Sophisticated layering, muted tones, and luxe textures for moody days.",
    icon: <Cloud className="h-8 w-8 text-blue-400" />,
    style: "Formal",
    occasion: "Work",
    featured: "AI Curated",
    title: "Cloudy Chic",
    bg: "bg-gradient-to-br from-blue-50 via-white to-blue-100",
  },
  {
    label: "Cold Vibes",
    value: "Cold",
    vibe: "cold",
    description:
      "Chic cold weather couture with statement coats, cozy knits, and accessories.",
    icon: <Snowflake className="h-8 w-8 text-indigo-400" />,
    style: "Sporty",
    occasion: "Casual",
    featured: "AI Curated",
    title: "Winter Muse",
    bg: "bg-gradient-to-br from-indigo-50 via-white to-indigo-100",
  },
];

const occasionOptions = [
  {
    label: "Work",
    value: "Work",
    vibe: "work",
    description:
      "Power suits, sharp silhouettes, and confidence-boosting pieces.",
    icon: <Briefcase className="h-8 w-8 text-neutral-800" />,
    style: "Formal",
    occasion: "Work",
    featured: "AI Curated",
    title: "Boardroom Queen",
    bg: "bg-gradient-to-br from-gray-100 via-white to-gray-200",
  },
  {
    label: "Casual",
    value: "Casual",
    vibe: "casual",
    description:
      "Effortlessly cool street style that looks like you just stepped out of a magazine.",
    icon: <Shirt className="h-8 w-8 text-orange-500" />,
    style: "Casual",
    occasion: "Casual",
    featured: "AI Curated",
    title: "Street Style Star",
    bg: "bg-gradient-to-br from-orange-50 via-white to-orange-100",
  },
  {
    label: "Date Night",
    value: "Date",
    vibe: "date",
    description: "Romantic elegance meets sultry sophistication.",
    icon: <Heart className="h-8 w-8 text-pink-500" />,
    style: "Party",
    occasion: "Date",
    featured: "AI Curated",
    title: "Date Night Dream",
    bg: "bg-gradient-to-br from-pink-50 via-white to-pink-100",
  },
];
type InstantOutfitSectionProps = {
  setLoading?: (loading: boolean) => void;
};

export default function InstantOutfitSection({
  setLoading,
}: InstantOutfitSectionProps) {
  const [loading, setLocalLoading] = useState(false);
  const [selected, setSelected] = useState<InstantOption | null>(null);
  const [outfit, setOutfit] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(true);
  const [seenByVibe, setSeenByVibe] = useState<Record<string, string[]>>({});
  const [poolByVibe, setPoolByVibe] = useState<Record<string, OutfitResult[]>>(
    {}
  );
  const navigate = useNavigate();
  const selectedBackground = selected?.bg ?? "bg-neutral-100";
  const selectedIcon = selected?.icon;
  const selectedLabel = selected?.label ?? "Your vibe";
  const normalizeVibe = (option: InstantOption | null) =>
    option?.vibe.trim().toLowerCase() ?? "";

  async function handleInstant(opt: InstantOption) {
    setError(null);
    setShowOptions(false);
    setSelected(opt);
    setOutfit(null);
    setLocalLoading(true);
    setLoading?.(true);

    const vibeKeyRaw = normalizeVibe(opt);
    const fallbackTag =
      opt?.value?.toString().trim().toLowerCase() ||
      opt?.label?.toString().trim().toLowerCase() ||
      "instant";
    const vibeKey = vibeKeyRaw || fallbackTag;

    let seenList = [...(seenByVibe[vibeKey] ?? [])];
    let pool = [...(poolByVibe[vibeKey] ?? [])];
    let attempts = 0;
    const maxAttempts = 2;

    while (pool.length === 0 && attempts < maxAttempts) {
      attempts += 1;
      try {
        const response = await fetch(apiUrl("/quiz/recommend/"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            collection: "instantoutfit",
            styles: [vibeKey],
            occasions: [],
            bodyShapes: [],
            image_count: MAX_BATCH,
            exclude_names: seenList,
          }),
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();
        const outfits = Array.isArray(data?.outfits)
          ? data.outfits.filter(Boolean)
          : [];
        const seenSet = new Set(seenList.map((name) => name.toLowerCase()));
        const uniqueBatch: OutfitResult[] = [];
        const batchSeen = new Set<string>();

        for (const raw of outfits) {
          if (!raw) continue;
          const nameValue =
            typeof raw.name === "string" && raw.name.trim().length > 0
              ? raw.name.trim()
              : null;
          const imageValue =
            typeof raw.image === "string" && raw.image.trim().length > 0
              ? raw.image.trim()
              : null;
          if (!nameValue && !imageValue) {
            continue;
          }
          const key = (nameValue ?? imageValue ?? "").toLowerCase();
          if (!key || seenSet.has(key) || batchSeen.has(key)) {
            continue;
          }
          batchSeen.add(key);
          uniqueBatch.push({
            name: nameValue ?? key,
            image: imageValue ?? "",
            tags: Array.isArray(raw.tags) ? raw.tags : undefined,
            source_url:
              typeof raw.source_url === "string" ? raw.source_url : undefined,
          });
        }

        if (uniqueBatch.length > 0) {
          pool = uniqueBatch;
          setPoolByVibe((prev) => ({
            ...prev,
            [vibeKey]: uniqueBatch,
          }));
        } else if (seenList.length > 0) {
          // Reset cycle and try again next iteration.
          seenList = [];
          setSeenByVibe((prev) => ({
            ...prev,
            [vibeKey]: [],
          }));
        } else {
          break;
        }
      } catch (err) {
        setError("Error fetching instant outfit. Please try again.");
        setLocalLoading(false);
        setLoading?.(false);
        return;
      }
    }

    if (!pool.length) {
      setError(
        seenList.length
          ? "We just cycled through every available look - give it another moment or try a different vibe."
          : "No outfit found for that combo. Try another option!"
      );
      setLocalLoading(false);
      setLoading?.(false);
      return;
    }

    const [nextOutfit, ...remaining] = pool;
    setOutfit(nextOutfit);
    setPoolByVibe((prev) => ({
      ...prev,
      [vibeKey]: remaining,
    }));
    setSeenByVibe((prev) => ({
      ...prev,
      [vibeKey]: [...seenList, nextOutfit.name],
    }));

    setLocalLoading(false);
    setLoading?.(false);
  }

  function handleRetake() {
    setShowOptions(true);
    setSelected(null);
    setOutfit(null);
    setError(null);
    setLocalLoading(false);
    setSeenByVibe((prev) => {
      const key = normalizeVibe(selected);
      if (!key) {
        return prev;
      }
      if (!prev[key]?.length) {
        return prev;
      }
      return {
        ...prev,
        [key]: [],
      };
    });
    setPoolByVibe((prev) => {
      const key = normalizeVibe(selected);
      if (!key || !prev[key]?.length) {
        return prev;
      }
      const clone = { ...prev };
      delete clone[key];
      return clone;
    });
    setLoading?.(false);
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="py-20"
      style={{
        background:
          "radial-gradient(ellipse at center, #181c24 0%, #23283a 100%)",
      }}
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-extrabold mb-2 text-white">
            Get Instant <span className="text-pink-400">Style Magic</span>
          </h2>
          <p className="text-neutral-300 mb-8">
            Skip the quiz, skip the wait. One click your perfect outfit, curated
            by AI and inspired by the world's top fashion editors.
          </p>
        </div>

        <div
          className="mx-auto flex flex-col items-center justify-center"
          style={{
            minHeight: "480px",
            maxWidth: "700px",
            width: "100%",
          }}
        >
          {showOptions && (
            <>
              <div className="mb-8 text-center text-lg text-neutral-200 font-medium">
                Let Mother Nature inspire your look
              </div>
              <div className="flex flex-col sm:flex-row gap-8 justify-center mb-12">
                {weatherOptions.map((opt) => (
                  <button
                    key={opt.label}
                    className={`w-full sm:w-[340px] ${opt.bg} rounded-2xl p-8 flex flex-col items-center shadow-lg transition-all duration-200 hover:scale-105`}
                    disabled={loading}
                    onClick={() => handleInstant(opt)}
                  >
                    {opt.icon}
                    <div className="font-bold text-xl text-gray-900 mt-4 mb-2">
                      {opt.label}
                    </div>
                    <div className="text-gray-700 text-base text-center mb-6">
                      {opt.description}
                    </div>
                    <span className="mt-auto text-gray-900 font-semibold flex items-center gap-1">
                      Style Me <span className="text-lg">&rarr;</span>
                    </span>
                  </button>
                ))}
              </div>

              <div className="mb-6 text-center text-xl font-bold text-white flex items-center justify-center gap-2">
                Style by Occasion <span className="text-yellow-300">?</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-8 justify-center">
                {occasionOptions.map((opt) => (
                  <button
                    key={opt.label}
                    className={`w-full sm:w-[340px] ${opt.bg} rounded-2xl p-8 flex flex-col items-center shadow-lg transition-all duration-200 hover:scale-105`}
                    disabled={loading}
                    onClick={() => handleInstant(opt)}
                  >
                    {opt.icon}
                    <div className="font-bold text-xl text-gray-900 mt-4 mb-2">
                      {opt.label}
                    </div>
                    <div className="text-gray-700 text-base text-center mb-6">
                      {opt.description}
                    </div>
                    <span className="mt-auto text-gray-900 font-semibold flex items-center gap-1">
                      Style Me <span className="text-lg">&rarr;</span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          {!showOptions && (
            <div className="mx-auto mt-12 max-w-2xl text-center">
              <div className="flex flex-col items-center gap-3 text-neutral-200">
                <p className="text-lg font-semibold">
                  We heard: {selected?.label ?? "your vibes"}
                </p>
                {loading && (
                  <p className="text-sm text-neutral-400">
                    Generating a look you'll love...
                  </p>
                )}
                {error && (
                  <p className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {error}
                  </p>
                )}
                <button
                  onClick={handleRetake}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white transition hover:border-white/40"
                  disabled={loading}
                >
                  <RefreshCw className="h-4 w-4" /> Retake choices
                </button>
              </div>
            </div>
          )}

          {outfit && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="mx-auto mt-16 flex justify-center"
              style={{ width: "100%" }}
            >
              <div className="flex flex-col md:flex-row items-stretch rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden">
                <div
                  className={`md:w-1/2 w-full flex flex-col items-center justify-between gap-6 p-6 ${selectedBackground}`}
                >
                  <div className="flex items-center gap-3 text-gray-900">
                    {selectedIcon && (
                      <span className="inline-flex items-center justify-center rounded-full bg-white/80 p-3 shadow-inner">
                        {selectedIcon}
                      </span>
                    )}
                    <div className="text-left">
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        Selected vibe
                      </p>
                      <p className="text-lg font-semibold">
                        {selectedLabel}
                      </p>
                    </div>
                  </div>
                  <div className="w-full max-w-[320px] aspect-[3/4] bg-white/80 rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
                    <img
                      src={outfit.image}
                      alt={selected?.title || "Outfit"}
                      className="h-full w-full object-contain"
                      loading="lazy"
                    />
                  </div>
                </div>
                <div className="md:w-1/2 w-full p-8 bg-white">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold">
                      {selected?.featured || "AI Curated"}
                    </span>
                  </div>
                  <div className="text-2xl font-bold mb-2 text-pink-500">
                    {selected?.title || "Your Outfit"}
                  </div>
                  <div className="text-gray-700 mb-4">
                    {selected?.description}
                  </div>
                  <button
                    className="bg-black text-white px-6 py-2 rounded-lg font-semibold shadow hover:bg-neutral-900 transition"
                    onClick={() => navigate("/style-discovery")}
                  >
                    Unlock Full Styling Experience
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.section>
  );
}
