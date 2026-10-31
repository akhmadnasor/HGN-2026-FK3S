import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const IS_SERVERLESS = Boolean(
  process.env.NETLIFY ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT
);

app.use(express.json({ limit: '5mb' }));

// Normalize request URL when invoked via Netlify Functions (/.netlify/functions/api/*)
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.url.startsWith('/.netlify/functions/api')) {
    const stripped = req.url.replace(/^\/\.netlify\/functions\/api/, '');
    req.url = stripped.startsWith('/api') ? stripped : `/api${stripped.startsWith('/') ? '' : '/'}${stripped}`;
  } else if (IS_SERVERLESS && !req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }
  next();
});

// ============================================================================
// ENVIRONMENT & CONFIGURATION
// ============================================================================
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '@1';
const SESSION_SECRET = process.env.SESSION_SECRET || 'hgn-beji-2026-secure-session-secret';

let dynamicAppsScriptUrl = process.env.APPS_SCRIPT_WEB_APP_URL || '';
let dynamicApiSharedSecret = process.env.API_SHARED_SECRET || 'hgn-beji-2026-shared-secret';
let lastGoogleSheetsSyncStatus: { connected: boolean; mode: string; lastSync: string; message: string } = {
  connected: Boolean(dynamicAppsScriptUrl),
  mode: dynamicAppsScriptUrl ? 'GOOGLE_SHEETS_BRIDGE' : 'READY_FOR_APPS_SCRIPT_URL',
  lastSync: nowJakarta(),
  message: dynamicAppsScriptUrl
    ? 'Terhubung ke Google Apps Script Web App (HGN 2026 Kec. Beji)'
    : 'Database aktif & tersimpan. Masukkan Web App URL Google Apps Script pada menu Pengaturan Sistem untuk sinkronisasi langsung ke spreadsheet HGN 2026 Kec. Beji.'
};

function nowJakarta(): string {
  try {
    const formatter = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    return formatter.format(new Date()).replace(' ', 'T') + '+07:00';
  } catch {
    return new Date().toISOString();
  }
}

// ============================================================================
// CRYPTO & PASSWORD HASHING (Node.js built-in crypto.scrypt)
// ============================================================================
function hashPassword(password: string, salt?: string): { salt: string; verifier: string } {
  const usedSalt = salt || crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, usedSalt, 64);
  return {
    salt: usedSalt,
    verifier: derivedKey.toString('hex')
  };
}

function verifyPassword(password: string, salt: string, verifier: string): boolean {
  if (!salt || !verifier) return false;
  const derivedKey = crypto.scryptSync(password, salt, 64);
  const verifierBuf = Buffer.from(verifier, 'hex');
  if (derivedKey.length !== verifierBuf.length) return false;
  return crypto.timingSafeEqual(derivedKey, verifierBuf);
}

// ============================================================================
// SESSION & RATE LIMIT MANAGEMENT (HttpOnly Cookies)
// ============================================================================
interface SessionData {
  id: string;
  role: 'ADMIN' | 'JURI';
  userId: string;
  username: string;
  fullName: string;
  expiresAt: number;
}

const sessions = new Map<string, SessionData>();
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (record.count >= 12) {
    return false;
  }
  record.count += 1;
  return true;
}

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};
  const list: Record<string, string> = {};
  header.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const key = parts.shift()?.trim();
    const val = decodeURI(parts.join('='));
    if (key) list[key] = val;
  });
  return list;
}

function createSessionCookie(res: Response, cookieName: string, role: 'ADMIN' | 'JURI', userId: string, username: string, fullName: string) {
  const expiresAt = Date.now() + 1000 * 60 * 60 * 12; // 12 hours
  const payloadObj: SessionData = {
    id: crypto.randomBytes(12).toString('hex'),
    role,
    userId,
    username,
    fullName,
    expiresAt
  };
  const payloadB64 = Buffer.from(JSON.stringify(payloadObj), 'utf-8').toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('base64url');
  const token = `${payloadB64}.${signature}`;
  sessions.set(token, payloadObj);
  const secureFlag = IS_SERVERLESS || process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 12}${secureFlag}`
  );
  return token;
}

function clearSessionCookie(req: Request, res: Response, cookieName: string) {
  const cookies = parseCookies(req);
  const token = cookies[cookieName];
  if (token) sessions.delete(token);
  res.setHeader('Set-Cookie', `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

function getSession(req: Request, role: 'ADMIN' | 'JURI'): SessionData | null {
  const cookies = parseCookies(req);
  const cookieName = role === 'ADMIN' ? 'hgn_admin_session' : 'hgn_jury_session';
  const token = cookies[cookieName];
  if (!token) return null;

  // Verify stateless HMAC-signed session token (works across Netlify serverless instances)
  if (token.includes('.')) {
    const [payloadB64, signature] = token.split('.');
    if (payloadB64 && signature) {
      const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('base64url');
      if (signature === expectedSig) {
        try {
          const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8')) as SessionData;
          if (decoded && decoded.role === role && Date.now() <= decoded.expiresAt) {
            return decoded;
          }
        } catch {
          // Fall through to legacy check
        }
      }
    }
  }

  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt || session.role !== role) {
    sessions.delete(token);
    return null;
  }
  return session;
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const session = getSession(req, 'ADMIN');
  if (!session) {
    return res.status(401).json({ success: false, message: 'Sesi Admin tidak valid atau telah berakhir. Silakan login kembali.', error_code: 'UNAUTHORIZED_ADMIN' });
  }
  (req as any).adminSession = session;
  next();
}

function requireJury(req: Request, res: Response, next: NextFunction) {
  const session = getSession(req, 'JURI');
  if (!session) {
    return res.status(401).json({ success: false, message: 'Sesi Juri tidak valid atau telah berakhir. Silakan login kembali.', error_code: 'UNAUTHORIZED_JURY' });
  }
  const jury = db.JURI.find((j) => j.jury_id === session.userId);
  if (!jury || jury.account_status !== 'AKTIF') {
    return res.status(403).json({ success: false, message: 'Akun Juri telah dinonaktifkan oleh Administrator.', error_code: 'INACTIVE_JURY' });
  }
  (req as any).jurySession = session;
  (req as any).juryAccount = jury;
  next();
}

// ============================================================================
// DATABASE STRUCTURE (14 TABLES — HGN 2026 Kec. Beji)
// ============================================================================
interface DatabaseSchema {
  PENGATURAN: Array<{ key: string; value: string; description: string; updated_at: string }>;
  JUKNIS: Array<{ id: string; section_code: string; title: string; content: string; sort_order: number; active: boolean; updated_at: string }>;
  JADWAL: Array<{ id: string; activity: string; start_datetime: string; end_datetime: string; location: string; display_order: number; active: boolean }>;
  HADIAH: Array<{ id: string; rank: string; prize_amount: number; description: string; display_order: number; active: boolean }>;
  PESERTA: Array<{
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
    verification_status: 'MENUNGGU' | 'TERVERIFIKASI' | 'REVISI' | 'DIKECUALIKAN';
    admin_notes: string;
    consent: boolean;
  }>;
  JURI: Array<{
    jury_id: string;
    full_name: string;
    identity_number: string;
    jury_category: 'Korwilcam' | 'Pengawas' | 'Praktisi' | 'Lainnya';
    institution: string;
    whatsapp: string;
    username: string;
    password_verifier: string;
    password_salt: string;
    must_change_password: boolean;
    account_status: 'AKTIF' | 'NONAKTIF';
    assigned_stages: 'PENYISIHAN' | 'FINAL' | 'KEDUANYA';
    admin_notes: string;
    created_at: string;
    updated_at: string;
  }>;
  KRITERIA_PENILAIAN: Array<{
    criterion_id: string;
    stage: 'PENYISIHAN' | 'FINAL';
    rubric_version: number;
    criterion_name: string;
    description: string;
    indicators_json: string;
    weight_percentage: number;
    minimum_score: number;
    maximum_score: number;
    display_order: number;
    active: boolean;
    created_at: string;
    updated_at: string;
  }>;
  PENUGASAN_JURI: Array<{
    assignment_id: string;
    jury_id: string;
    participant_id: string;
    stage: 'PENYISIHAN' | 'FINAL';
    assignment_status: 'ACTIVE' | 'REMOVED' | 'CONFLICT';
    assigned_at: string;
    assigned_by: string;
    conflict_flag: boolean;
    conflict_notes: string;
  }>;
  PENILAIAN: Array<{
    evaluation_id: string;
    jury_id: string;
    participant_id: string;
    assignment_id: string;
    stage: 'PENYISIHAN' | 'FINAL';
    rubric_version: number;
    weighted_total: number;
    strengths: string;
    improvements: string;
    recommendations: string;
    presentation_notes: string;
    evaluation_status: 'BELUM_DINILAI' | 'DRAFT' | 'FINAL';
    saved_at: string;
    finalized_at: string;
    reopened_at: string;
    reopened_by: string;
    reopen_reason: string;
  }>;
  DETAIL_NILAI: Array<{
    detail_id: string;
    evaluation_id: string;
    criterion_id: string;
    criterion_name_snapshot: string;
    weight_snapshot: number;
    score: number | null;
    weighted_score: number;
    criterion_notes: string;
    updated_at: string;
  }>;
  REKAP_PENILAIAN: Array<{
    participant_id: string;
    stage: 'PENYISIHAN' | 'FINAL';
    required_jurors: number;
    finalized_jurors: number;
    average_score: number | null;
    evaluation_complete: boolean;
    rank: number | null;
    is_tied?: boolean;
    admin_exception?: boolean;
    last_calculated: string;
  }>;
  FINALIS_PEMENANG: Array<{
    record_id: string;
    participant_id: string;
    stage: 'PENYISIHAN' | 'FINAL';
    selection_type: 'TOP_5' | 'WINNER';
    award_rank: string;
    approved_score: number;
    decision_notes: string;
    approved_by: string;
    approved_at: string;
    published: boolean;
  }>;
  PENGUMUMAN: Array<{
    announcement_id: string;
    title: string;
    content: string;
    category: 'Informasi Lomba' | 'Pengumpulan Karya' | 'Pengumuman Top 5' | 'Jadwal Final' | 'Pengumuman Pemenang';
    publication_date: string;
    published: boolean;
    display_order: number;
    updated_at: string;
  }>;
  LOG_AKTIVITAS: Array<{
    log_id: string;
    timestamp: string;
    actor_id: string;
    actor_role: 'ADMIN' | 'JURI' | 'PUBLIC';
    action: string;
    target_type: string;
    target_id: string;
    description: string;
  }>;
}

const BUNDLED_DATA_DIR = path.resolve(process.cwd(), 'data');
const BUNDLED_DB_FILE = path.join(BUNDLED_DATA_DIR, 'hgn_beji_2026_db.json');
const TMP_DB_FILE = path.join(os.tmpdir(), 'hgn_beji_2026_db.json');
const DATA_DIR = IS_SERVERLESS ? os.tmpdir() : BUNDLED_DATA_DIR;
const DB_FILE = IS_SERVERLESS ? TMP_DB_FILE : BUNDLED_DB_FILE;

