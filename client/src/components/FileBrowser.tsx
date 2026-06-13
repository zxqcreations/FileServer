import { useState, useEffect } from 'react';
import { FileItem, fetchFileList } from '../lib/api.js';

interface Props {
  path: string;
  selectedFile: FileItem | null;
  onSelect: (item: FileItem) => void;
  onNavigate: (path: string) => void;
}

export default function FileBrowser({ path, selectedFile, onSelect, onNavigate }: Props) {
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parentPath, setParentPath] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchFileList(path)
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) {
          setItems(res.data.items);
          setParentPath(res.data.parentPath);
        } else {
          setError(res.error?.message || 'Failed to load files');
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [path]);

  const handleClick = (item: FileItem) => {
    if (item.type === 'directory') {
      const newPath = path ? `${path}/${item.name}` : item.name;
      onNavigate(newPath);
    } else {
      onSelect(item);
    }
  };

  if (loading) {
    return <div style={{ padding: 16, color: 'var(--color-text-muted)', fontSize: 13 }}>Loading...</div>;
  }

  if (error) {
    return <div style={{ padding: 16, color: 'var(--color-danger)', fontSize: 13 }}>Error: {error}</div>;
  }

  return (
    <div style={{ overflow: 'auto', flex: 1, padding: '4px 0' }}>
      {parentPath !== null && parentPath !== undefined && (
        <div
          className="file-item"
          onClick={() => onNavigate(parentPath ?? '')}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate(parentPath ?? '')}
          tabIndex={0}
          role="button"
        >
          <span style={{ marginRight: 8 }}>..</span>
          <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>..</span>
        </div>
      )}

      {items.map((item) => (
        <div
          key={item.name}
          className="file-item"
          style={{
            background:
              selectedFile?.name === item.name && item.type === 'file'
                ? 'var(--color-surface-hover)'
                : 'transparent',
          }}
          onClick={() => handleClick(item)}
          onKeyDown={(e) => e.key === 'Enter' && handleClick(item)}
          tabIndex={0}
          role="button"
          aria-selected={selectedFile?.name === item.name}
        >
          <span style={{ marginRight: 8 }}>{item.type === 'directory' ? 'D' : fileIcon(item.name)}</span>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.name}
          </span>
          {item.type === 'file' && item.size != null && (
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', flexShrink: 0, marginLeft: 8 }}>
              {formatSize(item.size)}
            </span>
          )}
        </div>
      ))}

      {items.length === 0 && parentPath === null && (
        <div style={{ padding: 16, color: 'var(--color-text-muted)', fontSize: 13, textAlign: 'center' }}>
          Empty directory
        </div>
      )}
    </div>
  );
}

function fileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  const icons: Record<string, string> = {
    pdf: 'PDF', md: 'MD', txt: 'TXT', json: '{ }',
    png: 'IMG', jpg: 'IMG', jpeg: 'IMG', gif: 'IMG', svg: 'IMG', webp: 'IMG',
    mp4: 'VID', webm: 'VID', mkv: 'VID', mov: 'VID',
    mp3: 'AUD', wav: 'AUD', ogg: 'AUD',
    zip: 'ZIP', tar: 'TAR', gz: 'GZ', '7z': '7Z',
    doc: 'DOC', docx: 'DOC', xls: 'XLS', xlsx: 'XLS',
    ts: 'TS', tsx: 'TSX', js: 'JS', jsx: 'JSX',
    html: 'HTML', css: 'CSS',
  };
  return icons[ext || ''] || '---';
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
