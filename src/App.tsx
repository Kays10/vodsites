import { useState, useEffect, useCallback } from 'react';
import { Site, ManagedUser } from './types';
import { initialSites } from './data';
import { useAuth } from './auth/AuthContext';
import LoginPage from './auth/LoginPage';

const ADMIN_PASSWORD = '2wsx@WSX123';
const API_BASE = '/api';

type ViewMode = 'sites' | 'users';

function App() {
  const { isAuthenticated, isLoading: authLoading, token, user, logout } = useAuth();

  const [sites, setSites] = useState<Site[]>(initialSites);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [servicesText, setServicesText] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [pendingSaveSite, setPendingSaveSite] = useState<Site | null>(null);
  const [isAddingNewSite, setIsAddingNewSite] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('sites');

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserError, setNewUserError] = useState<string | null>(null);
  const [newUserSubmitting, setNewUserSubmitting] = useState(false);

  const authFetch = useCallback(
    (input: RequestInfo, init?: RequestInit): Promise<Response> => {
      const headers = new Headers(init?.headers || {});
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      if (!headers.has('Content-Type') && init?.body && typeof init.body === 'string') {
        headers.set('Content-Type', 'application/json');
      }
      return fetch(input, { ...init, headers });
    },
    [token]
  );

  const handleLogout = useCallback(async () => {
    await logout();
  }, [logout]);

  useEffect(() => {
    if (isAuthenticated) {
      void fetchSites();
    }
  }, [isAuthenticated]);

  const fetchSites = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const response = await authFetch(`${API_BASE}/sites`);
      if (response.status === 401) {
        await handleLogout();
        return;
      }
      if (!response.ok) {
        throw new Error('Failed to fetch sites');
      }
      const data = await response.json();

      if (data && data.length > 0) {
        const formattedSites: Site[] = data.map((site: any) => ({
          id: site.id,
          name: site.name,
          group: site.group,
          services: Array.isArray(site.services) ? site.services : (typeof site.services === 'string' ? JSON.parse(site.services) : []),
          vpn: site.vpn || '',
          pms: site.pms || '',
          hsia: site.hsia || '',
          ip: site.ip || '',
          iptvSystem: site.iptv_system || '',
          iptvUrl: site.iptv_url || '',
          castingUrl: site.casting_url || '',
          headend: site.headend || '',
          headendUrl: site.headend_url || '',
          switches: site.switches || '',
          wlanController: site.wlan_controller || '',
          wlanControllerUrl: site.wlan_controller_url || '',
          notes: site.notes || '',
          other: site.other || ''
        }));
        setSites(formattedSites);
      }
    } catch (error) {
      console.error('Error fetching sites from DB, keeping local data:', error);
    } finally {
      setLoading(false);
    }
  }, [authFetch, handleLogout]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        if (!isModalOpen && isAuthenticated) {
          openAddModal();
        }
      }
      if (e.key === 'Escape' && isModalOpen) {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, isAuthenticated]);

  const filteredSites = sites.filter(site => {
    const query = searchQuery.toLowerCase();
    return (
      site.name.toLowerCase().includes(query) ||
      site.group.toLowerCase().includes(query) ||
      site.services.some(s => s.toLowerCase().includes(query)) ||
      site.ip.includes(query)
    );
  });

  const openAddModal = useCallback(() => {
    const newSite: Site = {
      id: Date.now().toString(),
      name: '',
      group: '',
      services: [],
      vpn: '',
      pms: '',
      hsia: '',
      ip: '',
      iptvSystem: '',
      iptvUrl: '',
      castingUrl: '',
      headend: '',
      headendUrl: '',
      switches: '',
      wlanController: '',
      wlanControllerUrl: '',
      notes: '',
      other: '',
    };
    setSelectedSite(null);
    setIsAddingNewSite(true);
    setEditingSite(newSite);
    setServicesText('');
    setIsModalOpen(true);
    document.body.style.overflow = 'hidden';
  }, []);

  const openEditModal = useCallback((site: Site) => {
    setSelectedSite(site);
    setIsAddingNewSite(false);
    setEditingSite({ ...site });
    setServicesText(site.services.join('\n'));
    setIsModalOpen(true);
    document.body.style.overflow = 'hidden';
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedSite(null);
    setEditingSite(null);
    setIsAddingNewSite(false);
    setPendingSaveSite(null);
    document.body.style.overflow = 'unset';
  }, []);

  const handleSaveAttempt = useCallback(() => {
    if (!editingSite) return;
    const siteToSave: Site = {
      ...editingSite,
      services: servicesText.split('\n').filter(s => s.trim() !== '')
    };
    setPendingSaveSite(siteToSave);
    setShowPasswordPrompt(true);
  }, [editingSite, servicesText]);

  const handlePasswordSubmit = useCallback(async () => {
    if (passwordInput === ADMIN_PASSWORD) {
      setPasswordInput('');
      setShowPasswordPrompt(false);
      if (pendingSaveSite) {
        try {
          let response: Response;
          if (isAddingNewSite) {
            response = await authFetch(`${API_BASE}/sites`, {
              method: 'POST',
              body: JSON.stringify(pendingSaveSite)
            });
          } else {
            response = await authFetch(`${API_BASE}/sites/${selectedSite?.id}`, {
              method: 'PUT',
              body: JSON.stringify(pendingSaveSite)
            });
          }
          if (response.status === 401) {
            await handleLogout();
            return;
          }
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || 'Failed to save site');
          }
          closeModal();
          await fetchSites();
        } catch (error) {
          console.error('Error saving site:', error);
          alert(error instanceof Error ? error.message : 'Failed to save site');
        }
      }
    } else {
      alert('Incorrect password!');
    }
  }, [passwordInput, pendingSaveSite, isAddingNewSite, selectedSite, closeModal, fetchSites, authFetch, handleLogout]);

  const cancelPasswordPrompt = useCallback(() => {
    setPasswordInput('');
    setShowPasswordPrompt(false);
    setPendingSaveSite(null);
  }, []);

  const handleInputChange = useCallback((field: keyof Site, value: string) => {
    if (!editingSite) return;
    if (field === 'ip') {
      let newIp = value.trim();
      if (newIp && newIp !== '-' && !newIp.includes('/ods/admin/')) {
        newIp = newIp.replace(/\/+$/, '') + '/ods/admin/';
      } else if (newIp === '') {
        newIp = '-';
      }
      setEditingSite({ ...editingSite, [field]: newIp });
    } else {
      setEditingSite({ ...editingSite, [field]: value });
    }
  }, [editingSite]);

  const isValidUrl = (url: string) => {
    return url.startsWith('http://') || url.startsWith('https://');
  };

  const fetchUsers = useCallback(async () => {
    setUsersError(null);
    setUsersLoading(true);
    try {
      const response = await authFetch(`${API_BASE}/users`);
      if (response.status === 401) {
        await handleLogout();
        return;
      }
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json() as ManagedUser[];
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setUsersError('Failed to load users.');
    } finally {
      setUsersLoading(false);
    }
  }, [authFetch, handleLogout]);

  useEffect(() => {
    if (viewMode === 'users' && isAuthenticated) {
      void fetchUsers();
    }
  }, [viewMode, isAuthenticated, fetchUsers]);

  const handleAddUserSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setNewUserError(null);
    if (!newUserEmail || !newUserPassword) {
      setNewUserError('Email and password are required.');
      return;
    }
    setNewUserSubmitting(true);
    try {
      const response = await authFetch(`${API_BASE}/users`, {
        method: 'POST',
        body: JSON.stringify({
          email: newUserEmail,
          password: newUserPassword,
          fullName: newUserFullName || null,
        }),
      });
      if (response.status === 401) {
        await handleLogout();
        return;
      }
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create user');
      }
      setNewUserEmail('');
      setNewUserFullName('');
      setNewUserPassword('');
      setShowAddUserModal(false);
      await fetchUsers();
    } catch (err) {
      setNewUserError(err instanceof Error ? err.message : 'Failed to create user.');
    } finally {
      setNewUserSubmitting(false);
    }
  }, [authFetch, handleLogout, newUserEmail, newUserPassword, newUserFullName, fetchUsers]);

  const handleDeleteUser = useCallback(async (u: ManagedUser) => {
    if (u.id === user?.id) {
      alert('You cannot delete your own account.');
      return;
    }
    const confirmed = window.confirm(`Delete user ${u.email}?`);
    if (!confirmed) return;
    try {
      const response = await authFetch(`${API_BASE}/users/${encodeURIComponent(u.id)}`, {
        method: 'DELETE',
      });
      if (response.status === 401) {
        await handleLogout();
        return;
      }
      if (!response.ok && response.status !== 204) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete user');
      }
      await fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete user.');
    }
  }, [authFetch, fetchUsers, handleLogout, user?.id]);

  if (authLoading) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-header">
            <img src="/logo.svg" alt="VOD GROUP" className="login-logo-img" />
            <h1>VOD GROUP</h1>
            <p className="login-subtitle">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="container">
      <div className="header">
        <div className="header-content">
          <div className="header-spacer" aria-hidden="true"></div>
          <img src="/logo.svg" alt="VOD GROUP" className="header-logo" />
          <div className="header-user">
            <span className="user-email" title={user?.email ?? ''}>
              {user?.fullName || user?.email || 'User'}
            </span>
            <button className="btn btn-secondary btn-logout" onClick={handleLogout} aria-label="Sign out">
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="tabs-bar" role="tablist" aria-label="Main sections">
        <button
          role="tab"
          aria-selected={viewMode === 'sites'}
          className={`tab-btn ${viewMode === 'sites' ? 'tab-btn-active' : ''}`}
          onClick={() => setViewMode('sites')}
        >
          Sites
        </button>
        <button
          role="tab"
          aria-selected={viewMode === 'users'}
          className={`tab-btn ${viewMode === 'users' ? 'tab-btn-active' : ''}`}
          onClick={() => setViewMode('users')}
        >
          Users
        </button>
      </div>

      {viewMode === 'sites' && (
        <>
          <div className="search-bar">
            <input
              type="text"
              className="search-input"
              placeholder="Search sites by name, group, services, or IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search sites"
            />
            <button
              className="btn btn-primary"
              onClick={openAddModal}
            >
              Add New Site
            </button>
          </div>

          <div className="sites-wrapper">
            <div className="sites-grid">
            {loading ? (
              <div className="empty-state">
                <h3>Loading...</h3>
                <p>Please wait while we load the sites</p>
              </div>
            ) : error ? (
              <div className="empty-state">
                <h3>Error</h3>
                <p>{error}</p>
                <button
                  className="btn btn-primary"
                  onClick={fetchSites}
                  style={{ marginTop: '1rem' }}
                >
                  Retry
                </button>
              </div>
            ) : filteredSites.length === 0 ? (
              <div className="empty-state">
                <h3>No sites found</h3>
                <p>Try a different search term or add a new site</p>
              </div>
            ) : (
              filteredSites.map((site) => (
                <div
                  key={site.id}
                  className="site-card"
                  onClick={() => {
                    setSelectedSite(site);
                    openEditModal(site);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setSelectedSite(site);
                      openEditModal(site);
                    }
                  }}
                >
                  <h3 className="site-name">{site.name || 'Unnamed Site'}</h3>
                  {site.group && <span className="site-group">{site.group}</span>}
                  <div className="site-services">
                    {site.services.slice(0, 5).map((service, i) => (
                      <span key={i} className="service-tag">{service}</span>
                    ))}
                    {site.services.length > 5 && (
                      <span className="service-tag">+{site.services.length - 5} more</span>
                    )}
                  </div>
                  {site.ip && <div className="site-ip">{site.ip}</div>}
                  <div className="site-links">
                    {site.iptvUrl && isValidUrl(site.iptvUrl) && (
                      <a href={site.iptvUrl} target="_blank" rel="noopener noreferrer" className="site-link" onClick={(e) => e.stopPropagation()}>
                        IPTV
                      </a>
                    )}
                    {site.headendUrl && isValidUrl(site.headendUrl) && (
                      <a href={site.headendUrl} target="_blank" rel="noopener noreferrer" className="site-link" onClick={(e) => e.stopPropagation()}>
                        Headend
                      </a>
                    )}
                    {site.wlanControllerUrl && isValidUrl(site.wlanControllerUrl) && (
                      <a href={site.wlanControllerUrl} target="_blank" rel="noopener noreferrer" className="site-link" onClick={(e) => e.stopPropagation()}>
                        WLAN
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
            </div>
          </div>

          <button
            className="btn-add"
            onClick={openAddModal}
            aria-label="Add new site"
          >
            +
          </button>
        </>
      )}

      {viewMode === 'users' && (
        <>
          <div className="search-bar">
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', fontSize: '0.95rem', color: '#4b5563', fontWeight: 600 }}>
              Manage authorized users — add or remove login access.
            </div>
            <button
              className="btn btn-primary"
              onClick={() => {
                setNewUserEmail('');
                setNewUserFullName('');
                setNewUserPassword('');
                setNewUserError(null);
                setShowAddUserModal(true);
              }}
            >
              Add New User
            </button>
          </div>

          <div className="sites-wrapper">
            {usersLoading ? (
              <div className="empty-state">
                <h3>Loading users...</h3>
              </div>
            ) : usersError ? (
              <div className="empty-state">
                <h3>Error</h3>
                <p>{usersError}</p>
                <button
                  className="btn btn-primary"
                  onClick={fetchUsers}
                  style={{ marginTop: '1rem' }}
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="users-table-wrapper">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="users-empty-row">No users yet. Click &quot;Add New User&quot;.</td>
                      </tr>
                    ) : (
                      users.map((u) => (
                        <tr key={u.id}>
                          <td className="users-name-cell">
                            <div className="users-avatar">
                              {(u.fullName || u.email).slice(0, 2).toUpperCase()}
                            </div>
                            <span>{u.fullName || '—'}</span>
                          </td>
                          <td>{u.email}</td>
                          <td>
                            <span className={`status-pill ${u.isActive ? 'status-active' : 'status-inactive'}`}>
                              {u.isActive ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td className="users-muted">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                          </td>
                          <td className="users-actions-cell">
                            <button
                              className="btn btn-danger"
                              onClick={() => void handleDeleteUser(u)}
                              disabled={u.id === user?.id}
                              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {showPasswordPrompt && (
        <div className="modal-overlay password-prompt" onClick={cancelPasswordPrompt} role="dialog" aria-modal="true">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Enter Admin Password</h2>
              <button className="modal-close" onClick={cancelPasswordPrompt} aria-label="Close modal">
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="admin-password">Password</label>
                <input
                    id="admin-password"
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') {
                        handlePasswordSubmit();
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Enter password"
                    autoFocus
                  />
              </div>
            </div>
            <div className="modal-footer">
              <div style={{ flex: 1 }}></div>
              <button className="btn btn-secondary" onClick={cancelPasswordPrompt}>Cancel</button>
              <button className="btn btn-primary" onClick={handlePasswordSubmit}>Submit</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && editingSite && (
        <div className="modal-overlay" onClick={closeModal} role="dialog" aria-modal="true">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedSite ? 'Edit Site' : 'Add New Site'}</h2>
              <button className="modal-close" onClick={closeModal} aria-label="Close modal">
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group full-width">
                  <label htmlFor="site-name">Site Name</label>
                  <input
                    id="site-name"
                    type="text"
                    value={editingSite.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Enter site name"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="site-group">Group</label>
                  <input
                    id="site-group"
                    type="text"
                    value={editingSite.group}
                    onChange={(e) => handleInputChange('group', e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Enter group"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="site-ip">IP Address</label>
                  <input
                    id="site-ip"
                    type="text"
                    value={editingSite.ip}
                    onChange={(e) => handleInputChange('ip', e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Enter IP address"
                  />
                </div>
                <div className="form-group full-width">
                  <label htmlFor="site-services">Services (one per line)</label>
                  <textarea
                    id="site-services"
                    value={servicesText}
                    onChange={(e) => setServicesText(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder="Enter services, one per line"
                    style={{ zIndex: 100 }}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="site-vpn">VPN</label>
                  <input
                    id="site-vpn"
                    type="text"
                    value={editingSite.vpn}
                    onChange={(e) => handleInputChange('vpn', e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="VPN info"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="site-pms">PMS</label>
                  <input
                    id="site-pms"
                    type="text"
                    value={editingSite.pms}
                    onChange={(e) => handleInputChange('pms', e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="PMS info"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="site-hsia">HSIA</label>
                  <input
                    id="site-hsia"
                    type="text"
                    value={editingSite.hsia}
                    onChange={(e) => handleInputChange('hsia', e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="HSIA info"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="site-iptv-system">IPTV System</label>
                  <input
                    id="site-iptv-system"
                    type="text"
                    value={editingSite.iptvSystem}
                    onChange={(e) => handleInputChange('iptvSystem', e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="IPTV system"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="site-iptv-url">IPTV URL</label>
                  <input
                    id="site-iptv-url"
                    type="text"
                    value={editingSite.iptvUrl}
                    onChange={(e) => handleInputChange('iptvUrl', e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="https://..."
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="site-casting-url">Casting URL</label>
                  <input
                    id="site-casting-url"
                    type="text"
                    value={editingSite.castingUrl}
                    onChange={(e) => handleInputChange('castingUrl', e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Casting URL"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="site-headend">Headend</label>
                  <input
                    id="site-headend"
                    type="text"
                    value={editingSite.headend}
                    onChange={(e) => handleInputChange('headend', e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Headend info"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="site-headend-url">Headend URL</label>
                  <input
                    id="site-headend-url"
                    type="text"
                    value={editingSite.headendUrl}
                    onChange={(e) => handleInputChange('headendUrl', e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="http://..."
                  />
                </div>
                <div className="form-group full-width">
                  <label htmlFor="site-switches">Switches</label>
                  <textarea
                    id="site-switches"
                    value={editingSite.switches}
                    onChange={(e) => handleInputChange('switches', e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Switches info"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="site-wlan">WLAN Controller</label>
                  <input
                    id="site-wlan"
                    type="text"
                    value={editingSite.wlanController}
                    onChange={(e) => handleInputChange('wlanController', e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="WLAN controller"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="site-wlan-url">WLAN Controller URL</label>
                  <input
                    id="site-wlan-url"
                    type="text"
                    value={editingSite.wlanControllerUrl}
                    onChange={(e) => handleInputChange('wlanControllerUrl', e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="https://..."
                  />
                </div>
                <div className="form-group full-width">
                  <label htmlFor="site-notes">Notes</label>
                  <textarea
                    id="site-notes"
                    value={editingSite.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Additional notes"
                    rows={4}
                  />
                </div>
                <div className="form-group full-width">
                  <label htmlFor="site-other">Other</label>
                  <textarea
                    id="site-other"
                    value={editingSite.other}
                    onChange={(e) => handleInputChange('other', e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Other info"
                    rows={4}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <div style={{ flex: 1 }}></div>
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveAttempt}>Save</button>
            </div>
          </div>
        </div>
      )}

      {showAddUserModal && (
        <div className="modal-overlay" onClick={() => setShowAddUserModal(false)} role="dialog" aria-modal="true">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
            <h2>Add New User</h2>
            <button className="modal-close" onClick={() => setShowAddUserModal(false)} aria-label="Close modal">
              ×
            </button>
            </div>
            <form onSubmit={(e) => void handleAddUserSubmit(e)} className="modal-body" noValidate>
              {newUserError && (
                <div className="login-alert" role="alert" style={{ marginBottom: '20px' }}>
                  {newUserError}
                </div>
              )}
              <div className="form-group">
                <label htmlFor="new-user-email">Email</label>
                <input
                  id="new-user-email"
                  type="email"
                  autoComplete="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  placeholder="user@example.com"
                  autoFocus
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="new-user-name">Full Name (optional)</label>
                <input
                  id="new-user-name"
                  type="text"
                  autoComplete="name"
                  value={newUserFullName}
                  onChange={(e) => setNewUserFullName(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  placeholder="e.g. John Smith"
                />
              </div>
              <div className="form-group">
                <label htmlFor="new-user-password">Password (min 6 characters)</label>
                <input
                  id="new-user-password"
                  type="password"
                  autoComplete="new-password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') handleAddUserSubmit(e);
                  }}
                  placeholder="Enter a temporary password"
                  minLength={6}
                  required
                />
              </div>
              <div className="modal-footer">
                <div style={{ flex: 1 }}></div>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddUserModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={newUserSubmitting}>
                  {newUserSubmitting ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
