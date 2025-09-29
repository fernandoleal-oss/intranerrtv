import { useEffect, useRef, useCallback } from "react";

export function useAutosave<T>(deps: T[], fn: () => void, delay = 800) {
  const timeoutRef = useRef<number>();
  const lastSavedRef = useRef<string>();
  const fnRef = useRef(fn);
  
  // Update fn ref without causing re-renders
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);
  
  const debouncedSave = useCallback(() => {
    const currentState = JSON.stringify(deps);
    
    // Only save if the state has actually changed
    if (lastSavedRef.current !== currentState) {
      lastSavedRef.current = currentState;
      fnRef.current();
    }
  }, [deps]);
  
  useEffect(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(debouncedSave, delay);
    
    return () => clearTimeout(timeoutRef.current);
  }, [debouncedSave, delay]);
}