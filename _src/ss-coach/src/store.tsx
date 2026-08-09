import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AppState } from "./lib/types";
import { loadState, saveState, type SaveOutcome } from "./lib/storage";

interface Store {
  state: AppState;
  /** Apply a pure update; the result is autosaved. */
  update: (fn: (s: AppState) => AppState) => void;
  /** Replace state wholesale (import / reset). */
  replace: (next: AppState) => void;
  saveIssue: Exclude<SaveOutcome, "ok"> | null;
  recoveredFromCorruption: boolean;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(loadState);
  const [state, setState] = useState<AppState>(initial.state);
  const [saveIssue, setSaveIssue] = useState<Store["saveIssue"]>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Autosave: persist after every committed state change.
  useEffect(() => {
    const outcome = saveState(state);
    setSaveIssue(outcome === "ok" ? null : outcome);
  }, [state]);

  const update = useCallback((fn: (s: AppState) => AppState) => {
    setState(fn);
  }, []);

  const replace = useCallback((next: AppState) => {
    setState(next);
  }, []);

  // Flush on page hide as a final safety net for in-flight interactions.
  useEffect(() => {
    const flush = () => saveState(stateRef.current);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flush);
    };
  }, []);

  const value = useMemo(
    () => ({
      state,
      update,
      replace,
      saveIssue,
      recoveredFromCorruption: initial.recoveredFromCorruption,
    }),
    [state, update, replace, saveIssue, initial.recoveredFromCorruption]
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error("useStore outside provider");
  return s;
}
