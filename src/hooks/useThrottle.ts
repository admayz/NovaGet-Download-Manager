import { useEffect, useRef, useState } from 'react';

/**
 * Throttle hook to limit the rate of updates
 * Useful for progress updates that fire too frequently
 */
export function useThrottle<T>(value: T, delay: number = 100): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRun = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      const now = Date.now();
      if (now - lastRun.current >= delay) {
        setThrottledValue(value);
        lastRun.current = now;
      }
    }, delay - (Date.now() - lastRun.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return throttledValue;
}

/**
 * Throttle function for callbacks
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number = 100
): (...args: Parameters<T>) => void {
  let lastRun = 0;
  let timeout: NodeJS.Timeout | null = null;

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    const timeSinceLastRun = now - lastRun;

    if (timeSinceLastRun >= delay) {
      func.apply(this, args);
      lastRun = now;
    } else {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => {
        func.apply(this, args);
        lastRun = Date.now();
      }, delay - timeSinceLastRun);
    }
  };
}
