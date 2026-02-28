'use client';

import { useRef, useState, useCallback } from 'react';
import { AUDIO_SAMPLE_RATE_INPUT } from '@/lib/constants';

interface UseAudioRecorderOptions {
  onAudioData?: (data: ArrayBuffer) => void;
  sampleRate?: number;
  deviceId?: string;
}

const SPEAKING_THRESHOLD = 0.02; // RMS threshold to detect speech
const SILENCE_DELAY = 500; // ms of silence before "stopped speaking"

export function useAudioRecorder({
  onAudioData,
  sampleRate = AUDIO_SAMPLE_RATE_INPUT,
  deviceId,
}: UseAudioRecorderOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          channelCount: 1,
          sampleRate,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      setPermissionGranted(true);

      const audioContext = new AudioContext({ sampleRate });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      // Use ScriptProcessorNode for broad compatibility
      // Buffer size of 4096 gives us ~256ms chunks at 16kHz
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);

        // Calculate RMS for speech detection
        let sumSq = 0;
        for (let i = 0; i < inputData.length; i++) {
          sumSq += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sumSq / inputData.length);

        if (rms > SPEAKING_THRESHOLD) {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
          setIsSpeaking(true);
        } else {
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              setIsSpeaking(false);
              silenceTimerRef.current = null;
            }, SILENCE_DELAY);
          }
        }

        // Convert Float32 to Int16 PCM
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const sample = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        }

        onAudioData?.(pcmData.buffer);
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsRecording(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to access microphone';
      setError(message);
      console.error('Audio recording error:', err);
    }
  }, [sampleRate, onAudioData, deviceId]);

  const stopRecording = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    setIsSpeaking(false);
    setIsRecording(false);
  }, []);

  return {
    isRecording,
    isSpeaking,
    permissionGranted,
    error,
    startRecording,
    stopRecording,
  };
}
