import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";

// UX-only guard: remembers the password in sessionStorage so a page
// refresh doesn't log the admin out mid-session. The REAL authorization
// boundary is server-side (requireAdmin on the Worker checks every
// request) — this context just decides what the admin app *shows*.
const STORAGE_KEY = "lamha_admin_password";

interface AdminAuthContextValue {
  password: string | null;
  setPassword: (password: string) => void;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [password, setPasswordState] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const setPassword = useCallback((next: string) => {
    setPasswordState(next);
    try {
      sessionStorage.setItem(STORAGE_KEY, next);
    } catch {
      // sessionStorage unavailable (private browsing, etc.) — in-memory
      // state still works for the current tab session.
    }
  }, []);

  const logout = useCallback(() => {
    setPasswordState(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <AdminAuthContext.Provider value={{ password, setPassword, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
