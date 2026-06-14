import { useState, useEffect, useCallback } from 'react';
import { FileItem, fetchFileList } from '../lib/api.js';
import ContextMenu, { type ContextMenuAction } from './ContextMenu.js';
import Modal from './ui/Modal.js';
import { deleteFile as apiDelete, moveFile, copyFile, createDirectory } from '../lib/api.js';

interface TreeNode {
  item: FileItem;
  path: string;
  depth: number;
  expanded: boolean;
  loaded: boolean;
  children: TreeNode[];
}

interface ContextMenuState {
  x: number;
  y: number;
  node: TreeNode;
}

interface Props {
  selectedFilePath: string | null;
  onSelectFile: (item: FileItem, path: string) => void;
  onRefresh: () => void;
}

type ModalType = 'rename' | 'copy' | 'delete' | 'newFolder' | null;

function buildNode(item: FileItem, parentPath: string, depth: number): TreeNode {
  const path = parentPath ? `${parentPath}/${item.name}` : item.name;
  return {
    item,
    path,
    depth,
    expanded: false,
    loaded: false,
    children: [],
  };
}

export default function FileTree({ selectedFilePath, onSelectFile, onRefresh }: Props) {
  const [rootNodes, setRootNodes] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Context menu
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null);

  // Modal state
  const [modal, setModal] = useState<{ type: ModalType; node?: TreeNode }>({ type: null });
  const [modalInput, setModalInput] = useState('');

  const loadRoot = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchFileList('')
      .then((res) => {
        if (res.success && res.data) {
          const nodes = res.data.items.map((item) => buildNode(item, '', 0));
          setRootNodes(nodes);
        } else {
          setError(res.error?.message || 'Failed to load');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadRoot(); }, [loadRoot]);

  const showMsg = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(null), 2500);
  };

  // Load children of a directory node
  const loadChildren = useCallback(async (node: TreeNode): Promise<TreeNode[]> => {
    try {
      const res = await fetchFileList(node.path);
      if (res.success && res.data) {
        return res.data.items.map((item) => buildNode(item, node.path, node.depth + 1));
      }
    } catch {}
    return [];
  }, []);

  const handleToggleExpand = useCallback(async (node: TreeNode) => {
    if (!node.loaded) {
      const children = await loadChildren(node);
      node.children = children;
      node.loaded = true;
    }
    node.expanded = !node.expanded;
    setRootNodes([...rootNodes]);
  }, [rootNodes, loadChildren]);

  const handleClick = useCallback((node: TreeNode) => {
    if (node.item.type === 'directory') {
      handleToggleExpand(node);
    } else {
      onSelectFile(node.item, node.path);
    }
  }, [onSelectFile, handleToggleExpand]);

  const handleContextMenu = useCallback((e: React.MouseEvent, node: TreeNode) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, node });
  }, []);

  // Action handlers
  const handleDelete = async () => {
    const node = modal.node;
    if (!node) return;
    setModal({ type: null });
    try {
      const res = await apiDelete(node.path);
      if (res.success) {
        showMsg(`Deleted: ${node.item.name}`);
        onRefresh();
        loadRoot();
      } else {
        showMsg(`Error: ${res.error?.message}`);
      }
    } catch (err: any) {
      showMsg(`Error: ${err.message}`);
    }
  };

  const handleRename = async () => {
    const node = modal.node;
    if (!node || !modalInput || modalInput === node.item.name) {
      setModal({ type: null });
      return;
    }
    setModal({ type: null });
    try {
      const parentPath = node.path.split('/').slice(0, -1).join('/');
      const newPath = parentPath ? `${parentPath}/${modalInput}` : modalInput;
      const res = await moveFile(node.path, newPath);
      if (res.success) {
        showMsg(`Moved: ${node.item.name} → ${modalInput}`);
        onRefresh();
        loadRoot();
      } else {
        showMsg(`Error: ${res.error?.message}`);
      }
    } catch (err: any) {
      showMsg(`Error: ${err.message}`);
    }
  };

  const handleCopy = async () => {
    const node = modal.node;
    if (!node || !modalInput) {
      setModal({ type: null });
      return;
    }
    setModal({ type: null });
    try {
      const res = await copyFile(node.path, modalInput);
      if (res.success) {
        showMsg(`Copied: ${node.item.name} → ${modalInput}`);
        onRefresh();
        loadRoot();
      } else {
        showMsg(`Error: ${res.error?.message}`);
      }
    } catch (err: any) {
      showMsg(`Error: ${err.message}`);
    }
  };

  const handleNewFolder = async () => {
    const name = modalInput.trim();
    const parentPath = modal.node?.item.type === 'directory' ? modal.node.path : '';
    if (!name) {
      setModal({ type: null });
      return;
    }
    setModal({ type: null });
    try {
      const dirPath = parentPath ? `${parentPath}/${name}` : name;
      const res = await createDirectory(dirPath);
      if (res.success) {
        showMsg(`Created folder: ${name}`);
        onRefresh();
        loadRoot();
      } else {
        showMsg(`Error: ${res.error?.message}`);
      }
    } catch (err: any) {
      showMsg(`Error: ${err.message}`);
    }
  };

  const handleModalSubmit = () => {
    switch (modal.type) {
      case 'delete': handleDelete(); break;
      case 'rename': handleRename(); break;
      case 'copy': handleCopy(); break;
      case 'newFolder': handleNewFolder(); break;
    }
  };

  // Build context menu items
  const getContextMenuItems = (node: TreeNode): ContextMenuAction[] => {
    const items: ContextMenuAction[] = [];

    if (node.item.type === 'directory') {
      items.push({
        label: 'New Folder',
        icon: '+',
        onClick: () => {
          setModal({ type: 'newFolder', node });
          setModalInput('');
        },
      });
      items.push({ label: '', onClick: () => {}, separator: true });
    }

    items.push({
      label: 'Rename / Move',
      icon: '✎',
      onClick: () => {
        setModal({ type: 'rename', node });
        setModalInput(node.item.name);
      },
    });

    items.push({
      label: 'Copy',
      icon: '⎘',
      onClick: () => {
        const parentPath = node.path.split('/').slice(0, -1).join('/');
        const newPath = parentPath ? `${parentPath}/${node.item.name}.copy` : `${node.item.name}.copy`;
        setModal({ type: 'copy', node });
        setModalInput(newPath);
      },
    });

    if (node.item.type === 'file') {
      items.push({
        label: 'Download',
        icon: '↓',
        onClick: () => {
          window.open(`/api/download?path=${encodeURIComponent(node.path)}`, '_blank');
        },
      });
    }

    items.push({ label: '', onClick: () => {}, separator: true });

    items.push({
      label: 'Delete',
      icon: '✕',
      onClick: () => setModal({ type: 'delete', node }),
      danger: true,
    });

    return items;
  };

  // Flatten visible nodes (DFS, only expanded directories show children)
  const flattenNodes = useCallback((nodes: TreeNode[]): TreeNode[] => {
    const result: TreeNode[] = [];
    for (const node of nodes) {
      result.push(node);
      if (node.expanded && node.children.length > 0) {
        result.push(...flattenNodes(node.children));
      }
    }
    return result;
  }, []);

  const iconFor = (item: FileItem): string => {
    if (item.type === 'directory') return '\u{1F4C1}';
    const ext = item.name.split('.').pop()?.toLowerCase();
    const icons: Record<string, string> = {
      pdf: '\u{1F4C4}', md: '\u{1F4DD}', txt: '\u{1F4C3}', json: '\u{1F4CB}',
      png: '\u{1F5BC}', jpg: '\u{1F5BC}', jpeg: '\u{1F5BC}', gif: '\u{1F5BC}', svg: '\u{1F5BC}', webp: '\u{1F5BC}',
      mp4: '\u{1F3AC}', webm: '\u{1F3AC}', mkv: '\u{1F3AC}', mov: '\u{1F3AC}',
      mp3: '\u{1F3B5}', wav: '\u{1F3B5}', ogg: '\u{1F3B5}',
      zip: '\u{1F4E6}', tar: '\u{1F4E6}', gz: '\u{1F4E6}', '7z': '\u{1F4E6}',
      html: '\u{1F310}', htm: '\u{1F310}',
      ts: '⚡', tsx: '⚡', js: '⚡', jsx: '⚡', css: '\u{1F3A8}',
    };
    return icons[ext || ''] || '\u{1F4C4}';
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (loading) {
    return <div style={{ padding: 16, color: 'var(--color-text-muted)', fontSize: 13 }}>Loading...</div>;
  }

  if (error) {
    return <div style={{ padding: 16, color: 'var(--color-danger)', fontSize: 13 }}>Error: {error}</div>;
  }

  const visibleNodes = flattenNodes(rootNodes);

  return (
    <div style={{ overflow: 'auto', flex: 1, padding: '4px 0' }}>
      {actionMsg && (
        <div style={{
          padding: '6px 12px', margin: '0 4px 4px', fontSize: 12,
          color: 'var(--color-success)', background: 'var(--color-surface)',
          borderRadius: 'var(--radius)', textAlign: 'center',
        }}>
          {actionMsg}
        </div>
      )}

      {/* Refresh button */}
      <div style={{ padding: '4px 8px' }}>
        <button
          onClick={() => { loadRoot(); onRefresh(); }}
          title="Refresh"
          style={{
            background: 'none', border: '1px solid var(--color-border)',
            color: 'var(--color-text-muted)', cursor: 'pointer',
            padding: '4px 10px', borderRadius: 'var(--radius)',
            fontSize: 12, width: '100%', textAlign: 'left',
          }}
        >
          {'↻'} Refresh
        </button>
      </div>

      {visibleNodes.length === 0 && (
        <div style={{ padding: 16, color: 'var(--color-text-muted)', fontSize: 13, textAlign: 'center' }}>
          Empty directory
        </div>
      )}

      {visibleNodes.map((node) => {
        const isSelected = node.item.type === 'file' && node.path === selectedFilePath;

        return (
          <div
            key={node.path}
            onClick={() => handleClick(node)}
            onContextMenu={(e) => handleContextMenu(e, node)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '4px 8px',
              paddingLeft: 8 + node.depth * 20,
              cursor: 'pointer',
              fontSize: 13,
              userSelect: 'none',
              borderRadius: 'var(--radius)',
              margin: '1px 4px',
              minHeight: 32,
              background: isSelected ? 'var(--color-surface-hover)' : 'transparent',
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-hover)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }
            }}
          >
            {/* Expand/collapse arrow for directories */}
            <span style={{ width: 18, flexShrink: 0, textAlign: 'center', fontSize: 10, color: 'var(--color-text-muted)' }}>
              {node.item.type === 'directory' ? (node.expanded ? '▼' : '▶') : ''}
            </span>

            <span style={{ marginRight: 6, flexShrink: 0 }}>{iconFor(node.item)}</span>

            <span style={{
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {node.item.name}
            </span>

            {node.item.type === 'file' && node.item.size != null && (
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)', flexShrink: 0, marginLeft: 8 }}>
                {formatSize(node.item.size)}
              </span>
            )}
          </div>
        );
      })}

      {/* Context Menu */}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={getContextMenuItems(ctxMenu.node)}
          onClose={() => setCtxMenu(null)}
        />
      )}

      {/* Rename Modal */}
      <Modal open={modal.type === 'rename'} title={`Rename / Move "${modal.node?.item.name}"`} onClose={() => setModal({ type: null })}>
        <label style={{ fontSize: 13, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>
          New path (relative to root):
        </label>
        <input
          autoFocus
          value={modalInput}
          onChange={(e) => setModalInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleModalSubmit(); if (e.key === 'Escape') setModal({ type: null }); }}
          style={inputStyle}
          placeholder="new-name.txt or subdir/new-name.txt"
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={() => setModal({ type: null })} style={cancelBtnStyle}>Cancel</button>
          <button onClick={handleModalSubmit} style={okBtnStyle}>Move</button>
        </div>
      </Modal>

      {/* Copy Modal */}
      <Modal open={modal.type === 'copy'} title={`Copy "${modal.node?.item.name}"`} onClose={() => setModal({ type: null })}>
        <label style={{ fontSize: 13, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>
          Destination path:
        </label>
        <input
          autoFocus
          value={modalInput}
          onChange={(e) => setModalInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleModalSubmit(); if (e.key === 'Escape') setModal({ type: null }); }}
          style={inputStyle}
          placeholder="path/to/copy"
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={() => setModal({ type: null })} style={cancelBtnStyle}>Cancel</button>
          <button onClick={handleModalSubmit} style={okBtnStyle}>Copy</button>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal open={modal.type === 'delete'} title="Confirm Delete" onClose={() => setModal({ type: null })}>
        <p style={{ fontSize: 14, color: 'var(--color-text)', marginBottom: 16 }}>
          Are you sure you want to delete <strong>"{modal.node?.item.name}"</strong>?
        </p>
        <p style={{ fontSize: 12, color: 'var(--color-danger)', marginBottom: 16 }}>
          This action cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={() => setModal({ type: null })} style={cancelBtnStyle}>Cancel</button>
          <button onClick={handleModalSubmit} style={{ ...okBtnStyle, background: 'var(--color-danger)' }}>Delete</button>
        </div>
      </Modal>

      {/* New Folder Modal */}
      <Modal open={modal.type === 'newFolder'} title="New Folder" onClose={() => setModal({ type: null })}>
        <label style={{ fontSize: 13, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>
          Folder name:
        </label>
        <input
          autoFocus
          value={modalInput}
          onChange={(e) => setModalInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleModalSubmit(); if (e.key === 'Escape') setModal({ type: null }); }}
          style={inputStyle}
          placeholder="new-folder"
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={() => setModal({ type: null })} style={cancelBtnStyle}>Cancel</button>
          <button onClick={handleModalSubmit} style={okBtnStyle}>Create</button>
        </div>
      </Modal>
    </div>
  );
}

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
