import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../store/AuthContext.jsx";
import { LoadingState } from "./States.jsx";

export default function RequireAuth({ children }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") return <LoadingState label="Checking your session…" fullPage />;
  if (status !== "authenticated") return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}
