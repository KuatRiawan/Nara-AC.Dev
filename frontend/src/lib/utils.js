import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { useState, useEffect, useRef, useCallback } from "react"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function useAbortController() {
  const abortControllerRef = useRef(null);
  const isCancelledRef = useRef(false);

  useEffect(() => {
    return () => {
      isCancelledRef.current = true;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const fetchWithAbort = useCallback(async (fetchFn) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    isCancelledRef.current = false;

    try {
      const result = await fetchFn();
      
      if (isCancelledRef.current) {
        throw new Error('Request cancelled');
      }
      
      return result;
    } catch (err) {
      if (err.name === 'AbortError' || isCancelledRef.current) {
        return null;
      }
      throw err;
    }
  }, []);

  return { abortControllerRef, isCancelledRef, fetchWithAbort };
}

export function useMountedRef() {
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const runIfMounted = useCallback((callback) => {
    if (isMountedRef.current) {
      return callback();
    }
    return null;
  }, []);

  return { isMountedRef, runIfMounted };
}

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const mediaQueryList = window.matchMedia(query);
    const updateMatches = () => setMatches(mediaQueryList.matches);
    
    updateMatches();
    
    mediaQueryList.addEventListener('change', updateMatches);
    
    return () => {
      mediaQueryList.removeEventListener('change', updateMatches);
    };
  }, [query]);

  return matches;
}
