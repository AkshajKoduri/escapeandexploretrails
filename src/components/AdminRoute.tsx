import { ReactNode, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

const ADMIN_EMAIL = "koduri134679@gmail.com";

export default function AdminRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  const isAdmin = !!user && user.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!loading && user && !isAdmin) {
      toast({ title: "Access denied", variant: "destructive" });
    }
  }, [loading, user, isAdmin]);

  if (loading) {
    return <main className="min-h-screen grid place-items-center text-muted-foreground">Loading…</main>;
  }
  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
