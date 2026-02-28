'use client';

import { useRef, useState, useCallback } from 'react';
import { AUDIO_SAMPLE_RATE_OUTPUT } from '@/lib/constants';

export function useAudioPlayback(sampleRate = AUDIO_SAMPLE_RATE_OUTPUT) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const queueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new AudioContext({ sampleRate });
    }
    return audioContextRef.current;
  }, [sampleRate]);

  const playNext = useCallback(async () => {
    if (isPlayingRef.current) return;
    if (queueRef.current.length === 0) {
      setIsPlaying(false);
      return;
    }

    isPlayingRef.current = true;
    setIsPlaying(true);

    const buffer = queueRef.current.shift()!;
    const ctx = getAudioContext();

    // Resume context if suspended (autoplay policy)
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    try {
      // Convert Int16 PCM to Float32
      const int16 = new Int16Array(buffer);
      const audioBuffer = ctx.createBuffer(1, int16.length, sampleRate);
      const channelData = audioBuffer.getChannelData(0);

      for (let i = 0; i < int16.length; i++) {
        channelData[i] = int16[i] / 32768;
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      currentSourceRef.current = source;

      source.onended = () => {
        currentSourceRef.current = null;
        if (queueRef.current.length > 0) {
          // More in queue — play immediately
          isPlayingRef.current = false;
          playNext();
        } else {
          // Queue empty — keep isPlaying true for 500ms cooldown
          // so microphone doesn't pick up residual echo
          setTimeout(() => {
            isPlayingRef.current = false;
            setIsPlaying(false);
          }, 500);
        }
      };

      source.start(0);
    } catch (err) {
      console.error('Audio playback error:', err);
      isPlayingRef.current = false;
      playNext(); // Try next buffer
    }
  }, [getAudioContext, sampleRate]);

  const enqueue = useCallback(
    (data: ArrayBuffer) => {
      queueRef.current.push(data);
      if (!isPlayingRef.current) {
        playNext();
      }
    },
    [playNext]
  );

  const clearQueue = useCallback(() => {
    queueRef.current = [];
    // Stop currently playing audio immediately
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.onended = null;
        currentSourceRef.current.stop();
      } catch { /* already stopped */ }
      currentSourceRef.current = null;
    }
    isPlayingRef.current = false;
    setIsPlaying(false);
  }, []);

  const close = useCallback(() => {
    clearQueue();
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }
  }, [clearQueue]);

  return {
    isPlaying,
    enqueue,
    clearQueue,
    close,
  };
}
