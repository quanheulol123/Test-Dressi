import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import EarlyAccessModal from "./EarlyAccessModal";

export default function HeroSection() {
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="relative isolate overflow-hidden"
    >
      <EarlyAccessModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(1200px_600px_at_left_center,rgba(36,50,70,0.85),transparent_65%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(900px_500px_at_right_center,rgba(139,92,246,0.18),transparent_70%)]" />
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-6 py-20 pt-24 lg:grid-cols-2 lg:gap-12 lg:px-8">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-neutral-900/80 text-yellow-300 font-semibold mb-6 text-sm">
            <Crown className="w-4 h-4" />
            AI Fashion Expert
          </div>
          <h1 className="text-6xl font-extrabold leading-[1.05] tracking-tight text-white mb-2">
            Your <span className="text-pink-500">AI Stylist</span>
            <br />
            <span className="text-3xl font-bold text-white">Reimagined <Sparkles className="inline-block text-yellow-300 mb-1" size={28} /></span>
          </h1>
          <p className="mt-6 text-lg text-neutral-300">
            Step into the future of fashion where AI meets haute couture.<br />
            <span className="text-pink-400 font-semibold">Personalized styling that understands your unique beauty.</span>
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-pink-500 px-6 py-3 text-base font-semibold text-white shadow-lg transition hover:bg-pink-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
              onClick={() => navigate("/style-discovery")}
            >
              <Sparkles className="h-5 w-5" />
              Transform My Style
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-semibold text-black shadow-lg ring-1 ring-black/10 transition hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              onClick={() => setModalOpen(true)}
            >
              Get Early Access
            </button>
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative flex justify-center"
        >
          <div className="overflow-hidden rounded-3xl shadow-2xl border-4 border-white/10">
            <img
              src="https://images.unsplash.com/photo-1571513800374-df1bbe650e56?w=900&auto=format&fit=crop&q=80"
              alt="Model in white shirt and black pants"
              className="h-[640px] w-full object-cover object-center"
            />
            <span className="absolute top-6 right-6 bg-pink-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg">
              AI Powered
            </span>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}