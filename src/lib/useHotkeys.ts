import { useEffect } from 'react';

type KeyHandler = (event: KeyboardEvent) => void;

// Function keys are allowed even while typing (they don't produce text).
const ALWAYS_ALLOWED = new Set(['f2', 'f3', 'f4', 'f5', 'f6', 'escape', '/', '?']);

export function useHotkeys(handlers: Record<string, KeyHandler>, deps: unknown[] = []) {
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT');

      const key = event.key.toLowerCase();
      const handler = handlers[key];
      if (!handler) return;

      if (isTyping && !ALWAYS_ALLOWED.has(key)) return;

      handler(event);
      event.preventDefault();
    };

    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}