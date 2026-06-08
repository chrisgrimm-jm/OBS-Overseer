import { useState, useEffect, useRef, useCallback } from 'react';
import OBSWebSocket from 'obs-websocket-js';

const POLL_INTERVAL_MS = 1000;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;

function makeInitialSystemStats() {
  return {
    cpuUsage: null,
    memoryUsage: null,
    activeFps: null,
    averageFrameRenderTime: null,
    renderMissedFrames: null,
    renderTotalFrames: null,
    outputSkippedFrames: null,
    outputTotalFrames: null,
  };
}

function makeInitialStreamStats() {
  return {
    active: false,
    outputBytesPerSec: null,
    outputTotalFrames: null,
    outputSkippedFrames: null,
    outputTimecode: null,
    outputDuration: null,
  };
}

function makeInitialRecordStats() {
  return {
    active: false,
    paused: false,
    outputBytes: null,
    outputDuration: null,
    outputTimecode: null,
  };
}

export function useOBSConnection() {
  const obsRef = useRef(null);
  const pollTimerRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectDelayRef = useRef(RECONNECT_BASE_MS);
  const mountedRef = useRef(true);
  const connectionParamsRef = useRef(null);

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [systemStats, setSystemStats] = useState(makeInitialSystemStats());
  const [streamStats, setStreamStats] = useState(makeInitialStreamStats());
  const [recordStats, setRecordStats] = useState(makeInitialRecordStats());

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const stopReconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const pollStats = useCallback(async () => {
    const obs = obsRef.current;
    if (!obs || !mountedRef.current) return;

    try {
      const [statsRes, streamRes, recordRes] = await Promise.allSettled([
        obs.call('GetStats'),
        obs.call('GetStreamStatus'),
        obs.call('GetRecordStatus'),
      ]);

      if (!mountedRef.current) return;

      if (statsRes.status === 'fulfilled') {
        const s = statsRes.value;
        setSystemStats({
          cpuUsage: s.cpuUsage ?? null,
          memoryUsage: s.memoryUsageMb ?? null,
          activeFps: s.activeFps ?? null,
          averageFrameRenderTime: s.averageFrameRenderTime ?? null,
          renderMissedFrames: s.renderMissedFrames ?? null,
          renderTotalFrames: s.renderTotalFrames ?? null,
          outputSkippedFrames: s.outputSkippedFrames ?? null,
          outputTotalFrames: s.outputTotalFrames ?? null,
        });
      }

      if (streamRes.status === 'fulfilled') {
        const s = streamRes.value;
        setStreamStats({
          active: s.outputActive ?? false,
          outputBytesPerSec: s.outputBytes != null ? s.outputBytes : null,
          outputTotalFrames: s.outputTotalFrames ?? null,
          outputSkippedFrames: s.outputSkippedFrames ?? null,
          outputTimecode: s.outputTimecode ?? null,
          outputDuration: s.outputDuration ?? null,
        });
      }

      if (recordRes.status === 'fulfilled') {
        const r = recordRes.value;
        setRecordStats({
          active: r.outputActive ?? false,
          paused: r.outputPaused ?? false,
          outputBytes: r.outputBytes ?? null,
          outputDuration: r.outputDuration ?? null,
          outputTimecode: r.outputTimecode ?? null,
        });
      }
    } catch {
      // Silently ignore polling errors — connection events handle reconnect
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollStats(); // immediate first poll
    pollTimerRef.current = setInterval(pollStats, POLL_INTERVAL_MS);
  }, [pollStats, stopPolling]);

  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current || !connectionParamsRef.current) return;
    stopReconnect();
    const delay = reconnectDelayRef.current;
    reconnectDelayRef.current = Math.min(delay * 2, RECONNECT_MAX_MS);

    reconnectTimerRef.current = setTimeout(() => {
      if (!mountedRef.current || !connectionParamsRef.current) return;
      const { host, port, password } = connectionParamsRef.current;
      connectInternal(host, port, password);
    }, delay);
  }, [stopReconnect]); // connectInternal declared below, ref trick used

  // Use a ref so scheduleReconnect can call it without circular dep
  const connectInternalRef = useRef(null);

  const connectInternal = useCallback(async (host, port, password) => {
    if (!mountedRef.current) return;

    // Clean up existing instance
    if (obsRef.current) {
      try { obsRef.current.disconnect(); } catch {}
      obsRef.current = null;
    }
    stopPolling();

    setConnecting(true);
    setError(null);

    const obs = new OBSWebSocket();
    obsRef.current = obs;

    obs.on('ConnectionClosed', (event) => {
      if (!mountedRef.current) return;
      stopPolling();
      setConnected(false);
      setConnecting(false);
      const reason = event?.message || event?.code || 'Connection closed';
      setError(String(reason));
      setSystemStats(makeInitialSystemStats());
      setStreamStats(makeInitialStreamStats());
      setRecordStats(makeInitialRecordStats());
      if (connectionParamsRef.current) {
        scheduleReconnect();
      }
    });

    obs.on('ConnectionError', (event) => {
      if (!mountedRef.current) return;
      stopPolling();
      setConnected(false);
      setConnecting(false);
      const reason = event?.message || 'Connection error';
      setError(String(reason));
    });

    obs.on('StreamStateChanged', (data) => {
      if (!mountedRef.current) return;
      setStreamStats((prev) => ({
        ...prev,
        active: data.outputActive ?? prev.active,
      }));
    });

    obs.on('RecordStateChanged', (data) => {
      if (!mountedRef.current) return;
      setRecordStats((prev) => ({
        ...prev,
        active: data.outputActive ?? prev.active,
        paused: data.outputState === 'OBS_WEBSOCKET_OUTPUT_PAUSED',
      }));
    });

    try {
      const url = `ws://${host}:${port}`;
      await obs.connect(url, password || undefined);
      if (!mountedRef.current) return;
      reconnectDelayRef.current = RECONNECT_BASE_MS;
      setConnected(true);
      setConnecting(false);
      setError(null);
      startPolling();
    } catch (err) {
      if (!mountedRef.current) return;
      setConnecting(false);
      setConnected(false);
      const msg = err?.message || String(err);
      setError(msg);
      if (connectionParamsRef.current) {
        scheduleReconnect();
      }
    }
  }, [stopPolling, startPolling, scheduleReconnect]);

  // Keep ref in sync
  connectInternalRef.current = connectInternal;

  const connect = useCallback((host = 'localhost', port = 4455, password = '') => {
    stopReconnect();
    reconnectDelayRef.current = RECONNECT_BASE_MS;
    connectionParamsRef.current = { host, port, password };
    connectInternal(host, port, password);
  }, [connectInternal, stopReconnect]);

  const disconnect = useCallback(() => {
    connectionParamsRef.current = null; // prevent auto-reconnect
    stopReconnect();
    stopPolling();
    if (obsRef.current) {
      try { obsRef.current.disconnect(); } catch {}
      obsRef.current = null;
    }
    setConnected(false);
    setConnecting(false);
    setError(null);
    setSystemStats(makeInitialSystemStats());
    setStreamStats(makeInitialStreamStats());
    setRecordStats(makeInitialRecordStats());
  }, [stopPolling, stopReconnect]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopPolling();
      stopReconnect();
      if (obsRef.current) {
        try { obsRef.current.disconnect(); } catch {}
        obsRef.current = null;
      }
    };
  }, [stopPolling, stopReconnect]);

  return {
    connected,
    connecting,
    error,
    systemStats,
    streamStats,
    recordStats,
    connect,
    disconnect,
  };
}
