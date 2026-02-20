import { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? '' : 'http://localhost:3001');

const TOKEN_KEY = 'scripper_token';

function LoginForm({ onLogin }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/api/login`, { password });
      onLogin(response.data.token);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎵 SCRipper</h1>
        <p>Download SoundCloud tracks and playlists</p>
      </header>
      <main className="app-main">
        <form onSubmit={handleSubmit} className="login-form">
          <h2>Sign In</h2>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              disabled={loading}
              className="url-input"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="download-button"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          {error && (
            <div className="error-message">{error}</div>
          )}
        </form>
      </main>
    </div>
  );
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [downloads, setDownloads] = useState([]);
  const [downloading, setDownloading] = useState({});

  const api = useMemo(() => {
    const instance = axios.create({ baseURL: API_URL });

    instance.interceptors.request.use((config) => {
      const t = localStorage.getItem(TOKEN_KEY);
      if (t) config.headers.Authorization = `Bearer ${t}`;
      return config;
    });

    instance.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err.response?.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
        }
        return Promise.reject(err);
      },
    );

    return instance;
  }, []);

  const handleLogin = useCallback((newToken) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }, []);

  const fetchDownloads = useCallback(async () => {
    try {
      const response = await api.get('/api/downloads');
      setDownloads(response.data.files || []);
    } catch (err) {
      if (err.response?.status !== 401) {
        console.error('Failed to fetch downloads:', err);
      }
    }
  }, [api]);

  useEffect(() => {
    if (token) fetchDownloads();
  }, [token, fetchDownloads]);

  const handleDownload = async (e) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Please enter a SoundCloud URL');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await api.post('/api/download', { url });
      setResults(response.data);
      setUrl('');
      await fetchDownloads();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to download');
    } finally {
      setLoading(false);
    }
  };

  const handleFileDownload = async (filename) => {
    setDownloading(prev => ({ ...prev, [filename]: true }));
    try {
      const response = await api.get(
        `/api/downloads/${encodeURIComponent(filename)}`,
        { responseType: 'blob' },
      );

      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      alert('Failed to download file');
    } finally {
      setDownloading(prev => ({ ...prev, [filename]: false }));
    }
  };

  const handleDelete = async (filename) => {
    if (!confirm(`Delete ${filename}?`)) return;

    try {
      await api.delete(`/api/downloads/${encodeURIComponent(filename)}`);
      await fetchDownloads();
    } catch {
      alert('Failed to delete file');
    }
  };

  if (!token) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div>
            <h1>🎵 SCRipper</h1>
            <p>Download SoundCloud tracks and playlists</p>
          </div>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </header>

      <main className="app-main">
        <div className="download-section">
          <form onSubmit={handleDownload} className="download-form">
            <div className="form-group">
              <label htmlFor="url">SoundCloud URL</label>
              <input
                id="url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://soundcloud.com/..."
                disabled={loading}
                className="url-input"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="download-button"
            >
              {loading ? 'Downloading...' : 'Download'}
            </button>
          </form>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {results && (
            <div className="results-section">
              <h2>Download Results</h2>
              <p className="results-summary">
                Processed {results.total} track{results.total !== 1 ? 's' : ''}
              </p>
              <div className="results-list">
                {results.results.map((result, idx) => (
                  <div key={idx} className={`result-item ${result.success ? 'success' : 'error'}`}>
                    {result.success ? (
                      <>
                        <span className="result-icon">✅</span>
                        <div className="result-info">
                          <strong>{result.title}</strong>
                          <span>by {result.artist}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="result-icon">❌</span>
                        <div className="result-info">
                          <strong>{result.title}</strong>
                          <span className="error-text">{result.error}</span>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="downloads-section">
          <div className="downloads-header">
            <h2>Downloaded Files</h2>
            <button onClick={fetchDownloads} className="refresh-button">
              🔄 Refresh
            </button>
          </div>
          {downloads.length === 0 ? (
            <p className="no-downloads">No downloads yet</p>
          ) : (
            <div className="downloads-list">
              {downloads.map((file, idx) => (
                <div key={idx} className="download-item">
                  <span className="file-icon">🎵</span>
                  <span className="file-name">{file.filename}</span>
                  <div className="file-actions">
                    <button
                      onClick={() => handleFileDownload(file.filename)}
                      disabled={downloading[file.filename]}
                      className="action-button download-btn"
                    >
                      {downloading[file.filename] ? '⏳' : '⬇️'} Download
                    </button>
                    <button
                      onClick={() => handleDelete(file.filename)}
                      className="action-button delete-btn"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
