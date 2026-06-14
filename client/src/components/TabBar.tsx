import type { FileItem } from '../lib/api.js';

export interface Tab {
  id: string;
  file: FileItem;
  currentPath: string;
}

interface Props {
  tabs: Tab[];
  activeTabId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
}

export const MAX_TABS = 10;

export default function TabBar({ tabs, activeTabId, onSelectTab, onCloseTab }: Props) {
  if (tabs.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        overflowX: 'auto',
        flexShrink: 0,
        minHeight: 34,
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            onAuxClick={(e) => {
              if (e.button === 1) {
                e.preventDefault();
                onCloseTab(tab.id);
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              cursor: 'pointer',
              borderRight: '1px solid var(--color-border)',
              borderBottom: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
              background: isActive ? 'var(--color-bg)' : 'transparent',
              color: isActive ? 'var(--color-text)' : 'var(--color-text-muted)',
              fontSize: 12,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              userSelect: 'none',
              minWidth: 0,
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {tab.file.name}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.id);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                fontSize: 14,
                padding: 0,
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 18,
                height: 18,
                borderRadius: 3,
                flexShrink: 0,
              }}
              title="Close tab"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
