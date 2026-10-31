/**
 * ============================================================================
 * HGN BEJI 2026 — LOMBA VIDEO GURU INSPIRATIF
 * FKKKS KECAMATAN BEJI (#BejolanAji)
 * Complete Container-Bound Google Apps Script Database Backend (Code.gs)
 * Primary Database Name: HGN 2026 Kec. Beji
 * Timezone: Asia/Jakarta
 * ============================================================================
 */

var TIMEZONE = 'Asia/Jakarta';

var TABLES = {
  PENGATURAN: ['key', 'value', 'description', 'updated_at'],
  JUKNIS: ['id', 'section_code', 'title', 'content', 'sort_order', 'active', 'updated_at'],
  JADWAL: ['id', 'activity', 'start_datetime', 'end_datetime', 'location', 'display_order', 'active'],
  HADIAH: ['id', 'rank', 'prize_amount', 'description', 'display_order', 'active'],
  SEKOLAH: ['school_id', 'npsn', 'school_name', 'status', 'village', 'district', 'regency', 'province', 'active'],
  PESERTA: [
    'participant_id', 'submitted_at', 'full_name', 'school', 'innovation_title',
    'drive_folder_url', 'video_url', 'lesson_module_url', 'learning_media_url',
    'whatsapp', 'verification_status', 'admin_notes', 'consent'
  ],
  JURI: [
    'jury_id', 'full_name', 'identity_number', 'jury_category', 'institution',
    'whatsapp', 'username', 'password_verifier', 'password_salt',
    'must_change_password', 'account_status', 'assigned_stages', 'admin_notes',
    'created_at', 'updated_at'
  ],
  KRITERIA_PENILAIAN: [
    'criterion_id', 'stage', 'rubric_version', 'criterion_name', 'description',
    'indicators_json', 'weight_percentage', 'minimum_score', 'maximum_score',
    'display_order', 'active', 'created_at', 'updated_at'
  ],
  PENUGASAN_JURI: [
    'assignment_id', 'jury_id', 'participant_id', 'stage', 'assignment_status',
    'assigned_at', 'assigned_by', 'conflict_flag', 'conflict_notes'
  ],
  PENILAIAN: [
    'evaluation_id', 'jury_id', 'participant_id', 'assignment_id', 'stage',
    'rubric_version', 'weighted_total', 'strengths', 'improvements',
    'recommendations', 'presentation_notes', 'evaluation_status',
    'saved_at', 'finalized_at', 'reopened_at', 'reopened_by', 'reopen_reason'
  ],
  DETAIL_NILAI: [
    'detail_id', 'evaluation_id', 'criterion_id', 'criterion_name_snapshot',
    'weight_snapshot', 'score', 'weighted_score', 'criterion_notes', 'updated_at'
  ],
  REKAP_PENILAIAN: [
    'participant_id', 'stage', 'required_jurors', 'finalized_jurors',
    'average_score', 'evaluation_complete', 'rank', 'last_calculated'
  ],
  FINALIS_PEMENANG: [
    'record_id', 'participant_id', 'stage', 'selection_type', 'award_rank',
    'approved_score', 'decision_notes', 'approved_by', 'approved_at', 'published'
  ],
  PENGUMUMAN: [
    'announcement_id', 'title', 'content', 'category', 'publication_date',
    'published', 'display_order', 'updated_at'
  ],
  LOG_AKTIVITAS: [
    'log_id', 'timestamp', 'actor_id', 'actor_role', 'action',
    'target_type', 'target_id', 'description'
  ]
};

