import React, { useState, useEffect, useRef } from 'react';
import { PublicDataPayload } from '../types';
import { Icon3D } from './Icons3D';
import { formatRupiah } from '../utils/embedHelper';
import {
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Send,
  MapPin,
  ArrowRight,
  FileText,
  Sun,
  Moon,
  Award,
  Calendar,
  Megaphone,
  Layers,
  BookOpen,
  Video,
  CheckSquare,
  BarChart3,
  Trophy,
  Sparkles,
  HelpCircle,
  FolderCheck,
  Home,
  Gavel,
  Building2,
  Search,
  Users,
  X,
  Filter,
  Info,
  ShieldCheck
} from 'lucide-react';

interface PublicWebsiteProps {
  data: PublicDataPayload;
  activePage: 'BERANDA' | 'JUKNIS';
  setActivePage: (page: 'BERANDA' | 'JUKNIS') => void;
  onTriggerAdminLogin: () => void;
  onOpenJuryPortal: () => void;
  onRefreshPublicData: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

type BerandaTab = 'PILAR' | 'REKAP_SEKOLAH' | 'STAR' | 'JADWAL' | 'HADIAH' | 'PENGUMUMAN' | 'JUARA' | 'FAQ';
type JuknisTab = 'BAB_AC' | 'BAB_DE' | 'BAB_F' | 'BAB_G' | 'BAB_H' | 'PANDUAN_DRIVE' | 'REKAP_SEKOLAH' | 'FORMULIR';

export const PublicWebsite: React.FC<PublicWebsiteProps> = ({
  data,
  activePage,
  setActivePage,
  onTriggerAdminLogin,
  onOpenJuryPortal,
  onRefreshPublicData,
  theme,
  onToggleTheme
}) => {
  const settings = data.settings || {};

  // Logo HGN Utama (ditampilkan tanpa bingkai/iframe tepat di bawah judul pada Page 1)
  const mainHgnLogo =
    settings.main_logo_url || 'https://lh3.googleusercontent.com/d/1_q1kZ4MJoP6VQR7qs61HId_k_HHXB4oe';

  // Logo FK3S Kec. Beji (digunakan untuk logo navigasi atas & Page 2 tanpa bingkai/iframe)
  const fk3sLogo =
    settings.app_icon_url || 'https://lh3.googleusercontent.com/d/13M5y3gnxVP6cUPGKRXqdYqmHxFjPAvpD';

  const rawTitle = settings.site_title || 'LOMBA GURU INSPIRATIF 2026';
  const siteTitle =
    rawTitle.toUpperCase() === 'LOMBA VIDEO GURU INSPIRATIF 2026'
      ? 'LOMBA GURU INSPIRATIF 2026'
      : rawTitle;

  const organizer =
    !settings.organizer || settings.organizer.toUpperCase() === 'FKKKS KECAMATAN BEJI'
      ? 'FK3S KEC. BEJI'
      : settings.organizer;

  const tagline = settings.tagline || 'GURU HEBAT, INDONESIA KUAT';
  const hashtag = settings.hashtag || '#BejolanAji';
  const deadlineStr = settings.submission_deadline || '2026-11-21T23:59:00+07:00';
  const submissionEnabled = settings.submission_enabled !== 'false';
  const submissionMode = settings.submission_mode || 'INTERNAL';
  const externalFormUrl = settings.external_form_url || '';

  // Sub-tabs state so neither Page 1 nor Page 2 requires vertical scrolling
  const [berandaTab, setBerandaTab] = useState<BerandaTab>('PILAR');
  const [juknisTab, setJuknisTab] = useState<JuknisTab>('BAB_AC');
  const [showSchoolRecapModal, setShowSchoolRecapModal] = useState(false);
  const [schoolSearch, setSchoolSearch] = useState('');
  const [schoolFilterMode, setSchoolFilterMode] = useState<'ALL' | 'SUBMITTED' | 'EMPTY'>('ALL');
  const [villageFilter, setVillageFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NEGERI' | 'SWASTA'>('ALL');
  const [selectedSchoolDetail, setSelectedSchoolDetail] = useState<string>('ALL');

  const mainScrollRef = useRef<HTMLElement | null>(null);
  const scrollToTop = () => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Double-click / quick double-tap detector for hidden Admin Login
  const lastTapRef = useRef<number>(0);
  const handleLogoInteraction = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 420) {
      lastTapRef.current = 0;
      onTriggerAdminLogin();
    } else {
      lastTapRef.current = now;
    }
  };

