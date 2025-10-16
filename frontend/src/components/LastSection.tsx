import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import EarlyAccessModal from "./EarlyAccessModal";

export default function CallToActionSection() {
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="bg-gradient-to-b from-white via-pink-50 to-white py-24"
    >
      <EarlyAccessModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <div className="mx-auto max-w-2xl text-center px-4">
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-neutral-100 text-yellow-600 font-semibold mb-6 text-sm shadow">
          <Crown className="w-4 h-4" />
          Join The Fashion Revolution
        </div>
        <h2 className="text-5xl font-extrabold mb-4 text-black">
          Ready to Be <span className="text-pink-500">Unforgettable?</span>
        </h2>
        <p className="text-lg text-neutral-700 mb-8">
          Join the exclusive community of style mavens who've discovered the secret to <span className="text-pink-500 font-semibold">effortless, magnetic confidence</span> through AI-powered personal styling.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-black bg-black px-7 py-3 text-base font-semibold text-white shadow-lg transition hover:bg-pink-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
            onClick={() => navigate("/style-discovery")}
          >
            <Sparkles className="h-5 w-5" />
            Begin My Style Journey
            <ArrowRight className="h-5 w-5 ml-2" />
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-black bg-white px-7 py-3 text-base font-semibold text-black shadow-lg ring-1 ring-black/10 transition hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-200"
            onClick={() => setModalOpen(true)}
          >
            <Crown className="h-5 w-5" />
            Get VIP Early Access
            <ArrowRight className="h-5 w-5 ml-2" />
          </button>
        </div>
      </div>
    </motion.section>
  );
}