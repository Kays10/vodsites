import { useState, useEffect, useCallback } from 'react';
import { Site } from './types';
import { initialSites } from './data';

function App() {
  const [sites, setSites] = useState<Site[]>(() => {
    const saved = localStorage.getItem('vodSites');
    return saved ? JSON.parse(saved) : initialSites;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);

  useEffect(() => {
    localStorage.setItem('vodSites', JSON.stringify(sites));
  }, [sites]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
    setEditingSite(newSite);
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((site: Site) => {
    setSelectedSite(site);
    setEditingSite({ ...site });
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedSite(null);
    setEditingSite(null);
  }, []);

  const saveSite = useCallback(() => {
    if (!editingSite) return;
    if (selectedSite) {
      setSites(sites.map(s => s.id === selectedSite.id ? editingSite : s));
    } else {
      setSites([...sites, editingSite]);
    }
    closeModal();
  }, [editingSite, selectedSite, sites, closeModal]);

  const deleteSite = useCallback(() => {
    if (!selectedSite) return;
    if (confirm(`Are you sure you want to delete "${selectedSite.name}"?`)) {
      setSites(sites.filter(s => s.id !== selectedSite.id));
      closeModal();
    }
  }, [selectedSite, sites, closeModal]);

  const handleInputChange = useCallback((field: keyof Site, value: string) => {
    if (!editingSite) return;
    if (field === 'services') {
      setEditingSite({
        ...editingSite,
        services: value.split('\n').filter(s => s.trim() !== '')
      });
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
          <img src="/logo.svg" alt="VOD Sites Manager Logo" className="header-logo" />
          <div className="header-text">
            <h1>VOD Sites Manager</h1>
            <p>Manage and edit your supported sites • {sites.length} total sites</p>
          </div>
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

      <div className="sites-grid">
        {filteredSites.length === 0 ? (
          <div className="empty-state">
            <h3>No sites found</h3>
            <p>Try a different search term or add a new site</p>
          </div>
        ) : (
          filteredSites.map((site) => (
            <div 
              key={site.id} 
              className="site-card" 
              onClick={() => openEditModal(site)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && openEditModal(site)}
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

      <button 
        className="btn-add" 
        onClick={openAddModal}
        aria-label="Add new site"
      >
        +
      </button>

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
                    placeholder="Enter IP address"
                  />
                </div>
                <div className="form-group full-width">
                  <label htmlFor="site-services">Services (one per line)</label>
                  <textarea
                    id="site-services"
                    value={editingSite.services.join('\n')}
                    onChange={(e) => handleInputChange('services', e.target.value)}
                    placeholder="Enter services, one per line"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="site-vpn">VPN</label>
                  <input
                    id="site-vpn"
                    type="text"
                    value={editingSite.vpn}
                    onChange={(e) => handleInputChange('vpn', e.target.value)}
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
                    placeholder="http://..."
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="site-switches">Switches</label>
                  <input
                    id="site-switches"
                    type="text"
                    value={editingSite.switches}
                    onChange={(e) => handleInputChange('switches', e.target.value)}
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
                    placeholder="https://..."
                  />
                </div>
                <div className="form-group full-width">
                  <label htmlFor="site-notes">Notes</label>
                  <textarea
                    id="site-notes"
                    value={editingSite.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Additional notes"
                  />
                </div>
                <div className="form-group full-width">
                  <label htmlFor="site-other">Other</label>
                  <textarea
                    id="site-other"
                    value={editingSite.other}
                    onChange={(e) => handleInputChange('other', e.target.value)}
                    placeholder="Other info"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              {selectedSite && <button className="btn btn-danger" onClick={deleteSite}>Delete</button>}
              <div style={{ flex: 1 }}></div>
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={saveSite}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
