import { useNavigate } from "react-router-dom";
import { AlertTriangle, Home } from "lucide-react";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050717] px-6 py-16 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(236,72,153,0.22),_transparent_60%),_radial-gradient(circle_at_bottom,_rgba(124,58,237,0.18),_transparent_55%)]" />

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center gap-8 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
          <AlertTriangle className="h-4 w-4 text-pink-400" />
          Error 404
        </span>

        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">
          We lost the runway.
        </h1>

        <p className="max-w-2xl text-lg leading-relaxed text-white/70">
          The page you&apos;re trying to reach doesn&apos;t exist, has been moved,
          or was never part of the Dressi experience. Let&apos;s guide you back
          to somewhere inspiring.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 rounded-full bg-pink-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-pink-400"
          >
            <Home className="h-4 w-4" />
            Back to Home
          </button>
        </div>
      </div>
    </section>
  );
}
