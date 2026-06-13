---
name: fileserver-api
description: FileServer REST API — upload, download, and list files. Use when the user wants to interact with the file storage server.
---

# FileServer API

Base URL: `http://localhost:3000`

## Endpoints

### GET /api/files — List directory contents

Query params:
- `path` (optional): Subdirectory path relative to file storage root. Defaults to root.

Response:
```json
{
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
}
```

Shell example:
```bash
# List root directory
curl -s http://localhost:3000/api/files | jq

# List a subdirectory
curl -s "http://localhost:3000/api/files?path=subdir" | jq
```

---

### GET /api/download — Download a file

Query params:
- `path` (required): File path relative to file storage root.

Returns the file as a stream with proper Content-Type and Content-Disposition headers.

Shell example:
```bash
# Download a file
curl -O -J "http://localhost:3000/api/download?path=report.pdf"

# Download to a specific filename
curl -o output.pdf "http://localhost:3000/api/download?path=report.pdf"
```

---

### POST /api/upload — Upload a single file

`multipart/form-data`:
- `file`: The file to upload
- Query param `path` (optional): Target subdirectory

Response:
```json
{
  "success": true,
  "data": {
    "uploaded": [{ "name": "report.pdf", "size": 2048000 }],
    "failed": []
  }
}
```

Shell example:
```bash
# Upload a file to root
curl -F "file=@./report.pdf" http://localhost:3000/api/upload

# Upload to a subdirectory
curl -F "file=@./report.pdf" "http://localhost:3000/api/upload?path=docs"
```

---

### POST /api/upload/multi — Upload multiple files

`multipart/form-data`:
- `files`: One or more files
- Query param `path` (optional): Target subdirectory

Shell example:
```bash
# Upload multiple files
curl -F "files=@./a.pdf" -F "files=@./b.png" http://localhost:3000/api/upload/multi

# Upload to a subdirectory
curl -F "files=@./a.pdf" -F "files=@./b.png" "http://localhost:3000/api/upload/multi?path=docs"
```

---

### GET /health — Health check

Response:
```json
{ "status": "ok", "uptime": 123.456 }
```

## Error Codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `PATH_TRAVERSAL` | 403 | Path attempted to escape storage root |
| `FILE_NOT_FOUND` | 404 | File or directory does not exist |
| `NOT_A_DIRECTORY` | 400 | Tried to list files on a non-directory |
| `UPLOAD_FAILED` | 500 | Disk write or stream error |
| `FILE_TOO_LARGE` | 413 | File exceeds maximum size limit |
| `INVALID_PATH` | 400 | Path format is not valid |

## Usage Notes

- All paths are relative to `file_storage/` directory
- Path traversal (e.g., `../`) is blocked with 403
- Large files are streamed — no size limits on downloads (disk capacity only)
- Uploads have a configurable max file size (default 10GB)
- No authentication required (trusted internal network)
