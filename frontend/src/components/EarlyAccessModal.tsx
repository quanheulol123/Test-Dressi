import { useState } from "react";
import { X, Crown } from "lucide-react";
import { memo } from "react";

const EarlyAccessModal = memo(function EarlyAccessModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.match(/^[^@]+@[^@]+\.[^@]+$/)) {
      setError("Please enter a valid email address.");
      return;
    }
    setSubmitted(true);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-black"
          onClick={onClose}
        >
          <X size={24} />
        </button>
        <div className="flex items-center gap-2 mb-4">
          <Crown className="text-yellow-500" size={28} />
          <span className="font-bold text-lg text-black">Get Early Access</span>
        </div>
        <h2 className="text-2xl font-extrabold mb-2 text-pink-500">Be the First to Try Dressi Mobile!</h2>
        <p className="text-gray-700 mb-6">
          Enter your email to join the exclusive waitlist for our upcoming mobile app. We'll notify you as soon as it's ready!
        </p>
        {submitted ? (
          <div className="text-green-600 font-semibold text-center py-6">
            Thank you! You’re on the list. 🎉
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="email"
              className="border border-gray-300 rounded-lg px-4 py-2 text-black"
              placeholder="Your email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            {error && <div className="text-red-500 text-sm">{error}</div>}
            <button
              type="submit"
              className="bg-pink-500 text-white px-6 py-2 rounded-lg font-semibold shadow hover:bg-pink-600 transition"
            >
              Join Early Access
            </button>
          </form>
        )}
      </div>
    </div>
  );
});

export default EarlyAccessModal;