import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTORS = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(ref, isOpen, onEscape) {
  const firstFocusableRef = useRef(null);
  const lastFocusableRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !ref.current) return;

    const focusableElements = Array.from(ref.current.querySelectorAll(FOCUSABLE_SELECTORS));
    
    if (focusableElements.length === 0) return;

    firstFocusableRef.current = focusableElements[0];
    lastFocusableRef.current = focusableElements[focusableElements.length - 1];

    firstFocusableRef.current.focus();

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusableRef.current) {
          e.preventDefault();
          lastFocusableRef.current.focus();
        }
      } else {
        if (document.activeElement === lastFocusableRef.current) {
          e.preventDefault();
          firstFocusableRef.current.focus();
        }
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        onEscape();
      }
    };

    const handleFocusIn = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        firstFocusableRef.current.focus();
      }
    };

    const dialog = ref.current;
    dialog.addEventListener('keydown', handleTabKey);
    dialog.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocusIn);

    return () => {
      dialog.removeEventListener('keydown', handleTabKey);
      dialog.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, [isOpen, onEscape]);
}

export default useFocusTrap;