function getInitialDatabase(): DatabaseSchema {
  const now = nowJakarta();
  const indPedagogik = JSON.stringify([
    'Relevansi inovasi pembelajaran dengan kebutuhan belajar siswa',
    'Orisinalitas dan kreativitas metode atau media pembelajaran',
    'Penerapan prinsip Joyful Learning (pembelajaran menyenangkan)',
    'Penerapan prinsip Meaningful Learning (pembelajaran bermakna)',
    'Penerapan prinsip Mindful Learning (pembelajaran berkesadaran)',
    'Kelengkapan dan keterpaduan Modul Ajar',
    'Kesesuaian antara perencanaan Modul Ajar dan pelaksanaan nyata di kelas'
  ]);
  const indDampak = JSON.stringify([
    'Kejelasan identifikasi masalah awal pembelajaran (Situasi)',
    'Relevansi tantangan yang dihadapi guru di kelas (Tantangan)',
    'Ketepatan langkah nyata dalam kerangka alur STAR (Aksi)',
    'Bukti autentik aktivitas pembelajaran nyata bersama siswa',
    'Dampak positif yang terukur terhadap hasil atau motivasi belajar siswa',
    'Kualitas dan relevansi testimoni (siswa, rekan sejawat, atau kepala sekolah)',
    'Kualitas refleksi hasil pembelajaran dan rencana tindak lanjut (Refleksi)'
  ]);
  const indVideo = JSON.stringify([
    'Kesesuaian durasi video (minimal 5 menit dan maksimal 7 menit)',
    'Kejernihan kualitas visual dan pencahayaan video',
    'Kejernihan kualitas audio, suara guru, dan musik latar yang proporsional',
    'Struktur alur penyajian video yang runtut dan komunikatif',
    'Kreativitas penyuntingan (editing) dan estetika grafis pendukung',
    'Kejelasan artikulasi dan narasi penjelasan guru',
    'Kelengkapan dan keterbacaan bukti visual serta dokumentasi media pembelajaran'
  ]);

  return {
    PENGATURAN: [
      { key: 'site_title', value: 'LOMBA GURU INSPIRATIF 2026', description: 'Judul utama website', updated_at: now },
      { key: 'tagline', value: 'GURU HEBAT, INDONESIA KUAT', description: 'Tagline utama HGN 2026', updated_at: now },
      { key: 'hashtag', value: '#BejolanAji', description: 'Hashtag resmi', updated_at: now },
      { key: 'organizer', value: 'FK3S KEC. BEJI', description: 'Penyelenggara kegiatan', updated_at: now },
      { key: 'main_logo_url', value: 'https://lh3.googleusercontent.com/d/1_q1kZ4MJoP6VQR7qs61HId_k_HHXB4oe', description: 'Logo utama beranda (Page 1)', updated_at: now },
      { key: 'app_icon_url', value: 'https://lh3.googleusercontent.com/d/13M5y3gnxVP6cUPGKRXqdYqmHxFjPAvpD', description: 'Logo FK3S Kec. Beji (Header & Page 2)', updated_at: now },
      { key: 'hero_background_url', value: '', description: 'Gambar latar hero opsional', updated_at: now },
      { key: 'banner_url', value: '', description: 'Gambar banner tambahan', updated_at: now },
      { key: 'primary_color', value: '#0284c7', description: 'Warna utama (Biru Institusi FK3S)', updated_at: now },
      { key: 'secondary_color', value: '#d97706', description: 'Warna sekunder (Emas Inspiratif)', updated_at: now },
      { key: 'contact_whatsapp', value: 'Sekretariat FK3S KEC. BEJI — Kabupaten Pasuruan', description: 'Informasi kontak di footer', updated_at: now },
      { key: 'footer_text', value: 'FK3S KEC. BEJI — Memperingati Hari Guru Nasional 2026', description: 'Teks footer', updated_at: now },
      { key: 'submission_deadline', value: '2026-11-21T23:59:00+07:00', description: 'Batas waktu pengumpulan karya (Asia/Jakarta)', updated_at: now },
      { key: 'submission_enabled', value: 'true', description: 'Status buka/tutup pengumpulan karya', updated_at: now },
      { key: 'submission_mode', value: 'INTERNAL', description: 'Mode pengumpulan: INTERNAL atau GOOGLE_FORM', updated_at: now },
      { key: 'external_form_url', value: '', description: 'URL Google Form eksternal jika mode GOOGLE_FORM', updated_at: now },
      { key: 'active_judging_stage', value: 'PENYISIHAN', description: 'Tahap penjurian aktif (PENYISIHAN / FINAL)', updated_at: now },
      { key: 'jury_portal_enabled', value: 'true', description: 'Status portal login juri', updated_at: now },
      { key: 'preliminary_results_published', value: 'false', description: 'Publikasi pengumuman Top 5', updated_at: now },
      { key: 'final_results_published', value: 'false', description: 'Publikasi pemenang utama', updated_at: now },
      { key: 'stage_combination_mode', value: 'SEPARATE', description: 'Perhitungan nilai babak final: SEPARATE atau COMBINED', updated_at: now },
      { key: 'preliminary_stage_weight', value: '40', description: 'Bobot nilai penyisihan (%) bila digabung', updated_at: now },
      { key: 'final_stage_weight', value: '60', description: 'Bobot nilai final (%) bila digabung', updated_at: now },
      { key: 'apps_script_url', value: dynamicAppsScriptUrl, description: 'URL Web App Google Apps Script (HGN 2026 Kec. Beji)', updated_at: now },
      { key: 'last_updated', value: now, description: 'Waktu pembaruan terakhir', updated_at: now }
    ],
    JUKNIS: [
      {
        id: 'JUK-A',
        section_code: 'A',
        title: 'LATAR BELAKANG DAN TUJUAN',
        content:
          'Dalam rangka memperingati Hari Guru Nasional Tahun 2026, FKKKS Kecamatan Beji menyelenggarakan Lomba Video Guru Inspiratif untuk menggali, mengapresiasi, dan mendiseminasikan praktik baik serta inovasi pembelajaran guru.',
        sort_order: 1,
        active: true,
        updated_at: now
      },
      {
        id: 'JUK-B',
        section_code: 'B',
        title: 'KETENTUAN PESERTA',
        content:
          '1. Peserta merupakan guru aktif di sekolah dasar se-Kecamatan Beji.\n2. Kepesertaan bersifat wajib bagi setiap lembaga.\n3. Setiap sekolah mengirimkan minimal satu guru sebagai perwakilan.',
        sort_order: 2,
        active: true,
        updated_at: now
      },
      {
        id: 'JUK-C',
        section_code: 'C',
        title: 'KETENTUAN KARYA',
        content:
          'Tema bebas, dengan fokus inovasi pembelajaran.\n\nMateri dapat berupa:\n• Metode pembelajaran.\n• Media pembelajaran.\n• Alat peraga.\n• Program inovatif kelas.\n• Strategi pembelajaran lainnya.\n\nWajib menerapkan prinsip Pembelajaran Mendalam (Deep Learning):\n• Joyful Learning (Pembelajaran yang menyenangkan).\n• Meaningful Learning (Pembelajaran yang bermakna).\n• Mindful Learning (Pembelajaran yang berkesadaran).\n\nVideo harus mengikuti alur STAR:\n• S — Situasi (Kondisi latar belakang & permasalahan awal).\n• T — Tantangan (Hambatan nyata yang dihadapi guru/siswa).\n• A — Aksi (Langkah inovatif & strategi nyata yang dilakukan).\n• R — Refleksi / Hasil (Dampak nyata, evaluasi, dan testimoni).\n\nKetentuan Teknis & Dokumen Wajib:\n• Durasi video minimal 5 menit dan maksimal 7 menit.\n• Video wajib memiliki bukti praktik nyata dan testimoni dari pihak yang relevan, yaitu siswa, guru sejawat, atau kepala sekolah.\n• Dokumen wajib di dalam folder Google Drive:\n  1. Video praktik baik.\n  2. Modul Ajar.\n  3. Dokumentasi Media Pembelajaran.\n• Karya wajib orisinal, belum pernah diikutkan lomba sejenis, dan sudah dipraktikkan di sekolah asal.',
        sort_order: 3,
        active: true,
        updated_at: now
      },
      {
        id: 'JUK-D',
        section_code: 'D',
        title: 'MEKANISME PENJURIAN',
        content:
          'Tahap 1 — Seleksi Video:\nDewan juri melakukan penilaian terhadap seluruh karya yang terverifikasi untuk menentukan Top 5 Terbaik.\n\nTahap 2 — Final:\nLima finalis (Top 5) melakukan paparan luring dan mempertanggungjawabkan inovasi pembelajaran di hadapan dewan juri.\n\nUnsur Dewan Juri:\nDewan juri terdiri dari unsur Korwilcam, Pengawas, dan Praktisi Pendidikan.\nKeputusan dewan juri bersifat mutlak dan tidak dapat diganggu gugat.',
        sort_order: 4,
        active: true,
        updated_at: now
      },
      {
        id: 'JUK-E',
        section_code: 'E',
        title: 'WAKTU PELAKSANAAN',
        content:
          '• Deadline Pengumpulan Karya: 21 November 2026, pukul 23.59 WIB.\n• Penjurian Tahap Penyisihan: 23–25 November 2026.\n• Babak Final Top 5: 26–27 November 2026.\n• Pengumuman Pemenang: 28 November 2026.',
        sort_order: 5,
        active: true,
        updated_at: now
      },
      {
        id: 'JUK-F',
        section_code: 'F',
        title: 'TATA CARA PENGUMPULAN',
        content:
          '1. Peserta menyiapkan satu folder Google Drive berisi:\n   • Video Praktik Baik (5–7 menit).\n   • Modul Ajar.\n   • Dokumentasi Media Pembelajaran.\n2. Pengaturan akses folder Google Drive wajib diatur menjadi "Siapa saja yang memiliki tautan dapat melihat" (Anyone with the link can view).\n3. Peserta tidak diwajibkan mengunggah video ke kanal YouTube pribadi.\n4. Panitia dapat mengunggah ulang karya terpilih ke kanal YouTube K3S sebagai arsip dan referensi pendidikan Kecamatan Beji.\n5. Peserta mengirimkan identitas lengkap dan tautan karya melalui formulir pengumpulan resmi pada halaman ini.',
        sort_order: 6,
        active: true,
        updated_at: now
      },
      {
        id: 'JUK-G',
        section_code: 'G',
        title: 'KRITERIA PENILAIAN',
        content:
          '1. Pedagogik dan Inovasi: Bobot 40%.\n2. Dampak / Hasil Nyata: Bobot 35%.\n3. Kualitas Teknis Video: Bobot 25%.\n\nRentang nilai setiap kriteria adalah 0 hingga 100 dengan perhitungan nilai akhir tertimbang otomatis.',
        sort_order: 7,
        active: true,
        updated_at: now
      },
      {
        id: 'JUK-H',
        section_code: 'H',
        title: 'APRESIASI PENGHARGAAN',
        content:
          '• Juara I: Rp1.000.000 + Piagam Penghargaan.\n• Juara II: Rp750.000 + Piagam Penghargaan.\n• Juara III: Rp500.000 + Piagam Penghargaan.\n• Juara Harapan I: Rp300.000 + Piagam Penghargaan.\n• Juara Harapan II: Rp200.000 + Piagam Penghargaan.',
        sort_order: 8,
        active: true,
        updated_at: now
      }
    ],
    JADWAL: [
      {
        id: 'JDW-1',
        activity: 'Deadline Pengumpulan Karya',
        start_datetime: '21 November 2026',
        end_datetime: '23.59 WIB',
        location: 'Portal Digital HGN Beji 2026',
        display_order: 1,
        active: true
      },
      {
        id: 'JDW-2',
        activity: 'Penjurian Penyisihan',
        start_datetime: '23 November 2026',
        end_datetime: '25 November 2026',
        location: 'Sistem Penjurian Digital',
        display_order: 2,
        active: true
      },
      {
        id: 'JDW-3',
        activity: 'Final Top 5 (Paparan Luring)',
        start_datetime: '26 November 2026',
        end_datetime: '27 November 2026',
        location: 'Kecamatan Beji',
        display_order: 3,
        active: true
      },
      {
        id: 'JDW-4',
        activity: 'Pengumuman Pemenang',
        start_datetime: '28 November 2026',
        end_datetime: 'Puncak HGN 2026',
        location: 'FKKKS Kecamatan Beji',
        display_order: 4,
        active: true
      }
    ],
    HADIAH: [
      { id: 'HAD-1', rank: 'Juara I', prize_amount: 1000000, description: 'Rp1.000.000 + Piagam', display_order: 1, active: true },
      { id: 'HAD-2', rank: 'Juara II', prize_amount: 750000, description: 'Rp750.000 + Piagam', display_order: 2, active: true },
      { id: 'HAD-3', rank: 'Juara III', prize_amount: 500000, description: 'Rp500.000 + Piagam', display_order: 3, active: true },
      { id: 'HAD-4', rank: 'Juara Harapan I', prize_amount: 300000, description: 'Rp300.000 + Piagam', display_order: 4, active: true },
      { id: 'HAD-5', rank: 'Juara Harapan II', prize_amount: 200000, description: 'Rp200.000 + Piagam', display_order: 5, active: true }
    ],
    PESERTA: [],
    JURI: [], // Initial Jury Accounts: EMPTY — CREATED BY ADMIN
    KRITERIA_PENILAIAN: [
      {
        criterion_id: 'KRIT-PENY-1',
        stage: 'PENYISIHAN',
        rubric_version: 1,
        criterion_name: 'Pedagogik & Inovasi',
        description: 'Relevansi inovasi terhadap kebutuhan siswa, kreativitas metode/media, penerapan Joyful, Meaningful, dan Mindful Learning, serta kelengkapan Modul Ajar.',
        indicators_json: indPedagogik,
        weight_percentage: 40,
        minimum_score: 0,
        maximum_score: 100,
        display_order: 1,
        active: true,
        created_at: now,
        updated_at: now
      },
      {
        criterion_id: 'KRIT-PENY-2',
        stage: 'PENYISIHAN',
        rubric_version: 1,
        criterion_name: 'Dampak / Hasil Nyata',
        description: 'Kejelasan masalah awal, tantangan, implementasi logis kerangka STAR, bukti aktivitas nyata, dampak positif pembelajaran, kualitas testimoni, dan refleksi.',
        indicators_json: indDampak,
        weight_percentage: 35,
        minimum_score: 0,
        maximum_score: 100,
        display_order: 2,
        active: true,
        created_at: now,
        updated_at: now
      },
      {
        criterion_id: 'KRIT-PENY-3',
        stage: 'PENYISIHAN',
        rubric_version: 1,
        criterion_name: 'Kualitas Teknis Video',
        description: 'Kepatuhan durasi 5–7 menit, kejelasan visual dan audio, struktur penyajian, kreativitas editing, kejelasan narasi, serta kelengkapan bukti pendukung.',
        indicators_json: indVideo,
        weight_percentage: 25,
        minimum_score: 0,
        maximum_score: 100,
        display_order: 3,
        active: true,
        created_at: now,
        updated_at: now
      },
      {
        criterion_id: 'KRIT-FINAL-1',
        stage: 'FINAL',
        rubric_version: 1,
        criterion_name: 'Pedagogik & Inovasi (Paparan Final)',
        description: 'Kedalaman substansi pedagogik, penguasaan konsep Pembelajaran Mendalam, serta keselarasan Modul Ajar dengan praktik nyata (Draft Rubrik Final — dapat disesuaikan Admin).',
        indicators_json: indPedagogik,
        weight_percentage: 40,
        minimum_score: 0,
        maximum_score: 100,
        display_order: 1,
        active: true,
        created_at: now,
        updated_at: now
      },
      {
        criterion_id: 'KRIT-FINAL-2',
        stage: 'FINAL',
        rubric_version: 1,
        criterion_name: 'Dampak Nyata & Pertanggungjawaban Inovasi',
        description: 'Ketajaman analisis alur STAR, bukti dampak berkelanjutan bagi siswa, serta kemampuan menjawab pertanyaan dewan juri saat paparan luring.',
        indicators_json: indDampak,
        weight_percentage: 35,
        minimum_score: 0,
        maximum_score: 100,
        display_order: 2,
        active: true,
        created_at: now,
        updated_at: now
      },
      {
        criterion_id: 'KRIT-FINAL-3',
        stage: 'FINAL',
        rubric_version: 1,
        criterion_name: 'Kualitas Paparan & Demonstrasi Media',
        description: 'Sistematika presentasi luring, kejelasan komunikasi, ketepatan waktu paparan, serta demonstrasi media pembelajaran.',
        indicators_json: indVideo,
        weight_percentage: 25,
        minimum_score: 0,
        maximum_score: 100,
        display_order: 3,
        active: true,
        created_at: now,
        updated_at: now
      }
    ],
    PENUGASAN_JURI: [],
    PENILAIAN: [],
    DETAIL_NILAI: [],
    REKAP_PENILAIAN: [],
    FINALIS_PEMENANG: [],
    PENGUMUMAN: [
      {
        announcement_id: 'ANN-1',
        title: 'Resmi Dibuka: Pengumpulan Karya Lomba Video Guru Inspiratif HGN 2026',
        content:
          'FKKKS Kecamatan Beji mengundang seluruh guru SD se-Kecamatan Beji untuk mengirimkan karya inovasi pembelajaran terbaik. Setiap sekolah wajib mengirimkan minimal 1 (satu) guru perwakilan sebelum batas akhir 21 November 2026 pukul 23.59 WIB.',
        category: 'Informasi Lomba',
        publication_date: '2026-10-31',
        published: true,
        display_order: 1,
        updated_at: now
      },
      {
        announcement_id: 'ANN-2',
        title: 'Panduan Kelengkapan Dokumen Folder Google Drive Peserta',
        content:
          'Pastikan tautan Folder Google Drive yang dikumpulkan telah diatur ke mode "Siapa saja yang memiliki link dapat melihat" dan berisi 3 komponen wajib: (1) Video Praktik Baik berdurasi 5–7 menit dengan alur STAR, (2) Modul Ajar, dan (3) Dokumentasi Media Pembelajaran.',
        category: 'Pengumpulan Karya',
        publication_date: '2026-10-31',
        published: true,
        display_order: 2,
        updated_at: now
      }
    ],
    LOG_AKTIVITAS: [
      {
        log_id: 'LOG-INIT',
        timestamp: now,
        actor_id: 'SYSTEM',
        actor_role: 'ADMIN',
        action: 'SETUP_DATABASE',
        target_type: 'DATABASE',
        target_id: 'HGN 2026 Kec. Beji',
        description: 'Inisialisasi struktur 14 tabel database HGN 2026 Kec. Beji berhasil dijalankan.'
      }
    ]
  };
}

