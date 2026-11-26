import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Runs an async loader whenever `deps` change. Keeps the previous data while
 * reloading so the screen does not flash empty.
 */
export function useAsync(loader, deps) {
  const [state, setState] = useState({ data: undefined, error: null, loading: true });
  const [nonce, setNonce] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    let cancelled = false;
    setState((previous) => ({ ...previous, loading: true, error: null }));
    loaderRef.current().then(
      (data) => {
        if (!cancelled) setState({ data, error: null, loading: false });
      },
      (error) => {
        if (!cancelled) setState((previous) => ({ data: previous.data, error, loading: false }));
      },
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);
  const setData = useCallback(
    (updater) =>
      setState((previous) => ({
        ...previous,
        data: typeof updater === "function" ? updater(previous.data) : updater,
      })),
    [],
  );

  return { ...state, reload, setData };
}
