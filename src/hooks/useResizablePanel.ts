import { useState, useRef, useEffect, useCallback } from 'react';

interface UseResizablePanelOptions {
  defaultWidth?: number;
  minWidth?: number;
  maxWidthPercent?: number;
}

interface UseResizablePanelReturn {
  width: number;
  isResizing: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
  panelRef: React.RefObject<HTMLDivElement>;
  handleMouseDown: (e: React.MouseEvent) => void;
}

/**
 * Hook for creating a resizable panel with optimized performance.
 * Uses requestAnimationFrame and direct DOM manipulation during drag
 * to avoid React re-renders, syncing to state only when drag ends.
 */
export function useResizablePanel({
  defaultWidth = 320,
  minWidth = 150,
  maxWidthPercent = 0.9,
}: UseResizablePanelOptions = {}): UseResizablePanelReturn {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const widthRef = useRef(defaultWidth);
  const rafRef = useRef<number>();

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return;

    // Cancel previous frame to coalesce rapid updates
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    rafRef.current = requestAnimationFrame(() => {
      const containerRect = containerRef.current!.getBoundingClientRect();
      const newWidth = containerRect.right - e.clientX;
      const maxWidth = containerRect.width * maxWidthPercent;

      // Constrain width between min and max
      const constrainedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);

      // Store in ref (no re-render)
      widthRef.current = constrainedWidth;

      // Update DOM directly (bypasses React)
      if (panelRef.current) {
        panelRef.current.style.width = `${constrainedWidth}px`;
      }
    });
  }, [isResizing, minWidth, maxWidthPercent]);

  const handleMouseUp = useCallback(() => {
    // Cancel any pending animation frame
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    // Sync final width to React state once (single re-render)
    setWidth(widthRef.current);
    setIsResizing(false);
  }, []);

  // Add/remove global mouse listeners for resize
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Keep widthRef in sync when width changes externally
  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  return {
    width,
    isResizing,
    containerRef,
    panelRef,
    handleMouseDown,
  };
}
