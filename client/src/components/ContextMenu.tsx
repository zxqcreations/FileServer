import { useEffect, useRef } from 'react';

export interface ContextMenuAction {
  label: string;
  icon?: string;
  onClick: () => void;
  danger?: boolean;
  separator?: boolean;
}

interface Props {
  x: number;
  y: number;
  items: ContextMenuAction[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    // Delay to avoid the same click that opened it closing it
    setTimeout(() => {
      document.addEventListener('click', handleClick);
      document.addEventListener('keydown', handleKey);
    }, 0);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - items.length * 36 - 16);

  // Filter out separator-only items from count for positioning
  const visibleItems = items.filter((item) => !item.separator);

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: adjustedX,
        top: adjustedY,
        zIndex: 1000,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.24)',
        minWidth: 180,
        padding: '4px 0',
      }}
    >
      {items.map((item, i) => {
        if (item.separator) {
          return (
            <div
              key={`sep-${i}`}
              style={{
                height: 1,
                background: 'var(--color-border)',
                margin: '4px 8px',
              }}
            />
          );
        }

        return (
          <button
            key={i}
            onClick={() => {
              item.onClick();
              onClose();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '6px 14px',
              background: 'none',
              border: 'none',
              color: item.danger ? 'var(--color-danger)' : 'var(--color-text)',
              fontSize: 13,
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-hover)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'none';
            }}
          >
            {item.icon && <span style={{ width: 16, textAlign: 'center', fontSize: 14 }}>{item.icon}</span>}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
