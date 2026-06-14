import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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

interface Heading {
  id: string;
  level: number;
  text: string;
}

function extractHeadings(markdown: string): Heading[] {
  const headings: Heading[] = [];
  const lines = markdown.split('\n');
  let inCodeBlock = false;

  for (const line of lines) {
    // Toggle code block state on fenced code block markers (``` or ~~~)
    const fenceMatch = line.match(/^\s*(```|~~~)/);
    if (fenceMatch) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    // Skip lines inside fenced code blocks
    if (inCodeBlock) continue;

    const match = line.match(/^(#{1,3})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = text
        .toLowerCase()
        .replace(/[^\w一-鿿\s-]/g, '')
        .replace(/\s+/g, '-');
      headings.push({ id, level, text });
    }
  }
  return headings;
}

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

/** Generate a heading ID from text — must match extractHeadings logic */
function headingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w一-鿿\s-]/g, '')
    .replace(/\s+/g, '-');
}

export default function MarkdownViewer({ url }: Props) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tocOpen, setTocOpen] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

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

  const headings = useMemo(() => extractHeadings(content), [content]);

  // IntersectionObserver for active heading
  useEffect(() => {
    if (!contentRef.current || headings.length === 0) return;
    const elements = headings
      .map((h) => document.getElementById(h.id))
      .filter(Boolean) as HTMLElement[];

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings, content]);

  const scrollToHeading = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  if (loading) {
    return <div style={{ padding: 24, color: 'var(--color-text-muted)' }}>Loading markdown...</div>;
  }

  if (error) {
    return <div style={{ padding: 24, color: 'var(--color-danger)' }}>{error}</div>;
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', position: 'relative' }}>
      {/* TOC Sidebar */}
      {headings.length > 0 && (
        <aside
          style={{
            width: tocOpen ? 200 : 0,
            overflow: tocOpen ? 'auto' : 'hidden',
            borderRight: tocOpen ? '1px solid var(--color-border)' : 'none',
            flexShrink: 0,
            transition: 'width 0.2s',
            background: 'var(--color-surface)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderBottom: '1px solid var(--color-border)',
              fontSize: 11,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              position: 'sticky',
              top: 0,
              background: 'var(--color-surface)',
            }}
          >
            <span>Outline</span>
            <button
              onClick={() => setTocOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                fontSize: 14,
                padding: 0,
                lineHeight: 1,
              }}
              aria-label="Close outline"
            >
              ×
            </button>
          </div>
          <nav style={{ padding: '4px 0' }}>
            {headings.map((h) => (
              <div
                key={h.id}
                onClick={() => scrollToHeading(h.id)}
                style={{
                  padding: '3px 12px',
                  paddingLeft: 12 + (h.level - 1) * 16,
                  fontSize: h.level === 1 ? 13 : 12,
                  fontWeight: h.level === 1 ? 600 : 400,
                  color: activeId === h.id ? 'var(--color-accent)' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  background: activeId === h.id ? 'var(--color-surface-hover)' : 'transparent',
                  borderLeft: activeId === h.id ? '2px solid var(--color-accent)' : '2px solid transparent',
                  transition: 'background 0.1s, color 0.1s',
                }}
              >
                {h.text}
              </div>
            ))}
          </nav>
        </aside>
      )}

      {/* Toggle button when TOC is collapsed */}
      {!tocOpen && headings.length > 0 && (
        <button
          onClick={() => setTocOpen(true)}
          title="Show outline"
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'var(--color-surface)',
            color: 'var(--color-text-muted)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius)',
            cursor: 'pointer',
            fontSize: 12,
            padding: '4px 10px',
            zIndex: 5,
          }}
        >
          ☰ Outline
        </button>
      )}

      {/* Content */}
      <div
        ref={contentRef}
        className="markdown-body"
        style={{
          flex: 1,
          padding: '24px 32px',
          maxWidth: 860,
          margin: '0 auto',
          fontSize: 15,
          lineHeight: 1.7,
          color: 'var(--color-text)',
          overflow: 'auto',
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
            h1({ children, ...props }: any) {
              const text = String(children);
              const id = headingId(text);
              return <h1 id={id} {...props}>{children}</h1>;
            },
            h2({ children, ...props }: any) {
              const text = String(children);
              const id = headingId(text);
              return <h2 id={id} {...props}>{children}</h2>;
            },
            h3({ children, ...props }: any) {
              const text = String(children);
              const id = headingId(text);
              return <h3 id={id} {...props}>{children}</h3>;
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
    </div>
  );
}
