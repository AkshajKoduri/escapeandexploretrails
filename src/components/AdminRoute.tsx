import { ReactNode, useEffect, useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { adminApi, clearAdminPassword, isAdminSession, setAdminPassword } from "@/lib/adminApi";

export default function AdminRoute({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [ok, setOk] = useState<boolean>(() => isAdminSession());
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { document.title = "Admin — E2 Trails"; }, []);

  if (ok) return <>{children}</>;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      setAdminPassword(pwd);
      await adminApi("verify");
      setOk(true);
    } catch (err: any) {
      clearAdminPassword();
      toast.error("Access denied.");
      navigate("/", { replace: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-charcoal text-charcoal-foreground grid place-items-center px-4 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(40 30% 97% / 0.4) 1px, transparent 1px), linear-gradient(90deg, hsl(40 30% 97% / 0.4) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
        aria-hidden="true"
      />
      <form onSubmit={onSubmit} className="relative w-full max-w-sm bg-charcoal border border-charcoal-foreground/15 rounded-xl p-8 shadow-trail">
        <img src={logo} alt="E2 Trails" className="w-12 h-12 rounded-full bg-white object-contain p-1 mx-auto mb-4 shadow-card" />
        <div className="flex items-center justify-center gap-2 mb-1">
          <ShieldCheck className="w-5 h-5 text-accent" aria-hidden="true" />
          <h1 className="font-display font-bold text-xl">E2 TRAILS Admin</h1>
        </div>
        <p className="text-sm text-charcoal-foreground/60 mb-6 text-center">
          Enter the admin password to continue.
        </p>
        <input
          type="password"
          autoFocus
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          placeholder="Password"
          aria-label="Admin password"
          className="w-full px-4 py-3 rounded-lg border border-charcoal-foreground/20 bg-charcoal text-charcoal-foreground placeholder:text-charcoal-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent transition mb-4"
        />
        <button type="submit" disabled={busy} className="btn-accent w-full disabled:opacity-60">
          {busy ? "Verifying…" : "Enter admin"}
        </button>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mt-4 inline-flex items-center gap-1.5 text-xs text-charcoal-foreground/50 hover:text-charcoal-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Back to the public site
        </button>
      </form>
    </main>
  );
}