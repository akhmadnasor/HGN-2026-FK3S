import React, { useState, useEffect, useCallback } from 'react';
import {
  JuryAccount,
  ScoringCriterion,
  Participant,
  EvaluationRecord,
  EvaluationDetail,
  JudgingStage,
  IndicatorScoreItem
} from '../types';
import { Icon3D } from './Icons3D';
import { resolveSafeEmbed } from '../utils/embedHelper';
import {
  Eye,
  EyeOff,
  LogOut,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Lock,
  Save,
  RotateCcw,
  ArrowLeft,
  Video,
  FileText,
  Image as ImageIcon,
  FolderOpen,
  ShieldAlert,
  KeyRound,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  LayoutDashboard,
  ClipboardList,
  CheckSquare,
  BarChart3,
  UserCheck,
  Award,
  Sparkles
} from 'lucide-react';

const LIKERT_OPTIONS = [
  {
    value: 1,
    shortLabel: 'S. Kurang',
    label: 'Sangat Kurang',
    desc: 'Belum memenuhi standar minimal',
    activeBtn: 'bg-red-600 text-white border-red-700 shadow-sm ring-2 ring-red-500/30',
    badgeClass: 'bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border-red-300 dark:border-red-800'
  },
  {
    value: 2,
    shortLabel: 'Kurang',
    label: 'Kurang',
    desc: 'Terlihat sebagian kecil, perlu perbaikan',
    activeBtn: 'bg-orange-500 text-white border-orange-600 shadow-sm ring-2 ring-orange-400/30',
    badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-950/70 dark:text-orange-300 border-orange-300 dark:border-orange-800'
  },
  {
    value: 3,
    shortLabel: 'Cukup',
    label: 'Cukup',
    desc: 'Memenuhi standar dasar',
    activeBtn: 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm ring-2 ring-amber-400/30',
    badgeClass: 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 border-amber-400 dark:border-amber-700'
  },
  {
    value: 4,
    shortLabel: 'Baik',
    label: 'Baik',
    desc: 'Terpenuhi baik, sistematis & relevan',
    activeBtn: 'bg-[#004AAD] text-white border-[#003380] shadow-sm ring-2 ring-blue-500/30',
    badgeClass: 'bg-blue-100 text-[#004AAD] dark:bg-blue-950/70 dark:text-blue-300 border-blue-300 dark:border-blue-800'
  },
  {
    value: 5,
    shortLabel: 'S. Baik',
    label: 'Sangat Baik',
    desc: 'Unggul, inspiratif & berdampak tinggi',
    activeBtn: 'bg-emerald-600 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-500/30',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-400 dark:border-emerald-700'
  }
] as const;

function parseCriterionIndicators(indicatorsJson?: string): string[] {
  try {
    const parsed = JSON.parse(indicatorsJson || '[]');
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item || '').trim()).filter(Boolean);
    }
    return [];
  } catch {
    return [];
  }
}

function getScorePredicate(score100: number): { label: string; badgeClass: string } {
  if (score100 >= 90) {
    return {
      label: 'Sangat Inspiratif (A)',
      badgeClass: 'bg-emerald-600 text-white border-emerald-700'
    };
  }
  if (score100 >= 80) {
    return {
      label: 'Inspiratif / Sangat Baik (B+)',
      badgeClass: 'bg-[#004AAD] text-white border-[#003380]'
    };
  }
  if (score100 >= 70) {
    return {
      label: 'Baik (B)',
      badgeClass: 'bg-amber-500 text-slate-950 border-amber-600'
    };
  }
  if (score100 >= 60) {
    return {
      label: 'Cukup (C)',
      badgeClass: 'bg-orange-500 text-white border-orange-600'
    };
  }
  return {
    label: 'Perlu Pembinaan (D)',
    badgeClass: 'bg-red-600 text-white border-red-700'
  };
}

interface CriterionScoreInput {
  score: string; // Fallback for 0-indicator criteria or legacy records
  indicatorScores: Array<number | null>; // 1..5 Likert score per indicator
  notes: string;
}

interface EnrichedAssignment {
  assignment_id: string;
  jury_id: string;
  participant_id: string;
  stage: JudgingStage;
  assignment_status: 'ACTIVE' | 'REMOVED' | 'CONFLICT';
  assigned_at: string;
  conflict_flag: boolean;
  conflict_notes: string;
  participant: Participant | null;
  evaluation_status: 'BELUM_DINILAI' | 'DRAFT' | 'FINAL';
  evaluation: EvaluationRecord | null;
  details: EvaluationDetail[];
}

interface JuryPortalProps {
  mainLogoUrl: string;
  onBackToPublic: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const JuryPortal: React.FC<JuryPortalProps> = ({
  mainLogoUrl,
  onBackToPublic,
  theme,
  onToggleTheme
}) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [jury, setJury] = useState<JuryAccount | null>(null);

  // Login Form
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // Dashboard Data
  const [activeNav, setActiveNav] = useState<'DASHBOARD' | 'DAFTAR_KARYA' | 'PENILAIAN_SAYA' | 'REKAP_PRIBADI' | 'PROFIL'>('DASHBOARD');
  const [activeStage, setActiveStage] = useState<JudgingStage>('PENYISIHAN');
  const [summary, setSummary] = useState({
    total_assigned: 0,
    not_scored: 0,
    draft: 0,
    finalized: 0
  });
  const [assignments, setAssignments] = useState<EnrichedAssignment[]>([]);
  const [allCriteria, setAllCriteria] = useState<ScoringCriterion[]>([]);
  const [stageFilter, setStageFilter] = useState<'ALL' | 'PENYISIHAN' | 'FINAL'>('ALL');

