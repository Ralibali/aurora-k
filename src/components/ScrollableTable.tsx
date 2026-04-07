import { useRef, useState, useEffect, useCallback, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface ScrollableTableProps {
  children: ReactNode;
  className?: string;
}

export function ScrollableTable({ children, className = '' }: ScrollableTableProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const check = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    check();
    const el = ref.current;
    if (!el) return;
    el.addEventListener('scroll', check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', check); ro.disconnect(); };
  }, [check]);

  return (
    <div className={`relative ${className}`}>
      {/* Left fade */}
      <div
        className={`pointer-events-none absolute left-0 top-0 bottom-0 w-6 z-20 bg-gradient-to-r from-card to-transparent transition-opacity duration-200 ${canScrollLeft ? 'opacity-100' : 'opacity-0'}`}
      />
      {/* Right fade + arrow hint */}
      <div
        className={`pointer-events-none absolute right-0 top-0 bottom-0 w-10 z-20 bg-gradient-to-l from-card to-transparent transition-opacity duration-200 flex items-center justify-end pr-1 ${canScrollRight ? 'opacity-100' : 'opacity-0'}`}
      >
        <ChevronRight className="h-4 w-4 text-muted-foreground animate-pulse" />
      </div>
      <div ref={ref} className="overflow-x-auto">
        {children}
      </div>
    </div>
  );
}
