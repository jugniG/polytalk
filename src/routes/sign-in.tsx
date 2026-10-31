import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/sign-in")({
  component: SignIn,
});

function SignIn() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isPending) {
    return (
      <div className="min-h-[100dvh] bg-[#0c0c0e] text-white flex items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  if (session?.user) {
    void navigate({ to: "/translate" });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = isSignUp
        ? await authClient.signUp.email({ email, password, name })
        : await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(result.error.message || (isSignUp ? "Sign up failed" : "Sign in failed"));
      } else {
        void navigate({ to: "/translate" });
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#0c0c0e] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight">
            PolyTalk
          </h1>
          <p className="mt-2 text-sm text-white/40">
            {isSignUp ? "Create an account to start translating" : "Sign in to continue"}
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void authClient.signIn.social({
              provider: "google",
              callbackURL: "/translate",
            })
          }
          className="flex h-10 w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] text-sm font-medium text-white transition hover:bg-white/[0.08]"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M12 10.2v3.9h5.5c-.24 1.3-.96 2.4-2 3.1l3.2 2.5c1.9-1.75 3-4.3 3-7.3 0-.7-.06-1.37-.18-2H12z"
            />
            <path
              fill="#34A853"
              d="M12 22c2.7 0 4.97-.9 6.63-2.43l-3.2-2.5c-.89.6-2.03.95-3.43.95-2.64 0-4.88-1.78-5.68-4.18l-3.32 2.57C4.66 19.98 8.09 22 12 22z"
            />
            <path
              fill="#4A90E2"
              d="M6.32 13.84A5.99 5.99 0 0 1 6 12c0-.64.11-1.25.32-1.84L2.99 7.59A9.99 9.99 0 0 0 2 12c0 1.61.38 3.13 1.06 4.47l3.26-2.63z"
            />
            <path
              fill="#FBBC05"
              d="M12 6c1.47 0 2.8.5 3.84 1.49l2.88-2.88C16.97 3 14.7 2 12 2 8.09 2 4.66 4.02 2.99 7.59l3.33 2.57C7.12 7.78 9.36 6 12 6z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-[10px] uppercase tracking-widest text-white/30">or</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4">
          {isSignUp && (
            <div className="grid gap-2">
              <label htmlFor="name" className="text-xs uppercase tracking-widest text-white/50">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder-white/30 outline-none focus:border-white/30 transition-colors"
                required
              />
            </div>
          )}

          <div className="grid gap-2">
            <label htmlFor="email" className="text-xs uppercase tracking-widest text-white/50">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder-white/30 outline-none focus:border-white/30 transition-colors"
              required
            />
          </div>

          <div className="grid gap-2">
            <label htmlFor="password" className="text-xs uppercase tracking-widest text-white/50">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder-white/30 outline-none focus:border-white/30 transition-colors"
              required
              minLength={8}
            />
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3">
              <p className="text-sm text-rose-300">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-10 w-full rounded-full bg-white text-sm font-semibold text-zinc-950 transition hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
            }}
            className="text-sm text-white/40 hover:text-white transition-colors"
          >
            {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-white/25">
          <Link to="/" className="hover:text-white/50 transition-colors">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
