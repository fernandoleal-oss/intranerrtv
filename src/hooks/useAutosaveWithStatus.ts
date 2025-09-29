import { useEffect, useRef, useCallback, useState } from "react";

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function useAutosaveWithStatus<T>(
  deps: T[], 
  fn: () => Promise<void> | void, 
  delay = 1200
) {
  const timeoutRef = useRef<number>();
  const lastSavedRef = useRef<string>();
  const fnRef = useRef(fn);
  const isInitialMount = useRef(true);
  
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [lastSaved, setLastSaved] = useState<Date>()
  
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
      const hasData = deps.some(dep => dep && typeof dep === 'object' && Object.keys(dep).length > 0);
      if (hasData) {
        lastSavedRef.current = currentState;
        setStatus('saving')
        
        try {
          await fnRef.current();
          setStatus('saved')
          setLastSaved(new Date())
        } catch (error) {
          setStatus('error')
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

  const saveNow = useCallback(async () => {
    setStatus('saving')
    try {
      await fnRef.current();
      setStatus('saved')
      setLastSaved(new Date())
    } catch (error) {
      setStatus('error')
      throw error
    }
  }, [])

  return { status, lastSaved, saveNow }
}