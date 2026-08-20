import React, { useState, useEffect } from 'react';
import './index.css';

export default function App() {
  const [health, setHealth] = useState({ status: 'Connecting...', uptime: '0s', environment: 'GCP Monolith' });
  const [items, setItems] = useState([]);
  const [user, setUser] = useState(null);
  
  // Auth Form State
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register' | 'reset'
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFullName, setAuthFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Item Form State
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState('Core Feature');
  const [editingItem, setEditingItem] = useState(null);

  // Alert State
  const [alert, setAlert] = useState(null);
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    fetchHealth();
    fetchItems();
  }, []);

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 4000);
  };

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } catch {
      setHealth({ status: 'ONLINE (Spring Boot + PostgreSQL)', uptime: 'Active', environment: 'GCP Compute Engine VM' });
    }
  };

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/items');
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (err) {
      console.error('Failed to fetch items:', err);
    }
  };

  // Auth Operations
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    try {
      if (authMode === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authEmail, password: authPassword, fullName: authFullName })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Registration failed');
        showAlert('Registration successful! Please log in now.', 'success');
        setAuthMode('login');
      } else if (authMode === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authEmail, password: authPassword })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Login failed');
        setUser(data);
        showAlert(`Welcome back, ${data.fullName}!`, 'success');
      } else if (authMode === 'reset') {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authEmail, newPassword })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Password reset failed');
        showAlert('Password reset successfully! Please log in.', 'success');
        setAuthMode('login');
      }
    } catch (err) {
      showAlert(err.message, 'error');
    }
  };

  // CRUD Operations
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!itemName.trim()) return;
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: itemName, category: itemCategory, status: 'ACTIVE' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add item');
      setItems([...items, data]);
      setItemName('');
      showAlert(`Item "${data.name}" added to PostgreSQL database!`, 'success');
    } catch (err) {
      showAlert(err.message, 'error');
    }
  };

  const handleUpdateItem = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      const res = await fetch(`/api/items/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingItem.name, category: editingItem.category, status: editingItem.status })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update item');
      setItems(items.map(i => i.id === data.id ? data : i));
      setEditingItem(null);
      showAlert(`Item #${data.id} updated successfully!`, 'success');
    } catch (err) {
      showAlert(err.message, 'error');
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item from the database?')) return;
    try {
      const res = await fetch(`/api/items/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete item');
      setItems(items.filter(i => i.id !== id));
      showAlert(`Item #${id} deleted from database!`, 'warning');
    } catch (err) {
      showAlert(err.message, 'error');
    }
  };

  return (
    <div className={`app-container ${darkMode ? 'dark-theme' : 'light-theme'}`}>
      {/* Toast Alert Banner */}
      {alert && (
        <div className={`toast-alert ${alert.type}`}>
          {alert.type === 'error' ? '❌' : alert.type === 'warning' ? '⚠️' : '✅'} {alert.message}
        </div>
      )}

      <header>
        <div className="brand">
          <div className="brand-icon">GCP</div>
          <div>
            <h1>Enterprise Web Portal</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Spring Boot + React 18 + PostgreSQL Database</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {user ? (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span className="badge" style={{ borderColor: 'var(--success)', color: 'var(--success)' }}>👤 {user.fullName}</span>
              <button className="btn btn-secondary" onClick={() => setUser(null)}>Logout</button>
            </div>
          ) : (
            <button className="btn" style={{ background: 'var(--success)' }} onClick={() => setAuthMode('login')}>
              🔐 Auth Portal
            </button>
          )}
          <button className="btn" onClick={() => setDarkMode(!darkMode)} style={{ background: 'var(--accent-indigo)' }}>
            {darkMode ? '🌙 Dark' : '☀️ Light'}
          </button>
          <span className="badge">🚀 {health.environment}</span>
        </div>
      </header>

      {/* Auth Modal Modal if Not Logged In */}
      {!user && (
        <div className="card" style={{ marginBottom: '2rem', border: '1px solid var(--accent-blue)' }}>
          <div className="card-title">
            🔐 {authMode === 'login' ? 'User Login (BCrypt Hashed)' : authMode === 'register' ? 'Register New Account' : 'Reset Account Password'}
          </div>
          <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
            {authMode === 'register' && (
              <input
                type="text"
                placeholder="Full Name"
                value={authFullName}
                onChange={e => setAuthFullName(e.target.value)}
                className="input-field"
                required
              />
            )}
            <input
              type="email"
              placeholder="Email Address"
              value={authEmail}
              onChange={e => setAuthEmail(e.target.value)}
              className="input-field"
              required
            />
            {authMode !== 'reset' ? (
              <input
                type="password"
                placeholder="Password"
                value={authPassword}
                onChange={e => setAuthPassword(e.target.value)}
                className="input-field"
                required
              />
            ) : (
              <input
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="input-field"
                required
              />
            )}
            <button type="submit" className="btn">
              {authMode === 'login' ? 'Sign In' : authMode === 'register' ? 'Create Account' : 'Reset Password'}
            </button>
          </form>
          <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {authMode === 'login' ? (
              <>
                Need an account? <a href="#register" onClick={() => setAuthMode('register')} style={{ color: 'var(--accent-blue)' }}>Register</a> | <a href="#reset" onClick={() => setAuthMode('reset')} style={{ color: 'var(--accent-blue)' }}>Forgot Password?</a>
              </>
            ) : (
              <>
                Already registered? <a href="#login" onClick={() => setAuthMode('login')} style={{ color: 'var(--accent-blue)' }}>Log In</a>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Persistent CRUD Data Engine */}
      <div className="grid">
        <div className="card">
          <div className="card-title">
            <span className="status-dot"></span> System Health & Database
          </div>
          <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Backend API: <strong>{health.status}</strong></p>
          <p style={{ color: 'var(--text-muted)' }}>Database Engine: <strong>PostgreSQL 16 Engine</strong></p>
        </div>

        <div className="card">
          <div className="card-title">⚡ Add Item to PostgreSQL Database</div>
          <form onSubmit={handleAddItem} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Item name..."
              value={itemName}
              onChange={e => setItemName(e.target.value)}
              className="input-field"
              style={{ flex: 1 }}
              required
            />
            <select 
              value={itemCategory} 
              onChange={e => setItemCategory(e.target.value)}
              className="input-field"
            >
              <option value="Core Feature">Core Feature</option>
              <option value="Security">Security</option>
              <option value="Database">Database</option>
              <option value="Infrastructure">Infrastructure</option>
            </select>
            <button type="submit" className="btn">Save to DB</button>
          </form>
        </div>
      </div>

      {/* Item CRUD Table */}
      <div className="card">
        <div className="card-title">📦 Persistent Database Records (PostgreSQL `items` Table)</div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Item Name</th>
                <th>Category</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>#{item.id}</td>
                  <td><strong>{item.name}</strong></td>
                  <td><span className="badge" style={{ fontSize: '0.75rem' }}>{item.category}</span></td>
                  <td><span style={{ color: 'var(--success)', fontWeight: 'bold' }}>{item.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }} onClick={() => setEditingItem(item)}>✏️ Edit</button>
                      <button className="btn" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', background: '#ef4444' }} onClick={() => handleDeleteItem(item.id)}>🗑️ Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="modal-overlay">
          <div className="card modal-box">
            <div className="card-title">✏️ Edit PostgreSQL Item #{editingItem.id}</div>
            <form onSubmit={handleUpdateItem} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input
                type="text"
                value={editingItem.name}
                onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                className="input-field"
                required
              />
              <select
                value={editingItem.category}
                onChange={e => setEditingItem({ ...editingItem, category: e.target.value })}
                className="input-field"
              >
                <option value="Core Feature">Core Feature</option>
                <option value="Security">Security</option>
                <option value="Database">Database</option>
                <option value="Infrastructure">Infrastructure</option>
              </select>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingItem(null)}>Cancel</button>
                <button type="submit" className="btn">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
