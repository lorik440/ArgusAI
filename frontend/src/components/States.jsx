export function LoadingState({ label = "Loading…", fullPage = false }) {
  return (
    <div className={fullPage ? "state state--page" : "state"} role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ error, onRetry, title = "Something went wrong" }) {
  return (
    <div className="state state--error" role="alert">
      <p className="state-title">{title}</p>
      <p className="state-detail">{error?.message ?? String(error)}</p>
      {onRetry && (
        <button type="button" className="button button--secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="state state--empty">
      <p className="state-title">{title}</p>
      {children && <div className="state-detail">{children}</div>}
    </div>
  );
}
