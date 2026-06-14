# FileServer 8-Feature Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 8 features: resizable panels, HTML preview, MD outline, light pastel theme, multi-tab preview, WebSocket upload notifications, tree-view file browser, and right-click context menu.

**Architecture:** Replace FileBrowser with lazy-load FileTree + ContextMenu. Refactor preview to TabBar-driven multi-tab system. Add WebSocket server push via @fastify/websocket. Theme via CSS custom properties with data-theme toggle. New viewer components: HtmlViewer, TOC-enhanced MarkdownViewer.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6.3, Fastify 5.3, @fastify/websocket, vitest 3.1

---

## File Map

### New Files (9)
| File | Responsibility |
|------|---------------|
| `client/src/hooks/useTheme.ts` | Theme persistence + `data-theme` DOM manipulation |
| `client/src/components/ThemeToggle.tsx` | Sun/moon toggle button |
| `client/src/components/ResizeHandle.tsx` | Draggable panel divider |
| `client/src/hooks/useWebSocket.ts` | WS connect/reconnect/event dispatch |
| `client/src/components/HtmlViewer.tsx` | Sandboxed iframe + source code toggle |
| `client/src/components/FileTree.tsx` | Lazy-load tree (replaces FileBrowser) |
| `client/src/components/ContextMenu.tsx` | Right-click action menu |
| `client/src/components/TabBar.tsx` | Horizontal multi-tab bar |
| `server/src/ws.ts` | WebSocket handler + broadcast function |

### Modified Files (6)
| File | Changes |
|------|---------|
| `client/src/App.css` | Light theme + new component styles |
| `client/src/App.tsx` | Tabs state, ThemeToggle, WebSocket, tree, resize handle |
| `client/src/components/FileViewer.tsx` | Add `'html'` case → HtmlViewer |
| `client/src/components/MarkdownViewer.tsx` | TOC sidebar with IntersectionObserver |
| `server/src/app.ts` | Register @fastify/websocket + ws routes |
| `server/src/routes/upload.ts` | Import broadcast, call after upload success |

### Removed Files (1)
| File | Reason |
|------|--------|
| `client/src/components/FileBrowser.tsx` | Replaced by FileTree + ContextMenu |

---

## Implementation

### Task 1: Install @fastify/websocket

**Files:**
- Modify: `server/package.json`

- [ ] **Step 1: Install the package**

```bash
cd server && npm install @fastify/websocket
```

Expected: package.json updated with `"@fastify/websocket": "^X.X.X"` in dependencies.

- [ ] **Step 2: Commit**

```bash
git add server/package.json server/package-lock.json
git commit -m "chore: add @fastify/websocket dependency
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Theme System (CSS + Hook + Toggle)

**Files:**
- Create: `client/src/hooks/useTheme.ts`
- Create: `client/src/components/ThemeToggle.tsx`
- Modify: `client/src/App.css`

- [ ] **Step 1: Write useTheme hook**

```typescript
// client/src/hooks/useTheme.ts
import { useState, useEffect, useCallback } from 'react';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'fileserver-theme';

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {}
  return 'dark';
}

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(STORAGE_KEY, next); } catch {}
      return next;
    });
  }, []);

  return { theme, toggle };
}
```

- [ ] **Step 2: Add light theme CSS variables to App.css**

Add AFTER the `:root` block (which stays as dark default):

```css
/* Light theme overrides */
[data-theme="light"] {
  --color-bg: #faf9f7;
  --color-surface: #f5f4f1;
  --color-surface-hover: #eeecf0;
  --color-border: #e2dfe4;
  --color-text: #3b3838;
  --color-text-muted: #8b8694;
  --color-accent: #87a980;
  --color-accent-hover: #6d8f66;
  --color-danger: #c46666;
  --color-success: #6ba87a;
}