let db: DatabaseSchema = loadDatabase();
let remoteColdStartHydrated = false;

function safeWriteDbFile(data: DatabaseSchema) {
  try {
    if (!IS_SERVERLESS && !fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    try {
      fs.writeFileSync(TMP_DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch {
      // Ignore write errors on strictly read-only environments
    }
  }
}

function loadDatabase(): DatabaseSchema {
  try {
    const candidateFiles = IS_SERVERLESS
      ? [TMP_DB_FILE, BUNDLED_DB_FILE]
      : [BUNDLED_DB_FILE, TMP_DB_FILE];

    for (const fileToRead of candidateFiles) {
      if (fs.existsSync(fileToRead)) {
        const raw = fs.readFileSync(fileToRead, 'utf-8');
        const parsed = JSON.parse(raw);
        const initial = getInitialDatabase();
        const merged: DatabaseSchema = { ...initial, ...parsed };
        if (Array.isArray(merged.PENGATURAN)) {
          merged.PENGATURAN.forEach((s) => {
            if (s.key === 'site_title' && s.value === 'LOMBA VIDEO GURU INSPIRATIF 2026') {
              s.value = 'LOMBA GURU INSPIRATIF 2026';
            }
            if (s.key === 'organizer' && s.value === 'FKKKS KECAMATAN BEJI') {
              s.value = 'FK3S KEC. BEJI';
            }
          });
        }
        const savedUrl = merged.PENGATURAN?.find((s: any) => s.key === 'apps_script_url')?.value;
        if (savedUrl && !dynamicAppsScriptUrl) {
          dynamicAppsScriptUrl = savedUrl;
        }
        safeWriteDbFile(merged);
        return merged;
      }
    }
  } catch (err) {
    console.error('Failed to read local database file, initializing fresh schema:', err);
  }
  const fresh = getInitialDatabase();
  safeWriteDbFile(fresh);
  return fresh;
}

// Auto-hydrate from Google Apps Script on serverless cold start if APPS_SCRIPT_WEB_APP_URL is configured
app.use('/api', async (_req: Request, _res: Response, next: NextFunction) => {
  if (!remoteColdStartHydrated && IS_SERVERLESS && dynamicAppsScriptUrl && dynamicAppsScriptUrl.startsWith('https://script.google.com/')) {
    remoteColdStartHydrated = true;
    try {
      const response = await fetch(dynamicAppsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_secret: dynamicApiSharedSecret,
          action: 'getFullDatabase'
        })
      });
      if (response.ok) {
        const result = await response.json().catch(() => null);
        if (result?.success && result?.data) {
          db = { ...db, ...result.data };
          safeWriteDbFile(db);
        }
      }
    } catch {
      // Continue with local/tmp state if remote hydration fails
    }
  } else {
    remoteColdStartHydrated = true;
  }
  next();
});

async function persistDatabase(actionName = 'syncFullDatabase', actionPayload?: any): Promise<void> {
  const now = nowJakarta();
  const lastUpdatedSetting = db.PENGATURAN.find((s) => s.key === 'last_updated');
  if (lastUpdatedSetting) {
    lastUpdatedSetting.value = now;
    lastUpdatedSetting.updated_at = now;
  } else {
    db.PENGATURAN.push({ key: 'last_updated', value: now, description: 'Waktu pembaruan terakhir', updated_at: now });
  }

  safeWriteDbFile(db);

  if (dynamicAppsScriptUrl && dynamicAppsScriptUrl.startsWith('https://script.google.com/')) {
    try {
      const response = await fetch(dynamicAppsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_secret: dynamicApiSharedSecret,
          action: actionName,
          payload: actionPayload || db
        })
      });
      if (response.ok) {
        const resJson = await response.json().catch(() => null);
        if (resJson && resJson.success) {
          lastGoogleSheetsSyncStatus = {
            connected: true,
            mode: 'GOOGLE_SHEETS_ACTIVE',
            lastSync: now,
            message: 'Tersinkronisasi langsung dengan Google Sheets (HGN 2026 Kec. Beji)'
          };
          return;
        }
      }
      lastGoogleSheetsSyncStatus = {
        connected: false,
        mode: 'LOCAL_PERSISTENT_WITH_RETRY',
        lastSync: now,
        message: 'Data tersimpan aman di server. Respons Apps Script memerlukan verifikasi izin deployment.'
      };
    } catch (err: any) {
      lastGoogleSheetsSyncStatus = {
        connected: false,
        mode: 'LOCAL_PERSISTENT_WITH_RETRY',
        lastSync: now,
        message: `Data tersimpan aman di server. Gagal menghubungi URL Apps Script: ${err?.message || 'Network error'}`
      };
    }
  } else {
    lastGoogleSheetsSyncStatus = {
      connected: true,
      mode: 'SERVER_PERSISTENT_ENGINE',
      lastSync: now,
      message: 'Database Server Aktif (Siap dihubungkan ke URL Web App Google Apps Script HGN 2026 Kec. Beji kapan saja)'
    };
  }
}

