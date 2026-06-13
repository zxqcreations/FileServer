import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import mermaid from 'mermaid';

/** Basic HTML sanitizer — strips script tags and event handlers */
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\s+on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\s+on\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript\s*:/gi, '');
}

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
});

interface Props {
  url: string;
}

function MermaidBlock({ children }: { children: string }) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const id = useRef(`mermaid-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    mermaid
      .render(id.current, children)
      .then(({ svg: result }) => {
        setSvg(result);
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
      });
  }, [children]);

  if (error) {
    return (
      <pre style={{ color: 'var(--color-danger)', fontSize: 12, padding: 8 }}>
        Mermaid error: {error}{'\n'}{children}
      </pre>
    );
  }

  return <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(svg) }} />;
}

export default function MarkdownViewer({ url }: Props) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(url)
      .then((r) => r.text())
      .then((text) => {
        setContent(text);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [url]);

  if (loading) {
    return <div style={{ padding: 24, color: 'var(--color-text-muted)' }}>Loading markdown...</div>;
  }

  if (error) {
    return <div style={{ padding: 24, color: 'var(--color-danger)' }}>{error}</div>;
  }

  return (
    <div
      className="markdown-body"
      style={{
        padding: '24px 32px',
        maxWidth: 860,
        margin: '0 auto',
        fontSize: 15,
        lineHeight: 1.7,
        color: 'var(--color-text)',
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code({ className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const lang = match?.[1];
            const codeStr = String(children).replace(/\n$/, '');

            if (lang === 'mermaid') {
              return <MermaidBlock>{codeStr}</MermaidBlock>;
            }

            if (lang) {
              return (
                <pre style={{
                  background: 'var(--color-surface)',
                  padding: 16,
                  borderRadius: 'var(--radius)',
                  overflow: 'auto',
                  fontSize: 13,
                }}>
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              );
            }

            return (
              <code style={{
                background: 'var(--color-surface)',
                padding: '2px 6px',
                borderRadius: 3,
                fontSize: '0.9em',
              }} {...props}>
                {children}
              </code>
            );
          },
          img({ src, alt }: any) {
            return <img src={src} alt={alt} style={{ maxWidth: '100%', borderRadius: 'var(--radius)' }} />;
          },
          table({ children }: any) {
            return (
              <div style={{ overflow: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>{children}</table>
              </div>
            );
          },
          th({ children }: any) {
            return <th style={{ border: '1px solid var(--color-border)', padding: '8px 12px', textAlign: 'left' }}>{children}</th>;
          },
          td({ children }: any) {
            return <td style={{ border: '1px solid var(--color-border)', padding: '8px 12px' }}>{children}</td>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
