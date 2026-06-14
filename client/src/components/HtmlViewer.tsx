import { useState, useEffect } from 'react';

interface Props {
  url: string;
  filePath: string;
}

export default function HtmlViewer({ url }: Props) {
  const [html, setHtml] = useState<string | null>(null);
  const [mode, setMode] = useState<'rendered' | 'source'>('rendered');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => {
        setHtml(text);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [url]);

  if (loading) {
    return <div style={{ padding: 24, color: 'var(--color-text-muted)' }}>Loading HTML...</div>;
  }

  if (error) {
    return <div style={{ padding: 24, color: 'var(--color-danger)' }}>{error}</div>;
  }

  if (!html) {
    return <div style={{ padding: 24, color: 'var(--color-text-muted)' }}>Empty file</div>;
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toggle bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px',
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => setMode(mode === 'rendered' ? 'source' : 'rendered')}
          style={{
            background: 'var(--color-surface-hover)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
            padding: '4px 12px',
            borderRadius: 'var(--radius)',
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          {mode === 'rendered' ? 'View Source' : 'View Rendered'}
        </button>
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
          {mode === 'rendered' ? 'Rendered' : 'Source'}
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {mode === 'rendered' ? (
          <iframe
            sandbox="allow-scripts"
            srcDoc={html}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
            }}
            title="HTML Preview"
          />
        ) : (
          <pre
            style={{
              padding: 16,
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color: 'var(--color-text)',
              margin: 0,
            }}
          >
            {html}
          </pre>
        )}
      </div>
    </div>
  );
}