  // Countdown state (Asia/Jakarta target)
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    expired: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });

  useEffect(() => {
    const updateCountdown = () => {
      const target = new Date(deadlineStr).getTime();
      const now = Date.now();
      const diff = target - now;
      if (Number.isNaN(target) || diff <= 0 || !submissionEnabled) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
        expired: false
      });
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [deadlineStr, submissionEnabled]);

  // Internal Submission Form state
  const [formState, setFormState] = useState({
    full_name: '',
    school: '',
    innovation_title: '',
    drive_folder_url: '',
    video_url: '',
    lesson_module_url: '',
    learning_media_url: '',
    whatsapp: '',
    consent: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    type: 'success' | 'error';
    message: string;
    participantId?: string;
  } | null>(null);

  const navigateToSubmissionForm = () => {
    setActivePage('JUKNIS');
    setJuknisTab('FORMULIR');
    scrollToTop();
  };

  const navigateToJuknisOverview = () => {
    setActivePage('JUKNIS');
    setJuknisTab('BAB_AC');
    scrollToTop();
  };

  const handleInternalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitResult(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formState)
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setSubmitResult({
          type: 'error',
          message: json.message || 'Gagal mengirim karya. Periksa kembali kelengkapan data Anda.'
        });
      } else {
        setSubmitResult({
          type: 'success',
          message: json.message,
          participantId: json.data?.participant_id
        });
        setFormState({
          full_name: '',
          school: '',
          innovation_title: '',
          drive_folder_url: '',
          video_url: '',
          lesson_module_url: '',
          learning_media_url: '',
          whatsapp: '',
          consent: false
        });
        onRefreshPublicData();
      }
    } catch {
      setSubmitResult({
        type: 'error',
        message: 'Terjadi gangguan jaringan saat menghubungi server. Silakan coba kembali.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to get Juknis section by code
  const getJuknisSection = (code: string) =>
    data.juknis.find((s) => s.section_code.toUpperCase() === code.toUpperCase());

  // Schools list from DB sheet SEKOLAH (Kecamatan Beji, Kabupaten Pasuruan, Provinsi Jawa Timur)
  const schoolsList = Array.isArray(data.sekolah) && data.sekolah.length > 0
    ? [...data.sekolah].sort((a, b) => a.school_name.localeCompare(b.school_name, 'id'))
    : [];

  // Public participants recap (STRICTLY ONLY school, full_name, innovation_title)
  const publicParticipants = Array.isArray(data.public_participants) ? data.public_participants : [];

  // Build per-school recap for bar chart & participant table
  const schoolRecapData = React.useMemo(() => {
    const map = new Map<
      string,
      {
        school_id: string;
        school_name: string;
        village: string;
        status: string;
        count: number;
        participants: Array<{ participant_id: string; full_name: string; innovation_title: string; school: string }>;
      }
    >();

    schoolsList.forEach((s) => {
      map.set(s.school_name.trim().toUpperCase(), {
        school_id: s.school_id,
        school_name: s.school_name,
        village: s.village || 'Kec. Beji',
        status: s.status || 'NEGERI',
        count: 0,
        participants: []
      });
    });

    publicParticipants.forEach((p) => {
      const key = (p.school || '').trim().toUpperCase();
      if (!key) return;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        existing.participants.push({
          participant_id: p.participant_id,
          full_name: p.full_name,
          innovation_title: p.innovation_title,
          school: existing.school_name
        });
      } else {
        map.set(key, {
          school_id: `CUSTOM-${key}`,
          school_name: p.school.trim(),
          village: 'Kec. Beji',
          status: 'NEGERI',
          count: 1,
          participants: [
            {
              participant_id: p.participant_id,
              full_name: p.full_name,
              innovation_title: p.innovation_title,
              school: p.school.trim()
            }
          ]
        });
      }
    });

    const allRows = Array.from(map.values());
    // Sort by participant count descending, then alphabetically by school_name
    allRows.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.school_name.localeCompare(b.school_name, 'id');
    });

    const maxCount = Math.max(1, ...allRows.map((r) => r.count));
    const submittedSchoolsCount = allRows.filter((r) => r.count > 0).length;
    const totalRegisteredSchools = allRows.length;
    const participationRate =
      totalRegisteredSchools > 0
        ? Math.round((submittedSchoolsCount / totalRegisteredSchools) * 100)
        : 0;
    const negeriCount = allRows.filter((r) => r.status === 'NEGERI').length;
    const swastaCount = allRows.filter((r) => r.status === 'SWASTA').length;

    // Group stats per village (Desa/Kelurahan di Kec. Beji)
    const villageMap = new Map<string, { village: string; totalSchools: number; submittedSchools: number; totalParticipants: number }>();
    allRows.forEach((r) => {
      const v = r.village || 'Kec. Beji';
      const curr = villageMap.get(v) || { village: v, totalSchools: 0, submittedSchools: 0, totalParticipants: 0 };
      curr.totalSchools += 1;
      if (r.count > 0) curr.submittedSchools += 1;
      curr.totalParticipants += r.count;
      villageMap.set(v, curr);
    });
    const villageStats = Array.from(villageMap.values()).sort((a, b) =>
      a.village.localeCompare(b.village, 'id')
    );

    return {
      rows: allRows,
      maxCount,
      totalRegisteredSchools,
      submittedSchoolsCount,
      emptySchoolsCount: Math.max(0, totalRegisteredSchools - submittedSchoolsCount),
      participationRate,
      negeriCount,
      swastaCount,
      villageStats
    };
  }, [schoolsList, publicParticipants]);

  const filteredSchoolRows = React.useMemo(() => {
    const q = schoolSearch.trim().toLowerCase();
    return schoolRecapData.rows.filter((r) => {
      if (schoolFilterMode === 'SUBMITTED' && r.count === 0) return false;
      if (schoolFilterMode === 'EMPTY' && r.count > 0) return false;
      if (villageFilter !== 'ALL' && r.village !== villageFilter) return false;
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (!q) return true;
      const matchSchool =
        r.school_name.toLowerCase().includes(q) ||
        r.village.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q);
      const matchTeacher = r.participants.some(
        (p) =>
          p.full_name.toLowerCase().includes(q) ||
          p.innovation_title.toLowerCase().includes(q)
      );
      return matchSchool || matchTeacher;
    });
  }, [schoolRecapData.rows, schoolSearch, schoolFilterMode, villageFilter, statusFilter]);

  const filteredPublicParticipants = React.useMemo(() => {
    const q = schoolSearch.trim().toLowerCase();
    const allowedSchoolNames = new Set(
      filteredSchoolRows.map((r) => r.school_name.trim().toUpperCase())
    );
    return publicParticipants.filter((p) => {
      const pSchoolUpper = p.school.trim().toUpperCase();
      if (
        selectedSchoolDetail !== 'ALL' &&
        pSchoolUpper !== selectedSchoolDetail.trim().toUpperCase()
      ) {
        return false;
      }
      if (
        (villageFilter !== 'ALL' || statusFilter !== 'ALL' || schoolFilterMode !== 'ALL') &&
        !allowedSchoolNames.has(pSchoolUpper)
      ) {
        return false;
      }
      if (!q) return true;
      return (
        p.school.toLowerCase().includes(q) ||
        p.full_name.toLowerCase().includes(q) ||
        p.innovation_title.toLowerCase().includes(q)
      );
    });
  }, [publicParticipants, schoolSearch, selectedSchoolDetail, filteredSchoolRows, villageFilter, statusFilter, schoolFilterMode]);

  const resetAllSchoolFilters = () => {
    setSchoolSearch('');
    setSchoolFilterMode('ALL');
    setVillageFilter('ALL');
    setStatusFilter('ALL');
    setSelectedSchoolDetail('ALL');
  };

  const renderSchoolRecapWorkspace = () => (
    <div className="h-full flex flex-col justify-between gap-3.5">
      {/* Header & Summary Badges */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b-2 border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-[11px] font-mono font-black uppercase tracking-wider text-[#EA580C] dark:text-[#FFB800]">
            SHEET SEKOLAH DB • KEC. BEJI, KAB. PASURUAN, PROV. JAWA TIMUR
          </span>
          <h2 className="font-display font-black text-lg sm:text-xl text-slate-950 dark:text-white">
            Grafik Batang & Rekap Peserta Per Sekolah ({schoolRecapData.totalRegisteredSchools} SD)
          </h2>
        </div>

        {/* Summary Counters */}
        <div className="grid grid-cols-3 gap-2 shrink-0">
          <div className="px-3 py-1.5 rounded-xl bg-[#F0F6FF] dark:bg-slate-900 border-2 border-[#004AAD]/30 text-center">
            <div className="font-mono font-black text-base sm:text-lg text-[#004AAD] dark:text-[#FFB800] leading-none tabular-nums">
              {schoolRecapData.totalRegisteredSchools}
            </div>
            <div className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300 mt-0.5">
              TOTAL SD BEJI
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-500/40 text-center">
            <div className="font-mono font-black text-base sm:text-lg text-emerald-700 dark:text-emerald-400 leading-none tabular-nums">
              {schoolRecapData.submittedSchoolsCount}
            </div>
            <div className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300 mt-0.5">
              SUDAH KIRIM
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-[#FFFBEB] dark:bg-amber-950/40 border-2 border-[#F59E0B]/50 text-center">
            <div className="font-mono font-black text-base sm:text-lg text-[#D97706] dark:text-[#FFB800] leading-none tabular-nums">
              {publicParticipants.length}
            </div>
            <div className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300 mt-0.5">
              GURU PESERTA
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={schoolSearch}
            onChange={(e) => setSchoolSearch(e.target.value)}
            placeholder={`Cari Nama Sekolah (${schoolsList[0]?.school_name || 'SDN Baujeng I Beji'}, ${schoolsList[1]?.school_name || 'SDN Beji I'}), Nama Guru, atau Judul...`}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#F8FAFC] dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 focus:border-[#004AAD] dark:focus:border-[#FFB800] focus:outline-none text-xs font-bold text-slate-950 dark:text-white"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          {[
            { id: 'ALL' as const, label: `Semua SD (${schoolRecapData.totalRegisteredSchools})` },
            { id: 'SUBMITTED' as const, label: `Sudah Kirim (${schoolRecapData.submittedSchoolsCount})` },
            { id: 'EMPTY' as const, label: `Belum Kirim (${schoolRecapData.emptySchoolsCount})` }
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSchoolFilterMode(f.id)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black border-2 cursor-pointer transition-all ${
                schoolFilterMode === f.id
                  ? 'bg-[#004AAD] text-white border-[#003380] dark:bg-[#FFB800] dark:text-slate-950 dark:border-[#FFB800]'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Responsive Split Grid: Left = Responsive Bar Chart per School, Right = Public Participant Table (ONLY School, Name, Title) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
        {/* LEFT (6 Cols): GRAFIK BATANG RESPONSIF PER SEKOLAH */}
        <div className="lg:col-span-6 rounded-2xl bg-[#F8FAFC] dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 p-4 flex flex-col justify-between min-h-[260px] max-h-[340px] lg:max-h-full">
          <div className="flex items-center justify-between gap-2 mb-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#004AAD] dark:text-[#FFB800]" />
              <h3 className="font-display font-black text-sm sm:text-base text-slate-950 dark:text-white">
                Grafik Batang Partisipasi Peserta per Sekolah
              </h3>
            </div>
            {selectedSchoolDetail !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedSchoolDetail('ALL')}
                className="text-[11px] font-black text-[#EA580C] dark:text-[#FFB800] underline cursor-pointer"
              >
                Tampilkan Semua SD
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-2">
            {filteredSchoolRows.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-400 py-8 text-center">
                Tidak ada sekolah yang sesuai dengan pencarian Anda.
              </div>
            ) : (
              filteredSchoolRows.map((row, idx) => {
                const widthPercent =
                  row.count > 0
                    ? Math.max(18, Math.round((row.count / schoolRecapData.maxCount) * 100))
                    : 4;
                const isSelected =
                  selectedSchoolDetail !== 'ALL' &&
                  selectedSchoolDetail.toUpperCase() === row.school_name.toUpperCase();

                return (
                  <div
                    key={row.school_id}
                    onClick={() =>
                      setSelectedSchoolDetail(
                        isSelected ? 'ALL' : row.school_name
                      )
                    }
                    className={`rounded-xl p-2.5 border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#F0F6FF] dark:bg-slate-950 border-[#004AAD] dark:border-[#FFB800]'
                        : row.count > 0
                        ? 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 hover:border-[#004AAD]'
                        : 'bg-white/70 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/70 hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-200 font-mono font-black text-[11px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="font-display font-black text-xs sm:text-sm text-slate-950 dark:text-white leading-snug break-words">
                            {row.school_name}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-lg font-mono font-black text-xs shrink-0 tabular-nums ${
                          row.count > 0
                            ? 'bg-[#004AAD] text-white dark:bg-[#FFB800] dark:text-slate-950'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
                        }`}
                      >
                        {row.count} Peserta
                      </span>
                    </div>

                    {/* Responsive Horizontal Bar */}
                    <div className="w-full h-3.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden p-0.5">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          row.count > 0
                            ? 'bg-gradient-to-r from-[#004AAD] via-[#1D4ED8] to-[#FFB800]'
                            : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT (6 Cols): DAFTAR REKAP PESERTA PUBLIK (Hanya Sekolah, Nama Guru, dan Judul Inovasi) */}
        <div className="lg:col-span-6 rounded-2xl bg-[#F8FAFC] dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 p-4 flex flex-col justify-between min-h-[260px] max-h-[340px] lg:max-h-full">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#EA580C] dark:text-[#FFB800]" />
              <h3 className="font-display font-black text-sm sm:text-base text-slate-950 dark:text-white">
                Daftar Rekap Peserta ({filteredPublicParticipants.length} Karya)
              </h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-md bg-[#004AAD]/10 dark:bg-[#FFB800]/15 text-[#004AAD] dark:text-[#FFB800] text-[10px] font-black">
              PUBLIK: HANYA SEKOLAH, NAMA & JUDUL
            </span>
          </div>

          <div className="flex-1 overflow-y-auto rounded-xl border-2 border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950">
            {filteredPublicParticipants.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-2">
                <Building2 className="w-8 h-8 text-slate-400" />
                <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  Belum Ada Karya Peserta pada Filter Ini
                </div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 max-w-xs">
                  Silakan klik tombol &quot;Kumpulkan Karya&quot; untuk mendaftarkan karya guru perwakilan sekolah Anda.
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-[#004AAD] text-white font-black">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">No</th>
                    <th className="py-2.5 px-3">Asal Sekolah (Kec. Beji)</th>
                    <th className="py-2.5 px-3">Nama Guru Peserta</th>
                    <th className="py-2.5 px-3">Judul Inovasi Pembelajaran</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-200 dark:divide-slate-800 font-bold">
                  {filteredPublicParticipants.map((item, index) => (
                    <tr
                      key={item.participant_id || index}
                      className="hover:bg-[#F0F6FF] dark:hover:bg-slate-900/80 transition-colors"
                    >
                      <td className="py-2.5 px-3 text-center font-mono font-black text-slate-600 dark:text-slate-400 tabular-nums">
                        {index + 1}
                      </td>
                      <td className="py-2.5 px-3 font-black text-[#004AAD] dark:text-[#FFB800]">
                        {item.school}
                      </td>
                      <td className="py-2.5 px-3 font-extrabold text-slate-950 dark:text-white">
                        {item.full_name}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                        {item.innovation_title}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="mt-2 text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between gap-2 shrink-0">
            <span>
              * Sesuai ketentuan privasi lomba, tautan berkas Google Drive, video, modul ajar, WhatsApp, dan nilai hanya ditampilkan di Portal Juri & Admin.
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const berandaTabsList = [
    { id: 'PILAR' as const, label: '4 Pilar Lomba', shortLabel: '4 Pilar', icon: Layers },
    { id: 'REKAP_SEKOLAH' as const, label: `Rekap Sekolah (${publicParticipants.length})`, shortLabel: `Rekap (${publicParticipants.length})`, icon: BarChart3 },
    { id: 'STAR' as const, label: 'Alur STAR & Deep Learning', shortLabel: 'Alur STAR', icon: Sparkles },
    { id: 'JADWAL' as const, label: 'Jadwal Resmi', shortLabel: 'Jadwal', icon: Calendar },
    { id: 'HADIAH' as const, label: 'Hadiah Juara', shortLabel: 'Hadiah', icon: Award },
    { id: 'PENGUMUMAN' as const, label: `Pengumuman (${data.pengumuman.length})`, shortLabel: `Info (${data.pengumuman.length})`, icon: Megaphone },
    { id: 'JUARA' as const, label: 'Pemenang & Top 5', shortLabel: 'Top 5', icon: Trophy },
    { id: 'FAQ' as const, label: 'FAQ & Bantuan', shortLabel: 'FAQ', icon: HelpCircle }
  ];

  const juknisTabsList = [
    { id: 'BAB_AC' as const, label: '1. Umum & Peserta (A–C)', shortLabel: '1. Bab A–C', icon: BookOpen },
    { id: 'BAB_DE' as const, label: '2. Karya & Video (D–E)', shortLabel: '2. Video', icon: Video },
    { id: 'BAB_F' as const, label: '3. Mekanisme & Seleksi (F)', shortLabel: '3. Seleksi', icon: CheckSquare },
    { id: 'BAB_G' as const, label: '4. Bobot Penilaian (G)', shortLabel: '4. Bobot', icon: BarChart3 },
    { id: 'BAB_H' as const, label: '5. Tabel Hadiah (H)', shortLabel: '5. Hadiah', icon: Trophy },
    { id: 'PANDUAN_DRIVE' as const, label: '6. Panduan Drive', shortLabel: '6. Drive', icon: FolderCheck },
    { id: 'REKAP_SEKOLAH' as const, label: `7. Grafik Rekap SD (${publicParticipants.length})`, shortLabel: `7. Rekap (${publicParticipants.length})`, icon: Building2 },
    { id: 'FORMULIR' as const, label: '8. FORMULIR PENGUMPULAN', shortLabel: '8. Formulir', icon: Send }
  ];

  return (
    <div className="h-[100dvh] w-full max-w-[100vw] overflow-hidden flex flex-col relative bg-white dark:bg-[#070b14] text-slate-950 dark:text-white transition-colors duration-150">
      {/* =====================================================================
       * TOP NAVIGATION BAR — Royal Blue & Golden Orange Accent, Unframed FK3S Logo
       * ===================================================================== */}
      <header className="h-16 shrink-0 z-40 bg-white/95 dark:bg-[#0a1122]/95 backdrop-blur-md border-b-2 border-[#004AAD]/20 dark:border-[#FFB800]/30 shadow-xs">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-3">
          {/* Zone 1: Top FK3S Logo WITHOUT box/iframe + Bold Brand Title */}
          <div
            onClick={handleLogoInteraction}
            onDoubleClick={onTriggerAdminLogin}
            title="FK3S KEC. BEJI — Lomba Guru Inspiratif 2026"
            className="flex items-center gap-3 cursor-pointer select-none shrink-0 group"
          >
            <img
              src={fk3sLogo}
              alt="Logo FK3S Kec. Beji"
              referrerPolicy="no-referrer"
              className="w-10 h-10 sm:w-11 sm:h-11 object-contain drop-shadow-sm transition-transform duration-150 group-hover:scale-105"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (!img.src.includes('/assets/aistudio/logo_fk3s.png')) {
                  img.src = '/assets/aistudio/logo_fk3s.png';
                }
              }}
            />
            <div className="leading-tight">
              <div className="font-display font-black text-sm sm:text-lg tracking-tight text-[#004AAD] dark:text-[#FFB800]">
                {organizer}
              </div>
              <div className="text-[10px] sm:text-[11px] font-extrabold tracking-wider text-slate-700 dark:text-slate-300 uppercase">
                KABUPATEN PASURUAN • {hashtag}
              </div>
            </div>
          </div>

          {/* Zone 2: Desktop Main Page Switchers */}
          <nav className="hidden lg:flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl border-2 border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActivePage('BERANDA')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-extrabold tracking-wide transition-all whitespace-nowrap cursor-pointer ${
                activePage === 'BERANDA'
                  ? 'bg-[#004AAD] text-white shadow-sm dark:bg-[#FFB800] dark:text-slate-950'
                  : 'text-slate-800 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800'
              }`}
            >
              1. BERANDA UTAMA
            </button>
            <button
              type="button"
              onClick={() => setActivePage('JUKNIS')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-extrabold tracking-wide transition-all whitespace-nowrap cursor-pointer ${
                activePage === 'JUKNIS'
                  ? 'bg-[#004AAD] text-white shadow-sm dark:bg-[#FFB800] dark:text-slate-950'
                  : 'text-slate-800 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800'
              }`}
            >
              2. JUKNIS & PENGUMPULAN KARYA PESERTA
            </button>
          </nav>

          {/* Zone 3: Light/Dark Mode Toggle + Portal Juri + Quick Submit CTA */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onToggleTheme}
              title={theme === 'light' ? 'Ganti ke Mode Gelap (Dark)' : 'Ganti ke Mode Cerah (Light)'}
              className="px-3 py-2 rounded-xl text-xs font-extrabold bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-700 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {theme === 'light' ? (
                <>
                  <Moon className="w-4 h-4 text-[#004AAD]" />
                  <span className="hidden xl:inline">MODE GELAP</span>
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 text-[#FFB800]" />
                  <span className="hidden xl:inline">MODE CERAH</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowSchoolRecapModal(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-[#004AAD] hover:bg-[#003B8E] text-white border-2 border-[#003380] shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <BarChart3 className="w-3.5 h-3.5 text-[#FFD000]" />
              <span>REKAP SEKOLAH ({publicParticipants.length})</span>
            </button>

            <button
              type="button"
              onClick={onOpenJuryPortal}
              className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold bg-[#F0F6FF] hover:bg-blue-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-[#004AAD] dark:text-[#FFB800] border-2 border-[#004AAD]/30 dark:border-[#FFB800]/40 transition-colors cursor-pointer"
            >
              <Gavel className="w-3.5 h-3.5" />
              <span>PORTAL JURI</span>
            </button>

            <button
              type="button"
              onClick={navigateToSubmissionForm}
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black tracking-wide text-slate-950 bg-gradient-to-r from-[#FFD000] via-[#FFB800] to-[#FF9000] hover:brightness-105 border-2 border-[#B45309]/30 shadow-sm transition-all cursor-pointer whitespace-nowrap"
            >
              <Send className="w-3.5 h-3.5" />
              <span>KIRIM KARYA</span>
            </button>
          </div>
        </div>
      </header>

      {/* =====================================================================
       * MAIN VIEWPORT WORKSPACE (Internal scroll on Mobile/Tablet so Floating Nav never shifts!)
       * ===================================================================== */}
      <main
        ref={mainScrollRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden lg:overflow-hidden pb-44 lg:pb-0"
      >
        {activePage === 'BERANDA' ? (
          /* =================================================================
           * PAGE 1: BERANDA UTAMA — 2-Column Executive Layout (Left Hero + Right 7 Tabs)
           * ================================================================= */
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-4 lg:py-5 h-full flex flex-col justify-between">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 h-full items-stretch">
              {/* LEFT COLUMN (5 Cols): Title -> FK3S KEC. BEJI -> Unframed HGN Logo -> Countdown & CTA */}
              <div className="lg:col-span-5 flex flex-col justify-between rounded-3xl bg-white dark:bg-[#0d152a] border-2 border-[#004AAD]/25 dark:border-[#FFB800]/30 p-5 sm:p-6 shadow-[0_12px_32px_-8px_rgba(0,74,173,0.12)]">
                {/* Top Identity Block */}
                <div className="text-center">
                  <div className="inline-block px-3.5 py-1 rounded-lg bg-[#004AAD] text-white dark:bg-[#FFB800] dark:text-slate-950 text-[11px] font-black tracking-widest uppercase">
                    HARI GURU NASIONAL 2026 • {tagline}
                  </div>

                  {/* Main Title: LOMBA GURU INSPIRATIF 2026 */}
                  <h1 className="mt-2.5 font-display font-black text-2xl sm:text-3xl xl:text-4xl tracking-tight text-[#004AAD] dark:text-white leading-none">
                    {siteTitle}
                  </h1>

                  {/* Organizer Directly Below: FK3S KEC. BEJI */}
                  <p className="mt-1.5 font-display font-black text-lg sm:text-2xl text-[#EA580C] dark:text-[#FFB800] tracking-wide">
                    {organizer}
                  </p>
                </div>

                {/* Center: Direct Unframed HGN Logo Image (NO box/iframe container!) */}
                <div
                  onClick={handleLogoInteraction}
                  onDoubleClick={onTriggerAdminLogin}
                  title="Klik ganda (Double-click) untuk Otorisasi Admin"
                  className="my-2 flex flex-col items-center justify-center cursor-pointer select-none"
                >
                  <img
                    src={mainHgnLogo}
                    alt="Logo Lomba Guru Inspiratif 2026 FK3S Kec. Beji"
                    referrerPolicy="no-referrer"
                    className="w-full max-w-[430px] max-h-[210px] xl:max-h-[240px] object-contain mx-auto transition-transform duration-200 hover:scale-[1.02] dark:drop-shadow-[0_8px_24px_rgba(255,255,255,0.15)]"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      if (!img.src.includes('/assets/aistudio/logo_hgn.png')) {
                        img.src = '/assets/aistudio/logo_hgn.png';
                      }
                    }}
                  />
                </div>

                {/* Bottom: Countdown + 2 Bold CTAs */}
                <div className="space-y-3">
                  {/* Live Countdown Box */}
                  <div className="rounded-2xl bg-[#F0F6FF] dark:bg-slate-900 border-2 border-[#004AAD]/25 dark:border-slate-700 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black uppercase tracking-wider text-[#004AAD] dark:text-[#FFB800]">
                        BATAS PENGUMPULAN KARYA
                      </span>
                      <span className="text-[11px] font-mono font-bold text-slate-800 dark:text-slate-300">
                        21 Nov 2026 • 23:59 WIB
                      </span>
                    </div>

                    {timeLeft.expired ? (
                      <div className="py-2 px-3 rounded-xl bg-red-600 text-white text-xs font-extrabold flex items-center justify-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>PENDAFTARAN & PENGUMPULAN KARYA TELAH DITUTUP</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: 'HARI', val: timeLeft.days },
                          { label: 'JAM', val: timeLeft.hours },
                          { label: 'MENIT', val: timeLeft.minutes },
                          { label: 'DETIK', val: timeLeft.seconds }
                        ].map((unit, i) => (
                          <div
                            key={unit.label}
                            className={`rounded-xl py-2 px-2 text-center border-2 ${
                              i === 0
                                ? 'bg-[#004AAD] text-white border-[#003380]'
                                : 'bg-white dark:bg-slate-950 text-slate-950 dark:text-white border-[#004AAD]/30 dark:border-slate-700'
                            }`}
                          >
                            <div className="font-mono font-black text-xl sm:text-2xl leading-none tabular-nums">
                              {String(unit.val).padStart(2, '0')}
                            </div>
                            <div
                              className={`text-[10px] font-extrabold mt-1 tracking-wider ${
                                i === 0 ? 'text-[#FFD000]' : 'text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {unit.label}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Two Action Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={navigateToSubmissionForm}
                      className="py-3 px-4 rounded-xl font-black text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-[#FFD000] via-[#FFB800] to-[#FF9000] hover:brightness-105 border-2 border-[#B45309]/40 shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <span>KUMPULKAN KARYA</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={navigateToJuknisOverview}
                      className="py-3 px-4 rounded-xl font-black text-xs sm:text-sm text-white bg-[#004AAD] hover:bg-[#003B8E] border-2 border-[#003380] shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <FileText className="w-4 h-4 text-[#FFD000]" />
                      <span>LIHAT JUKNIS</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN (7 Cols): 7-Tab Interactive Information Command Center */}
              <div className="lg:col-span-7 flex flex-col justify-between rounded-3xl bg-white dark:bg-[#0d152a] border-2 border-[#004AAD]/25 dark:border-[#FFB800]/30 p-5 sm:p-6 shadow-[0_12px_32px_-8px_rgba(0,74,173,0.12)] overflow-hidden">
                {/* 7 Sub-Tabs Navigation Bar — Hidden on Mobile & Tablet because Floating Nav is active */}
                <div className="hidden lg:block shrink-0">
                  <div className="flex items-center gap-2 flex-wrap pb-3.5 border-b-2 border-slate-200 dark:border-slate-800">
                    {berandaTabsList.map((tab) => {
                      const Icon = tab.icon;
                      const active = tab.id === 'REKAP_SEKOLAH' ? showSchoolRecapModal : berandaTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            if (tab.id === 'REKAP_SEKOLAH') {
                              setShowSchoolRecapModal(true);
                            } else {
                              setBerandaTab(tab.id);
                            }
                          }}
                          className={`px-3 py-2 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 transition-all cursor-pointer border-2 whitespace-nowrap shrink-0 ${
                            active
                              ? 'bg-[#004AAD] text-white border-[#003380] dark:bg-[#FFB800] dark:text-slate-950 dark:border-[#FFB800] shadow-sm'
                              : tab.id === 'REKAP_SEKOLAH'
                              ? 'bg-[#FFFBEB] dark:bg-slate-900 text-[#B45309] dark:text-[#FFB800] border-[#F59E0B] hover:bg-[#FEF3C7]'
                              : 'bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-[#004AAD]'
                          }`}
                        >
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-[#FFD000] dark:text-slate-950' : 'text-[#004AAD] dark:text-[#FFB800]'}`} />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Active Tab Content Area (Fits cleanly without scrolling) */}
                <div className="flex-1 py-4 flex flex-col justify-between overflow-y-auto">
                  {berandaTab === 'PILAR' && (
                    <div className="h-full flex flex-col justify-between gap-4">
                      <div className="rounded-2xl bg-gradient-to-r from-[#004AAD] to-[#1D4ED8] text-white p-4 border-2 border-[#003380] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="text-[11px] font-black uppercase tracking-wider text-[#FFD000]">
                            FOKUS UTAMA KOMPETISI • {organizer}
                          </div>
                          <h2 className="font-display font-black text-lg sm:text-xl mt-0.5">
                            Apresiasi Praktik Baik & Inovasi Pembelajaran Mendalam
                          </h2>
                        </div>
                        <span className="px-3 py-1.5 rounded-lg bg-[#FFB800] text-slate-950 font-mono font-black text-xs shrink-0 self-start sm:self-auto">
                          ALUR STAR • 5–7 MENIT
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                        {[
                          {
                            icon: 'teacher' as const,
                            num: '01',
                            title: 'Karya Guru Inspiratif',
                            desc: 'Dokumentasi autentik berdurasi 5–7 menit yang menampilkan praktik nyata inovasi guru SD se-Kecamatan Beji.'
                          },
                          {
                            icon: 'book' as const,
                            num: '02',
                            title: 'Pembelajaran Mendalam',
                            desc: 'Integrasi utuh prinsip Joyful, Meaningful, dan Mindful Learning yang berpusat pada kebutuhan murid.'
                          },
                          {
                            icon: 'analytics' as const,
                            num: '03',
                            title: 'Kerangka Alur STAR',
                            desc: 'Penyajian sistematis mulai Situasi, Tantangan, Aksi inovatif, hingga Refleksi & testimoni dampak nyata.'
                          },
                          {
                            icon: 'trophy' as const,
                            num: '04',
                            title: 'Apresiasi Berprestasi',
                            desc: 'Penghargaan resmi FK3S Kec. Beji berupa Dana Pembinaan jutaan rupiah & Piagam Kehormatan.'
                          }
                        ].map((item) => (
                          <div
                            key={item.title}
                            className="rounded-2xl bg-[#F8FAFC] dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 p-4 flex flex-col justify-between hover:border-[#004AAD] dark:hover:border-[#FFB800] transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <Icon3D type={item.icon} size="md" />
                              <span className="px-2.5 py-1 rounded-md bg-[#004AAD]/10 dark:bg-[#FFB800]/15 text-[#004AAD] dark:text-[#FFB800] font-mono font-black text-xs">
                                PILAR {item.num}
                              </span>
                            </div>
                            <div className="mt-3">
                              <h3 className="font-display font-black text-base sm:text-lg text-slate-950 dark:text-white">
                                {item.title}
                              </h3>
                              <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1 leading-snug">
                                {item.desc}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {berandaTab === 'STAR' && (
                    <div className="h-full flex flex-col justify-between gap-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-black uppercase tracking-wider text-[#EA580C] dark:text-[#FFB800]">
                            PANDUAN SUBSTANSI KARYA GURU
                          </span>
                          <h2 className="font-display font-black text-xl text-slate-950 dark:text-white">
                            Sinergi Kerangka Alur STAR & Deep Learning
                          </h2>
                        </div>
                        <span className="px-3 py-1 rounded-lg bg-[#004AAD] text-white font-mono font-black text-xs self-start sm:self-auto">
                          BOBOT INTI: 75% PENILAIAN
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        {[
                          {
                            letter: 'S',
                            title: 'Situasi (Situation)',
                            desc: 'Kondisi awal kelas, latar belakang masalah pembelajaran, dan karakteristik murid di SD Anda.'
                          },
                          {
                            letter: 'T',
                            title: 'Tantangan (Task)',
                            desc: 'Hambatan spesifik yang dihadapi guru & murid serta target perubahan yang ingin dicapai.'
                          },
                          {
                            letter: 'A',
                            title: 'Aksi (Action)',
                            desc: 'Langkah nyata strategi inovasi, penggunaan media ajar kreatif, dan diferensiasi pembelajaran.'
                          },
                          {
                            letter: 'R',
                            title: 'Refleksi (Result)',
                            desc: 'Dampak nyata peningkatan belajar murid, refleksi guru, serta testimoni autentik siswa/rekan.'
                          }
                        ].map((s) => (
                          <div
                            key={s.letter}
                            className="rounded-2xl bg-[#F8FAFC] dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 p-3.5 flex flex-col justify-between"
                          >
                            <div>
                              <div className="w-9 h-9 rounded-xl bg-[#004AAD] text-[#FFD000] font-display font-black text-lg flex items-center justify-center mb-2.5 shadow-xs">
                                {s.letter}
                              </div>
                              <h3 className="font-display font-black text-sm text-slate-950 dark:text-white">
                                {s.title}
                              </h3>
                              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1 leading-snug">
                                {s.desc}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                          {
                            badge: 'MINDFUL LEARNING',
                            title: 'Pembelajaran Berkesadaran',
                            desc: 'Murid hadir utuh, fokus, dan memahami tujuan mengapa mereka mempelajari materi tersebut.'
                          },
                          {
                            badge: 'MEANINGFUL LEARNING',
                            title: 'Pembelajaran Bermakna',
                            desc: 'Materi dikaitkan langsung dengan kehidupan nyata murid di lingkungan Kecamatan Beji.'
                          },
                          {
                            badge: 'JOYFUL LEARNING',
                            title: 'Pembelajaran Menggembirakan',
                            desc: 'Suasana kelas interaktif, antusias, aman secara psikologis, dan memicu rasa ingin tahu.'
                          }
                        ].map((dl) => (
                          <div
                            key={dl.badge}
                            className="rounded-2xl bg-gradient-to-br from-[#FFFBEB] to-[#FEF3C7] dark:from-slate-900 dark:to-slate-900 border-2 border-[#F59E0B] p-3.5"
                          >
                            <span className="text-[10px] font-mono font-black text-[#D97706] dark:text-[#FFB800] uppercase">
                              {dl.badge}
                            </span>
                            <h4 className="font-display font-black text-sm text-slate-950 dark:text-white mt-0.5">
                              {dl.title}
                            </h4>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1 leading-snug">
                              {dl.desc}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {berandaTab === 'JADWAL' && (
                    <div className="h-full flex flex-col justify-between gap-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-black uppercase tracking-wider text-[#EA580C] dark:text-[#FFB800]">
                            AGENDA PELAKSANAAN RESMI
                          </span>
                          <h2 className="font-display font-black text-xl text-slate-950 dark:text-white">
                            Linimasa Kompetisi ({organizer})
                          </h2>
                        </div>
                        <span className="text-xs font-extrabold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200">
                          Zona Waktu: WIB
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                        {data.jadwal.map((item, idx) => (
                          <div
                            key={item.id}
                            className="rounded-2xl bg-[#F8FAFC] dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 p-4 flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="px-2.5 py-1 rounded-md bg-[#004AAD] text-white font-mono font-black text-xs">
                                  TAHAP 0{idx + 1}
                                </span>
                                <span className="font-mono font-extrabold text-xs text-[#EA580C] dark:text-[#FFB800]">
                                  {item.start_datetime}
                                  {item.end_datetime && item.end_datetime !== item.start_datetime
                                    ? ` – ${item.end_datetime}`
                                    : ''}
                                </span>
                              </div>
                              <h3 className="font-display font-black text-base sm:text-lg text-slate-950 dark:text-white">
                                {item.activity}
                              </h3>
                            </div>
                            <div className="mt-3 pt-2.5 border-t-2 border-slate-200 dark:border-slate-800 flex items-center gap-2 text-xs font-extrabold text-slate-800 dark:text-slate-200">
                              <MapPin className="w-4 h-4 text-[#E11D48] dark:text-[#FFB800] shrink-0" />
                              <span>{item.location}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {berandaTab === 'HADIAH' && (
                    <div className="h-full flex flex-col justify-between gap-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-black uppercase tracking-wider text-[#EA580C] dark:text-[#FFB800]">
                            APRESIASI & PENGHARGAAN
                          </span>
                          <h2 className="font-display font-black text-xl text-slate-950 dark:text-white">
                            Total 5 Kategori Pemenang Lomba Guru Inspiratif
                          </h2>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 flex-1">
                        {data.hadiah.map((item, idx) => (
                          <div
                            key={item.id}
                            className={`rounded-2xl p-4 border-2 flex flex-col justify-between ${
                              idx === 0
                                ? 'sm:col-span-3 bg-gradient-to-r from-[#FFFBEB] via-[#FEF3C7] to-[#FFFBEB] dark:from-amber-500/20 dark:to-slate-900 border-[#F59E0B] flex-row items-center'
                                : 'bg-[#F8FAFC] dark:bg-slate-900 border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-3.5">
                              <Icon3D type={idx < 3 ? 'trophy' : 'medal'} size="md" />
                              <div>
                                <span className="text-[11px] font-mono font-black uppercase text-[#004AAD] dark:text-[#FFB800]">
                                  PERINGKAT #{idx + 1}
                                </span>
                                <h3 className="font-display font-black text-lg text-slate-950 dark:text-white leading-tight">
                                  {item.rank}
                                </h3>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                                  {item.description || '+ Piagam Penghargaan Resmi'}
                                </p>
                              </div>
                            </div>
                            <div className={`${idx === 0 ? 'text-right' : 'mt-3 pt-2.5 border-t-2 border-slate-200 dark:border-slate-800 flex items-center justify-between'}`}>
                              {idx !== 0 && (
                                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                                  Dana Pembinaan:
                                </span>
                              )}
                              <div className="font-mono font-black text-lg sm:text-xl text-[#D97706] dark:text-[#FFB800] tabular-nums">
                                {formatRupiah(item.prize_amount)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {berandaTab === 'PENGUMUMAN' && (
                    <div className="h-full flex flex-col justify-between gap-4">
                      <div>
                        <span className="text-xs font-black uppercase tracking-wider text-[#EA580C] dark:text-[#FFB800]">
                          PAPAN INFORMASI RESMI
                        </span>
                        <h2 className="font-display font-black text-xl text-slate-950 dark:text-white">
                          Pengumuman Panitia {organizer}
                        </h2>
                      </div>

                      {data.pengumuman.length === 0 ? (
                        <div className="flex-1 rounded-2xl bg-[#F8FAFC] dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 p-8 flex items-center justify-center text-slate-800 dark:text-slate-200 font-bold text-sm">
                          Belum ada pengumuman terbaru yang dipublikasikan oleh panitia.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                          {data.pengumuman.map((ann) => (
                            <article
                              key={ann.announcement_id}
                              className="rounded-2xl bg-[#F8FAFC] dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 p-4 flex flex-col justify-between"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <span className="px-2.5 py-1 rounded-md bg-[#004AAD] text-white text-[11px] font-black uppercase">
                                    {ann.category}
                                  </span>
                                  <span className="font-mono font-bold text-xs text-slate-700 dark:text-slate-300">
                                    {ann.publication_date}
                                  </span>
                                </div>
                                <h3 className="font-display font-black text-base text-slate-950 dark:text-white mb-1.5">
                                  {ann.title}
                                </h3>
                                <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                                  {ann.content}
                                </p>
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {berandaTab === 'JUARA' && (
                    <div className="h-full flex flex-col justify-between gap-4">
                      {data.winners.length > 0 || data.top5.length > 0 ? (
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-xs font-black uppercase tracking-wider text-[#EA580C] dark:text-[#FFB800]">
                                KEPUTUSAN RESMI DEWAN JURI
                              </span>
                              <h2 className="font-display font-black text-xl text-slate-950 dark:text-white">
                                {data.winners.length > 0
                                  ? 'Daftar Pemenang Resmi HGN Beji 2026'
                                  : 'Daftar Finalis Top 5 HGN Beji 2026'}
                              </h2>
                            </div>
                          </div>

                          <div className="overflow-x-auto rounded-2xl border-2 border-slate-300 dark:border-slate-700">
                            <table className="w-full text-left border-collapse text-xs sm:text-sm">
                              <thead>
                                <tr className="bg-[#004AAD] text-white font-extrabold">
                                  <th className="py-2.5 px-3">Predikat</th>
                                  <th className="py-2.5 px-3">Nama Guru</th>
                                  <th className="py-2.5 px-3">Asal Sekolah</th>
                                  <th className="py-2.5 px-3">Judul Inovasi</th>
                                  <th className="py-2.5 px-3 text-right">Skor Akhir</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y-2 divide-slate-200 dark:divide-slate-800 font-bold">
                                {(data.winners.length > 0 ? data.winners : data.top5).map((row) => (
                                  <tr key={row.record_id} className="bg-white dark:bg-slate-900">
                                    <td className="py-2.5 px-3 font-black text-[#D97706] dark:text-[#FFB800]">
                                      {row.award_rank}
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-950 dark:text-white">
                                      {row.full_name}
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200">
                                      {row.school}
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200">
                                      {row.innovation_title}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700 dark:text-emerald-400">
                                      {Number(row.approved_score).toFixed(2)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 rounded-2xl bg-[#F8FAFC] dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 p-5 flex flex-col justify-between">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-slate-200 dark:border-slate-800">
                            <div className="flex items-start gap-3.5">
                              <Icon3D type="results" size="md" />
                              <div>
                                <span className="px-2.5 py-0.5 rounded-md bg-[#FFB800] text-slate-950 font-black text-[11px] uppercase">
                                  STATUS PUBLIKASI HASIL
                                </span>
                                <h3 className="font-display font-black text-lg sm:text-xl text-slate-950 dark:text-white mt-1">
                                  Menunggu Tahap Penilaian & Pengesahan Dewan Juri
                                </h3>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border-2 border-[#004AAD]/30 text-center">
                                <div className="font-mono font-black text-lg text-[#004AAD] dark:text-[#FFB800] leading-none">
                                  {data.stats?.total_participants || 0}
                                </div>
                                <div className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300 mt-0.5">
                                  KARYA MASUK
                                </div>
                              </div>
                              <div className="px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border-2 border-[#004AAD]/30 text-center">
                                <div className="font-mono font-black text-lg text-[#EA580C] dark:text-[#FFB800] leading-none">
                                  {data.stats?.total_schools || 0}
                                </div>
                                <div className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300 mt-0.5">
                                  SD PARTISIPAN
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                            <div className="rounded-xl bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-800 p-3.5">
                              <div className="text-xs font-black text-[#004AAD] dark:text-[#FFB800]">
                                TAHAP 1 • PENYISIHAN
                              </div>
                              <div className="font-display font-extrabold text-sm text-slate-950 dark:text-white mt-1">
                                Seleksi Karya & Dokumen Drive
                              </div>
                              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">
                                Menentukan 5 Finalis Terbaik (Top 5) pada 25 Nov 2026.
                              </p>
                            </div>
                            <div className="rounded-xl bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-800 p-3.5">
                              <div className="text-xs font-black text-[#EA580C] dark:text-[#FFB800]">
                                TAHAP 2 • BABAK FINAL
                              </div>
                              <div className="font-display font-extrabold text-sm text-slate-950 dark:text-white mt-1">
                                Presentasi & Wawancara Luring
                              </div>
                              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">
                                Paparan 10 menit + tanya jawab 15 menit pada 28 Nov 2026.
                              </p>
                            </div>
                            <div className="rounded-xl bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-800 p-3.5">
                              <div className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                                PENGESAHAN JUARA
                              </div>
                              <div className="font-display font-extrabold text-sm text-slate-950 dark:text-white mt-1">
                                Penetapan Juara 1, 2, 3 & Harapan
                              </div>
                              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">
                                Pengumuman resmi pada Puncak Peringatan HGN 2026.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {berandaTab === 'FAQ' && (
                    <div className="h-full flex flex-col justify-between gap-4">
                      <div>
                        <span className="text-xs font-black uppercase tracking-wider text-[#EA580C] dark:text-[#FFB800]">
                          PUSAT BANTUAN PESERTA
                        </span>
                        <h2 className="font-display font-black text-xl text-slate-950 dark:text-white">
                          Tanya Jawab Penting (FAQ) Lomba Guru Inspiratif 2026
                        </h2>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 flex-1">
                        {[
                          {
                            q: '1. Siapa saja yang berhak mengikuti lomba ini?',
                            a: 'Seluruh Guru Sekolah Dasar (SD) Negeri maupun Swasta di wilayah Kecamatan Beji, Kabupaten Pasuruan (Sekolah Minimal mengirimkan 1 Peserta dan Karya terbaik).'
                          },
                          {
                            q: '2. Apa saja yang wajib ada di dalam Folder Google Drive?',
                            a: 'Wajib memuat 3 dokumen utama: (1) Video Praktik Baik berdurasi 5–7 menit, (2) Modul Ajar / RPP Mendalam, dan (3) Dokumentasi Media Pembelajaran.'
                          },
                          {
                            q: '3. Bagaimana jika link Google Drive terkunci (Private)?',
                            a: 'Pastikan izin akses folder diubah menjadi "Siapa saja yang memiliki link dapat melihat" (Anyone with the link can view) agar Dewan Juri dapat menilai.'
                          },
                          {
                            q: '4. Apakah peserta boleh memperbarui link sebelum batas waktu?',
                            a: 'Boleh. Selama belum melewati batas waktu 21 November 2026 pukul 23:59 WIB, peserta dapat memperbarui dokumen di dalam folder Drive.'
                          }
                        ].map((faq) => (
                          <div
                            key={faq.q}
                            className="rounded-2xl bg-[#F8FAFC] dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 p-4 flex flex-col justify-between"
                          >
                            <div>
                              <h3 className="font-display font-black text-sm sm:text-base text-[#004AAD] dark:text-[#FFB800]">
                                {faq.q}
                              </h3>
                              <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1.5 leading-snug">
                                {faq.a}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {berandaTab === 'REKAP_SEKOLAH' && renderSchoolRecapWorkspace()}
                </div>

                {/* Bottom Footer Strip inside Right Panel */}
                <div className="shrink-0 pt-3 border-t-2 border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-extrabold text-slate-800 dark:text-slate-300">
                  <span>PENYELENGGARA RESMI: {organizer}</span>
                  <span className="font-mono text-[#004AAD] dark:text-[#FFB800]">
                    {tagline} • {hashtag}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* =================================================================
           * PAGE 2: JUKNIS & PENGUMPULAN KARYA PESERTA — 7 Interactive Tabs, Unframed FK3S Logo
           * ================================================================= */
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-4 lg:py-5 h-full flex flex-col justify-between gap-4">
            {/* TOP HEADER STRIP ON PAGE 2: Unframed FK3S Logo + 7 Sub-Tabs */}
            <div className="shrink-0 rounded-3xl bg-white dark:bg-[#0d152a] border-2 border-[#004AAD]/25 dark:border-[#FFB800]/30 p-4 sm:px-6 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Direct Unframed FK3S Logo on Page 2 */}
                <img
                  src={fk3sLogo}
                  alt="Logo FK3S Kec. Beji"
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 sm:w-15 sm:h-15 object-contain drop-shadow-md shrink-0"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    if (!img.src.includes('/assets/aistudio/logo_fk3s.png')) {
                      img.src = '/assets/aistudio/logo_fk3s.png';
                    }
                  }}
                />
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-[#EA580C] dark:text-[#FFB800]">
                    DOKUMEN RESMI PETUNJUK TEKNIS • {organizer}
                  </div>
                  <h1 className="font-display font-black text-lg sm:text-2xl text-[#004AAD] dark:text-white tracking-tight">
                    JUKNIS & PENGUMPULAN KARYA PESERTA
                  </h1>
                </div>
              </div>

              {/* Interactive Tabs for Page 2 — Hidden on Mobile & Tablet because Floating Nav is active */}
              <div className="hidden lg:flex items-center gap-2 flex-wrap">
                {juknisTabsList.map((tab) => {
                  const Icon = tab.icon;
                  const active = tab.id === 'REKAP_SEKOLAH' ? showSchoolRecapModal : juknisTab === tab.id;
                  const isForm = tab.id === 'FORMULIR';
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        if (tab.id === 'REKAP_SEKOLAH') {
                          setShowSchoolRecapModal(true);
                        } else {
                          setJuknisTab(tab.id);
                        }
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-black inline-flex items-center gap-1.5 transition-all cursor-pointer border-2 whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-[#004AAD] text-white border-[#003380] dark:bg-[#FFB800] dark:text-slate-950 dark:border-[#FFB800] shadow-sm'
                          : isForm
                          ? 'bg-[#FFD000] text-slate-950 border-[#B45309]/40 hover:brightness-105'
                          : tab.id === 'REKAP_SEKOLAH'
                          ? 'bg-[#FFFBEB] dark:bg-slate-900 text-[#B45309] dark:text-[#FFB800] border-[#F59E0B]'
                          : 'bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-[#004AAD]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ACTIVE TAB WORKSPACE ON PAGE 2 (Fits in single screen without scrolling) */}
            <div className="flex-1 rounded-3xl bg-white dark:bg-[#0d152a] border-2 border-[#004AAD]/25 dark:border-[#FFB800]/30 p-5 sm:p-6 shadow-[0_12px_32px_-8px_rgba(0,74,173,0.12)] overflow-y-auto flex flex-col justify-between">
              {/* TAB 1: BAB A, B, C (3 Columns Side-by-Side) */}
              {juknisTab === 'BAB_AC' && (
                <div className="h-full flex flex-col justify-between gap-4">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1">
                    {(['A', 'B', 'C'] as const).map((code, idx) => {
                      const sec = getJuknisSection(code);
                      const icons = ['book', 'teacher', 'security'] as const;
                      return (
                        <div
                          key={code}
                          className="rounded-2xl bg-[#F8FAFC] dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 p-5 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b-2 border-slate-200 dark:border-slate-800">
                              <div className="flex items-center gap-3">
                                <Icon3D type={icons[idx]} size="sm" />
                                <div>
                                  <span className="text-[11px] font-mono font-black text-[#EA580C] dark:text-[#FFB800]">
                                    BAB {code} • PETUNJUK TEKNIS
                                  </span>
                                  <h2 className="font-display font-black text-lg text-slate-950 dark:text-white leading-tight">
                                    {sec?.title || `Bab ${code}`}
                                  </h2>
                                </div>
                              </div>
                            </div>
                            <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-line">
                              {sec?.content}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: BAB D & E (Syarat Karya Drive & Struktur Video 5-7 Menit) */}
              {juknisTab === 'BAB_DE' && (
                <div className="h-full flex flex-col justify-between gap-4">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
                    {/* Bab D */}
                    <div className="lg:col-span-6 rounded-2xl bg-[#F8FAFC] dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-slate-200 dark:border-slate-800">
                          <Icon3D type="documents" size="md" />
                          <div>
                            <span className="text-xs font-mono font-black text-[#EA580C] dark:text-[#FFB800]">
                              BAB D • KETENTUAN KARYA & DOKUMEN DRIVE
                            </span>
                            <h2 className="font-display font-black text-xl text-slate-950 dark:text-white">
                              {getJuknisSection('D')?.title || 'Ketentuan Karya'}
                            </h2>
                          </div>
                        </div>
                        <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-line">
                          {getJuknisSection('D')?.content}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2.5 pt-3 border-t-2 border-slate-200 dark:border-slate-800">
                        <div className="rounded-xl bg-[#004AAD] text-white p-3 text-center">
                          <div className="font-mono font-black text-sm text-[#FFD000]">DOKUMEN 1</div>
                          <div className="text-xs font-extrabold mt-0.5">Video 5–7 Menit</div>
                        </div>
                        <div className="rounded-xl bg-[#004AAD] text-white p-3 text-center">
                          <div className="font-mono font-black text-sm text-[#FFD000]">DOKUMEN 2</div>
                          <div className="text-xs font-extrabold mt-0.5">Modul Ajar</div>
                        </div>
                        <div className="rounded-xl bg-[#004AAD] text-white p-3 text-center">
                          <div className="font-mono font-black text-sm text-[#FFD000]">DOKUMEN 3</div>
                          <div className="text-xs font-extrabold mt-0.5">Media Ajar</div>
                        </div>
                      </div>
                    </div>

                    {/* Bab E */}
                    <div className="lg:col-span-6 rounded-2xl bg-[#F8FAFC] dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-slate-200 dark:border-slate-800">
                          <Icon3D type="video" size="md" />
                          <div>
                            <span className="text-xs font-mono font-black text-[#EA580C] dark:text-[#FFB800]">
                              BAB E • KOMPOSISI DURASI & ALUR STAR
                            </span>
                            <h2 className="font-display font-black text-xl text-slate-950 dark:text-white">
                              {getJuknisSection('E')?.title || 'Struktur Video'}
                            </h2>
                          </div>
                        </div>
                        <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-line">
                          {getJuknisSection('E')?.content}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2.5 pt-3 border-t-2 border-slate-200 dark:border-slate-800">
                        <div className="rounded-xl bg-amber-500/15 border-2 border-amber-500 p-3 text-center">
                          <div className="font-mono font-black text-xs text-[#D97706] dark:text-[#FFB800]">
                            PEMBUKA
                          </div>
                          <div className="font-black text-sm text-slate-950 dark:text-white mt-0.5">
                            30–45 Detik
                          </div>
                        </div>
                        <div className="rounded-xl bg-amber-500/15 border-2 border-amber-500 p-3 text-center">
                          <div className="font-mono font-black text-xs text-[#D97706] dark:text-[#FFB800]">
                            INTI (ALUR STAR)
                          </div>
                          <div className="font-black text-sm text-slate-950 dark:text-white mt-0.5">
                            4–5,5 Menit
                          </div>
                        </div>
                        <div className="rounded-xl bg-amber-500/15 border-2 border-amber-500 p-3 text-center">
                          <div className="font-mono font-black text-xs text-[#D97706] dark:text-[#FFB800]">
                            PENUTUP
                          </div>
                          <div className="font-black text-sm text-slate-950 dark:text-white mt-0.5">
                            30–45 Detik
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: BAB F (Mekanisme Pengumpulan & 2 Tahap Seleksi) */}
              {juknisTab === 'BAB_F' && (
                <div className="h-full flex flex-col justify-between gap-5">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
                    <div className="lg:col-span-6 rounded-2xl bg-[#F8FAFC] dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-slate-200 dark:border-slate-800">
                          <Icon3D type="judging" size="md" />
                          <div>
                            <span className="text-xs font-mono font-black text-[#EA580C] dark:text-[#FFB800]">
                              BAB F • MEKANISME & TAHAPAN SELEKSI
                            </span>
                            <h2 className="font-display font-black text-xl text-slate-950 dark:text-white">
                              {getJuknisSection('F')?.title || 'Mekanisme Pengumpulan dan Seleksi'}
                            </h2>
                          </div>
                        </div>
                        <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-line">
                          {getJuknisSection('F')?.content}
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-6 flex flex-col justify-between gap-4">
                      <div className="rounded-2xl bg-[#004AAD] text-white p-5 border-2 border-[#003380] flex-1 flex flex-col justify-center">
                        <span className="text-xs font-mono font-black text-[#FFD000] uppercase">
                          SELEKSI TAHAP 1 • DARING (ONLINE)
                        </span>
                        <h3 className="font-display font-black text-xl mt-1">
                          Babak Penyisihan — Penentuan 5 Finalis (Top 5)
                        </h3>
                        <p className="text-xs sm:text-sm font-semibold text-blue-100 mt-2 leading-relaxed">
                          Dewan Juri menilai seluruh karya video, modul ajar, dan dokumentasi media pembelajaran yang diunggah peserta melalui Google Drive untuk menetapkan 5 Karya Terbaik.
                        </p>
                      </div>

                      <div className="rounded-2xl bg-gradient-to-r from-[#FFFBEB] to-[#FEF3C7] dark:from-slate-900 dark:to-slate-900 border-2 border-[#F59E0B] p-5 flex-1 flex flex-col justify-center">
                        <span className="text-xs font-mono font-black text-[#D97706] dark:text-[#FFB800] uppercase">
                          SELEKSI TAHAP 2 • LURING (TATAP MUKA)
                        </span>
                        <h3 className="font-display font-black text-xl text-slate-950 dark:text-white mt-1">
                          Babak Final — Presentasi 10 Menit & Tanya Jawab 15 Menit
                        </h3>
                        <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mt-2 leading-relaxed">
                          5 Finalis terpilih mempresentasikan inovasi pembelajarannya secara langsung di hadapan Dewan Juri untuk menentukan Juara 1, Juara 2, Juara 3, Harapan 1, dan Harapan 2.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: BAB G (Bobot & Rubrik Kriteria Penilaian) */}
              {juknisTab === 'BAB_G' && (
                <div className="h-full flex flex-col justify-between gap-5">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
                    <div className="lg:col-span-6 rounded-2xl bg-[#F8FAFC] dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-slate-200 dark:border-slate-800">
                          <Icon3D type="analytics" size="md" />
                          <div>
                            <span className="text-xs font-mono font-black text-[#EA580C] dark:text-[#FFB800]">
                              BAB G • INSTRUMEN PENILAIAN DEWAN JURI
                            </span>
                            <h2 className="font-display font-black text-xl text-slate-950 dark:text-white">
                              Komposisi Bobot Kriteria Penilaian (0–100)
                            </h2>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {[
                            {
                              name: '1. Pedagogik dan Inovasi Pembelajaran',
                              weight: 40,
                              barColor: 'bg-[#004AAD] dark:bg-[#38BDF8]',
                              badgeColor: 'bg-[#004AAD] text-white',
                              desc: 'Relevansi kebutuhan murid, integrasi Joyful, Meaningful, dan Mindful Learning, serta kelengkapan Modul Ajar & Media.'
                            },
                            {
                              name: '2. Dampak / Hasil Nyata (Alur STAR)',
                              weight: 35,
                              barColor: 'bg-[#F59E0B]',
                              badgeColor: 'bg-[#F59E0B] text-slate-950',
                              desc: 'Kejelasan Situasi, Tantangan, Aksi, dan Refleksi (STAR), bukti perubahan nyata di kelas, serta testimoni autentik.'
                            },
                            {
                              name: '3. Kualitas Teknis Video & Penyajian',
                              weight: 25,
                              barColor: 'bg-[#E11D48]',
                              badgeColor: 'bg-[#E11D48] text-white',
                              desc: 'Ketepatan durasi 5–7 menit, kejelasan resolusi visual & kejernihan audio, kerapian alur editing & narasi.'
                            }
                          ].map((crit) => (
                            <div key={crit.name} className="rounded-xl bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 p-3.5">
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="font-display font-black text-sm text-slate-950 dark:text-white">
                                  {crit.name}
                                </span>
                                <span className={`px-2.5 py-0.5 rounded-md font-mono font-black text-xs ${crit.badgeColor}`}>
                                  BOBOT {crit.weight}%
                                </span>
                              </div>
                              <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden mb-2">
                                <div className={`h-full rounded-full ${crit.barColor}`} style={{ width: `${crit.weight}%` }} />
                              </div>
                              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                {crit.desc}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-6 rounded-2xl bg-[#F8FAFC] dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 p-5 flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-mono font-black text-[#004AAD] dark:text-[#FFB800]">
                          RINCIAN TEKS BAB G & RUMUS NILAI AKHIR
                        </span>
                        <h3 className="font-display font-black text-xl text-slate-950 dark:text-white mt-1 mb-3">
                          Ketentuan Perhitungan Nilai Tertimbang
                        </h3>
                        <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-line">
                          {getJuknisSection('G')?.content}
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl bg-[#004AAD] text-white p-4 border-2 border-[#003380]">
                        <div className="text-xs font-mono font-black text-[#FFD000] uppercase">
                          RUMUS OTOMATIS SISTEM PENJURIAN DIGITAL
                        </div>
                        <div className="font-mono font-black text-sm sm:text-base mt-1">
                          Nilai Akhir = (Pedagogik × 40%) + (Dampak × 35%) + (Video × 25%)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: BAB H (Tabel Apresiasi & Hadiah Pemenang) */}
              {juknisTab === 'BAB_H' && (
                <div className="h-full flex flex-col justify-between gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-mono font-black text-[#EA580C] dark:text-[#FFB800]">
                        BAB H • APRESIASI & PENGHARGAAN PEMENANG
                      </span>
                      <h2 className="font-display font-black text-xl text-slate-950 dark:text-white">
                        Rincian Dana Pembinaan & Piagam Penghargaan Resmi ({organizer})
                      </h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 flex-1">
                    {data.hadiah.map((h, idx) => (
                      <div
                        key={h.id}
                        className={`rounded-2xl p-5 border-2 flex flex-col justify-between ${
                          idx === 0
                            ? 'bg-gradient-to-b from-[#FFFBEB] to-[#FEF3C7] dark:from-amber-500/20 dark:to-slate-900 border-[#F59E0B]'
                            : 'bg-[#F8FAFC] dark:bg-slate-900 border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <Icon3D type={idx < 3 ? 'trophy' : 'medal'} size="md" />
                            <span className="px-2.5 py-1 rounded-md bg-[#004AAD] text-white font-mono font-black text-xs">
                              #{idx + 1}
                            </span>
                          </div>
                          <h3 className="font-display font-black text-xl text-slate-950 dark:text-white">
                            {h.rank}
                          </h3>
                          <div className="font-mono font-black text-xl text-[#D97706] dark:text-[#FFB800] mt-2 tabular-nums">
                            {formatRupiah(h.prize_amount)}
                          </div>
                        </div>
                        <div className="pt-3 border-t-2 border-slate-200 dark:border-slate-800 text-xs font-extrabold text-slate-800 dark:text-slate-200">
                          {h.description || '+ Piagam Penghargaan Resmi FK3S Kec. Beji'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 6: PANDUAN & CHECKLIST GOOGLE DRIVE */}
              {juknisTab === 'PANDUAN_DRIVE' && (
                <div className="h-full flex flex-col justify-between gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-mono font-black text-[#EA580C] dark:text-[#FFB800]">
                        PANDUAN TEKNIS UNGGAH BERKAS
                      </span>
                      <h2 className="font-display font-black text-xl text-slate-950 dark:text-white">
                        Checklist Wajib Folder Google Drive Sebelum Kirim Karya
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setJuknisTab('FORMULIR')}
                      className="px-4 py-2 rounded-xl text-xs font-black bg-[#FFD000] text-slate-950 border-2 border-[#B45309]/40 inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                    >
                      <span>LANJUT KE FORMULIR</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                    {[
                      {
                        step: 'LANGKAH 01',
                        icon: 'drive' as const,
                        title: 'Buat 1 Folder Khusus di Google Drive',
                        items: [
                          'Beri nama folder: HGN2026_NamaGuru_AsalSD',
                          'Masukkan 3 file wajib ke dalam folder tersebut',
                          'Pastikan seluruh file sudah selesai terunggah 100%'
                        ]
                      },
                      {
                        step: 'LANGKAH 02',
                        icon: 'documents' as const,
                        title: 'Pastikan 3 File Wajib Tersedia',
                        items: [
                          '1. File Video Praktik Baik (MP4, durasi 5–7 menit)',
                          '2. File Modul Ajar / RPP Pembelajaran Mendalam (PDF)',
                          '3. File Dokumentasi Media Pembelajaran (PDF/Foto/Slide)'
                        ]
                      },
                      {
                        step: 'LANGKAH 03',
                        icon: 'security' as const,
                        title: 'Buka Akses Link (Anyone With The Link)',
                        items: [
                          'Klik kanan pada Folder Drive -> Bagikan (Share)',
                          'Pada Akses Umum pilih: "Siapa saja yang memiliki link"',
                          'Pastikan peran diatur sebagai "Pelihat" (Viewer) lalu Salin Link'
                        ]
                      }
                    ].map((st) => (
                      <div
                        key={st.step}
                        className="rounded-2xl bg-[#F8FAFC] dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 p-5 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <Icon3D type={st.icon} size="sm" />
                            <span className="px-2.5 py-1 rounded-md bg-[#004AAD] text-white font-mono font-black text-xs">
                              {st.step}
                            </span>
                          </div>
                          <h3 className="font-display font-black text-base sm:text-lg text-slate-950 dark:text-white mb-3">
                            {st.title}
                          </h3>
                          <ul className="space-y-2">
                            {st.items.map((it) => (
                              <li key={it} className="flex items-start gap-2 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                <span>{it}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 7: GRAFIK BATANG & REKAP PESERTA PER SEKOLAH */}
              {juknisTab === 'REKAP_SEKOLAH' && renderSchoolRecapWorkspace()}

              {/* TAB 8: FORMULIR PENGUMPULAN KARYA (Compact 3-Column Grid — Zero Scroll!) */}
              {juknisTab === 'FORMULIR' && (
                <div className="h-full flex flex-col justify-between">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b-2 border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <Icon3D type="drive" size="sm" />
                      <div>
                        <h2 className="font-display font-black text-lg sm:text-xl text-slate-950 dark:text-white">
                          Formulir Resmi Pengumpulan Karya Peserta ({organizer})
                        </h2>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Pastikan Folder Google Drive diatur ke &quot;Siapa saja yang memiliki link dapat melihat&quot; (Anyone with the link can view).
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1.5 rounded-lg bg-[#004AAD] text-white font-mono font-black text-xs shrink-0 self-start sm:self-auto">
                      BATAS: 21 NOV 2026 • 23:59 WIB
                    </span>
                  </div>

                  {timeLeft.expired || !submissionEnabled ? (
                    <div className="my-auto rounded-2xl bg-red-50 dark:bg-red-950/60 border-2 border-red-500 p-8 text-center space-y-2">
                      <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-400 mx-auto" />
                      <h3 className="font-display font-black text-xl text-slate-950 dark:text-white">
                        Pendaftaran dan Pengumpulan Karya Telah Ditutup.
                      </h3>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        Periode penerimaan karya {siteTitle} {organizer} telah berakhir.
                      </p>
                    </div>
                  ) : submissionMode === 'GOOGLE_FORM' && externalFormUrl ? (
                    <div className="my-auto rounded-2xl bg-[#F8FAFC] dark:bg-slate-900 border-2 border-[#004AAD] p-8 text-center space-y-4">
                      <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white max-w-xl mx-auto">
                        Panitia mengaktifkan pengumpulan karya melalui Google Form resmi {organizer}. Klik tombol di bawah ini untuk membuka formulir:
                      </p>
                      <a
                        href={externalFormUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-7 py-3.5 rounded-xl font-black text-sm text-white bg-[#004AAD] hover:bg-[#003B8E] inline-flex items-center gap-2 shadow-md"
                      >
                        <span>BUKA FORMULIR GOOGLE FORM</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  ) : (
                    <form onSubmit={handleInternalSubmit} className="pt-3 flex-1 flex flex-col justify-between gap-3">
                      {submitResult && (
                        <div
                          className={`rounded-xl px-4 py-2.5 border-2 flex items-center justify-between gap-3 ${
                            submitResult.type === 'success'
                              ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-600 text-emerald-950 dark:text-emerald-100'
                              : 'bg-red-50 dark:bg-red-950/70 border-red-600 text-red-950 dark:text-red-100'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-extrabold">
                            {submitResult.type === 'success' ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                            )}
                            <span>{submitResult.message}</span>
                          </div>
                          {submitResult.participantId && (
                            <span className="px-3 py-1 rounded-lg bg-emerald-700 text-white font-mono font-black text-xs shrink-0">
                              ID: {submitResult.participantId}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Compact 3-Column Form Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                        <div>
                          <label className="block text-xs font-black text-slate-950 dark:text-white mb-1">
                            1. Nama Lengkap Guru & Gelar <span className="text-red-600">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={formState.full_name}
                            onChange={(e) => setFormState({ ...formState, full_name: e.target.value })}
                            placeholder="Contoh: Siti Aminah, S.Pd."
                            className="w-full rounded-xl bg-[#F8FAFC] dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 focus:border-[#004AAD] dark:focus:border-[#FFB800] focus:outline-none px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-black text-slate-950 dark:text-white mb-1">
                            2. Pilih Asal Sekolah (Sheet SEKOLAH DB) <span className="text-red-600">*</span>
                          </label>
                          <select
                            required
                            value={formState.school}
                            onChange={(e) => setFormState({ ...formState, school: e.target.value })}
                            className="w-full rounded-xl bg-[#F8FAFC] dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 focus:border-[#004AAD] dark:focus:border-[#FFB800] focus:outline-none px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 dark:text-white cursor-pointer"
                          >
                            <option value="">-- Pilih Nama Sekolah (Database SEKOLAH) --</option>
                            {schoolsList.map((sch) => (
                              <option key={sch.school_id} value={sch.school_name}>
                                {sch.school_name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-black text-slate-950 dark:text-white mb-1">
                            3. Nomor WhatsApp Aktif <span className="text-red-600">*</span>
                          </label>
                          <input
                            type="tel"
                            required
                            value={formState.whatsapp}
                            onChange={(e) => setFormState({ ...formState, whatsapp: e.target.value })}
                            placeholder="Contoh: 081234567890"
                            className="w-full rounded-xl bg-[#F8FAFC] dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 focus:border-[#004AAD] dark:focus:border-[#FFB800] focus:outline-none px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 dark:text-white"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs font-black text-slate-950 dark:text-white mb-1">
                            4. Judul Inovasi Pembelajaran (Alur STAR) <span className="text-red-600">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={formState.innovation_title}
                            onChange={(e) => setFormState({ ...formState, innovation_title: e.target.value })}
                            placeholder="Masukkan judul karya praktik baik / inovasi pembelajaran mendalam Anda"
                            className="w-full rounded-xl bg-[#F8FAFC] dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 focus:border-[#004AAD] dark:focus:border-[#FFB800] focus:outline-none px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-black text-[#004AAD] dark:text-[#FFB800] mb-1">
                            5. Link Folder Google Drive Utama (Wajib) <span className="text-red-600">*</span>
                          </label>
                          <input
                            type="url"
                            required
                            value={formState.drive_folder_url}
                            onChange={(e) => setFormState({ ...formState, drive_folder_url: e.target.value })}
                            placeholder="https://drive.google.com/drive/folders/..."
                            className="w-full rounded-xl bg-[#F0F6FF] dark:bg-slate-900 border-2 border-[#004AAD] dark:border-[#FFB800] focus:outline-none px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1">
                            6. Link File Video 5–7 Menit (Opsional / Langsung)
                          </label>
                          <input
                            type="url"
                            value={formState.video_url}
                            onChange={(e) => setFormState({ ...formState, video_url: e.target.value })}
                            placeholder="https://drive.google.com/file/d/..."
                            className="w-full rounded-xl bg-[#F8FAFC] dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 focus:border-[#004AAD] focus:outline-none px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1">
                            7. Link File Modul Ajar (Opsional / Langsung)
                          </label>
                          <input
                            type="url"
                            value={formState.lesson_module_url}
                            onChange={(e) => setFormState({ ...formState, lesson_module_url: e.target.value })}
                            placeholder="https://drive.google.com/file/d/..."
                            className="w-full rounded-xl bg-[#F8FAFC] dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 focus:border-[#004AAD] focus:outline-none px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1">
                            8. Link Dokumentasi Media Ajar (Opsional)
                          </label>
                          <input
                            type="url"
                            value={formState.learning_media_url}
                            onChange={(e) => setFormState({ ...formState, learning_media_url: e.target.value })}
                            placeholder="https://drive.google.com/file/d/..."
                            className="w-full rounded-xl bg-[#F8FAFC] dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 focus:border-[#004AAD] focus:outline-none px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 dark:text-white"
                          />
                        </div>
                      </div>

                      {/* Consent & Submit Bar */}
                      <div className="pt-2 border-t-2 border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <label className="flex items-center gap-2.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            required
                            checked={formState.consent}
                            onChange={(e) => setFormState({ ...formState, consent: e.target.checked })}
                            className="w-4 h-4 rounded border-2 border-slate-400 text-[#004AAD] focus:ring-[#004AAD]"
                          />
                          <span className="text-xs font-extrabold text-slate-900 dark:text-slate-200">
                            Saya menyatakan karya ini orisinal, belum pernah menjuarai lomba sejenis, dan akses Drive telah dibuka.
                          </span>
                        </label>

                        <button
                          type="submit"
                          disabled={submitting}
                          className="px-7 py-3 rounded-xl font-black text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-[#FFD000] via-[#FFB800] to-[#FF9000] hover:brightness-105 disabled:opacity-50 border-2 border-[#B45309]/40 shadow-md inline-flex items-center justify-center gap-2 cursor-pointer shrink-0"
                        >
                          <Send className="w-4 h-4" />
                          <span>{submitting ? 'MENGIRIM KARYA...' : 'KIRIM KARYA SEKARANG'}</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* =====================================================================
       * RESPONSIVE FLOATING NAVIGATION BAR (Mobile & Tablet — lg:hidden)
       * Locked in place (tetap melayang & tidak ikut tergeser saat scroll/klik!)
       * ===================================================================== */}
      <div className="fixed bottom-2.5 inset-x-0 z-50 lg:hidden px-2.5 pointer-events-none select-none">
        <div className="pointer-events-auto max-w-xl w-full mx-auto rounded-2xl bg-white/98 dark:bg-[#0a1122]/98 backdrop-blur-xl border-2 border-[#004AAD] dark:border-[#FFB800] shadow-[0_14px_36px_rgba(0,74,173,0.38)] p-2 space-y-1.5 overflow-hidden">
          {/* Fixed 4-Column Sub-Tab Grid (Never scrolls or shifts horizontally) */}
          <div className="grid grid-cols-4 gap-1 pb-1.5 border-b border-slate-200 dark:border-slate-800">
            {(activePage === 'BERANDA' ? berandaTabsList : juknisTabsList).map((tab) => {
              const Icon = tab.icon;
              const active =
                tab.id === 'REKAP_SEKOLAH'
                  ? showSchoolRecapModal
                  : activePage === 'BERANDA'
                  ? berandaTab === tab.id
                  : juknisTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    if (tab.id === 'REKAP_SEKOLAH') {
                      setShowSchoolRecapModal(true);
                    } else if (activePage === 'BERANDA') {
                      setBerandaTab(tab.id as BerandaTab);
                      scrollToTop();
                    } else {
                      setJuknisTab(tab.id as JuknisTab);
                      scrollToTop();
                    }
                  }}
                  className={`px-1.5 py-1.5 rounded-xl text-[10px] sm:text-[11px] font-black inline-flex items-center justify-center gap-1 transition-colors cursor-pointer border truncate ${
                    active
                      ? 'bg-[#004AAD] text-white border-[#003380] dark:bg-[#FFB800] dark:text-slate-950 dark:border-[#FFB800]'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                  }`}
                >
                  <Icon
                    className={`w-3 h-3 shrink-0 ${
                      active ? 'text-[#FFD000] dark:text-slate-950' : 'text-[#004AAD] dark:text-[#FFB800]'
                    }`}
                  />
                  <span className="truncate">{tab.shortLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Main Floating Page Switcher Row (Fixed 5-Column Grid) */}
          <div className="grid grid-cols-5 gap-1">
            <button
              type="button"
              onClick={() => {
                setShowSchoolRecapModal(false);
                setActivePage('BERANDA');
                scrollToTop();
              }}
              className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                activePage === 'BERANDA' && !showSchoolRecapModal
                  ? 'bg-[#004AAD] text-white dark:bg-[#FFB800] dark:text-slate-950 shadow-xs'
                  : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              <Home className="w-4 h-4 shrink-0" />
              <span className="text-[10px] font-black leading-tight truncate">Beranda</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowSchoolRecapModal(false);
                setActivePage('JUKNIS');
                if (juknisTab === 'FORMULIR') setJuknisTab('BAB_AC');
                scrollToTop();
              }}
              className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                activePage === 'JUKNIS' && juknisTab !== 'FORMULIR' && !showSchoolRecapModal
                  ? 'bg-[#004AAD] text-white dark:bg-[#FFB800] dark:text-slate-950 shadow-xs'
                  : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span className="text-[10px] font-black leading-tight truncate">Juknis</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSchoolRecapModal(true)}
              className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                showSchoolRecapModal
                  ? 'bg-[#004AAD] text-white dark:bg-[#FFB800] dark:text-slate-950 shadow-xs'
                  : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              <BarChart3 className="w-4 h-4 shrink-0 text-[#EA580C] dark:text-[#FFB800]" />
              <span className="text-[10px] font-black leading-tight truncate">Rekap SD</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowSchoolRecapModal(false);
                navigateToSubmissionForm();
              }}
              className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                activePage === 'JUKNIS' && juknisTab === 'FORMULIR' && !showSchoolRecapModal
                  ? 'bg-[#004AAD] text-white dark:bg-[#FFB800] dark:text-slate-950 shadow-xs'
                  : 'bg-[#FFD000]/90 text-slate-950'
              }`}
            >
              <Send className="w-4 h-4 shrink-0" />
              <span className="text-[10px] font-black leading-tight truncate">Kirim Karya</span>
            </button>

            <button
              type="button"
              onClick={onOpenJuryPortal}
              className="py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
            >
              <Gavel className="w-4 h-4 shrink-0 text-[#004AAD] dark:text-[#FFB800]" />
              <span className="text-[10px] font-black leading-tight truncate">Portal Juri</span>
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
       * POP-UP HALAMAN REKAP & STATISTIK SEKOLAH SE-KECAMATAN BEJI
       * (Triggered whenever "Rekap Sekolah" is clicked!)
       * ===================================================================== */}
      {showSchoolRecapModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 lg:p-6 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSchoolRecapModal(false);
          }}
        >
          <div className="w-full max-w-[1400px] max-h-[94vh] rounded-3xl bg-white dark:bg-[#0a1122] border-2 border-[#004AAD] dark:border-[#FFB800] shadow-[0_24px_64px_rgba(0,0,0,0.45)] flex flex-col overflow-hidden">
            {/* POP-UP TOP HEADER BAR */}
            <div className="shrink-0 bg-gradient-to-r from-[#004AAD] via-[#003B8E] to-[#1E3A8A] text-white px-4 sm:px-6 py-4 border-b-2 border-[#FFB800]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <img
                  src={fk3sLogo}
                  alt="Logo FK3S Kec. Beji"
                  referrerPolicy="no-referrer"
                  className="w-11 h-11 sm:w-12 sm:h-12 object-contain drop-shadow-md shrink-0"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    if (!img.src.includes('/assets/aistudio/logo_fk3s.png')) {
                      img.src = '/assets/aistudio/logo_fk3s.png';
                    }
                  }}
                />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#FFD000] text-slate-950 font-mono font-black text-[10px] uppercase">
                      DATABASE SHEET SEKOLAH • REALTIME
                    </span>
                    <span className="text-xs font-extrabold text-amber-200">
                      KEC. BEJI • KAB. PASURUAN • PROV. JAWA TIMUR
                    </span>
                  </div>
                  <h2 className="font-display font-black text-lg sm:text-2xl tracking-tight text-white mt-0.5">
                    Grafik Batang, Statistik & Rekap Peserta Per Sekolah ({organizer})
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowSchoolRecapModal(false);
                    navigateToSubmissionForm();
                  }}
                  className="px-4 py-2.5 rounded-xl font-black text-xs text-slate-950 bg-gradient-to-r from-[#FFD000] via-[#FFB800] to-[#FF9000] hover:brightness-105 border-2 border-white/30 shadow-md inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>+ KUMPULKAN KARYA</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSchoolRecapModal(false)}
                  title="Tutup Halaman Pop-Up Rekap Sekolah"
                  className="px-3.5 py-2.5 rounded-xl font-black text-xs bg-red-600 hover:bg-red-700 text-white border-2 border-red-400/40 inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <X className="w-4 h-4" />
                  <span>TUTUP</span>
                </button>
              </div>
            </div>

            {/* POP-UP SCROLLABLE BODY */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-[#F8FAFC] dark:bg-[#070b14]">
              {/* SECTION 1: 5 KARTU STATISTIK UTAMA & CAPAIAN PARTISIPASI */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-[#004AAD]/30 dark:border-slate-700 p-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-black uppercase text-[#004AAD] dark:text-[#FFB800]">
                      1. TOTAL SEKOLAH (DB)
                    </span>
                    <Building2 className="w-4 h-4 text-[#004AAD] dark:text-[#FFB800]" />
                  </div>
                  <div className="font-mono font-black text-2xl sm:text-3xl text-slate-950 dark:text-white mt-1 tabular-nums">
                    {schoolRecapData.totalRegisteredSchools} <span className="text-sm font-bold">SD</span>
                  </div>
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mt-1">
                    {schoolRecapData.negeriCount} SD Negeri • {schoolRecapData.swastaCount} SD Swasta
                  </div>
                </div>

                <div className="rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border-2 border-emerald-500/50 p-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-black uppercase text-emerald-800 dark:text-emerald-300">
                      2. SD SUDAH MENGIRIM
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="font-mono font-black text-2xl sm:text-3xl text-emerald-700 dark:text-emerald-400 tabular-nums">
                      {schoolRecapData.submittedSchoolsCount} <span className="text-sm font-bold">SD</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-mono font-black text-xs">
                      {schoolRecapData.participationRate}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-emerald-200 dark:bg-emerald-950 overflow-hidden mt-2">
                    <div
                      className="h-full rounded-full bg-emerald-600 dark:bg-emerald-400 transition-all duration-300"
                      style={{ width: `${Math.max(4, schoolRecapData.participationRate)}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-2xl bg-amber-50/90 dark:bg-amber-950/30 border-2 border-[#F59E0B]/50 p-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-black uppercase text-[#B45309] dark:text-[#FFB800]">
                      3. SD BELUM MENGIRIM
                    </span>
                    <AlertCircle className="w-4 h-4 text-[#D97706] dark:text-[#FFB800]" />
                  </div>
                  <div className="font-mono font-black text-2xl sm:text-3xl text-[#B45309] dark:text-[#FFB800] mt-1 tabular-nums">
                    {schoolRecapData.emptySchoolsCount} <span className="text-sm font-bold">SD</span>
                  </div>
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mt-1">
                    Wajib min. 1 Guru Perwakilan / SD
                  </div>
                </div>

                <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-[#004AAD]/30 dark:border-slate-700 p-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-black uppercase text-[#004AAD] dark:text-[#FFB800]">
                      4. TOTAL KARYA GURU
                    </span>
                    <Users className="w-4 h-4 text-[#004AAD] dark:text-[#FFB800]" />
                  </div>
                  <div className="font-mono font-black text-2xl sm:text-3xl text-[#004AAD] dark:text-[#FFB800] mt-1 tabular-nums">
                    {publicParticipants.length} <span className="text-sm font-bold">Karya</span>
                  </div>
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mt-1">
                    Inovasi Pembelajaran Mendalam
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1 rounded-2xl bg-white dark:bg-slate-900 border-2 border-[#004AAD]/30 dark:border-slate-700 p-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-black uppercase text-[#EA580C] dark:text-[#FFB800]">
                      5. SEBARAN WILAYAH
                    </span>
                    <MapPin className="w-4 h-4 text-[#EA580C] dark:text-[#FFB800]" />
                  </div>
                  <div className="font-mono font-black text-2xl sm:text-3xl text-slate-950 dark:text-white mt-1 tabular-nums">
                    {schoolRecapData.villageStats.length} <span className="text-sm font-bold">Desa/Kel</span>
                  </div>
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mt-1">
                    Kec. Beji • Batas 21 Nov 2026
                  </div>
                </div>
              </div>

              {/* SECTION 2: PENCARIAN PINTAR & FILTER MULTI-DIMENSI */}
              <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 p-4 shadow-xs space-y-3">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                  {/* Search Box */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-[#004AAD] dark:text-[#FFB800] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={schoolSearch}
                      onChange={(e) => setSchoolSearch(e.target.value)}
                      placeholder={`Cari Nama SD (contoh: ${schoolsList[0]?.school_name || 'SDN Baujeng I Beji'}, ${schoolsList[1]?.school_name || 'SDN Beji I'}), Nama Guru, atau Judul Karya...`}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F8FAFC] dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 focus:border-[#004AAD] dark:focus:border-[#FFB800] focus:outline-none text-xs sm:text-sm font-bold text-slate-950 dark:text-white"
                    />
                  </div>

                  {/* Village Dropdown Filter */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <Filter className="w-4 h-4 text-[#004AAD] dark:text-[#FFB800] shrink-0" />
                      <select
                        value={villageFilter}
                        onChange={(e) => setVillageFilter(e.target.value)}
                        className="rounded-xl bg-[#F8FAFC] dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-extrabold text-slate-950 dark:text-white cursor-pointer"
                      >
                        <option value="ALL">Semua Desa/Kelurahan ({schoolRecapData.villageStats.length})</option>
                        {schoolRecapData.villageStats.map((v) => (
                          <option key={v.village} value={v.village}>
                            {v.village} ({v.submittedSchools}/{v.totalSchools} SD)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Status Filter (Negeri / Swasta) */}
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'NEGERI' | 'SWASTA')}
                      className="rounded-xl bg-[#F8FAFC] dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-extrabold text-slate-950 dark:text-white cursor-pointer"
                    >
                      <option value="ALL">Semua Status (Negeri & Swasta)</option>
                      <option value="NEGERI">SD NEGERI ({schoolRecapData.negeriCount})</option>
                      <option value="SWASTA">SD SWASTA ({schoolRecapData.swastaCount})</option>
                    </select>

                    {(schoolSearch || schoolFilterMode !== 'ALL' || villageFilter !== 'ALL' || statusFilter !== 'ALL' || selectedSchoolDetail !== 'ALL') && (
                      <button
                        type="button"
                        onClick={resetAllSchoolFilters}
                        className="px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-2 border-red-300 dark:border-red-800 text-xs font-black cursor-pointer"
                      >
                        Reset Filter
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Filter Buttons Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { id: 'ALL' as const, label: `Semua Sekolah (${schoolRecapData.totalRegisteredSchools} SD)` },
                      { id: 'SUBMITTED' as const, label: `Sudah Mengirim Karya (${schoolRecapData.submittedSchoolsCount} SD)` },
                      { id: 'EMPTY' as const, label: `Belum Mengirim Karya (${schoolRecapData.emptySchoolsCount} SD)` }
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setSchoolFilterMode(f.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black border-2 cursor-pointer transition-all ${
                          schoolFilterMode === f.id
                            ? 'bg-[#004AAD] text-white border-[#003380] dark:bg-[#FFB800] dark:text-slate-950 dark:border-[#FFB800]'
                            : 'bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-[#004AAD]'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <div className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                    Menampilkan <span className="text-[#004AAD] dark:text-[#FFB800] font-black">{filteredSchoolRows.length}</span> Sekolah &{' '}
                    <span className="text-[#EA580C] dark:text-[#FFB800] font-black">{filteredPublicParticipants.length}</span> Karya Guru
                  </div>
                </div>
              </div>

              {/* SECTION 3: MAIN 2-COLUMN GRAPH & PUBLIC PARTICIPANT RECAP */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* LEFT COLUMN (6 Cols): GRAFIK BATANG RESPONSIF PER SEKOLAH */}
                <div className="lg:col-span-6 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 p-4 sm:p-5 flex flex-col justify-between shadow-xs">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b-2 border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-[#004AAD] dark:text-[#FFB800]" />
                        <div>
                          <h3 className="font-display font-black text-base sm:text-lg text-slate-950 dark:text-white">
                            Grafik Batang Jumlah Peserta per Sekolah
                          </h3>
                          <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                            Klik pada batang sekolah untuk memfilter daftar guru di tabel sebelah kanan
                          </p>
                        </div>
                      </div>
                      {selectedSchoolDetail !== 'ALL' && (
                        <button
                          type="button"
                          onClick={() => setSelectedSchoolDetail('ALL')}
                          className="px-3 py-1 rounded-lg bg-[#004AAD] text-white text-xs font-black cursor-pointer"
                        >
                          Lihat Semua SD
                        </button>
                      )}
                    </div>

                    <div className="max-h-[420px] overflow-y-auto pr-1 space-y-2.5">
                      {filteredSchoolRows.length === 0 ? (
                        <div className="py-12 text-center text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400">
                          Tidak ditemukan data sekolah yang cocok dengan filter pencarian.
                        </div>
                      ) : (
                        filteredSchoolRows.map((row, idx) => {
                          const widthPercent =
                            row.count > 0
                              ? Math.max(20, Math.round((row.count / schoolRecapData.maxCount) * 100))
                              : 5;
                          const isSelected =
                            selectedSchoolDetail !== 'ALL' &&
                            selectedSchoolDetail.toUpperCase() === row.school_name.toUpperCase();

                          return (
                            <div
                              key={row.school_id}
                              onClick={() =>
                                setSelectedSchoolDetail(isSelected ? 'ALL' : row.school_name)
                              }
                              className={`rounded-xl p-3 border-2 transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-[#F0F6FF] dark:bg-slate-950 border-[#004AAD] dark:border-[#FFB800] shadow-sm'
                                  : row.count > 0
                                  ? 'bg-[#F8FAFC] dark:bg-slate-950 border-emerald-500/40 hover:border-[#004AAD]'
                                  : 'bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-400'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="min-w-0 flex items-start gap-2.5">
                                  <span
                                    className={`w-6 h-6 rounded-lg font-mono font-black text-xs flex items-center justify-center shrink-0 mt-0.5 ${
                                      row.count > 0
                                        ? 'bg-[#004AAD] text-white dark:bg-[#FFB800] dark:text-slate-950'
                                        : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-300'
                                    }`}
                                  >
                                    {idx + 1}
                                  </span>
                                  <div className="min-w-0">
                                    <div className="font-display font-black text-xs sm:text-sm text-slate-950 dark:text-white leading-snug break-words">
                                      {row.school_name}
                                    </div>
                                  </div>
                                </div>

                                <span
                                  className={`px-2.5 py-1 rounded-lg font-mono font-black text-xs shrink-0 tabular-nums ${
                                    row.count > 0
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                  }`}
                                >
                                  {row.count} Peserta
                                </span>
                              </div>

                              {/* Responsive Bar */}
                              <div className="w-full h-4 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden p-0.5">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    row.count > 0
                                      ? 'bg-gradient-to-r from-[#004AAD] via-[#1D4ED8] to-[#FFB800]'
                                      : 'bg-slate-300 dark:bg-slate-700'
                                  }`}
                                  style={{ width: `${widthPercent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Mini Village Breakdown Footer inside Left Column */}
                  <div className="mt-4 pt-3 border-t-2 border-slate-200 dark:border-slate-800">
                    <div className="text-[11px] font-mono font-black uppercase text-[#004AAD] dark:text-[#FFB800] mb-2">
                      STATISTIK PARTISIPASI PER DESA / KELURAHAN DI KECAMATAN BEJI:
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      {schoolRecapData.villageStats.map((vs) => (
                        <button
                          key={vs.village}
                          type="button"
                          onClick={() =>
                            setVillageFilter(villageFilter === vs.village ? 'ALL' : vs.village)
                          }
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border shrink-0 cursor-pointer transition-all ${
                            villageFilter === vs.village
                              ? 'bg-[#004AAD] text-white border-[#003380]'
                              : vs.submittedSchools > 0
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border-emerald-400'
                              : 'bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-800'
                          }`}
                        >
                          <span>{vs.village}: </span>
                          <span className="font-mono font-black">
                            {vs.submittedSchools}/{vs.totalSchools} SD
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN (6 Cols): TABEL REKAP PESERTA PUBLIK (Hanya Sekolah, Nama Guru, dan Judul Inovasi) + INFO RELEVAN */}
                <div className="lg:col-span-6 flex flex-col justify-between gap-4">
                  <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 p-4 sm:p-5 flex-1 flex flex-col justify-between shadow-xs">
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b-2 border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-[#EA580C] dark:text-[#FFB800]" />
                          <div>
                            <h3 className="font-display font-black text-base sm:text-lg text-slate-950 dark:text-white">
                              Daftar Rekap Peserta ({filteredPublicParticipants.length} Karya)
                            </h3>
                            <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                              Menampilkan Asal Sekolah, Nama Guru, dan Judul Karya Inovasi
                            </p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-[#004AAD]/10 dark:bg-[#FFB800]/15 text-[#004AAD] dark:text-[#FFB800] text-[10px] font-mono font-black">
                          PUBLIK: SEKOLAH • NAMA • JUDUL
                        </span>
                      </div>

                      <div className="max-h-[320px] overflow-y-auto rounded-xl border-2 border-slate-300 dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-950">
                        {filteredPublicParticipants.length === 0 ? (
                          <div className="py-12 px-4 text-center space-y-2">
                            <Building2 className="w-9 h-9 text-slate-400 mx-auto" />
                            <div className="text-sm font-black text-slate-900 dark:text-white">
                              Belum Ada Karya Peserta pada Filter Ini
                            </div>
                            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
                              Jadilah guru inspiratif pertama yang mewakili sekolah Anda! Klik tombol &quot;+ Kumpulkan Karya&quot; di pojok kanan atas.
                            </p>
                          </div>
                        ) : (
                          <table className="w-full text-left border-collapse text-xs sm:text-sm">
                            <thead className="sticky top-0 z-10 bg-[#004AAD] text-white font-black">
                              <tr>
                                <th className="py-2.5 px-3 w-10 text-center">No</th>
                                <th className="py-2.5 px-3">Asal Sekolah (Kec. Beji)</th>
                                <th className="py-2.5 px-3">Nama Guru Peserta</th>
                                <th className="py-2.5 px-3">Judul Inovasi Pembelajaran</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y-2 divide-slate-200 dark:divide-slate-800 font-bold bg-white dark:bg-slate-950">
                              {filteredPublicParticipants.map((item, index) => (
                                <tr
                                  key={item.participant_id || index}
                                  className="hover:bg-[#F0F6FF] dark:hover:bg-slate-900 transition-colors"
                                >
                                  <td className="py-2.5 px-3 text-center font-mono font-black text-slate-600 dark:text-slate-400 tabular-nums">
                                    {index + 1}
                                  </td>
                                  <td className="py-2.5 px-3 font-black text-[#004AAD] dark:text-[#FFB800]">
                                    {item.school}
                                  </td>
                                  <td className="py-2.5 px-3 font-extrabold text-slate-950 dark:text-white">
                                    {item.full_name}
                                  </td>
                                  <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                                    {item.innovation_title}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* INFORMASI RELEVAN & PERLINDUNGAN PRIVASI KARYA */}
                  <div className="rounded-2xl bg-gradient-to-r from-[#FFFBEB] to-[#FEF3C7] dark:from-slate-900 dark:to-slate-900 border-2 border-[#F59E0B] p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-black text-[#B45309] dark:text-[#FFB800] uppercase">
                      <Info className="w-4 h-4 shrink-0" />
                      <span>Informasi Penting Kepesertaan & Perlindungan Hak Karya Guru</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold text-slate-800 dark:text-slate-200">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>Kewajiban Lembaga (Bab B Juknis):</strong> Setiap SD Negeri & Swasta se-Kecamatan Beji wajib mengirimkan minimal 1 (satu) guru perwakilan sebelum <strong>21 Nov 2026 pukul 23.59 WIB</strong>.
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#004AAD] dark:text-[#FFB800] shrink-0 mt-0.5" />
                        <span>
                          <strong>Privasi & Kerahasiaan Karya:</strong> Tautan Google Drive, Video, Modul Ajar, Nomor WhatsApp, serta Nilai Juri disembunyikan dari publik dan hanya dapat diakses di <strong>Portal Juri & Admin</strong>.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