function recordActivity(
  actor_id: string,
  actor_role: 'ADMIN' | 'JURI' | 'PUBLIC',
  action: string,
  target_type: string,
  target_id: string,
  description: string
) {
  db.LOG_AKTIVITAS.unshift({
    log_id: `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    timestamp: nowJakarta(),
    actor_id,
    actor_role,
    action,
    target_type,
    target_id,
    description
  });
  if (db.LOG_AKTIVITAS.length > 500) {
    db.LOG_AKTIVITAS = db.LOG_AKTIVITAS.slice(0, 500);
  }
}

function getSettingsMap(): Record<string, string> {
  const map: Record<string, string> = {};
  db.PENGATURAN.forEach((s) => {
    map[s.key] = s.value;
  });
  return map;
}

// ============================================================================
// AUTOMATIC SCORE RECAP & RANKING CALCULATION (Section 16 Rules)
// ============================================================================
function recalculateRecapForStage(stage: 'PENYISIHAN' | 'FINAL') {
  const now = nowJakarta();
  const existingExceptions = new Map<string, boolean>();
  db.REKAP_PENILAIAN.filter((r) => r.stage === stage).forEach((r) => {
    if (r.admin_exception) existingExceptions.set(r.participant_id, true);
  });

  const activeAssignments = db.PENUGASAN_JURI.filter(
    (a) => a.stage === stage && a.assignment_status === 'ACTIVE'
  );
  const stageEvaluations = db.PENILAIAN.filter((e) => e.stage === stage);

  // Determine eligible participants for this stage
  const eligibleParticipants = db.PESERTA.filter((p) => {
    if (p.verification_status === 'DIKECUALIKAN') return false;
    if (stage === 'FINAL') {
      const isTop5 = db.FINALIS_PEMENANG.some(
        (f) => f.participant_id === p.participant_id && f.selection_type === 'TOP_5'
      );
      return isTop5;
    }
    return p.verification_status === 'TERVERIFIKASI' || activeAssignments.some((a) => a.participant_id === p.participant_id);
  });

  const stageRecaps: DatabaseSchema['REKAP_PENILAIAN'] = eligibleParticipants.map((p) => {
    const pAssignments = activeAssignments.filter((a) => a.participant_id === p.participant_id);
    const requiredJurors = pAssignments.length;
    // Only count FINAL evaluations that belong to active assignments (or valid jurors)
    const finalizedEvals = stageEvaluations.filter(
      (e) =>
        e.participant_id === p.participant_id &&
        e.evaluation_status === 'FINAL' &&
        (pAssignments.some((a) => a.jury_id === e.jury_id) || requiredJurors === 0)
    );

    const finalizedJurors = finalizedEvals.length;
    const hasException = existingExceptions.get(p.participant_id) || false;
    const evaluationComplete =
      (requiredJurors > 0 && finalizedJurors >= requiredJurors) ||
      (hasException && finalizedJurors > 0);

    let averageScore: number | null = null;
    if (finalizedJurors > 0) {
      const sum = finalizedEvals.reduce((acc, ev) => acc + Number(ev.weighted_total), 0);
      averageScore = sum / finalizedJurors; // Keep full precision before ranking
    }

    return {
      participant_id: p.participant_id,
      stage,
      required_jurors: requiredJurors,
      finalized_jurors: finalizedJurors,
      average_score: averageScore,
      evaluation_complete: evaluationComplete,
      rank: null,
      is_tied: false,
      admin_exception: hasException,
      last_calculated: now
    };
  });

  // Sort ONLY complete evaluations from highest to lowest without premature rounding
  const completeItems = stageRecaps.filter(
    (r) => r.evaluation_complete && r.average_score !== null
  );
  completeItems.sort((a, b) => (b.average_score as number) - (a.average_score as number));

  // Detect ties and assign ranks
  for (let i = 0; i < completeItems.length; i++) {
    const current = completeItems[i];
    const prev = i > 0 ? completeItems[i - 1] : null;
    const next = i < completeItems.length - 1 ? completeItems[i + 1] : null;

    const sameAsPrev =
      prev && Math.abs((prev.average_score as number) - (current.average_score as number)) < 1e-6;
    const sameAsNext =
      next && Math.abs((next.average_score as number) - (current.average_score as number)) < 1e-6;

    if (sameAsPrev || sameAsNext) {
      current.is_tied = true;
    }
    current.rank = sameAsPrev && prev?.rank ? prev.rank : i + 1;
  }

  db.REKAP_PENILAIAN = [
    ...db.REKAP_PENILAIAN.filter((r) => r.stage !== stage),
    ...stageRecaps
  ];
}

// ============================================================================
// 1. PUBLIC API ENDPOINTS
// ============================================================================
app.get('/api/public', (_req: Request, res: Response) => {
  const settings = getSettingsMap();
  // Do not expose internal apps_script_url in public settings
  const publicSettings = { ...settings };
  delete publicSettings.apps_script_url;

  const juknis = [...db.JUKNIS]
    .filter((j) => j.active)
    .sort((a, b) => a.sort_order - b.sort_order);

  const jadwal = [...db.JADWAL]
    .filter((j) => j.active)
    .sort((a, b) => a.display_order - b.display_order);

  const hadiah = [...db.HADIAH]
    .filter((h) => h.active)
    .sort((a, b) => a.display_order - b.display_order);

  const pengumuman = [...db.PENGUMUMAN]
    .filter((a) => a.published)
    .sort((a, b) => a.display_order - b.display_order);

  const top5Published = settings.preliminary_results_published === 'true';
  const winnersPublished = settings.final_results_published === 'true';

  const top5 = top5Published
    ? db.FINALIS_PEMENANG.filter((f) => f.selection_type === 'TOP_5' && f.published).map((f) => {
        const p = db.PESERTA.find((item) => item.participant_id === f.participant_id);
        return {
          ...f,
          full_name: p?.full_name || '-',
          school: p?.school || '-',
          innovation_title: p?.innovation_title || '-'
        };
      })
    : [];

  const winners = winnersPublished
    ? db.FINALIS_PEMENANG.filter((f) => f.selection_type === 'WINNER' && f.published).map((f) => {
        const p = db.PESERTA.find((item) => item.participant_id === f.participant_id);
        return {
          ...f,
          full_name: p?.full_name || '-',
          school: p?.school || '-',
          innovation_title: p?.innovation_title || '-'
        };
      })
    : [];

  const uniqueSchools = new Set(db.PESERTA.map((p) => p.school.trim().toUpperCase()).filter(Boolean));

  res.json({
    success: true,
    data: {
      settings: publicSettings,
      juknis,
      jadwal,
      hadiah,
      pengumuman,
      top5,
      winners,
      stats: {
        total_participants: db.PESERTA.length,
        total_schools: uniqueSchools.size
      },
      last_sync: lastGoogleSheetsSyncStatus.lastSync
    }
  });
});

app.post('/api/submissions', async (req: Request, res: Response) => {
  try {
    const settings = getSettingsMap();
    if (settings.submission_enabled !== 'true') {
      return res.status(400).json({
        success: false,
        message: 'Pendaftaran dan Pengumpulan Karya Telah Ditutup.',
        error_code: 'SUBMISSION_CLOSED'
      });
    }

    const deadlineTime = new Date(settings.submission_deadline || '2026-11-21T23:59:00+07:00').getTime();
    if (!Number.isNaN(deadlineTime) && Date.now() > deadlineTime) {
      return res.status(400).json({
        success: false,
        message: 'Batas waktu pengumpulan karya telah berakhir (21 November 2026, 23:59 WIB).',
        error_code: 'DEADLINE_PASSED'
      });
    }

    const {
      full_name,
      school,
      innovation_title,
      drive_folder_url,
      video_url = '',
      lesson_module_url = '',
      learning_media_url = '',
      whatsapp = '',
      consent
    } = req.body || {};

    if (!full_name?.trim() || !school?.trim() || !innovation_title?.trim() || !drive_folder_url?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nama Lengkap, Asal Sekolah, Judul Inovasi, dan Link Folder Google Drive wajib diisi.',
        error_code: 'VALIDATION_ERROR'
      });
    }

    if (!consent) {
      return res.status(400).json({
        success: false,
        message: 'Anda wajib menyetujui aturan lomba dan ketentuan pengolahan data.',
        error_code: 'CONSENT_REQUIRED'
      });
    }

    const cleanFolderUrl = String(drive_folder_url).trim();
    if (!/^https?:\/\//i.test(cleanFolderUrl)) {
      return res.status(400).json({
        success: false,
        message: 'Tautan Folder Google Drive harus diawali dengan https:// atau http://.',
        error_code: 'INVALID_URL'
      });
    }

    // Prevent accidental duplicate folder submissions
    const duplicate = db.PESERTA.find(
      (p) => p.drive_folder_url.trim().toLowerCase() === cleanFolderUrl.toLowerCase()
    );
    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: `Tautan Folder Google Drive tersebut sudah pernah terdaftar atas nama ${duplicate.full_name} (${duplicate.school}).`,
        error_code: 'DUPLICATE_SUBMISSION'
      });
    }

    const nextNum = db.PESERTA.length + 1;
    const participant_id = `HGN26-${String(nextNum).padStart(3, '0')}`;
    const newParticipant: DatabaseSchema['PESERTA'][0] = {
      participant_id,
      submitted_at: nowJakarta(),
      full_name: String(full_name).trim(),
      school: String(school).trim(),
      innovation_title: String(innovation_title).trim(),
      drive_folder_url: cleanFolderUrl,
      video_url: String(video_url || '').trim(),
      lesson_module_url: String(lesson_module_url || '').trim(),
      learning_media_url: String(learning_media_url || '').trim(),
      whatsapp: String(whatsapp || '').trim(),
      verification_status: 'MENUNGGU',
      admin_notes: '',
      consent: Boolean(consent)
    };

    db.PESERTA.push(newParticipant);
    recordActivity(
      participant_id,
      'PUBLIC',
      'SUBMIT_WORK',
      'PESERTA',
      participant_id,
      `Peserta baru mengumpulkan karya: ${newParticipant.full_name} (${newParticipant.school})`
    );
    await persistDatabase('addParticipant', newParticipant);

    res.json({
      success: true,
      data: {
        participant_id: newParticipant.participant_id,
        submitted_at: newParticipant.submitted_at,
        full_name: newParticipant.full_name,
        school: newParticipant.school,
        innovation_title: newParticipant.innovation_title
      },
      message: 'Karya berhasil dikumpulkan dan tersimpan ke dalam database.'
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'Gagal menyimpan pengumpulan karya: ' + (err?.message || 'Internal error'),
      error_code: 'SERVER_ERROR'
    });
  }
});

// ============================================================================
// 2. ADMIN AUTHENTICATION & MANAGEMENT ENDPOINTS
// ============================================================================
app.post('/api/admin/login', (req: Request, res: Response) => {
  const ip = req.ip || 'local';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({
      success: false,
      message: 'Terlalu banyak percobaan login. Silakan tunggu 1 menit.',
      error_code: 'RATE_LIMITED'
    });
  }

  const { username, password } = req.body || {};
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    createSessionCookie(res, 'hgn_admin_session', 'ADMIN', 'ADMIN-01', ADMIN_USERNAME, 'Administrator HGN Beji 2026');
    recordActivity('ADMIN-01', 'ADMIN', 'ADMIN_LOGIN', 'SESSION', 'ADMIN-01', 'Administrator berhasil masuk ke dashboard.');
    persistDatabase('recordActivity').catch(() => {});
    return res.json({
      success: true,
      data: { username: ADMIN_USERNAME, role: 'ADMIN', fullName: 'Administrator HGN Beji 2026' },
      message: 'Login Administrator berhasil.'
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Username atau password Administrator tidak sesuai.',
    error_code: 'INVALID_CREDENTIALS'
  });
});

app.post('/api/admin/logout', (req: Request, res: Response) => {
  clearSessionCookie(req, res, 'hgn_admin_session');
  res.json({ success: true, message: 'Logout Administrator berhasil.' });
});

app.get('/api/admin/session', (req: Request, res: Response) => {
  const session = getSession(req, 'ADMIN');
  if (!session) {
    return res.json({ success: true, data: { authenticated: false } });
  }
  return res.json({
    success: true,
    data: {
      authenticated: true,
      role: 'ADMIN',
      username: session.username,
      fullName: session.fullName
    }
  });
});

app.get('/api/admin/summary', requireAdmin, (_req: Request, res: Response) => {
  recalculateRecapForStage('PENYISIHAN');
  recalculateRecapForStage('FINAL');

  const settings = getSettingsMap();
  const activeStage = (settings.active_judging_stage as 'PENYISIHAN' | 'FINAL') || 'PENYISIHAN';
  const uniqueSchools = new Set(db.PESERTA.map((p) => p.school.trim().toUpperCase()).filter(Boolean));
  const activeJurors = db.JURI.filter((j) => j.account_status === 'AKTIF');

  const activeAssignments = db.PENUGASAN_JURI.filter(
    (a) => a.stage === activeStage && a.assignment_status === 'ACTIVE'
  );
  const finalizedEvals = db.PENILAIAN.filter(
    (e) => e.stage === activeStage && e.evaluation_status === 'FINAL'
  );

  // Count works evaluated vs not evaluated
  const evaluatedParticipantIds = new Set(finalizedEvals.map((e) => e.participant_id));
  const verifiedParticipants = db.PESERTA.filter((p) => p.verification_status === 'TERVERIFIKASI');
  const totalEvaluatedWorks = verifiedParticipants.filter((p) => evaluatedParticipantIds.has(p.participant_id)).length;
  const totalUnevaluatedWorks = Math.max(0, verifiedParticipants.length - totalEvaluatedWorks);

  const completionPercentage =
    activeAssignments.length > 0
      ? Math.round((finalizedEvals.length / activeAssignments.length) * 100)
      : 0;

  const top5Count = db.FINALIS_PEMENANG.filter((f) => f.selection_type === 'TOP_5').length;

  res.json({
    success: true,
    data: {
      total_participants: db.PESERTA.length,
      verified_participants: verifiedParticipants.length,
      total_schools: uniqueSchools.size,
      total_active_jury: activeJurors.length,
      total_jury: db.JURI.length,
      total_evaluated_works: totalEvaluatedWorks,
      total_unevaluated_works: totalUnevaluatedWorks,
      total_assignments: activeAssignments.length,
      total_finalized_evaluations: finalizedEvals.length,
      completion_percentage: completionPercentage,
      top5_count: top5Count,
      submission_enabled: settings.submission_enabled === 'true',
      active_judging_stage: activeStage,
      db_status: lastGoogleSheetsSyncStatus,
      settings: getSettingsMap(),
      juknis: db.JUKNIS,
      jadwal: db.JADWAL,
      hadiah: db.HADIAH,
      participants: db.PESERTA,
      jury: db.JURI.map(({ password_verifier, password_salt, ...rest }) => rest),
      criteria: db.KRITERIA_PENILAIAN,
      assignments: db.PENUGASAN_JURI,
      evaluations: db.PENILAIAN,
      details: db.DETAIL_NILAI,
      recap: db.REKAP_PENILAIAN,
      finalis_pemenang: db.FINALIS_PEMENANG,
      announcements: db.PENGUMUMAN,
      logs: db.LOG_AKTIVITAS.slice(0, 100)
    }
  });
});

// Save Settings, Appearance, Schedule, or Prizes
app.post('/api/admin/settings', requireAdmin, async (req: Request, res: Response) => {
  const { settings, jadwal, hadiah } = req.body || {};
  const now = nowJakarta();

  if (settings && typeof settings === 'object') {
    Object.entries(settings).forEach(([key, val]) => {
      const strVal = String(val ?? '');
      if (key === 'apps_script_url') {
        dynamicAppsScriptUrl = strVal.trim();
      }
      if (key === 'api_shared_secret' && strVal.trim()) {
        dynamicApiSharedSecret = strVal.trim();
        return;
      }
      const existing = db.PENGATURAN.find((s) => s.key === key);
      if (existing) {
        existing.value = strVal;
        existing.updated_at = now;
      } else {
        db.PENGATURAN.push({ key, value: strVal, description: key, updated_at: now });
      }
    });
  }

  if (Array.isArray(jadwal)) {
    db.JADWAL = jadwal.map((item, idx) => ({
      id: item.id || `JDW-${idx + 1}`,
      activity: String(item.activity || '').trim(),
      start_datetime: String(item.start_datetime || '').trim(),
      end_datetime: String(item.end_datetime || '').trim(),
      location: String(item.location || '').trim(),
      display_order: Number(item.display_order || idx + 1),
      active: Boolean(item.active !== false)
    }));
  }

  if (Array.isArray(hadiah)) {
    db.HADIAH = hadiah.map((item, idx) => ({
      id: item.id || `HAD-${idx + 1}`,
      rank: String(item.rank || '').trim(),
      prize_amount: Number(item.prize_amount || 0),
      description: String(item.description || '').trim(),
      display_order: Number(item.display_order || idx + 1),
      active: Boolean(item.active !== false)
    }));
  }

  recordActivity('ADMIN-01', 'ADMIN', 'UPDATE_SETTINGS', 'PENGATURAN', 'GLOBAL', 'Administrator memperbarui pengaturan tampilan/jadwal/hadiah.');
  await persistDatabase('syncFullDatabase');

  res.json({
    success: true,
    data: {
      settings: getSettingsMap(),
      jadwal: db.JADWAL,
      hadiah: db.HADIAH,
      db_status: lastGoogleSheetsSyncStatus
    },
    message: 'Pengaturan berhasil disimpan ke database.'
  });
});

// Juknis Management
app.post('/api/admin/juknis', requireAdmin, async (req: Request, res: Response) => {
  const { juknis } = req.body || {};
  if (!Array.isArray(juknis)) {
    return res.status(400).json({ success: false, message: 'Format data Juknis tidak valid.' });
  }
  const now = nowJakarta();
  db.JUKNIS = juknis.map((item, idx) => ({
    id: item.id || `JUK-${item.section_code || idx + 1}`,
    section_code: String(item.section_code || String.fromCharCode(65 + idx)),
    title: String(item.title || '').trim(),
    content: String(item.content || ''),
    sort_order: Number(item.sort_order || idx + 1),
    active: Boolean(item.active !== false),
    updated_at: now
  }));

  recordActivity('ADMIN-01', 'ADMIN', 'UPDATE_JUKNIS', 'JUKNIS', 'ALL', 'Administrator memperbarui dokumen Petunjuk Teknis (Juknis).');
  await persistDatabase('saveJuknis', { juknis: db.JUKNIS });

  res.json({
    success: true,
    data: db.JUKNIS,
    message: 'Petunjuk Teknis (Juknis) berhasil disimpan.'
  });
});

// Participants Management
app.get('/api/admin/participants', requireAdmin, (_req: Request, res: Response) => {
  res.json({ success: true, data: db.PESERTA });
});

app.post('/api/admin/participants', requireAdmin, async (req: Request, res: Response) => {
  const { action, participant, participant_id, reason } = req.body || {};
  const now = nowJakarta();

  if (action === 'DELETE') {
    const hasEvals = db.PENILAIAN.some((e) => e.participant_id === participant_id && e.evaluation_status === 'FINAL');
    if (hasEvals) {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat menghapus peserta yang sudah memiliki nilai final juri. Gunakan status Dikecualikan untuk menjaga integritas audit.',
        error_code: 'REFERENTIAL_INTEGRITY'
      });
    }
    const target = db.PESERTA.find((p) => p.participant_id === participant_id);
    if (!target) {
      return res.status(404).json({ success: false, message: 'Peserta tidak ditemukan.' });
    }
    db.PESERTA = db.PESERTA.filter((p) => p.participant_id !== participant_id);
    db.PENUGASAN_JURI = db.PENUGASAN_JURI.filter((a) => a.participant_id !== participant_id);
    db.PENILAIAN = db.PENILAIAN.filter((e) => e.participant_id !== participant_id);
    recalculateRecapForStage('PENYISIHAN');
    recalculateRecapForStage('FINAL');
    recordActivity('ADMIN-01', 'ADMIN', 'DELETE_PARTICIPANT', 'PESERTA', participant_id, `Menghapus data peserta ${target.full_name} (${target.school}). Alasan: ${reason || 'Data tidak valid'}`);
    await persistDatabase('syncFullDatabase');
    return res.json({ success: true, data: db.PESERTA, message: 'Data peserta berhasil dihapus.' });
  }

  if (!participant || !participant.full_name || !participant.school || !participant.innovation_title) {
    return res.status(400).json({ success: false, message: 'Nama Guru, Asal Sekolah, dan Judul Inovasi wajib diisi.' });
  }

  if (participant.participant_id) {
    const idx = db.PESERTA.findIndex((p) => p.participant_id === participant.participant_id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Peserta tidak ditemukan.' });
    }
    db.PESERTA[idx] = {
      ...db.PESERTA[idx],
      full_name: String(participant.full_name).trim(),
      school: String(participant.school).trim(),
      innovation_title: String(participant.innovation_title).trim(),
      drive_folder_url: String(participant.drive_folder_url || '').trim(),
      video_url: String(participant.video_url || '').trim(),
      lesson_module_url: String(participant.lesson_module_url || '').trim(),
      learning_media_url: String(participant.learning_media_url || '').trim(),
      whatsapp: String(participant.whatsapp || '').trim(),
      verification_status: participant.verification_status || db.PESERTA[idx].verification_status,
      admin_notes: String(participant.admin_notes ?? db.PESERTA[idx].admin_notes)
    };
    recalculateRecapForStage('PENYISIHAN');
    recalculateRecapForStage('FINAL');
    recordActivity(
      'ADMIN-01',
      'ADMIN',
      'UPDATE_PARTICIPANT',
      'PESERTA',
      participant.participant_id,
      `Memperbarui data/status peserta ${db.PESERTA[idx].full_name} menjadi ${db.PESERTA[idx].verification_status}.`
    );
    await persistDatabase('updateParticipant', db.PESERTA[idx]);
    return res.json({ success: true, data: db.PESERTA, message: 'Data peserta berhasil diperbarui.' });
  } else {
    const nextNum = db.PESERTA.length + 1;
    const newId = `HGN26-${String(nextNum).padStart(3, '0')}`;
    const created: DatabaseSchema['PESERTA'][0] = {
      participant_id: newId,
      submitted_at: now,
      full_name: String(participant.full_name).trim(),
      school: String(participant.school).trim(),
      innovation_title: String(participant.innovation_title).trim(),
      drive_folder_url: String(participant.drive_folder_url || '').trim(),
      video_url: String(participant.video_url || '').trim(),
      lesson_module_url: String(participant.lesson_module_url || '').trim(),
      learning_media_url: String(participant.learning_media_url || '').trim(),
      whatsapp: String(participant.whatsapp || '').trim(),
      verification_status: participant.verification_status || 'TERVERIFIKASI',
      admin_notes: String(participant.admin_notes || '').trim(),
      consent: true
    };
    db.PESERTA.push(created);
    recalculateRecapForStage('PENYISIHAN');
    recordActivity('ADMIN-01', 'ADMIN', 'ADD_PARTICIPANT', 'PESERTA', newId, `Menambahkan peserta baru: ${created.full_name} (${created.school})`);
    await persistDatabase('addParticipant', created);
    return res.json({ success: true, data: db.PESERTA, message: 'Peserta baru berhasil ditambahkan.' });
  }
});

// Jury Management (Section 7)
app.get('/api/admin/jury', requireAdmin, (_req: Request, res: Response) => {
  const sanitized = db.JURI.map(({ password_verifier, password_salt, ...rest }) => rest);
  res.json({ success: true, data: sanitized });
});

app.post('/api/admin/jury', requireAdmin, async (req: Request, res: Response) => {
  const {
    action,
    jury_id,
    full_name,
    identity_number = '',
    jury_category = 'Pengawas',
    institution = '',
    whatsapp = '',
    username,
    initial_password,
    account_status = 'AKTIF',
    assigned_stages = 'PENYISIHAN',
    admin_notes = '',
    must_change_password
  } = req.body || {};

  const now = nowJakarta();

  if (action === 'RESET_PASSWORD') {
    const target = db.JURI.find((j) => j.jury_id === jury_id);
    if (!target) {
      return res.status(404).json({ success: false, message: 'Akun Juri tidak ditemukan.' });
    }
    const newPass = String(initial_password || '').trim();
    if (newPass.length < 4) {
      return res.status(400).json({ success: false, message: 'Password baru minimal 4 karakter.' });
    }
    const { salt, verifier } = hashPassword(newPass);
    target.password_salt = salt;
    target.password_verifier = verifier;
    target.must_change_password = must_change_password !== false;
    target.updated_at = now;

    recordActivity('ADMIN-01', 'ADMIN', 'RESET_JURY_PASSWORD', 'JURI', target.jury_id, `Reset password untuk akun juri ${target.full_name} (@${target.username}).`);
    await persistDatabase('updateJuryAccount', target);

    return res.json({
      success: true,
      data: db.JURI.map(({ password_verifier, password_salt, ...rest }) => rest),
      message: `Password untuk juri ${target.full_name} berhasil direset.`
    });
  }

  if (jury_id) {
    // Update existing Jury
    const target = db.JURI.find((j) => j.jury_id === jury_id);
    if (!target) {
      return res.status(404).json({ success: false, message: 'Akun Juri tidak ditemukan.' });
    }
    const cleanUser = String(username || target.username).trim().toLowerCase();
    const conflict = db.JURI.find((j) => j.jury_id !== jury_id && j.username.toLowerCase() === cleanUser);
    if (conflict) {
      return res.status(409).json({ success: false, message: 'Username tersebut sudah digunakan oleh juri lain.' });
    }

    target.full_name = String(full_name || target.full_name).trim();
    target.identity_number = String(identity_number ?? target.identity_number).trim();
    target.jury_category = jury_category || target.jury_category;
    target.institution = String(institution ?? target.institution).trim();
    target.whatsapp = String(whatsapp ?? target.whatsapp).trim();
    target.username = cleanUser;
    target.account_status = account_status || target.account_status;
    target.assigned_stages = assigned_stages || target.assigned_stages;
    target.admin_notes = String(admin_notes ?? target.admin_notes).trim();
    target.updated_at = now;

    recordActivity('ADMIN-01', 'ADMIN', 'UPDATE_JURY', 'JURI', target.jury_id, `Memperbarui profil/status juri: ${target.full_name} (${target.account_status}).`);
    await persistDatabase('updateJuryAccount', target);

    return res.json({
      success: true,
      data: db.JURI.map(({ password_verifier, password_salt, ...rest }) => rest),
      message: 'Data akun juri berhasil diperbarui.'
    });
  }

  // Create new Jury Account
  if (!full_name?.trim() || !username?.trim() || !initial_password?.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Nama Lengkap Juri, Username Login, dan Password Awal wajib diisi.'
    });
  }

  const cleanUsername = String(username).trim().toLowerCase();
  if (db.JURI.some((j) => j.username.toLowerCase() === cleanUsername)) {
    return res.status(409).json({
      success: false,
      message: `Username "${cleanUsername}" sudah digunakan. Gunakan username unik lainnya.`
    });
  }

  const { salt, verifier } = hashPassword(String(initial_password).trim());
  const nextIdx = db.JURI.length + 1;
  const newJury: DatabaseSchema['JURI'][0] = {
    jury_id: `JURI-${String(nextIdx).padStart(2, '0')}-${Date.now().toString().slice(-3)}`,
    full_name: String(full_name).trim(),
    identity_number: String(identity_number || '').trim(),
    jury_category,
    institution: String(institution || '').trim(),
    whatsapp: String(whatsapp || '').trim(),
    username: cleanUsername,
    password_verifier: verifier,
    password_salt: salt,
    must_change_password: must_change_password !== false,
    account_status: account_status === 'NONAKTIF' ? 'NONAKTIF' : 'AKTIF',
    assigned_stages: assigned_stages || 'PENYISIHAN',
    admin_notes: String(admin_notes || '').trim(),
    created_at: now,
    updated_at: now
  };

  db.JURI.push(newJury);
  recordActivity('ADMIN-01', 'ADMIN', 'CREATE_JURY', 'JURI', newJury.jury_id, `Membuat akun juri baru: ${newJury.full_name} (@${newJury.username}) - Unsur ${newJury.jury_category}`);
  await persistDatabase('createJuryAccount', newJury);

  res.json({
    success: true,
    data: db.JURI.map(({ password_verifier, password_salt, ...rest }) => rest),
    message: `Akun Juri ${newJury.full_name} berhasil dibuat.`
  });
});

// Jury Assignments (Section 14)
app.post('/api/admin/jury-assignments', requireAdmin, async (req: Request, res: Response) => {
  const { action, jury_id, stage = 'PENYISIHAN', participant_ids = [], assignment_id, conflict_notes } = req.body || {};
  const now = nowJakarta();

  if (action === 'REMOVE') {
    const target = db.PENUGASAN_JURI.find((a) => a.assignment_id === assignment_id);
    if (!target) {
      return res.status(404).json({ success: false, message: 'Penugasan tidak ditemukan.' });
    }
    const hasFinalScore = db.PENILAIAN.some(
      (e) =>
        e.jury_id === target.jury_id &&
        e.participant_id === target.participant_id &&
        e.stage === target.stage &&
        e.evaluation_status === 'FINAL'
    );
    if (hasFinalScore) {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat menghapus penugasan yang sudah memiliki nilai FINAL. Buka kembali (reopen) penilaian terlebih dahulu jika diperlukan.',
        error_code: 'HAS_FINALIZED_SCORE'
      });
    }
    db.PENUGASAN_JURI = db.PENUGASAN_JURI.filter((a) => a.assignment_id !== assignment_id);
    recalculateRecapForStage(target.stage);
    recordActivity('ADMIN-01', 'ADMIN', 'REMOVE_ASSIGNMENT', 'PENUGASAN_JURI', assignment_id, `Menghapus penugasan juri ${target.jury_id} untuk peserta ${target.participant_id} (${target.stage}).`);
    await persistDatabase('saveJuryAssignment', { assignments: db.PENUGASAN_JURI });
    return res.json({ success: true, data: db.PENUGASAN_JURI, message: 'Penugasan juri berhasil dihapus.' });
  }

  if (action === 'RESOLVE_CONFLICT') {
    const target = db.PENUGASAN_JURI.find((a) => a.assignment_id === assignment_id);
    if (!target) {
      return res.status(404).json({ success: false, message: 'Penugasan tidak ditemukan.' });
    }
    target.assignment_status = 'REMOVED';
    target.conflict_notes = `${target.conflict_notes || ''} | Diselesaikan Admin: ${conflict_notes || 'Dialihkan'}`;
    recalculateRecapForStage(target.stage);
    recordActivity('ADMIN-01', 'ADMIN', 'RESOLVE_CONFLICT', 'PENUGASAN_JURI', assignment_id, `Menonaktifkan penugasan karena konflik kepentingan: ${target.participant_id}`);
    await persistDatabase('saveJuryAssignment', { assignments: db.PENUGASAN_JURI });
    return res.json({ success: true, data: db.PENUGASAN_JURI, message: 'Konflik kepentingan berhasil ditindaklanjuti.' });
  }

  const jury = db.JURI.find((j) => j.jury_id === jury_id);
  if (!jury) {
    return res.status(404).json({ success: false, message: 'Juri tidak ditemukan.' });
  }

  let targetIds: string[] = [];
  if (action === 'ASSIGN_ALL_ELIGIBLE') {
    if (stage === 'FINAL') {
      targetIds = db.FINALIS_PEMENANG.filter((f) => f.selection_type === 'TOP_5').map((f) => f.participant_id);
    } else {
      targetIds = db.PESERTA.filter((p) => p.verification_status === 'TERVERIFIKASI').map((p) => p.participant_id);
    }
  } else if (Array.isArray(participant_ids)) {
    targetIds = participant_ids;
  }

  let addedCount = 0;
  targetIds.forEach((pid) => {
    const exists = db.PENUGASAN_JURI.find(
      (a) => a.jury_id === jury_id && a.participant_id === pid && a.stage === stage && a.assignment_status === 'ACTIVE'
    );
    if (!exists) {
      db.PENUGASAN_JURI.push({
        assignment_id: `ASG-${stage.slice(0, 3)}-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        jury_id,
        participant_id: pid,
        stage,
        assignment_status: 'ACTIVE',
        assigned_at: now,
        assigned_by: 'ADMIN-01',
        conflict_flag: false,
        conflict_notes: ''
      });
      addedCount++;
    }
  });

  recalculateRecapForStage(stage);
  recordActivity('ADMIN-01', 'ADMIN', 'ASSIGN_JURY', 'PENUGASAN_JURI', jury_id, `Menugaskan ${addedCount} karya tahap ${stage} kepada juri ${jury.full_name}.`);
  await persistDatabase('saveJuryAssignment', { assignments: db.PENUGASAN_JURI });

  res.json({
    success: true,
    data: db.PENUGASAN_JURI,
    message: `${addedCount} penugasan baru berhasil ditambahkan untuk ${jury.full_name}.`
  });
});

