import { useCallback, useRef, useEffect } from 'react';

interface Props {
  onResize: (width: number) => void;
}

export default function ResizeHandle({ onResize }: Props) {
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startWidth.current = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width'),
      10
    ) || 280;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = e.clientX - startX.current;
      const newWidth = Math.min(500, Math.max(180, startWidth.current + delta));
      onResize(newWidth);
    };

    const onMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [onResize]);

  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        width: 4,
        cursor: 'col-resize',
        background: 'transparent',
        flexShrink: 0,
        position: 'relative',
        zIndex: 10,
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'var(--color-accent)';
      }}
      onMouseLeave={(e) => {
        if (!dragging.current) {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
        }
      }}
    />
  );
}
