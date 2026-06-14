import { useState, useCallback, useEffect } from 'react';
import FileTree from './components/FileTree.js';
import FileUploader from './components/FileUploader.js';
import FileViewer from './components/FileViewer.js';
import ApiDocs from './components/ApiDocs.js';
import ThemeToggle from './components/ThemeToggle.js';
import ResizeHandle from './components/ResizeHandle.js';
import TabBar, { type Tab, MAX_TABS } from './components/TabBar.js';
import { useTheme } from './hooks/useTheme.js';
import { useWebSocket } from './hooks/useWebSocket.js';
import { FileItem } from './lib/api.js';
import './App.css';

type Page = 'files' | 'docs';

function getInitialPage(): Page {
  return window.location.pathname === '/doc' ? 'docs' : 'files';
}

let tabIdCounter = 0;
function nextTabId(): string {
  return `tab-${++tabIdCounter}`;
}

export default function App() {
  const [page, setPage] = useState<Page>(getInitialPage);
  const [refreshKey, setRefreshKey] = useState(0);

  // Tab state
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // Resize state
  const [sidebarWidth, setSidebarWidth] = useState(280);

  // Theme
  const { theme, toggle: toggleTheme } = useTheme();

  // Sync URL with page state
  useEffect(() => {
    const desiredPath = page === 'docs' ? '/doc' : '/';
    if (window.location.pathname !== desiredPath) {
      window.history.pushState(null, '', desiredPath);
    }
  }, [page]);

  // Handle browser back/forward
  useEffect(() => {
    const onPop = () => setPage(getInitialPage());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((p: Page) => setPage(p), []);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // WebSocket: auto-refresh on upload
  useWebSocket({
    onUpload: useCallback(() => {
      handleRefresh();
    }, [handleRefresh]),
  });

  // Open a file in a tab
  const openTab = useCallback((file: FileItem, path: string) => {
    setTabs((prev) => {
      const existing = prev.find(
        (t) => t.file.name === file.name && t.currentPath === path
      );
      if (existing) {
        setActiveTabId(existing.id);
        return prev;
      }

      const id = nextTabId();
      const newTab: Tab = { id, file, currentPath: path };
      let next = [...prev, newTab];

      // Enforce max tabs
      if (next.length > MAX_TABS) {
        const idx = next.findIndex((t) => t.id !== activeTabId);
        if (idx >= 0) next.splice(idx, 1);
        else next.shift();
      }

      setActiveTabId(id);
      return next;
    });
  }, [activeTabId]);

  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      next.splice(idx, 1);

      if (id === activeTabId) {
        if (next.length === 0) {
          setActiveTabId(null);
        } else if (idx < next.length) {
          setActiveTabId(next[idx].id);
        } else {
          setActiveTabId(next[next.length - 1].id);
        }
      }

      return next;
    });
  }, [activeTabId]);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;

  const selectedFilePath = activeTab
    ? (activeTab.currentPath ? `${activeTab.currentPath}/${activeTab.file.name}` : activeTab.file.name)
    : null;

  const handleResize = useCallback((width: number) => {
    setSidebarWidth(width);
    document.documentElement.style.setProperty('--sidebar-width', `${width}px`);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>FileServer</h1>
          <nav className="header-nav">
            <button
              className={`nav-link${page === 'files' ? ' active' : ''}`}
              onClick={() => navigate('files')}
            >
              Files
            </button>
            <button
              className={`nav-link${page === 'docs' ? ' active' : ''}`}
              onClick={() => navigate('docs')}
            >
              API Docs
            </button>
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {page === 'files' && (
            <FileUploader
              targetPath=""
              onComplete={handleRefresh}
            />
          )}
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>

      {page === 'docs' ? (
        <div className="main-panel" style={{ flex: 1 }}>
          <div className="main-panel-content" style={{ alignItems: 'flex-start' }}>
            <ApiDocs />
          </div>
        </div>
      ) : (
        <div className="app-body">
          <aside className="sidebar" style={{ width: sidebarWidth }}>
            <div className="sidebar-header">
              <span>Files</span>
            </div>
            <FileTree
              key={refreshKey}
              selectedFilePath={selectedFilePath}
              onSelectFile={openTab}
              onRefresh={handleRefresh}
            />
          </aside>

          <ResizeHandle onResize={handleResize} />

          <main className="main-panel">
            {activeTab ? (
              <>
                <TabBar
                  tabs={tabs}
                  activeTabId={activeTabId}
                  onSelectTab={setActiveTabId}
                  onCloseTab={closeTab}
                />
                <div className="main-panel-content">
                  <FileViewer
                    file={activeTab.file}
                    currentPath={activeTab.currentPath}
                  />
                </div>
              </>
            ) : (
              <div className="main-panel-content">
                <div className="empty-state">
                  <p>Select a file to preview</p>
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
