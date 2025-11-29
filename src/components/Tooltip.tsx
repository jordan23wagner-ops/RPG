import { useState, useRef, useEffect, useLayoutEffect } from 'react';

export function Tooltip({ text }: { text: string }) {
  const [visible, setVisible] = useState(false);
  const [sticky, setSticky] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [style, setStyle] = useState<React.CSSProperties | undefined>(undefined);
  const [position, setPosition] = useState<'top' | 'bottom'>('bottom');
  const isTouchRef = useRef<boolean>(typeof window !== 'undefined' && ('ontouchstart' in window || (navigator && (navigator as any).maxTouchPoints > 0)));

  // Close when clicking outside if sticky
  useEffect(() => {
    if (!sticky) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        setVisible(false);
        setSticky(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [sticky]);

  const handleClick = () => {
    setSticky(prev => {
      const next = !prev;
      setVisible(next);
      return next;
    });
  };

  // Compute tooltip position whenever it becomes visible or on resize/scroll
  const computePosition = () => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const margin = 12;

    // Responsive width: on narrow screens use nearly full width
    const maxTooltipWidth = 360;
    const minTooltipWidth = 200;
    const vw = Math.max(0, window.innerWidth - margin * 2);
    const tooltipWidth = Math.min(maxTooltipWidth, Math.max(minTooltipWidth, Math.floor(vw * 0.85)));

    // Prefer above if there's room, otherwise below
    const availableAbove = rect.top;
    const availableBelow = window.innerHeight - rect.bottom;
    const preferAbove = availableAbove > availableBelow;
    const chosen: 'top' | 'bottom' = preferAbove ? 'top' : 'bottom';

    // horizontal center, but clamp to viewport with margin
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - tooltipWidth - margin));

    // Compute top using measured size: if top, place above button; otherwise below.
    const approxHeight = 80; // approximate; will reflow if needed
    const top = chosen === 'top' ? rect.top - margin - approxHeight : rect.bottom + margin;

    setPosition(chosen);
    setStyle({ position: 'fixed', left: `${left}px`, top: `${top}px`, width: `${tooltipWidth}px`, zIndex: 9999 });
  };

  useLayoutEffect(() => {
    if (visible) {
      computePosition();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    const onResize = () => {
      if (visible) computePosition();
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [visible]);

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        ref={buttonRef}
        onMouseEnter={() => { if (!isTouchRef.current) setVisible(true); }}
        onMouseLeave={() => { if (!sticky && !isTouchRef.current) setVisible(false); }}
        onFocus={() => setVisible(true)}
        onBlur={() => { if (!sticky && !isTouchRef.current) setVisible(false); }}
        onClick={handleClick}
        className="w-6 h-6 rounded-full bg-yellow-500 text-black flex items-center justify-center text-xs font-bold shadow-md"
        aria-label="Zone Heat info"
        type="button"
      >
        i
      </button>

      {visible && (
        <div style={style} className={`bg-gray-900 text-gray-100 ${window.innerWidth < 420 ? 'text-xs p-2' : 'text-sm p-2'} rounded shadow-lg`}>
          {text}
        </div>
      )}
    </div>
  );
}

export default Tooltip;
