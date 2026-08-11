import { useState, useEffect, useCallback } from 'react';
import { Site } from './types';
import { useAuth } from './auth/AuthContext';
import LoginPage from './auth/LoginPage';

const API_BASE = '/api';
const SAVE_PASSWORD = '2wsx@WSX123';

// ─── Password Prompt ──────────────────────────────────────────────────────────
function PasswordPrompt({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    if (value === SAVE_PASSWORD) {
      onConfirm();
    } else {
      setError('Incorrect password.');
      setValue('');
    }
  };

  return (
    <div className="modal-overlay password-prompt" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Confirm Save</h2>
          <button className="modal-close" onClick={onCancel} aria-label="Cancel">×</button>
        </div>
        <div className="modal-body">
          {error && <div className="login-alert" role="alert" style={{ marginBottom: 16 }}>{error}</div>}
          <div className="form-group">
            <label htmlFor="save-password">Enter password to save</label>
            <input
              id="save-password"
              type="password"
              value={value}
              onChange={e => { setValue(e.target.value); setError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onCancel(); }}
              placeholder="Enter password"
              autoFocus
            />
          </div>
        </div>
        <div className="modal-footer">
          <div style={{ flex: 1 }} />
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={submit}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
function App() {
  const { isAuthenticated, isLoading: authLoading, token, user, logout } = useAuth();

  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [servicesText, setServicesText] = useState('');
  const [isAddingNewSite, setIsAddingNewSite] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);

  const authFetch = useCallback(
    (input: RequestInfo, init?: RequestInit): Promise<Response> => {
      const headers = new Headers(init?.headers || {});
      if (token) headers.set('Authorization', `Bearer ${token}`);
      if (!headers.has('Content-Type') && init?.body && typeof init.body === 'string')
        headers.set('Content-Type', 'application/json');
      return fetch(input, { ...init, headers });
    },
    [token]
  );

  const handleLogout = useCallback(async () => { await logout(); }, [logout]);

  useEffect(() => {
    if (isAuthenticated) void fetchSites();
  }, [isAuthenticated]);

  useEffect(() => {
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        if (!isModalOpen && isAuthenticated) openAddModal();
      }
      if (e.key === 'Escape' && isModalOpen) closeModal();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, isAuthenticated]);

  const fetchSites = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await authFetch(`${API_BASE}/sites`);
      if (response.status === 401) { await handleLogout(); return; }
      if (!response.ok) {
        let errorMsg = `Server error (${response.status})`;
        try {
          const ct = response.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            const errorData = await response.json();
            errorMsg = errorData.error || errorData.message || errorMsg;
          }
        } catch { /* keep default */ }
        throw new Error(errorMsg);
      }
      const data = await response.json();
      const sitesList = Array.isArray(data) ? data : [];
      const formattedSites: Site[] = sitesList.map((site: any) => ({
        id: site.id,
        name: site.name,
        group: site.group,
        services: Array.isArray(site.services)
          ? site.services
          : (typeof site.services === 'string' ? JSON.parse(site.services) : []),
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
        other: site.other || '',
      }));
      setSites(formattedSites);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sites');
    } finally {
      setLoading(false);
    }
  }, [authFetch, handleLogout]);

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
      id: Date.now().toString(), name: '', group: '', services: [],
      vpn: '', pms: '', hsia: '', ip: '', iptvSystem: '', iptvUrl: '',
      castingUrl: '', headend: '', headendUrl: '', switches: '',
      wlanController: '', wlanControllerUrl: '', notes: '', other: '',
    };
    setSelectedSite(null); setIsAddingNewSite(true); setEditingSite(newSite);
    setServicesText(''); setIsModalOpen(true); document.body.style.overflow = 'hidden';
  }, []);

  const openEditModal = useCallback((site: Site) => {
    setSelectedSite(site); setIsAddingNewSite(false); setEditingSite({ ...site });
    setServicesText(site.services.join('\n')); setIsModalOpen(true);
    document.body.style.overflow = 'hidden';
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false); setSelectedSite(null); setEditingSite(null);
    setIsAddingNewSite(false); document.body.style.overflow = 'unset';
  }, []);

  const handleSaveAttempt = useCallback(() => {
    // Show password prompt before saving
    setShowSavePrompt(true);
  }, []);

  const doSave = useCallback(async () => {
    setShowSavePrompt(false);
    if (!editingSite) return;
    const siteToSave: Site = {
      ...editingSite,
      services: servicesText.split('\n').filter(s => s.trim() !== ''),
    };
    try {
      let response: Response;
      if (isAddingNewSite) {
        response = await authFetch(`${API_BASE}/sites`, {
          method: 'POST',
          body: JSON.stringify(siteToSave),
        });
      } else {
        response = await authFetch(`${API_BASE}/sites/${selectedSite?.id}`, {
          method: 'PUT',
          body: JSON.stringify(siteToSave),
        });
      }
      if (response.status === 401) { await handleLogout(); return; }
      if (!response.ok) {
        let errorMsg = `Server error (${response.status})`;
        try {
          const ct = response.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            const errorData = await response.json();
            errorMsg = errorData.error || errorData.message || errorMsg;
          }
        } catch { /* keep default message */ }
        throw new Error(errorMsg);
      }
      closeModal();
      await fetchSites();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save site');
    }
  }, [editingSite, servicesText, isAddingNewSite, selectedSite, closeModal, fetchSites, authFetch, handleLogout]);

  const handleInputChange = useCallback((field: keyof Site, value: string) => {
    if (!editingSite) return;
    if (field === 'ip') {
      let newIp = value.trim();
      if (newIp && newIp !== '-' && !newIp.includes('/ods/admin/')) {
        newIp = newIp.replace(/\/+$/, '') + '/ods/admin/';
      } else if (newIp === '') newIp = '-';
      setEditingSite({ ...editingSite, [field]: newIp });
    } else {
      setEditingSite({ ...editingSite, [field]: value });
    }
  }, [editingSite]);

  const isValidUrl = (url: string) =>
    url.startsWith('http://') || url.startsWith('https://');

  // ─── Render: loading / not authenticated ──────────────────────────────────
  if (authLoading) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-header">
            <img src="/logo.svg" alt="VOD GROUP" className="login-logo-img" />
            <p className="login-subtitle">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <LoginPage />;

  // ─── Render: main app ──────────────────────────────────────────────────────
  return (
    <div className="container">
      {/* Header */}
      <div className="header">
        <div className="header-content">
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

      {/* Search + Add */}
      <div className="search-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Search sites by name, group, services, or IP..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          aria-label="Search sites"
        />
        <button className="btn btn-primary" onClick={openAddModal}>
          Add New Site
        </button>
      </div>

      {/* Sites grid */}
      <div className="sites-wrapper">
        <div className="sites-grid">
          {loading ? (
            <div className="empty-state">
              <h3>Loading...</h3>
              <p>Please wait while we load the sites</p>
            </div>
          ) : error ? (
            <div className="empty-state">
              <h3>Could not load sites</h3>
              <p>{error}</p>
            </div>
          ) : filteredSites.length === 0 ? (
            <div className="empty-state">
              <h3>No sites found</h3>
              <p>Try a different search term or add a new site</p>
            </div>
          ) : (
            filteredSites.map(site => (
              <div
                key={site.id}
                className="site-card"
                onClick={() => openEditModal(site)}
                role="button"
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter') openEditModal(site); }}
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
                    <a href={site.iptvUrl} target="_blank" rel="noopener noreferrer"
                      className="site-link" onClick={e => e.stopPropagation()}>IPTV</a>
                  )}
                  {site.headendUrl && isValidUrl(site.headendUrl) && (
                    <a href={site.headendUrl} target="_blank" rel="noopener noreferrer"
                      className="site-link" onClick={e => e.stopPropagation()}>Headend</a>
                  )}
                  {site.wlanControllerUrl && isValidUrl(site.wlanControllerUrl) && (
                    <a href={site.wlanControllerUrl} target="_blank" rel="noopener noreferrer"
                      className="site-link" onClick={e => e.stopPropagation()}>WLAN</a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* FAB */}
      <button className="btn-add" onClick={openAddModal} aria-label="Add new site">+</button>

      {/* Site edit/add modal */}
      {isModalOpen && editingSite && (
        <div className="modal-overlay" onClick={closeModal} role="dialog" aria-modal="true">
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{isAddingNewSite ? 'Add New Site' : 'Edit Site'}</h2>
              <button className="modal-close" onClick={closeModal} aria-label="Close modal">×</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group full-width">
                  <label htmlFor="site-name">Site Name</label>
                  <input id="site-name" type="text" value={editingSite.name}
                    onChange={e => handleInputChange('name', e.target.value)}
                    onClick={e => e.stopPropagation()} placeholder="Enter site name" />
                </div>
                <div className="form-group">
                  <label htmlFor="site-group">Group</label>
                  <input id="site-group" type="text" value={editingSite.group}
                    onChange={e => handleInputChange('group', e.target.value)}
                    onClick={e => e.stopPropagation()} placeholder="Enter group" />
                </div>
                <div className="form-group">
                  <label htmlFor="site-ip">IP Address</label>
                  <input id="site-ip" type="text" value={editingSite.ip}
                    onChange={e => handleInputChange('ip', e.target.value)}
                    onClick={e => e.stopPropagation()} placeholder="Enter IP address" />
                </div>
                <div className="form-group full-width">
                  <label htmlFor="site-services">Services (one per line)</label>
                  <textarea id="site-services" value={servicesText}
                    onChange={e => setServicesText(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    onKeyDown={e => e.stopPropagation()}
                    placeholder="Enter services, one per line" style={{ zIndex: 100 }} />
                </div>
                <div className="form-group">
                  <label htmlFor="site-vpn">VPN</label>
                  <input id="site-vpn" type="text" value={editingSite.vpn}
                    onChange={e => handleInputChange('vpn', e.target.value)}
                    onClick={e => e.stopPropagation()} placeholder="VPN info" />
                </div>
                <div className="form-group">
                  <label htmlFor="site-pms">PMS</label>
                  <input id="site-pms" type="text" value={editingSite.pms}
                    onChange={e => handleInputChange('pms', e.target.value)}
                    onClick={e => e.stopPropagation()} placeholder="PMS info" />
                </div>
                <div className="form-group">
                  <label htmlFor="site-hsia">HSIA</label>
                  <input id="site-hsia" type="text" value={editingSite.hsia}
                    onChange={e => handleInputChange('hsia', e.target.value)}
                    onClick={e => e.stopPropagation()} placeholder="HSIA info" />
                </div>
                <div className="form-group">
                  <label htmlFor="site-iptv-system">IPTV System</label>
                  <input id="site-iptv-system" type="text" value={editingSite.iptvSystem}
                    onChange={e => handleInputChange('iptvSystem', e.target.value)}
                    onClick={e => e.stopPropagation()} placeholder="IPTV system" />
                </div>
                <div className="form-group">
                  <label htmlFor="site-iptv-url">IPTV URL</label>
                  <input id="site-iptv-url" type="text" value={editingSite.iptvUrl}
                    onChange={e => handleInputChange('iptvUrl', e.target.value)}
                    onClick={e => e.stopPropagation()} placeholder="https://..." />
                </div>
                <div className="form-group">
                  <label htmlFor="site-casting-url">Casting URL</label>
                  <input id="site-casting-url" type="text" value={editingSite.castingUrl}
                    onChange={e => handleInputChange('castingUrl', e.target.value)}
                    onClick={e => e.stopPropagation()} placeholder="Casting URL" />
                </div>
                <div className="form-group">
                  <label htmlFor="site-headend">Headend</label>
                  <input id="site-headend" type="text" value={editingSite.headend}
                    onChange={e => handleInputChange('headend', e.target.value)}
                    onClick={e => e.stopPropagation()} placeholder="Headend info" />
                </div>
                <div className="form-group">
                  <label htmlFor="site-headend-url">Headend URL</label>
                  <input id="site-headend-url" type="text" value={editingSite.headendUrl}
                    onChange={e => handleInputChange('headendUrl', e.target.value)}
                    onClick={e => e.stopPropagation()} placeholder="http://..." />
                </div>
                <div className="form-group full-width">
                  <label htmlFor="site-switches">Switches</label>
                  <textarea id="site-switches" value={editingSite.switches}
                    onChange={e => handleInputChange('switches', e.target.value)}
                    onClick={e => e.stopPropagation()} placeholder="Switches info" />
                </div>
                <div className="form-group">
                  <label htmlFor="site-wlan">WLAN Controller</label>
                  <input id="site-wlan" type="text" value={editingSite.wlanController}
                    onChange={e => handleInputChange('wlanController', e.target.value)}
                    onClick={e => e.stopPropagation()} placeholder="WLAN controller" />
                </div>
                <div className="form-group">
                  <label htmlFor="site-wlan-url">WLAN Controller URL</label>
                  <input id="site-wlan-url" type="text" value={editingSite.wlanControllerUrl}
                    onChange={e => handleInputChange('wlanControllerUrl', e.target.value)}
                    onClick={e => e.stopPropagation()} placeholder="https://..." />
                </div>
                <div className="form-group full-width">
                  <label htmlFor="site-notes">Notes</label>
                  <textarea id="site-notes" value={editingSite.notes}
                    onChange={e => handleInputChange('notes', e.target.value)}
                    onClick={e => e.stopPropagation()} placeholder="Additional notes" rows={4} />
                </div>
                <div className="form-group full-width">
                  <label htmlFor="site-other">Other</label>
                  <textarea id="site-other" value={editingSite.other}
                    onChange={e => handleInputChange('other', e.target.value)}
                    onClick={e => e.stopPropagation()} placeholder="Other info" rows={4} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <div style={{ flex: 1 }} />
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveAttempt}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Password confirmation prompt */}
      {showSavePrompt && (
        <PasswordPrompt
          onConfirm={doSave}
          onCancel={() => setShowSavePrompt(false)}
        />
      )}
    </div>
  );
}

export default App;
