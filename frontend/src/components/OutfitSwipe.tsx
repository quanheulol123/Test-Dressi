import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, X, Heart, RotateCcw } from "lucide-react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
} from "framer-motion";

type Outfit = {
  name: string;
  image: string;
  tags: string[];
  source_url?: string | null;
  [key: string]: unknown;
};

type OutfitCard = Outfit & {
  isPlaceholder?: boolean;
  id?: string;
};

const PLACEHOLDER_COUNT = 4;
const TOTAL_OUTFIT_COUNT = 20;
const INITIAL_FETCH_COUNT = TOTAL_OUTFIT_COUNT - PLACEHOLDER_COUNT;

function getOutfitKey(outfit: { image?: unknown; name?: unknown } | null) {
  if (!outfit) {
    return "";
  }

  if (typeof outfit.image === "string" && outfit.image.trim().length > 0) {
    return `image:${outfit.image}`;
  }

  if (typeof outfit.name === "string" && outfit.name.trim().length > 0) {
    return `name:${outfit.name}`;
  }

  return JSON.stringify(outfit);
}

function dedupeOutfits(outfits: Outfit[]): Outfit[] {
  const seen = new Set<string>();

  return outfits.filter((outfit) => {
    const key = getOutfitKey(outfit);
    if (!key) {
      return false;
    }

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function getPlaceholders(count: number = PLACEHOLDER_COUNT): OutfitCard[] {
  return Array.from({ length: count }, (_, i) => ({
    name: "Generating outfit...",
    image: "/spinner.gif",
    tags: [],
    source_url: null,
    isPlaceholder: true,
    id: "placeholder-" + i,
  }));
}

function getViewportHeight() {
  if (typeof window === "undefined") {
    return 800;
  }
  return window.innerHeight;
}

function getViewportWidth() {
  if (typeof window === "undefined") {
    return 1280;
  }
  return window.innerWidth;
}

type CardSize = {
  height: number;
  width: number;
};

export default function OutfitSwipe() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialOutfits = dedupeOutfits(
    (location.state?.outfits ?? []) as Outfit[]
  );
  const initialDbOutfits = initialOutfits.slice(0, INITIAL_FETCH_COUNT);
  const initialPlaceholderCount = Math.max(
    TOTAL_OUTFIT_COUNT - initialDbOutfits.length,
    0
  );
  const [outfits, setOutfits] = useState<OutfitCard[]>(() => [
    ...initialDbOutfits,
    ...getPlaceholders(initialPlaceholderCount),
  ]);
  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState<Outfit[]>([]);
  const [passed, setPassed] = useState<Outfit[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(() =>
    getViewportHeight()
  );
  const [viewportWidth, setViewportWidth] = useState(() => getViewportWidth());
  const headerRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLDivElement | null>(null);
  const [cardSize, setCardSize] = useState<CardSize>({
    height: 360,
    width: 300,
  });
  const preloadedImages = useRef<Set<string>>(new Set());

  useEffect(() => {
    const cache = preloadedImages.current;
    outfits.forEach((item) => {
      if (!item || item.isPlaceholder) {
        return;
      }
      const src = item.image;
      if (!src || cache.has(src)) {
        return;
      }
      const img = new Image();
      img.src = src;
      cache.add(src);
    });
  }, [outfits]);

  useEffect(() => {
    function handleAppendAI(event: Event) {
      const detail = (event as CustomEvent<Outfit[]>).detail;
      const incoming = Array.isArray(detail) ? detail : [];
      if (!incoming.length) {
        return;
      }

      setOutfits((prev) => {
        const next = [...prev];
        const existingKeys = new Set(
          next
            .filter((card) => !card.isPlaceholder)
            .map((card) => getOutfitKey(card))
        );
        let updated = false;

        incoming.forEach((item) => {
          if (!item) {
            return;
          }

          const key = getOutfitKey(item);
          if (!key || existingKeys.has(key)) {
            return;
          }
          existingKeys.add(key);

          const card: OutfitCard = { ...item };
          const placeholderIndex = next.findIndex(
            (entry) => entry.isPlaceholder
          );
          if (placeholderIndex !== -1) {
            next[placeholderIndex] = card;
          } else if (next.length < TOTAL_OUTFIT_COUNT) {
            next.push(card);
          }
          updated = true;
        });

        return updated ? next : prev;
      });
    }

    window.addEventListener("appendAIOutfits", handleAppendAI);
    return () => window.removeEventListener("appendAIOutfits", handleAppendAI);
  }, []);

  const updateCardSize = useCallback(
    (viewH: number = viewportHeight, viewW: number = viewportWidth) => {
      const paddingY = 32;
      const headerHeight = headerRef.current?.offsetHeight ?? 0;
      const footerHeight = footerRef.current?.offsetHeight ?? 0;
      const available = viewH - paddingY - headerHeight - footerHeight;
      let height: number;

      if (!Number.isFinite(available)) {
        height = 360;
      } else if (available <= 0) {
        height = 200;
      } else {
        height = Math.min(420, available);
        if (available > 160) {
          height = Math.max(height, 160);
        }
        if (available <= 160) {
          height = available;
        }
      }

      height = Math.max(
        available > 0 ? Math.min(140, available) : 140,
        Math.min(420, height)
      );

      const widthLimit = Math.max(200, viewW - 56);
      const widthFromHeight = height * 0.72;
      const width = Math.max(
        200,
        Math.min(360, Math.min(widthLimit, widthFromHeight))
      );

      setCardSize((prev) =>
        prev.height === height && prev.width === width
          ? prev
          : { height, width }
      );
    },
    [viewportHeight, viewportWidth]
  );

  useEffect(() => {
    function handleResize() {
      const nextHeight = getViewportHeight();
      const nextWidth = getViewportWidth();
      setViewportHeight(nextHeight);
      setViewportWidth(nextWidth);
      requestAnimationFrame(() => updateCardSize(nextHeight, nextWidth));
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateCardSize]);

  useEffect(() => {
    const id = requestAnimationFrame(() => updateCardSize());
    return () => cancelAnimationFrame(id);
  }, [updateCardSize, liked.length, passed.length, index, outfits.length]);

  function handleLike() {
    setIsAnimating(true);
    setTimeout(() => {
      setLiked((prev) => [...prev, outfits[index]]);
      next();
      setIsAnimating(false);
    }, 300);
  }

  function handlePass() {
    setIsAnimating(true);
    setTimeout(() => {
      setPassed((prev) => [...prev, outfits[index]]);
      next();
      setIsAnimating(false);
    }, 300);
  }

  function next() {
    if (index < outfits.length - 1) {
      setIndex(index + 1);
    } else {
      navigate("/curated", { state: { liked } });
    }
  }

  function prev() {
    if (index > 0) {
      setIndex(index - 1);
    }
  }

  if (!outfits || outfits.length === 0) {
    return (
      <div className="text-white text-center py-20">No outfits to show.</div>
    );
  }

  const outfit = outfits[index];
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-20, 0, 20]);

  function handleDragEnd(_: unknown, info: { offset: { x: number } }) {
    if (info.offset.x > 150) {
      handleLike();
    } else if (info.offset.x < -150) {
      handlePass();
    }
  }

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background:
          "radial-gradient(ellipse at center, #181c24 0%, #10121a 100%)",
        padding: "16px",
        boxSizing: "border-box",
        minHeight: "100vh",
      }}
    >
      <div className="mx-auto flex h-full w-full max-w-xl flex-col">
        <div ref={headerRef} className="flex flex-col gap-2 text-white">
          <div className="flex items-center justify-between">
            <button
              className="text-white font-semibold flex items-center gap-2 disabled:opacity-40"
              onClick={prev}
              disabled={index === 0}
            >
              <ArrowLeft /> Back
            </button>
            <div className="text-sm font-semibold tracking-wide uppercase">
              {index + 1} / {outfits.length}
            </div>
          </div>
          <div className="w-full h-2 bg-[#23283a] rounded-full">
            <div
              className="h-2 bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${((index + 1) / outfits.length) * 100}%` }}
            />
          </div>
          <div className="text-center text-lg font-semibold">
            Style Preference
          </div>
          <div className="text-center text-sm text-gray-300">
            Swipe right if you love it, left if not
          </div>
        </div>
        <div className="mt-4 flex flex-1 items-center justify-center">
          <div
            className="relative flex items-center justify-center"
            style={{ height: cardSize.height, width: cardSize.width }}
          >
            <motion.div
              className="absolute rounded-2xl bg-[#23283a] opacity-40"
              style={{
                height: cardSize.height,
                width: cardSize.width,
                zIndex: 0,
              }}
            />
            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl shadow-2xl"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.3 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.18}
                style={{
                  touchAction: "pan-x",
                  background: "#181c24",
                  zIndex: 1,
                  x,
                  rotate,
                }}
                onDragEnd={handleDragEnd}
              >
                <motion.img
                  src={outfit.image}
                  alt={outfit.name}
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ zIndex: 1 }}
                  draggable={false}
                />
                <div className="absolute bottom-0 left-0 w-full px-6 pb-6 flex flex-col items-center z-10">
                  {outfit.isPlaceholder && (
                    <div className="text-gray-300 text-sm">
                      Generating outfit...
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        <div
          ref={footerRef}
          className="mt-4 flex flex-col items-center gap-3 text-white"
        >
          <div className="flex justify-center gap-4">
            <button
              className="bg-gray-700 hover:bg-gray-800 text-white rounded-full p-4 text-2xl shadow-lg disabled:opacity-40"
              onClick={prev}
              disabled={index === 0}
              title="Undo"
            >
              <RotateCcw />
            </button>
            <button
              className="bg-red-600 hover:bg-red-700 text-white rounded-full p-4 text-2xl shadow-lg disabled:opacity-40"
              onClick={handlePass}
              disabled={isAnimating}
              title="Pass"
            >
              <X />
            </button>
            <button
              className="bg-green-600 hover:bg-green-700 text-white rounded-full p-4 text-2xl shadow-lg disabled:opacity-40"
              onClick={handleLike}
              disabled={isAnimating}
              title="Like"
            >
              <Heart />
            </button>
            <button
              className="bg-white hover:bg-gray-200 text-black rounded-full p-4 text-2xl shadow-lg disabled:opacity-40"
              onClick={next}
              disabled={isAnimating}
              title="Next"
            >
              <ArrowRight />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
