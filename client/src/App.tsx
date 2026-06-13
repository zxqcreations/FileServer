import { useState, useCallback } from 'react';
import FileBrowser from './components/FileBrowser.js';
import FileUploader from './components/FileUploader.js';
import FileViewer from './components/FileViewer.js';
import { FileItem } from './lib/api.js';
import './App.css';

export default function App() {
  const [currentPath, setCurrentPath] = useState('');
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

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

  return (
    <div className="app">
      <header className="app-header">
        <h1>FileServer</h1>
        <FileUploader
          targetPath={currentPath}
          onComplete={handleUploadComplete}
        />
      </header>

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
