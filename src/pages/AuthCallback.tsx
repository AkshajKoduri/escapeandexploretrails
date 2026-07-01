import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (error) throw error;
        } else if (window.location.hash.includes("access_token")) {
          // implicit flow — supabase-js will pick it up automatically
          await supabase.auth.getSession();
        }
        const redirect = sessionStorage.getItem("auth_redirect");
        if (redirect) {
          sessionStorage.removeItem("auth_redirect");
          navigate(redirect, { replace: true });
        } else {
          navigate("/", { replace: true });
        }
      } catch (err: any) {
        toast.error(err.message ?? "Sign-in failed");
        navigate("/auth", { replace: true });
      }
    };
    run();
  }, [navigate]);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Signing you in…</p>
    </main>
  );
}
