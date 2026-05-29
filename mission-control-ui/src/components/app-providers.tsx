"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type OperatorMode = "default" | "high-contrast" | "large-type";

const OPERATOR_MODE_COOKIE = "operator_mode";
const OPERATOR_MODE_MAX_AGE = 60 * 60 * 24 * 365;

interface OperatorModeContextValue {
  mode: OperatorMode;
  setMode: (mode: OperatorMode) => void;
}

const OperatorModeContext = createContext<OperatorModeContextValue | null>(null);

interface AppProvidersProps {
  initialOperatorMode: OperatorMode;
  children: ReactNode;
}

function applyOperatorMode(mode: OperatorMode) {
  document.body.setAttribute("data-operator-mode", mode);
}

function writeOperatorModeCookie(mode: OperatorMode) {
  document.cookie = `${OPERATOR_MODE_COOKIE}=${mode}; Max-Age=${OPERATOR_MODE_MAX_AGE}; Path=/; SameSite=Lax`;
}

export function AppProviders({ initialOperatorMode, children }: AppProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            gcTime: 30 * 60 * 1000,
          },
        },
      })
  );
  const [operatorMode, setOperatorMode] =
    useState<OperatorMode>(initialOperatorMode);

  useEffect(() => {
    applyOperatorMode(operatorMode);
  }, [operatorMode]);

  const operatorModeContext = useMemo<OperatorModeContextValue>(
    () => ({
      mode: operatorMode,
      setMode: (mode) => {
        setOperatorMode(mode);
        writeOperatorModeCookie(mode);
        applyOperatorMode(mode);
      },
    }),
    [operatorMode],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <OperatorModeContext.Provider value={operatorModeContext}>
        {children}
      </OperatorModeContext.Provider>
    </QueryClientProvider>
  );
}

export function useOperatorMode() {
  const context = useContext(OperatorModeContext);
  if (!context) {
    throw new Error("useOperatorMode must be used within AppProviders");
  }
  return context;
}
