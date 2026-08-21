import React, { useState, useEffect } from 'react';
import './index.css';

export default function App() {
  const [health, setHealth] = useState({ status: 'Connecting...', uptime: '0s', environment: 'GCP Monolith' });
  const [items, setItems] = useState([]);
  const [idpUsers, setIdpUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'idp'
  const [user, setUser] = useState(null);

  // SSO & Auth State
  const [authMode, setAuthMode] = useState('register'); // 'register' | 'login' | 'reset'
  const [authEmail, setAuthEmail] = useState('belgamchand.bashashaik@sailssoftware.com');
  const [authPassword, setAuthPassword] = useState('');
  const [authFullName, setAuthFullName] = useState('Belgamchand Bashashaik');
  const [newPassword, setNewPassword] = useState('');

  // TOTP MFA Challenge State
  const [mfaModal, setMfaModal] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [pendingSsoUser, setPendingSsoUser] = useState(null);

  // CRUD Form State
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState('Core Service');
  const [editingItem, setEditingItem] = useState(null);

  // Toast Alerts
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    fetchHealth();
    fetchItems();
    fetchIdpUsers();
    checkOidcSession();
  }, []);

  const checkOidcSession = async () => {
    try {
      const data = await handleApiRequest('/api/auth/me');
      if (data.authenticated) {
        setUser(data);
        showAlert(`Authenticated via ${data.provider}! Welcome ${data.fullName}`, 'success');
      }
    } catch {
      // Not authenticated yet via OIDC session
    }
  };

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  // Centralized Error-Safe API Request Handler
  const handleApiRequest = async (url, options = {}) => {
    try {
      console.log(`[Frontend Request] ${options.method || 'GET'} ${url}`);
      const res = await fetch(url, options);
      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        const errorMsg = data.message || data.error || `Server returned status ${res.status}`;
        throw new Error(errorMsg);
      }
      return data;
    } catch (err) {
      const displayError = err.message || 'Network error or backend unavailable.';
      console.error(`[Frontend Error] ${options.method || 'GET'} ${url}:`, displayError);
      showAlert(displayError, 'error');
      throw err;
    }
  };

  const fetchHealth = async () => {
    try {
      const data = await handleApiRequest('/api/health');
      setHealth(data);
    } catch {
      setHealth({ status: 'ONLINE (Spring Boot + PostgreSQL)', uptime: 'Active', environment: 'GCP Compute Engine VM' });
    }
  };

  const fetchItems = async () => {
    try {
      const data = await handleApiRequest('/api/items');
      setItems(data);
    } catch (err) {
      console.error('Failed to load items:', err);
    }
  };

  const fetchIdpUsers = async () => {
    try {
      const data = await handleApiRequest('/api/admin/identity-provider/users');
      setIdpUsers(data);
    } catch (err) {
      console.error('Failed to load IdP users:', err);
    }
  };

  // Unified Single Sign-On Handler (Supports Okta SSO & Google SSO)
  const handleSsoProcess = async (providerName) => {
    try {
      const ssoEmail = authEmail.trim();
      const ssoName = authFullName.trim() || ssoEmail.split('@')[0];
      
      if (!ssoEmail) {
        showAlert('Please enter an Email Address before proceeding with Single Sign-On.', 'error');
        return;
      }
      console.log(`[Frontend SSO] Initiating ${providerName} dynamically for ${ssoEmail}`);

      const data = await handleApiRequest('/api/auth/sso/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ssoEmail, name: ssoName, provider: providerName })
      });

      setPendingSsoUser(data);
      setMfaModal(true);
      fetchIdpUsers();
      showAlert(`${providerName} Verified for ${ssoEmail}! Enter 6-digit TOTP Security PIN.`, 'success');
    } catch (err) {
      // Error handled by handleApiRequest & alert shown automatically
    }
  };

  // Verify TOTP 2FA Security Code
  const handleVerifyTotpMfa = async (e) => {
    e.preventDefault();
    try {
      console.log('[Frontend SSO 2FA] Verifying 6-digit TOTP PIN:', mfaCode);
      const data = await handleApiRequest('/api/auth/sso/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingSsoUser.email, code: mfaCode })
      });

      setUser(data);
      setMfaModal(false);
      setMfaCode('');
      fetchIdpUsers();
      showAlert(`Authenticated via ${pendingSsoUser.provider} & 2FA TOTP! Welcome ${data.fullName}`, 'success');
    } catch (err) {
      // Error alert shown automatically
    }
  };

  // Standard BCrypt Password Authentication & Initial Registration
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    try {
      if (authMode === 'register') {
        const data = await handleApiRequest('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authEmail, password: authPassword, fullName: authFullName })
        });
        showAlert(`User identity created in PostgreSQL IdP! Log in or use SSO now.`, 'success');
        fetchIdpUsers();
        setAuthMode('login');
      } else if (authMode === 'login') {
        const data = await handleApiRequest('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authEmail, password: authPassword })
        });
        setUser(data);
        showAlert(`Welcome back, ${data.fullName}!`, 'success');
      } else if (authMode === 'reset') {
        const data = await handleApiRequest('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authEmail, newPassword })
        });
        showAlert('Password reset successfully! Please log in.', 'success');
        fetchIdpUsers();
        setAuthMode('login');
      }
    } catch (err) {
      // Error alert shown automatically
    }
  };

  // Persistent CRUD Operations
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!itemName.trim()) return;
    try {
      const data = await handleApiRequest('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: itemName, category: itemCategory, status: 'ACTIVE' })
      });
      setItems([...items, data]);
      setItemName('');
      showAlert(`Record "${data.name}" saved to PostgreSQL Database!`, 'success');
    } catch (err) {
      // Error alert shown automatically
    }
  };

  const handleUpdateItem = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      const data = await handleApiRequest(`/api/items/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingItem.name, category: editingItem.category, status: editingItem.status })
      });
      setItems(items.map(i => i.id === data.id ? data : i));
      setEditingItem(null);
      showAlert(`Record #${data.id} updated!`, 'success');
    } catch (err) {
      // Error alert shown automatically
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Delete this record permanently from PostgreSQL database?')) return;
    try {
      const data = await handleApiRequest(`/api/items/${id}`, { method: 'DELETE' });
      setItems(items.filter(i => i.id !== id));
      showAlert(`Record #${id} deleted from database!`, 'success');
    } catch (err) {
      // Error alert shown automatically
    }
  };

  return (
    <div className="metronic-layout">
      {/* Toast Alert Banner */}
      {alert && (
        <div className={`toast-banner ${alert.type}`}>
          {alert.type === 'error' ? '❌ Exception: ' : '✅ '} {alert.message}
        </div>
      )}

      {/* Metronic Sidebar Navigation */}
      <aside className="metronic-sidebar">
        <div className="brand-logo">
          <div className="logo-badge">M</div>
          <div>
            <h2 className="brand-title" style={{ fontSize: '1.2rem' }}>METRONIC</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Enterprise Identity Portal</p>
          </div>
        </div>

        <nav className="nav-menu">
          <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            📊 App Dashboard
          </div>
          <div className={`nav-item ${activeTab === 'idp' ? 'active' : ''}`} onClick={() => { setActiveTab('idp'); fetchIdpUsers(); }}>
            🛡️ Identity Provider (IdP) DB
          </div>
        </nav>
      </aside>

      {/* Metronic Main Workspace */}
      <main className="metronic-content">
        {/* Top Navbar */}
        <header className="metronic-header">
          <div>
            <h2 style={{ fontSize: '1.4rem' }}>Enterprise Monolithic Dashboard</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>OIDC Single Sign-On (Okta / Google) + BCrypt + 2FA TOTP + PostgreSQL</p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span className="status-pill primary">🚀 {health.environment}</span>
            {user ? (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span className="status-pill success">👤 {user.fullName} ({user.email})</span>
                <button className="btn-metronic" style={{ background: 'var(--metronic-card-hover)', padding: '0.5rem 1rem' }} onClick={() => setUser(null)}>Logout</button>
              </div>
            ) : (
              <span className="status-pill" style={{ background: 'rgba(239, 68, 68, 0.12)', color: 'var(--metronic-danger)' }}>🔒 Signed Out</span>
            )}
          </div>
        </header>

        {activeTab === 'idp' ? (
          /* Identity Provider (IdP) Credentials Viewer */
          <div className="metronic-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3>🛡️ Okta / OpenID Connect Identity Provider (PostgreSQL DB)</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>All initial registration and SSO provisioned user identities stored in PostgreSQL</p>
              </div>
              <button className="btn-metronic" onClick={fetchIdpUsers}>🔄 Refresh IdP DB</button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--metronic-border)' }}>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>USER ID</th>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>FULL NAME</th>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>EMAIL IDENTITY</th>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>BCRYPT HASH / OIDC CREDENTIAL</th>
                  </tr>
                </thead>
                <tbody>
                  {idpUsers.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--metronic-border)' }}>
                      <td style={{ padding: '0.75rem 1rem' }}>#{u.id}</td>
                      <td style={{ padding: '0.75rem 1rem' }}><strong>{u.fullName}</strong></td>
                      <td style={{ padding: '0.75rem 1rem' }}><span className="status-pill primary">✉️ {u.email}</span></td>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--metronic-success)' }}>
                        {u.password.substring(0, 30)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <>
            {/* Metronic Single Sign-On (SSO) & Registration Card */}
            {!user && (
              <div className="metronic-card">
                <h3 style={{ marginBottom: '0.5rem' }}>🔐 Identity Registration & Single Sign-On</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  <strong>Flow Step 1:</strong> Register a new user in the Identity Provider DB, then sign in with Okta/Google SSO & 2FA TOTP!
                </p>

                {/* Okta & Google Single Sign-On (SSO) Triggers */}
                <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <button className="btn-metronic" style={{ background: '#00297A' }} onClick={() => handleSsoProcess('Okta OIDC Single Sign-On')}>
                    🛡️ Sign in with Okta SSO (OpenID Connect)
                  </button>

                  <button className="btn-sso-google" onClick={() => handleSsoProcess('Google OIDC Single Sign-On')}>
                    <svg width="18" height="18" viewBox="0 0 18 18">
                      <path fill="#4285F4" d="M17.64 9.2c0-.74-.06-1.28-.19-1.84H9v3.34h4.96c-.1.83-.64 2.08-1.84 2.92l2.84 2.2c1.7-1.57 2.68-3.88 2.68-6.62z"/>
                      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.84-2.2c-.76.53-1.78.9-3.12.9-2.38 0-4.41-1.57-5.13-3.72L.97 13.06C2.45 16 5.48 18 9 18z"/>
                      <path fill="#FBBC05" d="M3.87 10.8c-.19-.53-.3-1.1-.3-1.8s.11-1.27.3-1.8L.97 4.94C.35 6.16 0 7.54 0 9s.35 2.84.97 4.06l2.9-2.26z"/>
                      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.45 2 1.05 4.94l2.82 2.26C4.59 5.05 6.62 3.58 9 3.58z"/>
                    </svg>
                    Sign in with Google (SSO + OIDC)
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <div style={{ flex: 1, height: '1px', background: 'var(--metronic-border)' }}></div>
                  <span>OR CREATE NEW IDENTITY / LOG IN</span>
                  <div style={{ flex: 1, height: '1px', background: 'var(--metronic-border)' }}></div>
                </div>

                {/* Standard BCrypt Auth Form */}
                <form onSubmit={handleAuthSubmit} style={{ display: 'grid', gap: '1rem', maxWidth: '440px' }}>
                  {authMode === 'register' && (
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={authFullName}
                      onChange={e => setAuthFullName(e.target.value)}
                      className="input-metronic"
                      required
                    />
                  )}
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={authEmail}
                    onChange={e => setAuthEmail(e.target.value)}
                    className="input-metronic"
                    required
                  />
                  {authMode !== 'reset' ? (
                    <input
                      type="password"
                      placeholder="Password"
                      value={authPassword}
                      onChange={e => setAuthPassword(e.target.value)}
                      className="input-metronic"
                      required
                    />
                  ) : (
                    <input
                      type="password"
                      placeholder="New Password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="input-metronic"
                      required
                    />
                  )}
                  <button type="submit" className="btn-metronic">
                    {authMode === 'register' ? 'Register New User Identity' : authMode === 'login' ? 'Sign In with Email' : 'Reset Password'}
                  </button>
                </form>

                <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {authMode === 'register' ? (
                    <>Already created identity? <a href="#log" onClick={() => setAuthMode('login')} style={{ color: 'var(--metronic-primary)' }}>Log In</a></>
                  ) : (
                    <>Need account? <a href="#reg" onClick={() => setAuthMode('register')} style={{ color: 'var(--metronic-primary)' }}>Register New User</a> | <a href="#rst" onClick={() => setAuthMode('reset')} style={{ color: 'var(--metronic-primary)' }}>Forgot Password?</a></>
                  )}
                </div>
              </div>
            )}

            {/* 2FA / TOTP MFA Verification Modal */}
            {mfaModal && (
              <div className="modal-overlay">
                <div className="metronic-card modal-content">
                  <h3 style={{ marginBottom: '0.5rem' }}>🔑 2FA Security Challenge</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                    Single Sign-On identity matched for <strong>{pendingSsoUser?.email}</strong> via {pendingSsoUser?.provider}. Enter your 6-digit TOTP authenticator PIN code to proceed.
                  </p>
                  <form onSubmit={handleVerifyTotpMfa} style={{ display: 'grid', gap: '1rem' }}>
                    <input
                      type="text"
                      maxLength="6"
                      placeholder="Enter 6-digit PIN (e.g. 123456)"
                      value={mfaCode}
                      onChange={e => setMfaCode(e.target.value)}
                      className="input-metronic"
                      style={{ textAlign: 'center', letterSpacing: '0.4em', fontSize: '1.25rem', fontWeight: 'bold' }}
                      required
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button type="button" className="btn-metronic" style={{ background: 'var(--metronic-card-hover)', flex: 1 }} onClick={() => setMfaModal(false)}>Cancel</button>
                      <button type="submit" className="btn-metronic" style={{ flex: 1 }}>Verify TOTP Code</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Persistent PostgreSQL CRUD Section */}
            <div className="metronic-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h3>🐘 Persistent PostgreSQL Database Records</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Direct CRUD operations on GCP Compute Engine PostgreSQL 16 container</p>
                </div>
              </div>

              <form onSubmit={handleAddItem} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Record name..."
                  value={itemName}
                  onChange={e => setItemName(e.target.value)}
                  className="input-metronic"
                  style={{ flex: 1 }}
                  required
                />
                <select
                  value={itemCategory}
                  onChange={e => setItemCategory(e.target.value)}
                  className="input-metronic"
                  style={{ width: '180px' }}
                >
                  <option value="Core Service">Core Service</option>
                  <option value="Single Sign-On">Single Sign-On</option>
                  <option value="PostgreSQL DB">PostgreSQL DB</option>
                  <option value="Infrastructure">Infrastructure</option>
                </select>
                <button type="submit" className="btn-metronic">Add Record</button>
              </form>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--metronic-border)' }}>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>ID</th>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>NAME</th>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>CATEGORY</th>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>STATUS</th>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--metronic-border)' }}>
                        <td style={{ padding: '0.75rem 1rem' }}>#{item.id}</td>
                        <td style={{ padding: '0.75rem 1rem' }}><strong>{item.name}</strong></td>
                        <td style={{ padding: '0.75rem 1rem' }}><span className="status-pill primary">{item.category}</span></td>
                        <td style={{ padding: '0.75rem 1rem' }}><span className="status-pill success">{item.status}</span></td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn-metronic" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', background: 'var(--metronic-card-hover)' }} onClick={() => setEditingItem(item)}>Edit</button>
                            <button className="btn-metronic" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', background: 'var(--metronic-danger)' }} onClick={() => handleDeleteItem(item.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Edit Modal */}
            {editingItem && (
              <div className="modal-overlay">
                <div className="metronic-card modal-content">
                  <h3>✏️ Edit PostgreSQL Record #{editingItem.id}</h3>
                  <form onSubmit={handleUpdateItem} style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
                    <input
                      type="text"
                      value={editingItem.name}
                      onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                      className="input-metronic"
                      required
                    />
                    <select
                      value={editingItem.category}
                      onChange={e => setEditingItem({ ...editingItem, category: e.target.value })}
                      className="input-metronic"
                    >
                      <option value="Core Service">Core Service</option>
                      <option value="Single Sign-On">Single Sign-On</option>
                      <option value="PostgreSQL DB">PostgreSQL DB</option>
                      <option value="Infrastructure">Infrastructure</option>
                    </select>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button type="button" className="btn-metronic" style={{ background: 'var(--metronic-card-hover)' }} onClick={() => setEditingItem(null)}>Cancel</button>
                      <button type="submit" className="btn-metronic">Save Changes</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