// Scoring Criteria Management (Section 13)
app.get('/api/admin/criteria', requireAdmin, (_req: Request, res: Response) => {
  res.json({ success: true, data: db.KRITERIA_PENILAIAN });
});

app.post('/api/admin/criteria', requireAdmin, async (req: Request, res: Response) => {
  const { stage, criteria } = req.body || {};
  if (!stage || !Array.isArray(criteria)) {
    return res.status(400).json({ success: false, message: 'Tahap dan daftar kriteria wajib disertakan.' });
  }

  // Validate active weights sum to 100%
  const activeCriteria = criteria.filter((c) => c.active !== false);
  const totalWeight = activeCriteria.reduce((acc, c) => acc + Number(c.weight_percentage || 0), 0);
  if (Math.abs(totalWeight - 100) > 0.01) {
    return res.status(400).json({
      success: false,
      message: `Total bobot kriteria aktif pada tahap ${stage} harus berjumlah tepat 100% (saat ini: ${totalWeight}%).`,
      error_code: 'INVALID_WEIGHT_SUM'
    });
  }

  // Check if finalized evaluations already exist for this stage
  const hasFinalizedOnStage = db.PENILAIAN.some(
    (e) => e.stage === stage && e.evaluation_status === 'FINAL'
  );
  const currentMaxVersion = db.KRITERIA_PENILAIAN.filter((c) => c.stage === stage).reduce(
    (max, c) => Math.max(max, Number(c.rubric_version || 1)),
    1
  );
  const nextVersion = hasFinalizedOnStage ? currentMaxVersion + 1 : currentMaxVersion;
  const now = nowJakarta();

  const updatedStageCriteria: DatabaseSchema['KRITERIA_PENILAIAN'] = criteria.map((c, idx) => ({
    criterion_id: c.criterion_id || `KRIT-${stage.slice(0, 4)}-V${nextVersion}-${idx + 1}`,
    stage,
    rubric_version: nextVersion,
    criterion_name: String(c.criterion_name || '').trim(),
    description: String(c.description || '').trim(),
    indicators_json: typeof c.indicators_json === 'string' ? c.indicators_json : JSON.stringify(c.indicators || []),
    weight_percentage: Number(c.weight_percentage || 0),
    minimum_score: 0,
    maximum_score: 100,
    display_order: Number(c.display_order || idx + 1),
    active: Boolean(c.active !== false),
    created_at: c.created_at || now,
    updated_at: now
  }));

  db.KRITERIA_PENILAIAN = [
    ...db.KRITERIA_PENILAIAN.filter((c) => c.stage !== stage),
    ...updatedStageCriteria
  ];

  recordActivity(
    'ADMIN-01',
    'ADMIN',
    'UPDATE_CRITERIA',
    'KRITERIA_PENILAIAN',
    stage,
    `Memperbarui rubrik kriteria penilaian tahap ${stage} (Versi Rubrik v${nextVersion}).`
  );
  await persistDatabase('saveScoringCriteria', { criteria: db.KRITERIA_PENILAIAN });

  res.json({
    success: true,
    data: db.KRITERIA_PENILAIAN,
    message: `Kriteria penilaian tahap ${stage} (Versi v${nextVersion}) berhasil disimpan.`
  });
});

