import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { USE_MOCKS } from "../api/index.js";
import Logo from "../components/Logo.jsx";
import { useAuth } from "../store/AuthContext.jsx";

export default function LoginPage() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;
  const target = from ? `${from.pathname}${from.search ?? ""}` : "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === "authenticated") return <Navigate to={target} replace />;

  async function onSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(username.trim(), password);
      navigate(target, { replace: true });
    } catch (err) {
      setError(err.message || "Sign-in failed.");
      setSubmitting(false);
    }
  }

  return (
    <div className="login">
      <div className="login-card">
        <div className="login-brand">
          <Logo size={40} />
          <div>
            <h1 className="login-title">ArgusAI</h1>
            <p className="login-subtitle">Exam supervision assistant</p>
          </div>
        </div>

        <form className="login-form" onSubmit={onSubmit} noValidate>
          <label className="field">
            <span className="field-label">Username</span>
            <input
              name="username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              autoFocus
            />
          </label>
          <label className="field">
            <span className="field-label">Password</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="button button--primary button--block" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {USE_MOCKS && (
          <div className="login-demo">
            <strong>Demo mode.</strong> The backend API is not connected, so any username and password work. Start the
            username with <code>admin</code> for an administrator, or <code>mentor</code> for a read-only viewer.
          </div>
        )}

        <p className="login-note">
          For authorized exam staff. Alerts are review prompts, not proof of misconduct, and the final decision always
          rests with the supervisor.
        </p>
      </div>
    </div>
  );
}
