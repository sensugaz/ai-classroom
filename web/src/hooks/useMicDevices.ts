'use client';

import { useState, useEffect, useCallback } from 'react';

interface MicDevice {
  deviceId: string;
  label: string;
}

export function useMicDevices() {
  const [devices, setDevices] = useState<MicDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const enumerate = useCallback(async () => {
    try {
      // Need permission first to get labels
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const mics = allDevices
        .filter(d => d.kind === 'audioinput')
        .map(d => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${d.deviceId.slice(0, 4)}`,
        }));
      setDevices(mics);

      // If no device selected yet, pick the first one
      if (!selectedDeviceId && mics.length > 0) {
        setSelectedDeviceId(mics[0].deviceId);
      }
    } catch (err) {
      setError('Microphone access denied');
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    enumerate();

    // Listen for device changes (plug/unplug)
    navigator.mediaDevices?.addEventListener('devicechange', enumerate);
    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', enumerate);
    };
  }, [enumerate]);

  return { devices, selectedDeviceId, setSelectedDeviceId, error };
}
