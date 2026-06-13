const BASE = '/api';

export interface FileItem {
  name: string;
  type: 'file' | 'directory';
  size?: number;
  mimeType?: string;
  lastModified: string;
}

export interface FileListData {
  currentPath: string;
  parentPath: string | null;
  items: FileItem[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export async function fetchFileList(path?: string): Promise<ApiResponse<FileListData>> {
  const params = path ? `?path=${encodeURIComponent(path)}` : '';
  const res = await fetch(`${BASE}/files${params}`);
  return res.json();
}

export function getDownloadUrl(path: string): string {
  return `${BASE}/download?path=${encodeURIComponent(path)}`;
}

export function getFileViewUrl(path: string): string {
  return `${BASE}/download?path=${encodeURIComponent(path)}`;
}

export async function uploadFiles(
  files: File[],
  targetPath?: string
): Promise<ApiResponse<{ uploaded: { name: string; size: number }[]; failed: { name: string; reason: string }[] }>> {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  const params = targetPath ? `?path=${encodeURIComponent(targetPath)}` : '';
  const res = await fetch(`${BASE}/upload/multi${params}`, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

export async function uploadSingleFile(
  file: File,
  targetPath?: string
): Promise<ApiResponse<{ uploaded: { name: string; size: number }[]; failed: { name: string; reason: string }[] }>> {
  const formData = new FormData();
  formData.append('file', file);

  const params = targetPath ? `?path=${encodeURIComponent(targetPath)}` : '';
  const res = await fetch(`${BASE}/upload${params}`, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}
