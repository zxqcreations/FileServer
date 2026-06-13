import { useState, useEffect, Suspense, lazy } from 'react';
import { FileItem, getFileViewUrl } from '../lib/api.js';

const PdfViewer = lazy(() => import('./PdfViewer.js'));
const MarkdownViewer = lazy(() => import('./MarkdownViewer.js'));
const OfficeViewer = lazy(() => import('./OfficeViewer.js'));
const VideoPlayer = lazy(() => import('./VideoPlayer.js'));

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
  if (['txt', 'log', 'json', 'xml', 'html', 'css', 'js', 'ts', 'jsx', 'tsx', 'env', 'yaml', 'yml', 'toml'].includes(ext)) return 'text';
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
        return <TextViewer url={url} />;
      default:
        return (
          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 24 }}>
            <p>Preview not available for this file type.</p>
            <a
              href={url}
              download={file.name}
              style={{ color: 'var(--color-accent)', marginTop: 12, display: 'inline-block' }}
            >
              Download {file.name}
            </a>
          </div>
        );
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

/** Pure text file viewer */
function TextViewer({ url }: { url: string }) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(url)
      .then((r) => r.text())
      .then(setText)
      .catch((e) => setError(e.message));
  }, [url]);

  if (error) return <div style={{ padding: 24, color: 'var(--color-danger)' }}>{error}</div>;

  return (
    <pre
      style={{
        padding: 16,
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        color: 'var(--color-text)',
        maxWidth: '100%',
      }}
    >
      {text || 'Loading...'}
    </pre>
  );
}
