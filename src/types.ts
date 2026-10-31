export type JudgingStage = 'PENYISIHAN' | 'FINAL';
export type EvaluationStatus = 'BELUM_DINILAI' | 'DRAFT' | 'FINAL';
export type VerificationStatus = 'MENUNGGU' | 'TERVERIFIKASI' | 'REVISI' | 'DIKECUALIKAN';
export type SubmissionMode = 'INTERNAL' | 'GOOGLE_FORM';

export interface SettingItem {
  key: string;
  value: string;
  description: string;
  updated_at: string;
}

export interface JuknisSection {
  id: string;
  section_code: string;
  title: string;
  content: string;
  sort_order: number;
  active: boolean;
  updated_at: string;
}

export interface JadwalItem {
  id: string;
  activity: string;
  start_datetime: string;
  end_datetime: string;
  location: string;
  display_order: number;
  active: boolean;
}

export interface HadiahItem {
  id: string;
  rank: string;
  prize_amount: number;
  description: string;
  display_order: number;
  active: boolean;
}

export interface Participant {
  participant_id: string;
  submitted_at: string;
  full_name: string;
  school: string;
  innovation_title: string;
  drive_folder_url: string;
  video_url: string;
  lesson_module_url: string;
  learning_media_url: string;
  whatsapp: string;
  verification_status: VerificationStatus;
  admin_notes: string;
  consent: boolean;
}

export interface JuryAccount {
  jury_id: string;
  full_name: string;
  identity_number: string;
  jury_category: 'Korwilcam' | 'Pengawas' | 'Praktisi' | 'Lainnya';
  institution: string;
  whatsapp: string;
  username: string;
  password_verifier?: string;
  password_salt?: string;
  must_change_password: boolean;
  account_status: 'AKTIF' | 'NONAKTIF';
  assigned_stages: 'PENYISIHAN' | 'FINAL' | 'KEDUANYA';
  admin_notes: string;
  created_at: string;
  updated_at: string;
}

export interface ScoringCriterion {
  criterion_id: string;
  stage: JudgingStage;
  rubric_version: number;
  criterion_name: string;
  description: string;
  indicators_json: string; // JSON stringified array of strings
  weight_percentage: number;
  minimum_score: number;
  maximum_score: number;
  display_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface JuryAssignment {
  assignment_id: string;
  jury_id: string;
  participant_id: string;
  stage: JudgingStage;
  assignment_status: 'ACTIVE' | 'REMOVED' | 'CONFLICT';
  assigned_at: string;
  assigned_by: string;
  conflict_flag: boolean;
  conflict_notes: string;
}

export interface EvaluationRecord {
  evaluation_id: string;
  jury_id: string;
  participant_id: string;
  assignment_id: string;
  stage: JudgingStage;
  rubric_version: number;
  weighted_total: number;
  strengths: string;
  improvements: string;
  recommendations: string;
  presentation_notes: string;
  evaluation_status: EvaluationStatus;
  saved_at: string;
  finalized_at: string;
  reopened_at: string;
  reopened_by: string;
  reopen_reason: string;
}

export interface EvaluationDetail {
  detail_id: string;
  evaluation_id: string;
  criterion_id: string;
  criterion_name_snapshot: string;
  weight_snapshot: number;
  score: number | null;
  weighted_score: number;
  criterion_notes: string;
  updated_at: string;
}

export interface ScoreRecapItem {
  participant_id: string;
  stage: JudgingStage;
  required_jurors: number;
  finalized_jurors: number;
  average_score: number | null;
  evaluation_complete: boolean;
  rank: number | null;
  is_tied?: boolean;
  admin_exception?: boolean;
  last_calculated: string;
}

export interface FinalistWinnerRecord {
  record_id: string;
  participant_id: string;
  stage: JudgingStage;
  selection_type: 'TOP_5' | 'WINNER';
  award_rank: string;
  approved_score: number;
  decision_notes: string;
  approved_by: string;
  approved_at: string;
  published: boolean;
}

export interface AnnouncementItem {
  announcement_id: string;
  title: string;
  content: string;
  category: 'Informasi Lomba' | 'Pengumpulan Karya' | 'Pengumuman Top 5' | 'Jadwal Final' | 'Pengumuman Pemenang';
  publication_date: string;
  published: boolean;
  display_order: number;
  updated_at: string;
}

export interface ActivityLog {
  log_id: string;
  timestamp: string;
  actor_id: string;
  actor_role: 'ADMIN' | 'JURI' | 'PUBLIC';
  action: string;
  target_type: string;
  target_id: string;
  description: string;
}

export interface SchoolItem {
  school_id: string;
  npsn: string;
  school_name: string;
  status: 'NEGERI' | 'SWASTA';
  village: string;
  district: string;
  regency: string;
  province: string;
  active: boolean;
}

export interface PublicParticipantItem {
  participant_id: string;
  school: string;
  full_name: string;
  innovation_title: string;
}

export interface PublicDataPayload {
  settings: Record<string, string>;
  juknis: JuknisSection[];
  jadwal: JadwalItem[];
  hadiah: HadiahItem[];
  sekolah: SchoolItem[];
  public_participants: PublicParticipantItem[];
  pengumuman: AnnouncementItem[];
  top5: Array<FinalistWinnerRecord & { full_name: string; school: string; innovation_title: string }>;
  winners: Array<FinalistWinnerRecord & { full_name: string; school: string; innovation_title: string }>;
  stats: {
    total_participants: number;
    total_schools: number;
    total_registered_schools?: number;
  };
  last_sync: string;
}