/* Smooth theme transition */
body {
  transition: background-color 0.3s ease, color 0.3s ease;
}
```

Also add pastel accent variables to `:root`:

```css
:root {
  /* ... existing variables stay ... */

  /* Pastel accents */
  --color-pastel-green: #87a980;
  --color-pastel-purple: #b8a5c9;
  --color-pastel-pink: #d4a5a5;
  --color-pastel-blue: #8aafc8;
}
```

- [ ] **Step 3: Create ThemeToggle component**

```typescript
// client/src/components/ThemeToggle.tsx
import type { Theme } from '../hooks/useTheme.js';

interface Props {
  theme: Theme;
  onToggle: () => void;
}

export default function ThemeToggle({ theme, onToggle }: Props) {
  return (
    <button
      onClick={onToggle}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      style={{
        background: 'none',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius)',
        color: 'var(--color-text-muted)',
        cursor: 'pointer',
        fontSize: 16,
        width: 32,
        height: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  );
}
```

- [ ] **Step 4: Verify TypeScript compilation**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/hooks/useTheme.ts client/src/components/ThemeToggle.tsx client/src/App.css
git commit -m "feat: add light pastel theme with toggle
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: ResizeHandle Component

**Files:**
- Create: `client/src/components/ResizeHandle.tsx`

- [ ] **Step 1: Create ResizeHandle**

```typescript
// client/src/components/ResizeHandle.tsx
import { useCallback, useRef, useEffect } from 'react';

interface Props {
  onResize: (width: number) => void;
}

export default function ResizeHandle({ onResize }: Props) {
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startWidth.current = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width'),
      10
    ) || 280;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = e.clientX - startX.current;
      const newWidth = Math.min(500, Math.max(180, startWidth.current + delta));
      onResize(newWidth);
    };

    const onMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [onResize]);

  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        width: 4,
        cursor: 'col-resize',
        background: 'transparent',
        flexShrink: 0,
        position: 'relative',
        zIndex: 10,
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'var(--color-accent)';
      }}
      onMouseLeave={(e) => {
        if (!dragging.current) {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
        }
      }}
    />
  );
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
cd client && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/ResizeHandle.tsx
git commit -m "feat: add resizable panel divider
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: WebSocket Server + Broadcast

**Files:**
- Create: `server/src/ws.ts`
- Modify: `server/src/app.ts`
- Modify: `server/src/routes/upload.ts`

- [ ] **Step 1: Create ws.ts**

```typescript
// server/src/ws.ts
import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';

const clients = new Set<WebSocket>();
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

export function registerWebSocket(app: FastifyInstance): void {
  app.get('/api/ws', { websocket: true }, (socket, _req) => {
    clients.add(socket);

    socket.on('close', () => {
      clients.delete(socket);
    });

    socket.on('error', () => {
      clients.delete(socket);
    });
  });

  // Heartbeat every 30s to keep connections alive
  heartbeatTimer = setInterval(() => {
    for (const client of clients) {
      if (client.readyState === client.OPEN) {
        client.ping();
      }
    }
  }, 30000);

  // Cleanup on app close
  app.addHook('onClose', () => {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    for (const client of clients) {
      client.close();
    }
    clients.clear();
  });
}

export function broadcast(event: Record<string, unknown>): void {
  const message = JSON.stringify(event);
  for (const client of clients) {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  }
}
```

- [ ] **Step 2: Register WebSocket in app.ts**

In `server/src/app.ts`, add:

```typescript
import fastifyWebsocket from '@fastify/websocket';
import { registerWebSocket } from './ws.js';

// After multipart registration, before routes:
await app.register(fastifyWebsocket);

// After all other routes:
registerWebSocket(app);
```

The modified app.ts import section:

```typescript
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyWebsocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { config } from './config.js';
import { registerErrorHandler } from './middleware/error-handler.js';
import { fileListRoutes } from './routes/files.js';
import { downloadRoutes } from './routes/download.js';
import { uploadRoutes } from './routes/upload.js';
import { docsRoutes } from './routes/docs.js';
import { previewRoutes } from './routes/preview.js';
import { operationsRoutes } from './routes/operations.js';
import { registerWebSocket } from './ws.js';
```

