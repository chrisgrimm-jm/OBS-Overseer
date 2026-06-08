import React from 'react';
import { useOBSConnection } from './hooks/useOBSConnection';
import ConnectionPanel from './components/ConnectionPanel';
import StreamStats from './components/StreamStats';
import RecordStats from './components/RecordStats';
import SystemStats from './components/SystemStats';
import './App.css';

export default function App() {
  const {
    connected,
    connecting,
    error,
    systemStats,
    streamStats,
    recordStats,
    connect,
    disconnect,
  } = useOBSConnection();

  return (
    <div className="app">
      <ConnectionPanel
        connected={connected}
        connecting={connecting}
        error={error}
        onConnect={connect}
        onDisconnect={disconnect}
      />

      <main className="app__main">
        {!connected && !connecting && (
          <div className="app__idle">
            <div className="idle-icon">⬡</div>
            <h2 className="idle-title">OBS Stats Monitor</h2>
            <p className="idle-subtitle">
              Enter your OBS WebSocket details above and click Connect to begin monitoring.
            </p>
            <div className="idle-hints">
              <div className="idle-hint">
                <span className="idle-hint__key">OBS Studio</span>
                <span className="idle-hint__val">Tools → WebSocket Server Settings</span>
              </div>
              <div className="idle-hint">
                <span className="idle-hint__key">Default port</span>
                <span className="idle-hint__val">4455</span>
              </div>
              <div className="idle-hint">
                <span className="idle-hint__key">Requires</span>
                <span className="idle-hint__val">OBS 28+ (WebSocket v5)</span>
              </div>
            </div>
          </div>
        )}

        {connecting && (
          <div className="app__idle">
            <div className="spinner" />
            <p className="idle-subtitle">Connecting to OBS…</p>
          </div>
        )}

        {connected && (
          <div className="dashboard">
            <div className="dashboard__column">
              <StreamStats streamStats={streamStats} systemStats={systemStats} />
              <RecordStats recordStats={recordStats} />
            </div>
            <div className="dashboard__column dashboard__column--wide">
              <SystemStats systemStats={systemStats} connected={connected} />
            </div>
          </div>
        )}
      </main>

      <footer className="app__footer">
        <span>OBS Stats Monitor</span>
        <span className="footer-sep">·</span>
        <span>WebSocket v5</span>
        {connected && (
          <>
            <span className="footer-sep">·</span>
            <span className="footer-live">Live</span>
          </>
        )}
      </footer>
    </div>
  );
}
