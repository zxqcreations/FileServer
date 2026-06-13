import { FastifyInstance } from 'fastify';

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>FileServer API Documentation</title>
<style>
  :root {
    --bg: #0d1117; --surface: #161b22; --border: #30363d;
    --text: #e6edf3; --muted: #8b949e; --accent: #58a6ff;
    --green: #3fb950; --red: #f85149;
    --mono: 'SF Mono', 'Fira Code', monospace;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; }
  .container { max-width: 960px; margin: 0 auto; padding: 40px 24px 80px; }
  h1 { font-size: 28px; margin-bottom: 8px; }
  h2 { font-size: 20px; margin: 40px 0 16px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
  h3 { font-size: 16px; margin: 24px 0 8px; }
  .subtitle { color: var(--muted); font-size: 14px; margin-bottom: 32px; }
  code { font-family: var(--mono); font-size: 13px; background: var(--surface); padding: 1px 6px; border-radius: 3px; }
  pre { background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 16px; overflow-x: auto; margin: 12px 0; }
  pre code { background: none; padding: 0; font-size: 12px; line-height: 1.7; white-space: pre; }
  .endpoint { border: 1px solid var(--border); border-radius: 6px; margin-bottom: 16px; }
  .ep-header { display: flex; align-items: center; gap: 12px; padding: 12px 16px; }
  .method { font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; min-width: 56px; text-align: center; }
  .GET { background: rgba(63,185,80,0.15); color: var(--green); }
  .POST { background: rgba(88,166,255,0.15); color: var(--accent); }
  .path { font-family: var(--mono); font-size: 14px; font-weight: 500; }
  .ep-body { border-top: 1px solid var(--border); padding: 16px 20px; background: var(--surface); }
  .ep-body h4 { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
  .ep-body p, .ep-body li { font-size: 14px; color: var(--muted); margin-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 12px 0; }
  th { text-align: left; padding: 8px 12px; border-bottom: 1px solid var(--border); font-size: 11px; color: var(--muted); text-transform: uppercase; }
  td { padding: 8px 12px; border-bottom: 1px solid var(--border); }
  .curl { border-left: 3px solid var(--accent); }
  .notes { color: var(--muted); font-size: 14px; padding-left: 20px; }
  .notes li { margin-bottom: 8px; }
  .notes strong { color: var(--text); }
  a { color: var(--accent); }
  @media (max-width: 640px) {
    .container { padding: 16px 12px 48px; }
    .ep-header { flex-wrap: wrap; gap: 6px; }
  }
</style>
</head>
<body>
<div class="container">

<h1>FileServer REST API</h1>
<p class="subtitle">Base URL: <code>http://localhost:3000</code></p>

<h2>Endpoints</h2>

<!-- GET /api/files -->
<div class="endpoint">
  <div class="ep-header">
    <span class="method GET">GET</span>
    <span class="path">/api/files</span>
    <span style="color:var(--muted);font-size:13px">List directory contents</span>
  </div>
  <div class="ep-body">
    <h4>Query Parameters</h4>
    <table>
      <tr><th>Name</th><th>Required</th><th>Description</th></tr>
      <tr><td><code>path</code></td><td>No</td><td>Subdirectory relative to file storage root. Defaults to root.</td></tr>
    </table>

    <h4>Response</h4>
    <pre><code>{
  "success": true,
  "data": {
    "currentPath": "",
    "parentPath": null,
    "items": [
      {
        "name": "report.pdf",
        "type": "file",
        "size": 2048000,
        "mimeType": "application/pdf",
        "lastModified": "2026-06-13T10:30:00.000Z"
      },
      {
        "name": "images",
        "type": "directory",
        "lastModified": "2026-06-12T08:00:00.000Z"
      }
    ]
  }
}</code></pre>

    <h4>cURL</h4>
    <pre class="curl"><code># List root directory
curl -s http://localhost:3000/api/files | jq

# List a subdirectory
curl -s "http://localhost:3000/api/files?path=subdir" | jq</code></pre>
  </div>
</div>

<!-- GET /api/download -->
<div class="endpoint">
  <div class="ep-header">
    <span class="method GET">GET</span>
    <span class="path">/api/download</span>
    <span style="color:var(--muted);font-size:13px">Download a file as a stream</span>
  </div>
  <div class="ep-body">
    <h4>Query Parameters</h4>
    <table>
      <tr><th>Name</th><th>Required</th><th>Description</th></tr>
      <tr><td><code>path</code></td><td>Yes</td><td>File path relative to file storage root.</td></tr>
    </table>

    <h4>Response Headers</h4>
    <p><code>Content-Type</code> — MIME type of the file</p>
    <p><code>Content-Disposition: attachment; filename="..."</code></p>
    <p><code>Content-Length</code> — file size in bytes</p>

    <h4>cURL</h4>
    <pre class="curl"><code># Download with original filename
curl -O -J "http://localhost:3000/api/download?path=report.pdf"

# Download to a specific filename
curl -o output.pdf "http://localhost:3000/api/download?path=report.pdf"</code></pre>
  </div>
</div>

<!-- POST /api/upload -->
<div class="endpoint">
  <div class="ep-header">
    <span class="method POST">POST</span>
    <span class="path">/api/upload</span>
    <span style="color:var(--muted);font-size:13px">Upload a single file</span>
  </div>
  <div class="ep-body">
    <h4>Query Parameters</h4>
    <table>
      <tr><th>Name</th><th>Required</th><th>Description</th></tr>
      <tr><td><code>path</code></td><td>No</td><td>Target subdirectory. Defaults to root.</td></tr>
    </table>

    <h4>Request Body</h4>
    <p><code>multipart/form-data</code> with field name <code>file</code></p>

    <h4>Response</h4>
    <pre><code>{
  "success": true,
  "data": {
    "uploaded": [
      { "name": "report.pdf", "size": 2048000 }
    ],
    "failed": []
  }
}</code></pre>

    <h4>cURL</h4>
    <pre class="curl"><code># Upload to root
curl -F "file=@./report.pdf" http://localhost:3000/api/upload

# Upload to a subdirectory
curl -F "file=@./report.pdf" "http://localhost:3000/api/upload?path=docs"</code></pre>
  </div>
</div>

<!-- POST /api/upload/multi -->
<div class="endpoint">
  <div class="ep-header">
    <span class="method POST">POST</span>
    <span class="path">/api/upload/multi</span>
    <span style="color:var(--muted);font-size:13px">Upload multiple files</span>
  </div>
  <div class="ep-body">
    <h4>Query Parameters</h4>
    <table>
      <tr><th>Name</th><th>Required</th><th>Description</th></tr>
      <tr><td><code>path</code></td><td>No</td><td>Target subdirectory. Defaults to root.</td></tr>
    </table>

    <h4>Request Body</h4>
    <p><code>multipart/form-data</code> with field name <code>files</code> (repeatable)</p>

    <h4>Response</h4>
    <pre><code>{
  "success": true,
  "data": {
    "uploaded": [
      { "name": "a.pdf", "size": 1024000 },
      { "name": "b.png", "size": 512000 }
    ],
    "failed": []
  }
}</code></pre>

    <h4>cURL</h4>
    <pre class="curl"><code># Upload multiple files to root
curl -F "files=@./a.pdf" -F "files=@./b.png" http://localhost:3000/api/upload/multi

# Upload to a subdirectory
curl -F "files=@./a.pdf" -F "files=@./b.png" "http://localhost:3000/api/upload/multi?path=docs"</code></pre>
  </div>
</div>

<!-- GET /api/preview -->
<div class="endpoint">
  <div class="ep-header">
    <span class="method GET">GET</span>
    <span class="path">/api/preview</span>
    <span style="color:var(--muted);font-size:13px">Preview file content as text (first N bytes)</span>
  </div>
  <div class="ep-body">
    <h4>Query Parameters</h4>
    <table>
      <tr><th>Name</th><th>Required</th><th>Description</th></tr>
      <tr><td><code>path</code></td><td>Yes</td><td>File path relative to file storage root.</td></tr>
      <tr><td><code>maxBytes</code></td><td>No</td><td>Maximum bytes to read (default 1 MB, hard max 5 MB).</td></tr>
    </table>

    <h4>Response</h4>
    <pre><code>{
  "success": true,
  "data": {
    "content": "First portion of file content as text...",
    "truncated": true,
    "maxBytes": 1048576
  }
}</code></pre>

    <h4>cURL</h4>
    <pre class="curl"><code># Preview first 1 MB of a file
curl "http://localhost:3000/api/preview?path=notes.txt"

# Preview first 64 KB
curl "http://localhost:3000/api/preview?path=large.log&maxBytes=65536"</code></pre>
  </div>
</div>

<!-- GET /health -->
<div class="endpoint">
  <div class="ep-header">
    <span class="method GET">GET</span>
    <span class="path">/health</span>
    <span style="color:var(--muted);font-size:13px">Health check</span>
  </div>
  <div class="ep-body">
    <h4>Response</h4>
    <pre><code>{
  "status": "ok",
  "uptime": 123.456
}</code></pre>

    <h4>cURL</h4>
    <pre class="curl"><code>curl http://localhost:3000/health</code></pre>
  </div>
</div>

<h2>Error Codes</h2>
<table>
  <tr><th>Code</th><th>HTTP Status</th><th>Meaning</th></tr>
  <tr><td><code>PATH_TRAVERSAL</code></td><td>403</td><td>Path attempted to escape storage root</td></tr>
  <tr><td><code>FILE_NOT_FOUND</code></td><td>404</td><td>File or directory does not exist</td></tr>
  <tr><td><code>NOT_A_DIRECTORY</code></td><td>400</td><td>Tried to list files on a non-directory</td></tr>
  <tr><td><code>UPLOAD_FAILED</code></td><td>500</td><td>Disk write or stream error</td></tr>
  <tr><td><code>FILE_TOO_LARGE</code></td><td>413</td><td>File exceeds maximum size limit (10 GB)</td></tr>
  <tr><td><code>INVALID_PATH</code></td><td>400</td><td>Path format is not valid</td></tr>
</table>

<h4 style="margin-top:16px">Error Response Format</h4>
<pre><code>{
  "success": false,
  "error": {
    "code": "FILE_NOT_FOUND",
    "message": "Human-readable description"
  }
}</code></pre>

<h2>Usage Notes</h2>
<ul class="notes">
  <li>All paths are relative to the <strong>file_storage/</strong> directory.</li>
  <li>Path traversal (e.g., <code>../</code>) is blocked with <strong>403 Forbidden</strong>.</li>
  <li>Symlinks pointing outside the storage root are detected and blocked.</li>
  <li>Large files are streamed — no size limits on downloads (disk capacity only).</li>
  <li>Uploads have a configurable max file size (default <strong>10 GB</strong>).</li>
  <li>No authentication required — designed for trusted internal networks.</li>
  <li>Long connections are supported with a 2-hour keep-alive timeout.</li>
</ul>

</div>
</body>
</html>`;

export async function docsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/doc', async (_request, reply) => {
    reply.header('Content-Type', 'text/html; charset=utf-8');
    reply.header('Cache-Control', 'public, max-age=3600');
    return reply.send(HTML);
  });
}
