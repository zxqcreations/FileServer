import { useState, useEffect, useCallback } from 'react';
import { FileItem, fetchFileList, deleteFile as apiDelete, moveFile, copyFile } from '../lib/api.js';

interface Props {
  path: string;
  selectedFile: FileItem | null;
  onSelect: (item: FileItem) => void;
  onNavigate: (path: string) => void;
  onRefresh: () => void;
}

export default function FileBrowser({ path, selectedFile, onSelect, onNavigate, onRefresh }: Props) {
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const loadFiles = useCallback(() => {
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

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const showMsg = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(null), 2500);
  };

  const handleClick = (item: FileItem) => {
    if (item.type === 'directory') {
      const newPath = path ? `${path}/${item.name}` : item.name;
      onNavigate(newPath);
    } else {
      onSelect(item);
    }
  };

  const itemPath = (name: string) => (path ? `${path}/${name}` : name);

  const handleDelete = async (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${name}"?`)) return;

    try {
      const res = await apiDelete(itemPath(name));
      if (res.success) {
        showMsg(`Deleted: ${name}`);
        onRefresh();
      } else {
        showMsg(`Error: ${res.error?.message}`);
      }
    } catch (err: any) {
      showMsg(`Error: ${err.message}`);
    }
  };

  const handleRename = async (oldName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newName = window.prompt(`Rename / Move "${oldName}" to:`, oldName);
    if (!newName || newName === oldName) return;

    try {
      const res = await moveFile(itemPath(oldName), path ? `${path}/${newName}` : newName);
      if (res.success) {
        showMsg(`Moved: ${oldName} → ${newName}`);
        onRefresh();
      } else {
        showMsg(`Error: ${res.error?.message}`);
      }
    } catch (err: any) {
      showMsg(`Error: ${err.message}`);
    }
  };

  const handleCopy = async (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const dest = window.prompt(`Copy "${name}" to:`, itemPath(`${name}.copy`));
    if (!dest) return;

    try {
      const res = await copyFile(itemPath(name), dest);
      if (res.success) {
        showMsg(`Copied: ${name} → ${dest}`);
        onRefresh();
      } else {
        showMsg(`Error: ${res.error?.message}`);
      }
    } catch (err: any) {
      showMsg(`Error: ${err.message}`);
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
      {actionMsg && (
        <div
          style={{
            padding: '6px 12px',
            margin: '0 4px 4px',
            fontSize: 12,
            color: 'var(--color-success)',
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius)',
            textAlign: 'center',
          }}
        >
          {actionMsg}
        </div>
      )}

      {parentPath !== null && parentPath !== undefined && (
        <div
          className="file-item"
          onClick={() => onNavigate(parentPath ?? '')}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate(parentPath ?? '')}
          tabIndex={0}
          role="button"
        >
          <span style={{ marginRight: 8 }}>..</span>
          <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', flex: 1 }}>..</span>
        </div>
      )}

      {items.map((item) => (
        <div key={item.name} style={{ display: 'flex', alignItems: 'center', margin: '1px 0' }}>
          <div
            className="file-item"
            style={{
              flex: 1,
              background:
                selectedFile?.name === item.name && item.type === 'file'
                  ? 'var(--color-surface-hover)'
                  : 'transparent',
              marginRight: 0,
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

          {/* Action buttons */}
          <div className="file-actions" style={{ display: 'flex', flexShrink: 0, paddingRight: 4 }}>
            <button title="Rename / Move" onClick={(e) => handleRename(item.name, e)} style={actionBtnStyle}>
              ✎
            </button>
            <button title="Copy" onClick={(e) => handleCopy(item.name, e)} style={actionBtnStyle}>
              ⎘
            </button>
            <button
              title="Delete"
              onClick={(e) => handleDelete(item.name, e)}
              style={{ ...actionBtnStyle, color: 'var(--color-danger)' }}
            >
              ✕
            </button>
          </div>
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

const actionBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--color-text-muted)',
  cursor: 'pointer',
  padding: '4px 8px',
  fontSize: 14,
  minWidth: 32,
  minHeight: 32,
  borderRadius: 'var(--radius)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

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
