import { useState, useEffect, useRef, useCallback } from 'react'

type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function useAutosaveWithStatus<T>(
  deps: T[], 
  fn: () => Promise<void> | void, 
  delay = 1200
) {
  const [status, setStatus] = useState<AutosaveStatus>('idle')
  const timeoutRef = useRef<number>()
  const lastSavedRef = useRef<string>()
  const fnRef = useRef(fn)
  const isInitialMount = useRef(true)
  
  // Update fn ref without causing re-renders
  useEffect(() => {
    fnRef.current = fn
  }, [fn])
  
  const saveNow = useCallback(async () => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    
    const currentState = JSON.stringify(deps)
    
    // Only save if the state has actually changed and has meaningful data
    if (lastSavedRef.current !== currentState && deps && deps.length > 0) {
      const hasData = deps.some(dep => {
        if (dep && typeof dep === 'object') {
          return Object.keys(dep).length > 0
        }
        return Boolean(dep)
      })
      
      if (hasData) {
        setStatus('saving')
        lastSavedRef.current = currentState
        
        try {
          await fnRef.current()
          setStatus('saved')
          
          // Auto-hide "saved" status after 2 seconds
          setTimeout(() => setStatus('idle'), 2000)
        } catch (error) {
          console.warn('Autosave failed:', error)
          setStatus('error')
          
          // Auto-hide error status after 3 seconds
          setTimeout(() => setStatus('idle'), 3000)
        }
      }
    }
  }, [deps])
  
  const debouncedSave = useCallback(() => {
    clearTimeout(timeoutRef.current)
    
    // Don't start timer on initial mount
    if (!isInitialMount.current) {
      timeoutRef.current = window.setTimeout(saveNow, delay)
    }
  }, [saveNow, delay])
  
  useEffect(() => {
    debouncedSave()
    
    return () => clearTimeout(timeoutRef.current)
  }, [debouncedSave])

  // Manual save function
  const triggerSave = useCallback(() => {
    clearTimeout(timeoutRef.current)
    saveNow()
  }, [saveNow])

  return { status, saveNow: triggerSave }
}