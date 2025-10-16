import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, Sparkles } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  const initials = (user.displayName || user.email)
    .split(" ")
    .map((part) => part[0]?.toUpperCase() || "")
    .join("")
    .slice(0, 2);

  const handleSignOut = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <section className="relative min-h-[calc(100vh-3.5rem)] bg-[#050717] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(250,82,160,0.18),_transparent_55%),_radial-gradient(circle_at_bottom,_rgba(124,58,237,0.2),_transparent_50%)]" />
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-16 sm:px-8 lg:px-12">
        <header className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-white/40">
              Dressi
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
              My Profile
            </h1>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </header>

        <div className="grid gap-6 lg:grid-cols-[340px,1fr]">
          <aside className="flex flex-col gap-6">
            <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl">
              <div className="relative mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 via-fuchsia-500 to-violet-500 text-3xl font-bold text-white shadow-[0_20px_60px_rgba(236,72,153,0.45)]">
                {initials || "U"}
                <div className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-black/80 text-pink-300">
                  <Sparkles className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-6 text-center">
                <h2 className="text-2xl font-semibold capitalize">
                  {user.displayName || user.email.split("@")[0]}
                </h2>
                <p className="text-sm text-white/70">{user.email}</p>
              </div>
            </div>
          </aside>

          <div className="flex flex-col gap-6">
            <section className="rounded-[32px] border border-white/10 bg-black/30 p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">
                  Quick Actions
                </h2>
                <span className="text-xs uppercase tracking-[0.3em] text-white/40">
                  Stay inspired
                </span>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Link
                  to="/style-discovery"
                  className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/10"
                >
                  Retake Style Quiz
                </Link>
                <Link
                  to="/wardrobe"
                  className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/10"
                >
                  Wardrobe
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}