// Evaluations & Reopen (Admin)
app.get('/api/admin/evaluations', requireAdmin, (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      evaluations: db.PENILAIAN,
      details: db.DETAIL_NILAI
    }
  });
});

app.post('/api/admin/evaluations/reopen', requireAdmin, async (req: Request, res: Response) => {
  const { evaluation_id, reopen_reason } = req.body || {};
  if (!evaluation_id || !reopen_reason?.trim()) {
    return res.status(400).json({
      success: false,
      message: 'ID Penilaian dan alasan pembukaan kembali (reopen) wajib diisi untuk keperluan audit.'
    });
  }

  const ev = db.PENILAIAN.find((e) => e.evaluation_id === evaluation_id);
  if (!ev) {
    return res.status(404).json({ success: false, message: 'Data penilaian tidak ditemukan.' });
  }

  ev.evaluation_status = 'DRAFT';
  ev.reopened_at = nowJakarta();
  ev.reopened_by = 'ADMIN-01';
  ev.reopen_reason = String(reopen_reason).trim();

  recalculateRecapForStage(ev.stage);
  recordActivity(
    'ADMIN-01',
    'ADMIN',
    'REOPEN_EVALUATION',
    'PENILAIAN',
    evaluation_id,
    `Membuka kembali penilaian ${evaluation_id} (Juri ${ev.jury_id} -> Peserta ${ev.participant_id}). Alasan: ${ev.reopen_reason}`
  );
  await persistDatabase('reopenJuryEvaluation', { evaluations: db.PENILAIAN, details: db.DETAIL_NILAI, stage: ev.stage });

  res.json({
    success: true,
    data: ev,
    message: 'Penilaian telah dibuka kembali menjadi status DRAFT.'
  });
});

// Rankings, Top 5, & Winners Confirmation (Section 16)
app.get('/api/admin/rankings', requireAdmin, (_req: Request, res: Response) => {
  recalculateRecapForStage('PENYISIHAN');
  recalculateRecapForStage('FINAL');
  res.json({
    success: true,
    data: {
      recap: db.REKAP_PENILAIAN,
      finalis_pemenang: db.FINALIS_PEMENANG
    }
  });
});