  // Active Evaluation Workspace State
  const [selectedAssignment, setSelectedAssignment] = useState<EnrichedAssignment | null>(null);
  const [activeDocTab, setActiveDocTab] = useState<'VIDEO' | 'MODUL' | 'MEDIA' | 'DRIVE'>('VIDEO');
  const [mobileWorkspaceTab, setMobileWorkspaceTab] = useState<'PREVIEW' | 'SCORING'>('PREVIEW');
  const [collapsePreview, setCollapsePreview] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  // Scoring Form Inputs (Skala Likert 1–5 per Indikator)
  const [scoreInputs, setScoreInputs] = useState<Record<string, CriterionScoreInput>>({});
  const [highlightMissing, setHighlightMissing] = useState(false);
  const [strengths, setStrengths] = useState('');
  const [improvements, setImprovements] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [presentationNotes, setPresentationNotes] = useState('');
  const [savingEval, setSavingEval] = useState(false);
  const [evalFeedback, setEvalFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictReason, setConflictReason] = useState('');

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [changingPass, setChangingPass] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/jury/dashboard');
      const json = await res.json();
      if (res.ok && json.success) {
        setJury(json.data.jury);
        setActiveStage(json.data.active_stage || 'PENYISIHAN');
        setSummary(json.data.summary);
        setAssignments(json.data.assignments || []);
        setAllCriteria(json.data.criteria || []);
        setAuthenticated(true);
      } else {
        setAuthenticated(false);
      }
    } catch {
      // ignore transient error
    } finally {
      setCheckingSession(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Poll every 30 seconds when logged in and not actively typing inside the workspace
  useEffect(() => {
    if (!authenticated || selectedAssignment) return;
    const interval = setInterval(() => {
      fetchDashboard();
    }, 30000);
    return () => clearInterval(interval);
  }, [authenticated, selectedAssignment, fetchDashboard]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    try {
      const res = await fetch('/api/jury/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setLoginError(json.message || 'Login gagal. Periksa kembali username dan password Anda.');
      } else {
        setPassword('');
        window.history.replaceState({}, '', '/juri/dashboard');
        await fetchDashboard();
      }
    } catch {
      setLoginError('Gagal menghubungi server autentikasi.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/jury/logout', { method: 'POST' });
    setAuthenticated(false);
    setJury(null);
    setSelectedAssignment(null);
    window.history.replaceState({}, '', '/juri/login');
  };

  // Initialize Workspace Form from Selected Assignment
  const openEvaluationWorkspace = (asg: EnrichedAssignment) => {
    const stageCrits = allCriteria
      .filter((c) => c.stage === asg.stage && c.active)
      .sort((a, b) => a.display_order - b.display_order);

    const initialMap: Record<string, CriterionScoreInput> = {};
    stageCrits.forEach((c) => {
      const existingDetail = asg.details?.find((d) => d.criterion_id === c.criterion_id);
      const indicators = parseCriterionIndicators(c.indicators_json);
      const indicatorScores: Array<number | null> = Array(indicators.length).fill(null);

      if (existingDetail?.indicator_scores_json) {
        try {
          const savedArr = JSON.parse(existingDetail.indicator_scores_json) as IndicatorScoreItem[];
          if (Array.isArray(savedArr)) {
            savedArr.forEach((item, idx) => {
              const targetIdx = typeof item?.index === 'number' ? item.index : idx;
              if (targetIdx >= 0 && targetIdx < indicatorScores.length) {
                const v = Number(item?.score);
                indicatorScores[targetIdx] = Number.isInteger(v) && v >= 1 && v <= 5 ? v : null;
              }
            });
          }
        } catch {
          // ignore malformed snapshot
        }
      }

      initialMap[c.criterion_id] = {
        score:
          existingDetail && existingDetail.score !== null && existingDetail.score !== undefined
            ? String(existingDetail.score)
            : '',
        indicatorScores,
        notes: existingDetail?.criterion_notes || ''
      };
    });

    setScoreInputs(initialMap);
    setHighlightMissing(false);
    setStrengths(asg.evaluation?.strengths || '');
    setImprovements(asg.evaluation?.improvements || '');
    setRecommendations(asg.evaluation?.recommendations || '');
    setPresentationNotes(asg.evaluation?.presentation_notes || '');
    setEvalFeedback(null);
    setSelectedAssignment(asg);

    if (asg.participant?.video_url) {
      setActiveDocTab('VIDEO');
    } else {
      setActiveDocTab('DRIVE');
    }
  };

  const resetUnsavedChanges = () => {
    if (!selectedAssignment) return;
    openEvaluationWorkspace(selectedAssignment);
    setEvalFeedback({
      type: 'success',
      message: 'Perubahan yang belum disimpan telah dikembalikan ke kondisi tersimpan terakhir.'
    });
  };

  const currentStageCriteria = selectedAssignment
    ? allCriteria
        .filter((c) => c.stage === selectedAssignment.stage && c.active)
        .sort((a, b) => a.display_order - b.display_order)
    : [];

  // Psychometric Likert 1–5 Computation Engine per Criterion
  const getCriterionComputation = (crit: ScoringCriterion) => {
    const indicators = parseCriterionIndicators(crit.indicators_json);
    const entry = scoreInputs[crit.criterion_id] || {
      score: '',
      indicatorScores: Array(indicators.length).fill(null),
      notes: ''
    };
    const weight = Number(crit.weight_percentage) || 0;

    if (indicators.length > 0) {
      const scoresArr = indicators.map((_, i) => {
        const v = entry.indicatorScores?.[i];
        return typeof v === 'number' && v >= 1 && v <= 5 ? v : null;
      });
      const filledValues = scoresArr.filter((v): v is number => v !== null);
      const missingNumbers = scoresArr
        .map((v, i) => (v === null ? i + 1 : null))
        .filter((n): n is number => n !== null);

      const filledCount = filledValues.length;
      const totalCount = indicators.length;
      const sumLikert = filledValues.reduce((acc, v) => acc + v, 0);
      const maxFilledLikert = filledCount * 5;
      const maxTotalLikert = totalCount * 5;
      const avgLikert = filledCount > 0 ? sumLikert / filledCount : null;

      // Standard proportional conversion: (Sum / (FilledCount * 5)) * 100 = Mean Likert * 20
      let convertedScore100: number | null = null;
      let isLegacyScore = false;
      if (filledCount > 0) {
        convertedScore100 = Math.round(((sumLikert / maxFilledLikert) * 100) * 100) / 100;
      } else if (entry.score.trim() !== '' && !Number.isNaN(Number(entry.score))) {
        convertedScore100 = Math.round(Number(entry.score) * 100) / 100;
        isLegacyScore = true;
      }

      const weightedContribution =
        convertedScore100 !== null
          ? Math.round(((convertedScore100 * weight) / 100.0) * 10000) / 10000
          : 0;

      return {
        indicators,
        scoresArr,
        filledCount,
        totalCount,
        missingNumbers,
        isComplete: filledCount === totalCount,
        sumLikert,
        maxFilledLikert,
        maxTotalLikert,
        avgLikert,
        convertedScore100,
        weightedContribution,
        isLegacyScore
      };
    }

    // Fallback for 0-indicator criteria
    const hasNumeric = entry.score.trim() !== '' && !Number.isNaN(Number(entry.score));
    const convertedScore100 = hasNumeric
      ? Math.round(Math.min(100, Math.max(0, Number(entry.score))) * 100) / 100
      : null;
    const weightedContribution =
      convertedScore100 !== null
        ? Math.round(((convertedScore100 * weight) / 100.0) * 10000) / 10000
        : 0;

    return {
      indicators: [] as string[],
      scoresArr: [] as Array<number | null>,
      filledCount: hasNumeric ? 1 : 0,
      totalCount: 1,
      missingNumbers: hasNumeric ? [] : [1],
      isComplete: hasNumeric,
      sumLikert: 0,
      maxFilledLikert: 0,
      maxTotalLikert: 0,
      avgLikert: convertedScore100 !== null ? convertedScore100 / 20 : null,
      convertedScore100,
      weightedContribution,
      isLegacyScore: false
    };
  };

  const calculateLiveScoringSummary = () => {
    let weightedSum = 0;
    let totalIndicators = 0;
    let filledIndicators = 0;
    let allComplete = currentStageCriteria.length > 0;
    const missingDetails: Array<{ criterionName: string; missingCount: number; missingNumbers: number[] }> = [];
    const breakdown: Array<{
      crit: ScoringCriterion;
      comp: ReturnType<typeof getCriterionComputation>;
    }> = [];

    for (const c of currentStageCriteria) {
      const comp = getCriterionComputation(c);
      breakdown.push({ crit: c, comp });
      weightedSum += comp.weightedContribution;
      totalIndicators += comp.totalCount;
      filledIndicators += comp.filledCount;
      if (!comp.isComplete) {
        allComplete = false;
        missingDetails.push({
          criterionName: c.criterion_name,
          missingCount: comp.missingNumbers.length,
          missingNumbers: comp.missingNumbers
        });
      }
    }

    const total = Math.round(weightedSum * 100) / 100;
    const progressPercent =
      totalIndicators > 0 ? Math.round((filledIndicators / totalIndicators) * 100) : 0;

    return {
      total,
      allComplete,
      totalIndicators,
      filledIndicators,
      progressPercent,
      missingDetails,
      breakdown
    };
  };

  const liveScoring = calculateLiveScoringSummary();
  const liveWeightedTotal = liveScoring.total;
  const allCriteriaScored = liveScoring.allComplete;
  const livePredicate = getScorePredicate(liveWeightedTotal);

  const handleSetIndicatorLikert = (criterionId: string, indicatorIndex: number, value: number, totalLen: number) => {
    setScoreInputs((prev) => {
      const current = prev[criterionId] || {
        score: '',
        indicatorScores: Array(totalLen).fill(null),
        notes: ''
      };
      const nextArr = Array.from({ length: totalLen }, (_, idx) =>
        idx === indicatorIndex ? value : current.indicatorScores?.[idx] ?? null
      );
      return {
        ...prev,
        [criterionId]: {
          ...current,
          indicatorScores: nextArr
        }
      };
    });
  };

  const handleBulkSetCriterionLikert = (criterionId: string, value: number | null, totalLen: number) => {
    setScoreInputs((prev) => {
      const current = prev[criterionId] || {
        score: '',
        indicatorScores: Array(totalLen).fill(null),
        notes: ''
      };
      return {
        ...prev,
        [criterionId]: {
          ...current,
          score: value === null ? '' : current.score,
          indicatorScores: Array(totalLen).fill(value)
        }
      };
    });
  };

  const submitEvaluation = async (mode: 'DRAFT' | 'FINAL') => {
    if (!selectedAssignment || savingEval) return;
    setEvalFeedback(null);
    setSavingEval(true);

    const payloadScores = currentStageCriteria.map((c) => {
      const entry = scoreInputs[c.criterion_id];
      const comp = getCriterionComputation(c);
      return {
        criterion_id: c.criterion_id,
        score: comp.convertedScore100,
        indicator_scores:
          comp.indicators.length > 0
            ? comp.indicators.map((indText, idx) => ({
                index: idx,
                indicator: indText,
                score: comp.scoresArr[idx] ?? null
              }))
            : undefined,
        criterion_notes: entry?.notes || ''
      };
    });

    const endpoint = mode === 'FINAL' ? '/api/jury/evaluation/finalize' : '/api/jury/evaluation/draft';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignment_id: selectedAssignment.assignment_id,
          scores: payloadScores,
          strengths,
          improvements,
          recommendations,
          presentation_notes: presentationNotes
        })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        if (mode === 'FINAL') setHighlightMissing(true);
        setEvalFeedback({
          type: 'error',
          message: json.message || 'Gagal menyimpan penilaian ke database.'
        });
      } else {
        setShowFinalizeModal(false);
        setHighlightMissing(false);
        setEvalFeedback({
          type: 'success',
          message: json.message
        });
        await fetchDashboard();
        setSelectedAssignment((prev) =>
          prev
            ? {
                ...prev,
                evaluation_status: mode,
                evaluation: json.data.evaluation,
                details: json.data.details
              }
            : null
        );
      }
    } catch {
      setEvalFeedback({
        type: 'error',
        message: 'Terjadi kesalahan jaringan saat menyimpan penilaian.'
      });
    } finally {
      setSavingEval(false);
    }
  };

  const handleReportConflict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment || !conflictReason.trim()) return;
    const res = await fetch('/api/jury/conflict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignment_id: selectedAssignment.assignment_id,
        conflict_notes: conflictReason
      })
    });
    const json = await res.json();
    if (res.ok && json.success) {
      setShowConflictModal(false);
      setConflictReason('');
      setEvalFeedback({
        type: 'success',
        message: json.message
      });
      await fetchDashboard();
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);
    if (newPassword.length < 6) {
      setPasswordFeedback({ type: 'error', message: 'Password baru minimal terdiri dari 6 karakter.' });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordFeedback({ type: 'error', message: 'Konfirmasi password baru tidak cocok.' });
      return;
    }
    setChangingPass(true);
    try {
      const res = await fetch('/api/jury/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setPasswordFeedback({ type: 'error', message: json.message || 'Gagal memperbarui password.' });
      } else {
        setPasswordFeedback({ type: 'success', message: 'Password berhasil diperbarui!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setJury(json.data);
      }
    } catch {
      setPasswordFeedback({ type: 'error', message: 'Gagal menghubungi server.' });
    } finally {
      setChangingPass(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#070b14] text-slate-950 dark:text-white flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-3 border-[#004AAD] dark:border-[#FFB800] border-t-transparent animate-spin mx-auto" />
          <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
            Memuat Portal Penjurian Digital Lomba Guru Inspiratif 2026...
          </p>
        </div>
      </div>
    );
  }

  /* =========================================================================
   * SECTION 8 — DEDICATED JURY LOGIN PAGE (/juri/login)
   * ========================================================================= */
  if (!authenticated || !jury) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#070b14] text-slate-950 dark:text-white flex flex-col justify-between p-4 sm:p-8 relative overflow-hidden">
        <div className="relative z-10 max-w-7xl w-full mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToPublic}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-xs font-extrabold text-slate-900 dark:text-white inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#004AAD] dark:text-[#FFB800]" />
            <span>Kembali ke Beranda Publik</span>
          </button>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onToggleTheme}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-xs font-extrabold text-slate-900 dark:text-white inline-flex items-center gap-1.5 cursor-pointer"
            >
              {theme === 'light' ? (
                <>
                  <Moon className="w-4 h-4 text-[#004AAD]" />
                  <span>MODE GELAP</span>
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 text-[#FFB800]" />
                  <span>MODE CERAH</span>
                </>
              )}
            </button>
            <span className="font-mono text-xs font-black text-[#004AAD] dark:text-[#FFB800]">
              #BejolanAji
            </span>
          </div>
        </div>

        <div className="relative z-10 max-w-md w-full mx-auto my-6 rounded-3xl bg-white dark:bg-[#0d152a] border-2 border-[#004AAD]/30 dark:border-[#FFB800]/40 p-7 sm:p-9 shadow-[0_16px_40px_-8px_rgba(0,74,173,0.18)]">
          <div className="flex flex-col items-center text-center mb-6">
            <img
              src={mainLogoUrl}
              alt="Logo FK3S Kec. Beji"
              referrerPolicy="no-referrer"
              className="w-20 h-20 object-contain drop-shadow-md mb-3"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (!img.src.includes('/assets/aistudio/logo_fk3s.png')) {
                  img.src = '/assets/aistudio/logo_fk3s.png';
                }
              }}
            />
            <div className="inline-block px-3 py-1 rounded-lg bg-[#004AAD] text-white dark:bg-[#FFB800] dark:text-slate-950 text-[10px] font-black tracking-widest uppercase mb-2">
              SISTEM PENJURIAN DIGITAL
            </div>
            <h1 className="font-display font-black text-2xl sm:text-3xl text-[#004AAD] dark:text-white tracking-tight">
              PORTAL DEWAN JURI
            </h1>
            <p className="text-sm text-[#EA580C] dark:text-[#FFB800] font-black mt-1">
              LOMBA GURU INSPIRATIF 2026
            </p>
            <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5 font-extrabold">
              FK3S KEC. BEJI • KABUPATEN PASURUAN
            </p>
          </div>

          {loginError && (
            <div className="mb-5 rounded-xl bg-red-50 dark:bg-red-950/70 border-2 border-red-500 p-3.5 text-xs font-extrabold text-red-800 dark:text-red-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-950 dark:text-white mb-1.5">
                Username Akun Juri
              </label>
              <input
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username akun juri"
                className="w-full rounded-xl bg-[#F8FAFC] dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 focus:border-[#004AAD] dark:focus:border-[#FFB800] focus:outline-none px-4 py-3 text-sm font-bold text-slate-950 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-950 dark:text-white mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full rounded-xl bg-[#F8FAFC] dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 focus:border-[#004AAD] dark:focus:border-[#FFB800] focus:outline-none pl-4 pr-11 py-3 text-sm font-bold text-slate-950 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  title={showPassword ? 'Sembunyikan Password' : 'Tampilkan Password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full py-3.5 rounded-xl font-black text-sm text-white bg-[#004AAD] hover:bg-[#003B8E] dark:bg-[#FFB800] dark:hover:bg-[#FFA500] dark:text-slate-950 border-2 border-[#003380] dark:border-[#B45309]/40 disabled:opacity-50 shadow-md transition-all mt-2 cursor-pointer"
            >
              {loggingIn ? 'MEMVERIFIKASI KREDENSIAL...' : 'MASUK PORTAL JURI'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t-2 border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Icon3D type="security" size="sm" />
            <span>Kredensial akun juri diterbitkan resmi oleh Admin FK3S KEC. BEJI.</span>
          </div>
        </div>

        <div className="relative z-10 text-center text-xs font-extrabold text-slate-700 dark:text-slate-300">
          FK3S KEC. BEJI — Sistem Penjurian Digital Lomba Guru Inspiratif 2026
        </div>
      </div>
    );
  }

  /* =========================================================================
   * MANDATORY FIRST-LOGIN PASSWORD CHANGE SCREEN (Section 7 Account Rules)
   * ========================================================================= */
  if (jury.must_change_password) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#070b14] text-slate-950 dark:text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-3xl bg-white dark:bg-[#0d152a] border-2 border-[#004AAD]/30 dark:border-[#FFB800]/40 p-8 space-y-6 shadow-2xl">
          <div className="flex items-center gap-3.5">
            <Icon3D type="security" size="md" />
            <div>
              <h2 className="font-display font-black text-xl text-[#004AAD] dark:text-white">
                Pembaruan Password Wajib
              </h2>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                Selamat datang, {jury.full_name}. Demi keamanan penilaian, silakan buat password baru sebelum memulai penjurian.
              </p>
            </div>
          </div>

          {passwordFeedback && (
            <div
              className={`rounded-xl p-3.5 text-xs font-extrabold border-2 ${
                passwordFeedback.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-600 text-emerald-900 dark:text-emerald-200'
                  : 'bg-red-50 dark:bg-red-950/60 border-red-600 text-red-900 dark:text-red-200'
              }`}
            >
              {passwordFeedback.message}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-950 dark:text-white mb-1">
                Password Baru (Minimal 6 Karakter)
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl bg-[#F8FAFC] dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 px-4 py-3 text-sm font-bold text-slate-950 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-950 dark:text-white mb-1">
                Konfirmasi Password Baru
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="w-full rounded-xl bg-[#F8FAFC] dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 px-4 py-3 text-sm font-bold text-slate-950 dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={changingPass}
              className="w-full py-3.5 rounded-xl font-black text-sm text-slate-950 bg-gradient-to-r from-[#FFD000] via-[#FFB800] to-[#FF9000] border-2 border-[#B45309]/40 shadow-md cursor-pointer"
            >
              {changingPass ? 'MENYIMPAN PASSWORD...' : 'SIMPAN PASSWORD & LANJUTKAN'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* =========================================================================
   * SECTION 10 & 11 — DEDICATED EVALUATION WORKSPACE (SPLIT SCREEN)
   * ========================================================================= */
  if (selectedAssignment && selectedAssignment.participant) {
    const p = selectedAssignment.participant;
    const isFinalized = selectedAssignment.evaluation_status === 'FINAL';

    const activeEmbed =
      activeDocTab === 'VIDEO'
        ? resolveSafeEmbed(p.video_url || p.drive_folder_url, 'VIDEO')
        : activeDocTab === 'MODUL'
        ? resolveSafeEmbed(p.lesson_module_url, 'DOCUMENT')
        : activeDocTab === 'MEDIA'
        ? resolveSafeEmbed(p.learning_media_url, 'DOCUMENT')
        : resolveSafeEmbed(p.drive_folder_url, 'FOLDER');

    return (
      <div className="min-h-screen bg-white dark:bg-[#070b14] text-slate-950 dark:text-white flex flex-col">
        {/* Top Evaluation Workspace Header */}
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#0a1122]/95 backdrop-blur-md border-b-2 border-[#004AAD]/25 dark:border-[#FFB800]/30 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedAssignment(null)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-xs font-black text-slate-950 dark:text-white inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-[#004AAD] dark:text-[#FFB800]" />
              <span>KEMBALI KE DAFTAR</span>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700 dark:text-slate-300">
                <span className="font-mono text-[#004AAD] dark:text-[#FFB800] font-black">{p.participant_id}</span>
                <span>•</span>
                <span>Tahap {selectedAssignment.stage}</span>
                <span>•</span>
                <span className="text-[#EA580C] dark:text-[#FFB800]">Status: {selectedAssignment.evaluation_status}</span>
              </div>
              <h1 className="font-display font-black text-sm sm:text-base text-slate-950 dark:text-white truncate max-w-xl">
                {p.full_name} — {p.school}
              </h1>
            </div>
          </div>

          {/* Right Controls: Theme Toggle + Preview Collapse + Live Weighted Score */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onToggleTheme}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-xs font-extrabold text-slate-900 dark:text-white inline-flex items-center gap-1.5 cursor-pointer"
            >
              {theme === 'light' ? <Moon className="w-4 h-4 text-[#004AAD]" /> : <Sun className="w-4 h-4 text-[#FFB800]" />}
            </button>

            <button
              type="button"
              onClick={() => setCollapsePreview(!collapsePreview)}
              className="hidden lg:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-xs font-extrabold text-slate-900 dark:text-white cursor-pointer"
            >
              {collapsePreview ? (
                <>
                  <PanelLeftOpen className="w-4 h-4 text-[#004AAD] dark:text-[#FFB800]" />
                  <span>Tampilkan Pratinjau</span>
                </>
              ) : (
                <>
                  <PanelLeftClose className="w-4 h-4 text-[#004AAD] dark:text-[#FFB800]" />
                  <span>Fokus Form Nilai</span>
                </>
              )}
            </button>

            <div className="rounded-xl bg-[#004AAD] text-white dark:bg-[#FFB800] dark:text-slate-950 px-4 py-1.5 text-right border-2 border-[#003380] dark:border-[#B45309]/40">
              <div className="text-[10px] font-black uppercase tracking-wider text-[#FFD000] dark:text-slate-900">
                Nilai Akhir Tertimbang
              </div>
              <div className="font-mono font-black text-lg leading-tight tabular-nums">
                {liveWeightedTotal.toFixed(2)} <span className="text-xs opacity-80">/ 100</span>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Workspace Mode Switcher (Tab 1: Review Karya | Tab 2: Form Penilaian) */}
        <div className="lg:hidden sticky top-[68px] z-20 bg-white dark:bg-[#0a1122] border-b-2 border-slate-200 dark:border-slate-800 px-4 py-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMobileWorkspaceTab('PREVIEW')}
            className={`py-2.5 rounded-xl text-xs font-black transition-colors border-2 cursor-pointer ${
              mobileWorkspaceTab === 'PREVIEW'
                ? 'bg-[#004AAD] text-white border-[#003380] dark:bg-[#FFB800] dark:text-slate-950'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
            }`}
          >
            1. Review Karya & Video
          </button>
          <button
            type="button"
            onClick={() => setMobileWorkspaceTab('SCORING')}
            className={`py-2.5 rounded-xl text-xs font-black transition-colors border-2 cursor-pointer ${
              mobileWorkspaceTab === 'SCORING'
                ? 'bg-[#004AAD] text-white border-[#003380] dark:bg-[#FFB800] dark:text-slate-950'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
            }`}
          >
            2. Form Nilai ({liveWeightedTotal.toFixed(2)})
          </button>
        </div>

        {/* Main Responsive Split-Screen Workspace */}
        <div className="flex-1 max-w-[1600px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12">
          {/* LEFT AREA: DOCUMENT & VIDEO REVIEW */}
          {!collapsePreview && (
            <div
              className={`lg:col-span-7 border-r-2 border-slate-200 dark:border-slate-800 p-4 sm:p-6 flex flex-col gap-4 ${
                mobileWorkspaceTab === 'SCORING' ? 'hidden lg:flex' : 'flex'
              }`}
            >
              {/* Participant Info Banner */}
              <div className="rounded-2xl bg-[#F8FAFC] dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-black uppercase text-[#004AAD] dark:text-[#FFB800]">
                    Judul Inovasi Pembelajaran:
                  </div>
                  <h2 className="font-display font-black text-base sm:text-lg text-slate-950 dark:text-white mt-0.5">
                    {p.innovation_title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConflictModal(true)}
                  className="self-start sm:self-auto px-3 py-2 rounded-xl bg-white dark:bg-slate-950 hover:bg-red-50 dark:hover:bg-red-950/60 border-2 border-slate-300 dark:border-slate-700 hover:border-red-500 text-xs font-extrabold text-slate-800 dark:text-slate-200 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ShieldAlert className="w-4 h-4 text-[#EA580C] dark:text-[#FFB800]" />
                  <span>Konflik Kepentingan</span>
                </button>
              </div>

              {/* 4 DOCUMENT REVIEW TABS */}
              <div className="flex flex-wrap items-center gap-2 border-b-2 border-slate-200 dark:border-slate-800 pb-3">
                {[
                  { id: 'VIDEO' as const, label: 'VIDEO KARYA', icon: Video },
                  { id: 'MODUL' as const, label: 'MODUL AJAR', icon: FileText },
                  { id: 'MEDIA' as const, label: 'MEDIA PEMBELAJARAN', icon: ImageIcon },
                  { id: 'DRIVE' as const, label: 'FOLDER GOOGLE DRIVE', icon: FolderOpen }
                ].map((tab) => {
                  const Icon = tab.icon;
                  const active = activeDocTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveDocTab(tab.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 border-2 cursor-pointer ${
                        active
                          ? 'bg-[#004AAD] text-white border-[#003380] dark:bg-[#FFB800] dark:text-slate-950'
                          : 'bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-[#004AAD]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Action Toolbar for Active Tab */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#F0F6FF] dark:bg-slate-900 border-2 border-[#004AAD]/25 dark:border-slate-700 rounded-xl px-4 py-2.5">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-200">{activeEmbed.notice}</span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIframeKey((k) => k + 1)}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 border-2 border-slate-300 dark:border-slate-700 text-xs font-extrabold text-slate-900 dark:text-white inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[#004AAD] dark:text-[#FFB800]" />
                    <span>Refresh Preview</span>
                  </button>

                  {activeEmbed.directUrl && (
                    <a
                      href={activeEmbed.directUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-[#004AAD] hover:bg-[#003B8E] text-xs font-black text-white inline-flex items-center gap-1.5"
                    >
                      <span>
                        {activeDocTab === 'VIDEO'
                          ? 'Buka Video di Tab Baru'
                          : activeDocTab === 'MODUL'
                          ? 'Buka Dokumen di Tab Baru'
                          : activeDocTab === 'MEDIA'
                          ? 'Buka Media di Tab Baru'
                          : 'BUKA FOLDER GOOGLE DRIVE'}
                      </span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  {p.drive_folder_url && activeDocTab !== 'DRIVE' && (
                    <a
                      href={p.drive_folder_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-[#FFD000] hover:brightness-105 border-2 border-[#B45309]/30 text-xs font-black text-slate-950 inline-flex items-center gap-1.5"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Buka Folder Drive</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Iframe Preview Area or Fallback */}
              <div className="flex-1 min-h-[420px] lg:min-h-[540px] rounded-2xl bg-[#F8FAFC] dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-800 overflow-hidden flex flex-col">
                {activeEmbed.canEmbed && activeEmbed.embedUrl ? (
                  <iframe
                    key={`${activeDocTab}-${iframeKey}`}
                    src={activeEmbed.embedUrl}
                    title={`Pratinjau ${activeDocTab} - ${p.full_name}`}
                    className="w-full flex-1 min-h-[420px] lg:min-h-[540px] border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
                  />
                ) : (
                  <div className="flex-1 p-8 flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-5">
                    <Icon3D
                      type={
                        activeDocTab === 'VIDEO'
                          ? 'video'
                          : activeDocTab === 'DRIVE'
                          ? 'drive'
                          : 'documents'
                      }
                      size="lg"
                    />
                    <div className="space-y-2">
                      <h3 className="font-display font-black text-lg text-slate-950 dark:text-white">
                        {activeDocTab === 'VIDEO'
                          ? 'Buka Karya Melalui Tautan Langsung / Folder Google Drive'
                          : 'Pratinjau Dokumen Melalui Folder Google Drive'}
                      </h3>
                      <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">
                        {activeEmbed.notice}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3">
                      {activeEmbed.directUrl && (
                        <a
                          href={activeEmbed.directUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-5 py-3 rounded-xl font-black text-xs text-slate-950 bg-gradient-to-r from-[#FFD000] to-[#FFB800] border-2 border-[#B45309]/40 inline-flex items-center gap-2 shadow-sm"
                        >
                          <span>Buka Tautan di Tab Baru</span>
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      {p.drive_folder_url && (
                        <a
                          href={p.drive_folder_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-5 py-3 rounded-xl font-black text-xs text-white bg-[#004AAD] hover:bg-[#003B8E] inline-flex items-center gap-2 shadow-sm"
                        >
                          <FolderOpen className="w-4 h-4 text-[#FFD000]" />
                          <span>BUKA FOLDER GOOGLE DRIVE</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* RIGHT AREA: DIGITAL JUDGING FORM */}
          <div
            className={`${
              collapsePreview ? 'lg:col-span-12 max-w-4xl mx-auto w-full' : 'lg:col-span-5'
            } p-4 sm:p-6 space-y-5 overflow-y-auto ${
              mobileWorkspaceTab === 'PREVIEW' ? 'hidden lg:block' : 'block'
            }`}
          >
            {isFinalized && (
              <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-600 p-4 flex items-start gap-3">
                <Lock className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs font-bold text-emerald-950 dark:text-emerald-100 space-y-1">
                  <p className="font-black text-sm">Penilaian Telah Difinalisasi & Terkunci</p>
                  <p>
                    Difinalisasi pada: <span className="font-mono">{selectedAssignment.evaluation?.finalized_at}</span>.
                    Nilai yang sudah difinalisasi tidak dapat diubah kecuali dibuka kembali oleh Administrator.
                  </p>
                </div>
              </div>
            )}

            {evalFeedback && (
              <div
                className={`rounded-2xl p-4 border-2 flex items-start gap-3 text-xs sm:text-sm font-extrabold ${
                  evalFeedback.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-600 text-emerald-950 dark:text-emerald-100'
                    : 'bg-red-50 dark:bg-red-950/60 border-red-600 text-red-950 dark:text-red-100'
                }`}
              >
                {evalFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <span>{evalFeedback.message}</span>
              </div>
            )}

            {/* PANDUAN SKALA LIKERT 1–5 & PROGRES KELENGKAPAN INDIKATOR */}
            <div className="rounded-2xl bg-gradient-to-br from-[#F0F6FF] via-white to-[#FFFBEB] dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 border-2 border-[#004AAD]/35 dark:border-[#FFB800]/40 p-4 space-y-3 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#004AAD] dark:text-[#FFB800] shrink-0" />
                  <span className="text-xs font-black uppercase tracking-wide text-[#004AAD] dark:text-[#FFB800]">
                    Instrumen Penilaian Skala Likert (1 – 5) Per Indikator
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-lg bg-[#004AAD] text-white dark:bg-[#FFB800] dark:text-slate-950 font-mono font-black text-[11px] tabular-nums">
                  {liveScoring.filledIndicators} / {liveScoring.totalIndicators} Indikator ({liveScoring.progressPercent}%)
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    allCriteriaScored
                      ? 'bg-emerald-600'
                      : 'bg-gradient-to-r from-[#004AAD] via-[#1D4ED8] to-[#FFB800]'
                  }`}
                  style={{ width: `${liveScoring.progressPercent}%` }}
                />
              </div>

              {/* 5-Level Likert Legend */}
              <div className="grid grid-cols-5 gap-1.5 pt-0.5">
                {LIKERT_OPTIONS.map((opt) => (
                  <div
                    key={opt.value}
                    title={`${opt.value} — ${opt.label}: ${opt.desc}`}
                    className={`rounded-xl border px-1.5 py-1.5 text-center ${opt.badgeClass}`}
                  >
                    <div className="font-mono font-black text-xs leading-none">{opt.value}</div>
                    <div className="text-[10px] font-extrabold leading-tight mt-0.5 truncate">
                      {opt.shortLabel}
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 leading-snug">
                Konversi otomatis baku:{' '}
                <span className="font-mono font-black text-[#004AAD] dark:text-[#FFB800]">
                  Nilai Kriteria = (Total Poin Likert ÷ Skor Maks) × 100
                </span>{' '}
                (Skala 1 = 20, 2 = 40, 3 = 60, 4 = 80, 5 = 100), dikalikan bobot resmi kriteria.
              </div>
            </div>

            {/* Dynamic Scoring Criteria Cards (Skala Likert 1–5 pada Masing-Masing Indikator) */}
            <div className="space-y-5">
              {liveScoring.breakdown.map(({ crit, comp }, idx) => {
                const entry = scoreInputs[crit.criterion_id] || {
                  score: '',
                  indicatorScores: Array(comp.indicators.length).fill(null),
                  notes: ''
                };

                return (
                  <div
                    key={crit.criterion_id}
                    className={`rounded-2xl bg-[#F8FAFC] dark:bg-slate-900 border-2 p-4 sm:p-5 space-y-4 transition-colors ${
                      highlightMissing && !comp.isComplete
                        ? 'border-red-500 ring-2 ring-red-500/20'
                        : comp.isComplete
                        ? 'border-emerald-500/60 dark:border-emerald-500/50'
                        : 'border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {/* Criterion Header */}
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-slate-200 dark:border-slate-800 pb-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2.5 py-0.5 rounded-md bg-[#004AAD] text-white font-mono font-black text-xs">
                            Kriteria 0{idx + 1} • Bobot {crit.weight_percentage}%
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md font-mono font-black text-[11px] border ${
                              comp.isComplete
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-400 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-700'
                                : 'bg-amber-100 text-amber-900 border-amber-400 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700'
                            }`}
                          >
                            {comp.filledCount}/{comp.totalCount} Indikator
                          </span>
                        </div>
                        <h3 className="font-display font-black text-base sm:text-lg text-slate-950 dark:text-white mt-1.5 leading-snug">
                          {crit.criterion_name}
                        </h3>
                        {crit.description && (
                          <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                            {crit.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="rounded-xl bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 px-3 py-1.5 text-right">
                          <div className="text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase">
                            Skor (0–100)
                          </div>
                          <div className="font-mono font-black text-base text-[#004AAD] dark:text-[#38BDF8] tabular-nums leading-tight">
                            {comp.convertedScore100 !== null ? comp.convertedScore100.toFixed(2) : '-'}
                          </div>
                        </div>
                        <div className="rounded-xl bg-[#FFFBEB] dark:bg-amber-950/30 border-2 border-amber-400/70 dark:border-amber-600/50 px-3 py-1.5 text-right">
                          <div className="text-[10px] font-extrabold text-[#B45309] dark:text-[#FFB800] uppercase">
                            Kontribusi
                          </div>
                          <div className="font-mono font-black text-base text-[#EA580C] dark:text-[#FFB800] tabular-nums leading-tight">
                            +{comp.weightedContribution.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Legacy Score Notice (only if saved previously before per-indicator Likert) */}
                    {comp.isLegacyScore && !isFinalized && (
                      <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-400 px-3 py-2 text-[11px] font-bold text-amber-900 dark:text-amber-200">
                        Tersimpan nilai kriteria lama ({comp.convertedScore100?.toFixed(2)}). Silakan pilih skala Likert 1–5 pada masing-masing indikator di bawah untuk memperbarui rincian penilaian.
                      </div>
                    )}

                    {/* Per-Indicator Likert 1–5 Matrix */}
                    {comp.indicators.length > 0 ? (
                      <div className="space-y-2.5">
                        {/* Quick-Set Baseline Bar (Editable Mode Only) */}
                        {!isFinalized && (
                          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2">
                            <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                              Isi Cepat Baseline Kriteria Ini:
                            </span>
                            <div className="flex items-center gap-1">
                              {LIKERT_OPTIONS.map((opt) => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  title={`Set seluruh indikator di kriteria ini ke ${opt.value} (${opt.label})`}
                                  onClick={() =>
                                    handleBulkSetCriterionLikert(
                                      crit.criterion_id,
                                      opt.value,
                                      comp.indicators.length
                                    )
                                  }
                                  className="w-7 h-7 rounded-lg text-xs font-mono font-black bg-slate-100 hover:bg-[#004AAD] hover:text-white dark:bg-slate-800 dark:hover:bg-[#FFB800] dark:hover:text-slate-950 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
                                >
                                  {opt.value}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() =>
                                  handleBulkSetCriterionLikert(
                                    crit.criterion_id,
                                    null,
                                    comp.indicators.length
                                  )
                                }
                                title="Kosongkan seluruh indikator di kriteria ini"
                                className="ml-1 px-2 h-7 rounded-lg text-[10px] font-black bg-slate-100 hover:bg-red-100 text-slate-700 hover:text-red-700 dark:bg-slate-800 dark:hover:bg-red-950 dark:text-slate-300 dark:hover:text-red-300 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
                              >
                                Reset
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Individual Indicator Likert Rows */}
                        {comp.indicators.map((indText, indIdx) => {
                          const currentVal = comp.scoresArr[indIdx];
                          const selectedOpt = LIKERT_OPTIONS.find((o) => o.value === currentVal);
                          const isMissingNow = highlightMissing && currentVal === null;

                          return (
                            <div
                              key={indIdx}
                              className={`rounded-xl bg-white dark:bg-slate-950 border-2 p-3 space-y-2.5 transition-all ${
                                isMissingNow
                                  ? 'border-red-500 bg-red-50/40 dark:bg-red-950/20'
                                  : currentVal !== null
                                  ? 'border-slate-200 dark:border-slate-800'
                                  : 'border-slate-200/90 dark:border-slate-800/90'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2.5">
                                <div className="flex items-start gap-2 min-w-0">
                                  <span
                                    className={`w-6 h-6 rounded-lg font-mono font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5 ${
                                      currentVal !== null
                                        ? 'bg-[#004AAD] text-white dark:bg-[#FFB800] dark:text-slate-950'
                                        : isMissingNow
                                        ? 'bg-red-600 text-white'
                                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                    }`}
                                  >
                                    {String(indIdx + 1).padStart(2, '0')}
                                  </span>
                                  <p className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-slate-100 leading-snug">
                                    {indText}
                                  </p>
                                </div>

                                {selectedOpt ? (
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-black border whitespace-nowrap shrink-0 ${selectedOpt.badgeClass}`}
                                  >
                                    {selectedOpt.value} • {selectedOpt.label}
                                  </span>
                                ) : (
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-black border whitespace-nowrap shrink-0 ${
                                      isMissingNow
                                        ? 'bg-red-600 text-white border-red-700'
                                        : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                                    }`}
                                  >
                                    {isMissingNow ? 'Wajib diisi' : 'Belum dinilai'}
                                  </span>
                                )}
                              </div>

                              {/* 5-Button Likert Scale Selector */}
                              <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={indText}>
                                {LIKERT_OPTIONS.map((opt) => {
                                  const isSelected = currentVal === opt.value;
                                  return (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      role="radio"
                                      aria-checked={isSelected}
                                      disabled={isFinalized}
                                      title={`Skor ${opt.value} — ${opt.label}: ${opt.desc}`}
                                      onClick={() =>
                                        handleSetIndicatorLikert(
                                          crit.criterion_id,
                                          indIdx,
                                          opt.value,
                                          comp.indicators.length
                                        )
                                      }
                                      className={`py-2 px-1 rounded-xl border-2 flex flex-col items-center justify-center transition-all select-none ${
                                        isSelected
                                          ? opt.activeBtn
                                          : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#004AAD] dark:hover:border-[#FFB800] hover:bg-[#F0F6FF] dark:hover:bg-slate-800'
                                      } ${isFinalized ? 'cursor-not-allowed opacity-85' : 'cursor-pointer active:scale-95'}`}
                                    >
                                      <span className="font-mono font-black text-sm leading-none tabular-nums">
                                        {opt.value}
                                      </span>
                                      <span
                                        className={`text-[9px] font-extrabold leading-tight mt-0.5 truncate max-w-full ${
                                          isSelected ? 'opacity-95' : 'text-slate-500 dark:text-slate-400'
                                        }`}
                                      >
                                        {opt.shortLabel}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}

                        {/* Transparent Calculation Formula Bar per Criterion */}
                        <div className="rounded-xl bg-[#F0F6FF] dark:bg-slate-950 border border-[#004AAD]/25 dark:border-slate-800 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold">
                          <div className="text-slate-800 dark:text-slate-200">
                            Poin Likert:{' '}
                            <span className="font-mono font-black text-[#004AAD] dark:text-[#FFB800] tabular-nums">
                              {comp.sumLikert} / {comp.maxTotalLikert}
                            </span>
                            {' • '}
                            Rata-rata:{' '}
                            <span className="font-mono font-black text-[#004AAD] dark:text-[#FFB800] tabular-nums">
                              {comp.avgLikert !== null ? comp.avgLikert.toFixed(2) : '-'} / 5.00
                            </span>
                          </div>
                          <div className="font-mono font-black text-[#EA580C] dark:text-[#FFB800] tabular-nums">
                            {comp.convertedScore100 !== null
                              ? `${comp.convertedScore100.toFixed(2)} × ${crit.weight_percentage}% = +${comp.weightedContribution.toFixed(2)}`
                              : 'Menunggu skor indikator'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Fallback if Admin creates a criterion with 0 indicators */
                      <div className="space-y-2.5 pt-1">
                        <div className="flex items-center justify-between gap-4">
                          <label className="text-xs font-black text-slate-950 dark:text-white">
                            Nilai {crit.criterion_name} (0–100):
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step="0.01"
                            disabled={isFinalized}
                            value={entry.score}
                            placeholder="Belum diisi"
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === '') {
                                setScoreInputs({
                                  ...scoreInputs,
                                  [crit.criterion_id]: { ...entry, score: '' }
                                });
                                return;
                              }
                              const n = Number(raw);
                              if (!Number.isNaN(n) && n >= 0 && n <= 100) {
                                setScoreInputs({
                                  ...scoreInputs,
                                  [crit.criterion_id]: { ...entry, score: raw }
                                });
                              }
                            }}
                            className="w-28 rounded-xl bg-white dark:bg-slate-950 border-2 border-[#004AAD] dark:border-[#FFB800] focus:outline-none px-3 py-2 text-right font-mono font-black text-base text-[#004AAD] dark:text-[#FFB800] tabular-nums disabled:opacity-60"
                          />
                        </div>
                      </div>
                    )}

                    {/* Per-Criterion Notes */}
                    <div>
                      <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1.5">
                        Catatan {crit.criterion_name}:
                      </label>
                      <textarea
                        rows={2}
                        disabled={isFinalized}
                        value={entry.notes}
                        onChange={(e) =>
                          setScoreInputs({
                            ...scoreInputs,
                            [crit.criterion_id]: { ...entry, notes: e.target.value }
                          })
                        }
                        placeholder={`Masukkan catatan evaluasi untuk ${crit.criterion_name}...`}
                        className="w-full rounded-xl bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 focus:border-[#004AAD] dark:focus:border-[#FFB800] focus:outline-none p-3 text-xs font-bold text-slate-950 dark:text-white disabled:opacity-60"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* OVERALL JURY NOTES */}
            <div className="rounded-2xl bg-[#F8FAFC] dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 p-5 space-y-4">
              <h3 className="font-display font-black text-base text-slate-950 dark:text-white border-b-2 border-slate-200 dark:border-slate-800 pb-2.5">
                Catatan Evaluasi Menyeluruh Dewan Juri
              </h3>

              <div>
                <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                  Kelebihan Karya
                </label>
                <textarea
                  rows={2}
                  disabled={isFinalized}
                  value={strengths}
                  onChange={(e) => setStrengths(e.target.value)}
                  placeholder="Hal-hal unggul dari inovasi pembelajaran dan penyajian video..."
                  className="w-full rounded-xl bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 focus:border-[#004AAD] focus:outline-none p-3 text-xs font-bold text-slate-950 dark:text-white disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                  Hal yang Perlu Ditingkatkan
                </label>
                <textarea
                  rows={2}
                  disabled={isFinalized}
                  value={improvements}
                  onChange={(e) => setImprovements(e.target.value)}
                  placeholder="Masukan konstruktif untuk pengembangan praktik baik ke depan..."
                  className="w-full rounded-xl bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 focus:border-[#004AAD] focus:outline-none p-3 text-xs font-bold text-slate-950 dark:text-white disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1.5">
                  Rekomendasi / Catatan Akhir
                </label>
                <textarea
                  rows={2}
                  disabled={isFinalized}
                  value={recommendations}
                  onChange={(e) => setRecommendations(e.target.value)}
                  placeholder="Kesimpulan dan rekomendasi dewan juri..."
                  className="w-full rounded-xl bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 focus:border-[#004AAD] focus:outline-none p-3 text-xs font-bold text-slate-950 dark:text-white disabled:opacity-60"
                />
              </div>

              {selectedAssignment.stage === 'FINAL' && (
                <div>
                  <label className="block text-xs font-black text-[#EA580C] dark:text-[#FFB800] mb-1.5">
                    Catatan Paparan (7 Menit) & Tanya Jawab (8 Menit) — Babak Final
                  </label>
                  <textarea
                    rows={3}
                    disabled={isFinalized}
                    value={presentationNotes}
                    onChange={(e) => setPresentationNotes(e.target.value)}
                    placeholder="Observasi dewan juri saat paparan luring 7 menit dan sesi tanya jawab 8 menit..."
                    className="w-full rounded-xl bg-white dark:bg-slate-950 border-2 border-[#F59E0B] focus:outline-none p-3 text-xs font-bold text-slate-950 dark:text-white disabled:opacity-60"
                  />
                </div>
              )}
            </div>

            {/* Weighted Total Summary Card + Action Buttons */}
            <div className="rounded-2xl bg-gradient-to-r from-[#FFFBEB] to-[#FEF3C7] dark:from-slate-900 dark:to-slate-950 border-2 border-[#F59E0B] p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-black text-[#D97706] dark:text-[#FFB800]">
                    TOTAL NILAI AKHIR TERTIMBANG (SKALA LIKERT 1–5)
                  </div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-300">
                    {allCriteriaScored
                      ? `Seluruh ${liveScoring.totalIndicators} indikator pada ${currentStageCriteria.length} kriteria telah dinilai lengkap.`
                      : `Terisi ${liveScoring.filledIndicators} dari ${liveScoring.totalIndicators} indikator (${liveScoring.totalIndicators - liveScoring.filledIndicators} indikator belum diisi).`}
                  </div>
                  {liveScoring.filledIndicators > 0 && (
                    <div className="pt-0.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-black border ${livePredicate.badgeClass}`}
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>Predikat: {livePredicate.label}</span>
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-mono font-black text-3xl text-[#004AAD] dark:text-[#FFB800] tabular-nums leading-none">
                    {liveWeightedTotal.toFixed(2)}
                  </div>
                  <div className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400 mt-0.5">
                    dari 100.00
                  </div>
                </div>
              </div>

              {!isFinalized && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    disabled={savingEval}
                    onClick={() => submitEvaluation('DRAFT')}
                    className="px-4 py-3 rounded-xl font-black text-xs text-white bg-[#004AAD] hover:bg-[#003B8E] border-2 border-[#003380] inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Save className="w-4 h-4 text-[#FFD000]" />
                    <span>SIMPAN DRAFT</span>
                  </button>

                  <button
                    type="button"
                    disabled={savingEval}
                    onClick={resetUnsavedChanges}
                    className="px-4 py-3 rounded-xl font-black text-xs text-slate-900 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-100 border-2 border-slate-300 dark:border-slate-700 inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>RESET PERUBAHAN</span>
                  </button>

                  <button
                    type="button"
                    disabled={savingEval}
                    onClick={() => {
                      if (!allCriteriaScored) {
                        setHighlightMissing(true);
                        const detailText = liveScoring.missingDetails
                          .map((m) => `${m.criterionName} (${m.missingCount} indikator: #${m.missingNumbers.join(', #')})`)
                          .join('; ');
                        setEvalFeedback({
                          type: 'error',
                          message: `Seluruh indikator wajib diberi skor Likert 1–5 sebelum finalisasi. Indikator belum diisi: ${detailText}.`
                        });
                        return;
                      }
                      setHighlightMissing(false);
                      setShowFinalizeModal(true);
                    }}
                    className="sm:col-span-2 px-5 py-3.5 rounded-xl font-black text-xs text-slate-950 bg-gradient-to-r from-[#FFD000] via-[#FFB800] to-[#FF9000] hover:brightness-105 border-2 border-[#B45309]/40 shadow-md inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Lock className="w-4 h-4" />
                    <span>FINALISASI PENILAIAN SEKARANG</span>
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setSelectedAssignment(null)}
                className="w-full py-2.5 rounded-xl text-xs font-extrabold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-800 cursor-pointer"
              >
                KEMBALI KE DAFTAR KARYA
              </button>
            </div>
          </div>
        </div>

        {/* Finalization Confirmation Dialog (With Per-Criterion Likert Breakdown) */}
        {showFinalizeModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="max-w-lg w-full rounded-3xl bg-white dark:bg-slate-900 border-2 border-[#004AAD] dark:border-[#FFB800] p-6 sm:p-7 space-y-4 shadow-2xl">
              <div className="flex items-center gap-3.5">
                <Icon3D type="judging" size="md" />
                <div>
                  <h3 className="font-display font-black text-lg text-slate-950 dark:text-white">
                    Konfirmasi Finalisasi Penilaian
                  </h3>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Peserta: {p.full_name} ({p.school})
                  </p>
                </div>
              </div>

              {/* Per-Criterion Likert Summary Table */}
              <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-black">
                      <th className="py-2 px-3">Kriteria</th>
                      <th className="py-2 px-2 text-center">Avg Likert</th>
                      <th className="py-2 px-2 text-right">Skor 100</th>
                      <th className="py-2 px-3 text-right">Tertimbang</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-bold">
                    {liveScoring.breakdown.map(({ crit, comp }) => (
                      <tr key={crit.criterion_id} className="bg-white dark:bg-slate-900">
                        <td className="py-2 px-3 text-slate-950 dark:text-white">
                          <div className="font-extrabold leading-tight">{crit.criterion_name}</div>
                          <div className="text-[10px] text-slate-500">
                            Bobot {crit.weight_percentage}% • {comp.filledCount}/{comp.totalCount} indikator
                          </div>
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-[#004AAD] dark:text-[#38BDF8] tabular-nums">
                          {comp.avgLikert !== null ? comp.avgLikert.toFixed(2) : '-'}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-slate-800 dark:text-slate-200 tabular-nums">
                          {comp.convertedScore100 !== null ? comp.convertedScore100.toFixed(2) : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-black text-[#EA580C] dark:text-[#FFB800] tabular-nums">
                          +{comp.weightedContribution.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="rounded-2xl bg-[#F0F6FF] dark:bg-slate-950 border-2 border-[#004AAD]/30 p-4 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-black text-slate-900 dark:text-slate-200 block">
                    Total Nilai Akhir Tertimbang:
                  </span>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-black border ${livePredicate.badgeClass}`}>
                    {livePredicate.label}
                  </span>
                </div>
                <span className="font-mono font-black text-3xl text-[#004AAD] dark:text-[#FFB800] tabular-nums">
                  {liveWeightedTotal.toFixed(2)}
                </span>
              </div>

              <p className="text-xs font-semibold text-slate-800 dark:text-slate-300 leading-relaxed">
                Apakah Anda yakin ingin memfinalisasi penilaian ini? Setelah difinalisasi, seluruh skor Likert indikator akan dikunci dan masuk ke perhitungan peringkat resmi.
              </p>

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowFinalizeModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-extrabold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  Periksa Kembali
                </button>
                <button
                  type="button"
                  disabled={savingEval}
                  onClick={() => submitEvaluation('FINAL')}
                  className="px-5 py-2.5 rounded-xl text-xs font-black text-slate-950 bg-gradient-to-r from-[#FFD000] to-[#FFB800] border-2 border-[#B45309]/40 cursor-pointer"
                >
                  {savingEval ? 'Memfinalisasi...' : 'Ya, Finalisasi & Kunci'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Conflict of Interest Dialog */}
        {showConflictModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <form
              onSubmit={handleReportConflict}
              className="max-w-md w-full rounded-3xl bg-white dark:bg-slate-900 border-2 border-red-500 p-6 sm:p-8 space-y-4 shadow-2xl"
            >
              <h3 className="font-display font-black text-lg text-slate-950 dark:text-white">
                Laporkan Potensi Konflik Kepentingan
              </h3>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Jika peserta ini berasal dari lembaga yang memiliki hubungan langsung dengan Anda, laporkan kepada Administrator untuk penugasan ulang.
              </p>
              <textarea
                rows={3}
                required
                value={conflictReason}
                onChange={(e) => setConflictReason(e.target.value)}
                placeholder="Tuliskan keterangan konflik kepentingan..."
                className="w-full rounded-xl bg-[#F8FAFC] dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 p-3 text-xs font-bold text-slate-950 dark:text-white"
              />
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowConflictModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border-2 border-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-black text-white bg-red-600 hover:bg-red-500"
                >
                  Kirim Laporan
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  /* =========================================================================
   * SECTION 9 — JURY DASHBOARD (/juri/dashboard)
   * ========================================================================= */
  const filteredAssignments = assignments.filter((a) =>
    stageFilter === 'ALL' ? true : a.stage === stageFilter
  );

  const juryMenus = [
    { id: 'DASHBOARD' as const, label: '1. Dashboard', shortLabel: 'Dashboard', icon: LayoutDashboard },
    { id: 'DAFTAR_KARYA' as const, label: '2. Daftar Karya', shortLabel: 'Karya', icon: ClipboardList },
    { id: 'PENILAIAN_SAYA' as const, label: '3. Penilaian Saya', shortLabel: 'Nilai Saya', icon: CheckSquare },
    { id: 'REKAP_PRIBADI' as const, label: '4. Rekap Pribadi', shortLabel: 'Rekap', icon: BarChart3 },
    { id: 'PROFIL' as const, label: '5. Profil & Sandi', shortLabel: 'Profil', icon: UserCheck }
  ];

  return (
    <div className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-white dark:bg-[#070b14] text-slate-950 dark:text-white flex flex-col lg:flex-row relative transition-colors duration-150">
      {/* Desktop Sidebar Navigation (Sticky on desktop) */}
      <aside className="w-full lg:w-68 bg-[#F8FAFC] dark:bg-[#0a1122] border-b-2 lg:border-b-0 lg:border-r-2 border-[#004AAD]/20 dark:border-[#FFB800]/30 p-3 sm:p-4 lg:p-5 flex flex-col justify-between shrink-0 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src={mainLogoUrl}
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
                  PORTAL DEWAN JURI
                </div>
                <div className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                  FK3S KEC. BEJI • HGN 2026
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
                onClick={onBackToPublic}
                className="px-3 py-2 rounded-xl bg-[#004AAD] text-white text-xs font-black"
              >
                Publik
              </button>
            </div>
          </div>

          <nav className="hidden lg:flex lg:flex-col gap-2">
            {juryMenus.map((item) => {
              const Icon = item.icon;
              const active = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveNav(item.id)}
                  className={`px-4 py-3 rounded-xl text-left text-xs font-black inline-flex items-center gap-2.5 transition-all cursor-pointer border-2 ${
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

        <div className="hidden lg:flex flex-col gap-2.5 pt-6 border-t-2 border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onToggleTheme}
            className="w-full px-3.5 py-2.5 rounded-xl text-xs font-extrabold bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white inline-flex items-center justify-between cursor-pointer"
          >
            <span>Mode Tampilan</span>
            {theme === 'light' ? (
              <span className="inline-flex items-center gap-1 text-[#004AAD]">
                <Moon className="w-3.5 h-3.5" /> Gelap
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[#FFB800]">
                <Sun className="w-3.5 h-3.5" /> Cerah
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={onBackToPublic}
            className="w-full px-3.5 py-2.5 rounded-xl text-xs font-extrabold text-slate-900 dark:text-white bg-white dark:bg-slate-900 hover:bg-slate-100 border-2 border-slate-300 dark:border-slate-700 text-left inline-flex items-center justify-between cursor-pointer"
          >
            <span>Lihat Beranda Publik</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#004AAD] dark:text-[#FFB800]" />
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full px-3.5 py-2.5 rounded-xl text-xs font-black text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/60 hover:bg-red-100 border-2 border-red-300 dark:border-red-500/40 inline-flex items-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>6. Keluar Sesi Juri</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pb-40 lg:pb-12 max-w-6xl mx-auto w-full space-y-6">
        {/* Dashboard Header */}
        <div className="rounded-3xl bg-gradient-to-r from-[#004AAD] to-[#1D4ED8] text-white border-2 border-[#003380] p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-md">
          <div className="space-y-1">
            <div className="inline-block px-3 py-0.5 rounded-md bg-[#FFB800] text-slate-950 text-[11px] font-black uppercase">
              Unsur Juri: {jury.jury_category} • {jury.institution}
            </div>
            <h1 className="font-display font-black text-2xl sm:text-3xl text-white mt-1">
              Selamat Datang, {jury.full_name}
            </h1>
            <p className="text-xs sm:text-sm font-bold text-blue-100">
              Portal Penjurian Digital Lomba Guru Inspiratif 2026 — FK3S KEC. BEJI
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white text-slate-950 border-2 border-[#FFB800] px-4 py-3 text-right shadow-xs">
              <div className="text-[10px] font-black uppercase text-slate-600">Tahapan Aktif</div>
              <div className="font-display font-black text-base text-[#004AAD]">
                {activeStage === 'FINAL' ? 'FINAL TOP 5' : 'PENYISIHAN'}
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="lg:hidden px-3.5 py-3 rounded-xl bg-red-600 text-white text-xs font-black"
            >
              Keluar
            </button>
          </div>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Karya Ditugaskan', val: summary.total_assigned, badge: 'bg-[#004AAD] text-white' },
            { label: 'Belum Dinilai', val: summary.not_scored, badge: 'bg-red-600 text-white' },
            { label: 'Draft Penilaian', val: summary.draft, badge: 'bg-[#F59E0B] text-slate-950' },
            { label: 'Sudah Difinalisasi', val: summary.finalized, badge: 'bg-emerald-600 text-white' }
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl bg-[#F8FAFC] dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 p-4 sm:p-5 flex flex-col justify-between"
            >
              <div className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">{stat.label}</div>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-mono font-black text-2xl sm:text-3xl text-slate-950 dark:text-white tabular-nums">
                  {stat.val}
                </span>
                <span className={`px-2.5 py-1 rounded-lg font-mono font-black text-[10px] ${stat.badge}`}>
                  KARYA
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Views based on activeNav */}
        {(activeNav === 'DASHBOARD' || activeNav === 'DAFTAR_KARYA' || activeNav === 'PENILAIAN_SAYA') && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="font-display font-black text-xl text-[#004AAD] dark:text-white">
                {activeNav === 'PENILAIAN_SAYA'
                  ? 'Daftar Penilaian Saya (Draft & Final)'
                  : 'Daftar Karya Peserta yang Ditugaskan'}
              </h2>

              <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-xl self-start">
                {(['ALL', 'PENYISIHAN', 'FINAL'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStageFilter(st)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-colors cursor-pointer ${
                      stageFilter === st
                        ? 'bg-[#004AAD] text-white dark:bg-[#FFB800] dark:text-slate-950'
                        : 'text-slate-800 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800'
                    }`}
                  >
                    {st === 'ALL' ? 'Semua Tahap' : st}
                  </button>
                ))}
              </div>
            </div>

            {filteredAssignments.length === 0 ? (
              <div className="rounded-2xl bg-[#F8FAFC] dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 p-10 text-center space-y-2">
                <p className="font-display font-black text-base text-slate-950 dark:text-white">
                  Belum Ada Karya yang Ditugaskan
                </p>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Administrator belum menambahkan penugasan peserta untuk akun Anda pada filter tahap ini.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredAssignments
                  .filter((a) =>
                    activeNav === 'PENILAIAN_SAYA'
                      ? a.evaluation_status === 'DRAFT' || a.evaluation_status === 'FINAL'
                      : true
                  )
                  .map((asg) => {
                    const p = asg.participant;
                    if (!p) return null;
                    const statusLabel =
                      asg.evaluation_status === 'FINAL'
                        ? 'Final'
                        : asg.evaluation_status === 'DRAFT'
                        ? 'Draft'
                        : 'Belum Dinilai';

                    const btnLabel =
                      asg.evaluation_status === 'FINAL'
                        ? 'LIHAT HASIL PENILAIAN'
                        : asg.evaluation_status === 'DRAFT'
                        ? 'LANJUTKAN PENILAIAN'
                        : 'MULAI PENILAIAN';

                    return (
                      <div
                        key={asg.assignment_id}
                        className="rounded-2xl bg-[#F8FAFC] dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 p-5 sm:p-6 flex flex-col justify-between gap-4 hover:border-[#004AAD] dark:hover:border-[#FFB800] transition-colors"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="px-2.5 py-1 rounded-md bg-[#004AAD] text-white font-mono font-black tabular-nums">
                              {p.participant_id} • {asg.stage}
                            </span>
                            <span
                              className={`px-2.5 py-1 rounded-md font-black ${
                                asg.evaluation_status === 'FINAL'
                                  ? 'bg-emerald-600 text-white'
                                  : asg.evaluation_status === 'DRAFT'
                                  ? 'bg-[#F59E0B] text-slate-950'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                              }`}
                            >
                              Status: {statusLabel}
                            </span>
                          </div>

                          <h3 className="font-display font-black text-lg text-slate-950 dark:text-white pt-1">
                            {p.full_name}
                          </h3>
                          <p className="text-xs text-[#EA580C] dark:text-[#FFB800] font-extrabold">{p.school}</p>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 line-clamp-2">
                            {p.innovation_title}
                          </p>
                        </div>

                        <div className="pt-4 border-t-2 border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                          {asg.evaluation ? (
                            <div>
                              <div className="text-[11px] font-extrabold text-slate-600 dark:text-slate-400">Skor Tertimbang</div>
                              <div className="font-mono font-black text-xl text-[#004AAD] dark:text-[#FFB800] tabular-nums">
                                {Number(asg.evaluation.weighted_total).toFixed(2)}
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs font-bold text-slate-600 dark:text-slate-400">Belum ada skor</div>
                          )}

                          <button
                            type="button"
                            onClick={() => openEvaluationWorkspace(asg)}
                            className={`px-5 py-3 rounded-xl font-black text-xs transition-all whitespace-nowrap shrink-0 cursor-pointer border-2 ${
                              asg.evaluation_status === 'FINAL'
                                ? 'bg-[#004AAD] hover:bg-[#003B8E] text-white border-[#003380]'
                                : 'bg-gradient-to-r from-[#FFD000] via-[#FFB800] to-[#FF9000] hover:brightness-105 text-slate-950 border-[#B45309]/40 shadow-sm'
                            }`}
                          >
                            {btnLabel}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* 4. REKAP PRIBADI */}
        {activeNav === 'REKAP_PRIBADI' && (
          <div className="rounded-2xl bg-[#F8FAFC] dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 p-6 space-y-5">
            <div>
              <h2 className="font-display font-black text-xl text-[#004AAD] dark:text-white">
                Rekapitulasi Penilaian Pribadi ({jury.full_name})
              </h2>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                Menampilkan rincian nilai yang telah Anda berikan (kerahasiaan antar-juri terjaga).
              </p>
            </div>

            <div className="overflow-x-auto rounded-2xl border-2 border-slate-300 dark:border-slate-700">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#004AAD] text-white text-xs font-black">
                    <th className="py-3 px-3">ID Peserta</th>
                    <th className="py-3 px-3">Nama Guru</th>
                    <th className="py-3 px-3">Asal Sekolah</th>
                    <th className="py-3 px-3">Tahap</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Nilai Tertimbang</th>
                    <th className="py-3 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-200 dark:divide-slate-800 font-bold bg-white dark:bg-slate-950">
                  {assignments.map((asg) => (
                    <tr key={asg.assignment_id} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                      <td className="py-3 px-3 font-mono font-black text-[#004AAD] dark:text-[#FFB800] tabular-nums">
                        {asg.participant_id}
                      </td>
                      <td className="py-3 px-3 font-extrabold text-slate-950 dark:text-white">
                        {asg.participant?.full_name || '-'}
                      </td>
                      <td className="py-3 px-3 text-slate-800 dark:text-slate-200">
                        {asg.participant?.school || '-'}
                      </td>
                      <td className="py-3 px-3 font-mono text-xs">{asg.stage}</td>
                      <td className="py-3 px-3">{asg.evaluation_status}</td>
                      <td className="py-3 px-3 text-right font-mono font-black text-[#EA580C] dark:text-[#FFB800] tabular-nums">
                        {asg.evaluation ? Number(asg.evaluation.weighted_total).toFixed(2) : '-'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => openEvaluationWorkspace(asg)}
                          className="px-3 py-1.5 rounded-lg bg-[#004AAD] text-white text-xs font-black hover:bg-[#003B8E] cursor-pointer"
                        >
                          Buka Nilai
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. PROFIL JURI & UBAH PASSWORD */}
        {activeNav === 'PROFIL' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl bg-[#F8FAFC] dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 p-6 space-y-4">
              <h2 className="font-display font-black text-lg text-[#004AAD] dark:text-white">
                Identitas Dewan Juri
              </h2>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-xs font-extrabold text-slate-600 dark:text-slate-400">Nama Lengkap</div>
                  <div className="font-black text-slate-950 dark:text-white">{jury.full_name}</div>
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-600 dark:text-slate-400">NIP / Identitas</div>
                  <div className="font-mono font-bold text-slate-900 dark:text-slate-200">{jury.identity_number || '-'}</div>
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-600 dark:text-slate-400">Unsur & Instansi</div>
                  <div className="font-bold text-slate-900 dark:text-slate-200">
                    {jury.jury_category} — {jury.institution || 'Kecamatan Beji'}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-600 dark:text-slate-400">Username Login</div>
                  <div className="font-mono font-black text-[#EA580C] dark:text-[#FFB800]">@{jury.username}</div>
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-600 dark:text-slate-400">Penugasan Tahap</div>
                  <div className="font-mono font-bold text-slate-900 dark:text-slate-200">{jury.assigned_stages}</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-[#F8FAFC] dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 p-6 space-y-4">
              <div className="flex items-center gap-2.5">
                <KeyRound className="w-5 h-5 text-[#004AAD] dark:text-[#FFB800]" />
                <h2 className="font-display font-black text-lg text-slate-950 dark:text-white">
                  Ubah Password Akun Juri
                </h2>
              </div>

              {passwordFeedback && (
                <div
                  className={`rounded-xl p-3 text-xs font-extrabold border-2 ${
                    passwordFeedback.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-600 text-emerald-900 dark:text-emerald-200'
                      : 'bg-red-50 dark:bg-red-950/60 border-red-600 text-red-900 dark:text-red-200'
                  }`}
                >
                  {passwordFeedback.message}
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1">Password Saat Ini</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-xl bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 px-3.5 py-2.5 text-sm font-bold text-slate-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1">
                    Password Baru (Min. 6 Karakter)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-xl bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 px-3.5 py-2.5 text-sm font-bold text-slate-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-200 mb-1">
                    Konfirmasi Password Baru
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full rounded-xl bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 px-3.5 py-2.5 text-sm font-bold text-slate-950 dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={changingPass}
                  className="px-5 py-2.5 rounded-xl font-black text-xs text-slate-950 bg-[#FFD000] hover:bg-[#FFB800] border-2 border-[#B45309]/40 cursor-pointer"
                >
                  {changingPass ? 'MENYIMPAN...' : 'PERBARUI PASSWORD'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
       * RESPONSIVE FLOATING BOTTOM NAVIGATION BAR FOR JURY (Mobile & Tablet)
       * Locked in place (tetap melayang & tidak ikut tergeser!)
       * ===================================================================== */}
      <div className="fixed bottom-2.5 inset-x-0 z-50 lg:hidden px-2.5 pointer-events-none select-none">
        <div className="pointer-events-auto max-w-xl w-full mx-auto rounded-2xl bg-white/98 dark:bg-[#0a1122]/98 backdrop-blur-xl border-2 border-[#004AAD] dark:border-[#FFB800] shadow-[0_14px_36px_rgba(0,74,173,0.35)] p-1.5 grid grid-cols-5 gap-1 overflow-hidden">
          {juryMenus.map((m) => {
            const Icon = m.icon;
            const active = activeNav === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setActiveNav(m.id)}
                className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer truncate ${
                  active
                    ? 'bg-[#004AAD] text-white dark:bg-[#FFB800] dark:text-slate-950 shadow-xs'
                    : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="text-[10px] font-black leading-tight truncate">{m.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
