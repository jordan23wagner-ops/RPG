import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface TooltipPortalProps {
  children: React.ReactNode;
  x: number;
  y: number;
}

export function TooltipPortal({ children, x, y }: TooltipPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div style={{ position: 'fixed', left: x, top: y, zIndex: 1000, pointerEvents: 'none' }}>
      {children}
    </div>,
    document.body
  );
}
