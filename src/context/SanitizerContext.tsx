import { createContext, useContext, type ReactNode } from "react";
import type { SanitizeHtmlFn } from "@/domain/sanitizer";
import { noopSanitizer } from "@/domain/sanitizer";

const SanitizerContext = createContext<SanitizeHtmlFn>(noopSanitizer);

export interface SanitizerProviderProps {
  sanitizer: SanitizeHtmlFn;
  children: ReactNode;
}

/**
 * Sanitizer를 Context로 제공합니다.
 */
export function SanitizerProvider({
  sanitizer,
  children,
}: SanitizerProviderProps) {
  return (
    <SanitizerContext.Provider value={sanitizer}>
      {children}
    </SanitizerContext.Provider>
  );
}

/**
 * Sanitizer를 사용하는 Hook
 */
export function useSanitizer(): SanitizeHtmlFn {
  return useContext(SanitizerContext);
}
