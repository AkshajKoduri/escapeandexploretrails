import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Mountain } from "lucide-react";

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      const redirect = sessionStorage.getItem("auth_redirect");
      if (redirect) {
        sessionStorage.removeItem("auth_redirect");
        navigate(redirect, { replace: true });
      } else {
        const from = (location.state as { from?: string } | undefined)?.from;
        navigate(from === "/booking" ? "/booking" : "/", { replace: true });
      }
    }
  }, [user, loading, navigate, location]);

  useEffect(() => {
    document.title = mode === "login" ? "Log in — E2 Trails" : "Sign up — E2 Trails";
  }, [mode]);

    const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (email.length > 255) throw new Error("Email too long");
      if (password.length < 8 || password.length > 128) throw new Error("Password must be 8-128 characters");
      if (mode === "signup") {
        if (fullName.trim().length < 2 || fullName.length > 100) throw new Error("Please enter a valid full name");
        if (!/^[0-9+\-\s()]{7,15}$/.test(phone.trim())) {
          throw new Error("Please enter a valid mobile number");
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: fullName, phone: phone.trim() },
          },
        });
        if (error) throw error;
        if (data.user) {
          await supabase.from("profiles").update({ phone: phone.trim(), full_name: fullName }).eq("id", data.user.id);
        }
        toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const from = (location.state as { from?: string } | undefined)?.from;
        navigate(from === "/booking" ? "/booking" : "/");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    const from = (location.state as { from?: string } | undefined)?.from;
    if (from === "/booking") {
      sessionStorage.setItem("auth_redirect", "/booking");
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: "https://e2trails.in/auth/callback" },
    });
    if (error) {
      toast.error(error.message ?? "Google sign-in failed");
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary/10 via-background to-primary/10 px-4 py-16">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-trail border border-primary/10 p-8 md:p-10">
        <Link to="/" className="flex items-center justify-center gap-2 mb-6 text-primary">
          <Mountain className="w-7 h-7" />
          <span className="font-heading font-extrabold text-xl">E2 TRAILS</span>
        </Link>
        <h1 className="font-heading font-bold text-2xl text-center text-primary">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="text-center text-sm text-muted-foreground mt-1">
          {mode === "login" ? "Log in to book your next adventure." : "Sign up to book treks and store your details."}
        </p>

        <button
          onClick={google}
          disabled={busy}
          type="button"
          className="mt-6 w-full inline-flex items-center justify-center gap-3 px-5 py-3 rounded-lg border border-input bg-background hover:bg-muted transition disabled:opacity-60"
        >
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.24 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.45.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.95l3.66-2.84Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"/></svg>
          Continue with Google
        </button>

        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex-1 h-px bg-border" /> OR <div className="flex-1 h-px bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <>
              <input
                type="text"
                required
                placeholder="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <input
                type="tel"
                required
                placeholder="Mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </>
          )}
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password (min 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full px-6 py-3 rounded-full bg-gradient-orange text-accent-foreground font-semibold shadow-glow hover:scale-[1.02] transition disabled:opacity-60"
          >
            {busy ? "Please wait..." : mode === "login" ? "Log in" : "Sign up"}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {mode === "login" ? "New here?" : "Already have an account?"}{" "}
          <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="text-accent font-semibold hover:underline">
            {mode === "login" ? "Create an account" : "Log in"}
          </button>
        </p>
      </div>
    </main>
  );
}
