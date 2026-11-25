import React, { useState } from 'react';
import {
  ScoringCriterion,
  JudgingStage,
  FinalistWinnerRecord
} from '../types';

type Top5FinalistInput = FinalistWinnerRecord & {
  full_name: string;
  school: string;
  innovation_title: string;
};
import {
  Printer,
  Download,
  FileText,
  X,
  CheckCircle2,
  ClipboardList,
  Award
} from 'lucide-react';

export interface OfficialFinalistEntry {
  rank: number;
  participant_id: string;
  full_name: string;
  school: string;
  innovation_title: string;
  approved_score?: number;
}

export const OFFICIAL_TOP_5_FALLBACK: OfficialFinalistEntry[] = [
  {
    rank: 1,
    participant_id: 'HGN26-015',
    full_name: 'Ayu Nur Fitri, S.Pd',
    school: 'SDN Kedungringin IV Beji',
    innovation_title: 'SERASI (Seru Belajar Roda Rasio Interaktif dan Kuis Ratio of Champion)'
  },
  {
    rank: 2,
    participant_id: 'HGN26-025',
    full_name: 'Mohammad Hilfi Azra Dzikrulloh, S.Pd.',
    school: 'SDN Baujeng II Beji',
    innovation_title:
      'PRECISE Learning: Model Pembelajaran Digital Ethno-STEAM Berbasis Cognitive Dissonance dalam Upaya Penguatan Literasi Sains dan Numerasi'
  },
  {
    rank: 3,
    participant_id: 'HGN26-027',
    full_name: 'Rahma Nurani, S.Pd.',
    school: 'SDN Glanggang II Beji',
    innovation_title: 'Jelita: Jelajah Lingkungan, mencari Keliling Bangun Datar'
  },
  {
    rank: 4,
    participant_id: 'HGN26-001',
    full_name: 'Anita Puji Lestari, S.Pd',
    school: 'SDN Gununggangsir II Beji',
    innovation_title: 'Inovasi MPI (Media Pembelajaran Interaktif) PETAMIKA 10'
  },
  {
    rank: 5,
    participant_id: 'HGN26-053',
    full_name: 'Anita Tri Wulandari, S.Pd',
    school: 'SDN Kedungringin II Beji',
    innovation_title: 'INOVASI PEMBELAJARAN MENGGUNAKAN "MEDIA GAME VISUAL BALAP MAJAS"'
  }
];

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseIndicators(indicatorsJson?: string): string[] {
  try {
    const parsed = JSON.parse(indicatorsJson || '[]');
    if (Array.isArray(parsed)) {
      return parsed.map((s) => String(s || '').trim()).filter(Boolean);
    }
    return [];
  } catch {
    return [];
  }
}

function triggerFileDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function resolveFinalistEntries(top5?: Top5FinalistInput[]): OfficialFinalistEntry[] {
  if (Array.isArray(top5) && top5.length > 0) {
    return top5.map((row, idx) => ({
      rank: idx + 1,
      participant_id: row.participant_id,
      full_name: row.full_name,
      school: row.school,
      innovation_title: row.innovation_title,
      approved_score: row.approved_score
    }));
  }
  return OFFICIAL_TOP_5_FALLBACK;
}

/* ============================================================================
 * 1. PENGUMUMAN RESMI LOMBA UKURAN A4 (LOGO PROPORSIONAL + TOP 5 FINALIS)
 * ============================================================================ */
interface OfficialTop5AnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  fk3sLogo: string;
  mainHgnLogo: string;
  organizer?: string;
  top5?: Top5FinalistInput[];
}