function nowJakarta() {
  return Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function sanitizeCell(val) {
  if (val === null || val === undefined) return '';
  var str = String(val);
  if (/^[=+\-@]/.test(str)) {
    return "'" + str;
  }
  return str;
}

function verifySecret(secret) {
  var props = PropertiesService.getScriptProperties();
  var stored = props.getProperty('API_SHARED_SECRET') || 'hgn-beji-2026-shared-secret';
  return secret && secret === stored;
}

function jsonResponse(success, data, message, errorCode) {
  var payload = {
    success: Boolean(success),
    data: data || null,
    message: message || '',
    error_code: errorCode || null,
    timestamp: nowJakarta()
  };
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 1. setupDatabase()
 * Creates missing worksheets without deleting existing user data or Sheet1.
 * Seeds initial configuration, Juknis, Jadwal, Hadiah, and Kriteria Penilaian if empty.
 */
function setupDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var now = nowJakarta();

  Object.keys(TABLES).forEach(function(sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    var headers = TABLES[sheetName];
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#0f172a').setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }
  });

  // Seed PENGATURAN if empty
  var pengaturanSheet = ss.getSheetByName('PENGATURAN');
  if (pengaturanSheet.getLastRow() <= 1) {
    var initialSettings = [
      ['site_title', 'LOMBA GURU INSPIRATIF 2026', 'Judul utama aplikasi website', now],
      ['tagline', 'GURU HEBAT, INDONESIA KUAT', 'Tagline utama HGN 2026', now],
      ['hashtag', '#BejolanAji', 'Tagar resmi FK3S Kec. Beji', now],
      ['organizer', 'FK3S KEC. BEJI', 'Penyelenggara kegiatan', now],
      ['main_logo_url', 'https://lh3.googleusercontent.com/d/1_q1kZ4MJoP6VQR7qs61HId_k_HHXB4oe', 'Logo utama beranda (Page 1)', now],
      ['app_icon_url', 'https://lh3.googleusercontent.com/d/13M5y3gnxVP6cUPGKRXqdYqmHxFjPAvpD', 'Logo FK3S Kec. Beji (Header & Page 2)', now],
      ['hero_background_url', '', 'Gambar latar hero opsional', now],
      ['banner_url', '', 'Gambar banner tambahan', now],
      ['primary_color', '#d97706', 'Warna aksen utama (Emas Inspiratif)', now],
      ['secondary_color', '#0284c7', 'Warna aksen sekunder (Biru Pendidikan)', now],
      ['contact_whatsapp', '0812-3456-7890 (Panitia HGN FKKKS Kec. Beji)', 'Kontak panitia di footer', now],
      ['footer_text', 'FKKKS KECAMATAN BEJI — Hari Guru Nasional 2026', 'Teks hak cipta & informasi footer', now],
      ['submission_deadline', '2026-11-21T23:59:00+07:00', 'Batas waktu pengumpulan karya (WIB)', now],
      ['submission_enabled', 'true', 'Status buka/tutup formulir pengumpulan', now],
      ['submission_mode', 'INTERNAL', 'Mode pengumpulan: INTERNAL atau GOOGLE_FORM', now],
      ['external_form_url', '', 'Tautan Google Form eksternal jika mode GOOGLE_FORM', now],
      ['active_judging_stage', 'PENYISIHAN', 'Tahap penjurian aktif: PENYISIHAN atau FINAL', now],
      ['jury_portal_enabled', 'true', 'Status aktif portal login juri', now],
      ['preliminary_results_published', 'false', 'Status publikasi pengumuman Top 5', now],
      ['final_results_published', 'false', 'Status publikasi pemenang akhir', now],
      ['stage_combination_mode', 'SEPARATE', 'Mode nilai akhir: SEPARATE atau COMBINED', now],
      ['preliminary_stage_weight', '40', 'Bobot penyisihan jika digabung (%)', now],
      ['final_stage_weight', '60', 'Bobot final jika digabung (%)', now],
      ['last_updated', now, 'Waktu sinkronisasi terakhir', now]
    ];
    pengaturanSheet.getRange(2, 1, initialSettings.length, 4).setValues(initialSettings);
  }

  // Seed JUKNIS if empty
  var juknisSheet = ss.getSheetByName('JUKNIS');
  if (juknisSheet.getLastRow() <= 1) {
    var initialJuknis = [
      ['JUK-A', 'A', 'LATAR BELAKANG DAN TUJUAN', 'Dalam rangka memperingati Hari Guru Nasional Tahun 2026, FKKKS Kecamatan Beji menyelenggarakan Lomba Video Guru Inspiratif untuk menggali, mengapresiasi, dan mendiseminasikan praktik baik serta inovasi pembelajaran guru.', 1, 'true', now],
      ['JUK-B', 'B', 'KETENTUAN PESERTA', '1. Peserta merupakan guru aktif di sekolah dasar se-Kecamatan Beji.\n2. Kepesertaan bersifat wajib bagi setiap lembaga.\n3. Setiap sekolah mengirimkan minimal satu guru sebagai perwakilan.', 2, 'true', now],
      ['JUK-C', 'C', 'KETENTUAN KARYA', 'Tema bebas, dengan fokus inovasi pembelajaran.\nMateri dapat berupa: Metode pembelajaran, Media pembelajaran, Alat peraga, Program inovatif kelas, atau Strategi pembelajaran lainnya.\n\nWajib menerapkan prinsip Pembelajaran Mendalam:\n- Joyful Learning\n- Meaningful Learning\n- Mindful Learning\n\nVideo harus mengikuti alur STAR (Situasi, Tantangan, Aksi, Refleksi/Hasil).\nDurasi video minimal 5 menit dan maksimal 7 menit.\nVideo wajib memiliki bukti praktik nyata dan testimoni dari pihak yang relevan (siswa, guru sejawat, atau kepala sekolah).\n\nDokumen wajib:\n1. Video praktik baik\n2. Modul Ajar\n3. Dokumentasi Media Pembelajaran\n\nKarya wajib orisinal, belum pernah diikutkan lomba sejenis, dan sudah dipraktikkan di sekolah asal.', 3, 'true', now],
      ['JUK-D', 'D', 'MEKANISME PENJURIAN', 'Tahap 1 — Seleksi Video: Dewan juri melakukan penilaian terhadap seluruh karya untuk menentukan Top 5.\nTahap 2 — Final: Lima finalis melakukan paparan luring dan mempertanggungjawabkan inovasi pembelajaran.\n\nDewan juri terdiri dari unsur Korwilcam, Pengawas, dan Praktisi.\nKeputusan dewan juri bersifat mutlak dan tidak dapat diganggu gugat.', 4, 'true', now],
      ['JUK-E', 'E', 'WAKTU PELAKSANAAN', 'Deadline pengumpulan: 21 November 2026, 23.59 WIB.\nPenyisihan: 23–25 November 2026.\nFinal: 26–27 November 2026.\nPengumuman pemenang: 28 November 2026.', 5, 'true', now],
      ['JUK-F', 'F', 'TATA CARA PENGUMPULAN', 'Peserta menyiapkan Google Drive folder berisi: Video, Modul Ajar, dan Media Pembelajaran.\nFolder harus diatur agar dapat dilihat oleh siapa saja yang memiliki tautan (Anyone with the link can view).\nPeserta tidak diwajibkan mengunggah video ke YouTube pribadi.\nPanitia dapat mengunggah ulang karya ke kanal YouTube K3S sebagai arsip dan referensi pendidikan.\nPeserta mengirimkan identitas dan tautan karya melalui formulir pengumpulan resmi.', 6, 'true', now],
      ['JUK-G', 'G', 'KRITERIA PENILAIAN', 'Pedagogik dan Inovasi: 40%.\nDampak / Hasil Nyata: 35%.\nKualitas Teknis Video: 25%.', 7, 'true', now],
      ['JUK-H', 'H', 'APRESIASI', 'Juara I: Rp1.000.000 + Piagam Penghargaan.\nJuara II: Rp750.000 + Piagam Penghargaan.\nJuara III: Rp500.000 + Piagam Penghargaan.\nJuara Harapan I: Rp300.000 + Piagam Penghargaan.\nJuara Harapan II: Rp200.000 + Piagam Penghargaan.', 8, 'true', now]
    ];
    juknisSheet.getRange(2, 1, initialJuknis.length, 7).setValues(initialJuknis);
  }

  // Seed JADWAL if empty
  var jadwalSheet = ss.getSheetByName('JADWAL');
  if (jadwalSheet.getLastRow() <= 1) {
    var initialJadwal = [
      ['JDW-1', 'Deadline Pengumpulan Karya', '2026-11-21 23:59 WIB', '2026-11-21 23:59 WIB', 'Portal Digital HGN Beji 2026', 1, 'true'],
      ['JDW-2', 'Penjurian Tahap Penyisihan', '2026-11-23', '2026-11-25', 'Portal Penjurian Digital', 2, 'true'],
      ['JDW-3', 'Babak Final Top 5 (Paparan Luring)', '2026-11-26', '2026-11-27', 'Aula Korwilcam Pendidikan Kec. Beji', 3, 'true'],
      ['JDW-4', 'Pengumuman Pemenang & Puncak HGN', '2026-11-28', '2026-11-28', 'Kecamatan Beji', 4, 'true']
    ];
    jadwalSheet.getRange(2, 1, initialJadwal.length, 7).setValues(initialJadwal);
  }

  // Seed HADIAH if empty
  var hadiahSheet = ss.getSheetByName('HADIAH');
  if (hadiahSheet.getLastRow() <= 1) {
    var initialHadiah = [
      ['HAD-1', 'Juara I', 1000000, 'Uang Pembinaan Rp1.000.000 + Piagam Penghargaan Resmi FKKKS Kec. Beji', 1, 'true'],
      ['HAD-2', 'Juara II', 750000, 'Uang Pembinaan Rp750.000 + Piagam Penghargaan Resmi FKKKS Kec. Beji', 2, 'true'],
      ['HAD-3', 'Juara III', 500000, 'Uang Pembinaan Rp500.000 + Piagam Penghargaan Resmi FKKKS Kec. Beji', 3, 'true'],
      ['HAD-4', 'Juara Harapan I', 300000, 'Uang Pembinaan Rp300.000 + Piagam Penghargaan Resmi FKKKS Kec. Beji', 4, 'true'],
      ['HAD-5', 'Juara Harapan II', 200000, 'Uang Pembinaan Rp200.000 + Piagam Penghargaan Resmi FKKKS Kec. Beji', 5, 'true']
    ];
    hadiahSheet.getRange(2, 1, initialHadiah.length, 6).setValues(initialHadiah);
  }

  // Seed SEKOLAH (Sekolah Dasar Se-Kecamatan Beji, Kabupaten Pasuruan, Provinsi Jawa Timur) if empty
  var sekolahSheet = ss.getSheetByName('SEKOLAH');
  if (sekolahSheet.getLastRow() <= 1) {
    var initialSekolah = [
      ['SCH-01', '20519441', 'SDN Baujeng I Beji', 'NEGERI', 'Desa Baujeng', 'Kec. Beji', 'Kab. Pasuruan', 'Jawa Timur', 'true'],
      ['SCH-02', '20519442', 'SDN Baujeng II Beji', 'NEGERI', 'Desa Baujeng', 'Kec. Beji', 'Kab. Pasuruan', 'Jawa Timur', 'true'],
      ['SCH-03', '20519446', 'SDN Beji I Beji', 'NEGERI', 'Desa Beji', 'Kec. Beji', 'Kab. Pasuruan', 'Jawa Timur', 'true'],
      ['SCH-04', '20519447', 'SDN Beji II Beji', 'NEGERI', 'Desa Beji', 'Kec. Beji', 'Kab. Pasuruan', 'Jawa Timur', 'true'],
      ['SCH-05', '20519449', 'SDN Beji IV Beji', 'NEGERI', 'Desa Beji', 'Kec. Beji', 'Kab. Pasuruan', 'Jawa Timur', 'true'],
      ['SCH-06', '20519421', 'SDN Cangkringmalang I Beji', 'NEGERI', 'Desa Cangkringmalang', 'Kec. Beji', 'Kab. Pasuruan', 'Jawa Timur', 'true'],
      ['SCH-07', '20519422', 'SDN Cangkringmalang II Beji', 'NEGERI', 'Desa Cangkringmalang', 'Kec. Beji', 'Kab. Pasuruan', 'Jawa Timur', 'true'],
      ['SCH-08', '20519423', 'SDN Cangkringmalang III Beji', 'NEGERI', 'Desa Cangkringmalang', 'Kec. Beji', 'Kab. Pasuruan', 'Jawa Timur', 'true'],
      ['SCH-09', '20519312', 'SDN Gajahbendo Beji', 'NEGERI', 'Kel. Gajahbendo', 'Kec. Beji', 'Kab. Pasuruan', 'Jawa Timur', 'true'],
      ['SCH-10', '20519318', 'SDN Glanggang I Beji', 'NEGERI', 'Desa Glanggang', 'Kec. Beji', 'Kab. Pasuruan', 'Jawa Timur', 'true'],
      ['SCH-11', '20519319', 'SDN Glanggang II Beji', 'NEGERI', 'Desa Glanggang', 'Kec. Beji', 'Kab. Pasuruan', 'Jawa Timur', 'true'],
      ['SCH-12', '20519335', 'SDN Gununggangsir I Beji', 'NEGERI', 'Desa Gununggangsir', 'Kec. Beji', 'Kab. Pasuruan', 'Jawa Timur', 'true'],
      ['SCH-13', '20519336', 'SDN Gununggangsir II Beji', 'NEGERI', 'Desa Gununggangsir', 'Kec. Beji', 'Kab. Pasuruan', 'Jawa Timur', 'true'],
      ['SCH-14', '20519337', 'SDN Gununggangsir III Beji', 'NEGERI', 'Desa Gununggangsir', 'Kec. Beji', 'Kab. Pasuruan', 'Jawa Timur', 'true'],
      ['SCH-15', '20519340', 'SDN Gunungsari I Beji', 'NEGERI', 'Desa Gunungsari', 'Kec. Beji', 'Kab. Pasuruan', 'Jawa Timur', 'true'],
      ['SCH-16', '20519341', 'SDN Gunungsari II Beji', 'NEGERI', 'Desa Gunungsari', 'Kec. Beji', 'Kab. Pasuruan', 'Jawa Timur', 'true'],
      ['SCH-17', '20519763', 'SDN Kedungboto Beji', 'NEGERI', 'Desa Kedungboto', 'Kec. Beji', 'Kab. Pasuruan', 'Jawa Timur', 'true'],
      ['SCH-18', '20519756', 'SDN Kedungringin I Beji', 'NEGERI', 'Desa Kedungringin', 'Kec. Beji', 'Kab. Pasuruan', 'Jawa Timur', 'true'],
      ['SCH-19', '20519757', 'SDN Kedungringin II Beji', 'NEGERI', 'Desa Kedungringin', 'Kec. Beji', 'Kab. Pasuruan', 'Jawa Timur', 'true'],
      ['SCH-20', '20519758', 'SDN Kedungringin III Beji', 'NEGERI', 'Desa Kedungringin', 'Kec. Beji', 'Kab. Pasuruan', 'Jawa Timur', 'true'],
      ['SCH-21', '20519759', 'SDN Kedungringin IV Beji', 'NEGERI', 'Desa Kedungringin', 'Kec. Beji', 'Kab. Pasuruan', 'Jawa Timur', 'true'],
      ['SCH-22', '20519741', 'SDN Kenep Beji', 'NEGERI', 'Desa Kenep', 'Kec. Beji', 'Kab. Pasuruan', 'Jawa Timur', 'true'],
      ['SCH-23', '20519182', 'SDN Ngembe Beji', 'NEGERI', 'Desa Ngembe', 'Kec. Beji', 'Kab. Pasuruan', 'Jawa Timur', 'true'],
      ['SCH-24', '20519155', 'SDN Pagak Beji', 'NEGERI', 'Desa Pagak', 'Kec. Beji', 'Kab. Pasuruan', 'Jawa Timur', 'true'],
      ['SCH-25', '20518981', 'SDN Sidowayah Beji', 'NEGERI', 'Desa Sidowayah', 'Kec. Beji', 'Kab. Pasuruan', 'Jawa Timur', 'true'],
      ['SCH-26', '20519011', 'SDN Sumbersari I Beji', 'NEGERI', 'Desa Gununggangsir', 'Kec. Beji', 'Kab. Pasuruan', 'Jawa Timur', 'true'],
      ['SCH-27', '20519012', 'SDN Sumbersari II Beji', 'NEGERI', 'Desa Gununggangsir', 'Kec. Beji', 'Kab. Pasuruan', 'Jawa Timur', 'true'],
      ['SCH-28', '69947120', 'SD Islam Ar-Roudhoh Beji', 'SWASTA', 'Desa Wonokoyo', 'Kec. Beji', 'Kab. Pasuruan', 'Jawa Timur', 'true']
    ];
    sekolahSheet.getRange(2, 1, initialSekolah.length, 9).setValues(initialSekolah);
  }

  // Seed KRITERIA_PENILAIAN if empty
  var kriteriaSheet = ss.getSheetByName('KRITERIA_PENILAIAN');
  if (kriteriaSheet.getLastRow() <= 1) {
    var indPedagogik = JSON.stringify([
      'Relevansi inovasi pembelajaran dengan kebutuhan belajar siswa',
      'Orisinalitas dan kreativitas metode atau media pembelajaran',
      'Penerapan prinsip Joyful Learning (pembelajaran menyenangkan)',
      'Penerapan prinsip Meaningful Learning (pembelajaran bermakna)',
      'Penerapan prinsip Mindful Learning (pembelajaran berkesadaran)',
      'Kelengkapan dan keterpaduan Modul Ajar',
      'Kesesuaian antara perencanaan Modul Ajar dan pelaksanaan nyata di kelas'
    ]);
    var indDampak = JSON.stringify([
      'Kejelasan identifikasi masalah awal pembelajaran (Situasi)',
      'Relevansi tantangan yang dihadapi guru di kelas (Tantangan)',
      'Ketepatan langkah nyata dalam kerangka alur STAR (Aksi)',
      'Bukti autentik aktivitas pembelajaran nyata bersama siswa',
      'Dampak positif yang terukur terhadap hasil atau motivasi belajar siswa',
      'Kualitas dan relevansi testimoni (siswa, rekan sejawat, atau kepala sekolah)',
      'Kualitas refleksi hasil pembelajaran dan rencana tindak lanjut (Refleksi)'
    ]);
    var indVideo = JSON.stringify([
      'Kesesuaian durasi video (minimal 5 menit dan maksimal 7 menit)',
      'Kejernihan kualitas visual dan pencahayaan video',
      'Kejernihan kualitas audio, suara guru, dan musik latar yang proporsional',
      'Struktur alur penyajian video yang runtut dan komunikatif',
      'Kreativitas penyuntingan (editing) dan estetika grafis pendukung',
      'Kejelasan artikulasi dan narasi penjelasan guru',
      'Kelengkapan dan keterbacaan bukti visual serta dokumentasi media pembelajaran'
    ]);

    var initialKriteria = [
      ['KRIT-PENY-1', 'PENYISIHAN', 1, 'Pedagogik & Inovasi', 'Penilaian kedalaman pedagogik, orisinalitas inovasi, penerapan Deep Learning (Joyful, Meaningful, Mindful), serta kesesuaian Modul Ajar.', indPedagogik, 40, 0, 100, 1, 'true', now, now],
      ['KRIT-PENY-2', 'PENYISIHAN', 1, 'Dampak / Hasil Nyata', 'Penilaian implementasi alur STAR (Situasi, Tantangan, Aksi, Refleksi), bukti nyata di kelas, testimoni, serta dampak bagi siswa.', indDampak, 35, 0, 100, 2, 'true', now, now],
      ['KRIT-PENY-3', 'PENYISIHAN', 1, 'Kualitas Teknis Video', 'Penilaian ketepatan durasi 5–7 menit, kejelasan visual & audio, penyuntingan, serta kelengkapan bukti dokumentasi.', indVideo, 25, 0, 100, 3, 'true', now, now],
      ['KRIT-FIN-1', 'FINAL', 1, 'Pedagogik & Inovasi (Final)', 'Kedalaman konsep inovasi pembelajaran, penguasaan materi Modul Ajar, serta ketajaman strategi Deep Learning saat paparan.', indPedagogik, 40, 0, 100, 1, 'true', now, now],
      ['KRIT-FIN-2', 'FINAL', 1, 'Dampak & Pertanggungjawaban Karya', 'Bukti dampak nyata inovasi, konsistensi alur STAR, serta kemampuan mempertanggungjawabkan karya di hadapan dewan juri.', indDampak, 35, 0, 100, 2, 'true', now, now],
      ['KRIT-FIN-3', 'FINAL', 1, 'Kualitas Penyajian & Media', 'Kualitas media pembelajaran, kejelasan komunikasi paparan luring, serta kelengkapan demonstrasi praktik baik.', indVideo, 25, 0, 100, 3, 'true', now, now]
    ];
    kriteriaSheet.getRange(2, 1, initialKriteria.length, 13).setValues(initialKriteria);
  }

  // Seed PENGUMUMAN if empty
  var pengumumanSheet = ss.getSheetByName('PENGUMUMAN');
  if (pengumumanSheet.getLastRow() <= 1) {
    var initialAnnouncements = [
      ['ANN-1', 'Pembukaan Pendaftaran & Pengumpulan Karya Lomba Video Guru Inspiratif 2026', 'Seluruh Sekolah Dasar se-Kecamatan Beji wajib mengirimkan minimal 1 (satu) guru perwakilan. Pengumpulan karya dibuka hingga 21 November 2026 pukul 23.59 WIB melalui portal ini.', 'Informasi Lomba', '2026-10-31', 'true', 1, now],
      ['ANN-2', 'Ketentuan Tautan Folder Google Drive Peserta', 'Pastikan folder Google Drive yang dikirimkan memuat 3 dokumen utama (Video Praktik Baik 5-7 menit, Modul Ajar, dan Dokumentasi Media Pembelajaran) dengan akses "Siapa saja yang memiliki link dapat melihat".', 'Pengumpulan Karya', '2026-10-31', 'true', 2, now]
    ];
    pengumumanSheet.getRange(2, 1, initialAnnouncements.length, 8).setValues(initialAnnouncements);
  }

  return { status: 'OK', initialized_at: now };
}

function sheetToObjects(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() <= 1) return [];
  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  var results = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    results.push(obj);
  }
  return results;
}