And in the buildApp function, after `await app.register(multipart, ...)`:

```typescript
// Register WebSocket support
await app.register(fastifyWebsocket);
```

And after all route registrations (`await app.register(operationsRoutes)`), add:

```typescript
// Register WebSocket handler
registerWebSocket(app);
```

- [ ] **Step 3: Broadcast on upload success**

In `server/src/routes/upload.ts`, add import:

```typescript
import { broadcast } from '../ws.js';
```

After successful upload in the single-file route (after `uploaded.push(result)` inside the try block), add:

```typescript
if (uploaded.length > 0) {
  broadcast({
    type: 'upload',
    path: targetPath,
    files: uploaded.map((u) => u.name),
  });
}
```

After the multi-file route's for-await loop (after the for loop, before the return):

```typescript
if (uploaded.length > 0) {
  broadcast({
    type: 'upload',
    path: targetPath,
    files: uploaded.map((u) => u.name),
  });
}
```

- [ ] **Step 4: Verify server compilation**

```bash
cd server && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Run existing tests**

```bash
cd server && npx vitest run
```

Expected: 20 tests pass.

- [ ] **Step 6: Commit**

```bash
git add server/src/ws.ts server/src/app.ts server/src/routes/upload.ts
git commit -m "feat: add WebSocket server with upload broadcast
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: HtmlViewer Component

**Files:**
- Create: `client/src/components/HtmlViewer.tsx`
- Modify: `client/src/components/FileViewer.tsx`

- [ ] **Step 1: Create HtmlViewer**

```typescript
// client/src/components/HtmlViewer.tsx
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
```

- [ ] **Step 2: Add 'html' case to FileViewer**

In `client/src/components/FileViewer.tsx`:

Add import:
```typescript
const HtmlViewer = lazy(() => import('./HtmlViewer.js'));
```

In `getFileType()`, change the text extensions line to exclude html/htm:
```typescript
if (['txt', 'log', 'json', 'xml', 'css', 'js', 'ts', 'jsx', 'tsx', 'env', 'yaml', 'yml', 'toml'].includes(ext)) return 'text';
if (['html', 'htm'].includes(ext)) return 'html';
```

In `renderViewer()`, add case before `'text'`:
```typescript
case 'html':
  return <HtmlViewer url={url} filePath={filePath} />;
```

- [ ] **Step 3: Verify TypeScript compilation**

```bash
cd client && npx tsc --noEmit
```

- [ ] **Step 4: Verify client build**

```bash
cd client && npx vite build
```

- [ ] **Step 5: Commit**

