import { useRef, useState, useCallback, DragEvent } from 'react';
import { uploadFiles } from '../lib/api.js';

interface Props {
  targetPath: string;
  onComplete: () => void;
}

export default function FileUploader({ targetPath, onComplete }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const doUpload = useCallback(
    async (files: FileList | File[]) => {
      setUploading(true);
      setResult(null);

      try {
        const res = await uploadFiles(Array.from(files), targetPath);
        if (res.success) {
          setResult(`Uploaded ${res.data?.uploaded.length || 0} file(s)`);
          onComplete();
        } else {
          setResult(res.error?.message || 'Upload failed');
        }
      } catch {
        setResult('Upload failed');
      } finally {
        setUploading(false);
        setTimeout(() => setResult(null), 3000);
      }
    },
    [targetPath, onComplete]
  );

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        doUpload(e.dataTransfer.files);
      }
    },
    [doUpload]
  );

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        opacity: dragOver ? 0.7 : 1,
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {result && (
        <span style={{ fontSize: 12, color: 'var(--color-success)' }}>{result}</span>
      )}
      <input
        ref={inputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            doUpload(e.target.files);
            e.target.value = '';
          }
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        style={{
          background: 'var(--color-accent)',
          color: '#fff',
          border: 'none',
          padding: '6px 14px',
          borderRadius: 'var(--radius)',
          cursor: uploading ? 'not-allowed' : 'pointer',
          fontSize: 13,
          fontWeight: 500,
          minHeight: 44,
          minWidth: 44,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
    </div>
  );
}
