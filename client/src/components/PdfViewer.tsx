import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface Props {
  url: string;
}

export default function PdfViewer({ url }: Props) {
  const [numPages, setNumPages] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1.5);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfRef = useRef<any>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    pdfjsLib
      .getDocument({
        url,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.1.91/cmaps/',
        cMapPacked: true,
      })
      .promise
      .then((pdf) => {
        pdfRef.current = pdf;
        setNumPages(pdf.numPages);
        setPageNum(1);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [url]);

  useEffect(() => {
    if (!pdfRef.current || !canvasRef.current) return;

    pdfRef.current.getPage(pageNum).then((page: any) => {
      const canvas = canvasRef.current!;
      const viewport = page.getViewport({ scale });
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const ctx = canvas.getContext('2d')!;
      page.render({ canvasContext: ctx, viewport }).promise;
    });
  }, [pageNum, scale, numPages]);

  if (loading) {
    return <div style={{ padding: 24, color: 'var(--color-text-muted)' }}>Loading PDF...</div>;
  }

  if (error) {
    return <div style={{ padding: 24, color: 'var(--color-danger)' }}>Failed to load PDF: {error}</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 16, gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
        <button
          onClick={() => setPageNum((p) => Math.max(1, p - 1))}
          disabled={pageNum <= 1}
          style={btnStyle}
        >
          Prev
        </button>
        <span>
          Page {pageNum} / {numPages}
        </span>
        <button
          onClick={() => setPageNum((p) => Math.min(numPages, p + 1))}
          disabled={pageNum >= numPages}
          style={btnStyle}
        >
          Next
        </button>
        <span style={{ marginLeft: 12 }}>Zoom:</span>
        <button onClick={() => setScale((s) => Math.max(0.5, s - 0.25))} style={btnStyle}>-</button>
        <span>{Math.round(scale * 100)}%</span>
        <button onClick={() => setScale((s) => Math.min(3, s + 0.25))} style={btnStyle}>+</button>
      </div>

      <div style={{ overflow: 'auto', maxWidth: '100%', maxHeight: 'calc(100vh - 200px)' }}>
        <canvas ref={canvasRef} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }} />
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius)',
  padding: '4px 10px',
  cursor: 'pointer',
  fontSize: 13,
  minWidth: 36,
  minHeight: 36,
};
