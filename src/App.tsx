import React, { useState, useEffect, useCallback } from 'react';
import { PublicDataPayload } from './types';
import { PublicWebsite } from './components/PublicWebsite';
import { AdminDashboard } from './components/AdminDashboard';
import { JuryPortal } from './components/JuryPortal';
import { Icon3D } from './components/Icons3D';
import { Eye, EyeOff, AlertCircle, X } from 'lucide-react';

const DEFAULT_PUBLIC_DATA: PublicDataPayload = {
  settings: {
    site_title: 'LOMBA GURU INSPIRATIF 2026',
    tagline: 'GURU HEBAT, INDONESIA KUAT',
    hashtag: '#BejolanAji',
    organizer: 'FK3S KEC. BEJI',
    main_logo_url: 'https://lh3.googleusercontent.com/d/1_q1kZ4MJoP6VQR7qs61HId_k_HHXB4oe',
    app_icon_url: 'https://lh3.googleusercontent.com/d/13M5y3gnxVP6cUPGKRXqdYqmHxFjPAvpD',
    primary_color: '#0284c7',
    secondary_color: '#d97706',
    submission_deadline: '2026-11-21T23:59:00+07:00',
    submission_enabled: 'true',
    submission_mode: 'INTERNAL'
  },
  juknis: [],
  jadwal: [],
  hadiah: [],
  sekolah: [],
  public_participants: [],
  pengumuman: [],
  top5: [],
  winners: [],
  stats: { total_participants: 0, total_schools: 0, total_registered_schools: 28 },
  last_sync: ''
};

