import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/index.js";
import { setToken, setUnauthorizedHandler } from "../api/client.js";
import { readSession, removeSession, writeSession } from "../lib/storage.js";

const TOKEN_KEY = "argus.token";
const AuthContext = createContext(null);

export const ROLE_LABELS = {
  supervisor: "Supervisor",
  admin: "Administrator",
  viewer: "Viewer",
};

/**
 * Holds the signed-in user. The token is kept in sessionStorage so it is
 * cleared when the tab closes, which suits shared supervision computers.
 */
export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: "loading", user: null });

  const logout = useCallback(() => {
    setToken(null);
    removeSession(TOKEN_KEY);
    setState({ status: "anonymous", user: null });
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    const token = readSession(TOKEN_KEY);
    if (!token) {
      setState({ status: "anonymous", user: null });
      return undefined;
    }
    setToken(token);
    let cancelled = false;
    api.me().then(
      (user) => !cancelled && setState({ status: "authenticated", user }),
      () => !cancelled && logout(),
    );
    return () => {
      cancelled = true;
    };
  }, [logout]);

  const login = useCallback(async (username, password) => {
    const result = await api.login(username, password);
    setToken(result.access_token);
    writeSession(TOKEN_KEY, result.access_token);
    const user = result.user ?? (await api.me());
    setState({ status: "authenticated", user });
    return user;
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      login,
      logout,
      canReview: state.user ? state.user.role !== "viewer" : false,
    }),
    [state, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>.");
  return context;
}
