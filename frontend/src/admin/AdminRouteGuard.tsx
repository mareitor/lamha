import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAdminAuth } from "./AdminAuthContext";

// UX-only guard (see AdminAuthContext) — redirects to the login screen if
// no password is remembered for this tab session. The Worker's
// requireAdmin middleware is the real authorization boundary; this just
// avoids flashing admin UI at someone without the password.
export function AdminRouteGuard({ children }: { children: ReactNode }) {
  const { password } = useAdminAuth();
  if (!password) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}
