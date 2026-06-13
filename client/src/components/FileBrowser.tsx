import { useState, useEffect, useCallback } from 'react';
import { FileItem, fetchFileList, deleteFile as apiDelete, moveFile, copyFile, createDirectory } from '../lib/api.js';
import Modal from './ui/Modal.js';

type ModalType = 'rename' | 'copy' | 'delete' | 'newFolder' | null;

interface ModalState {
  type: ModalType;
  itemName?: string;
}

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

  // Modal state
  const [modal, setModal] = useState<ModalState>({ type: null });
  const [modalInput, setModalInput] = useState('');

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

  const openModal = (type: ModalType, itemName?: string) => {
    setModal({ type, itemName });
    if (type === 'rename') {
      setModalInput(itemName || '');
    } else if (type === 'copy') {
      setModalInput(itemPath(`${(itemName || 'file')}.copy`));
    } else if (type === 'newFolder') {
      setModalInput('');
    } else {
      setModalInput('');
    }
  };

  const closeModal = () => {
    setModal({ type: null });
    setModalInput('');
  };

  const handleDelete = async () => {
    const name = modal.itemName;
    if (!name) return;
    closeModal();

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

  const handleRename = async () => {
    const oldName = modal.itemName;
    if (!oldName || !modalInput || modalInput === oldName) {
      closeModal();
      return;
    }
    closeModal();

    try {
      const res = await moveFile(itemPath(oldName), path ? `${path}/${modalInput}` : modalInput);
      if (res.success) {
        showMsg(`Moved: ${oldName} → ${modalInput}`);
        onRefresh();
      } else {
        showMsg(`Error: ${res.error?.message}`);
      }
    } catch (err: any) {
      showMsg(`Error: ${err.message}`);
    }
  };

  const handleCopy = async () => {
    const name = modal.itemName;
    if (!name || !modalInput) {
      closeModal();
      return;
    }
    closeModal();

    try {
      const res = await copyFile(itemPath(name), modalInput);
      if (res.success) {
        showMsg(`Copied: ${name} → ${modalInput}`);
        onRefresh();
      } else {
        showMsg(`Error: ${res.error?.message}`);
      }
    } catch (err: any) {
      showMsg(`Error: ${err.message}`);
    }
  };

  const handleNewFolder = async () => {
    const name = modalInput.trim();
    if (!name) {
      closeModal();
      return;
    }
    closeModal();

    try {
      const dirPath = path ? `${path}/${name}` : name;
      const res = await createDirectory(dirPath);
      if (res.success) {
        showMsg(`Created folder: ${name}`);
        onRefresh();
      } else {
        showMsg(`Error: ${res.error?.message}`);
      }
    } catch (err: any) {
      showMsg(`Error: ${err.message}`);
    }
  };

  const handleModalSubmit = () => {
    switch (modal.type) {
      case 'delete': return handleDelete();
      case 'rename': return handleRename();
      case 'copy': return handleCopy();
      case 'newFolder': return handleNewFolder();
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

      {/* New Folder button */}
      <div style={{ padding: '4px 8px' }}>
        <button
          onClick={() => openModal('newFolder')}
          style={{
            ...actionBtnStyle,
            width: '100%',
            justifyContent: 'flex-start',
            padding: '6px 12px',
            fontSize: 13,
            gap: 6,
            color: 'var(--color-accent)',
          }}
        >
          + New Folder
        </button>
      </div>

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
            <button
              title="Rename / Move"
              onClick={(e) => { e.stopPropagation(); openModal('rename', item.name); }}
              style={actionBtnStyle}
            >
              ✎
            </button>
            <button
              title="Copy"
              onClick={(e) => { e.stopPropagation(); openModal('copy', item.name); }}
              style={actionBtnStyle}
            >
              ⎘
            </button>
            <button
              title="Delete"
              onClick={(e) => { e.stopPropagation(); openModal('delete', item.name); }}
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

      {/* === Modals === */}

      {/* Rename/Move Modal */}
      <Modal open={modal.type === 'rename'} title={`Rename / Move "${modal.itemName}"`} onClose={closeModal}>
        <label style={{ fontSize: 13, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>
          New path (relative to current directory):
        </label>
        <input
          autoFocus
          value={modalInput}
          onChange={(e) => setModalInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleModalSubmit(); if (e.key === 'Escape') closeModal(); }}
          style={inputStyle}
          placeholder="new-name.txt or subdir/new-name.txt"
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={closeModal} style={cancelBtnStyle}>Cancel</button>
          <button onClick={handleModalSubmit} style={okBtnStyle}>Move</button>
        </div>
      </Modal>

      {/* Copy Modal */}
      <Modal open={modal.type === 'copy'} title={`Copy "${modal.itemName}"`} onClose={closeModal}>
        <label style={{ fontSize: 13, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>
          Destination path:
        </label>
        <input
          autoFocus
          value={modalInput}
          onChange={(e) => setModalInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleModalSubmit(); if (e.key === 'Escape') closeModal(); }}
          style={inputStyle}
          placeholder="path/to/copy"
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={closeModal} style={cancelBtnStyle}>Cancel</button>
          <button onClick={handleModalSubmit} style={okBtnStyle}>Copy</button>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal open={modal.type === 'delete'} title="Confirm Delete" onClose={closeModal}>
        <p style={{ fontSize: 14, color: 'var(--color-text)', marginBottom: 16 }}>
          Are you sure you want to delete <strong>"{modal.itemName}"</strong>?
        </p>
        <p style={{ fontSize: 12, color: 'var(--color-danger)', marginBottom: 16 }}>
          This action cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={closeModal} style={cancelBtnStyle}>Cancel</button>
          <button onClick={handleModalSubmit} style={{ ...okBtnStyle, background: 'var(--color-danger)' }}>Delete</button>
        </div>
      </Modal>

      {/* New Folder Modal */}
      <Modal open={modal.type === 'newFolder'} title="New Folder" onClose={closeModal}>
        <label style={{ fontSize: 13, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>
          Folder name:
        </label>
        <input
          autoFocus
          value={modalInput}
          onChange={(e) => setModalInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleModalSubmit(); if (e.key === 'Escape') closeModal(); }}
          style={inputStyle}
          placeholder="new-folder"
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={closeModal} style={cancelBtnStyle}>Cancel</button>
          <button onClick={handleModalSubmit} style={okBtnStyle}>Create</button>
        </div>
      </Modal>
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

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  background: 'var(--color-bg)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius)',
  color: 'var(--color-text)',
  fontFamily: 'var(--font-mono)',
  fontSize: 13,
  outline: 'none',
};

const okBtnStyle: React.CSSProperties = {
  background: 'var(--color-accent)',
  color: '#fff',
  border: 'none',
  padding: '8px 20px',
  borderRadius: 'var(--radius)',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
  minHeight: 36,
};

const cancelBtnStyle: React.CSSProperties = {
  background: 'var(--color-surface-hover)',
  color: 'var(--color-text-muted)',
  border: '1px solid var(--color-border)',
  padding: '8px 20px',
  borderRadius: 'var(--radius)',
  cursor: 'pointer',
  fontSize: 13,
  minHeight: 36,
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
