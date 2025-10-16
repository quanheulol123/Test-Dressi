import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Check, Heart } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { apiUrl } from "../lib/api";

type OutfitCard = {
  name?: string;
  image?: string;
  tags?: string[];
  source_url?: string | null;
  [key: string]: unknown;
};

type SaveState = "idle" | "saving" | "saved" | "error";

function inferFilename(outfit: OutfitCard, fallback: string) {
  if (typeof outfit.name === "string" && outfit.name.trim()) {
    return outfit.name.trim();
  }
  if (typeof outfit.image === "string") {
    try {
      const url = new URL(outfit.image);
      const last = url.pathname.split("/").filter(Boolean).pop();
      if (last) return last;
    } catch {
      // ignore – not a valid URL, maybe data URI
    }
    const parts = outfit.image.split("/").filter(Boolean);
    const lastSegment = parts.pop();
    if (lastSegment) {
      return lastSegment.split("?")[0] || fallback;
    }
  }
  return fallback;
}

function getOutfitKey(outfit: OutfitCard, index: number) {
  if (typeof outfit.name === "string" && outfit.name.trim()) {
    return `${outfit.name}-${index}`;
  }
  if (typeof outfit.image === "string" && outfit.image.trim()) {
    return `${outfit.image}-${index}`;
  }
  return `outfit-${index}`;
}

export default function CuratedPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const liked = useMemo<OutfitCard[]>(() => {
    const incoming = location.state?.liked;
    return Array.isArray(incoming) ? incoming : [];
  }, [location.state]);

  const [saveStatus, setSaveStatus] = useState<Record<string, SaveState>>({});
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  async function handleSave(outfit: OutfitCard, index: number) {
    const key = getOutfitKey(outfit, index);
    const token = user?.token;

    if (!token) {
      navigate("/login", { state: { from: "/curated" } });
      return;
    }

    if (saveStatus[key] === "saved" || saveStatus[key] === "saving") {
      return;
    }

    setSaveStatus((prev) => ({ ...prev, [key]: "saving" }));

    try {
      if (typeof outfit.image !== "string" || !outfit.image.trim()) {
        throw new Error("Outfit is missing an image URL.");
      }

      const payload = {
        filename: inferFilename(outfit, `wardrobe_${Date.now()}`),
        image_url: outfit.image,
        tags: Array.isArray(outfit.tags) ? outfit.tags : [],
      };

      const response = await fetch(apiUrl("/api/save_image/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to save outfit");
      }

      setSaveStatus((prev) => ({ ...prev, [key]: "saved" }));
      setFeedback({ type: "success", message: "Saved to wardrobe." });
    } catch (err) {
      console.error(err);
      setSaveStatus((prev) => ({ ...prev, [key]: "error" }));
      setFeedback({
        type: "error",
        message: "Could not save outfit. Please try again.",
      });
    }
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="max-w-5xl mx-auto px-4 pt-16">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-extrabold mb-2">
            Curated Just <span className="text-pink-500">For You</span>{" "}
            <span className="inline-block">
              <Heart className="text-pink-400" size={36} />
            </span>
          </h1>
          <p className="text-lg text-gray-300">
            Discover your perfect style with AI-curated outfits that celebrate
            your unique beauty and personality.
            <br />
            <span className="text-pink-400 font-semibold">
              Every piece chosen just for you.
            </span>
          </p>
        </div>

        {feedback ? (
          <div
            className={`mb-6 rounded-2xl border px-4 py-3 text-sm font-semibold ${
              feedback.type === "success"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : "border-rose-500/40 bg-rose-500/10 text-rose-300"
            }`}
          >
            {feedback.message}
          </div>
        ) : null}

        {liked.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-10 text-center text-white/70">
            <p>
              No curated outfits yet. Swipe and like outfits to build this list.
            </p>
            <button
              type="button"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-pink-500 px-6 py-2 font-semibold text-white transition hover:bg-pink-400"
              onClick={() => navigate("/outfit-swipe")}
            >
              Start swiping
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3">
            {liked.map((outfit, index) => {
              const key = getOutfitKey(outfit, index);
              const status = saveStatus[key] ?? "idle";
              const canSave = Boolean(user?.token);
              const buttonLabel =
                status === "saved"
                  ? "Saved"
                  : status === "saving"
                  ? "Saving..."
                  : canSave
                  ? "Save to Wardrobe"
                  : "Log in to Save";

              return (
                <div
                  key={key}
                  className="relative overflow-hidden rounded-2xl bg-[#181c24] shadow-lg"
                >
                  {status === "saved" ? (
                    <span className="absolute top-4 right-4 z-10 inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200">
                      <Check className="h-4 w-4" />
                      Saved
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSave(outfit, index)}
                      className="absolute top-4 right-4 z-10 rounded-full bg-white/15 p-2 text-white transition hover:bg-pink-500"
                      disabled={status === "saving"}
                    >
                      <Heart size={20} />
                    </button>
                  )}

                  <img
                    src={outfit.image}
                    alt={outfit.name || "Curated outfit"}
                    className="h-72 w-full object-cover"
                    loading="lazy"
                  />

                  <div className="flex flex-col gap-4 p-5">
                    <div className="flex flex-wrap gap-2"></div>

                    <button
                      type="button"
                      onClick={() => handleSave(outfit, index)}
                      disabled={status === "saving" || status === "saved"}
                      className={`w-full rounded-full px-4 py-2 text-sm font-semibold transition ${
                        status === "saved"
                          ? "bg-emerald-500/20 text-emerald-200"
                          : "bg-pink-500 text-white hover:bg-pink-400 disabled:opacity-60"
                      }`}
                    >
                      {buttonLabel}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-12 flex justify-center">
          <button
            className="rounded-full bg-pink-500 px-8 py-3 text-lg font-bold text-white shadow transition hover:bg-pink-600"
            onClick={() => navigate("/")}
            type="button"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
