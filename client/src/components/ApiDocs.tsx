import { useState } from 'react';

interface Endpoint {
  method: string;
  path: string;
  description: string;
  params?: { name: string; required: boolean; description: string }[];
  body?: string;
  response: string;
  curl: string;
}

const ENDPOINTS: Endpoint[] = [
  {
    method: 'GET',
    path: '/api/files',
    description: 'List directory contents',
    params: [
      { name: 'path', required: false, description: 'Subdirectory path relative to file storage root. Defaults to root.' },
    ],
    response: `{
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
}`,
    curl: `curl -s http://localhost:3000/api/files | jq
curl -s "http://localhost:3000/api/files?path=subdir" | jq`,
  },
  {
    method: 'GET',
    path: '/api/download',
    description: 'Download a file as a stream with proper Content-Type, Content-Disposition, and Content-Length headers.',
    params: [
      { name: 'path', required: true, description: 'File path relative to file storage root.' },
    ],
    response: '(binary file stream)',
    curl: `curl -O -J "http://localhost:3000/api/download?path=report.pdf"
curl -o output.pdf "http://localhost:3000/api/download?path=report.pdf"`,
  },
  {
    method: 'POST',
    path: '/api/upload',
    description: 'Upload a single file via multipart/form-data.',
    params: [
      { name: 'path', required: false, description: 'Target subdirectory (query parameter).' },
    ],
    body: 'multipart/form-data with field name "file"',
    response: `{
  "success": true,
  "data": {
    "uploaded": [
      { "name": "report.pdf", "size": 2048000 }
    ],
    "failed": []
  }
}`,
    curl: `curl -F "file=@./report.pdf" http://localhost:3000/api/upload
curl -F "file=@./report.pdf" "http://localhost:3000/api/upload?path=docs"`,
  },
  {
    method: 'POST',
    path: '/api/upload/multi',
    description: 'Upload multiple files via multipart/form-data.',
    params: [
      { name: 'path', required: false, description: 'Target subdirectory (query parameter).' },
    ],
    body: 'multipart/form-data with field name "files" (repeatable)',
    response: `{
  "success": true,
  "data": {
    "uploaded": [
      { "name": "a.pdf", "size": 1024000 },
      { "name": "b.png", "size": 512000 }
    ],
    "failed": []
  }
}`,
    curl: `curl -F "files=@./a.pdf" -F "files=@./b.png" http://localhost:3000/api/upload/multi
curl -F "files=@./a.pdf" -F "files=@./b.png" "http://localhost:3000/api/upload/multi?path=docs"`,
  },
  {
    method: 'GET',
    path: '/health',
    description: 'Health check — returns server status and uptime.',
    response: `{
  "status": "ok",
  "uptime": 123.456
}`,
    curl: `curl http://localhost:3000/health`,
  },
];

const ERROR_CODES = [
  { code: 'PATH_TRAVERSAL', status: 403, meaning: 'Path attempted to escape storage root' },
  { code: 'FILE_NOT_FOUND', status: 404, meaning: 'File or directory does not exist' },
  { code: 'NOT_A_DIRECTORY', status: 400, meaning: 'Tried to list files on a non-directory' },
  { code: 'UPLOAD_FAILED', status: 500, meaning: 'Disk write or stream error' },
  { code: 'FILE_TOO_LARGE', status: 413, meaning: 'File exceeds maximum size limit' },
  { code: 'INVALID_PATH', status: 400, meaning: 'Path format is not valid' },
];

export default function ApiDocs() {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const toggle = (idx: number) => setExpanded((prev) => ({ ...prev, [idx]: !prev[idx] }));

  return (
    <div className="api-docs">
      <div className="api-docs-header">
        <h1>FileServer REST API</h1>
        <p>Base URL: <code>http://localhost:3000</code></p>
      </div>

      <section className="api-docs-section">
        <h2>Endpoints</h2>

        {ENDPOINTS.map((ep, idx) => (
          <div key={ep.path} className="api-endpoint-card">
            <div
              className="api-endpoint-summary"
              onClick={() => toggle(idx)}
              onKeyDown={(e) => e.key === 'Enter' && toggle(idx)}
              tabIndex={0}
              role="button"
              aria-expanded={expanded[idx]}
            >
              <span className={`api-method method-${ep.method.toLowerCase()}`}>{ep.method}</span>
              <span className="api-path">{ep.path}</span>
              <span className="api-desc">{ep.description}</span>
              <span className="api-expand">{expanded[idx] ? '▾' : '▸'}</span>
            </div>

            {expanded[idx] && (
              <div className="api-endpoint-detail">
                {ep.params && ep.params.length > 0 && (
                  <div className="api-subsection">
                    <h4>Parameters</h4>
                    <table className="api-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Required</th>
                          <th>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ep.params.map((p) => (
                          <tr key={p.name}>
                            <td><code>{p.name}</code></td>
                            <td>{p.required ? 'Yes' : 'No'}</td>
                            <td>{p.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {ep.body && (
                  <div className="api-subsection">
                    <h4>Request Body</h4>
                    <pre><code>{ep.body}</code></pre>
                  </div>
                )}

                <div className="api-subsection">
                  <h4>Response</h4>
                  <pre><code>{ep.response}</code></pre>
                </div>

                <div className="api-subsection">
                  <h4>cURL Example</h4>
                  <pre className="curl-block"><code>{ep.curl}</code></pre>
                </div>
              </div>
            )}
          </div>
        ))}
      </section>

      <section className="api-docs-section">
        <h2>Error Codes</h2>
        <table className="api-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>HTTP Status</th>
              <th>Meaning</th>
            </tr>
          </thead>
          <tbody>
            {ERROR_CODES.map((e) => (
              <tr key={e.code}>
                <td><code>{e.code}</code></td>
                <td><span className="status-badge">{e.status}</span></td>
                <td>{e.meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="api-subsection" style={{ marginTop: 24 }}>
          <h4>Error Response Format</h4>
          <pre><code>{`{
  "success": false,
  "error": {
    "code": "FILE_NOT_FOUND",
    "message": "Human-readable description"
  }
}`}</code></pre>
        </div>
      </section>

      <section className="api-docs-section">
        <h2>Usage Notes</h2>
        <ul className="api-notes">
          <li>All paths are relative to the <code>file_storage/</code> directory.</li>
          <li>Path traversal (e.g., <code>../</code>) is blocked with <strong>403 Forbidden</strong>.</li>
          <li>Large files are streamed — no size limits on downloads (disk capacity only).</li>
          <li>Uploads have a configurable max file size (default <strong>10 GB</strong>).</li>
          <li>No authentication required — designed for trusted internal networks.</li>
          <li>Long connections are supported with a 2-hour keep-alive timeout.</li>
          <li>Symlinks pointing outside the storage root are detected and blocked.</li>
        </ul>
      </section>
    </div>
  );
}
