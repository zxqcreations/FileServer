import { useState, useEffect } from 'react';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

/** Basic HTML sanitizer — strips script tags and event handlers */
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\s+on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\s+on\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript\s*:/gi, '');
}

interface Props {
  url: string;
  fileType: 'docx' | 'xlsx' | 'pptx';
}

export default function OfficeViewer({ url, fileType }: Props) {
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(url)
      .then((r) => {
        if (fileType === 'docx') {
          return r.arrayBuffer().then((buf) => mammoth.convertToHtml({ arrayBuffer: buf }));
        }
        return r.arrayBuffer().then((buf) => {
          const workbook = XLSX.read(buf, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const htmlStr = XLSX.utils.sheet_to_html(sheet, { id: 'xlsx-table' });
          return { value: htmlStr };
        });
      })
      .then((result) => {
        setHtml(result.value);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [url, fileType]);

  if (loading) {
    return <div style={{ padding: 24, color: 'var(--color-text-muted)' }}>Loading document...</div>;
  }

  if (error) {
    return <div style={{ padding: 24, color: 'var(--color-danger)' }}>Failed to render: {error}</div>;
  }

  return (
    <div
      style={{
        padding: '24px 32px',
        maxWidth: 900,
        margin: '0 auto',
        overflow: 'auto',
      }}
    >
      {fileType === 'xlsx' ? (
        <div
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
          style={{ overflow: 'auto', maxWidth: '100%' }}
        />
      ) : (
        <div
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
          style={{ lineHeight: 1.6 }}
        />
      )}

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <a
          href={url}
          download
          style={{
            color: 'var(--color-accent)',
            fontSize: 13,
            textDecoration: 'none',
          }}
        >
          Download original
        </a>
      </div>
    </div>
  );
}
