import { useState, useEffect, useCallback } from 'react';
import { Site } from './types';
import { initialSites } from './data';

const ADMIN_PASSWORD = '2wsx@WSX123';
const API_BASE = '/api';

function App() {

  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [servicesText, setServicesText] = useState(''); // Separate state for services textarea
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [pendingSaveSite, setPendingSaveSite] = useState<Site | null>(null);
  const [isAddingNewSite, setIsAddingNewSite] = useState(false);

  // Fetch sites from API on initial load
  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/sites`);
      if (!response.ok) {
        throw new Error('Failed to fetch sites');
      }
      const data = await response.json();
      // Convert database snake_case to camelCase and parse services JSON
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
      
      if (formattedSites.length === 0) {
        // If no sites in DB, use initialSites and optionally add them to DB
        setSites(initialSites);
        // Try to add initial sites to DB in background
        try {
          await Promise.all(initialSites.map(async (site) => {
            await fetch(`${API_BASE}/sites`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(site)
            }).catch(() => {}); // Ignore errors if sites already exist
          }));
        } catch (e) {
          console.log('Could not auto-import sites to DB', e);
        }
      } else {
        setSites(formattedSites);
      }
    } catch (error) {
      console.error('Error fetching sites, falling back to initial data:', error);
      // Fallback to initialSites if API fails
      setSites(initialSites);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cleanup overflow on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in an input/textarea
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        return;
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        if (!isModalOpen) {
          openAddModal();
        }
      }
      if (e.key === 'Escape' && isModalOpen) {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const filteredSites = sites.filter(site => {
    const query = searchQuery.toLowerCase();
    return (
      site.name.toLowerCase().includes(query) ||
      site.group.toLowerCase().includes(query) ||
      site.services.some(s => s.toLowerCase().includes(query)) ||
      site.ip.includes(query)
    );
  });

  // Debug: log all site cards after render
  useEffect(() => {
    const cards = document.querySelectorAll('.site-card');
    console.log('Total site cards found:', cards.length);
    cards.forEach((card, index) => {
      console.log(`Card ${index}:`, card);
      // Test click programmatically
      card.addEventListener('click', (e) => {
        console.log(`Clicked card ${index}!`, e.currentTarget);
      });
    });
  }, [filteredSites]);

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
    setServicesText(''); // Initialize services text for new site
    setIsModalOpen(true);
    document.body.style.overflow = 'hidden';
  }, []);

  const openEditModal = useCallback((site: Site) => {
    setSelectedSite(site);
    setIsAddingNewSite(false);
    setEditingSite({ ...site });
    setServicesText(site.services.join('\n')); // Initialize services text for existing site
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
    // Create the save site with services from servicesText
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
          if (isAddingNewSite) {
            const response = await fetch(`${API_BASE}/sites`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(pendingSaveSite)
            });
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
              throw new Error(errorData.error || 'Failed to create site');
            }
          } else {
            const response = await fetch(`${API_BASE}/sites/${selectedSite?.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(pendingSaveSite)
            });
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
              throw new Error(errorData.error || 'Failed to update site');
            }
          }
          closeModal();
          // Re-fetch all sites to make sure we're in sync with DB
          await fetchSites();
        } catch (error) {
          console.error('Error saving site:', error);
          alert(error instanceof Error ? error.message : 'Failed to save site');
        }
      }
    } else {
      alert('Incorrect password!');
    }
  }, [passwordInput, pendingSaveSite, isAddingNewSite, selectedSite, closeModal, fetchSites]);

  const cancelPasswordPrompt = useCallback(() => {
    setPasswordInput('');
    setShowPasswordPrompt(false);
    setPendingSaveSite(null);
  }, []);

  const deleteSite = useCallback(async () => {
    if (!selectedSite) return;
    if (confirm(`Are you sure you want to delete "${selectedSite.name}"?`)) {
      try {
        const response = await fetch(`${API_BASE}/sites/${selectedSite.id}`, {
          method: 'DELETE'
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || 'Failed to delete site');
        }
        closeModal();
        // Re-fetch all sites to make sure we're in sync with DB
        await fetchSites();
      } catch (error) {
        console.error('Error deleting site:', error);
        alert(error instanceof Error ? error.message : 'Failed to delete site');
      }
    }
  }, [selectedSite, closeModal, fetchSites]);

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

  return (
    <div className="container">
      <div className="header">
        <div className="header-content">
          <h1>VOD GROUP</h1>
        </div>
      </div>

      <div className="search-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Search sites by name, group, services, or IP... (Ctrl+N to add new)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search sites"
        />
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

      {/* Password Prompt Modal */}
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
              {selectedSite && <button className="btn btn-danger" onClick={deleteSite}>Delete</button>}
              <div style={{ flex: 1 }}></div>
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveAttempt}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
