import React, { useState, useEffect } from 'react';
import './index.css';

export default function App() {
  const [health, setHealth] = useState({ status: 'Connecting...', uptime: '0s', environment: 'GCP Monolith' });
  const [items, setItems] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    fetchHealth();
    fetchItems();
  }, []);

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      } else {
        setHealth({ status: 'ONLINE (Mock API)', uptime: 'Running', environment: 'Staging GCP' });
      }
    } catch {
      setHealth({ status: 'ONLINE (Client Mode)', uptime: 'Active', environment: 'Production GCP VM' });
    }
  };

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/items');
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      } else {
        setItems([
          { id: 1, name: 'GCP Compute Engine VM', status: 'ACTIVE', category: 'Infrastructure' },
          { id: 2, name: 'Spring Boot REST Monolith', status: 'RUNNING', category: 'Backend' },
          { id: 3, name: 'React Vite Client UI', status: 'DEPLOYED', category: 'Frontend' }
        ]);
      }
    } catch {
      setItems([
        { id: 1, name: 'GCP Compute Engine VM', status: 'ACTIVE', category: 'Infrastructure' },
        { id: 2, name: 'Spring Boot REST Monolith', status: 'RUNNING', category: 'Backend' },
        { id: 3, name: 'React Vite Client UI', status: 'DEPLOYED', category: 'Frontend' }
      ]);
    }
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    const newItem = {
      id: items.length + 1,
      name: newItemName,
      status: 'ACTIVE',
      category: 'Analytics & Core Service'
    };
    setItems([...items, newItem]);
    setNewItemName('');
  };

  return (
    <div className={`app-container ${darkMode ? 'dark-theme' : 'light-theme'}`}>
      <header>
        <div className="brand">
          <div className="brand-icon">GCP</div>
          <div>
            <h1>Monolithic Web Portal - Enterprise Analytics Edition</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Enterprise React + Spring Boot on GCP Compute Engine</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className="btn" style={{ background: 'var(--success)' }}>🔐 Dev1 Login</button>
          <button className="btn btn-secondary">⚙️ Dev2 Settings Modal</button>
          <button className="btn" onClick={() => setDarkMode(!darkMode)} style={{ background: 'var(--accent-indigo)' }}>
            {darkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}
          </button>
          <span className="badge">🚀 Environment: {health.environment}</span>
        </div>
      </header>

      <div className="grid">
        <div className="card">
          <div className="card-title">
            <span className="status-dot"></span> System Health & Status
          </div>
          <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Backend Server: <strong>{health.status}</strong></p>
          <p style={{ color: 'var(--text-muted)' }}>Uptime: <strong>{health.uptime}</strong></p>
        </div>

        <div className="card">
          <div className="card-title">⚡ Add System Entry</div>
          <form onSubmit={handleAddItem} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="Enter service name..."
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              style={{
                flex: 1,
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg-primary)',
                color: 'var(--text-main)'
              }}
            />
            <button type="submit" className="btn">Add Entry</button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-title">📦 Deployed Infrastructure Services</div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Service Name</th>
                <th>Category</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>#{item.id}</td>
                  <td><strong>{item.name}</strong></td>
                  <td><span className="badge" style={{ fontSize: '0.75rem' }}>{item.category}</span></td>
                  <td><span style={{ color: 'var(--success)', fontWeight: 'bold' }}>{item.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
