import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { apiUrl } from "../lib/api";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_PATTERN =
  /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>\\/~`_[\]\-+=]).{8,}$/;

function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}

function isStrongPassword(value: string): boolean {
  return PASSWORD_PATTERN.test(value);
}

export default function SignupPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formValues, setFormValues] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    terms: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;
    setFormValues(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formValues.terms) {
      setError("Please accept the terms to continue.");
      return;
    }

    if (!isValidEmail(formValues.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!isStrongPassword(formValues.password)) {
      setError(
        "Password must be at least 8 characters, include an uppercase letter and a special character."
      );
      return;
    }

    if (formValues.password !== formValues.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(apiUrl("/api/signup_mongo/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formValues.email,
          password: formValues.password,
          displayName: formValues.name.trim(),
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = typeof payload?.error === "string" && payload.error.trim()
          ? payload.error
          : "Unable to create your account. Please try again.";
        throw new Error(message);
      }

      login({
        email: payload?.user?.email || formValues.email,
        displayName: payload?.user?.displayName || formValues.name.trim(),
        token: payload?.access,
      });

      navigate("/profile", { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center bg-gradient-to-br from-amber-200 via-fuchsia-200 to-indigo-200 px-4 text-zinc-900">
      <div className="w-full max-w-lg rounded-3xl border border-white/60 bg-white/80 p-8 shadow-2xl backdrop-blur">
        <header className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-zinc-500">Join the beta</p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-900">Create your Dressi account</h1>
          <p className="mt-3 text-sm text-zinc-600">
            Sign up to unlock curated outfits, instant styling ideas, and personalised edit drops.
          </p>
        </header>
        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <label className="block text-left text-sm font-medium text-zinc-700" htmlFor="name">
            Full name
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Alex Morgan"
              autoComplete="name"
              required
              value={formValues.name}
              onChange={handleChange}
              className="mt-2 w-full rounded-2xl border border-white/80 bg-white px-4 py-3 text-base text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
            />
          </label>
          <label className="block text-left text-sm font-medium text-zinc-700" htmlFor="email">
            Email
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
              value={formValues.email}
              onChange={handleChange}
              className="mt-2 w-full rounded-2xl border border-white/80 bg-white px-4 py-3 text-base text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
            />
          </label>
          <label className="block text-left text-sm font-medium text-zinc-700" htmlFor="password">
            Password
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Create a strong password"
              autoComplete="new-password"
              required
              value={formValues.password}
              onChange={handleChange}
              className="mt-2 w-full rounded-2xl border border-white/80 bg-white px-4 py-3 text-base text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
            />
          </label>
          <label className="block text-left text-sm font-medium text-zinc-700" htmlFor="confirmPassword">
            Confirm password
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Repeat your password"
              autoComplete="new-password"
              required
              value={formValues.confirmPassword}
              onChange={handleChange}
              className="mt-2 w-full rounded-2xl border border-white/80 bg-white px-4 py-3 text-base text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
            />
          </label>
          <label className="flex items-start gap-3 text-sm text-zinc-600">
            <input
              type="checkbox"
              name="terms"
              required
              checked={formValues.terms}
              onChange={handleChange}
              className="mt-1 h-4 w-4 rounded border-zinc-400 text-indigo-500 focus:ring-indigo-400"
            />
            I agree to receive styling updates and accept the Dressi privacy policy.
          </label>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full rounded-2xl bg-zinc-900 px-4 py-3 text-center text-base font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-zinc-900/40 ${isSubmitting ? "cursor-not-allowed opacity-70" : "hover:bg-zinc-800"}`}
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        </form>
        <p className="mt-8 text-center text-sm text-zinc-600">
          Already with us? <Link className="font-semibold text-zinc-900 underline-offset-4 hover:underline" to="/login">Sign in</Link>
        </p>
      </div>
    </section>
  );
}