function replaceSheetObjects(sheetName, objects) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  var headers = TABLES[sheetName];
  sheet.clearContents();
  var rows = [headers];
  for (var i = 0; i < objects.length; i++) {
    var item = objects[i];
    var row = headers.map(function(h) {
      return sanitizeCell(item[h] !== undefined ? item[h] : '');
    });
    rows.push(row);
  }
  sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#0f172a').setFontColor('#ffffff');
  sheet.setFrozenRows(1);
}

/**
 * 2. doGet(e)
 * Public read-only endpoint or health check (does NOT expose private jury/admin data).
 */
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'getPublicData';
    if (action === 'getPublicData') {
      return jsonResponse(true, getPublicData(), 'Data publik berhasil dimuat');
    }
    return jsonResponse(false, null, 'Endpoint GET hanya mendukung getPublicData', 'FORBIDDEN_ACTION');
  } catch (err) {
    return jsonResponse(false, null, 'Terjadi kesalahan pada server spreadsheet', 'INTERNAL_ERROR');
  }
}

/**
 * 3. doPost(e)
 * Authenticated request dispatcher with LockService for concurrent write safety.
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    var body = JSON.parse(e.postData.contents || '{}');
    if (!verifySecret(body.api_secret)) {
      return jsonResponse(false, null, 'Otorisasi API gagal: API_SHARED_SECRET tidak cocok', 'UNAUTHORIZED');
    }

    var action = body.action;
    var payload = body.payload || {};

    switch (action) {
      case 'setupDatabase':
        return jsonResponse(true, setupDatabase(), 'Database berhasil diinisialisasi');
      case 'getPublicData':
        return jsonResponse(true, getPublicData(), 'OK');
      case 'getSettings':
        return jsonResponse(true, getSettings(), 'OK');
      case 'saveSettings':
        return jsonResponse(true, saveSettings(payload), 'Pengaturan berhasil disimpan');
      case 'getJuknis':
        return jsonResponse(true, getJuknis(), 'OK');
      case 'saveJuknis':
        return jsonResponse(true, saveJuknis(payload), 'Juknis berhasil disimpan');
      case 'getSchools':
        return jsonResponse(true, getSchools(), 'OK');
      case 'saveSchools':
        return jsonResponse(true, saveSchools(payload), 'Data sekolah berhasil disimpan');
      case 'getParticipants':
        return jsonResponse(true, getParticipants(), 'OK');
      case 'addParticipant':
        return jsonResponse(true, addParticipant(payload), 'Peserta berhasil ditambahkan');
      case 'updateParticipant':
        return jsonResponse(true, updateParticipant(payload), 'Data peserta berhasil diperbarui');
      case 'getJuryAccounts':
        return jsonResponse(true, getJuryAccounts(), 'OK');
      case 'createJuryAccount':
        return jsonResponse(true, createJuryAccount(payload), 'Akun juri berhasil dibuat');
      case 'updateJuryAccount':
        return jsonResponse(true, updateJuryAccount(payload), 'Akun juri berhasil diperbarui');
      case 'getJuryAssignments':
        return jsonResponse(true, getJuryAssignments(), 'OK');
      case 'saveJuryAssignment':
        return jsonResponse(true, saveJuryAssignment(payload), 'Penugasan juri berhasil disimpan');
      case 'getScoringCriteria':
        return jsonResponse(true, getScoringCriteria(), 'OK');
      case 'saveScoringCriteria':
        return jsonResponse(true, saveScoringCriteria(payload), 'Kriteria penilaian berhasil disimpan');
      case 'getJuryEvaluation':
        return jsonResponse(true, getJuryEvaluation(payload), 'OK');
      case 'saveJuryEvaluation':
        return jsonResponse(true, saveJuryEvaluation(payload), 'Draft penilaian berhasil disimpan');
      case 'finalizeJuryEvaluation':
        return jsonResponse(true, finalizeJuryEvaluation(payload), 'Penilaian berhasil difinalisasi');
      case 'reopenJuryEvaluation':
        return jsonResponse(true, reopenJuryEvaluation(payload), 'Penilaian berhasil dibuka kembali');
      case 'refreshScoreRecap':
        return jsonResponse(true, refreshScoreRecap(payload.stage), 'Rekap nilai berhasil diperbarui');
      case 'confirmTopFive':
        return jsonResponse(true, confirmTopFive(payload), 'Top 5 berhasil ditetapkan');
      case 'confirmWinners':
        return jsonResponse(true, confirmWinners(payload), 'Pemenang berhasil ditetapkan');
      case 'saveAnnouncement':
        return jsonResponse(true, saveAnnouncement(payload), 'Pengumuman berhasil disimpan');
      case 'getAdminDashboardSummary':
        return jsonResponse(true, getAdminDashboardSummary(), 'OK');
      case 'recordActivity':
        return jsonResponse(true, recordActivity(payload), 'Log tercatat');
      case 'syncFullDatabase':
        return jsonResponse(true, syncFullDatabase(payload), 'Sinkronisasi penuh berhasil');
      case 'getFullDatabase':
        return jsonResponse(true, getFullDatabase(), 'OK');
      default:
        return jsonResponse(false, null, 'Aksi tidak dikenali: ' + action, 'UNKNOWN_ACTION');
    }
  } catch (err) {
    return jsonResponse(false, null, 'Kesalahan eksekusi Apps Script: ' + err.message, 'EXECUTION_ERROR');
  } finally {
    lock.releaseLock();
  }
}

function getSettings() {
  return sheetToObjects('PENGATURAN');
}

function saveSettings(payload) {
  if (Array.isArray(payload.settings)) {
    replaceSheetObjects('PENGATURAN', payload.settings);
  }
  return getSettings();
}

function getJuknis() {
  return sheetToObjects('JUKNIS');
}

function saveJuknis(payload) {
  if (Array.isArray(payload.juknis)) {
    replaceSheetObjects('JUKNIS', payload.juknis);
  }
  return getJuknis();
}

function getSchools() {
  return sheetToObjects('SEKOLAH');
}

function saveSchools(payload) {
  if (Array.isArray(payload.schools)) {
    replaceSheetObjects('SEKOLAH', payload.schools);
  }
  return getSchools();
}

function getParticipants() {
  return sheetToObjects('PESERTA');
}

function addParticipant(participant) {
  var list = getParticipants();
  list.push(participant);
  replaceSheetObjects('PESERTA', list);
  return participant;
}

function updateParticipant(participant) {
  var list = getParticipants().map(function(p) {
    return p.participant_id === participant.participant_id ? participant : p;
  });
  replaceSheetObjects('PESERTA', list);
  return participant;
}

function getJuryAccounts() {
  return sheetToObjects('JURI');
}

function createJuryAccount(jury) {
  var list = getJuryAccounts();
  list.push(jury);
  replaceSheetObjects('JURI', list);
  return jury;
}

function updateJuryAccount(jury) {
  var list = getJuryAccounts().map(function(j) {
    return j.jury_id === jury.jury_id ? jury : j;
  });
  replaceSheetObjects('JURI', list);
  return jury;
}

function getJuryAssignments() {
  return sheetToObjects('PENUGASAN_JURI');
}

function saveJuryAssignment(payload) {
  if (Array.isArray(payload.assignments)) {
    replaceSheetObjects('PENUGASAN_JURI', payload.assignments);
  }
  return getJuryAssignments();
}

function getScoringCriteria() {
  return sheetToObjects('KRITERIA_PENILAIAN');
}

function saveScoringCriteria(payload) {
  if (Array.isArray(payload.criteria)) {
    replaceSheetObjects('KRITERIA_PENILAIAN', payload.criteria);
  }
  return getScoringCriteria();
}

function getJuryEvaluation(payload) {
  var evaluations = sheetToObjects('PENILAIAN');
  var details = sheetToObjects('DETAIL_NILAI');
  return { evaluations: evaluations, details: details };
}

function saveJuryEvaluation(payload) {
  if (Array.isArray(payload.evaluations)) {
    replaceSheetObjects('PENILAIAN', payload.evaluations);
  }
  if (Array.isArray(payload.details)) {
    replaceSheetObjects('DETAIL_NILAI', payload.details);
  }
  return { saved: true };
}

function finalizeJuryEvaluation(payload) {
  saveJuryEvaluation(payload);
  refreshScoreRecap(payload.stage || 'PENYISIHAN');
  return { finalized: true };
}

function reopenJuryEvaluation(payload) {
  saveJuryEvaluation(payload);
  refreshScoreRecap(payload.stage || 'PENYISIHAN');
  return { reopened: true };
}

function calculateWeightedScore(details) {
  var total = 0;
  for (var i = 0; i < details.length; i++) {
    var score = Number(details[i].score || 0);
    var weight = Number(details[i].weight_snapshot || 0);
    total += (score * weight) / 100.0;
  }
  return total;
}

function calculateParticipantAverage(participantId, stage, evaluations) {
  var finalized = evaluations.filter(function(ev) {
    return ev.participant_id === participantId && ev.stage === stage && ev.evaluation_status === 'FINAL';
  });
  if (finalized.length === 0) return null;
  var sum = 0;
  for (var i = 0; i < finalized.length; i++) {
    sum += Number(finalized[i].weighted_total || 0);
  }
  return sum / finalized.length;
}

function calculateStageRankings(stage) {
  var assignments = sheetToObjects('PENUGASAN_JURI').filter(function(a) {
    return a.stage === stage && a.assignment_status === 'ACTIVE';
  });
  var evaluations = sheetToObjects('PENILAIAN').filter(function(e) {
    return e.stage === stage;
  });
  var participants = sheetToObjects('PESERTA');
  var recapRows = [];
  var now = nowJakarta();

  participants.forEach(function(p) {
    var reqJurors = assignments.filter(function(a) { return a.participant_id === p.participant_id; }).length;
    var finEvals = evaluations.filter(function(e) {
      return e.participant_id === p.participant_id && e.evaluation_status === 'FINAL';
    });
    if (reqJurors > 0 || finEvals.length > 0) {
      var avg = finEvals.length > 0 ? calculateParticipantAverage(p.participant_id, stage, evaluations) : 0;
      var complete = reqJurors > 0 && finEvals.length >= reqJurors;
      recapRows.push({
        participant_id: p.participant_id,
        stage: stage,
        required_jurors: reqJurors,
        finalized_jurors: finEvals.length,
        average_score: avg !== null ? avg : '',
        evaluation_complete: complete ? 'true' : 'false',
        rank: '',
        last_calculated: now
      });
    }
  });

  var completeRows = recapRows.filter(function(r) { return r.evaluation_complete === 'true'; });
  completeRows.sort(function(a, b) { return Number(b.average_score) - Number(a.average_score); });
  for (var idx = 0; idx < completeRows.length; idx++) {
    completeRows[idx].rank = idx + 1;
  }

  return recapRows;
}

function refreshScoreRecap(stage) {
  var allRecaps = sheetToObjects('REKAP_PENILAIAN').filter(function(r) { return r.stage !== stage; });
  var stageRecaps = calculateStageRankings(stage || 'PENYISIHAN');
  var merged = allRecaps.concat(stageRecaps);
  replaceSheetObjects('REKAP_PENILAIAN', merged);
  return stageRecaps;
}

function confirmTopFive(payload) {
  if (Array.isArray(payload.finalis_pemenang)) {
    replaceSheetObjects('FINALIS_PEMENANG', payload.finalis_pemenang);
  }
  return sheetToObjects('FINALIS_PEMENANG');
}

function confirmWinners(payload) {
  if (Array.isArray(payload.finalis_pemenang)) {
    replaceSheetObjects('FINALIS_PEMENANG', payload.finalis_pemenang);
  }
  return sheetToObjects('FINALIS_PEMENANG');
}

function saveAnnouncement(payload) {
  if (Array.isArray(payload.announcements)) {
    replaceSheetObjects('PENGUMUMAN', payload.announcements);
  }
  return sheetToObjects('PENGUMUMAN');
}

function recordActivity(logEntry) {
  var logs = sheetToObjects('LOG_AKTIVITAS');
  logs.unshift(logEntry);
  if (logs.length > 500) logs = logs.slice(0, 500);
  replaceSheetObjects('LOG_AKTIVITAS', logs);
  return logEntry;
}

function getPublicData() {
  var publicParticipants = getParticipants().map(function(p) {
    return {
      participant_id: p.participant_id,
      school: p.school,
      full_name: p.full_name,
      innovation_title: p.innovation_title
    };
  });
  return {
    settings: getSettings(),
    juknis: getJuknis().filter(function(j) { return String(j.active) === 'true'; }),
    jadwal: sheetToObjects('JADWAL').filter(function(j) { return String(j.active) === 'true'; }),
    hadiah: sheetToObjects('HADIAH').filter(function(h) { return String(h.active) === 'true'; }),
    sekolah: getSchools().filter(function(s) { return String(s.active) === 'true'; }),
    public_participants: publicParticipants,
    pengumuman: sheetToObjects('PENGUMUMAN').filter(function(a) { return String(a.published) === 'true'; }),
    finalis_pemenang: sheetToObjects('FINALIS_PEMENANG').filter(function(f) { return String(f.published) === 'true'; })
  };
}

function getAdminDashboardSummary() {
  var participants = getParticipants();
  var jury = getJuryAccounts();
  var evaluations = sheetToObjects('PENILAIAN');
  return {
    total_participants: participants.length,
    total_jury: jury.length,
    total_evaluations: evaluations.length,
    last_sync: nowJakarta()
  };
}

function getFullDatabase() {
  var result = {};
  Object.keys(TABLES).forEach(function(tableName) {
    result[tableName] = sheetToObjects(tableName);
  });
  return result;
}

function syncFullDatabase(payload) {
  setupDatabase();
  Object.keys(TABLES).forEach(function(tableName) {
    if (Array.isArray(payload[tableName])) {
      replaceSheetObjects(tableName, payload[tableName]);
    }
  });
  return { synced: true, timestamp: nowJakarta() };
}