function buildAnnouncementWordHtml(
  entries: OfficialFinalistEntry[],
  fk3sLogo: string,
  mainHgnLogo: string
): string {
  const rowsHtml = entries
    .map(
      (item) => `
      <tr>
        <td style="border:1px solid #1e293b;padding:7px 8px;text-align:center;font-weight:bold;">${item.rank}</td>
        <td style="border:1px solid #1e293b;padding:7px 8px;font-weight:bold;">${escapeHtml(item.full_name)}</td>
        <td style="border:1px solid #1e293b;padding:7px 8px;">${escapeHtml(item.school)}</td>
        <td style="border:1px solid #1e293b;padding:7px 8px;">${escapeHtml(item.innovation_title)}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="id" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
<meta charset="utf-8" />
<title>Pengumuman Resmi Top 5 Finalis Lomba Guru Inspiratif 2026 - FK3S Kec. Beji</title>
<style>
  @page { size: A4 portrait; margin: 14mm 16mm; }
  body { font-family: "Times New Roman", Georgia, serif; color: #0f172a; font-size: 11pt; line-height: 1.45; margin: 0; padding: 0; }
  .kop-table { width: 100%; border-collapse: collapse; border-bottom: 3px solid #0f172a; padding-bottom: 6px; }
  .kop-line-2 { border-top: 1px solid #0f172a; margin-top: 2px; margin-bottom: 14px; }
  .title { text-align: center; margin: 10px 0 14px; }
  .title h1 { font-size: 14pt; margin: 0; text-decoration: underline; letter-spacing: 0.5px; }
  .title p { font-size: 10.5pt; margin: 3px 0 0; font-weight: bold; }
  .data-table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10pt; }
  .data-table th { background: #004AAD; color: #ffffff; border: 1px solid #1e293b; padding: 7px 8px; text-align: left; }
  .box { border: 1px solid #334155; background: #f8fafc; padding: 10px 12px; margin: 12px 0; font-size: 10pt; }
  .sign-table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10.5pt; }
</style>
</head>
<body>
  <table class="kop-table">
    <tr>
      <td style="width:74px;text-align:center;vertical-align:middle;">
        <img src="${escapeHtml(fk3sLogo)}" alt="Logo FK3S" style="height:64px;width:auto;max-width:72px;object-fit:contain;" />
      </td>
      <td style="text-align:center;vertical-align:middle;padding:0 8px;">
        <div style="font-size:12pt;font-weight:bold;letter-spacing:0.3px;">FORUM KELOMPOK KERJA KEPALA SEKOLAH (FK3S)</div>
        <div style="font-size:11.5pt;font-weight:bold;">KORWILCAM BIDANG PENDIDIKAN KECAMATAN BEJI</div>
        <div style="font-size:10.5pt;font-weight:bold;color:#004AAD;">PANITIA PELAKSANA LOMBA GURU INSPIRATIF HARI GURU NASIONAL 2026</div>
        <div style="font-size:9pt;color:#475569;margin-top:2px;">Kecamatan Beji, Kabupaten Pasuruan, Provinsi Jawa Timur 67154 • #BejolanAji • Guru Hebat, Indonesia Kuat</div>
      </td>
      <td style="width:74px;text-align:center;vertical-align:middle;">
        <img src="${escapeHtml(mainHgnLogo)}" alt="Logo HGN 2026" style="height:64px;width:auto;max-width:72px;object-fit:contain;" />
      </td>
    </tr>
  </table>
  <div class="kop-line-2"></div>

  <div class="title">
    <h1>PENGUMUMAN RESMI</h1>
    <p>NOMOR: 421.2 / 05 / FK3S.BJI / HGN / XI / 2026</p>
    <p style="margin-top:6px;font-size:11pt;color:#004AAD;">TENTANG PENETAPAN 5 FINALIS TERBAIK (TOP 5) LOLOS BABAK FINAL<br/>LOMBA GURU INSPIRATIF HARI GURU NASIONAL TAHUN 2026</p>
  </div>

  <p style="text-align:justify;margin:0 0 10px;">
    Berdasarkan hasil penilaian objektif Dewan Juri Tahap Penyisihan terhadap seluruh karya praktik baik dan inovasi pembelajaran guru Sekolah Dasar se-Kecamatan Beji pada ajang <strong>Lomba Guru Inspiratif Peringatan Hari Guru Nasional Tahun 2026</strong>, Panitia Pelaksana bersama Dewan Juri menetapkan <strong>5 (lima) peserta terbaik (Top 5)</strong> yang dinyatakan <strong>LOLOS KE BABAK FINAL (Presentasi &amp; Wawancara Luring)</strong> sebagai berikut:
  </p>

  <table class="data-table">
    <thead>
      <tr>
        <th style="width:36px;text-align:center;">No.</th>
        <th style="width:185px;">Nama Guru</th>
        <th style="width:150px;">Asal Sekolah</th>
        <th>Judul Karya Inovasi Pembelajaran</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="box">
    <strong>KETENTUAN PELAKSANAAN BABAK FINAL (PRESENTASI &amp; WAWANCARA):</strong>
    <ol style="margin:6px 0 0;padding-left:18px;">
      <li>Kelima finalis wajib mengikuti tahapan <strong>Babak Final Presentasi &amp; Wawancara Luring</strong> di hadapan Dewan Juri (Korwilcam, Pengawas SD, dan Praktisi Pendidikan) sesuai jadwal resmi panitia FK3S Kecamatan Beji.</li>
      <li>Alokasi waktu uji petik setiap finalis adalah <strong>15 menit</strong>, terdiri atas <strong>7 menit paparan karya inovasi</strong> (berbasis alur STAR &amp; demonstrasi media) dan <strong>8 menit sesi tanya jawab</strong> bersama Dewan Juri.</li>
      <li>Finalis diharapkan membawa perangkat/media pembelajaran (fisik maupun digital) serta salinan cetak Modul Ajar sebagai bahan verifikasi dan pertanggungjawaban karya.</li>
      <li>Keputusan Dewan Juri bersifat objektif, independen, mutlak, dan tidak dapat diganggu gugat.</li>
    </ol>
  </div>

  <p style="text-align:justify;margin:10px 0 0;">
    Demikian pengumuman resmi ini disampaikan. Panitia mengucapkan selamat kepada para finalis yang lolos serta apresiasi setinggi-tingginya kepada seluruh guru inspiratif Kecamatan Beji yang telah berpartisipasi aktif memajukan kualitas pembelajaran.
  </p>

  <table class="sign-table">
    <tr>
      <td style="width:52%;vertical-align:top;font-size:9.5pt;color:#475569;">
        Tembusan Yth.:<br/>
        1. Korwilcam Bidang Pendidikan Kec. Beji<br/>
        2. Pengawas SD Kecamatan Beji<br/>
        3. Seluruh Kepala SD se-Kecamatan Beji
      </td>
      <td style="width:48%;text-align:center;vertical-align:top;">
        Beji, 26 November 2026<br/>
        <strong>Ketua Panitia HGN 2026 / Ketua FK3S Kec. Beji</strong>
        <div style="height:56px;"></div>
        <div style="font-weight:bold;text-decoration:underline;">PANITIA HGN FK3S KEC. BEJI</div>
        <div style="font-size:9pt;color:#475569;">Kabupaten Pasuruan — Provinsi Jawa Timur</div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export const OfficialTop5AnnouncementModal: React.FC<OfficialTop5AnnouncementModalProps> = ({
  isOpen,
  onClose,
  fk3sLogo,
  mainHgnLogo,
  organizer = 'FK3S KEC. BEJI',
  top5
}) => {
  const [downloadedNotice, setDownloadedNotice] = useState(false);

  if (!isOpen) return null;

  const entries = resolveFinalistEntries(top5);

  const handleDownloadDoc = () => {
    const html = buildAnnouncementWordHtml(entries, fk3sLogo, mainHgnLogo);
    triggerFileDownload(
      html,
      'Pengumuman_Resmi_Top5_Lomba_Guru_Inspiratif_2026_FK3S_Beji_A4.doc',
      'application/msword;charset=utf-8'
    );
    setDownloadedNotice(true);
    setTimeout(() => setDownloadedNotice(false), 3000);
  };

  return (
    <div
      className="fixed inset-0 z-[80] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 lg:p-6 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 14mm;
          }
          body * {
            visibility: hidden !important;
          }
          #pengumuman-resmi-a4-print-root,
          #pengumuman-resmi-a4-print-root * {
            visibility: visible !important;
          }
          #pengumuman-resmi-a4-print-root {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: none !important;
            min-height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            z-index: 999999 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="w-full max-w-5xl max-h-[96vh] rounded-3xl bg-white dark:bg-[#0a1122] border-2 border-[#004AAD] dark:border-[#FFB800] shadow-2xl flex flex-col overflow-hidden">
        {/* Top Action Toolbar */}
        <div className="no-print shrink-0 bg-slate-900 text-white px-4 sm:px-6 py-3 border-b border-slate-700 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <Award className="w-4 h-4 text-[#FFD000] shrink-0" />
            <span className="font-display font-bold text-xs sm:text-sm tracking-wide">
              Pengumuman Resmi Top 5 Finalis — Format Cetak A4 ({organizer})
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadDoc}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs inline-flex items-center gap-1.5 border border-slate-600 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-cyan-300" />
              <span>{downloadedNotice ? 'Berhasil Diunduh' : 'Unduh Word (.doc A4)'}</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FFD000] via-[#FFB800] to-[#FF9000] hover:brightness-105 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / Simpan PDF (A4)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <X className="w-3.5 h-3.5" />
              <span>Tutup</span>
            </button>
          </div>
        </div>

        {/* Scrollable A4 Paper Preview */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-200 dark:bg-[#070b14]">
          <div
            id="pengumuman-resmi-a4-print-root"
            className="mx-auto w-full max-w-[794px] min-h-[1040px] bg-white text-slate-950 px-6 py-7 sm:px-11 sm:py-9 shadow-xl border border-slate-300 flex flex-col justify-between print:min-h-0"
          >
            <div>
              {/* KOP SURAT RESMI DENGAN LOGO PROPORSIONAL */}
              <div className="flex items-center justify-between gap-3 sm:gap-5 pb-3 border-b-[3px] border-slate-950">
                <div className="shrink-0 w-16 sm:w-20 flex items-center justify-center">
                  <img
                    src={fk3sLogo}
                    alt="Logo FK3S Kecamatan Beji"
                    referrerPolicy="no-referrer"
                    className="max-h-16 sm:max-h-20 w-auto max-w-full object-contain"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      if (!img.src.includes('/assets/aistudio/logo_fk3s.png')) {
                        img.src = '/assets/aistudio/logo_fk3s.png';
                      }
                    }}
                  />
                </div>

                <div className="flex-1 text-center px-1">
                  <div className="font-display font-black text-xs sm:text-[17px] tracking-wide text-slate-950 leading-tight uppercase">
                    FORUM KELOMPOK KERJA KEPALA SEKOLAH (FK3S)
                  </div>
                  <div className="font-display font-extrabold text-[11px] sm:text-[15px] text-slate-900 leading-tight uppercase mt-0.5">
                    KORWILCAM BIDANG PENDIDIKAN KECAMATAN BEJI
                  </div>
                  <div className="font-display font-black text-[10px] sm:text-[13px] text-[#004AAD] leading-tight uppercase mt-0.5">
                    PANITIA LOMBA GURU INSPIRATIF HARI GURU NASIONAL (HGN) 2026
                  </div>
                  <div className="text-[9px] sm:text-[11px] font-semibold text-slate-600 leading-tight mt-1">
                    Kecamatan Beji, Kabupaten Pasuruan, Provinsi Jawa Timur 67154 · #BejolanAji · Guru Hebat, Indonesia Kuat
                  </div>
                </div>

                <div className="shrink-0 w-16 sm:w-20 flex items-center justify-center">
                  <img
                    src={mainHgnLogo}
                    alt="Logo Resmi HGN 2026"
                    referrerPolicy="no-referrer"
                    className="max-h-16 sm:max-h-20 w-auto max-w-full object-contain"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      if (!img.src.includes('/assets/aistudio/logo_hgn.png')) {
                        img.src = '/assets/aistudio/logo_hgn.png';
                      }
                    }}
                  />
                </div>
              </div>
              <div className="w-full h-[1.5px] bg-slate-950 mt-0.5 mb-5" />

              {/* JUDUL & NOMOR PENGUMUMAN */}
              <div className="text-center mb-5">
                <h1 className="font-display font-black text-lg sm:text-xl tracking-wider text-slate-950 underline underline-offset-4 uppercase">
                  PENGUMUMAN RESMI
                </h1>
                <p className="font-mono font-bold text-xs text-slate-700 mt-1">
                  Nomor: 421.2 / 05 / FK3S.BJI / HGN / XI / 2026
                </p>
                <div className="mt-2.5 text-xs sm:text-sm font-black text-[#004AAD] uppercase leading-snug">
                  PENETAPAN 5 FINALIS TERBAIK (TOP 5) LOLOS BABAK FINAL
                  <br />
                  LOMBA GURU INSPIRATIF HARI GURU NASIONAL TAHUN 2026
                </div>
              </div>

              {/* PARAGRAF PEMBUKA */}
              <p className="text-xs sm:text-[13px] text-slate-900 leading-relaxed text-justify mb-4">
                Berdasarkan hasil penilaian objektif dan rapat pleno Dewan Juri Tahap Penyisihan terhadap seluruh
                portofolio karya inovasi pembelajaran guru Sekolah Dasar se-Kecamatan Beji, Kabupaten Pasuruan, dengan
                ini Panitia Pelaksana Peringatan Hari Guru Nasional Tahun 2026 <strong>{organizer}</strong> menetapkan{' '}
                <strong>5 (lima) peserta terbaik (Top 5)</strong> yang dinyatakan{' '}
                <strong>LOLOS KE BABAK FINAL (Presentasi &amp; Wawancara Luring)</strong> sebagai berikut:
              </p>

              {/* TABEL RESMI 5 FINALIS LOLOS */}
              <div className="border border-slate-900 overflow-hidden mb-4">
                <table className="w-full border-collapse text-left text-[11px] sm:text-xs">
                  <thead>
                    <tr className="bg-[#004AAD] text-white">
                      <th className="py-2 px-2.5 border-r border-slate-300 text-center w-10 font-bold">No.</th>
                      <th className="py-2 px-3 border-r border-slate-300 w-[28%] font-bold">Nama Guru</th>
                      <th className="py-2 px-3 border-r border-slate-300 w-[23%] font-bold">Asal Sekolah</th>
                      <th className="py-2 px-3 font-bold">Judul Karya Inovasi Pembelajaran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {entries.map((item, idx) => (
                      <tr key={item.participant_id} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                        <td className="py-2.5 px-2.5 border-r border-slate-800 text-center font-mono font-black text-slate-950 align-top">
                          {item.rank}
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-800 font-extrabold text-slate-950 align-top">
                          {item.full_name}
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-800 font-semibold text-slate-800 align-top">
                          {item.school}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900 leading-snug align-top">
                          {item.innovation_title}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* KETENTUAN TAHAP FINAL */}
              <div className="border border-slate-400 bg-slate-50 p-3.5 mb-4 text-[11px] sm:text-xs text-slate-900 space-y-1.5">
                <div className="font-display font-black text-[#004AAD] uppercase tracking-wide text-[11px]">
                  Ketentuan Pelaksanaan Tahap Selanjutnya (Babak Final):
                </div>
                <ol className="list-decimal pl-5 space-y-1 leading-snug">
                  <li>
                    Kelima finalis wajib mengikuti <strong>Babak Final Presentasi &amp; Wawancara Luring</strong> di
                    hadapan Dewan Juri (Korwilcam, Pengawas SD, dan Praktisi Pendidikan) sesuai jadwal resmi panitia.
                  </li>
                  <li>
                    Setiap finalis mendapatkan alokasi waktu total <strong>15 menit</strong>, terdiri atas{' '}
                    <strong>7 menit paparan karya inovasi</strong> (berbasis alur STAR dan demonstrasi media) serta{' '}
                    <strong>8 menit sesi tanya jawab</strong> bersama Dewan Juri.
                  </li>
                  <li>
                    Finalis wajib membawa media pembelajaran/alat peraga (fisik maupun digital) serta salinan cetak
                    Modul Ajar untuk keperluan verifikasi dan pertanggungjawaban karya.
                  </li>
                  <li>
                    Keputusan Dewan Juri bersifat independen, objektif, mutlak, dan tidak dapat diganggu gugat.
                  </li>
                </ol>
              </div>

              <p className="text-xs sm:text-[13px] text-slate-900 leading-relaxed text-justify">
                Demikian pengumuman resmi ini disampaikan untuk diketahui dan dilaksanakan sebagaimana mestinya.
                Panitia mengucapkan selamat kepada para finalis serta penghargaan setinggi-tingginya kepada seluruh
                guru inspiratif se-Kecamatan Beji atas dedikasi dan karya inovasinya.
              </p>
            </div>

            {/* BLOK PENGESAHAN / TANDA TANGAN */}
            <div className="grid grid-cols-2 gap-6 items-end pt-6 mt-4">
              <div className="text-[10px] sm:text-[11px] text-slate-700 leading-relaxed">
                <div className="font-bold text-slate-900 mb-0.5">Tembusan Yth.:</div>
                <div>1. Korwilcam Bidang Pendidikan Kecamatan Beji</div>
                <div>2. Pengawas SD Kecamatan Beji</div>
                <div>3. Seluruh Kepala SD se-Kecamatan Beji</div>
                <div className="mt-2 font-mono text-[9.5px] text-slate-500">
                  Dokumen Resmi Portal Digital HGN 2026 FK3S Kec. Beji
                </div>
              </div>

              <div className="text-center text-xs text-slate-950">
                <div>Beji, 26 November 2026</div>
                <div className="font-bold mt-0.5">Ketua Panitia HGN 2026 / Ketua {organizer}</div>
                <div className="h-14 sm:h-16 flex items-center justify-center">
                  <span className="text-[10px] font-mono text-slate-400 italic">
                    (Stempel &amp; Tanda Tangan Resmi)
                  </span>
                </div>
                <div className="font-black underline underline-offset-2 uppercase">
                  PANITIA PELAKSANA HGN FK3S KEC. BEJI
                </div>
                <div className="text-[10px] text-slate-600 mt-0.5">
                  Kabupaten Pasuruan · Provinsi Jawa Timur
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * 2. DOWNLOAD & CETAK RUBRIK PENILAIAN OFFLINE (UKURAN A4 — TAHAP FINAL / PENYISIHAN)
 * ============================================================================ */
export interface OfflineRubricTarget {
  participant_id?: string;
  full_name?: string;
  school?: string;
  innovation_title?: string;
}

interface OfflineRubricModalProps {
  isOpen: boolean;
  onClose: () => void;
  stage: JudgingStage;
  criteria: ScoringCriterion[];
  juryName?: string;
  juryCategory?: string;
  fk3sLogo: string;
  mainHgnLogo: string;
  targetParticipant?: OfflineRubricTarget | null;
  allStageTargets?: OfflineRubricTarget[];
}

function buildSingleRubricHtmlBody(
  stage: JudgingStage,
  criteria: ScoringCriterion[],
  juryName: string,
  juryCategory: string,
  fk3sLogo: string,
  mainHgnLogo: string,
  target: OfflineRubricTarget | null,
  pageBreakAfter: boolean
): string {
  const isFinal = stage === 'FINAL';
  const stageTitle = isFinal
    ? 'LEMBAR PENILAIAN & RUBRIK PENJURIAN OFFLINE — TAHAP FINAL (PRESENTASI & WAWANCARA)'
    : 'LEMBAR PENILAIAN & RUBRIK PENJURIAN OFFLINE — TAHAP PENYISIHAN';

  const criteriaBlocks = criteria
    .map((crit, cIdx) => {
      const inds = parseIndicators(crit.indicators_json);
      const maxPts = inds.length * 5;
      const indRows = inds
        .map(
          (indText, iIdx) => `
          <tr>
            <td style="border:1px solid #334155;padding:4px 6px;text-align:center;width:26px;">${iIdx + 1}</td>
            <td style="border:1px solid #334155;padding:4px 6px;">${escapeHtml(indText)}</td>
            <td style="border:1px solid #334155;padding:4px 4px;text-align:center;width:28px;">☐ 1</td>
            <td style="border:1px solid #334155;padding:4px 4px;text-align:center;width:28px;">☐ 2</td>
            <td style="border:1px solid #334155;padding:4px 4px;text-align:center;width:28px;">☐ 3</td>
            <td style="border:1px solid #334155;padding:4px 4px;text-align:center;width:28px;">☐ 4</td>
            <td style="border:1px solid #334155;padding:4px 4px;text-align:center;width:28px;">☐ 5</td>
          </tr>`
        )
        .join('');

      return `
        <div style="margin-bottom:10px;page-break-inside:avoid;">
          <div style="background:#004AAD;color:#ffffff;padding:5px 8px;font-weight:bold;font-size:9.5pt;">
            ${cIdx + 1}. ${escapeHtml(crit.criterion_name)} — Bobot ${crit.weight_percentage}% (${inds.length} Indikator, Skor Maks Likert: ${maxPts})
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:8.8pt;">
            <thead>
              <tr style="background:#f1f5f9;">
                <th style="border:1px solid #334155;padding:4px 6px;text-align:center;">No</th>
                <th style="border:1px solid #334155;padding:4px 6px;text-align:left;">Indikator Penilaian</th>
                <th style="border:1px solid #334155;padding:4px 3px;text-align:center;">1</th>
                <th style="border:1px solid #334155;padding:4px 3px;text-align:center;">2</th>
                <th style="border:1px solid #334155;padding:4px 3px;text-align:center;">3</th>
                <th style="border:1px solid #334155;padding:4px 3px;text-align:center;">4</th>
                <th style="border:1px solid #334155;padding:4px 3px;text-align:center;">5</th>
              </tr>
            </thead>
            <tbody>
              ${indRows}
              <tr style="background:#f8fafc;font-weight:bold;">
                <td colspan="2" style="border:1px solid #334155;padding:5px 6px;text-align:right;">
                  Total Poin Likert (Maks ${maxPts}): _______ &nbsp;|&nbsp; Skor Konversi (0–100) = (Total ÷ ${maxPts}) × 100 : _______
                </td>
                <td colspan="5" style="border:1px solid #334155;padding:5px 6px;text-align:center;">
                  Tertimbang (${crit.weight_percentage}%): _________
                </td>
              </tr>
            </tbody>
          </table>
        </div>`;
    })
    .join('');

  return `
    <div style="${pageBreakAfter ? 'page-break-after:always;' : ''}">
      <table style="width:100%;border-collapse:collapse;border-bottom:2.5px solid #0f172a;margin-bottom:6px;">
        <tr>
          <td style="width:58px;text-align:center;vertical-align:middle;padding-bottom:4px;">
            <img src="${escapeHtml(fk3sLogo)}" alt="Logo FK3S" style="height:48px;width:auto;max-width:56px;object-fit:contain;" />
          </td>
          <td style="text-align:center;vertical-align:middle;padding-bottom:4px;">
            <div style="font-size:10.5pt;font-weight:bold;">FORUM KELOMPOK KERJA KEPALA SEKOLAH (FK3S) KECAMATAN BEJI</div>
            <div style="font-size:9.5pt;font-weight:bold;color:#004AAD;">${stageTitle}</div>
            <div style="font-size:8.2pt;color:#475569;">Lomba Guru Inspiratif Hari Guru Nasional 2026 · Kab. Pasuruan · Skala Likert 1–5</div>
          </td>
          <td style="width:58px;text-align:center;vertical-align:middle;padding-bottom:4px;">
            <img src="${escapeHtml(mainHgnLogo)}" alt="Logo HGN" style="height:48px;width:auto;max-width:56px;object-fit:contain;" />
          </td>
        </tr>
      </table>

      <table style="width:100%;border-collapse:collapse;font-size:9pt;margin-bottom:8px;">
        <tr>
          <td style="border:1px solid #334155;padding:4px 7px;width:18%;background:#f8fafc;font-weight:bold;">Nama Peserta</td>
          <td style="border:1px solid #334155;padding:4px 7px;width:36%;font-weight:bold;">${target?.full_name ? escapeHtml(target.full_name) : '...................................................'}</td>
          <td style="border:1px solid #334155;padding:4px 7px;width:16%;background:#f8fafc;font-weight:bold;">Nama Juri</td>
          <td style="border:1px solid #334155;padding:4px 7px;width:30%;">${juryName ? escapeHtml(juryName) : '........................................'}</td>
        </tr>
        <tr>
          <td style="border:1px solid #334155;padding:4px 7px;background:#f8fafc;font-weight:bold;">Asal Sekolah</td>
          <td style="border:1px solid #334155;padding:4px 7px;">${target?.school ? escapeHtml(target.school) : '...................................................'}</td>
          <td style="border:1px solid #334155;padding:4px 7px;background:#f8fafc;font-weight:bold;">Unsur / Tanggal</td>
          <td style="border:1px solid #334155;padding:4px 7px;">${juryCategory ? escapeHtml(juryCategory) : '.....................'} / .... Nov 2026</td>
        </tr>
        <tr>
          <td style="border:1px solid #334155;padding:4px 7px;background:#f8fafc;font-weight:bold;">Judul Inovasi</td>
          <td colspan="3" style="border:1px solid #334155;padding:4px 7px;">${target?.innovation_title ? escapeHtml(target.innovation_title) : '........................................................................................................................'}</td>
        </tr>
        ${
          isFinal
            ? `<tr>
                <td style="border:1px solid #334155;padding:4px 7px;background:#fffbeb;font-weight:bold;">Alokasi Final</td>
                <td colspan="3" style="border:1px solid #334155;padding:4px 7px;background:#fffbeb;"><strong>Total 15 Menit:</strong> Paparan Presentasi Karya (7 Menit) + Tanya Jawab Dewan Juri (8 Menit)</td>
              </tr>`
            : ''
        }
      </table>

      <div style="border:1px solid #94a3b8;background:#f8fafc;padding:5px 8px;font-size:8.2pt;margin-bottom:8px;">
        <strong>Panduan Skala Likert (1–5):</strong>
        <strong>1</strong> = Sangat Kurang (20) &nbsp;·&nbsp;
        <strong>2</strong> = Kurang (40) &nbsp;·&nbsp;
        <strong>3</strong> = Cukup (60) &nbsp;·&nbsp;
        <strong>4</strong> = Baik (80) &nbsp;·&nbsp;
        <strong>5</strong> = Sangat Baik (100).
        Beri tanda centang (✓) atau lingkari satu angka pada setiap indikator.
      </div>

      ${criteriaBlocks}

      <table style="width:100%;border-collapse:collapse;font-size:9pt;margin-top:6px;">
        <tr>
          <td style="border:1px solid #0f172a;padding:6px 8px;background:#eff6ff;font-weight:bold;width:65%;">
            TOTAL NILAI AKHIR TERTIMBANG (K1 + K2 + K3) &nbsp;&nbsp;[Skala 0 – 100]
          </td>
          <td style="border:1px solid #0f172a;padding:6px 8px;text-align:center;font-weight:bold;font-size:11pt;width:35%;">
            ____________ / 100
          </td>
        </tr>
      </table>

      <table style="width:100%;border-collapse:collapse;font-size:8.5pt;margin-top:8px;">
        <tr>
          <td style="border:1px solid #334155;padding:5px 7px;width:50%;height:46px;vertical-align:top;"><strong>Kelebihan Karya &amp; Paparan (7m):</strong></td>
          <td style="border:1px solid #334155;padding:5px 7px;width:50%;height:46px;vertical-align:top;"><strong>Catatan Tanya Jawab (8m) &amp; Rekomendasi:</strong></td>
        </tr>
      </table>

      <table style="width:100%;border-collapse:collapse;margin-top:10px;font-size:9pt;">
        <tr>
          <td style="width:60%;vertical-align:bottom;font-size:8pt;color:#475569;">
            Predikat: A (≥90 Sangat Inspiratif) · B+ (80–89,99) · B (70–79,99) · C (60–69,99)
          </td>
          <td style="width:40%;text-align:center;">
            Beji, ........ November 2026<br/>
            <strong>Juri Penilai</strong>
            <div style="height:36px;"></div>
            ( ${juryName ? escapeHtml(juryName) : '........................................'} )
          </td>
        </tr>
      </table>
    </div>`;
}

function buildOfflineRubricDocument(
  stage: JudgingStage,
  criteria: ScoringCriterion[],
  juryName: string,
  juryCategory: string,
  fk3sLogo: string,
  mainHgnLogo: string,
  targets: Array<OfflineRubricTarget | null>
): string {
  const pages = targets
    .map((t, idx) =>
      buildSingleRubricHtmlBody(
        stage,
        criteria,
        juryName,
        juryCategory,
        fk3sLogo,
        mainHgnLogo,
        t,
        idx < targets.length - 1
      )
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="id" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
<meta charset="utf-8" />
<title>Rubrik Penilaian Offline ${stage} - Lomba Guru Inspiratif 2026 FK3S Kec. Beji</title>
<style>
  @page { size: A4 portrait; margin: 10mm 12mm; }
  body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; padding: 0; }
</style>
</head>
<body>
${pages}
</body>
</html>`;
}

export const OfflineRubricModal: React.FC<OfflineRubricModalProps> = ({
  isOpen,
  onClose,
  stage,
  criteria,
  juryName = '',
  juryCategory = '',
  fk3sLogo,
  mainHgnLogo,
  targetParticipant = null,
  allStageTargets = []
}) => {
  const [printMode, setPrintMode] = useState<'SINGLE' | 'BLANK' | 'ALL'>(
    targetParticipant ? 'SINGLE' : allStageTargets.length > 0 ? 'ALL' : 'BLANK'
  );
  const [downloadStatus, setDownloadStatus] = useState('');

  if (!isOpen) return null;

  const activeCriteria = [...criteria]
    .filter((c) => c.stage === stage && c.active !== false)
    .sort((a, b) => Number(a.display_order) - Number(b.display_order));

  const resolvedTargets: Array<OfflineRubricTarget | null> =
    printMode === 'SINGLE' && targetParticipant
      ? [targetParticipant]
      : printMode === 'ALL' && allStageTargets.length > 0
      ? allStageTargets
      : [null];

  const handleDownloadFile = (format: 'DOC' | 'HTML') => {
    const html = buildOfflineRubricDocument(
      stage,
      activeCriteria,
      juryName,
      juryCategory,
      fk3sLogo,
      mainHgnLogo,
      resolvedTargets
    );
    const suffix =
      printMode === 'SINGLE' && targetParticipant?.participant_id
        ? targetParticipant.participant_id
        : printMode === 'ALL'
        ? `Bundel_${resolvedTargets.length}_Finalis`
        : 'Master_Kosong';
    const ext = format === 'DOC' ? 'doc' : 'html';
    const mime = format === 'DOC' ? 'application/msword;charset=utf-8' : 'text/html;charset=utf-8';
    triggerFileDownload(html, `Rubrik_Penilaian_${stage}_Offline_${suffix}_HGN2026.${ext}`, mime);
    setDownloadStatus(`File .${ext} berhasil diunduh`);
    setTimeout(() => setDownloadStatus(''), 3000);
  };

  return (
    <div
      className="fixed inset-0 z-[85] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 lg:p-6 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          body * {
            visibility: hidden !important;
          }
          #offline-rubric-a4-print-root,
          #offline-rubric-a4-print-root * {
            visibility: visible !important;
          }
          #offline-rubric-a4-print-root {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
            z-index: 999999 !important;
          }
          .rubric-page-break {
            page-break-after: always !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="w-full max-w-5xl max-h-[96vh] rounded-3xl bg-white dark:bg-[#0a1122] border-2 border-[#004AAD] dark:border-[#FFB800] shadow-2xl flex flex-col overflow-hidden">
        {/* Top Controls */}
        <div className="no-print shrink-0 bg-slate-900 text-white px-4 sm:px-6 py-3 border-b border-slate-700 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <ClipboardList className="w-4 h-4 text-[#FFD000] shrink-0" />
            <span className="font-display font-bold text-xs sm:text-sm">
              Download Rubrik Penilaian Offline — Tahap {stage === 'FINAL' ? 'FINAL (Top 5)' : 'PENYISIHAN'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleDownloadFile('DOC')}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Word (.doc)</span>
            </button>
            <button
              type="button"
              onClick={() => handleDownloadFile('HTML')}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs inline-flex items-center gap-1.5 border border-slate-600 cursor-pointer whitespace-nowrap"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-300" />
              <span>Unduh Offline (.html)</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FFD000] via-[#FFB800] to-[#FF9000] hover:brightness-105 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / PDF A4</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <X className="w-3.5 h-3.5" />
              <span>Tutup</span>
            </button>
          </div>
        </div>

        {/* Mode Switcher Bar */}
        <div className="no-print shrink-0 bg-slate-100 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-800 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {targetParticipant && (
              <button
                type="button"
                onClick={() => setPrintMode('SINGLE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  printMode === 'SINGLE'
                    ? 'bg-[#004AAD] text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                }`}
              >
                Peserta Ini ({targetParticipant.full_name})
              </button>
            )}
            {allStageTargets.length > 0 && (
              <button
                type="button"
                onClick={() => setPrintMode('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  printMode === 'ALL'
                    ? 'bg-[#004AAD] text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                }`}
              >
                Bundel Semua Finalis ({allStageTargets.length} Lembar A4)
              </button>
            )}
            <button
              type="button"
              onClick={() => setPrintMode('BLANK')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                printMode === 'BLANK'
                  ? 'bg-[#004AAD] text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
              }`}
            >
              Form Master Kosong (1 Lembar A4)
            </button>
          </div>

          {downloadStatus && (
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>{downloadStatus}</span>
            </div>
          )}
        </div>

        {/* Printable Sheets Preview */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-200 dark:bg-[#070b14]">
          <div id="offline-rubric-a4-print-root" className="space-y-6 print:space-y-0">
            {resolvedTargets.map((target, tIdx) => (
              <div
                key={target?.participant_id || `blank-${tIdx}`}
                className={`mx-auto w-full max-w-[794px] bg-white text-slate-950 px-5 py-6 sm:px-8 sm:py-7 shadow-xl border border-slate-300 print:border-none print:shadow-none print:p-0 ${
                  tIdx < resolvedTargets.length - 1 ? 'rubric-page-break' : ''
                }`}
              >
                {/* Compact Kop Surat */}
                <div className="flex items-center justify-between gap-3 pb-2.5 border-b-2 border-slate-950 mb-3">
                  <div className="w-14 shrink-0 flex items-center justify-center">
                    <img
                      src={fk3sLogo}
                      alt="Logo FK3S"
                      referrerPolicy="no-referrer"
                      className="max-h-12 w-auto object-contain"
                    />
                  </div>
                  <div className="flex-1 text-center">
                    <div className="font-display font-black text-xs sm:text-sm uppercase text-slate-950 leading-tight">
                      FORUM KELOMPOK KERJA KEPALA SEKOLAH (FK3S) KECAMATAN BEJI
                    </div>
                    <div className="font-display font-black text-[11px] sm:text-xs uppercase text-[#004AAD] leading-tight mt-0.5">
                      {stage === 'FINAL'
                        ? 'LEMBAR RUBRIK PENILAIAN OFFLINE — TAHAP FINAL (PRESENTASI & WAWANCARA)'
                        : 'LEMBAR RUBRIK PENILAIAN OFFLINE — TAHAP PENYISIHAN'}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-600 mt-0.5">
                      Lomba Guru Inspiratif Hari Guru Nasional 2026 · Kab. Pasuruan · Skala Likert 1–5
                    </div>
                  </div>
                  <div className="w-14 shrink-0 flex items-center justify-center">
                    <img
                      src={mainHgnLogo}
                      alt="Logo HGN 2026"
                      referrerPolicy="no-referrer"
                      className="max-h-12 w-auto object-contain"
                    />
                  </div>
                </div>

                {/* Identity Grid */}
                <table className="w-full border-collapse text-[11px] mb-3 border border-slate-800">
                  <tbody>
                    <tr>
                      <td className="border border-slate-700 bg-slate-100 px-2.5 py-1.5 font-bold w-[18%]">
                        Nama Peserta
                      </td>
                      <td className="border border-slate-700 px-2.5 py-1.5 font-extrabold w-[35%]">
                        {target?.full_name || '.....................................................'}
                      </td>
                      <td className="border border-slate-700 bg-slate-100 px-2.5 py-1.5 font-bold w-[17%]">
                        Nama Juri
                      </td>
                      <td className="border border-slate-700 px-2.5 py-1.5 font-bold w-[30%]">
                        {juryName || '..........................................'}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-700 bg-slate-100 px-2.5 py-1.5 font-bold">
                        Asal Sekolah
                      </td>
                      <td className="border border-slate-700 px-2.5 py-1.5 font-semibold">
                        {target?.school || '.....................................................'}
                      </td>
                      <td className="border border-slate-700 bg-slate-100 px-2.5 py-1.5 font-bold">
                        Unsur / Tgl
                      </td>
                      <td className="border border-slate-700 px-2.5 py-1.5">
                        {juryCategory || '...................'} / .... Nov 2026
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-700 bg-slate-100 px-2.5 py-1.5 font-bold">
                        Judul Inovasi
                      </td>
                      <td colSpan={3} className="border border-slate-700 px-2.5 py-1.5 font-semibold">
                        {target?.innovation_title ||
                          '................................................................................................................'}
                      </td>
                    </tr>
                    {stage === 'FINAL' && (
                      <tr className="bg-amber-50">
                        <td className="border border-slate-700 px-2.5 py-1.5 font-black text-amber-900">
                          Alokasi Final
                        </td>
                        <td colSpan={3} className="border border-slate-700 px-2.5 py-1.5 font-bold text-slate-900">
                          Total 15 Menit per Finalis: Paparan Karya Inovasi (7 Menit) + Tanya Jawab Dewan Juri (8 Menit)
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Likert Legend */}
                <div className="border border-slate-400 bg-slate-50 px-3 py-1.5 text-[10.5px] text-slate-800 mb-3">
                  <strong>Panduan Skala Likert (1–5):</strong>{' '}
                  <strong>1</strong> = Sangat Kurang (20) · <strong>2</strong> = Kurang (40) ·{' '}
                  <strong>3</strong> = Cukup (60) · <strong>4</strong> = Baik (80) ·{' '}
                  <strong>5</strong> = Sangat Baik (100). Centang (✓) atau lingkari satu skor per indikator.
                </div>

                {/* Criteria Rubric Tables */}
                <div className="space-y-2.5">
                  {activeCriteria.map((crit, cIdx) => {
                    const inds = parseIndicators(crit.indicators_json);
                    const maxPts = inds.length * 5;
                    return (
                      <div key={crit.criterion_id} className="border border-slate-800">
                        <div className="bg-[#004AAD] text-white px-2.5 py-1 text-[11px] font-bold flex items-center justify-between gap-2">
                          <span>
                            {cIdx + 1}. {crit.criterion_name}
                          </span>
                          <span className="font-mono text-[10px]">
                            Bobot {crit.weight_percentage}% · {inds.length} Indikator (Maks {maxPts})
                          </span>
                        </div>
                        <table className="w-full border-collapse text-[10.5px]">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-700">
                              <th className="py-1 px-1.5 border-r border-slate-600 text-center w-7">No</th>
                              <th className="py-1 px-2 border-r border-slate-600 text-left">Indikator Penilaian</th>
                              {[1, 2, 3, 4, 5].map((lv) => (
                                <th
                                  key={lv}
                                  className="py-1 px-1 border-r last:border-r-0 border-slate-600 text-center w-8 font-mono"
                                >
                                  {lv}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-400">
                            {inds.map((indText, iIdx) => (
                              <tr key={`${crit.criterion_id}-${iIdx}`}>
                                <td className="py-1 px-1.5 border-r border-slate-600 text-center font-mono">
                                  {iIdx + 1}
                                </td>
                                <td className="py-1 px-2 border-r border-slate-600 leading-snug">{indText}</td>
                                {[1, 2, 3, 4, 5].map((lv) => (
                                  <td
                                    key={lv}
                                    className="py-1 px-1 border-r last:border-r-0 border-slate-600 text-center font-mono text-slate-600"
                                  >
                                    ☐ {lv}
                                  </td>
                                ))}
                              </tr>
                            ))}
                            <tr className="bg-slate-50 font-bold text-[10px]">
                              <td colSpan={2} className="py-1.5 px-2 border-r border-slate-600 text-right">
                                Total Likert (Maks {maxPts}): ______ &nbsp;|&nbsp; Skor 0–100 = (Total ÷ {maxPts}) × 100 :
                                ______
                              </td>
                              <td colSpan={5} className="py-1.5 px-2 text-center font-mono">
                                Tertimbang ({crit.weight_percentage}%): ________
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>

                {/* Final Total Box */}
                <div className="mt-3 border-2 border-slate-900 bg-blue-50/70 px-3 py-2 flex items-center justify-between text-xs font-black">
                  <span>TOTAL NILAI AKHIR TERTIMBANG (KRITERIA 1 + 2 + 3)</span>
                  <span className="font-mono text-sm">____________ / 100</span>
                </div>

                {/* Qualitative Notes */}
                <div className="grid grid-cols-2 gap-2.5 mt-2.5 text-[10.5px]">
                  <div className="border border-slate-700 p-2 min-h-[58px]">
                    <div className="font-bold text-slate-900">Kelebihan Karya &amp; Paparan (7 Menit):</div>
                  </div>
                  <div className="border border-slate-700 p-2 min-h-[58px]">
                    <div className="font-bold text-slate-900">Catatan Tanya Jawab (8 Menit) &amp; Rekomendasi:</div>
                  </div>
                </div>

                {/* Signature Footer */}
                <div className="flex items-end justify-between mt-3 pt-1 text-[10.5px]">
                  <div className="text-[9.5px] text-slate-600">
                    Predikat: A (≥90 Sangat Inspiratif) · B+ (80–89,99) · B (70–79,99) · C (60–69,99)
                  </div>
                  <div className="text-center min-w-[200px]">
                    <div>Beji, ......... November 2026</div>
                    <div className="font-bold">Juri Penilai</div>
                    <div className="h-9" />
                    <div className="font-bold underline">
                      {juryName || '........................................'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
