'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { WS_URL } from '@/lib/constants';
import { useTranscriptStore } from '@/stores/transcriptStore';
import { useLessonStore } from '@/stores/lessonStore';
import { useSettingsStore } from '@/stores/settingsStore';
import type { WSIncomingMessage, WSOutgoingMessage } from '@/lib/types';

interface UseWebSocketOptions {
  sessionId: string | null;
  onAudioReceived?: (data: ArrayBuffer) => void;
  onAudioStart?: () => void;
  onAudioEnd?: () => void;
}

export function useWebSocket({
  sessionId,
  onAudioReceived,
  onAudioStart,
  onAudioEnd,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const addSegment = useTranscriptStore((s) => s.addSegment);
  const setPartialOriginal = useTranscriptStore((s) => s.setPartialOriginal);
  const setPartialTranslation = useTranscriptStore((s) => s.setPartialTranslation);
  const setProcessingStatus = useLessonStore((s) => s.setProcessingStatus);
  const setError = useLessonStore((s) => s.setError);
  const segmentCountRef = useRef(0);
  const lastTranscriptRef = useRef('');

  const sendJSON = useCallback((msg: WSOutgoingMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const sendAudio = useCallback((data: ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    }
  }, []);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      // Binary message = TTS audio
      if (event.data instanceof Blob) {
        event.data.arrayBuffer().then((buf) => {
          onAudioReceived?.(buf);
        });
        return;
      }

      if (event.data instanceof ArrayBuffer) {
        onAudioReceived?.(event.data);
        return;
      }

      // Text message = JSON
      try {
        const msg: WSIncomingMessage = JSON.parse(event.data);

        switch (msg.type) {
          case 'session.created':
            break;

          case 'transcript.partial':
            setPartialOriginal(msg.text);
            setProcessingStatus('listening');
            break;

          case 'transcript.final':
          case 'transcript.done':
            setPartialOriginal(msg.text || '');
            lastTranscriptRef.current = msg.text || '';
            setProcessingStatus('translating');
            break;

          case 'translation.partial':
            setPartialTranslation(msg.text);
            setProcessingStatus('translating');
            break;

          case 'translation.final':
          case 'translation.done':
            addSegment({
              index: segmentCountRef.current++,
              original_text: lastTranscriptRef.current,
              translated_text: msg.text || (msg as any).segment?.translated_text || '',
              timestamp: Date.now() / 1000,
            });
            setPartialOriginal('');
            setPartialTranslation('');
            lastTranscriptRef.current = '';
            break;

          case 'audio.done':
            setProcessingStatus('speaking');
            onAudioStart?.();
            break;

          case 'audio.start':
            setProcessingStatus('speaking');
            onAudioStart?.();
            break;

          case 'audio.end':
            setProcessingStatus('listening');
            onAudioEnd?.();
            break;

          case 'status.update':
            if (
              msg.status === 'listening' ||
              msg.status === 'processing' ||
              msg.status === 'translating' ||
              msg.status === 'speaking' ||
              msg.status === 'idle'
            ) {
              setProcessingStatus(msg.status);
            }
            break;

          case 'error':
            setError(msg.message);
            break;
        }
      } catch {
        console.error('Failed to parse WebSocket message');
      }
    },
    [
      addSegment,
      setPartialOriginal,
      setPartialTranslation,
      setProcessingStatus,
      setError,
      onAudioReceived,
      onAudioStart,
      onAudioEnd,
    ]
  );

  const connect = useCallback(() => {
    if (!sessionId) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(`${WS_URL}/ws/translate`);
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      setIsConnected(true);
      const s = useSettingsStore.getState();
      sendJSON({
        type: 'session.create',
        session_id: sessionId,
        source_lang: s.sourceLang,
        target_lang: s.targetLang,
        voice: s.voiceType,
        denoise: s.noiseCancellation,
      });
    };

    ws.onmessage = handleMessage;

    ws.onclose = () => {
      setIsConnected(false);
      // Reconnect after 2 seconds
      reconnectTimerRef.current = setTimeout(() => {
        connect();
      }, 2000);
    };

    ws.onerror = () => {
      setError('WebSocket connection error');
    };

    wsRef.current = ws;
  }, [sessionId, handleMessage, sendJSON, setError]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onclose = null; // prevent reconnect
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    connect,
    disconnect,
    sendAudio,
    sendJSON,
  };
}