app.post('/api/admin/results/confirm', requireAdmin, async (req: Request, res: Response) => {
  const { action, participant_ids, winners, decision_notes = '', publish_now = false, participant_id, stage } = req.body || {};
  const now = nowJakarta();

  if (action === 'APPROVE_INCOMPLETE_EXCEPTION') {
    const rec = db.REKAP_PENILAIAN.find((r) => r.participant_id === participant_id && r.stage === stage);
    if (!rec) {
      return res.status(404).json({ success: false, message: 'Rekap peserta tidak ditemukan.' });
    }
    rec.admin_exception = !rec.admin_exception;
    recalculateRecapForStage(stage);
    recordActivity(
      'ADMIN-01',
      'ADMIN',
      'EXCEPTION_APPROVAL',
      'REKAP_PENILAIAN',
      participant_id,
      `Mengubah status pengecualian kelengkapan juri untuk peserta ${participant_id} pada tahap ${stage}. Catatan: ${decision_notes}`
    );
    await persistDatabase('syncFullDatabase');
    return res.json({ success: true, data: db.REKAP_PENILAIAN, message: 'Status pengecualian berhasil diperbarui.' });
  }

  if (action === 'CONFIRM_TOP_5') {
    if (!Array.isArray(participant_ids) || participant_ids.length === 0 || participant_ids.length > 5) {
      return res.status(400).json({
        success: false,
        message: 'Pilih 1 hingga 5 peserta terbaik untuk ditetapkan sebagai Finalis Top 5.'
      });
    }

    recalculateRecapForStage('PENYISIHAN');
    const newTop5: DatabaseSchema['FINALIS_PEMENANG'] = participant_ids.map((pid: string, idx: number) => {
      const recap = db.REKAP_PENILAIAN.find((r) => r.participant_id === pid && r.stage === 'PENYISIHAN');
      return {
        record_id: `TOP5-${idx + 1}-${pid}`,
        participant_id: pid,
        stage: 'PENYISIHAN',
        selection_type: 'TOP_5',
        award_rank: `Finalis Top ${idx + 1}`,
        approved_score: Number(recap?.average_score || 0),
        decision_notes: String(decision_notes || 'Ditetapkan melalui Rapat PlenoPenyisihan FKKKS Kec. Beji').trim(),
        approved_by: 'ADMIN-01',
        approved_at: now,
        published: Boolean(publish_now)
      };
    });

    db.FINALIS_PEMENANG = [
      ...db.FINALIS_PEMENANG.filter((f) => f.selection_type !== 'TOP_5'),
      ...newTop5
    ];

    const pubSetting = db.PENGATURAN.find((s) => s.key === 'preliminary_results_published');
    if (pubSetting) pubSetting.value = publish_now ? 'true' : 'false';

    recalculateRecapForStage('FINAL');
    recordActivity(
      'ADMIN-01',
      'ADMIN',
      'CONFIRM_TOP_5',
      'FINALIS_PEMENANG',
      'TOP_5',
      `Menetapkan ${newTop5.length} Finalis Top 5 (${participant_ids.join(', ')}). Publikasi: ${publish_now}`
    );
    await persistDatabase('confirmTopFive', { finalis_pemenang: db.FINALIS_PEMENANG });

    return res.json({
      success: true,
      data: db.FINALIS_PEMENANG,
      message: 'Finalis Top 5 berhasil ditetapkan dan disimpan ke database.'
    });
  }

  if (action === 'CONFIRM_WINNERS') {
    if (!Array.isArray(winners) || winners.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Daftar penetapan pemenang tidak boleh kosong.'
      });
    }

    const newWinners: DatabaseSchema['FINALIS_PEMENANG'] = winners.map((w: any, idx: number) => ({
      record_id: `WIN-${idx + 1}-${w.participant_id}`,
      participant_id: String(w.participant_id),
      stage: 'FINAL',
      selection_type: 'WINNER',
      award_rank: String(w.award_rank),
      approved_score: Number(w.approved_score || 0),
      decision_notes: String(w.decision_notes || decision_notes || 'Keputusan Resmi Dewan Juri & Panitia HGN Beji 2026').trim(),
      approved_by: 'ADMIN-01',
      approved_at: now,
      published: Boolean(publish_now)
    }));

    db.FINALIS_PEMENANG = [
      ...db.FINALIS_PEMENANG.filter((f) => f.selection_type !== 'WINNER'),
      ...newWinners
    ];

    const pubSetting = db.PENGATURAN.find((s) => s.key === 'final_results_published');
    if (pubSetting) pubSetting.value = publish_now ? 'true' : 'false';

    recordActivity(
      'ADMIN-01',
      'ADMIN',
      'CONFIRM_WINNERS',
      'FINALIS_PEMENANG',
      'WINNERS',
      `Menetapkan pemenang resmi Lomba Video Guru Inspiratif HGN 2026. Publikasi: ${publish_now}`
    );
    await persistDatabase('confirmWinners', { finalis_pemenang: db.FINALIS_PEMENANG });

    return res.json({
      success: true,
      data: db.FINALIS_PEMENANG,
      message: 'Penetapan Pemenang Lomba berhasil disimpan ke database.'
    });
  }

  res.status(400).json({ success: false, message: 'Aksi konfirmasi tidak dikenali.' });
});

// Announcements Management
app.post('/api/admin/announcements', requireAdmin, async (req: Request, res: Response) => {
  const { action, announcement, announcement_id } = req.body || {};
  const now = nowJakarta();

  if (action === 'DELETE') {
    db.PENGUMUMAN = db.PENGUMUMAN.filter((a) => a.announcement_id !== announcement_id);
    recordActivity('ADMIN-01', 'ADMIN', 'DELETE_ANNOUNCEMENT', 'PENGUMUMAN', announcement_id, 'Menghapus pengumuman.');
    await persistDatabase('saveAnnouncement', { announcements: db.PENGUMUMAN });
    return res.json({ success: true, data: db.PENGUMUMAN, message: 'Pengumuman berhasil dihapus.' });
  }

  if (!announcement || !announcement.title?.trim() || !announcement.content?.trim()) {
    return res.status(400).json({ success: false, message: 'Judul dan isi pengumuman wajib diisi.' });
  }

  if (announcement.announcement_id) {
    const idx = db.PENGUMUMAN.findIndex((a) => a.announcement_id === announcement.announcement_id);
    if (idx !== -1) {
      db.PENGUMUMAN[idx] = {
        ...db.PENGUMUMAN[idx],
        title: String(announcement.title).trim(),
        content: String(announcement.content).trim(),
        category: announcement.category || 'Informasi Lomba',
        publication_date: announcement.publication_date || now.slice(0, 10),
        published: Boolean(announcement.published),
        display_order: Number(announcement.display_order || idx + 1),
        updated_at: now
      };
    }
  } else {
    const newAnn: DatabaseSchema['PENGUMUMAN'][0] = {
      announcement_id: `ANN-${Date.now().toString().slice(-5)}`,
      title: String(announcement.title).trim(),
      content: String(announcement.content).trim(),
      category: announcement.category || 'Informasi Lomba',
      publication_date: announcement.publication_date || now.slice(0, 10),
      published: Boolean(announcement.published),
      display_order: Number(announcement.display_order || db.PENGUMUMAN.length + 1),
      updated_at: now
    };
    db.PENGUMUMAN.unshift(newAnn);
  }

  recordActivity('ADMIN-01', 'ADMIN', 'SAVE_ANNOUNCEMENT', 'PENGUMUMAN', announcement.title, `Menyimpan pengumuman: ${announcement.title}`);
  await persistDatabase('saveAnnouncement', { announcements: db.PENGUMUMAN });

  res.json({
    success: true,
    data: db.PENGUMUMAN,
    message: 'Pengumuman berhasil disimpan.'
  });
});

// Get Code.gs content & trigger manual Google Sheets sync
app.get('/api/admin/code-gs', requireAdmin, (_req: Request, res: Response) => {
  try {
    const codePath = path.resolve(process.cwd(), 'google-apps-script', 'Code.gs');
    const code = fs.existsSync(codePath) ? fs.readFileSync(codePath, 'utf-8') : '';
    res.json({
      success: true,
      data: {
        code,
        apps_script_url: dynamicAppsScriptUrl,
        db_status: lastGoogleSheetsSyncStatus
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Gagal membaca Code.gs' });
  }
});

app.post('/api/admin/sync-sheets', requireAdmin, async (req: Request, res: Response) => {
  const { direction = 'PUSH', apps_script_url, api_shared_secret } = req.body || {};
  if (apps_script_url !== undefined) {
    dynamicAppsScriptUrl = String(apps_script_url).trim();
    const s = db.PENGATURAN.find((item) => item.key === 'apps_script_url');
    if (s) s.value = dynamicAppsScriptUrl;
    else db.PENGATURAN.push({ key: 'apps_script_url', value: dynamicAppsScriptUrl, description: 'URL Web App Google Apps Script', updated_at: nowJakarta() });
  }
  if (api_shared_secret) {
    dynamicApiSharedSecret = String(api_shared_secret).trim();
  }

  if (direction === 'PULL' && dynamicAppsScriptUrl) {
    try {
      const response = await fetch(dynamicAppsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_secret: dynamicApiSharedSecret,
          action: 'getFullDatabase'
        })
      });
      if (response.ok) {
        const result = await response.json();
        if (result?.success && result?.data) {
          db = { ...db, ...result.data };
          await persistDatabase();
          return res.json({
            success: true,
            data: { db_status: lastGoogleSheetsSyncStatus },
            message: 'Data berhasil ditarik (pull) dari spreadsheet HGN 2026 Kec. Beji.'
          });
        }
      }
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        message: 'Gagal menarik data dari Google Apps Script: ' + (err?.message || 'Periksa kembali URL Web App dan API_SHARED_SECRET.')
      });
    }
  }

  await persistDatabase('syncFullDatabase', db);
  res.json({
    success: true,
    data: { db_status: lastGoogleSheetsSyncStatus },
    message: dynamicAppsScriptUrl
      ? 'Sinkronisasi ke Google Sheets (HGN 2026 Kec. Beji) selesai dijalankan.'
      : 'Data telah disimpan pada server lokal. Masukkan URL Web App Apps Script untuk mengirim ke Google Sheets.'
  });
});

// ============================================================================
// 3. JURY AUTHENTICATION & SCORING WORKSPACE ENDPOINTS (Sections 8–12)
// ============================================================================
app.post('/api/jury/login', (req: Request, res: Response) => {
  const ip = req.ip || 'local';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({
      success: false,
      message: 'Terlalu banyak percobaan login. Silakan coba lagi setelah 1 menit.',
      error_code: 'RATE_LIMITED'
    });
  }

  const settings = getSettingsMap();
  if (settings.jury_portal_enabled === 'false') {
    return res.status(403).json({
      success: false,
      message: 'Portal Penjurian saat ini sedang ditutup sementara oleh Administrator.',
      error_code: 'PORTAL_DISABLED'
    });
  }

  const { username, password } = req.body || {};
  if (!username?.trim() || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username dan password wajib diisi.'
    });
  }

  const cleanUser = String(username).trim().toLowerCase();
  const jury = db.JURI.find((j) => j.username.toLowerCase() === cleanUser);
  if (!jury) {
    return res.status(401).json({
      success: false,
      message: 'Username atau password Juri tidak ditemukan.',
      error_code: 'INVALID_JURY_CREDENTIALS'
    });
  }

  if (jury.account_status !== 'AKTIF') {
    return res.status(403).json({
      success: false,
      message: 'Akun Juri Anda berstatus NONAKTIF. Silakan hubungi Administrator FKKKS Kec. Beji.',
      error_code: 'JURY_INACTIVE'
    });
  }

  const valid = verifyPassword(String(password), jury.password_salt, jury.password_verifier);
  if (!valid) {
    return res.status(401).json({
      success: false,
      message: 'Username atau password Juri tidak sesuai.',
      error_code: 'INVALID_JURY_CREDENTIALS'
    });
  }

  createSessionCookie(res, 'hgn_jury_session', 'JURI', jury.jury_id, jury.username, jury.full_name);
  recordActivity(jury.jury_id, 'JURI', 'JURY_LOGIN', 'SESSION', jury.jury_id, `Juri ${jury.full_name} berhasil masuk ke Portal Penjurian.`);
  persistDatabase('recordActivity').catch(() => {});

  const { password_verifier, password_salt, ...safeJury } = jury;
  res.json({
    success: true,
    data: safeJury,
    message: `Selamat datang, ${jury.full_name}.`
  });
});

app.post('/api/jury/logout', (req: Request, res: Response) => {
  clearSessionCookie(req, res, 'hgn_jury_session');
  res.json({ success: true, message: 'Anda telah keluar dari Portal Penjurian.' });
});

app.get('/api/jury/session', (req: Request, res: Response) => {
  const session = getSession(req, 'JURI');
  if (!session) {
    return res.json({ success: true, data: { authenticated: false } });
  }
  const jury = db.JURI.find((j) => j.jury_id === session.userId);
  if (!jury || jury.account_status !== 'AKTIF') {
    return res.json({ success: true, data: { authenticated: false } });
  }
  const { password_verifier, password_salt, ...safeJury } = jury;
  res.json({
    success: true,
    data: {
      authenticated: true,
      jury: safeJury
    }
  });
});

app.post('/api/jury/change-password', requireJury, async (req: Request, res: Response) => {
  const jury = (req as any).juryAccount as DatabaseSchema['JURI'][0];
  const { current_password, new_password } = req.body || {};

  if (!new_password || String(new_password).trim().length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Password baru harus terdiri dari minimal 6 karakter.'
    });
  }

  if (current_password && !verifyPassword(String(current_password), jury.password_salt, jury.password_verifier)) {
    return res.status(400).json({
      success: false,
      message: 'Password saat ini tidak sesuai.'
    });
  }

  const { salt, verifier } = hashPassword(String(new_password).trim());
  jury.password_salt = salt;
  jury.password_verifier = verifier;
  jury.must_change_password = false;
  jury.updated_at = nowJakarta();

  recordActivity(jury.jury_id, 'JURI', 'CHANGE_PASSWORD', 'JURI', jury.jury_id, `Juri ${jury.full_name} memperbarui password akunnya.`);
  await persistDatabase('updateJuryAccount', jury);

  const { password_verifier, password_salt, ...safeJury } = jury;
  res.json({
    success: true,
    data: safeJury,
    message: 'Password berhasil diperbarui.'
  });
});

