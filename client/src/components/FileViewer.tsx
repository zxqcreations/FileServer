import { useState, useEffect, Suspense, lazy } from 'react';
import { FileItem, getFileViewUrl, fetchPreview, type PreviewData } from '../lib/api.js';

const PdfViewer = lazy(() => import('./PdfViewer.js'));
const MarkdownViewer = lazy(() => import('./MarkdownViewer.js'));
const OfficeViewer = lazy(() => import('./OfficeViewer.js'));
const VideoPlayer = lazy(() => import('./VideoPlayer.js'));
const HtmlViewer = lazy(() => import('./HtmlViewer.js'));

const TEXT_PREVIEW_MAX_BYTES = 1 * 1024 * 1024; // 1 MB full preview
const TEXT_PREVIEW_SIZE_LIMIT = 100 * 1024 * 1024; // 100 MB — larger files get head-only

interface Props {
  file: FileItem;
  currentPath: string;
}

function getFileType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['md', 'markdown'].includes(ext)) return 'markdown';
  if (['docx', 'doc'].includes(ext)) return 'docx';
  if (['xlsx', 'xls', 'csv'].includes(ext)) return 'xlsx';
  if (['pptx', 'ppt'].includes(ext)) return 'pptx';
  if (['mp4', 'webm', 'mkv', 'mov', 'avi'].includes(ext)) return 'video';
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(ext)) return 'image';
  if (['txt', 'log', 'json', 'xml', 'css', 'js', 'ts', 'jsx', 'tsx', 'env', 'yaml', 'yml', 'toml'].includes(ext)) return 'text';
  if (['html', 'htm'].includes(ext)) return 'html';
  if (['mp3', 'wav', 'ogg', 'flac'].includes(ext)) return 'audio';
  return 'unknown';
}

export default function FileViewer({ file, currentPath }: Props) {
  const filePath = currentPath ? `${currentPath}/${file.name}` : file.name;
  const url = getFileViewUrl(filePath);
  const type = getFileType(file.name);

  const renderViewer = () => {
    switch (type) {
      case 'pdf':
        return <PdfViewer url={url} />;
      case 'markdown':
        return <MarkdownViewer url={url} />;
      case 'docx':
      case 'xlsx':
      case 'pptx':
        return <OfficeViewer url={url} fileType={type} />;
      case 'video':
        return <VideoPlayer url={url} mimeType={file.mimeType} />;
      case 'html':
        return <HtmlViewer url={url} filePath={filePath} />;
      case 'image':
        return (
          <img
            src={url}
            alt={file.name}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        );
      case 'audio':
        return (
          <audio controls style={{ width: '100%', maxWidth: 480 }}>
            <source src={url} type={file.mimeType} />
          </audio>
        );
      case 'text':
        return <TextViewer filePath={filePath} />;
      default:
        return <UnknownFileViewer file={file} filePath={filePath} />;
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
      <Suspense fallback={<div style={{ padding: 24, color: 'var(--color-text-muted)' }}>Loading viewer...</div>}>
        {renderViewer()}
      </Suspense>
    </div>
  );
}

/** Viewer for unknown extensions — offers "View as text" or "View head" */
function UnknownFileViewer({ file, filePath }: { file: FileItem; filePath: string }) {
  const [mode, setMode] = useState<'idle' | 'preview' | 'head'>('idle');
  const fileSize = file.size ?? 0;
  const isTooLarge = fileSize > TEXT_PREVIEW_SIZE_LIMIT;

  if (mode === 'preview') {
    return (
      <TextViewer
        filePath={filePath}
        previewMaxBytes={TEXT_PREVIEW_MAX_BYTES}
        onBack={() => setMode('idle')}
      />
    );
  }

  if (mode === 'head') {
    return (
      <TextViewer
        filePath={filePath}
        previewMaxBytes={64 * 1024}
        onBack={() => setMode('idle')}
        headOnly
      />
    );
  }

  return (
    <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 24 }}>
      <p style={{ marginBottom: 6 }}>
        Preview not available for <strong>.{file.name.split('.').pop()}</strong> files.
      </p>
      {fileSize > 0 && <p style={{ fontSize: 12, marginBottom: 16 }}>Size: {formatSize(fileSize)}</p>}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        {!isTooLarge && (
          <button onClick={() => setMode('preview')} style={actionBtnStyle}>
            View as text
          </button>
        )}
        {isTooLarge && (
          <button onClick={() => setMode('head')} style={actionBtnStyle}>
            View first 64 KB
          </button>
        )}
        <a
          href={getFileViewUrl(filePath)}
          download={file.name}
          style={{ ...actionBtnStyle, textDecoration: 'none' }}
        >
          Download file
        </a>
      </div>
    </div>
  );
}

const actionBtnStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  color: 'var(--color-accent)',
  border: '1px solid var(--color-border)',
  padding: '8px 18px',
  borderRadius: 'var(--radius)',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
  minHeight: 40,
  display: 'inline-flex',
  alignItems: 'center',
};

/** Text viewer — full download for known text files, preview API for unknown/large files */
function TextViewer({
  filePath,
  previewMaxBytes,
  onBack,
  headOnly,
}: {
  filePath: string;
  previewMaxBytes?: number;
  onBack?: () => void;
  headOnly?: boolean;
}) {
  const [data, setData] = useState<PreviewData | null>(null);
  const [rawText, setRawText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (previewMaxBytes) {
      fetchPreview(filePath, previewMaxBytes)
        .then((res) => {
          if (res.success && res.data) {
            setData(res.data);
          } else {
            setError(res.error?.message || 'Failed to load');
          }
        })
        .catch((e) => setError(e.message));
    } else {
      fetch(getFileViewUrl(filePath))
        .then((r) => r.text())
        .then(setRawText)
        .catch((e) => setError(e.message));
    }
  }, [filePath, previewMaxBytes]);

  if (error) return <div style={{ padding: 24, color: 'var(--color-danger)' }}>{error}</div>;

  const content = data ? data.content : rawText;
  const truncated = data?.truncated ?? false;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {(truncated || headOnly || onBack) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 16px',
            background: 'var(--color-surface)',
            borderBottom: '1px solid var(--color-border)',
            fontSize: 12,
            color: 'var(--color-text-muted)',
            flexShrink: 0,
          }}
        >
          {onBack && (
            <button
              onClick={onBack}
              style={{ ...actionBtnStyle, padding: '3px 10px', fontSize: 11, minHeight: 28 }}
            >
              ← Back
            </button>
          )}
          {truncated && (
            <span>
              File exceeds {previewMaxBytes ? formatSize(previewMaxBytes) : 'limit'} — showing first
              portion only.
            </span>
          )}
          {headOnly && !truncated && <span>Showing first 64 KB of a large file.</span>}
        </div>
      )}

      <pre
        style={{
          flex: 1,
          padding: 16,
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          color: 'var(--color-text)',
          maxWidth: '100%',
          margin: 0,
          overflow: 'auto',
        }}
      >
        {content || 'Loading...'}
      </pre>
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