export function App() {
  const [publicData, setPublicData] = useState<PublicDataPayload>(DEFAULT_PUBLIC_DATA);
  const [activePublicPage, setActivePublicPage] = useState<'BERANDA' | 'JUKNIS'>('BERANDA');
  const [appMode, setAppMode] = useState<'PUBLIC' | 'ADMIN' | 'JURI'>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/juri')) return 'JURI';
    return 'PUBLIC';
  });

  // Theme state: Default is Light Mode ('light' — background polos cerah)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('hgn_beji_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      // ignore
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('hgn_beji_theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Hidden Admin Login Modal State
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  const fetchPublicData = useCallback(async () => {
    try {
      const res = await fetch('/api/public');
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setPublicData(json.data);
        const s = json.data.settings || {};
        if (s.primary_color) {
          document.documentElement.style.setProperty('--primary-color', s.primary_color);
        }
        if (s.secondary_color) {
          document.documentElement.style.setProperty('--secondary-color', s.secondary_color);
        }
        if (s.app_icon_url) {
          const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
          if (link) link.href = s.app_icon_url;
        }
        if (s.site_title) {
          document.title = `${s.site_title} — ${s.organizer || 'FK3S KEC. BEJI'}`;
        }
      }
    } catch {
      // ignore transient offline error
    }
  }, []);

  useEffect(() => {
    fetchPublicData();
    fetch('/api/admin/session')
      .then((r) => r.json())
      .then((j) => {
        if (j?.data?.authenticated) {
          setAdminAuthenticated(true);
        }
      })
      .catch(() => {});
  }, [fetchPublicData]);

  // Automatic 30s polling for public data
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPublicData();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchPublicData]);

  useEffect(() => {
    const onPopState = () => {
      if (window.location.pathname.startsWith('/juri')) {
        setAppMode('JURI');
      } else {
        setAppMode('PUBLIC');
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleTriggerAdminAccess = () => {
    if (adminAuthenticated) {
      setAppMode('ADMIN');
    } else {
      setAdminError('');
      setShowAdminModal(true);
    }
  };

  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    setAdminLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: adminUser, password: adminPass })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setAdminError(json.message || 'Kredensial Administrator tidak valid.');
      } else {
        setAdminAuthenticated(true);
        setShowAdminModal(false);
        setAdminUser('');
        setAdminPass('');
        setAppMode('ADMIN');
      }
    } catch {
      setAdminError('Gagal menghubungi server autentikasi.');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleAdminLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    setAdminAuthenticated(false);
    setAppMode('PUBLIC');
    fetchPublicData();
  };

  if (appMode === 'JURI') {
    return (
      <JuryPortal
        mainLogoUrl={
          publicData.settings?.app_icon_url ||
          'https://lh3.googleusercontent.com/d/13M5y3gnxVP6cUPGKRXqdYqmHxFjPAvpD'
        }
        theme={theme}
        onToggleTheme={toggleTheme}
        onBackToPublic={() => {
          window.history.pushState({}, '', '/');
          setAppMode('PUBLIC');
          fetchPublicData();
        }}
      />
    );
  }

  if (appMode === 'ADMIN' && adminAuthenticated) {
    return (
      <AdminDashboard
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogout={handleAdminLogout}
        onViewPublicSite={() => {
          setAppMode('PUBLIC');
          fetchPublicData();
        }}
        onRefreshPublic={fetchPublicData}
      />
    );
  }

  return (
    <>
      <PublicWebsite
        data={publicData}
        activePage={activePublicPage}
        setActivePage={setActivePublicPage}
        onTriggerAdminLogin={handleTriggerAdminAccess}
        onOpenJuryPortal={() => {
          window.history.pushState({}, '', '/juri/login');
          setAppMode('JURI');
        }}
        onRefreshPublicData={fetchPublicData}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* SECTION 5 — HIDDEN DOUBLE-CLICK ADMIN LOGIN MODAL */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-white dark:bg-[#0d152a] border-2 border-[#004AAD]/40 dark:border-[#FFB800]/50 p-7 sm:p-8 space-y-6 shadow-[0_20px_50px_rgba(0,74,173,0.3)] relative">
            <button
              type="button"
              onClick={() => setShowAdminModal(false)}
              className="absolute right-5 top-5 text-slate-500 hover:text-slate-950 dark:hover:text-white cursor-pointer"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4">
              <Icon3D type="security" size="md" />
              <div>
                <h2 className="font-display font-black text-xl text-[#004AAD] dark:text-white">
                  Otorisasi Administrator
                </h2>
                <p className="text-xs font-extrabold text-[#EA580C] dark:text-[#FFB800]">
                  LOMBA GURU INSPIRATIF 2026 — FK3S KEC. BEJI
                </p>
              </div>
            </div>

            {adminError && (
              <div className="rounded-xl bg-red-50 dark:bg-red-950/70 border-2 border-red-500 p-3.5 text-xs font-extrabold text-red-800 dark:text-red-200 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <span>{adminError}</span>
              </div>
            )}

            <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-950 dark:text-white mb-1.5">
                  Username Administrator
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={adminUser}
                  onChange={(e) => setAdminUser(e.target.value)}
                  placeholder="Masukkan username admin"
                  className="w-full rounded-xl bg-[#F8FAFC] dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 focus:border-[#004AAD] dark:focus:border-[#FFB800] focus:outline-none px-4 py-3 text-sm font-bold text-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-950 dark:text-white mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showAdminPass ? 'text' : 'password'}
                    required
                    value={adminPass}
                    onChange={(e) => setAdminPass(e.target.value)}
                    placeholder="Masukkan password admin"
                    className="w-full rounded-xl bg-[#F8FAFC] dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 focus:border-[#004AAD] dark:focus:border-[#FFB800] focus:outline-none pl-4 pr-11 py-3 text-sm font-bold text-slate-950 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPass(!showAdminPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={adminLoading}
                className="w-full py-3.5 rounded-xl font-black text-sm text-white bg-[#004AAD] hover:bg-[#003B8E] dark:bg-[#FFB800] dark:hover:bg-[#FFA500] dark:text-slate-950 border-2 border-[#003380] dark:border-[#B45309]/40 disabled:opacity-50 shadow-md transition-all cursor-pointer"
              >
                {adminLoading ? 'MEMVERIFIKASI...' : 'MASUK KE DASHBOARD ADMIN'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
