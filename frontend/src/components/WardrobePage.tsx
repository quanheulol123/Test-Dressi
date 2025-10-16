import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Trash2 } from "lucide-react";
import { apiUrl } from "../lib/api";

type WardrobeItem = {
  id: string;
  name?: string;
  image: string;
  tags?: string[];
};

type WardrobeApiItem = {
  id?: string;
  name?: string;
  image?: string;
  tags?: unknown;
};

export default function WardrobePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const token = user?.token ?? "";

  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<
    { type: "success" | "error"; message: string } | null
  >(null);
  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({});

  const wardrobeTitle = useMemo(() => {
    if (!user) return "Your Wardrobe";
    const base = user.displayName || user.email?.split("@")[0] || "Your";
    return `${base}'s Wardrobe`;
  }, [user]);

  const fetchWardrobe = useCallback(async () => {
    if (!token) {
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(apiUrl("/api/get_wardrobe/"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        navigate("/login", { replace: true, state: { from: "/wardrobe" } });
        return;
      }

      const payload = await response.json().catch(() => ({}));
      const rawWardrobe = Array.isArray(payload?.wardrobe)
        ? (payload.wardrobe as WardrobeApiItem[])
        : [];
      const wardrobe = rawWardrobe
        .filter(
          (item): item is WardrobeItem =>
            !!item &&
            typeof item.id === "string" &&
            item.id.trim().length > 0 &&
            typeof item.image === "string" &&
            item.image.trim().length > 0
        )
        .map((item) => ({
          id: item.id!.trim(),
          name:
            typeof item.name === "string" && item.name.trim().length > 0
              ? item.name.trim()
              : undefined,
          image: item.image.trim(),
          tags: Array.isArray(item.tags)
            ? (item.tags as string[]).filter(
                (tag) => typeof tag === "string" && tag.trim().length > 0
              )
            : undefined,
        }));

      setItems(wardrobe);
      setNotice(null);
    } catch (err) {
      console.error("Failed to load wardrobe", err);
      setError("Unable to load your wardrobe. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [navigate, token]);

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true, state: { from: "/wardrobe" } });
      return;
    }
    fetchWardrobe();
  }, [fetchWardrobe, navigate, token]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  if (!token) {
    return null;
  }

  const handleDelete = useCallback(
    async (itemId: string) => {
      if (!token) {
        navigate("/login", { replace: true, state: { from: "/wardrobe" } });
        return;
      }

      setDeletingIds((prev) => ({ ...prev, [itemId]: true }));
      try {
        const response = await fetch(
          apiUrl("/api/delete_wardrobe_item/"),
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ id: itemId }),
          }
        );

        if (!response.ok) {
          throw new Error(`Delete failed with status ${response.status}`);
        }

        setItems((prev) => prev.filter((item) => item.id !== itemId));
        setNotice({
          type: "success",
          message: "Outfit removed from your wardrobe.",
        });
      } catch (err) {
        console.error("Failed to delete wardrobe item", err);
        setNotice({
          type: "error",
          message: "Unable to remove that outfit. Please try again.",
        });
      } finally {
        setDeletingIds((prev) => {
          const next = { ...prev };
          delete next[itemId];
          return next;
        });
      }
    },
    [navigate, token]
  );

  return (
    <section className="min-h-screen bg-[#050717] pb-16 pt-20 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-5 sm:px-8 lg:px-12">
        <header className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-white/40">
              Dressi
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
              {wardrobeTitle}
            </h1>
            <p className="mt-2 text-sm text-white/70">
              Save your favourite looks and revisit them anytime.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/10"
            >
              Back to Profile
            </button>
            <button
              type="button"
              onClick={() => navigate("/style-discovery")}
              className="rounded-full bg-pink-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-pink-400"
            >
              Discover More Styles
            </button>
          </div>
        </header>

        <div className="rounded-[32px] border border-white/10 bg-black/30 p-6 backdrop-blur-xl">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-white/70">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white/70" />
              <p>Loading your saved outfits...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center text-white/75">
              <p>{error}</p>
              <button
                type="button"
                onClick={fetchWardrobe}
                className="rounded-full bg-pink-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-pink-400"
              >
                Try Again
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center text-white/70">
              <p>Your wardrobe is empty. Save outfits you love to see them here.</p>
              <button
                type="button"
                onClick={() => navigate("/curated")}
                className="rounded-full bg-pink-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-pink-400"
              >
                View Curated Looks
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {notice ? (
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
                    notice.type === "success"
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                      : "border-rose-500/40 bg-rose-500/10 text-rose-200"
                  }`}
                >
                  {notice.message}
                </div>
              ) : null}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#181c24]"
                  >
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      disabled={Boolean(deletingIds[item.id])}
                      className="absolute right-4 top-4 z-10 rounded-full bg-black/60 p-2 text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:bg-white/10"
                    >
                      <Trash2
                        className="h-4 w-4"
                        aria-hidden="true"
                      />
                      <span className="sr-only">Delete outfit</span>
                    </button>
                    <img
                      src={item.image}
                      alt="Saved outfit"
                      className="h-64 w-full object-cover"
                      loading="lazy"
                    />
                    <div className="flex flex-wrap gap-2 p-5">
                      {Array.isArray(item.tags) && item.tags.length > 0 ? (
                        item.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-white/10 px-3 py-1 text-xs text-white"
                          >
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
                          No tags
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
