import React, { useState } from 'react';
import './ConnectionPanel.css';

export default function ConnectionPanel({
  connected,
  connecting,
  error,
  onConnect,
  onDisconnect,
}) {
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState('4455');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleConnect = (e) => {
    e.preventDefault();
    onConnect(host.trim() || 'localhost', parseInt(port, 10) || 4455, password);
  };

  const statusLabel = connected
    ? 'Connected'
    : connecting
    ? 'Connecting…'
    : 'Disconnected';

  const statusClass = connected
    ? 'status--connected'
    : connecting
    ? 'status--connecting'
    : 'status--disconnected';

  return (
    <div className="connection-panel">
      <div className="connection-panel__left">
        <div className="connection-panel__brand">
          <span className="brand-icon">⬡</span>
          <span className="brand-name">OBS Stats Monitor</span>
        </div>
        <div className={`status-badge ${statusClass}`}>
          <span className="status-badge__dot" />
          <span className="status-badge__label">{statusLabel}</span>
        </div>
        {error && !connected && !connecting && (
          <div className="connection-error" title={error}>
            {error.length > 60 ? error.slice(0, 60) + '…' : error}
          </div>
        )}
      </div>

      <form className="connection-panel__form" onSubmit={handleConnect}>
        <div className="form-field">
          <label className="form-label" htmlFor="obs-host">Host</label>
          <input
            id="obs-host"
            className="form-input"
            type="text"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="localhost"
            disabled={connected || connecting}
            autoComplete="off"
            spellCheck="false"
          />
        </div>

        <div className="form-field form-field--short">
          <label className="form-label" htmlFor="obs-port">Port</label>
          <input
            id="obs-port"
            className="form-input"
            type="number"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            placeholder="4455"
            min="1"
            max="65535"
            disabled={connected || connecting}
          />
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="obs-password">Password</label>
          <div className="password-wrap">
            <input
              id="obs-password"
              className="form-input"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="optional"
              disabled={connected || connecting}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              aria-label="Toggle password visibility"
            >
              {showPassword ? '🙈' : '👁'}
            </button>
          </div>
        </div>

        {connected ? (
          <button
            type="button"
            className="btn btn--disconnect"
            onClick={onDisconnect}
          >
            Disconnect
          </button>
        ) : (
          <button
            type="submit"
            className="btn btn--connect"
            disabled={connecting}
          >
            {connecting ? 'Connecting…' : 'Connect'}
          </button>
        )}
      </form>
    </div>
  );
}
