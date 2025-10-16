import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { apiUrl } from "../lib/api";

const ROTATE_INTERVAL_MS = 6000;
const MAX_SLIDES = 8;
const FALLBACK_SLIDE = {
  name: "Discover Your Style",
  image:
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1920&q=80",
};

type OutfitSlide = {
  name: string;
  image: string;
  tags?: string[];
  source_url?: string | null;
};

type FetchState = "idle" | "loading" | "error" | "ready";

export default function SpotlightBanner() {
  const [slides, setSlides] = useState<OutfitSlide[]>([]);
  const [state, setState] = useState<FetchState>("idle");
  const [current, setCurrent] = useState(0);
  const errorRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      setState("loading");
      try {
        const response = await fetch(apiUrl("/quiz/recommend/"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            collection: "frontimages",
            styles: ["Luxury", "Street"],
            occasions: ["Work", "Weekend"],
            bodyShapes: [],
            image_count: MAX_SLIDES,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();
        if (cancelled) return;

        const outfits: OutfitSlide[] = Array.isArray(data?.outfits)
          ? data.outfits
              .filter(
                (item: OutfitSlide | null) =>
                  item && typeof item.image === "string"
              )
              .map(
                (item: {
                  name: any;
                  image: any;
                  tags: any;
                  source_url: any;
                }) => ({
                  name: item.name ?? "Curated Look",
                  image: item.image,
                  tags: item.tags,
                  source_url: item.source_url,
                })
              )
          : [];

        if (outfits.length === 0) {
          setSlides([FALLBACK_SLIDE]);
          setState("ready");
          return;
        }

        setSlides(outfits.slice(0, MAX_SLIDES));
        setState("ready");
      } catch (error) {
        if (
          cancelled ||
          (error instanceof DOMException && error.name === "AbortError")
        ) {
          return;
        }
        errorRef.current =
          error instanceof Error ? error.message : "Something went wrong";
        setSlides([FALLBACK_SLIDE]);
        setState("error");
      }
    }

    load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [slides]);

  useEffect(() => {
    if (current >= slides.length) {
      setCurrent(0);
    }
  }, [slides, current]);

  const activeSlide = useMemo(
    () => slides[current] ?? FALLBACK_SLIDE,
    [slides, current]
  );

  return (
    <section
      className="relative overflow-hidden py-16"
      style={{
        background:
          "radial-gradient(circle at top, rgba(34,40,54,0.9), rgba(10,12,16,1))",
      }}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-12 px-6">
        <div className="text-center">
          <span className="text-sm uppercase tracking-[0.4em] text-pink-300/70">
            Spotlight
          </span>
          <h2 className="mt-3 text-4xl font-black text-white sm:text-5xl">
            Curated Fashion Moments
          </h2>
          <p className="mt-4 max-w-2xl text-base text-neutral-300">
            A living gallery updated from our latest database drops. Sit back
            and let Dressi surface the looks you need now.
          </p>
        </div>

        <div className="relative w-full max-w-215">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[32px] bg-neutral-900 shadow-[0_40px_120px_rgba(0,0,0,0.35)]">
            <AnimatePresence mode="wait">
              <motion.img
                key={activeSlide.name + activeSlide.image}
                src={activeSlide.image}
                alt={activeSlide.name}
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="h-full w-full object-cover"
                style={{ objectPosition: "center top" }}
                loading="lazy"
              />
            </AnimatePresence>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/0 to-transparent" />
          </div>

          {slides.length > 1 && (
            <div className="absolute inset-x-0 bottom-[-48px] flex items-center justify-center gap-3">
              {slides.map((slide, idx) => (
                <button
                  key={slide.name + idx}
                  type="button"
                  onClick={() => setCurrent(idx)}
                  className={`h-2 w-8 rounded-full transition-all duration-300 ${
                    idx === current
                      ? "bg-pink-400"
                      : "bg-white/20 hover:bg-white/40"
                  }`}
                  aria-label={`Show slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-4">
          {state === "error" && (
            <p className="text-xs text-red-300">
              {errorRef.current ??
                "Unable to load outfits. Showing inspiration instead."}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
