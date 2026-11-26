import { NavLink, Outlet } from "react-router-dom";
import { USE_MOCKS } from "../api/index.js";
import { ROLE_LABELS, useAuth } from "../store/AuthContext.jsx";
import Logo from "./Logo.jsx";

export default function AppShell() {
  const { user, logout } = useAuth();

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <div className="topbar-inner">
          <NavLink to="/" className="brand" aria-label="ArgusAI home">
            <Logo />
            <span className="brand-name">ArgusAI</span>
            <span className="brand-tag">Exam supervision</span>
          </NavLink>
          <nav className="topnav" aria-label="Main">
            <NavLink to="/" end className="topnav-link">
              Exams
            </NavLink>
          </nav>
          <div className="topbar-right">
            {USE_MOCKS && (
              <span className="mode-pill" title="The backend API is not connected yet. Screens show staged demo data.">
                Demo data
              </span>
            )}
            <div className="user-chip">
              <span className="user-avatar" aria-hidden="true">
                {user?.name?.charAt(0) ?? "?"}
              </span>
              <span className="user-text">
                <span className="user-name">{user?.name}</span>
                <span className="user-role">{ROLE_LABELS[user?.role] ?? user?.role}</span>
              </span>
            </div>
            <button type="button" className="button button--ghost button--sm" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main id="main" className="main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="footer">
        Alerts are prompts for human review, not proof of misconduct. Students are identified only by seat and
        temporary tracking IDs.
      </footer>
    </div>
  );
}
