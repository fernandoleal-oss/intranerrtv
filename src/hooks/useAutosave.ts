import { useEffect, useRef, useCallback } from "react";

export function useAutosave<T>(deps: T[], fn: () => Promise<void> | void, delay = 1200) {
  const timeoutRef = useRef<number>();
  const lastSavedRef = useRef<string>();
  const fnRef = useRef(fn);
  const isInitialMount = useRef(true);
  
  // Update fn ref without causing re-renders
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);
  
  const debouncedSave = useCallback(async () => {
    // Skip autosave on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    const currentState = JSON.stringify(deps);
    
    // Only save if the state has actually changed and has meaningful data
    if (lastSavedRef.current !== currentState && deps && deps.length > 0) {
      const hasData = deps.some(dep => {
        if (dep && typeof dep === 'object') {
          return Object.keys(dep).length > 0;
        }
        return Boolean(dep);
      });
      
      if (hasData) {
        lastSavedRef.current = currentState;
        try {
          await fnRef.current();
        } catch (error) {
          console.warn('Autosave failed:', error);
        }
      }
    }
  }, [deps]);
  
  useEffect(() => {
    clearTimeout(timeoutRef.current);
    
    // Don't start timer on initial mount
    if (!isInitialMount.current) {
      timeoutRef.current = window.setTimeout(debouncedSave, delay);
    }
    
    return () => clearTimeout(timeoutRef.current);
  }, [debouncedSave, delay]);
}