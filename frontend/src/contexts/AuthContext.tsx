import { createContext, useContext, useMemo, useState } from "react";
import type { AuthUser } from "../lib/auth";
import { clearUser, loadUser, saveUser } from "../lib/auth";

type AuthContextValue = {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  updateUser: (user: AuthUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window === "undefined") return null;
    return loadUser();
  });

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      user,
      login: (profile: AuthUser) => {
        setUser(profile);
        saveUser(profile);
      },
      updateUser: (profile: AuthUser) => {
        setUser(profile);
        saveUser(profile);
      },
      logout: () => {
        setUser(null);
        clearUser();
      },
    }),
    [user],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
