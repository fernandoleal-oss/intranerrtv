import { useEffect, useRef } from "react";

export function useAutosave<T>(deps: T[], fn: () => void, delay = 800) {
  const timeoutRef = useRef<number>();
  
  useEffect(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(fn, delay);
    
    return () => clearTimeout(timeoutRef.current);
  }, deps);
}