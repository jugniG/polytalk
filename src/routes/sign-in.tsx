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
