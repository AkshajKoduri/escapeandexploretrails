import { ReactNode, useEffect, useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Mountain } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { adminApi, adminLogin, clearAdminSession, isAdminSession } from "@/lib/adminApi";

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
      await adminLogin(pwd);
      await adminApi("verify");
      setPwd("");
      setOk(true);
    } catch (err: any) {
      clearAdminSession();
      setPwd("");
      toast.error(err?.message ?? "Access denied.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary/10 via-background to-primary/10 px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-card rounded-2xl shadow-trail border border-primary/10 p-8 text-center"
      >
        <img src={logo} alt="E2 Trails" className="w-14 h-14 rounded-full bg-white object-contain p-1 mx-auto mb-3 shadow-card" />
        <div className="flex items-center justify-center gap-2 mb-2">
          <Mountain className="w-5 h-5 text-primary" />
          <h1 className="font-heading font-bold text-xl text-primary">E2 TRAILS Admin</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">Enter the admin password to continue.</p>
        <input
          type="password"
          autoFocus
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          placeholder="Password"
          className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-accent transition mb-4"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full px-6 py-3 rounded-full bg-gradient-orange text-accent-foreground font-semibold shadow-glow hover:scale-[1.02] transition-transform disabled:opacity-60"
        >
          {busy ? "Verifying…" : "Enter Admin"}
        </button>
      </form>
    </main>
  );
}
