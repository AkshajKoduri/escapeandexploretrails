import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <main className="min-h-screen grid place-items-center text-muted-foreground">Loading…</main>;
  }
  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
