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
  const onUploadRef = useRef(onUpload);
  onUploadRef.current = onUpload;

  useEffect(() => {
    let stopped = false;

    function connect() {
      if (stopped) return;

      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${location.host}/api/ws`);

      ws.onopen = () => {
        retryMs.current = 1000; // reset backoff
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const data: WsEvent = JSON.parse(event.data as string);
          if (data.type === 'upload') {
            onUploadRef.current(data);
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
  }, []);
}
