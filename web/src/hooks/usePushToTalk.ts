'use client';

import { useCallback, useRef, useState } from 'react';
import { useAudioRecorder } from './useAudioRecorder';
import type { WSOutgoingMessage } from '@/lib/types';

interface UsePushToTalkOptions {
  sendAudio: (data: ArrayBuffer) => void;
  sendJSON: (msg: WSOutgoingMessage) => void;
}

export function usePushToTalk({ sendAudio, sendJSON }: UsePushToTalkOptions) {
  const [isPressed, setIsPressed] = useState(false);
  const isPressedRef = useRef(false);

  const { isRecording, startRecording, stopRecording, error } = useAudioRecorder({
    onAudioData: (data) => {
      if (isPressedRef.current) {
        sendAudio(data);
      }
    },
  });

  const onPressStart = useCallback(async () => {
    isPressedRef.current = true;
    setIsPressed(true);
    sendJSON({ type: 'input_audio.start' });
    await startRecording();
  }, [sendJSON, startRecording]);

  const onPressEnd = useCallback(() => {
    isPressedRef.current = false;
    setIsPressed(false);
    stopRecording();
    sendJSON({ type: 'input_audio.stop' });
  }, [sendJSON, stopRecording]);

  return {
    isPressed,
    isRecording,
    error,
    onPressStart,
    onPressEnd,
  };
}
