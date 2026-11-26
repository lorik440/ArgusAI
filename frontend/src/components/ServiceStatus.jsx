import { useCallback, useEffect, useState } from "react";
import { checkService, SERVICES } from "../api/health.js";

const STATE_LABEL = { up: "Running", partial: "Running", down: "Unavailable", checking: "Checking…" };

/** Health of the backend and AI-engine services (the scaffold's /health endpoints). */
export default function ServiceStatus() {
  const [results, setResults] = useState(() =>
    Object.fromEntries(SERVICES.map((service) => [service.id, { state: "checking", detail: "" }])),
  );
  const [checkedAt, setCheckedAt] = useState(null);

  const refresh = useCallback(async (signal) => {
    setResults(Object.fromEntries(SERVICES.map((service) => [service.id, { state: "checking", detail: "" }])));
    const entries = await Promise.all(
      SERVICES.map(async (service) => [service.id, await checkService(service, signal)]),
    );
    if (signal?.aborted) return;
    setResults(Object.fromEntries(entries));
    setCheckedAt(new Date());
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    refresh(controller.signal).catch(() => {});
    return () => controller.abort();
  }, [refresh]);

  return (
    <section className="panel service-status" aria-labelledby="service-status-title">
      <div className="panel-head">
        <h2 id="service-status-title" className="panel-title">
          System status
        </h2>
        <button type="button" className="button button--ghost button--sm" onClick={() => refresh()}>
          Refresh
        </button>
      </div>
      <ul className="service-list" aria-live="polite">
        {SERVICES.map((service) => {
          const result = results[service.id];
          return (
            <li key={service.id} className={`service service--${result.state}`}>
              <span className="service-dot" aria-hidden="true" />
              <span className="service-name">{service.name}</span>
              <span className="service-state">
                {STATE_LABEL[result.state]}
                {result.detail && <span className="service-detail"> · {result.detail}</span>}
              </span>
            </li>
          );
        })}
      </ul>
      {checkedAt && (
        <p className="panel-foot">
          Checked at {checkedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </p>
      )}
    </section>
  );
}
