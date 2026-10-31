import React, { useState, useEffect, useCallback } from 'react';
import {
  Participant,
  JuryAccount,
  ScoringCriterion,
  JuryAssignment,
  EvaluationRecord,
  EvaluationDetail,
  ScoreRecapItem,
  FinalistWinnerRecord,
  AnnouncementItem,
  ActivityLog,
  JuknisSection,
  JadwalItem,
  HadiahItem,
  SchoolItem,
  JudgingStage
} from '../types';
import { Icon3D } from './Icons3D';
import { formatRupiah } from '../utils/embedHelper';
import {
  LayoutDashboard,
  Palette,
  BookOpen,
  Calendar,
  Users,
  UserCheck,
  Sliders,
  Activity,
  BarChart3,
  Trophy,
  Megaphone,
  Settings,
  LogOut,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Download,
  Printer,
  RefreshCw,
  KeyRound,
  Copy,
  Check,
  Unlock,
  Search,
  Eye,
  ShieldAlert,
  Sun,
  Moon
} from 'lucide-react';

interface AdminDashboardProps {
  onLogout: () => void;
  onViewPublicSite: () => void;
  onRefreshPublic: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

type AdminMenuId =
  | 'DASHBOARD'
  | 'TAMPILAN'
  | 'JUKNIS'
  | 'JADWAL_HADIAH'
  | 'PESERTA'
  | 'JURI'
  | 'KRITERIA'
  | 'MONITORING'
  | 'REKAP'
  | 'FINALIS_PEMENANG'
  | 'PENGUMUMAN'
  | 'SISTEM';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onLogout,
  onViewPublicSite,
  onRefreshPublic,
  theme,
  onToggleTheme
}) => {
  const [activeMenu, setActiveMenu] = useState<AdminMenuId>('DASHBOARD');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Full Admin Data State
  const [summaryData, setSummaryData] = useState<any>(null);
  const [settingsForm, setSettingsForm] = useState<Record<string, string>>({});
  const [juknisList, setJuknisList] = useState<JuknisSection[]>([]);
  const [jadwalList, setJadwalList] = useState<JadwalItem[]>([]);
  const [hadiahList, setHadiahList] = useState<HadiahItem[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [juryList, setJuryList] = useState<JuryAccount[]>([]);
  const [criteriaList, setCriteriaList] = useState<ScoringCriterion[]>([]);
  const [assignments, setAssignments] = useState<JuryAssignment[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationRecord[]>([]);
  const [evalDetails, setEvalDetails] = useState<EvaluationDetail[]>([]);
  const [recapList, setRecapList] = useState<ScoreRecapItem[]>([]);
  const [finalisPemenang, setFinalisPemenang] = useState<FinalistWinnerRecord[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  // Sub-states for Peserta & Sekolah (Menu 5)
  const [schoolsList, setSchoolsList] = useState<SchoolItem[]>([]);
  const [newSchoolModal, setNewSchoolModal] = useState<{
    school_name: string;
    npsn: string;
    village: string;
    status: 'NEGERI' | 'SWASTA';
  } | null>(null);
  const [participantSearch, setParticipantSearch] = useState('');
  const [editingParticipant, setEditingParticipant] = useState<Partial<Participant> | null>(null);

  // Sub-states for Manajemen Juri & Penugasan (Menu 6)
  const [jurySubTab, setJurySubTab] = useState<'ACCOUNTS' | 'ASSIGNMENTS'>('ACCOUNTS');
  const [juryForm, setJuryForm] = useState({
    jury_id: '',
    full_name: '',
    identity_number: '',
    jury_category: 'Pengawas' as 'Korwilcam' | 'Pengawas' | 'Praktisi' | 'Lainnya',
    institution: '',
    whatsapp: '',
    username: '',
    initial_password: '',
    account_status: 'AKTIF' as 'AKTIF' | 'NONAKTIF',
    assigned_stages: 'PENYISIHAN' as 'PENYISIHAN' | 'FINAL' | 'KEDUANYA',
    admin_notes: '',
    must_change_password: true
  });
  const [resetPassModal, setResetPassModal] = useState<{ jury: JuryAccount; newPass: string } | null>(null);
  const [assignJuryId, setAssignJuryId] = useState('');
  const [assignStage, setAssignStage] = useState<JudgingStage>('PENYISIHAN');
  const [selectedParticipantIdsForAssign, setSelectedParticipantIdsForAssign] = useState<string[]>([]);

  // Sub-states for Kriteria Penilaian (Menu 7)
  const [criteriaStageTab, setCriteriaStageTab] = useState<JudgingStage>('PENYISIHAN');
  const [previewJuryForm, setPreviewJuryForm] = useState(false);

  // Sub-states for Monitoring Penjurian (Menu 8)
  const [monitorStageFilter, setMonitorStageFilter] = useState<'ALL' | 'PENYISIHAN' | 'FINAL'>('ALL');
  const [monitorJuryFilter, setMonitorJuryFilter] = useState('ALL');
  const [monitorSchoolFilter, setMonitorSchoolFilter] = useState('');
  const [reopenModal, setReopenModal] = useState<{ evaluation: EvaluationRecord; reason: string } | null>(null);

  // Sub-states for Rekap Nilai & Peringkat (Menu 9)
  const [recapStage, setRecapStage] = useState<JudgingStage>('PENYISIHAN');
  const [recapSchoolFilter, setRecapSchoolFilter] = useState('');
  const [inspectParticipantEval, setInspectParticipantEval] = useState<Participant | null>(null);
  const [selectedTop5Ids, setSelectedTop5Ids] = useState<string[]>([]);
  const [top5DecisionNotes, setTop5DecisionNotes] = useState('');
  const [publishTop5Now, setPublishTop5Now] = useState(false);

  // Sub-states for Finalis & Pemenang (Menu 10)
  const [winnerAssignments, setWinnerAssignments] = useState<
    Array<{ award_rank: string; participant_id: string; approved_score: number; decision_notes: string }>
  >([
    { award_rank: 'Juara I', participant_id: '', approved_score: 0, decision_notes: '' },
    { award_rank: 'Juara II', participant_id: '', approved_score: 0, decision_notes: '' },
    { award_rank: 'Juara III', participant_id: '', approved_score: 0, decision_notes: '' },
    { award_rank: 'Juara Harapan I', participant_id: '', approved_score: 0, decision_notes: '' },
    { award_rank: 'Juara Harapan II', participant_id: '', approved_score: 0, decision_notes: '' }
  ]);
  const [publishWinnersNow, setPublishWinnersNow] = useState(false);

  // Sub-states for Pengumuman (Menu 11)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Partial<AnnouncementItem> | null>(null);

  // Sub-states for Pengaturan Sistem & Code.gs (Menu 12)
  const [codeGsContent, setCodeGsContent] = useState('');
  const [copiedCodeGs, setCopiedCodeGs] = useState(false);
  const [appsScriptUrlInput, setAppsScriptUrlInput] = useState('');
  const [apiSharedSecretInput, setApiSharedSecretInput] = useState('');
  const [syncingSheets, setSyncingSheets] = useState(false);

  const showNotice = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 5000);
  };

  const fetchAdminSummary = useCallback(async (updateEditableForms = false) => {
    try {
      const res = await fetch('/api/admin/summary');
      const json = await res.json();
      if (res.ok && json.success) {
        const d = json.data;
        setSummaryData(d);
        setSchoolsList(d.sekolah || []);
        setParticipants(d.participants || []);
        setJuryList(d.jury || []);
        setAssignments(d.assignments || []);
        setEvaluations(d.evaluations || []);
        setEvalDetails(d.details || []);
        setRecapList(d.recap || []);
        setFinalisPemenang(d.finalis_pemenang || []);
        setAnnouncements(d.announcements || []);
        setLogs(d.logs || []);

        if (updateEditableForms) {
          setSettingsForm(d.settings || {});
          setJuknisList(d.juknis || []);
          setJadwalList(d.jadwal || []);
          setHadiahList(d.hadiah || []);
          setCriteriaList(d.criteria || []);
          setAppsScriptUrlInput(d.settings?.apps_script_url || '');

          // Populate existing Top 5 selection
          const existingTop5 = (d.finalis_pemenang || [])
            .filter((f: FinalistWinnerRecord) => f.selection_type === 'TOP_5')
            .map((f: FinalistWinnerRecord) => f.participant_id);
          if (existingTop5.length > 0) {
            setSelectedTop5Ids(existingTop5);
          }

          // Populate existing Winners if any
          const existingWins = (d.finalis_pemenang || []).filter(
            (f: FinalistWinnerRecord) => f.selection_type === 'WINNER'
          );
          if (existingWins.length > 0) {
            setWinnerAssignments((prev) =>
              prev.map((slot) => {
                const found = existingWins.find((w: FinalistWinnerRecord) => w.award_rank === slot.award_rank);
                return found
                  ? {
                      award_rank: slot.award_rank,
                      participant_id: found.participant_id,
                      approved_score: Number(found.approved_score || 0),
                      decision_notes: found.decision_notes || ''
                    }
                  : slot;
              })
            );
          }
        }
      }
    } catch {
      // ignore transient error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminSummary(true);
  }, [fetchAdminSummary]);

  // Automatic 30s background polling
  useEffect(() => {
    const timer = setInterval(() => {
      fetchAdminSummary(false);
    }, 30000);
    return () => clearInterval(timer);
  }, [fetchAdminSummary]);

  // Load Code.gs when opening SISTEM menu
  useEffect(() => {
    if (activeMenu === 'SISTEM' && !codeGsContent) {
      fetch('/api/admin/code-gs')
        .then((r) => r.json())
        .then((j) => {
          if (j.success && j.data?.code) {
            setCodeGsContent(j.data.code);
            if (j.data.apps_script_url) setAppsScriptUrlInput(j.data.apps_script_url);
          }
        })
        .catch(() => {});
    }
  }, [activeMenu, codeGsContent]);

  // Handlers
  const handleSaveSettingsAndSchedule = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        settings: settingsForm,
        jadwal: jadwalList,
        hadiah: hadiahList
      })
    });
    const json = await res.json();
    if (res.ok && json.success) {
      showNotice('success', json.message);
      await fetchAdminSummary(true);
      onRefreshPublic();
    } else {
      showNotice('error', json.message || 'Gagal menyimpan pengaturan.');
    }
  };

  const handleSaveJuknis = async () => {
    const res = await fetch('/api/admin/juknis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ juknis: juknisList })
    });
    const json = await res.json();
    if (res.ok && json.success) {
      showNotice('success', json.message);
      await fetchAdminSummary(true);
      onRefreshPublic();
    } else {
      showNotice('error', json.message || 'Gagal menyimpan Juknis.');
    }
  };

  const handleSaveParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingParticipant) return;
    const res = await fetch('/api/admin/participants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participant: editingParticipant })
    });
    const json = await res.json();
    if (res.ok && json.success) {
      showNotice('success', json.message);
      setEditingParticipant(null);
      await fetchAdminSummary(false);
      onRefreshPublic();
    } else {
      showNotice('error', json.message || 'Gagal menyimpan data peserta.');
    }
  };

  const handleDeleteParticipant = async (participant_id: string, full_name: string) => {
    const res = await fetch('/api/admin/participants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'DELETE',
        participant_id,
        reason: `Dihapus oleh Admin (${full_name})`
      })
    });
    const json = await res.json();
    if (res.ok && json.success) {
      showNotice('success', json.message);
      await fetchAdminSummary(false);
      onRefreshPublic();
    } else {
      showNotice('error', json.message || 'Gagal menghapus peserta.');
    }
  };

  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let pass = 'Juri26-';
    for (let i = 0; i < 5; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setJuryForm((prev) => ({ ...prev, initial_password: pass }));
  };

  const handleSaveJuryAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/jury', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(juryForm)
    });
    const json = await res.json();
    if (res.ok && json.success) {
      showNotice('success', json.message);
      setJuryForm({
        jury_id: '',
        full_name: '',
        identity_number: '',
        jury_category: 'Pengawas',
        institution: '',
        whatsapp: '',
        username: '',
        initial_password: '',
        account_status: 'AKTIF',
        assigned_stages: 'PENYISIHAN',
        admin_notes: '',
        must_change_password: true
      });
      await fetchAdminSummary(false);
    } else {
      showNotice('error', json.message || 'Gagal menyimpan akun juri.');
    }
  };

  const handleResetJuryPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassModal) return;
    const res = await fetch('/api/admin/jury', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'RESET_PASSWORD',
        jury_id: resetPassModal.jury.jury_id,
        initial_password: resetPassModal.newPass,
        must_change_password: true
      })
    });
    const json = await res.json();
    if (res.ok && json.success) {
      showNotice('success', json.message);
      setResetPassModal(null);
      await fetchAdminSummary(false);
    } else {
      showNotice('error', json.message || 'Gagal mereset password juri.');
    }
  };

  const handleAssignJury = async (mode: 'ALL_ELIGIBLE' | 'SELECTED') => {
    if (!assignJuryId) {
      showNotice('error', 'Pilih anggota Dewan Juri terlebih dahulu.');
      return;
    }
    const res = await fetch('/api/admin/jury-assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: mode === 'ALL_ELIGIBLE' ? 'ASSIGN_ALL_ELIGIBLE' : 'ASSIGN_SELECTED',
        jury_id: assignJuryId,
        stage: assignStage,
        participant_ids: selectedParticipantIdsForAssign
      })
    });
    const json = await res.json();
    if (res.ok && json.success) {
      showNotice('success', json.message);
      setSelectedParticipantIdsForAssign([]);
      await fetchAdminSummary(false);
    } else {
      showNotice('error', json.message || 'Gagal menyimpan penugasan juri.');
    }
  };

  const handleRemoveAssignment = async (assignment_id: string) => {
    const res = await fetch('/api/admin/jury-assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'REMOVE', assignment_id })
    });
    const json = await res.json();
    if (res.ok && json.success) {
      showNotice('success', json.message);
      await fetchAdminSummary(false);
    } else {
      showNotice('error', json.message || 'Gagal menghapus penugasan.');
    }
  };

  const handleSaveStageCriteria = async () => {
    const stageCrits = criteriaList.filter((c) => c.stage === criteriaStageTab);
    const res = await fetch('/api/admin/criteria', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stage: criteriaStageTab,
        criteria: stageCrits
      })
    });
    const json = await res.json();
    if (res.ok && json.success) {
      showNotice('success', json.message);
      setCriteriaList(json.data);
      await fetchAdminSummary(false);
    } else {
      showNotice('error', json.message || 'Gagal menyimpan kriteria penilaian.');
    }
  };

  const handleReopenEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenModal) return;
    const res = await fetch('/api/admin/evaluations/reopen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evaluation_id: reopenModal.evaluation.evaluation_id,
        reopen_reason: reopenModal.reason
      })
    });
    const json = await res.json();
    if (res.ok && json.success) {
      showNotice('success', json.message);
      setReopenModal(null);
      await fetchAdminSummary(false);
    } else {
      showNotice('error', json.message || 'Gagal membuka kembali penilaian.');
    }
  };

  const handleConfirmTop5 = async () => {
    const res = await fetch('/api/admin/results/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'CONFIRM_TOP_5',
        participant_ids: selectedTop5Ids,
        decision_notes: top5DecisionNotes,
        publish_now: publishTop5Now
      })
    });
    const json = await res.json();
    if (res.ok && json.success) {
      showNotice('success', json.message);
      await fetchAdminSummary(true);
      onRefreshPublic();
    } else {
      showNotice('error', json.message || 'Gagal menetapkan Top 5.');
    }
  };

  const handleConfirmWinners = async () => {
    const validWinners = winnerAssignments.filter((w) => w.participant_id);
    if (validWinners.length === 0) {
      showNotice('error', 'Pilih minimal satu peserta pemenang sebelum menyimpan.');
      return;
    }
    const res = await fetch('/api/admin/results/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'CONFIRM_WINNERS',
        winners: validWinners,
        publish_now: publishWinnersNow
      })
    });
    const json = await res.json();
    if (res.ok && json.success) {
      showNotice('success', json.message);
      await fetchAdminSummary(true);
      onRefreshPublic();
    } else {
      showNotice('error', json.message || 'Gagal menetapkan pemenang.');
    }
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnnouncement) return;
    const res = await fetch('/api/admin/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ announcement: editingAnnouncement })
    });
    const json = await res.json();
    if (res.ok && json.success) {
      showNotice('success', json.message);
      setEditingAnnouncement(null);
      await fetchAdminSummary(false);
      onRefreshPublic();
    } else {
      showNotice('error', json.message || 'Gagal menyimpan pengumuman.');
    }
  };

  const handleDeleteAnnouncement = async (announcement_id: string) => {
    const res = await fetch('/api/admin/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'DELETE', announcement_id })
    });
    const json = await res.json();
    if (res.ok && json.success) {
      showNotice('success', json.message);
      await fetchAdminSummary(false);
      onRefreshPublic();
    }
  };

  // Export CSV Utility
  const exportRecapCsv = (stage: JudgingStage) => {
    const stageJurors = juryList.filter(
      (j) => j.assigned_stages === stage || j.assigned_stages === 'KEDUANYA'
    );
    const stageRecaps = recapList
      .filter((r) => r.stage === stage)
      .sort((a, b) => (a.rank || 999) - (b.rank || 999));

    const headers = [
      'Rank',
      'ID Peserta',
      'Nama Guru',
      'Asal Sekolah',
      'Judul Inovasi',
      ...stageJurors.map((j, i) => `Juri ${i + 1} (${j.full_name})`),
      'Rata-rata Akhir',
      'Status Kelengkapan'
    ];

    const rows = stageRecaps.map((rec) => {
      const p = participants.find((item) => item.participant_id === rec.participant_id);
      const jurorScores = stageJurors.map((j) => {
        const ev = evaluations.find(
          (e) =>
            e.participant_id === rec.participant_id &&
            e.jury_id === j.jury_id &&
            e.stage === stage &&
            e.evaluation_status === 'FINAL'
        );
        return ev ? Number(ev.weighted_total).toFixed(2) : '-';
      });
      return [
        rec.rank || '-',
        rec.participant_id,
        `"${(p?.full_name || '').replace(/"/g, '""')}"`,
        `"${(p?.school || '').replace(/"/g, '""')}"`,
        `"${(p?.innovation_title || '').replace(/"/g, '""')}"`,
        ...jurorScores,
        rec.average_score !== null ? Number(rec.average_score).toFixed(2) : '-',
        rec.evaluation_complete ? 'LENGKAP' : 'BELUM LENGKAP'
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rekap_Nilai_${stage}_HGN_Beji_2026.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportParticipantsCsv = () => {
    const headers = [
      'Nomor',
      'ID Peserta',
      'Nama Guru',
      'Asal Sekolah',
      'Judul Inovasi',
      'Waktu Pengumpulan',
      'Folder Google Drive',
      'Link Video',
      'Link Modul Ajar',
      'Link Media',
      'WhatsApp',
      'Status Verifikasi'
    ];
    const rows = participants.map((p, idx) => [
      idx + 1,
      p.participant_id,
      `"${p.full_name.replace(/"/g, '""')}"`,
      `"${p.school.replace(/"/g, '""')}"`,
      `"${p.innovation_title.replace(/"/g, '""')}"`,
      p.submitted_at,
      p.drive_folder_url,
      p.video_url,
      p.lesson_module_url,
      p.learning_media_url,
      p.whatsapp,
      p.verification_status
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Data_Peserta_HGN_Beji_2026.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const menuItems: Array<{ id: AdminMenuId; label: string; shortLabel: string; icon: any }> = [
    { id: 'DASHBOARD', label: '1. Dashboard', shortLabel: '1. Dash', icon: LayoutDashboard },
    { id: 'TAMPILAN', label: '2. Pengaturan Tampilan', shortLabel: '2. Tema', icon: Palette },
    { id: 'JUKNIS', label: '3. Pengelolaan Juknis', shortLabel: '3. Juknis', icon: BookOpen },
    { id: 'JADWAL_HADIAH', label: '4. Jadwal & Hadiah', shortLabel: '4. Jadwal', icon: Calendar },
    { id: 'PESERTA', label: '5. Data Peserta', shortLabel: '5. Peserta', icon: Users },
    { id: 'JURI', label: '6. Manajemen Juri', shortLabel: '6. Juri', icon: UserCheck },
    { id: 'KRITERIA', label: '7. Kriteria Penilaian', shortLabel: '7. Kriteria', icon: Sliders },
    { id: 'MONITORING', label: '8. Monitoring Penjurian', shortLabel: '8. Monitor', icon: Activity },
    { id: 'REKAP', label: '9. Rekap Nilai & Peringkat', shortLabel: '9. Rekap', icon: BarChart3 },
    { id: 'FINALIS_PEMENANG', label: '10. Finalis & Pemenang', shortLabel: '10. Juara', icon: Trophy },
    { id: 'PENGUMUMAN', label: '11. Pengumuman', shortLabel: '11. Info', icon: Megaphone },
    { id: 'SISTEM', label: '12. Pengaturan Sistem', shortLabel: '12. Sistem', icon: Settings }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#070b14] text-slate-950 dark:text-white flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-3 border-[#004AAD] dark:border-[#FFB800] border-t-transparent animate-spin mx-auto" />
          <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
            Memuat Dashboard Administrator Lomba Guru Inspiratif 2026...
          </p>
        </div>
      </div>
    );
  }

  // Analytics Computations for Dashboard (Section 23)
  const schoolCountsMap: Record<string, number> = {};
  participants.forEach((p) => {
    const s = p.school.trim() || 'Lainnya';
    schoolCountsMap[s] = (schoolCountsMap[s] || 0) + 1;
  });
  const schoolBreakdown = Object.entries(schoolCountsMap).sort((a, b) => b[1] - a[1]);

  return (
    <div className={`h-[100dvh] w-full max-w-[100vw] overflow-hidden bg-white dark:bg-[#070b14] text-slate-950 dark:text-slate-100 flex flex-col lg:flex-row relative transition-colors duration-150 ${theme === 'light' ? 'admin-light-mode' : 'admin-dark-mode'}`}>
      {/* Sidebar Navigation — 12 Required Menus */}
      <aside className="no-print w-full lg:w-72 bg-[#F8FAFC] dark:bg-[#0a1122] border-b-2 lg:border-b-0 lg:border-r-2 border-[#004AAD]/25 dark:border-[#FFB800]/30 p-3 sm:p-5 flex flex-col justify-between shrink-0 lg:overflow-y-auto">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src={
                  settingsForm.app_icon_url ||
                  'https://lh3.googleusercontent.com/d/13M5y3gnxVP6cUPGKRXqdYqmHxFjPAvpD'
                }
                alt="Logo FK3S Kec. Beji"
                referrerPolicy="no-referrer"
                className="w-11 h-11 object-contain drop-shadow-sm"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  if (!img.src.includes('/assets/aistudio/logo_fk3s.png')) {
                    img.src = '/assets/aistudio/logo_fk3s.png';
                  }
                }}
              />
              <div>
                <div className="font-display font-black text-base text-[#004AAD] dark:text-[#FFB800] leading-tight">
                  ADMIN HGN 2026
                </div>
                <div className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                  FK3S KEC. BEJI • PASURUAN
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 lg:hidden">
              <button
                type="button"
                onClick={onToggleTheme}
                className="p-2 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                {theme === 'light' ? <Moon className="w-4 h-4 text-[#004AAD]" /> : <Sun className="w-4 h-4 text-[#FFB800]" />}
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="px-3 py-2 rounded-xl bg-red-600 text-white text-xs font-black"
              >
                Keluar
              </button>
            </div>
          </div>

          <nav className="hidden lg:flex lg:flex-col gap-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = activeMenu === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveMenu(item.id)}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2.5 transition-all whitespace-nowrap shrink-0 cursor-pointer border-2 ${
                    active
                      ? 'bg-[#004AAD] text-white border-[#003380] dark:bg-[#FFB800] dark:text-slate-950 dark:border-[#FFB800] shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200 border-slate-300 dark:border-slate-800 hover:border-[#004AAD]'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#FFD000] dark:text-slate-950' : 'text-[#004AAD] dark:text-[#FFB800]'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="hidden lg:flex flex-col gap-2 pt-5 border-t-2 border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onViewPublicSite}
            className="w-full px-3.5 py-2.5 rounded-xl text-xs font-extrabold text-slate-900 dark:text-white bg-white dark:bg-slate-900 hover:bg-slate-100 border-2 border-slate-300 dark:border-slate-700 text-left inline-flex items-center justify-between cursor-pointer"
          >
            <span>Lihat Website Publik</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#004AAD] dark:text-[#FFB800]" />
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="w-full px-3.5 py-2.5 rounded-xl text-xs font-black text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/60 hover:bg-red-100 border-2 border-red-300 dark:border-red-500/30 inline-flex items-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Sesi Admin</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        {/* Top Bar */}
        <header className="no-print shrink-0 z-20 bg-white/95 dark:bg-[#0a1122]/95 backdrop-blur-md border-b-2 border-[#004AAD]/20 dark:border-[#FFB800]/30 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <div>
            <div className="text-xs font-extrabold text-slate-600 dark:text-slate-300">
              Database Utama: <span className="font-mono font-black text-[#EA580C] dark:text-[#FFB800]">HGN 2026 Kec. Beji</span>
            </div>
            <h1 className="font-display font-black text-lg sm:text-xl text-[#004AAD] dark:text-white">
              {menuItems.find((m) => m.id === activeMenu)?.label}
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onToggleTheme}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-xs font-extrabold text-slate-900 dark:text-white inline-flex items-center gap-1.5 cursor-pointer"
            >
              {theme === 'light' ? (
                <>
                  <Moon className="w-4 h-4 text-[#004AAD]" />
                  <span className="hidden sm:inline">Mode Gelap</span>
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 text-[#FFB800]" />
                  <span className="hidden sm:inline">Mode Cerah</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => fetchAdminSummary(false)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-xs font-extrabold text-slate-900 dark:text-white inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#004AAD] dark:text-[#FFB800]" />
              <span className="hidden sm:inline">Sinkronisasi</span>
            </button>
            <button
              type="button"
              onClick={onViewPublicSite}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FFD000] via-[#FFB800] to-[#FF9000] border-2 border-[#B45309]/40 text-xs font-black text-slate-950 shadow-xs cursor-pointer"
            >
              Buka Beranda Publik
            </button>
          </div>
        </header>

        {/* Toast Notification */}
        {toast && (
          <div className="no-print mx-6 mt-4 shrink-0">
            <div
              className={`rounded-2xl px-4 py-3 border-2 flex items-center justify-between gap-3 text-xs sm:text-sm font-extrabold ${
                toast.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-600 text-emerald-950 dark:text-emerald-100'
                  : 'bg-red-50 dark:bg-red-950/80 border-red-600 text-red-950 dark:text-red-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {toast.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{toast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="text-xs font-black opacity-80 hover:opacity-100"
              >
                Tutup
              </button>
            </div>
          </div>
        )}

        <main className="admin-workspace flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 pb-40 lg:pb-8 space-y-8 max-w-7xl w-full mx-auto">
          {/* =================================================================
           * MENU 1 — DASHBOARD & ANALYTICS (Section 6.A & Section 23)
           * ================================================================= */}
          {activeMenu === 'DASHBOARD' && summaryData && (
            <div className="space-y-8">
              {/* Primary 8 Real Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Peserta', val: summaryData.total_participants, sub: `${summaryData.verified_participants} Terverifikasi` },
                  { label: 'Total Sekolah Dasar', val: summaryData.total_schools, sub: 'Kecamatan Beji' },
                  { label: 'Total Juri Aktif', val: summaryData.total_active_jury, sub: `Dari ${summaryData.total_jury} Akun Juri` },
                  { label: 'Total Karya Dinilai', val: summaryData.total_evaluated_works, sub: `Tahap ${summaryData.active_judging_stage}` },
                  { label: 'Karya Belum Dinilai', val: summaryData.total_unevaluated_works, sub: 'Peserta Terverifikasi' },
                  { label: 'Penyelesaian Penjurian', val: `${summaryData.completion_percentage}%`, sub: `${summaryData.total_finalized_evaluations}/${summaryData.total_assignments} Penugasan` },
                  { label: 'Jumlah Finalis Top 5', val: summaryData.top5_count, sub: 'Ditetapkan Admin' },
                  { label: 'Status Pengumpulan', val: summaryData.submission_enabled ? 'DIBUKA' : 'DITUTUP', sub: settingsForm.submission_mode || 'INTERNAL' }
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl bg-[#F8FAFC] dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-800 p-5 flex flex-col justify-between"
                  >
                    <div className="text-xs font-extrabold uppercase text-slate-600 dark:text-slate-400">{stat.label}</div>
                    <div className="font-mono font-black text-2xl sm:text-3xl text-[#004AAD] dark:text-white mt-2 tabular-nums">
                      {stat.val}
                    </div>
                    <div className="text-[11px] font-bold text-[#EA580C] dark:text-[#FFB800] mt-1">{stat.sub}</div>
                  </div>
                ))}
              </div>

              {/* Database Connection & Synchronization Status */}
              <div className="rounded-2xl bg-gradient-to-r from-[#004AAD] to-[#1D4ED8] text-white border-2 border-[#003380] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
                <div className="flex items-start gap-4">
                  <Icon3D type="drive" size="md" />
                  <div>
                    <div className="text-xs font-mono font-black text-[#FFD000]">
                      STATUS KONEKSI DATABASE: {summaryData.db_status?.mode}
                    </div>
                    <h3 className="font-display font-black text-lg text-white mt-0.5">
                      Spreadsheet: HGN 2026 Kec. Beji
                    </h3>
                    <p className="text-xs font-semibold text-blue-100 mt-1">
                      {summaryData.db_status?.message}
                    </p>
                  </div>
                </div>
                <div className="text-left md:text-right shrink-0 bg-white/10 rounded-xl px-4 py-2.5 border border-white/20">
                  <div className="text-[11px] font-bold text-blue-100">Waktu Sinkronisasi Terakhir</div>
                  <div className="font-mono font-black text-xs text-[#FFD000] mt-0.5 tabular-nums">
                    {summaryData.db_status?.lastSync}
                  </div>
                </div>
              </div>

              {/* Section 23 Data Visualizations */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Total Participants by School */}
                <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 space-y-4">
                  <h3 className="font-display font-bold text-base text-white">
                    Sebaran Peserta Berdasarkan Sekolah Dasar
                  </h3>
                  {schoolBreakdown.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center">
                      Belum ada peserta yang mengumpulkan karya.
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                      {schoolBreakdown.map(([schoolName, count]) => {
                        const pct = Math.min(100, Math.round((count / Math.max(1, participants.length)) * 100));
                        return (
                          <div key={schoolName} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-200 font-medium">{schoolName}</span>
                              <span className="font-mono text-amber-400 tabular-nums">{count} Guru</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                              <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. Jury Evaluation Progress */}
                <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 space-y-4">
                  <h3 className="font-display font-bold text-base text-white">
                    Progres Penilaian Dewan Juri
                  </h3>
                  {juryList.length === 0 ? (
                    <div className="py-6 text-center space-y-2">
                      <p className="text-xs text-slate-400">
                        Belum ada akun juri yang dibuat.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveMenu('JURI')}
                        className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-semibold"
                      >
                        Tambah Akun Juri Sekarang
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {juryList.map((j) => {
                        const jAssign = assignments.filter(
                          (a) => a.jury_id === j.jury_id && a.assignment_status === 'ACTIVE'
                        );
                        const jFinal = evaluations.filter(
                          (e) => e.jury_id === j.jury_id && e.evaluation_status === 'FINAL'
                        );
                        const pct = jAssign.length > 0 ? Math.round((jFinal.length / jAssign.length) * 100) : 0;
                        return (
                          <div key={j.jury_id} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-200 font-medium">
                                {j.full_name} ({j.jury_category})
                              </span>
                              <span className="font-mono text-emerald-400 tabular-nums">
                                {jFinal.length}/{jAssign.length} Final ({pct}%)
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                              <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
           * MENU 2 — PENGATURAN GAMBAR & TAMPILAN (Section 6.B)
           * ================================================================= */}
          {activeMenu === 'TAMPILAN' && (
            <form onSubmit={handleSaveSettingsAndSchedule} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 rounded-2xl bg-slate-900/80 border border-slate-800 p-6 space-y-5">
                  <h2 className="font-display font-bold text-lg text-white border-b border-slate-800 pb-3">
                    Identitas Visual, Gambar & Mode Pengumpulan
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Judul Utama Website (site_title)
                      </label>
                      <input
                        type="text"
                        value={settingsForm.site_title || ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, site_title: e.target.value })}
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Tagline Utama
                      </label>
                      <input
                        type="text"
                        value={settingsForm.tagline || ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, tagline: e.target.value })}
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Hashtag Branding
                      </label>
                      <input
                        type="text"
                        value={settingsForm.hashtag || ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, hashtag: e.target.value })}
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-white font-mono"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        URL Logo Utama Beranda (main_logo_url)
                      </label>
                      <input
                        type="url"
                        value={settingsForm.main_logo_url || ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, main_logo_url: e.target.value })}
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white font-mono"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        URL Ikon Aplikasi / Favicon (app_icon_url)
                      </label>
                      <input
                        type="url"
                        value={settingsForm.app_icon_url || ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, app_icon_url: e.target.value })}
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Warna Utama (Primary Color)
                      </label>
                      <input
                        type="text"
                        value={settingsForm.primary_color || '#d97706'}
                        onChange={(e) => setSettingsForm({ ...settingsForm, primary_color: e.target.value })}
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Warna Sekunder (Secondary Color)
                      </label>
                      <input
                        type="text"
                        value={settingsForm.secondary_color || '#0284c7'}
                        onChange={(e) => setSettingsForm({ ...settingsForm, secondary_color: e.target.value })}
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white font-mono"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Informasi Kontak Sekretariat (Footer)
                      </label>
                      <input
                        type="text"
                        value={settingsForm.contact_whatsapp || ''}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, contact_whatsapp: e.target.value })
                        }
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Teks Footer
                      </label>
                      <input
                        type="text"
                        value={settingsForm.footer_text || ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, footer_text: e.target.value })}
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Mode Pengumpulan Karya
                      </label>
                      <select
                        value={settingsForm.submission_mode || 'INTERNAL'}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, submission_mode: e.target.value })
                        }
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-white"
                      >
                        <option value="INTERNAL">Mode 2: Formulir Terintegrasi (Langsung ke Sheet PESERTA)</option>
                        <option value="GOOGLE_FORM">Mode 1: Tautan Google Form Eksternal</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Status Penerimaan Karya
                      </label>
                      <select
                        value={settingsForm.submission_enabled || 'true'}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, submission_enabled: e.target.value })
                        }
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-white"
                      >
                        <option value="true">Dibuka (Peserta Dapat Mengirim Karya)</option>
                        <option value="false">Ditutup</option>
                      </select>
                    </div>

                    {settingsForm.submission_mode === 'GOOGLE_FORM' && (
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-amber-300 mb-1">
                          URL Google Form Eksternal
                        </label>
                        <input
                          type="url"
                          value={settingsForm.external_form_url || ''}
                          onChange={(e) =>
                            setSettingsForm({ ...settingsForm, external_form_url: e.target.value })
                          }
                          placeholder="https://docs.google.com/forms/..."
                          className="w-full rounded-xl bg-slate-950 border border-amber-500/40 px-3.5 py-2.5 text-xs text-white font-mono"
                        />
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl font-bold text-xs text-slate-950 bg-gradient-to-r from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 shadow-lg"
                  >
                    Simpan Pengaturan Tampilan ke Google Sheets
                  </button>
                </div>

                {/* Live Image Previews */}
                <div className="lg:col-span-4 rounded-2xl bg-slate-900/80 border border-slate-800 p-6 space-y-5">
                  <h3 className="font-display font-bold text-base text-white">
                    Pratinjau Langsung Logo & Ikon
                  </h3>
                  <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 text-center space-y-2">
                    <div className="text-xs text-slate-400">Logo Utama Beranda</div>
                    <img
                      src={settingsForm.main_logo_url}
                      alt="Preview Main Logo"
                      referrerPolicy="no-referrer"
                      className="w-40 h-40 object-contain mx-auto"
                    />
                  </div>
                  <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 text-center space-y-2">
                    <div className="text-xs text-slate-400">Ikon Aplikasi (App Icon)</div>
                    <img
                      src={settingsForm.app_icon_url}
                      alt="Preview App Icon"
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 object-contain mx-auto rounded-xl"
                    />
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* =================================================================
           * MENU 3 — PENGELOLAAN JUKNIS (Section 6.C)
           * ================================================================= */}
          {activeMenu === 'JUKNIS' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display font-bold text-lg text-white">
                    Pengelolaan Bab Petunjuk Teknis (Bab A – H)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Seluruh perubahan langsung memperbarui halaman Juknis & Pengumpulan publik.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fetchAdminSummary(true)}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300"
                  >
                    Batal / Muat Ulang
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveJuknis}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 text-slate-950 text-xs font-bold shadow-md"
                  >
                    Simpan Seluruh Bab Juknis
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {juknisList.map((sec, idx) => (
                  <div
                    key={sec.id}
                    className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="w-8 h-8 rounded-lg bg-amber-400/20 border border-amber-400/40 text-amber-300 font-mono font-bold text-sm flex items-center justify-center">
                          {sec.section_code}
                        </span>
                        <input
                          type="text"
                          value={sec.title}
                          onChange={(e) => {
                            const next = [...juknisList];
                            next[idx] = { ...sec, title: e.target.value };
                            setJuknisList(next);
                          }}
                          className="flex-1 rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-sm font-bold text-white"
                        />
                      </div>
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sec.active}
                          onChange={(e) => {
                            const next = [...juknisList];
                            next[idx] = { ...sec, active: e.target.checked };
                            setJuknisList(next);
                          }}
                        />
                        <span>Tampilkan</span>
                      </label>
                    </div>
                    <textarea
                      rows={4}
                      value={sec.content}
                      onChange={(e) => {
                        const next = [...juknisList];
                        next[idx] = { ...sec, content: e.target.value };
                        setJuknisList(next);
                      }}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3.5 text-xs sm:text-sm text-slate-200 leading-relaxed"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =================================================================
           * MENU 4 — JADWAL & HADIAH (Section 6.D)
           * ================================================================= */}
          {activeMenu === 'JADWAL_HADIAH' && (
            <form onSubmit={handleSaveSettingsAndSchedule} className="space-y-8">
              {/* Deadline Countdown Setting */}
              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 space-y-4">
                <h2 className="font-display font-bold text-lg text-white">
                  Batas Akhir Countdown Pengumpulan Karya (WIB)
                </h2>
                <div className="max-w-md">
                  <label className="block text-xs text-slate-400 mb-1">
                    Format ISO Asia/Jakarta (Default: 2026-11-21T23:59:00+07:00)
                  </label>
                  <input
                    type="text"
                    value={settingsForm.submission_deadline || '2026-11-21T23:59:00+07:00'}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, submission_deadline: e.target.value })
                    }
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-sm font-mono text-amber-300"
                  />
                </div>
              </div>

              {/* Jadwal Table */}
              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 space-y-4">
                <h2 className="font-display font-bold text-lg text-white">
                  Jadwal Tahapan Pelaksanaan (Tabel JADWAL)
                </h2>
                <div className="space-y-3">
                  {jadwalList.map((item, idx) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-950/80 border border-slate-800 p-4 rounded-xl"
                    >
                      <input
                        type="text"
                        value={item.activity}
                        onChange={(e) => {
                          const next = [...jadwalList];
                          next[idx] = { ...item, activity: e.target.value };
                          setJadwalList(next);
                        }}
                        placeholder="Nama Kegiatan"
                        className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white font-semibold"
                      />
                      <input
                        type="text"
                        value={item.start_datetime}
                        onChange={(e) => {
                          const next = [...jadwalList];
                          next[idx] = { ...item, start_datetime: e.target.value };
                          setJadwalList(next);
                        }}
                        placeholder="Tanggal Mulai"
                        className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white font-mono"
                      />
                      <input
                        type="text"
                        value={item.end_datetime}
                        onChange={(e) => {
                          const next = [...jadwalList];
                          next[idx] = { ...item, end_datetime: e.target.value };
                          setJadwalList(next);
                        }}
                        placeholder="Tanggal Selesai / Waktu"
                        className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white font-mono"
                      />
                      <input
                        type="text"
                        value={item.location}
                        onChange={(e) => {
                          const next = [...jadwalList];
                          next[idx] = { ...item, location: e.target.value };
                          setJadwalList(next);
                        }}
                        placeholder="Lokasi"
                        className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Hadiah Table */}
              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 space-y-4">
                <h2 className="font-display font-bold text-lg text-white">
                  Apresiasi & Hadiah Pemenang (Tabel HADIAH)
                </h2>
                <div className="space-y-3">
                  {hadiahList.map((item, idx) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-950/80 border border-slate-800 p-4 rounded-xl items-center"
                    >
                      <input
                        type="text"
                        value={item.rank}
                        onChange={(e) => {
                          const next = [...hadiahList];
                          next[idx] = { ...item, rank: e.target.value };
                          setHadiahList(next);
                        }}
                        className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-xs font-bold text-white"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-400">Rp</span>
                        <input
                          type="number"
                          value={item.prize_amount}
                          onChange={(e) => {
                            const next = [...hadiahList];
                            next[idx] = { ...item, prize_amount: Number(e.target.value) };
                            setHadiahList(next);
                          }}
                          className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-xs font-mono text-amber-300 tabular-nums"
                        />
                      </div>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => {
                          const next = [...hadiahList];
                          next[idx] = { ...item, description: e.target.value };
                          setHadiahList(next);
                        }}
                        className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-slate-200"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="px-6 py-3.5 rounded-xl font-bold text-xs text-slate-950 bg-gradient-to-r from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 shadow-lg"
              >
                Simpan Perubahan Jadwal & Hadiah
              </button>
            </form>
          )}

          {/* =================================================================
           * MENU 5 — DATA PESERTA (Section 6.E)
           * ================================================================= */}
          {activeMenu === 'PESERTA' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={participantSearch}
                    onChange={(e) => setParticipantSearch(e.target.value)}
                    placeholder="Cari nama guru, sekolah, atau ID peserta..."
                    className="w-full rounded-xl bg-slate-900 border border-slate-800 pl-10 pr-4 py-2.5 text-xs text-white"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setNewSchoolModal({
                        school_name: '',
                        npsn: '',
                        village: 'Desa Beji',
                        status: 'NEGERI'
                      })
                    }
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-[#004AAD] text-xs font-bold text-amber-300 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Sekolah (Sheet SEKOLAH)</span>
                  </button>
                  <button
                    type="button"
                    onClick={exportParticipantsCsv}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 inline-flex items-center gap-2"
                  >
                    <Download className="w-4 h-4 text-sky-400" />
                    <span>Export CSV Peserta</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingParticipant({
                        full_name: '',
                        school: '',
                        innovation_title: '',
                        drive_folder_url: '',
                        video_url: '',
                        lesson_module_url: '',
                        learning_media_url: '',
                        whatsapp: '',
                        verification_status: 'TERVERIFIKASI',
                        admin_notes: ''
                      })
                    }
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Peserta</span>
                  </button>
                </div>
              </div>

              {/* Add New School to Sheet SEKOLAH Modal */}
              {newSchoolModal && (
                <div className="rounded-2xl bg-slate-900 border-2 border-[#004AAD] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-bold text-sm text-white">
                      Tambah Sekolah Baru ke Sheet SEKOLAH (Kec. Beji, Kab. Pasuruan, Prov. Jawa Timur)
                    </h3>
                    <button
                      type="button"
                      onClick={() => setNewSchoolModal(null)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Tutup
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-xs text-slate-300 mb-1">Nama Satuan Pendidikan *</label>
                      <input
                        type="text"
                        placeholder="Contoh: UPT Satuan Pendidikan SDN Beji I Beji"
                        value={newSchoolModal.school_name}
                        onChange={(e) => setNewSchoolModal({ ...newSchoolModal, school_name: e.target.value })}
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">Desa / Kelurahan di Kec. Beji</label>
                      <input
                        type="text"
                        placeholder="Contoh: Desa Beji"
                        value={newSchoolModal.village}
                        onChange={(e) => setNewSchoolModal({ ...newSchoolModal, village: e.target.value })}
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">Status Sekolah</label>
                      <select
                        value={newSchoolModal.status}
                        onChange={(e) =>
                          setNewSchoolModal({
                            ...newSchoolModal,
                            status: e.target.value as 'NEGERI' | 'SWASTA'
                          })
                        }
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white"
                      >
                        <option value="NEGERI">NEGERI</option>
                        <option value="SWASTA">SWASTA</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!newSchoolModal.school_name.trim()) return;
                        const res = await fetch('/api/admin/schools', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ school: newSchoolModal })
                        });
                        const json = await res.json();
                        if (json.success) {
                          showNotice('success', 'Sekolah berhasil ditambahkan ke Sheet SEKOLAH.');
                          setNewSchoolModal(null);
                          fetchAdminSummary(false);
                          onRefreshPublic();
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold"
                    >
                      Simpan ke Sheet SEKOLAH
                    </button>
                  </div>
                </div>
              )}

              {/* Add / Edit Participant Modal */}
              {editingParticipant && (
                <div className="rounded-2xl bg-slate-900 border border-amber-500/40 p-6 space-y-4">
                  <h3 className="font-display font-bold text-base text-white">
                    {editingParticipant.participant_id
                      ? `Edit Data & Validasi Dokumen Peserta (${editingParticipant.participant_id})`
                      : 'Tambah Peserta Baru'}
                  </h3>
                  <form onSubmit={handleSaveParticipant} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">Nama Guru *</label>
                      <input
                        type="text"
                        required
                        value={editingParticipant.full_name || ''}
                        onChange={(e) =>
                          setEditingParticipant({ ...editingParticipant, full_name: e.target.value })
                        }
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">
                        Pilih Asal Sekolah (Sheet SEKOLAH DB) *
                      </label>
                      <select
                        required
                        value={editingParticipant.school || ''}
                        onChange={(e) =>
                          setEditingParticipant({ ...editingParticipant, school: e.target.value })
                        }
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white"
                      >
                        <option value="">-- Pilih Sekolah dari Sheet SEKOLAH --</option>
                        {[...schoolsList]
                          .sort((a, b) => a.school_name.localeCompare(b.school_name, 'id'))
                          .map((sch) => (
                            <option key={sch.school_id} value={sch.school_name}>
                              {sch.school_name}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs text-slate-300 mb-1">Judul Inovasi *</label>
                      <input
                        type="text"
                        required
                        value={editingParticipant.innovation_title || ''}
                        onChange={(e) =>
                          setEditingParticipant({
                            ...editingParticipant,
                            innovation_title: e.target.value
                          })
                        }
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs text-slate-300 mb-1">
                        Link Folder Google Drive
                      </label>
                      <input
                        type="url"
                        value={editingParticipant.drive_folder_url || ''}
                        onChange={(e) =>
                          setEditingParticipant({
                            ...editingParticipant,
                            drive_folder_url: e.target.value
                          })
                        }
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">
                        URL File Video Langsung / YouTube (Untuk Pratinjau Iframe Juri)
                      </label>
                      <input
                        type="url"
                        value={editingParticipant.video_url || ''}
                        onChange={(e) =>
                          setEditingParticipant({ ...editingParticipant, video_url: e.target.value })
                        }
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">
                        URL File Modul Ajar (Google Docs / PDF Drive)
                      </label>
                      <input
                        type="url"
                        value={editingParticipant.lesson_module_url || ''}
                        onChange={(e) =>
                          setEditingParticipant({
                            ...editingParticipant,
                            lesson_module_url: e.target.value
                          })
                        }
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">
                        URL Media Pembelajaran
                      </label>
                      <input
                        type="url"
                        value={editingParticipant.learning_media_url || ''}
                        onChange={(e) =>
                          setEditingParticipant({
                            ...editingParticipant,
                            learning_media_url: e.target.value
                          })
                        }
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">
                        Status Verifikasi & Kelayakan Penjurian
                      </label>
                      <select
                        value={editingParticipant.verification_status || 'MENUNGGU'}
                        onChange={(e) =>
                          setEditingParticipant({
                            ...editingParticipant,
                            verification_status: e.target.value as any
                          })
                        }
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white"
                      >
                        <option value="MENUNGGU">MENUNGGU VERIFIKASI</option>
                        <option value="TERVERIFIKASI">TERVERIFIKASI (Layak Dinilai Juri)</option>
                        <option value="REVISI">PERLU PERBAIKAN TAUTAN</option>
                        <option value="DIKECUALIKAN">DIKECUALIKAN DARI PENJURIAN</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs text-slate-300 mb-1">
                        Catatan Verifikasi / Alasan Pengecualian Admin
                      </label>
                      <input
                        type="text"
                        value={editingParticipant.admin_notes || ''}
                        onChange={(e) =>
                          setEditingParticipant({
                            ...editingParticipant,
                            admin_notes: e.target.value
                          })
                        }
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white"
                      />
                    </div>
                    <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingParticipant(null)}
                        className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold"
                      >
                        Simpan Data Peserta
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Searchable Participants Table (All 10 Required Columns) */}
              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-3.5 px-3">No</th>
                      <th className="py-3.5 px-3">ID Peserta</th>
                      <th className="py-3.5 px-3">Nama Guru</th>
                      <th className="py-3.5 px-3">Asal Sekolah</th>
                      <th className="py-3.5 px-3">Judul Inovasi</th>
                      <th className="py-3.5 px-3">Tanggal Pengumpulan</th>
                      <th className="py-3.5 px-3">Link Karya</th>
                      <th className="py-3.5 px-3">Status Verifikasi</th>
                      <th className="py-3.5 px-3">Status Penjurian</th>
                      <th className="py-3.5 px-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {participants
                      .filter((p) => {
                        const q = participantSearch.toLowerCase();
                        return (
                          !q ||
                          p.full_name.toLowerCase().includes(q) ||
                          p.school.toLowerCase().includes(q) ||
                          p.participant_id.toLowerCase().includes(q) ||
                          p.innovation_title.toLowerCase().includes(q)
                        );
                      })
                      .map((p, idx) => {
                        const pEvals = evaluations.filter(
                          (e) => e.participant_id === p.participant_id && e.evaluation_status === 'FINAL'
                        );
                        const pAssigns = assignments.filter(
                          (a) => a.participant_id === p.participant_id && a.assignment_status === 'ACTIVE'
                        );
                        const judgingStatus =
                          pAssigns.length === 0
                            ? 'Belum Ditugaskan'
                            : pEvals.length >= pAssigns.length
                            ? `Lengkap (${pEvals.length}/${pAssigns.length})`
                            : `Proses (${pEvals.length}/${pAssigns.length})`;

                        return (
                          <tr key={p.participant_id} className="hover:bg-slate-900/50">
                            <td className="py-3 px-3 font-mono text-slate-400 tabular-nums">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-3 font-mono font-semibold text-amber-300 tabular-nums">
                              {p.participant_id}
                            </td>
                            <td className="py-3 px-3 font-semibold text-white">{p.full_name}</td>
                            <td className="py-3 px-3 text-slate-300">{p.school}</td>
                            <td className="py-3 px-3 text-slate-300 max-w-xs truncate">
                              {p.innovation_title}
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-400 tabular-nums">
                              {p.submitted_at?.slice(0, 16).replace('T', ' ')}
                            </td>
                            <td className="py-3 px-3">
                              {p.drive_folder_url ? (
                                <a
                                  href={p.drive_folder_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sky-400 hover:underline inline-flex items-center gap-1"
                                >
                                  <span>Buka Drive</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`font-semibold ${
                                  p.verification_status === 'TERVERIFIKASI'
                                    ? 'text-emerald-400'
                                    : p.verification_status === 'DIKECUALIKAN'
                                    ? 'text-rose-400'
                                    : 'text-amber-300'
                                }`}
                              >
                                {p.verification_status}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-300 tabular-nums">
                              {judgingStatus}
                            </td>
                            <td className="py-3 px-3 text-right space-x-2 whitespace-nowrap">
                              {p.verification_status !== 'TERVERIFIKASI' && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await fetch('/api/admin/participants', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        participant: { ...p, verification_status: 'TERVERIFIKASI' }
                                      })
                                    });
                                    showNotice('success', `Peserta ${p.full_name} diverifikasi.`);
                                    fetchAdminSummary(false);
                                  }}
                                  className="text-emerald-400 hover:underline font-semibold"
                                >
                                  Verifikasi
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setEditingParticipant(p)}
                                className="text-amber-300 hover:underline font-semibold"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteParticipant(p.participant_id, p.full_name)}
                                className="text-rose-400 hover:underline"
                              >
                                Hapus
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    {participants.length === 0 && (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-slate-400">
                          Belum ada data peserta. Klik "Tambah Peserta" atau gunakan formulir pengumpulan publik.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =================================================================
           * MENU 6 — MANAJEMEN JURI & PENUGASAN (Section 7 & Section 14)
           * ================================================================= */}
          {activeMenu === 'JURI' && (
            <div className="space-y-6">
              {/* Sub-tab Switcher */}
              <div className="flex items-center gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl w-fit">
                <button
                  type="button"
                  onClick={() => setJurySubTab('ACCOUNTS')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    jurySubTab === 'ACCOUNTS'
                      ? 'bg-amber-400 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  A. Kelola Akun Dewan Juri ({juryList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setJurySubTab('ASSIGNMENTS')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    jurySubTab === 'ASSIGNMENTS'
                      ? 'bg-amber-400 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  B. Penugasan Juri & Konflik Kepentingan ({assignments.filter((a) => a.assignment_status === 'ACTIVE').length})
                </button>
              </div>

              {jurySubTab === 'ACCOUNTS' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* ADD / EDIT JURY FORM (10 Required Fields) */}
                  <form
                    onSubmit={handleSaveJuryAccount}
                    className="lg:col-span-5 rounded-2xl bg-slate-900/85 border border-slate-800 p-6 space-y-4"
                  >
                    <h2 className="font-display font-bold text-base text-white border-b border-slate-800 pb-2.5">
                      {juryForm.jury_id ? `Edit Data Juri (${juryForm.jury_id})` : 'Tambah Akun Dewan Juri Baru'}
                    </h2>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        1. Nama Lengkap Juri (Beserta Gelar) *
                      </label>
                      <input
                        type="text"
                        required
                        value={juryForm.full_name}
                        onChange={(e) => setJuryForm({ ...juryForm, full_name: e.target.value })}
                        placeholder="Contoh: Drs. H. Ahmad Fauzi, M.Pd."
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          2. NIP / Identitas (Opsional)
                        </label>
                        <input
                          type="text"
                          value={juryForm.identity_number}
                          onChange={(e) =>
                            setJuryForm({ ...juryForm, identity_number: e.target.value })
                          }
                          className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          3. Unsur Juri *
                        </label>
                        <select
                          value={juryForm.jury_category}
                          onChange={(e) =>
                            setJuryForm({ ...juryForm, jury_category: e.target.value as any })
                          }
                          className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white"
                        >
                          <option value="Korwilcam">Korwilcam</option>
                          <option value="Pengawas">Pengawas</option>
                          <option value="Praktisi">Praktisi</option>
                          <option value="Lainnya">Lainnya</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          4. Instansi / Asal Lembaga
                        </label>
                        <input
                          type="text"
                          value={juryForm.institution}
                          onChange={(e) => setJuryForm({ ...juryForm, institution: e.target.value })}
                          placeholder="Korwilcam Pendidikan Beji"
                          className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          5. Nomor WhatsApp (Opsional)
                        </label>
                        <input
                          type="text"
                          value={juryForm.whatsapp}
                          onChange={(e) => setJuryForm({ ...juryForm, whatsapp: e.target.value })}
                          className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          6. Username Login *
                        </label>
                        <input
                          type="text"
                          required
                          value={juryForm.username}
                          onChange={(e) => setJuryForm({ ...juryForm, username: e.target.value })}
                          placeholder="juri_beji1"
                          className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white font-mono"
                        />
                      </div>

                      {!juryForm.jury_id && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-semibold text-slate-300">
                              7. Password Awal *
                            </label>
                            <button
                              type="button"
                              onClick={generateTempPassword}
                              className="text-[11px] text-amber-400 hover:underline"
                            >
                              Buat Otomatis
                            </button>
                          </div>
                          <input
                            type="text"
                            required
                            value={juryForm.initial_password}
                            onChange={(e) =>
                              setJuryForm({ ...juryForm, initial_password: e.target.value })
                            }
                            placeholder="Minimal 4 karakter"
                            className="w-full rounded-xl bg-slate-950 border border-amber-500/40 px-3 py-2 text-xs text-amber-300 font-mono"
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          8. Status Akun
                        </label>
                        <select
                          value={juryForm.account_status}
                          onChange={(e) =>
                            setJuryForm({ ...juryForm, account_status: e.target.value as any })
                          }
                          className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white"
                        >
                          <option value="AKTIF">Aktif</option>
                          <option value="NONAKTIF">Nonaktif</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          9. Penugasan Tahap
                        </label>
                        <select
                          value={juryForm.assigned_stages}
                          onChange={(e) =>
                            setJuryForm({ ...juryForm, assigned_stages: e.target.value as any })
                          }
                          className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white"
                        >
                          <option value="PENYISIHAN">Penyisihan</option>
                          <option value="FINAL">Final</option>
                          <option value="KEDUANYA">Keduanya</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        10. Catatan Admin (Opsional)
                      </label>
                      <input
                        type="text"
                        value={juryForm.admin_notes}
                        onChange={(e) => setJuryForm({ ...juryForm, admin_notes: e.target.value })}
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white"
                      />
                    </div>

                    {!juryForm.jury_id && (
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={juryForm.must_change_password}
                          onChange={(e) =>
                            setJuryForm({ ...juryForm, must_change_password: e.target.checked })
                          }
                        />
                        <span>Wajibkan ganti password saat login pertama kali</span>
                      </label>
                    )}

                    <div className="flex items-center gap-2 pt-2">
                      {juryForm.jury_id && (
                        <button
                          type="button"
                          onClick={() =>
                            setJuryForm({
                              jury_id: '',
                              full_name: '',
                              identity_number: '',
                              jury_category: 'Pengawas',
                              institution: '',
                              whatsapp: '',
                              username: '',
                              initial_password: '',
                              account_status: 'AKTIF',
                              assigned_stages: 'PENYISIHAN',
                              admin_notes: '',
                              must_change_password: true
                            })
                          }
                          className="px-4 py-2.5 rounded-xl bg-slate-800 text-xs text-slate-300"
                        >
                          Batal Edit
                        </button>
                      )}
                      <button
                        type="submit"
                        className="flex-1 py-2.5 rounded-xl font-bold text-xs text-slate-950 bg-gradient-to-r from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400"
                      >
                        {juryForm.jury_id ? 'Simpan Perubahan Juri' : 'Tambah Akun Juri'}
                      </button>
                    </div>
                  </form>

                  {/* Jury List Table */}
                  <div className="lg:col-span-7 rounded-2xl bg-slate-900/85 border border-slate-800 p-6 space-y-4">
                    <h2 className="font-display font-bold text-base text-white">
                      Daftar Akun Dewan Juri Terdaftar
                    </h2>

                    {juryList.length === 0 ? (
                      <p className="text-xs text-slate-400 py-8 text-center">
                        Belum ada akun juri. Gunakan formulir di sebelah kiri untuk membuat akun juri.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-400">
                              <th className="py-3 px-2">ID / Username</th>
                              <th className="py-3 px-2">Nama Lengkap & Unsur</th>
                              <th className="py-3 px-2">Tahap</th>
                              <th className="py-3 px-2">Status</th>
                              <th className="py-3 px-2">Progres Nilai</th>
                              <th className="py-3 px-2 text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/70">
                            {juryList.map((j) => {
                              const jAsg = assignments.filter(
                                (a) => a.jury_id === j.jury_id && a.assignment_status === 'ACTIVE'
                              );
                              const jFin = evaluations.filter(
                                (e) => e.jury_id === j.jury_id && e.evaluation_status === 'FINAL'
                              );
                              return (
                                <tr key={j.jury_id} className="hover:bg-slate-900/50">
                                  <td className="py-3 px-2 font-mono">
                                    <div className="text-amber-300 font-semibold">@{j.username}</div>
                                    <div className="text-[10px] text-slate-500">{j.jury_id}</div>
                                  </td>
                                  <td className="py-3 px-2">
                                    <div className="font-semibold text-white">{j.full_name}</div>
                                    <div className="text-slate-400">
                                      {j.jury_category} · {j.institution || '-'}
                                    </div>
                                  </td>
                                  <td className="py-3 px-2 font-mono">{j.assigned_stages}</td>
                                  <td className="py-3 px-2">
                                    <span
                                      className={`font-semibold ${
                                        j.account_status === 'AKTIF'
                                          ? 'text-emerald-400'
                                          : 'text-rose-400'
                                      }`}
                                    >
                                      {j.account_status}
                                    </span>
                                  </td>
                                  <td className="py-3 px-2 font-mono tabular-nums">
                                    {jFin.length} / {jAsg.length} Karya
                                  </td>
                                  <td className="py-3 px-2 text-right space-x-2 whitespace-nowrap">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setJuryForm({
                                          jury_id: j.jury_id,
                                          full_name: j.full_name,
                                          identity_number: j.identity_number,
                                          jury_category: j.jury_category,
                                          institution: j.institution,
                                          whatsapp: j.whatsapp,
                                          username: j.username,
                                          initial_password: '',
                                          account_status: j.account_status,
                                          assigned_stages: j.assigned_stages,
                                          admin_notes: j.admin_notes || '',
                                          must_change_password: j.must_change_password
                                        })
                                      }
                                      className="text-amber-300 hover:underline font-semibold"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setResetPassModal({ jury: j, newPass: '' })
                                      }
                                      className="text-sky-400 hover:underline font-semibold"
                                    >
                                      Reset Password
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAssignJuryId(j.jury_id);
                                        setJurySubTab('ASSIGNMENTS');
                                      }}
                                      className="text-emerald-400 hover:underline font-semibold"
                                    >
                                      Penugasan
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* SECTION 14 — JURY ASSIGNMENTS & WORKLOAD DISTRIBUTION */
                <div className="space-y-6">
                  <div className="rounded-2xl bg-slate-900/85 border border-slate-800 p-6 space-y-5">
                    <h2 className="font-display font-bold text-base text-white">
                      Distribusi Penugasan Karya ke Dewan Juri
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                      <div>
                        <label className="block text-xs text-slate-300 mb-1">
                          Pilih Anggota Dewan Juri
                        </label>
                        <select
                          value={assignJuryId}
                          onChange={(e) => setAssignJuryId(e.target.value)}
                          className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white"
                        >
                          <option value="">-- Pilih Juri --</option>
                          {juryList
                            .filter((j) => j.account_status === 'AKTIF')
                            .map((j) => (
                              <option key={j.jury_id} value={j.jury_id}>
                                {j.full_name} ({j.jury_category})
                              </option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-slate-300 mb-1">
                          Tahap Kompetisi
                        </label>
                        <select
                          value={assignStage}
                          onChange={(e) => setAssignStage(e.target.value as JudgingStage)}
                          className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white"
                        >
                          <option value="PENYISIHAN">Tahap 1 — PENYISIHAN</option>
                          <option value="FINAL">Tahap 2 — FINAL TOP 5</option>
                        </select>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleAssignJury('ALL_ELIGIBLE')}
                          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 text-slate-950 text-xs font-bold"
                        >
                          Tugaskan Semua Peserta Layak
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAssignJury('SELECTED')}
                          disabled={selectedParticipantIdsForAssign.length === 0}
                          className="px-4 py-2.5 rounded-xl bg-sky-500/20 border border-sky-400/40 text-sky-200 text-xs font-semibold disabled:opacity-40"
                        >
                          Tugaskan Pilihan ({selectedParticipantIdsForAssign.length})
                        </button>
                      </div>
                    </div>

                    {/* Eligible Participants Checkbox Picker */}
                    <div className="pt-3 border-t border-slate-800">
                      <div className="text-xs font-semibold text-slate-300 mb-2">
                        Pilih Peserta Tertentu untuk Ditugaskan ({assignStage}):
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                        {participants
                          .filter((p) =>
                            assignStage === 'FINAL'
                              ? finalisPemenang.some(
                                  (f) => f.participant_id === p.participant_id && f.selection_type === 'TOP_5'
                                )
                              : p.verification_status === 'TERVERIFIKASI'
                          )
                          .map((p) => {
                            const checked = selectedParticipantIdsForAssign.includes(p.participant_id);
                            return (
                              <label
                                key={p.participant_id}
                                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedParticipantIdsForAssign([
                                        ...selectedParticipantIdsForAssign,
                                        p.participant_id
                                      ]);
                                    } else {
                                      setSelectedParticipantIdsForAssign(
                                        selectedParticipantIdsForAssign.filter(
                                          (id) => id !== p.participant_id
                                        )
                                      );
                                    }
                                  }}
                                />
                                <span className="truncate">
                                  <strong className="font-mono text-amber-300">{p.participant_id}</strong> ·{' '}
                                  {p.full_name} ({p.school})
                                </span>
                              </label>
                            );
                          })}
                      </div>
                    </div>
                  </div>

                  {/* Active Assignments & Conflict Management Table */}
                  <div className="rounded-2xl bg-slate-900/85 border border-slate-800 p-6 space-y-4">
                    <h3 className="font-display font-bold text-base text-white">
                      Daftar Penugasan Aktif & Laporan Konflik Kepentingan
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400">
                            <th className="py-3 px-3">ID Penugasan</th>
                            <th className="py-3 px-3">Nama Juri</th>
                            <th className="py-3 px-3">Peserta & Sekolah</th>
                            <th className="py-3 px-3">Tahap</th>
                            <th className="py-3 px-3">Status Nilai</th>
                            <th className="py-3 px-3">Konflik Kepentingan</th>
                            <th className="py-3 px-3 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/70">
                          {assignments
                            .filter((a) => a.assignment_status === 'ACTIVE')
                            .map((asg) => {
                              const j = juryList.find((item) => item.jury_id === asg.jury_id);
                              const p = participants.find(
                                (item) => item.participant_id === asg.participant_id
                              );
                              const ev = evaluations.find(
                                (e) =>
                                  e.jury_id === asg.jury_id &&
                                  e.participant_id === asg.participant_id &&
                                  e.stage === asg.stage
                              );
                              return (
                                <tr key={asg.assignment_id}>
                                  <td className="py-3 px-3 font-mono text-slate-400">
                                    {asg.assignment_id}
                                  </td>
                                  <td className="py-3 px-3 font-semibold text-white">
                                    {j?.full_name || asg.jury_id}
                                  </td>
                                  <td className="py-3 px-3">
                                    <span className="font-mono text-amber-300">
                                      {asg.participant_id}
                                    </span>{' '}
                                    — {p?.full_name} ({p?.school})
                                  </td>
                                  <td className="py-3 px-3 font-mono">{asg.stage}</td>
                                  <td className="py-3 px-3">
                                    {ev?.evaluation_status || 'BELUM_DINILAI'}
                                  </td>
                                  <td className="py-3 px-3">
                                    {asg.conflict_flag ? (
                                      <span className="text-rose-400 font-semibold">
                                        DILAPORKAN: {asg.conflict_notes}
                                      </span>
                                    ) : (
                                      <span className="text-slate-500">Aman</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-3 text-right space-x-2">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveAssignment(asg.assignment_id)}
                                      className="text-rose-400 hover:underline font-semibold"
                                    >
                                      Hapus Tugas
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Reset Jury Password Modal */}
              {resetPassModal && (
                <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
                  <form
                    onSubmit={handleResetJuryPassword}
                    className="max-w-md w-full rounded-3xl bg-slate-900 border border-amber-500/40 p-6 space-y-4"
                  >
                    <h3 className="font-display font-bold text-base text-white">
                      Reset Password Juri: {resetPassModal.jury.full_name}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Password baru akan di-hash menggunakan crypto.scrypt dan juri akan diminta mengganti password saat login berikutnya.
                    </p>
                    <input
                      type="text"
                      required
                      minLength={4}
                      value={resetPassModal.newPass}
                      onChange={(e) =>
                        setResetPassModal({ ...resetPassModal, newPass: e.target.value })
                      }
                      placeholder="Masukkan password sementara baru"
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-sm font-mono text-amber-300"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setResetPassModal(null)}
                        className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold"
                      >
                        Simpan Password Baru
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* =================================================================
           * MENU 7 — KRITERIA PENILAIAN (Section 13)
           * ================================================================= */}
          {activeMenu === 'KRITERIA' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl">
                  {(['PENYISIHAN', 'FINAL'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setCriteriaStageTab(st)}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                        criteriaStageTab === st
                          ? 'bg-amber-400 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Rubrik Tahap {st}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPreviewJuryForm(!previewJuryForm)}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-200 inline-flex items-center gap-1.5"
                  >
                    <Eye className="w-4 h-4 text-sky-400" />
                    <span>{previewJuryForm ? 'Tutup Pratinjau Form Juri' : 'Pratinjau Form Juri'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const stageCrits = criteriaList.filter((c) => c.stage === criteriaStageTab);
                      const newCrit: ScoringCriterion = {
                        criterion_id: `KRIT-${criteriaStageTab.slice(0, 4)}-${Date.now().toString().slice(-4)}`,
                        stage: criteriaStageTab,
                        rubric_version: stageCrits[0]?.rubric_version || 1,
                        criterion_name: 'Kriteria Baru',
                        description: 'Deskripsi kriteria penilaian...',
                        indicators_json: JSON.stringify(['Indikator 1', 'Indikator 2']),
                        weight_percentage: 0,
                        minimum_score: 0,
                        maximum_score: 100,
                        display_order: stageCrits.length + 1,
                        active: true,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                      };
                      setCriteriaList([...criteriaList, newCrit]);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 border border-amber-500/40 text-xs font-semibold text-amber-300 inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Kriteria</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveStageCriteria}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 text-slate-950 text-xs font-bold shadow-md"
                  >
                    Simpan Rubrik ({criteriaStageTab})
                  </button>
                </div>
              </div>

              {/* Weight Sum Validation Banner */}
              {(() => {
                const activeStageCrits = criteriaList.filter(
                  (c) => c.stage === criteriaStageTab && c.active
                );
                const sum = activeStageCrits.reduce((acc, c) => acc + Number(c.weight_percentage || 0), 0);
                const valid = Math.abs(sum - 100) < 0.01;
                return (
                  <div
                    className={`rounded-2xl p-4 border flex items-center justify-between text-xs font-semibold ${
                      valid
                        ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-200'
                        : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                    }`}
                  >
                    <span>
                      Aturan Validasi Rubrik: Total bobot kriteria aktif wajib berjumlah tepat 100% (Rentang Skor: 0–100).
                    </span>
                    <span className="font-mono text-base tabular-nums">
                      Total Bobot Saat Ini: {sum}%
                    </span>
                  </div>
                );
              })()}

              {/* Editable Criteria Cards */}
              <div className="space-y-4">
                {criteriaList
                  .filter((c) => c.stage === criteriaStageTab)
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((crit) => {
                    let parsedIndicators: string[] = [];
                    try {
                      parsedIndicators = JSON.parse(crit.indicators_json || '[]');
                    } catch {
                      parsedIndicators = [];
                    }

                    const updateCrit = (patch: Partial<ScoringCriterion>) => {
                      setCriteriaList((prev) =>
                        prev.map((item) =>
                          item.criterion_id === crit.criterion_id ? { ...item, ...patch } : item
                        )
                      );
                    };

                    return (
                      <div
                        key={crit.criterion_id}
                        className="rounded-2xl bg-slate-900/85 border border-slate-800 p-5 space-y-4"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                          <div className="md:col-span-2">
                            <div className="text-[10px] text-slate-400">ID & Versi Rubrik</div>
                            <div className="font-mono text-xs text-amber-300">
                              {crit.criterion_id} (v{crit.rubric_version})
                            </div>
                          </div>
                          <div className="md:col-span-5">
                            <label className="block text-[11px] text-slate-400 mb-1">
                              Nama Kriteria
                            </label>
                            <input
                              type="text"
                              value={crit.criterion_name}
                              onChange={(e) => updateCrit({ criterion_name: e.target.value })}
                              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs font-bold text-white"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[11px] text-slate-400 mb-1">
                              Bobot (%)
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={crit.weight_percentage}
                              onChange={(e) =>
                                updateCrit({ weight_percentage: Number(e.target.value) })
                              }
                              className="w-full rounded-xl bg-slate-950 border border-amber-500/40 px-3 py-2 text-xs font-mono font-bold text-amber-300 tabular-nums"
                            />
                          </div>
                          <div className="md:col-span-1">
                            <label className="block text-[11px] text-slate-400 mb-1">
                              Urutan
                            </label>
                            <input
                              type="number"
                              value={crit.display_order}
                              onChange={(e) =>
                                updateCrit({ display_order: Number(e.target.value) })
                              }
                              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-2.5 py-2 text-xs font-mono text-white tabular-nums"
                            />
                          </div>
                          <div className="md:col-span-2 flex items-center justify-end gap-3 pt-4">
                            <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={crit.active}
                                onChange={(e) => updateCrit({ active: e.target.checked })}
                              />
                              <span>Aktif</span>
                            </label>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">
                            Deskripsi Kriteria
                          </label>
                          <input
                            type="text"
                            value={crit.description}
                            onChange={(e) => updateCrit({ description: e.target.value })}
                            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-200"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">
                            Indikator Penilaian (Satu indikator per baris)
                          </label>
                          <textarea
                            rows={4}
                            value={parsedIndicators.join('\n')}
                            onChange={(e) =>
                              updateCrit({
                                indicators_json: JSON.stringify(
                                  e.target.value
                                    .split('\n')
                                    .map((s) => s.trim())
                                    .filter(Boolean)
                                )
                              })
                            }
                            className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-slate-300"
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* =================================================================
           * MENU 8 — MONITORING PENJURIAN (Section 15)
           * ================================================================= */}
          {activeMenu === 'MONITORING' && (
            <div className="space-y-8">
              {/* Table 1: Jury Progress Table */}
              <div className="rounded-2xl bg-slate-900/85 border border-slate-800 p-6 space-y-4">
                <h2 className="font-display font-bold text-lg text-white">
                  Progres Penyelesaian Penilaian per Dewan Juri
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-3 px-3">Nama Juri</th>
                        <th className="py-3 px-3">Tahap</th>
                        <th className="py-3 px-3 text-right">Ditugaskan</th>
                        <th className="py-3 px-3 text-right">Belum Dinilai</th>
                        <th className="py-3 px-3 text-right">Draft</th>
                        <th className="py-3 px-3 text-right">Final</th>
                        <th className="py-3 px-3">Progres</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {juryList.map((j) => {
                        const jAsg = assignments.filter(
                          (a) => a.jury_id === j.jury_id && a.assignment_status === 'ACTIVE'
                        );
                        const jEvals = evaluations.filter((e) => e.jury_id === j.jury_id);
                        const finalCnt = jEvals.filter((e) => e.evaluation_status === 'FINAL').length;
                        const draftCnt = jEvals.filter((e) => e.evaluation_status === 'DRAFT').length;
                        const notScoredCnt = Math.max(0, jAsg.length - finalCnt - draftCnt);
                        const pct = jAsg.length > 0 ? Math.round((finalCnt / jAsg.length) * 100) : 0;

                        return (
                          <tr key={j.jury_id}>
                            <td className="py-3 px-3 font-semibold text-white">
                              {j.full_name} <span className="text-slate-400">({j.jury_category})</span>
                            </td>
                            <td className="py-3 px-3 font-mono">{j.assigned_stages}</td>
                            <td className="py-3 px-3 text-right font-mono tabular-nums">
                              {jAsg.length}
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-rose-400 tabular-nums">
                              {notScoredCnt}
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-amber-300 tabular-nums">
                              {draftCnt}
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-emerald-400 tabular-nums">
                              {finalCnt}
                            </td>
                            <td className="py-3 px-3 w-48">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 rounded-full bg-slate-950 overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-400 rounded-full"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="font-mono text-xs tabular-nums">{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Table 2: Individual Evaluation Records & Admin Reopen Action */}
              <div className="rounded-2xl bg-slate-900/85 border border-slate-800 p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <h2 className="font-display font-bold text-lg text-white">
                    Monitoring Lembar Evaluasi & Pembukaan Kembali (Reopen)
                  </h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={monitorStageFilter}
                      onChange={(e) => setMonitorStageFilter(e.target.value as any)}
                      className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white"
                    >
                      <option value="ALL">Semua Tahap</option>
                      <option value="PENYISIHAN">PENYISIHAN</option>
                      <option value="FINAL">FINAL</option>
                    </select>
                    <select
                      value={monitorJuryFilter}
                      onChange={(e) => setMonitorJuryFilter(e.target.value)}
                      className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white"
                    >
                      <option value="ALL">Semua Juri</option>
                      {juryList.map((j) => (
                        <option key={j.jury_id} value={j.jury_id}>
                          {j.full_name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={monitorSchoolFilter}
                      onChange={(e) => setMonitorSchoolFilter(e.target.value)}
                      className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white"
                    >
                      <option value="">Semua Sekolah (Sheet SEKOLAH DB)</option>
                      {[...schoolsList]
                        .sort((a, b) => a.school_name.localeCompare(b.school_name, 'id'))
                        .map((sch) => (
                          <option key={sch.school_id} value={sch.school_name}>
                            {sch.school_name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-3 px-3">ID Evaluasi</th>
                        <th className="py-3 px-3">Juri Penilai</th>
                        <th className="py-3 px-3">Peserta & Sekolah</th>
                        <th className="py-3 px-3">Tahap</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-right">Skor Tertimbang</th>
                        <th className="py-3 px-3 text-right">Aksi Admin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {evaluations
                        .filter((ev) =>
                          monitorStageFilter === 'ALL' ? true : ev.stage === monitorStageFilter
                        )
                        .filter((ev) =>
                          monitorJuryFilter === 'ALL' ? true : ev.jury_id === monitorJuryFilter
                        )
                        .filter((ev) => {
                          if (!monitorSchoolFilter) return true;
                          const p = participants.find((item) => item.participant_id === ev.participant_id);
                          const q = monitorSchoolFilter.toLowerCase();
                          return (
                            p?.full_name.toLowerCase().includes(q) ||
                            p?.school.toLowerCase().includes(q) ||
                            ev.participant_id.toLowerCase().includes(q)
                          );
                        })
                        .map((ev) => {
                          const j = juryList.find((item) => item.jury_id === ev.jury_id);
                          const p = participants.find((item) => item.participant_id === ev.participant_id);
                          return (
                            <tr key={ev.evaluation_id}>
                              <td className="py-3 px-3 font-mono text-slate-400">
                                {ev.evaluation_id}
                              </td>
                              <td className="py-3 px-3 font-semibold text-white">
                                {j?.full_name || ev.jury_id}
                              </td>
                              <td className="py-3 px-3">
                                <span className="font-mono text-amber-300">{ev.participant_id}</span> —{' '}
                                {p?.full_name} ({p?.school})
                              </td>
                              <td className="py-3 px-3 font-mono">{ev.stage}</td>
                              <td className="py-3 px-3">
                                <span
                                  className={`font-semibold ${
                                    ev.evaluation_status === 'FINAL'
                                      ? 'text-emerald-400'
                                      : 'text-amber-300'
                                  }`}
                                >
                                  {ev.evaluation_status}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-amber-400 tabular-nums">
                                {Number(ev.weighted_total).toFixed(2)}
                              </td>
                              <td className="py-3 px-3 text-right">
                                {ev.evaluation_status === 'FINAL' && (
                                  <button
                                    type="button"
                                    onClick={() => setReopenModal({ evaluation: ev, reason: '' })}
                                    className="text-sky-400 hover:underline font-semibold inline-flex items-center gap-1"
                                  >
                                    <Unlock className="w-3.5 h-3.5" />
                                    <span>Buka Kembali (Reopen)</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Reopen Evaluation Modal */}
              {reopenModal && (
                <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
                  <form
                    onSubmit={handleReopenEvaluation}
                    className="max-w-md w-full rounded-3xl bg-slate-900 border border-sky-500/40 p-6 space-y-4"
                  >
                    <h3 className="font-display font-bold text-base text-white">
                      Buka Kembali (Reopen) Penilaian Final
                    </h3>
                    <p className="text-xs text-slate-300">
                      Evaluasi ID: <strong className="font-mono">{reopenModal.evaluation.evaluation_id}</strong>.
                      Masukkan alasan resmi pembukaan kunci nilai untuk dicatat pada Log Audit.
                    </p>
                    <textarea
                      rows={3}
                      required
                      value={reopenModal.reason}
                      onChange={(e) => setReopenModal({ ...reopenModal, reason: e.target.value })}
                      placeholder="Contoh: Permintaan koreksi input kriteria oleh juri..."
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-white"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setReopenModal(null)}
                        className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-sky-500 text-slate-950 text-xs font-bold"
                      >
                        Buka Kunci ke DRAFT
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* =================================================================
           * MENU 9 — REKAP NILAI & PERINGKAT OTOMATIS (Section 16)
           * ================================================================= */}
          {activeMenu === 'REKAP' && (
            <div className="space-y-6 print-container">
              <div className="no-print flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl">
                  {(['PENYISIHAN', 'FINAL'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setRecapStage(st)}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                        recapStage === st
                          ? 'bg-amber-400 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Rekap Tahap {st}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <select
                    value={recapSchoolFilter}
                    onChange={(e) => setRecapSchoolFilter(e.target.value)}
                    className="rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-xs text-white"
                  >
                    <option value="">Semua Sekolah (Sheet SEKOLAH DB)</option>
                    {[...schoolsList]
                      .sort((a, b) => a.school_name.localeCompare(b.school_name, 'id'))
                      .map((sch) => (
                        <option key={sch.school_id} value={sch.school_name}>
                          {sch.school_name}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => exportRecapCsv(recapStage)}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 inline-flex items-center gap-1.5"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>Export CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 inline-flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4 text-amber-400" />
                    <span>Cetak / Export PDF</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Jury Columns Score Recap Table */}
              {(() => {
                const stageJurors = juryList.filter(
                  (j) => j.assigned_stages === recapStage || j.assigned_stages === 'KEDUANYA'
                );
                const stageRecaps = recapList
                  .filter((r) => r.stage === recapStage)
                  .sort((a, b) => {
                    if (a.rank && b.rank) return a.rank - b.rank;
                    if (a.rank) return -1;
                    if (b.rank) return 1;
                    return (b.average_score || 0) - (a.average_score || 0);
                  });

                return (
                  <div className="rounded-2xl bg-slate-900/85 border border-slate-800 p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h2 className="font-display font-bold text-lg text-white">
                          Tabel Rekapitulasi Nilai & Peringkat Resmi — Tahap {recapStage}
                        </h2>
                        <p className="text-xs text-slate-400">
                          Hanya nilai berstatus FINAL yang dihitung. Peringkat diurutkan tanpa pembulatan prematur.
                        </p>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400">
                            <th className="py-3.5 px-3">Rank</th>
                            <th className="py-3.5 px-3">ID Peserta</th>
                            <th className="py-3.5 px-3">Nama Guru</th>
                            <th className="py-3.5 px-3">Sekolah</th>
                            {stageJurors.map((j, idx) => (
                              <th key={j.jury_id} className="py-3.5 px-3 text-right">
                                Juri {idx + 1}
                                <div className="text-[10px] font-normal text-slate-500 truncate max-w-[110px]">
                                  {j.full_name}
                                </div>
                              </th>
                            ))}
                            <th className="py-3.5 px-3 text-right">Juri Final</th>
                            <th className="py-3.5 px-3 text-right">Rata-rata</th>
                            <th className="py-3.5 px-3">Status</th>
                            <th className="py-3.5 px-3 text-right no-print">Rincian</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/70">
                          {stageRecaps
                            .filter((r) => {
                              if (!recapSchoolFilter) return true;
                              const p = participants.find(
                                (item) => item.participant_id === r.participant_id
                              );
                              return p?.school
                                .toLowerCase()
                                .includes(recapSchoolFilter.toLowerCase());
                            })
                            .map((rec) => {
                              const p = participants.find(
                                (item) => item.participant_id === rec.participant_id
                              );
                              if (!p) return null;
                              return (
                                <tr key={`${rec.stage}-${rec.participant_id}`} className="hover:bg-slate-900/50">
                                  <td className="py-3 px-3 font-mono font-bold text-sm tabular-nums">
                                    {rec.rank ? (
                                      <span className="text-amber-400">
                                        #{rec.rank}
                                        {rec.is_tied ? ' (SERI)' : ''}
                                      </span>
                                    ) : (
                                      <span className="text-slate-600">-</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-3 font-mono text-amber-300 tabular-nums">
                                    {rec.participant_id}
                                  </td>
                                  <td className="py-3 px-3 font-semibold text-white">
                                    {p.full_name}
                                  </td>
                                  <td className="py-3 px-3 text-slate-300">{p.school}</td>
                                  {stageJurors.map((j) => {
                                    const ev = evaluations.find(
                                      (e) =>
                                        e.participant_id === rec.participant_id &&
                                        e.jury_id === j.jury_id &&
                                        e.stage === recapStage
                                    );
                                    return (
                                      <td
                                        key={j.jury_id}
                                        className="py-3 px-3 text-right font-mono tabular-nums"
                                      >
                                        {ev?.evaluation_status === 'FINAL' ? (
                                          <span className="text-white font-semibold">
                                            {Number(ev.weighted_total).toFixed(2)}
                                          </span>
                                        ) : ev?.evaluation_status === 'DRAFT' ? (
                                          <span className="text-amber-400/70">Draft</span>
                                        ) : (
                                          <span className="text-slate-600">-</span>
                                        )}
                                      </td>
                                    );
                                  })}
                                  <td className="py-3 px-3 text-right font-mono tabular-nums">
                                    {rec.finalized_jurors}/{rec.required_jurors}
                                  </td>
                                  <td className="py-3 px-3 text-right font-mono font-bold text-base text-emerald-400 tabular-nums">
                                    {rec.average_score !== null
                                      ? Number(rec.average_score).toFixed(2)
                                      : '-'}
                                  </td>
                                  <td className="py-3 px-3">
                                    {rec.evaluation_complete ? (
                                      <span className="text-emerald-400 font-semibold">
                                        LENGKAP {rec.admin_exception ? '(Disahkan)' : ''}
                                      </span>
                                    ) : (
                                      <span className="text-rose-400 font-semibold">
                                        INCOMPLETE
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-3 text-right space-x-2 no-print whitespace-nowrap">
                                    <button
                                      type="button"
                                      onClick={() => setInspectParticipantEval(p)}
                                      className="text-sky-400 hover:underline font-semibold"
                                    >
                                      Drill-Down Nilai
                                    </button>
                                    {!rec.evaluation_complete && rec.finalized_jurors > 0 && (
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          await fetch('/api/admin/results/confirm', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                              action: 'APPROVE_INCOMPLETE_EXCEPTION',
                                              participant_id: rec.participant_id,
                                              stage: recapStage,
                                              decision_notes: 'Pengecualian disetujui Admin'
                                            })
                                          });
                                          fetchAdminSummary(false);
                                        }}
                                        className="text-amber-300 hover:underline"
                                      >
                                        Sahkan Pengecualian
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* Drill-Down Modal for Individual Jury Criterion Scores & Notes */}
              {inspectParticipantEval && (
                <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="max-w-3xl w-full max-h-[85vh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-700 p-6 sm:p-8 space-y-6">
                    <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
                      <div>
                        <span className="font-mono text-xs text-amber-400">
                          {inspectParticipantEval.participant_id} · Tahap {recapStage}
                        </span>
                        <h3 className="font-display font-bold text-xl text-white">
                          Rincian Per Kriteria & Catatan Juri: {inspectParticipantEval.full_name}
                        </h3>
                        <p className="text-xs text-slate-400">
                          {inspectParticipantEval.school} — {inspectParticipantEval.innovation_title}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setInspectParticipantEval(null)}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-xs text-slate-200"
                      >
                        Tutup
                      </button>
                    </div>

                    <div className="space-y-4">
                      {evaluations
                        .filter(
                          (e) =>
                            e.participant_id === inspectParticipantEval.participant_id &&
                            e.stage === recapStage
                        )
                        .map((ev) => {
                          const j = juryList.find((item) => item.jury_id === ev.jury_id);
                          const dets = evalDetails.filter(
                            (d) => d.evaluation_id === ev.evaluation_id
                          );
                          return (
                            <div
                              key={ev.evaluation_id}
                              className="rounded-2xl bg-slate-950 border border-slate-800 p-5 space-y-3"
                            >
                              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                                <div>
                                  <span className="font-bold text-sm text-white">
                                    {j?.full_name || ev.jury_id}
                                  </span>
                                  <span className="ml-2 text-xs text-slate-400">
                                    Status: {ev.evaluation_status}
                                  </span>
                                </div>
                                <div className="font-mono font-bold text-lg text-amber-400 tabular-nums">
                                  Total: {Number(ev.weighted_total).toFixed(2)}
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {dets.map((d) => (
                                  <div
                                    key={d.detail_id}
                                    className="rounded-xl bg-slate-900 border border-slate-800 p-3 space-y-1"
                                  >
                                    <div className="text-xs font-semibold text-white">
                                      {d.criterion_name_snapshot} ({d.weight_snapshot}%)
                                    </div>
                                    <div className="font-mono text-sm text-amber-300 tabular-nums">
                                      Skor: {d.score ?? '-'} → Tertimbang: {Number(d.weighted_score).toFixed(2)}
                                    </div>
                                    {d.criterion_notes && (
                                      <p className="text-[11px] text-slate-400 italic">
                                        "{d.criterion_notes}"
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2">
                                <div>
                                  <span className="text-slate-400 block">Kelebihan Karya:</span>
                                  <span className="text-slate-200">{ev.strengths || '-'}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block">Perlu Ditingkatkan:</span>
                                  <span className="text-slate-200">{ev.improvements || '-'}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block">Rekomendasi Akhir:</span>
                                  <span className="text-slate-200">{ev.recommendations || '-'}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =================================================================
           * MENU 10 — FINALIS TOP 5 & PEMENANG (Section 12 & Section 16)
           * ================================================================= */}
          {activeMenu === 'FINALIS_PEMENANG' && (
            <div className="space-y-8">
              {/* Part 1: TETAPKAN TOP 5 */}
              <div className="rounded-2xl bg-slate-900/85 border border-amber-500/30 p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="font-display font-bold text-lg text-white">
                      1. Penetapan Resmi Finalis Top 5 (Hasil Seleksi Penyisihan)
                    </h2>
                    <p className="text-xs text-slate-400">
                      Pilih hingga 5 peserta terbaik dari peringkat penyisihan. Pengumuman tidak dipublikasikan otomatis tanpa persetujuan Anda.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const best5 = recapList
                        .filter((r) => r.stage === 'PENYISIHAN' && r.evaluation_complete)
                        .sort((a, b) => (a.rank || 999) - (b.rank || 999))
                        .slice(0, 5)
                        .map((r) => r.participant_id);
                      setSelectedTop5Ids(best5);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-300"
                  >
                    Pilih Otomatis 5 Peringkat Teratas
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {participants
                    .filter((p) => p.verification_status === 'TERVERIFIKASI')
                    .map((p) => {
                      const rec = recapList.find(
                        (r) => r.participant_id === p.participant_id && r.stage === 'PENYISIHAN'
                      );
                      const checked = selectedTop5Ids.includes(p.participant_id);
                      return (
                        <label
                          key={p.participant_id}
                          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer ${
                            checked
                              ? 'bg-amber-500/15 border-amber-400/50'
                              : 'bg-slate-950 border-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  if (selectedTop5Ids.length >= 5) {
                                    showNotice('error', 'Maksimal 5 peserta untuk Top 5.');
                                    return;
                                  }
                                  setSelectedTop5Ids([...selectedTop5Ids, p.participant_id]);
                                } else {
                                  setSelectedTop5Ids(
                                    selectedTop5Ids.filter((id) => id !== p.participant_id)
                                  );
                                }
                              }}
                            />
                            <div className="truncate">
                              <div className="text-xs font-bold text-white truncate">
                                {p.full_name} ({p.school})
                              </div>
                              <div className="text-[11px] text-slate-400 truncate">
                                {p.innovation_title}
                              </div>
                            </div>
                          </div>
                          <div className="text-right font-mono text-xs shrink-0 tabular-nums">
                            <div className="text-amber-400 font-bold">
                              {rec?.average_score !== null && rec?.average_score !== undefined
                                ? Number(rec.average_score).toFixed(2)
                                : '-'}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Rank #{rec?.rank || '-'}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 items-center">
                  <input
                    type="text"
                    value={top5DecisionNotes}
                    onChange={(e) => setTop5DecisionNotes(e.target.value)}
                    placeholder="Catatan Berita Acara Penetapan Top 5..."
                    className="rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white"
                  />
                  <div className="flex items-center justify-between gap-4">
                    <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={publishTop5Now}
                        onChange={(e) => setPublishTop5Now(e.target.checked)}
                      />
                      <span>Publikasikan Top 5 di Beranda Publik</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleConfirmTop5}
                      className="px-6 py-3 rounded-xl font-bold text-xs text-slate-950 bg-gradient-to-r from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 shadow-lg whitespace-nowrap"
                    >
                      TETAPKAN TOP 5
                    </button>
                  </div>
                </div>
              </div>

              {/* Part 2: WINNER DETERMINATION (Juara I – Harapan II) */}
              <div className="rounded-2xl bg-slate-900/85 border border-slate-800 p-6 space-y-5">
                <div>
                  <h2 className="font-display font-bold text-lg text-white">
                    2. Penetapan Pemenang Akhir (Juara I, II, III, Harapan I, Harapan II)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Tetapkan pemenang berdasarkan hasil penilaian Babak Final atau keputusan pleno dewan juri.
                  </p>
                </div>

                <div className="space-y-3">
                  {winnerAssignments.map((slot, idx) => (
                    <div
                      key={slot.award_rank}
                      className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-950 border border-slate-800 p-4 rounded-xl items-center"
                    >
                      <div className="md:col-span-3 font-display font-bold text-sm text-amber-300">
                        {slot.award_rank}
                      </div>
                      <div className="md:col-span-5">
                        <select
                          value={slot.participant_id}
                          onChange={(e) => {
                            const pid = e.target.value;
                            const recFinal = recapList.find(
                              (r) => r.participant_id === pid && r.stage === 'FINAL'
                            );
                            const recPeny = recapList.find(
                              (r) => r.participant_id === pid && r.stage === 'PENYISIHAN'
                            );
                            const autoScore = Number(
                              recFinal?.average_score ?? recPeny?.average_score ?? 0
                            );
                            const next = [...winnerAssignments];
                            next[idx] = {
                              ...slot,
                              participant_id: pid,
                              approved_score: Number(autoScore.toFixed(2))
                            };
                            setWinnerAssignments(next);
                          }}
                          className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white"
                        >
                          <option value="">-- Pilih Peserta Pemenang --</option>
                          {participants.map((p) => (
                            <option key={p.participant_id} value={p.participant_id}>
                              {p.participant_id} — {p.full_name} ({p.school})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          value={slot.approved_score}
                          onChange={(e) => {
                            const next = [...winnerAssignments];
                            next[idx] = { ...slot, approved_score: Number(e.target.value) };
                            setWinnerAssignments(next);
                          }}
                          placeholder="Skor Akhir"
                          className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs font-mono text-emerald-400 tabular-nums"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <input
                          type="text"
                          value={slot.decision_notes}
                          onChange={(e) => {
                            const next = [...winnerAssignments];
                            next[idx] = { ...slot, decision_notes: e.target.value };
                            setWinnerAssignments(next);
                          }}
                          placeholder="Catatan SK"
                          className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={publishWinnersNow}
                      onChange={(e) => setPublishWinnersNow(e.target.checked)}
                    />
                    <span>Publikasikan Pengumuman Pemenang di Beranda Publik</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleConfirmWinners}
                    className="px-6 py-3 rounded-xl font-bold text-xs text-slate-950 bg-gradient-to-r from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 shadow-lg"
                  >
                    Simpan & Sahkan Pemenang Lomba
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
           * MENU 11 — PENGUMUMAN (Section 6)
           * ================================================================= */}
          {activeMenu === 'PENGUMUMAN' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-lg text-white">
                  Manajemen Pengumuman Resmi (Tabel PENGUMUMAN)
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    setEditingAnnouncement({
                      title: '',
                      content: '',
                      category: 'Informasi Lomba',
                      publication_date: new Date().toISOString().slice(0, 10),
                      published: true,
                      display_order: announcements.length + 1
                    })
                  }
                  className="px-4 py-2.5 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Buat Pengumuman Baru</span>
                </button>
              </div>

              {editingAnnouncement && (
                <form
                  onSubmit={handleSaveAnnouncement}
                  className="rounded-2xl bg-slate-900 border border-amber-500/40 p-6 space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs text-slate-300 mb-1">Judul Pengumuman *</label>
                      <input
                        type="text"
                        required
                        value={editingAnnouncement.title || ''}
                        onChange={(e) =>
                          setEditingAnnouncement({ ...editingAnnouncement, title: e.target.value })
                        }
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">Kategori</label>
                      <select
                        value={editingAnnouncement.category || 'Informasi Lomba'}
                        onChange={(e) =>
                          setEditingAnnouncement({
                            ...editingAnnouncement,
                            category: e.target.value as any
                          })
                        }
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white"
                      >
                        <option value="Informasi Lomba">Informasi Lomba</option>
                        <option value="Pengumpulan Karya">Pengumpulan Karya</option>
                        <option value="Pengumuman Top 5">Pengumuman Top 5</option>
                        <option value="Jadwal Final">Jadwal Final</option>
                        <option value="Pengumuman Pemenang">Pengumuman Pemenang</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Isi Pengumuman *</label>
                    <textarea
                      rows={4}
                      required
                      value={editingAnnouncement.content || ''}
                      onChange={(e) =>
                        setEditingAnnouncement({ ...editingAnnouncement, content: e.target.value })
                      }
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-white"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(editingAnnouncement.published)}
                        onChange={(e) =>
                          setEditingAnnouncement({
                            ...editingAnnouncement,
                            published: e.target.checked
                          })
                        }
                      />
                      <span>Publikasikan di Beranda Publik</span>
                    </label>
                    <div className="space-x-2">
                      <button
                        type="button"
                        onClick={() => setEditingAnnouncement(null)}
                        className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold"
                      >
                        Simpan Pengumuman
                      </button>
                    </div>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {announcements.map((ann) => (
                  <div
                    key={ann.announcement_id}
                    className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                        <span className="text-amber-300 font-semibold">{ann.category}</span>
                        <span
                          className={ann.published ? 'text-emerald-400 font-semibold' : 'text-slate-500'}
                        >
                          {ann.published ? 'Dipublikasikan' : 'Draft Tersembunyi'}
                        </span>
                      </div>
                      <h3 className="font-display font-bold text-base text-white">{ann.title}</h3>
                      <p className="text-xs text-slate-300 mt-2 whitespace-pre-line">{ann.content}</p>
                    </div>
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800 text-xs">
                      <button
                        type="button"
                        onClick={() => setEditingAnnouncement(ann)}
                        className="text-amber-300 hover:underline font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAnnouncement(ann.announcement_id)}
                        className="text-rose-400 hover:underline"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =================================================================
           * MENU 12 — PENGATURAN SISTEM, GOOGLE SHEETS SYNC, CODE.GS & PANDUAN
           * ================================================================= */}
          {activeMenu === 'SISTEM' && (
            <div className="space-y-8">
              {/* Active Judging Stage & Portal Control */}
              <div className="rounded-2xl bg-slate-900/85 border border-slate-800 p-6 space-y-4">
                <h2 className="font-display font-bold text-lg text-white">
                  1. Kontrol Tahapan Penjurian & Akses Portal Juri
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">
                      Tahap Penjurian Aktif Saat Ini
                    </label>
                    <select
                      value={settingsForm.active_judging_stage || 'PENYISIHAN'}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, active_judging_stage: e.target.value })
                      }
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white"
                    >
                      <option value="PENYISIHAN">Tahap 1 — PENYISIHAN</option>
                      <option value="FINAL">Tahap 2 — FINAL TOP 5</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">
                      Status Portal Login Juri (/juri/login)
                    </label>
                    <select
                      value={settingsForm.jury_portal_enabled || 'true'}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, jury_portal_enabled: e.target.value })
                      }
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white"
                    >
                      <option value="true">Aktif (Juri Dapat Login)</option>
                      <option value="false">Nonaktif Sementara</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveSettingsAndSchedule()}
                    className="px-5 py-2.5 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold"
                  >
                    Simpan Pengaturan Tahap
                  </button>
                </div>
              </div>

              {/* Google Apps Script Web App Connection */}
              <div className="rounded-2xl bg-slate-900/85 border border-amber-500/30 p-6 space-y-4">
                <h2 className="font-display font-bold text-lg text-white">
                  2. Integrasi Langsung Google Apps Script — Database "HGN 2026 Kec. Beji"
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Masukkan Web App URL dari deployment Google Apps Script Anda untuk menyinkronkan seluruh 14 tabel dengan spreadsheet asli <strong>HGN 2026 Kec. Beji</strong>.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      APPS_SCRIPT_WEB_APP_URL
                    </label>
                    <input
                      type="url"
                      value={appsScriptUrlInput}
                      onChange={(e) => setAppsScriptUrlInput(e.target.value)}
                      placeholder="https://script.google.com/macros/s/.../exec"
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      API_SHARED_SECRET
                    </label>
                    <input
                      type="password"
                      value={apiSharedSecretInput}
                      onChange={(e) => setApiSharedSecretInput(e.target.value)}
                      placeholder="Default: hgn-beji-2026-shared-secret"
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={syncingSheets}
                    onClick={async () => {
                      setSyncingSheets(true);
                      const res = await fetch('/api/admin/sync-sheets', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          direction: 'PUSH',
                          apps_script_url: appsScriptUrlInput,
                          api_shared_secret: apiSharedSecretInput
                        })
                      });
                      const json = await res.json();
                      setSyncingSheets(false);
                      showNotice(json.success ? 'success' : 'error', json.message);
                      fetchAdminSummary(false);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 text-slate-950 text-xs font-bold"
                  >
                    {syncingSheets ? 'Menyinkronkan...' : 'Simpan URL & Kirim Data ke Google Sheets (PUSH)'}
                  </button>

                  <button
                    type="button"
                    disabled={syncingSheets || !appsScriptUrlInput}
                    onClick={async () => {
                      setSyncingSheets(true);
                      const res = await fetch('/api/admin/sync-sheets', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          direction: 'PULL',
                          apps_script_url: appsScriptUrlInput,
                          api_shared_secret: apiSharedSecretInput
                        })
                      });
                      const json = await res.json();
                      setSyncingSheets(false);
                      showNotice(json.success ? 'success' : 'error', json.message);
                      fetchAdminSummary(true);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-sky-300 disabled:opacity-40"
                  >
                    Tarik Data dari Google Sheets (PULL)
                  </button>
                </div>
              </div>

              {/* Netlify Deployment Configuration & Ready Status */}
              <div className="rounded-2xl bg-slate-900/85 border border-[#004AAD]/50 p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display font-bold text-lg text-white">
                      3. Konfigurasi Siap Deploy ke Netlify (Frontend SPA + Serverless API)
                    </h2>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Aplikasi ini telah dilengkapi <code className="text-amber-300 font-mono">netlify.toml</code>, <code className="text-amber-300 font-mono">public/_redirects</code>, dan <code className="text-amber-300 font-mono">netlify/functions/api.ts</code> sehingga seluruh endpoint <code className="text-sky-300 font-mono">/api/*</code> serta rute <code className="text-sky-300 font-mono">/juri/login</code> berjalan otomatis di Netlify.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black">
                    NETLIFY READY
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 space-y-2">
                    <div className="font-bold text-amber-300">Pengaturan Build Netlify (Otomatis via netlify.toml)</div>
                    <ul className="space-y-1.5 text-slate-300 font-mono text-[11px]">
                      <li>• Build Command: <span className="text-white font-bold">npm run build</span></li>
                      <li>• Publish Directory: <span className="text-white font-bold">dist</span></li>
                      <li>• Functions Directory: <span className="text-white font-bold">netlify/functions</span></li>
                      <li>• Node Version: <span className="text-white font-bold">20</span></li>
                    </ul>
                  </div>
                  <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 space-y-2">
                    <div className="font-bold text-sky-300">Environment Variables di Dashboard Netlify (Site configuration → Environment variables)</div>
                    <ul className="space-y-1.5 text-slate-300 font-mono text-[11px]">
                      <li>• <span className="text-white font-bold">ADMIN_USERNAME</span> = admin</li>
                      <li>• <span className="text-white font-bold">ADMIN_PASSWORD</span> = @1</li>
                      <li>• <span className="text-white font-bold">SESSION_SECRET</span> = hgn-beji-2026-secure-session-secret</li>
                      <li>• <span className="text-white font-bold">APPS_SCRIPT_WEB_APP_URL</span> = {appsScriptUrlInput || '(URL Web App Google Apps Script Anda)'}</li>
                      <li>• <span className="text-white font-bold">API_SHARED_SECRET</span> = hgn-beji-2026-shared-secret</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Complete Code.gs Viewer & 14-Step Bahasa Indonesia Setup Instructions */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 rounded-2xl bg-slate-900/85 border border-slate-800 p-6 space-y-4">
                  <h3 className="font-display font-bold text-base text-white">
                    Panduan 14 Langkah Instalasi Google Sheets & Apps Script
                  </h3>
                  <ol className="space-y-2 text-xs text-slate-300 list-decimal list-inside leading-relaxed">
                    <li>Buka atau konversi file XLSX Anda menjadi Google Sheets asli bernama <strong>HGN 2026 Kec. Beji</strong> (Menu File → Simpan sebagai Google Spreadsheet).</li>
                    <li>Klik menu <strong>Ekstensi (Extensions) → Apps Script</strong>.</li>
                    <li>Salin seluruh kode <code>Code.gs</code> di sebelah kanan dan tempelkan ke editor Apps Script.</li>
                    <li>Pilih fungsi <code>setupDatabase</code> di bilah atas lalu klik <strong>Jalankan (Run)</strong> untuk membuat 14 tabel tanpa menghapus Sheet1 yang sudah ada.</li>
                    <li>Pada Project Settings → Script Properties, tambahkan properti <code>API_SHARED_SECRET</code> dengan nilai <code>hgn-beji-2026-shared-secret</code>.</li>
                    <li>Klik <strong>Terapkan (Deploy) → Deployment baru (New deployment)</strong>, pilih jenis <strong>Aplikasi Web (Web App)</strong>, Execute as: <em>Me</em>, Who has access: <em>Anyone</em>.</li>
                    <li>Salin <strong>Web App URL</strong> yang dihasilkan.</li>
                    <li>Tempelkan Web App URL pada kolom <code>APPS_SCRIPT_WEB_APP_URL</code> di atas atau di variabel environment backend.</li>
                    <li>Uji login Admin dengan klik ganda (double-click) logo beranda (username: <code>admin</code>, password: <code>@1</code>).</li>
                    <li>Buka menu <strong>6. Manajemen Juri</strong> dan buat akun dewan juri.</li>
                    <li>Buka tab <strong>Penugasan Juri</strong> dan tugaskan peserta terverifikasi kepada juri.</li>
                    <li>Login sebagai Juri melalui <code>/juri/login</code>, uji pratinjau karya dan simpan penilaian.</li>
                    <li>Periksa perhitungan skor tertimbang otomatis pada menu <strong>9. Rekap Nilai & Peringkat</strong>.</li>
                    <li>Tetapkan Top 5 / Pemenang pada menu <strong>10. Finalis & Pemenang</strong> dan publikasikan aplikasi.</li>
                  </ol>
                </div>

                <div className="lg:col-span-7 rounded-2xl bg-slate-900/85 border border-slate-800 p-6 flex flex-col justify-between space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display font-bold text-base text-white">
                        Kode Lengkap Google Apps Script (Code.gs)
                      </h3>
                      <p className="text-xs text-slate-400">
                        Siap ditempelkan langsung pada Ekstensi → Apps Script di spreadsheet HGN 2026 Kec. Beji
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(codeGsContent);
                        setCopiedCodeGs(true);
                        setTimeout(() => setCopiedCodeGs(false), 3000);
                      }}
                      className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5"
                    >
                      {copiedCodeGs ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedCodeGs ? 'Tersalin!' : 'Salin Code.gs'}</span>
                    </button>
                  </div>

                  <pre className="w-full h-80 overflow-y-auto rounded-xl bg-slate-950 border border-slate-800 p-4 text-[11px] font-mono text-slate-300">
                    {codeGsContent || '// Memuat Code.gs...'}
                  </pre>
                </div>
              </div>

              {/* Activity Audit Log (TABLE 14 — LOG_AKTIVITAS) */}
              <div className="rounded-2xl bg-slate-900/85 border border-slate-800 p-6 space-y-4">
                <h3 className="font-display font-bold text-base text-white">
                  Log Aktivitas & Audit Sistem (Tabel LOG_AKTIVITAS)
                </h3>
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-2.5 px-3">Waktu (WIB)</th>
                        <th className="py-2.5 px-3">Peran / Aktor</th>
                        <th className="py-2.5 px-3">Aksi</th>
                        <th className="py-2.5 px-3">Target</th>
                        <th className="py-2.5 px-3">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {logs.map((l) => (
                        <tr key={l.log_id}>
                          <td className="py-2.5 px-3 font-mono text-slate-400 tabular-nums whitespace-nowrap">
                            {l.timestamp.slice(0, 19).replace('T', ' ')}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-amber-300">
                            {l.actor_role} ({l.actor_id})
                          </td>
                          <td className="py-2.5 px-3 font-mono font-semibold text-white">
                            {l.action}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-300">
                            {l.target_type}:{l.target_id}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">{l.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* =====================================================================
       * RESPONSIVE FLOATING BOTTOM NAVIGATION BAR FOR ADMIN (Mobile & Tablet)
       * Locked in place (tetap melayang & tidak ikut tergeser!)
       * ===================================================================== */}
      <div className="no-print fixed bottom-2.5 inset-x-0 z-50 lg:hidden px-2.5 pointer-events-none select-none">
        <div className="pointer-events-auto max-w-xl w-full mx-auto rounded-2xl bg-white/98 dark:bg-[#0a1122]/98 backdrop-blur-xl border-2 border-[#004AAD] dark:border-[#FFB800] shadow-[0_14px_36px_rgba(0,74,173,0.35)] p-1.5 grid grid-cols-4 gap-1 overflow-hidden">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = activeMenu === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveMenu(item.id);
                }}
                className={`py-1.5 px-1.5 rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer truncate ${
                  active
                    ? 'bg-[#004AAD] text-white dark:bg-[#FFB800] dark:text-slate-950 shadow-xs'
                    : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[10px] font-black truncate">{item.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

