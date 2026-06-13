import { useState, useCallback, useEffect } from 'react';
import FileBrowser from './components/FileBrowser.js';
import FileUploader from './components/FileUploader.js';
import FileViewer from './components/FileViewer.js';
import ApiDocs from './components/ApiDocs.js';
import { FileItem } from './lib/api.js';
import './App.css';

type Page = 'files' | 'docs';

function getInitialPage(): Page {
  return window.location.pathname === '/doc' ? 'docs' : 'files';
}

export default function App() {
  const [page, setPage] = useState<Page>(getInitialPage);
  const [currentPath, setCurrentPath] = useState('');
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

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

  const handleSelect = useCallback((item: FileItem) => {
    if (item.type === 'file') {
      setSelectedFile(item);
    }
  }, []);

  const handleNavigate = useCallback((path: string) => {
    setCurrentPath(path);
    setSelectedFile(null);
  }, []);

  const handleUploadComplete = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
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
        {page === 'files' && (
          <FileUploader
            targetPath={currentPath}
            onComplete={handleUploadComplete}
          />
        )}
      </header>

      {page === 'docs' ? (
        <div className="main-panel" style={{ flex: 1 }}>
          <div className="main-panel-content" style={{ alignItems: 'flex-start' }}>
            <ApiDocs />
          </div>
        </div>
      ) : (
        <div className="app-body">
          <aside className="sidebar">
            <div className="sidebar-header">
              <span>Files</span>
              <span>{currentPath || '/'}</span>
            </div>
            <FileBrowser
              key={refreshKey}
              path={currentPath}
              selectedFile={selectedFile}
              onSelect={handleSelect}
              onNavigate={handleNavigate}
              onRefresh={handleRefresh}
            />
          </aside>

          <main className="main-panel">
            {selectedFile ? (
              <>
                <div className="main-panel-header">
                  <span>{selectedFile.name}</span>
                  <span style={{ marginLeft: 'auto', color: 'var(--color-text-muted)' }}>
                    {selectedFile.size != null
                      ? formatSize(selectedFile.size)
                      : ''}
                  </span>
                  <a
                    className="download-btn"
                    href={`/api/download?path=${encodeURIComponent(currentPath ? `${currentPath}/${selectedFile.name}` : selectedFile.name)}`}
                    download={selectedFile.name}
                  >
                    Download
                  </a>
                </div>
                <div className="main-panel-content">
                  <FileViewer file={selectedFile} currentPath={currentPath} />
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

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