```bash
git add client/src/components/HtmlViewer.tsx client/src/components/FileViewer.tsx
git commit -m "feat: add HTML preview with sandboxed iframe and source toggle
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: MarkdownViewer TOC

**Files:**
- Modify: `client/src/components/MarkdownViewer.tsx`

- [ ] **Step 1: Add TOC extraction and rendering to MarkdownViewer**

Replace the entire `MarkdownViewer` component. Key additions:
- `extractHeadings()`: regex-based heading extraction → `{id, level, text}[]`
- `useEffect` + `IntersectionObserver` for active heading tracking
- TOC sidebar rendered as `<nav>` alongside content

```typescript
// client/src/components/MarkdownViewer.tsx
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import mermaid from 'mermaid';

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
  for (const line of lines) {
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

interface Props { url: string }

function MermaidBlock({ children }: { children: string }) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const id = useRef(`mermaid-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    mermaid
      .render(id.current, children)
      .then(({ svg: result }) => { setSvg(result); setError(null); })
      .catch((err) => { setError(err.message); });
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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tocOpen, setTocOpen] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    fetch(url)
      .then((r) => r.text())
      .then((text) => { setContent(text); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
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
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
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

      {/* Toggle button when TOC is closed */}
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
                  <pre style={{ background: 'var(--color-surface)', padding: 16, borderRadius: 'var(--radius)', overflow: 'auto', fontSize: 13 }}>
                    <code className={className} {...props}>{children}</code>
                  </pre>
                );
              }
              return (
                <code style={{ background: 'var(--color-surface)', padding: '2px 6px', borderRadius: 3, fontSize: '0.9em' }} {...props}>
                  {children}
                </code>
              );
            },
            h1({ children, ...props }: any) {
              const text = String(children);
              const id = text.toLowerCase().replace(/[^\w一-鿿\s-]/g, '').replace(/\s+/g, '-');
              return <h1 id={id} {...props}>{children}</h1>;
            },
            h2({ children, ...props }: any) {
              const text = String(children);
              const id = text.toLowerCase().replace(/[^\w一-鿿\s-]/g, '').replace(/\s+/g, '-');
              return <h2 id={id} {...props}>{children}</h2>;
            },
            h3({ children, ...props }: any) {
              const text = String(children);
              const id = text.toLowerCase().replace(/[^\w一-鿿\s-]/g, '').replace(/\s+/g, '-');
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
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
cd client && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/MarkdownViewer.tsx
git commit -m "feat: add table of contents sidebar to markdown viewer
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: WebSocket Client Hook

**Files:**
- Create: `client/src/hooks/useWebSocket.ts`

- [ ] **Step 1: Create useWebSocket hook**

```typescript
// client/src/hooks/useWebSocket.ts
import { useEffect, useRef } from 'react';

export interface UploadEvent {
  type: 'upload';
  path: string;
  files: string[];
}

type WsEvent = UploadEvent;

interface Options {
  onUpload: (event: UploadEvent) => void;
}

export function useWebSocket({ onUpload }: Options) {
  const wsRef = useRef<WebSocket | null>(null);
  const retryMs = useRef(1000);

  useEffect(() => {
    let stopped = false;

    function connect() {
      if (stopped) return;

      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${location.host}/api/ws`);

      ws.onopen = () => {
        retryMs.current = 1000; // reset backoff
      };

      ws.onmessage = (event) => {
        try {
          const data: WsEvent = JSON.parse(event.data);
          if (data.type === 'upload') {
            onUpload(data);
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (!stopped) {
          setTimeout(connect, retryMs.current);
          retryMs.current = Math.min(retryMs.current * 2, 30000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };

      wsRef.current = ws;
    }

    connect();

    return () => {
      stopped = true;
      wsRef.current?.close();
    };
  }, [onUpload]);
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
cd client && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/useWebSocket.ts
git commit -m "feat: add WebSocket client hook with auto-reconnect
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: TabBar Component

**Files:**
- Create: `client/src/components/TabBar.tsx`

- [ ] **Step 1: Create TabBar**

```typescript
// client/src/components/TabBar.tsx
import type { FileItem } from '../lib/api.js';

export interface Tab {
  id: string;
  file: FileItem;
  currentPath: string;
}

interface Props {
  tabs: Tab[];
  activeTabId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
}

const MAX_TABS = 10;

export { MAX_TABS };

export default function TabBar({ tabs, activeTabId, onSelectTab, onCloseTab }: Props) {
  if (tabs.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        overflowX: 'auto',
        flexShrink: 0,
        minHeight: 34,
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            onAuxClick={(e) => {
              if (e.button === 1) {
                e.preventDefault();
                onCloseTab(tab.id);
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              cursor: 'pointer',
              borderRight: '1px solid var(--color-border)',
              borderBottom: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
              background: isActive ? 'var(--color-bg)' : 'transparent',
              color: isActive ? 'var(--color-text)' : 'var(--color-text-muted)',
              fontSize: 12,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              userSelect: 'none',
              minWidth: 0,
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {tab.file.name}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.id);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                fontSize: 14,
                padding: 0,
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 18,
                height: 18,
                borderRadius: 3,
                flexShrink: 0,
              }}
              title="Close tab"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
cd client && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/TabBar.tsx
git commit -m "feat: add multi-tab bar component for file preview
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9: ContextMenu Component

**Files:**
- Create: `client/src/components/ContextMenu.tsx`

- [ ] **Step 1: Create ContextMenu**

```typescript
// client/src/components/ContextMenu.tsx
import { useEffect, useRef } from 'react';

export interface ContextMenuAction {
  label: string;
  icon?: string;
  onClick: () => void;
  danger?: boolean;
  separator?: boolean;
}

interface Props {
  x: number;
  y: number;
  items: ContextMenuAction[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    // Delay to avoid the same click that opened it closing it
    setTimeout(() => {
      document.addEventListener('click', handleClick);
      document.addEventListener('keydown', handleKey);
    }, 0);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - items.length * 36 - 16);

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: adjustedX,
        top: adjustedY,
        zIndex: 1000,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.24)',
        minWidth: 180,
        padding: '4px 0',
      }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => {
            item.onClick();
            onClose();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '6px 14px',
            background: 'none',
            border: 'none',
            color: item.danger ? 'var(--color-danger)' : 'var(--color-text)',
            fontSize: 13,
            cursor: 'pointer',
            textAlign: 'left',
            fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-hover)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'none';
          }}
        >
          {item.icon && <span style={{ width: 16, textAlign: 'center', fontSize: 14 }}>{item.icon}</span>}
          {item.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
cd client && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/ContextMenu.tsx
git commit -m "feat: add right-click context menu component
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 10: FileTree Component (replaces FileBrowser)

**Files:**
- Create: `client/src/components/FileTree.tsx`
- Modify: `client/src/components/FileBrowser.tsx` (will be removed in Task 12)

- [ ] **Step 1: Create FileTree**

```typescript
// client/src/components/FileTree.tsx
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

  // Action handlers (reuse existing modal pattern from FileBrowser)
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
    if (item.type === 'directory') return '📁';
    const ext = item.name.split('.').pop()?.toLowerCase();
    const icons: Record<string, string> = {
      pdf: '📄', md: '📝', txt: '📃', json: '📋',
      png: '🖼', jpg: '🖼', jpeg: '🖼', gif: '🖼', svg: '🖼', webp: '🖼',
      mp4: '🎬', webm: '🎬', mkv: '🎬', mov: '🎬',
      mp3: '🎵', wav: '🎵', ogg: '🎵',
      zip: '📦', tar: '📦', gz: '📦', '7z': '📦',
      html: '🌐', htm: '🌐',
      ts: '⚡', tsx: '⚡', js: '⚡', jsx: '⚡', css: '🎨',
    };
    return icons[ext || ''] || '📄';
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
          ↻ Refresh
        </button>
      </div>

      {visibleNodes.map((node) => {
        const filePath = node.path;
        const isSelected = node.item.type === 'file' && filePath === selectedFilePath;

        return (
          <div
            key={node.path}
            className="tree-node"
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

      {/* Modals (same pattern as FileBrowser) */}
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
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
cd client && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/FileTree.tsx
git commit -m "feat: add tree-view file browser with context menu
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 11: App.tsx Integration + App.css Consolidation

**Files:**
- Modify: `client/src/App.tsx`
- Modify: `client/src/App.css`

This is the main integration task — wire all new components into App.tsx and update styles.

- [ ] **Step 1: Rewrite App.tsx**

Replace the entire file:

```typescript
// client/src/App.tsx
import { useState, useCallback, useEffect } from 'react';
import FileTree from './components/FileTree.js';
import FileUploader from './components/FileUploader.js';
import FileViewer from './components/FileViewer.js';
import ApiDocs from './components/ApiDocs.js';
import ThemeToggle from './components/ThemeToggle.js';
import ResizeHandle from './components/ResizeHandle.js';
import TabBar, { type Tab, MAX_TABS } from './components/TabBar.js';
import { useTheme } from './hooks/useTheme.js';
import { useWebSocket } from './hooks/useWebSocket.js';
import { FileItem } from './lib/api.js';
import './App.css';

type Page = 'files' | 'docs';

function getInitialPage(): Page {
  return window.location.pathname === '/doc' ? 'docs' : 'files';
}

let tabIdCounter = 0;
function nextTabId(): string {
  return `tab-${++tabIdCounter}`;
}

export default function App() {
  const [page, setPage] = useState<Page>(getInitialPage);
  const [refreshKey, setRefreshKey] = useState(0);

  // Tab state
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // Resize state
  const [sidebarWidth, setSidebarWidth] = useState(280);

  // Theme
  const { theme, toggle: toggleTheme } = useTheme();

  // Sync URL with page state
  useEffect(() => {
    const desiredPath = page === 'docs' ? '/doc' : '/';
    if (window.location.pathname !== desiredPath) {
      window.history.pushState(null, '', desiredPath);
    }
  }, [page]);

  // Handle browser back/forward
  useEffect(() => {
    const onPop = () => setPage(getInitialPage());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((p: Page) => setPage(p), []);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // WebSocket: auto-refresh on upload
  useWebSocket({
    onUpload: useCallback(() => {
      handleRefresh();
    }, [handleRefresh]),
  });

  // Open a file in a tab
  const openTab = useCallback((file: FileItem, path: string) => {
    setTabs((prev) => {
      const existing = prev.find(
        (t) => t.file.name === file.name && t.currentPath === path
      );
      if (existing) {
        setActiveTabId(existing.id);
        return prev;
      }

      const id = nextTabId();
      const newTab: Tab = { id, file, currentPath: path };
      let next = [...prev, newTab];

      // Enforce max tabs
      if (next.length > MAX_TABS) {
        // Remove the least-recently-active tab (first non-active)
        const idx = next.findIndex((t) => t.id !== activeTabId);
        if (idx >= 0) next.splice(idx, 1);
        else next.shift(); // all active (shouldn't happen), remove first
      }

      setActiveTabId(id);
      return next;
    });
  }, [activeTabId]);

  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      next.splice(idx, 1);

      if (id === activeTabId) {
        // Activate nearest tab
        if (next.length === 0) {
          setActiveTabId(null);
        } else if (idx < next.length) {
          setActiveTabId(next[idx].id);
        } else {
          setActiveTabId(next[next.length - 1].id);
        }
      }

      return next;
    });
  }, [activeTabId]);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;

  // Derive selected file path from active tab
  const selectedFilePath = activeTab
    ? (activeTab.currentPath ? `${activeTab.currentPath}/${activeTab.file.name}` : activeTab.file.name)
    : null;

  const handleResize = useCallback((width: number) => {
    setSidebarWidth(width);
    document.documentElement.style.setProperty('--sidebar-width', `${width}px`);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>FileServer</h1>
          <nav className="header-nav">
            <button
              className={`nav-link${page === 'files' ? ' active' : ''}`}
              onClick={() => navigate('files')}
            >
              Files
            </button>
            <button
              className={`nav-link${page === 'docs' ? ' active' : ''}`}
              onClick={() => navigate('docs')}
            >
              API Docs
            </button>
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {page === 'files' && (
            <FileUploader
              targetPath=""
              onComplete={handleRefresh}
            />
          )}
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>

      {page === 'docs' ? (
        <div className="main-panel" style={{ flex: 1 }}>
          <div className="main-panel-content" style={{ alignItems: 'flex-start' }}>
            <ApiDocs />
          </div>
        </div>
      ) : (
        <div className="app-body">
          <aside className="sidebar" style={{ width: sidebarWidth }}>
            <div className="sidebar-header">
              <span>Files</span>
            </div>
            <FileTree
              key={refreshKey}
              selectedFilePath={selectedFilePath}
              onSelectFile={openTab}
              onRefresh={handleRefresh}
            />
          </aside>

          <ResizeHandle onResize={handleResize} />

          <main className="main-panel">
            {activeTab ? (
              <>
                <TabBar
                  tabs={tabs}
                  activeTabId={activeTabId}
                  onSelectTab={setActiveTabId}
                  onCloseTab={closeTab}
                />
                <div className="main-panel-content">
                  <FileViewer
                    file={activeTab.file}
                    currentPath={activeTab.currentPath}
                  />
                </div>
              </>
            ) : (
              <div className="main-panel-content">
                <div className="empty-state">
                  <p>Select a file to preview</p>
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update App.css**

Remove the old `--sidebar-width` and `--sidebar-width-tablet` variables (they're now dynamic). Remove FileBrowser-specific styles (`.file-item`, `.file-actions` etc.). Add styles for Tree, TabBar, ContextMenu elements. Keep dark theme and markdown/API docs styles.

Since App.css is large, here are the targeted changes:

**REMOVE** these CSS blocks:
- `.file-item` and `.file-item:hover`
- `.file-actions` (not present in current CSS anyway)

**ADD** these styles at the end:

```css
/* ===== Tree View ===== */

.tree-node:hover {
  background: var(--color-surface-hover);
}

/* ===== Tab bar scrollbar ===== */

.tab-scroll::-webkit-scrollbar {
  height: 3px;
}

.tab-scroll::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 3px;
}

/* ===== Resize handle ===== */

.resize-handle:hover {
  background: var(--color-accent);
}

/* ===== Context menu ===== */

.ctx-menu-item:hover {
  background: var(--color-surface-hover);
}

/* ===== Responsive updates ===== */

@media (max-width: 1023px) {
  /* Sidebar width handled dynamically now */
}

@media (max-width: 767px) {
  .app-body {
    flex-direction: column;
  }

  .sidebar {
    width: 100% !important;
    height: 40%;
    border-right: none;
    border-bottom: 1px solid var(--color-border);
  }

  .main-panel {
    height: 60%;
  }
}
```

Also update the `:root` block to remove fixed sidebar width (it's now managed inline):
```css
:root {
  /* ... keep everything except these: */
  /* --sidebar-width: 280px; */  /* <-- remove this */
  /* --sidebar-width-tablet: 220px; */  /* <-- remove this */
}
```

And update `.sidebar` CSS:
```css
.sidebar {
  /* width is now set via inline style from ResizeHandle */
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}
```

- [ ] **Step 3: Verify TypeScript compilation**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Verify client build**

```bash
cd client && npx vite build
```

Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add client/src/App.tsx client/src/App.css
git commit -m "feat: integrate tabs, tree, theme toggle, resize, and WebSocket into App
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 12: Remove FileBrowser + Final Verification

**Files:**
- Remove: `client/src/components/FileBrowser.tsx`
- Modify: `server/__tests__/api.test.ts` (add more upload types)

- [ ] **Step 1: Delete FileBrowser**

```bash
rm client/src/components/FileBrowser.tsx
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
cd client && npx tsc --noEmit
cd server && npx tsc --noEmit
```

- [ ] **Step 3: Run all tests**

```bash
cd server && npx vitest run
```

Expected: 20 tests pass.

- [ ] **Step 4: Build client**

```bash
cd client && npx vite build
```

Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git rm client/src/components/FileBrowser.tsx
git commit -m "refactor: remove FileBrowser, replaced by FileTree
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Verification Checklist

After all 12 tasks complete:

- [ ] `cd server && npx tsc --noEmit` — passes
- [ ] `cd client && npx tsc --noEmit` — passes
- [ ] `cd server && npx vitest run` — 20 tests pass
- [ ] `cd client && npx vite build` — production build succeeds
- [ ] Server starts: `cd server && npx tsx src/main.ts`
- [ ] Client dev: `cd client && npx vite`
- [ ] Manual smoke tests:
  - Theme toggle switches light↔dark, persists on reload
  - Drag resize handle changes sidebar width
  - Click folder expand arrow loads children
  - Right-click file/folder shows context menu
  - Upload file triggers WebSocket → tree auto-refreshes
  - Open HTML file → rendered in iframe, toggle source
  - Open MD file → TOC sidebar visible, click heading scrolls
  - Open multiple files → tab bar shows, switch and close tabs
