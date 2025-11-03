'use client';

import { useEffect, useRef, useState, ReactNode, CSSProperties } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  overscan?: number;
  className?: string;
}

/**
 * Virtual scrolling component for large lists
 * Only renders visible items + overscan buffer
 * Significantly improves performance for lists with 100+ items
 */
export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 3,
  className = '',
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  // Calculate total height and offset
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  // Get visible items
  const visibleItems = items.slice(startIndex, endIndex + 1);

  // Handle scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  // Throttle scroll updates
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let ticking = false;
    const handleScrollThrottled = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrollTop(container.scrollTop);
          ticking = false;
        });
        ticking = true;
      }
    };

    container.addEventListener('scroll', handleScrollThrottled);
    return () => container.removeEventListener('scroll', handleScrollThrottled);
  }, []);

  const containerStyle: CSSProperties = {
    height: containerHeight,
    overflow: 'auto',
    position: 'relative',
  };

  const contentStyle: CSSProperties = {
    height: totalHeight,
    position: 'relative',
  };

  const itemsContainerStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    transform: `translateY(${offsetY}px)`,
  };

  return (
    <div
      ref={containerRef}
      className={className}
      style={containerStyle}
      onScroll={handleScroll}
    >
      <div style={contentStyle}>
        <div style={itemsContainerStyle}>
          {visibleItems.map((item, index) => (
            <div
              key={startIndex + index}
              style={{ height: itemHeight }}
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