app.get('/api/jury/dashboard', requireJury, (req: Request, res: Response) => {
  const jury = (req as any).juryAccount as DatabaseSchema['JURI'][0];
  const settings = getSettingsMap();
  const myAssignments = db.PENUGASAN_JURI.filter(
    (a) => a.jury_id === jury.jury_id && a.assignment_status === 'ACTIVE'
  );
  const myEvaluations = db.PENILAIAN.filter((e) => e.jury_id === jury.jury_id);

  const enrichedAssignments = myAssignments.map((asg) => {
    const participant = db.PESERTA.find((p) => p.participant_id === asg.participant_id);
    const evaluation = myEvaluations.find(
      (e) => e.participant_id === asg.participant_id && e.stage === asg.stage
    );
    const details = evaluation
      ? db.DETAIL_NILAI.filter((d) => d.evaluation_id === evaluation.evaluation_id)
      : [];

    return {
      ...asg,
      participant: participant || null,
      evaluation_status: evaluation?.evaluation_status || 'BELUM_DINILAI',
      evaluation: evaluation || null,
      details
    };
  });

  const totalAssigned = enrichedAssignments.length;
  const finalizedCount = enrichedAssignments.filter((a) => a.evaluation_status === 'FINAL').length;
  const draftCount = enrichedAssignments.filter((a) => a.evaluation_status === 'DRAFT').length;
  const notScoredCount = enrichedAssignments.filter((a) => a.evaluation_status === 'BELUM_DINILAI').length;

  const { password_verifier, password_salt, ...safeJury } = jury;

  res.json({
    success: true,
    data: {
      jury: safeJury,
      active_stage: settings.active_judging_stage || 'PENYISIHAN',
      summary: {
        total_assigned: totalAssigned,
        not_scored: notScoredCount,
        draft: draftCount,
        finalized: finalizedCount
      },
      assignments: enrichedAssignments,
      criteria: db.KRITERIA_PENILAIAN.filter((c) => c.active).sort((a, b) => a.display_order - b.display_order)
    }
  });
});

app.get('/api/jury/assignments', requireJury, (req: Request, res: Response) => {
  const jury = (req as any).juryAccount as DatabaseSchema['JURI'][0];
  const myAssignments = db.PENUGASAN_JURI.filter(
    (a) => a.jury_id === jury.jury_id && a.assignment_status === 'ACTIVE'
  );
  res.json({ success: true, data: myAssignments });
});

app.get('/api/jury/evaluation/:assignmentId', requireJury, (req: Request, res: Response) => {
  const jury = (req as any).juryAccount as DatabaseSchema['JURI'][0];
  const { assignmentId } = req.params;

  const assignment = db.PENUGASAN_JURI.find(
    (a) => a.assignment_id === assignmentId && a.jury_id === jury.jury_id && a.assignment_status === 'ACTIVE'
  );
  if (!assignment) {
    return res.status(403).json({
      success: false,
      message: 'Anda tidak memiliki akses penugasan untuk karya peserta ini.',
      error_code: 'FORBIDDEN_ASSIGNMENT'
    });
  }

  const participant = db.PESERTA.find((p) => p.participant_id === assignment.participant_id);
  if (!participant) {
    return res.status(404).json({ success: false, message: 'Data peserta tidak ditemukan.' });
  }

  const evaluation = db.PENILAIAN.find(
    (e) =>
      e.jury_id === jury.jury_id &&
      e.participant_id === assignment.participant_id &&
      e.stage === assignment.stage
  );

  // If finalized, load the criteria version used at finalization, otherwise active criteria for that stage
  const activeStageCriteria = db.KRITERIA_PENILAIAN.filter(
    (c) => c.stage === assignment.stage && c.active
  ).sort((a, b) => a.display_order - b.display_order);

  const details = evaluation
    ? db.DETAIL_NILAI.filter((d) => d.evaluation_id === evaluation.evaluation_id)
    : [];

  res.json({
    success: true,
    data: {
      assignment,
      participant,
      criteria: activeStageCriteria,
      evaluation: evaluation || null,
      details
    }
  });
});

// Flag conflict of interest (Section 14)
app.post('/api/jury/conflict', requireJury, async (req: Request, res: Response) => {
  const jury = (req as any).juryAccount as DatabaseSchema['JURI'][0];
  const { assignment_id, conflict_notes } = req.body || {};

  const assignment = db.PENUGASAN_JURI.find(
    (a) => a.assignment_id === assignment_id && a.jury_id === jury.jury_id
  );
  if (!assignment) {
    return res.status(404).json({ success: false, message: 'Penugasan tidak ditemukan.' });
  }

  assignment.conflict_flag = true;
  assignment.conflict_notes = String(conflict_notes || 'Dilaporkan potensi konflik kepentingan oleh Juri.').trim();

  recordActivity(
    jury.jury_id,
    'JURI',
    'FLAG_CONFLICT',
    'PENUGASAN_JURI',
    assignment_id,
    `Juri ${jury.full_name} menandai potensi konflik kepentingan pada peserta ${assignment.participant_id}: ${assignment.conflict_notes}`
  );
  await persistDatabase('saveJuryAssignment', { assignments: db.PENUGASAN_JURI });

  res.json({
    success: true,
    data: assignment,
    message: 'Laporan konflik kepentingan telah dikirim kepada Administrator.'
  });
});

// Save Draft or Finalize Evaluation (Section 11)
async function handleJuryEvaluationSave(req: Request, res: Response, targetStatus: 'DRAFT' | 'FINAL') {
  const jury = (req as any).juryAccount as DatabaseSchema['JURI'][0];
  const {
    assignment_id,
    scores = [],
    strengths = '',
    improvements = '',
    recommendations = '',
    presentation_notes = ''
  } = req.body || {};

  const assignment = db.PENUGASAN_JURI.find(
    (a) => a.assignment_id === assignment_id && a.jury_id === jury.jury_id && a.assignment_status === 'ACTIVE'
  );
  if (!assignment) {
    return res.status(403).json({
      success: false,
      message: 'Anda tidak berhak menilai karya yang tidak ditugaskan kepada Anda.',
      error_code: 'UNASSIGNED_WORK'
    });
  }

  const existingEval = db.PENILAIAN.find(
    (e) =>
      e.jury_id === jury.jury_id &&
      e.participant_id === assignment.participant_id &&
      e.stage === assignment.stage
  );

  if (existingEval && existingEval.evaluation_status === 'FINAL') {
    return res.status(403).json({
      success: false,
      message: 'Penilaian ini sudah berstatus FINAL dan terkunci. Hubungi Administrator apabila memerlukan pembukaan kembali.',
      error_code: 'EVALUATION_LOCKED'
    });
  }

  const stageCriteria = db.KRITERIA_PENILAIAN.filter(
    (c) => c.stage === assignment.stage && c.active
  ).sort((a, b) => a.display_order - b.display_order);

  if (stageCriteria.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Kriteria penilaian untuk tahap ini belum dikonfigurasi.',
      error_code: 'NO_CRITERIA'
    });
  }

  const now = nowJakarta();
  const evaluation_id =
    existingEval?.evaluation_id ||
    `EVAL-${assignment.stage.slice(0, 3)}-${jury.jury_id}-${assignment.participant_id}`;

  let weightedTotal = 0;
  const newDetails: DatabaseSchema['DETAIL_NILAI'] = [];

  for (const crit of stageCriteria) {
    const submitted = Array.isArray(scores)
      ? scores.find((s: any) => s.criterion_id === crit.criterion_id)
      : null;

    const rawScore = submitted?.score;
    const isBlank = rawScore === null || rawScore === undefined || String(rawScore).trim() === '';

    if (targetStatus === 'FINAL' && isBlank) {
      return res.status(400).json({
        success: false,
        message: `Nilai untuk kriteria "${crit.criterion_name}" belum diisi. Seluruh kriteria wajib dinilai sebelum finalisasi.`,
        error_code: 'INCOMPLETE_CRITERIA_SCORE'
      });
    }

    let numericScore: number | null = null;
    let weightedScore = 0;

    if (!isBlank) {
      numericScore = Number(rawScore);
      if (Number.isNaN(numericScore) || numericScore < 0 || numericScore > 100) {
        return res.status(400).json({
          success: false,
          message: `Nilai untuk "${crit.criterion_name}" harus berada pada rentang 0 hingga 100.`,
          error_code: 'SCORE_OUT_OF_RANGE'
        });
      }
      weightedScore = (numericScore * Number(crit.weight_percentage)) / 100.0;
      weightedTotal += weightedScore;
    }

    newDetails.push({
      detail_id: `${evaluation_id}-${crit.criterion_id}`,
      evaluation_id,
      criterion_id: crit.criterion_id,
      criterion_name_snapshot: crit.criterion_name,
      weight_snapshot: Number(crit.weight_percentage),
      score: numericScore,
      weighted_score: weightedScore,
      criterion_notes: String(submitted?.criterion_notes || '').trim(),
      updated_at: now
    });
  }

  const rubricVersion = stageCriteria[0]?.rubric_version || 1;
  const record: DatabaseSchema['PENILAIAN'][0] = {
    evaluation_id,
    jury_id: jury.jury_id,
    participant_id: assignment.participant_id,
    assignment_id: assignment.assignment_id,
    stage: assignment.stage,
    rubric_version: rubricVersion,
    weighted_total: Number(weightedTotal),
    strengths: String(strengths || '').trim(),
    improvements: String(improvements || '').trim(),
    recommendations: String(recommendations || '').trim(),
    presentation_notes: String(presentation_notes || '').trim(),
    evaluation_status: targetStatus,
    saved_at: now,
    finalized_at: targetStatus === 'FINAL' ? now : existingEval?.finalized_at || '',
    reopened_at: existingEval?.reopened_at || '',
    reopened_by: existingEval?.reopened_by || '',
    reopen_reason: existingEval?.reopen_reason || ''
  };

  // Upsert evaluation (never create duplicates for jury_id + participant_id + stage)
  db.PENILAIAN = [
    ...db.PENILAIAN.filter((e) => e.evaluation_id !== evaluation_id),
    record
  ];

  // Replace details for this evaluation_id
  db.DETAIL_NILAI = [
    ...db.DETAIL_NILAI.filter((d) => d.evaluation_id !== evaluation_id),
    ...newDetails
  ];

  if (targetStatus === 'FINAL') {
    recalculateRecapForStage(assignment.stage);
    recordActivity(
      jury.jury_id,
      'JURI',
      'FINALIZE_EVALUATION',
      'PENILAIAN',
      evaluation_id,
      `Juri ${jury.full_name} memfinalisasi penilaian untuk peserta ${assignment.participant_id} (${assignment.stage}) dengan Nilai Akhir ${weightedTotal.toFixed(2)}.`
    );
    await persistDatabase('finalizeJuryEvaluation', {
      evaluations: db.PENILAIAN,
      details: db.DETAIL_NILAI,
      stage: assignment.stage
    });
  } else {
    recordActivity(
      jury.jury_id,
      'JURI',
      'SAVE_DRAFT_EVALUATION',
      'PENILAIAN',
      evaluation_id,
      `Juri ${jury.full_name} menyimpan draft penilaian peserta ${assignment.participant_id} (${assignment.stage}).`
    );
    await persistDatabase('saveJuryEvaluation', {
      evaluations: db.PENILAIAN,
      details: db.DETAIL_NILAI
    });
  }

  return res.json({
    success: true,
    data: {
      evaluation: record,
      details: newDetails
    },
    message:
      targetStatus === 'FINAL'
        ? 'Penilaian berhasil difinalisasi dan dikunci secara resmi.'
        : 'Draft penilaian berhasil disimpan ke database.'
  });
}

app.post('/api/jury/evaluation/draft', requireJury, async (req: Request, res: Response) => {
  await handleJuryEvaluationSave(req, res, 'DRAFT');
});

app.post('/api/jury/evaluation/finalize', requireJury, async (req: Request, res: Response) => {
  await handleJuryEvaluationSave(req, res, 'FINAL');
});

app.get('/api/jury/my-results', requireJury, (req: Request, res: Response) => {
  const jury = (req as any).juryAccount as DatabaseSchema['JURI'][0];
  const myEvaluations = db.PENILAIAN.filter((e) => e.jury_id === jury.jury_id);
  const myDetails = db.DETAIL_NILAI.filter((d) =>
    myEvaluations.some((e) => e.evaluation_id === d.evaluation_id)
  );
  res.json({
    success: true,
    data: {
      evaluations: myEvaluations,
      details: myDetails
    }
  });
});

// ============================================================================
// VITE DEV MIDDLEWARE / PRODUCTION STATIC SERVING
// ============================================================================
export { app };

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vitePkgName = ['vi', 'te'].join('');
    const { createServer: createViteServer } = await import(/* @vite-ignore */ vitePkgName);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HGN BEJI 2026 Server running on http://0.0.0.0:${PORT}`);
  });
}

if (!IS_SERVERLESS) {
  startServer();
}

