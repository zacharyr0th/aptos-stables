import { useState, useEffect } from 'react';

interface WindowSize {
  width: number;
}

const DEFAULT_WIDTH = 1024;

export function useWindowSize(): WindowSize {
  const [size, setSize] = useState<WindowSize>({
    width: typeof window !== 'undefined' ? window.innerWidth : DEFAULT_WIDTH,
  });

  useEffect(() => {
    const updateSize = () => {
      setSize({
        width: window.innerWidth,
      });
    };

    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return size;
} 