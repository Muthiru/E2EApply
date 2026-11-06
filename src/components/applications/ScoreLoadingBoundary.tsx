"use client";

import { createContext, useCallback, useState, useContext } from "react";
import type { ReactNode } from "react";
import { ActionLoadingOverlay } from "@/components/ui/ActionLoadingOverlay";

type LoadingState = { active: boolean; message: string };
type SetScoreLoading = (active: boolean, message: string) => void;

const ScoreLoadingContext = createContext<SetScoreLoading | null>(null);

export function ScoreLoadingBoundary({ children }: Readonly<{ children: ReactNode }>) {
  const [state, setState] = useState<LoadingState>({ active: false, message: "" });
  const setLoading = useCallback<SetScoreLoading>((active, message) => {
    setState({ active, message });
  }, []);

  return (
    <ScoreLoadingContext.Provider value={setLoading}>
      <ActionLoadingOverlay active={state.active} message={state.message || "Updating this job’s score…"}>
        {children}
      </ActionLoadingOverlay>
    </ScoreLoadingContext.Provider>
  );
}

export function useScoreLoading() {
  return useContext(ScoreLoadingContext);
}
