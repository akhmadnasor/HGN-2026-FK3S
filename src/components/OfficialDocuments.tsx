import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ScoringCriterion,
  JudgingStage,
  FinalistWinnerRecord
} from '../types';
import {
  Printer,
  Download,
  X,
  CheckCircle2,
  ClipboardList,
  Award,
  Loader2
} from 'lucide-react';

type Top5FinalistInput = FinalistWinnerRecord & {
  full_name: string;
  school: string;
  innovation_title: string;
};

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
 * PROPORTIONAL LOGO LOADER FOR jsPDF (EXACT ASPECT-RATIO PRESERVATION)
 * ============================================================================ */
interface LoadedPdfImage {
  dataUrl: string;
  format: 'PNG' | 'JPEG';
  naturalWidth: number;
  naturalHeight: number;
}

function measureImageDataUrl(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth || img.width || 100,
        height: img.naturalHeight || img.height || 100
      });
    };
    img.onerror = () => reject(new Error('Failed to measure image dimensions'));
    img.src = dataUrl;
  });
}

async function fetchLogoForPdf(type: 'fk3s' | 'hgn'): Promise<LoadedPdfImage | null> {
  try {
    const res = await fetch(`/api/public/logo-asset?type=${type}`);
    if (!res.ok) return null;
    const json = await res.json();
    const dataUrl: string | undefined = json?.data?.dataUrl;
    const format: 'PNG' | 'JPEG' = json?.data?.format === 'JPEG' ? 'JPEG' : 'PNG';
    if (!dataUrl) return null;
    const dims = await measureImageDataUrl(dataUrl);
    return {
      dataUrl,
      format,
      naturalWidth: dims.width,
      naturalHeight: dims.height
    };
  } catch {
    return null;
  }
}

/**
 * Draws an image strictly preserving its natural aspect ratio (object-contain)
 * centered inside the target slot (slotX, slotY, maxW, maxH) in mm.
 */
function drawProportionalImageInPdf(
  doc: jsPDF,
  img: LoadedPdfImage | null,
  slotX: number,
  slotY: number,
  maxW: number,
  maxH: number
) {
  if (!img || img.naturalWidth <= 0 || img.naturalHeight <= 0) return;
  const aspectRatio = img.naturalWidth / img.naturalHeight;
  let drawW = maxW;
  let drawH = drawW / aspectRatio;
  if (drawH > maxH) {
    drawH = maxH;
    drawW = drawH * aspectRatio;
  }
  const offsetX = slotX + (maxW - drawW) / 2;
  const offsetY = slotY + (maxH - drawH) / 2;
  doc.addImage(img.dataUrl, img.format, offsetX, offsetY, drawW, drawH, undefined, 'FAST');
}

/* ============================================================================
 * 1. PENGUMUMAN RESMI LOMBA UKURAN A4 (LOGO PROPORSIONAL + DOWNLOAD PDF A4)
 * ============================================================================ */
interface OfficialTop5AnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  fk3sLogo: string;
  mainHgnLogo: string;
  organizer?: string;
  top5?: Top5FinalistInput[];
}

async function exportTop5AnnouncementPdf(entries: OfficialFinalistEntry[], organizer: string) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const [fk3sImg, hgnImg] = await Promise.all([
    fetchLogoForPdf('fk3s'),
    fetchLogoForPdf('hgn')
  ]);

  const pageW = doc.internal.pageSize.getWidth(); // 210mm
  const marginX = 16;
  const contentW = pageW - marginX * 2; // 178mm

  // KOP SURAT DENGAN LOGO PROPORSIONAL (OBJECT-CONTAIN)
  const kopTopY = 12;
  const logoSlotW = 22;
  const logoSlotH = 20;

  drawProportionalImageInPdf(doc, fk3sImg, marginX, kopTopY, logoSlotW, logoSlotH);
  drawProportionalImageInPdf(doc, hgnImg, pageW - marginX - logoSlotW, kopTopY, logoSlotW, logoSlotH);

  const centerX = pageW / 2;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('FORUM KELOMPOK KERJA KEPALA SEKOLAH (FK3S)', centerX, kopTopY + 5, { align: 'center' });

  doc.setFontSize(11);
  doc.text('KORWILCAM BIDANG PENDIDIKAN KECAMATAN BEJI', centerX, kopTopY + 10.5, { align: 'center' });

  doc.setTextColor(0, 74, 173);
  doc.setFontSize(10);
  doc.text('PANITIA LOMBA GURU INSPIRATIF HARI GURU NASIONAL (HGN) 2026', centerX, kopTopY + 15.5, { align: 'center' });

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.text(
    'Kecamatan Beji, Kabupaten Pasuruan, Provinsi Jawa Timur 67154  •  #BejolanAji  •  Guru Hebat, Indonesia Kuat',
    centerX,
    kopTopY + 20.5,
    { align: 'center' }
  );

  // Garis Kop Ganda
  const lineY = kopTopY + 23.5;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.9);
  doc.line(marginX, lineY, pageW - marginX, lineY);
  doc.setLineWidth(0.3);
  doc.line(marginX, lineY + 1.2, pageW - marginX, lineY + 1.2);

  // JUDUL & NOMOR PENGUMUMAN
  let cursorY = lineY + 9;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.text('PENGUMUMAN RESMI', centerX, cursorY, { align: 'center' });
  const titleW = doc.getTextWidth('PENGUMUMAN RESMI');
  doc.setLineWidth(0.4);
  doc.line(centerX - titleW / 2, cursorY + 1.1, centerX + titleW / 2, cursorY + 1.1);

  cursorY += 5.5;
  doc.setFont('courier', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Nomor: 421.2 / 05 / FK3S.BJI / HGN / XI / 2026', centerX, cursorY, { align: 'center' });

  cursorY += 6.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(0, 74, 173);
  doc.text('PENETAPAN 5 FINALIS TERBAIK (TOP 5) LOLOS BABAK FINAL', centerX, cursorY, { align: 'center' });
  cursorY += 5;
  doc.text('LOMBA GURU INSPIRATIF HARI GURU NASIONAL TAHUN 2026', centerX, cursorY, { align: 'center' });

  // PARAGRAF PEMBUKA
  cursorY += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  const introText =
    `Berdasarkan hasil penilaian objektif dan rapat pleno Dewan Juri Tahap Penyisihan terhadap seluruh portofolio karya inovasi pembelajaran guru Sekolah Dasar se-Kecamatan Beji, Kabupaten Pasuruan, dengan ini Panitia Pelaksana Peringatan Hari Guru Nasional Tahun 2026 ${organizer} menetapkan 5 (lima) peserta terbaik (Top 5) yang dinyatakan LOLOS KE BABAK FINAL (Presentasi & Wawancara Luring) sebagai berikut:`;
  const introLines = doc.splitTextToSize(introText, contentW);
  doc.text(introLines, marginX, cursorY, { align: 'justify', maxWidth: contentW });
  cursorY += introLines.length * 4.8 + 4;

  // TABEL RESMI 5 FINALIS
  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginX, right: marginX },
    head: [['No.', 'Nama Guru', 'Asal Sekolah', 'Judul Karya Inovasi Pembelajaran']],
    body: entries.map((e) => [String(e.rank), e.full_name, e.school, e.innovation_title]),
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 9.2,
      textColor: [15, 23, 42],
      lineColor: [30, 41, 59],
      lineWidth: 0.25,
      cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
      valign: 'top'
    },
    headStyles: {
      fillColor: [0, 74, 173],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left'
    },
    columnStyles: {
      0: { cellWidth: 11, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 48, fontStyle: 'bold' },
      2: { cellWidth: 38 },
      3: { cellWidth: contentW - 97 }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  cursorY = ((doc as any).lastAutoTable?.finalY || cursorY + 60) + 6;

  // KOTAK KETENTUAN BABAK FINAL
  const ketentuanItems = [
    '1. Kelima finalis wajib mengikuti Babak Final Presentasi & Wawancara Luring di hadapan Dewan Juri (Korwilcam, Pengawas SD, dan Praktisi Pendidikan) sesuai jadwal resmi panitia.',
    '2. Alokasi waktu uji petik setiap finalis adalah 15 menit, terdiri atas 7 menit paparan karya inovasi (berbasis alur STAR & demonstrasi media) serta 8 menit sesi tanya jawab Dewan Juri.',
    '3. Aspek penilaian Babak Final mencakup: Presentasi & Tanya Jawab (20%), Ide Inovasi Pembelajaran (20%), Prinsip Deep Learning (20%), Prinsip Alur STAR (20%), dan Dampak Nyata (20%).',
    '4. Finalis wajib membawa media pembelajaran/alat peraga (fisik maupun digital) serta salinan cetak Modul Ajar untuk verifikasi karya. Keputusan Dewan Juri bersifat mutlak.'
  ];
  const wrappedKetentuan = ketentuanItems.map((line) => doc.splitTextToSize(line, contentW - 8));
  const totalKetLines = wrappedKetentuan.reduce((acc, arr) => acc + arr.length, 0);
  const boxH = 9 + totalKetLines * 4.2 + 3;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, cursorY, contentW, boxH, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.2);
  doc.setTextColor(0, 74, 173);
  doc.text('KETENTUAN PELAKSANAAN TAHAP SELANJUTNYA (BABAK FINAL):', marginX + 4, cursorY + 5.5);

  let kY = cursorY + 10.2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(15, 23, 42);
  wrappedKetentuan.forEach((lines) => {
    doc.text(lines, marginX + 4, kY);
    kY += lines.length * 4.2 + 0.6;
  });

  cursorY += boxH + 6;

  // PENUTUP
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.8);
  const closingText =
    'Demikian pengumuman resmi ini disampaikan untuk diketahui dan dilaksanakan sebagaimana mestinya. Panitia mengucapkan selamat kepada para finalis serta apresiasi setinggi-tingginya kepada seluruh guru inspiratif se-Kecamatan Beji atas dedikasi dan karya inovasinya.';
  const closingLines = doc.splitTextToSize(closingText, contentW);
  doc.text(closingLines, marginX, cursorY, { align: 'justify', maxWidth: contentW });
  cursorY += closingLines.length * 4.6 + 8;

  // BLOK TANDA TANGAN
  const signY = Math.min(cursorY, 248);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(51, 65, 85);
  doc.text('Tembusan Yth.:', marginX, signY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('1. Korwilcam Bidang Pendidikan Kecamatan Beji', marginX, signY + 4.5);
  doc.text('2. Pengawas SD Kecamatan Beji', marginX, signY + 8.8);
  doc.text('3. Seluruh Kepala SD se-Kecamatan Beji', marginX, signY + 13.1);
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Dokumen Resmi Portal Digital HGN 2026 FK3S Kec. Beji', marginX, signY + 20);

  const rightCenterX = pageW - marginX - 38;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text('Beji, 26 November 2026', rightCenterX, signY, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(`Ketua Panitia HGN 2026 / Ketua ${organizer}`, rightCenterX, signY + 4.8, { align: 'center' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('(Stempel & Tanda Tangan Resmi)', rightCenterX, signY + 15.5, { align: 'center' });

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  const sigLabel = 'PANITIA PELAKSANA HGN FK3S KEC. BEJI';
  doc.text(sigLabel, rightCenterX, signY + 25.5, { align: 'center' });
  const sigW = doc.getTextWidth(sigLabel);
  doc.setLineWidth(0.3);
  doc.line(rightCenterX - sigW / 2, signY + 26.5, rightCenterX + sigW / 2, signY + 26.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(71, 85, 105);
  doc.text('Kabupaten Pasuruan • Provinsi Jawa Timur', rightCenterX, signY + 30.5, { align: 'center' });

  doc.save('Pengumuman_Resmi_Top5_Lomba_Guru_Inspiratif_2026_FK3S_Beji_A4.pdf');
}

export const OfficialTop5AnnouncementModal: React.FC<OfficialTop5AnnouncementModalProps> = ({
  isOpen,
  onClose,
  fk3sLogo,
  mainHgnLogo,
  organizer = 'FK3S KEC. BEJI',
  top5
}) => {
  const [exportingPdf, setExportingPdf] = useState(false);
  const [downloadedNotice, setDownloadedNotice] = useState(false);

  if (!isOpen) return null;

  const entries = resolveFinalistEntries(top5);

  const handleDownloadPdf = async () => {
    setExportingPdf(true);
    try {
      await exportTop5AnnouncementPdf(entries, organizer);
      setDownloadedNotice(true);
      setTimeout(() => setDownloadedNotice(false), 3000);
    } finally {
      setExportingPdf(false);
    }
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
        {/* Top Action Toolbar (PDF Only — No Word) */}
        <div className="no-print shrink-0 bg-slate-900 text-white px-4 sm:px-6 py-3 border-b border-slate-700 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <Award className="w-4 h-4 text-[#FFD000] shrink-0" />
            <span className="font-display font-bold text-xs sm:text-sm tracking-wide">
              Pengumuman Resmi Top 5 Finalis — Format PDF A4 ({organizer})
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={exportingPdf}
              onClick={handleDownloadPdf}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FFD000] via-[#FFB800] to-[#FF9000] hover:brightness-105 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap disabled:opacity-60"
            >
              {exportingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>
                {exportingPdf
                  ? 'Menyiapkan PDF A4...'
                  : downloadedNotice
                  ? 'PDF A4 Berhasil Diunduh'
                  : 'Unduh PDF (A4)'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs inline-flex items-center gap-1.5 border border-slate-600 cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5 text-cyan-300" />
              <span>Cetak Langsung</span>
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
                <div className="shrink-0 w-16 sm:w-20 h-16 sm:h-20 flex items-center justify-center">
                  <img
                    src={fk3sLogo}
                    alt="Logo FK3S Kecamatan Beji"
                    referrerPolicy="no-referrer"
                    className="max-h-full max-w-full w-auto h-auto object-contain"
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

                <div className="shrink-0 w-16 sm:w-20 h-16 sm:h-20 flex items-center justify-center">
                  <img
                    src={mainHgnLogo}
                    alt="Logo Resmi HGN 2026"
                    referrerPolicy="no-referrer"
                    className="max-h-full max-w-full w-auto h-auto object-contain"
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
                    Aspek penilaian Babak Final meliputi: <strong>Presentasi &amp; Tanya Jawab (20%)</strong>,{' '}
                    <strong>Ide Inovasi Pembelajaran (20%)</strong>, <strong>Prinsip Deep Learning (20%)</strong>,{' '}
                    <strong>Prinsip Alur STAR (20%)</strong>, dan <strong>Dampak Nyata (20%)</strong>.
                  </li>
                  <li>
                    Finalis wajib membawa media pembelajaran/alat peraga (fisik maupun digital) serta salinan cetak
                    Modul Ajar untuk keperluan verifikasi karya. Keputusan Dewan Juri bersifat mutlak.
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
 * 2. DOWNLOAD RUBRIK PENILAIAN OFFLINE — FORMAT PDF A4 (LOGO PROPORSIONAL)
 *    Khusus Tahap FINAL: Presentasi, Ide Inovasi, Deep Learning, STAR, Dampak Nyata
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

async function exportOfflineRubricPdf(
  stage: JudgingStage,
  criteria: ScoringCriterion[],
  juryName: string,
  juryCategory: string,
  targets: Array<OfflineRubricTarget | null>,
  filename: string
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const [fk3sImg, hgnImg] = await Promise.all([
    fetchLogoForPdf('fk3s'),
    fetchLogoForPdf('hgn')
  ]);

  const pageW = doc.internal.pageSize.getWidth(); // 210mm
  const pageH = doc.internal.pageSize.getHeight(); // 297mm
  const marginX = 12;
  const contentW = pageW - marginX * 2; // 186mm
  const isFinal = stage === 'FINAL';

  const drawRubricHeader = (docRef: jsPDF): number => {
    const topY = 9;
    const slotW = 17;
    const slotH = 15;
    drawProportionalImageInPdf(docRef, fk3sImg, marginX, topY, slotW, slotH);
    drawProportionalImageInPdf(docRef, hgnImg, pageW - marginX - slotW, topY, slotW, slotH);

    const cx = pageW / 2;
    docRef.setTextColor(15, 23, 42);
    docRef.setFont('helvetica', 'bold');
    docRef.setFontSize(10.5);
    docRef.text('FORUM KELOMPOK KERJA KEPALA SEKOLAH (FK3S) KECAMATAN BEJI', cx, topY + 4.2, { align: 'center' });

    docRef.setTextColor(0, 74, 173);
    docRef.setFontSize(9.2);
    docRef.text(
      isFinal
        ? 'LEMBAR RUBRIK PENILAIAN OFFLINE — TAHAP FINAL (PRESENTASI & WAWANCARA)'
        : 'LEMBAR RUBRIK PENILAIAN OFFLINE — TAHAP PENYISIHAN',
      cx,
      topY + 9,
      { align: 'center' }
    );

    docRef.setTextColor(71, 85, 105);
    docRef.setFont('helvetica', 'normal');
    docRef.setFontSize(7.6);
    docRef.text(
      'Lomba Guru Inspiratif Hari Guru Nasional 2026  •  Kabupaten Pasuruan  •  Instrumen Skala Likert (1 – 5)',
      cx,
      topY + 13.4,
      { align: 'center' }
    );

    const lineY = topY + 16.2;
    docRef.setDrawColor(15, 23, 42);
    docRef.setLineWidth(0.75);
    docRef.line(marginX, lineY, pageW - marginX, lineY);
    docRef.setLineWidth(0.25);
    docRef.line(marginX, lineY + 1, pageW - marginX, lineY + 1);
    return lineY + 3.5;
  };

  targets.forEach((target, targetIdx) => {
    if (targetIdx > 0) {
      doc.addPage('a4', 'portrait');
    }

    let y = drawRubricHeader(doc);

    // Identitas Peserta & Juri
    const identityBody: string[][] = [
      [
        'Nama Peserta',
        target?.full_name || '...........................................................',
        'Nama Juri',
        juryName || '........................................'
      ],
      [
        'Asal Sekolah',
        target?.school || '...........................................................',
        'Unsur / Tgl',
        `${juryCategory || '................'} / ...... Nov 2026`
      ],
      [
        'Judul Inovasi',
        target?.innovation_title || '.................................................................................................................',
        '',
        ''
      ]
    ];

    if (isFinal) {
      identityBody.push([
        'Alokasi Final',
        'Total 15 Menit / Finalis: Paparan Presentasi Karya (7 Menit) + Tanya Jawab Dewan Juri (8 Menit)',
        '',
        ''
      ]);
    }

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      body: identityBody.map((row, idx) => {
        if (idx >= 2) {
          return [
            {
              content: row[0],
              styles: {
                fillColor: idx === 3 ? [255, 251, 235] : [241, 245, 249],
                fontStyle: 'bold' as const,
                textColor: idx === 3 ? [146, 64, 14] : [15, 23, 42]
              }
            },
            {
              content: row[1],
              colSpan: 3,
              styles: {
                fillColor: idx === 3 ? [255, 251, 235] : [255, 255, 255],
                fontStyle: idx === 3 ? ('bold' as const) : ('normal' as const)
              }
            }
          ];
        }
        return [
          { content: row[0], styles: { fillColor: [241, 245, 249], fontStyle: 'bold' as const } },
          { content: row[1], styles: { fontStyle: idx === 0 ? ('bold' as const) : ('normal' as const) } },
          { content: row[2], styles: { fillColor: [241, 245, 249], fontStyle: 'bold' as const } },
          { content: row[3] }
        ];
      }),
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 7.8,
        textColor: [15, 23, 42],
        lineColor: [51, 65, 85],
        lineWidth: 0.2,
        cellPadding: { top: 1.8, right: 2.2, bottom: 1.8, left: 2.2 }
      },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 74 },
        2: { cellWidth: 23 },
        3: { cellWidth: contentW - 121 }
      }
    });

    y = ((doc as any).lastAutoTable?.finalY || y + 20) + 2.5;

    // Panduan Skala Likert 1–5
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.25);
    doc.rect(marginX, y, contentW, 7.2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.4);
    doc.setTextColor(15, 23, 42);
    doc.text(
      'Panduan Skala Likert (1–5):  1 = Sangat Kurang (20)  •  2 = Kurang (40)  •  3 = Cukup (60)  •  4 = Baik (80)  •  5 = Sangat Baik (100)',
      marginX + 2.5,
      y + 3.1
    );
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    doc.text(
      'Beri tanda centang (v) atau lingkari satu angka pada setiap indikator. Rumus: Skor Kriteria = (Total Likert / Skor Maks) x 100, lalu dikali Bobot (%).',
      marginX + 2.5,
      y + 6.0
    );
    y += 9.2;

    // Bangun Satu Tabel Rubrik Terpadu yang Rapi (Otomatis Lanjut Halaman Rapi jika Penuh)
    const tableBody: any[] = [];
    criteria.forEach((crit, cIdx) => {
      const inds = parseIndicators(crit.indicators_json);
      const maxPts = inds.length * 5;
      tableBody.push([
        {
          content: `${cIdx + 1}. ${crit.criterion_name}  —  Bobot ${crit.weight_percentage}%  (${inds.length} Indikator, Skor Maks Likert: ${maxPts})`,
          colSpan: 7,
          styles: {
            fillColor: [0, 74, 173],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 7.8,
            cellPadding: { top: 1.8, right: 2.5, bottom: 1.8, left: 2.5 }
          }
        }
      ]);

      inds.forEach((indText, iIdx) => {
        tableBody.push([
          { content: `${cIdx + 1}.${iIdx + 1}`, styles: { halign: 'center', fontStyle: 'bold' } },
          { content: indText },
          { content: '[  ] 1', styles: { halign: 'center', font: 'courier', fontSize: 7.2 } },
          { content: '[  ] 2', styles: { halign: 'center', font: 'courier', fontSize: 7.2 } },
          { content: '[  ] 3', styles: { halign: 'center', font: 'courier', fontSize: 7.2 } },
          { content: '[  ] 4', styles: { halign: 'center', font: 'courier', fontSize: 7.2 } },
          { content: '[  ] 5', styles: { halign: 'center', font: 'courier', fontSize: 7.2 } }
        ]);
      });

      tableBody.push([
        {
          content: `Total Likert (Maks ${maxPts}): ______   |   Skor 0–100 = (Total / ${maxPts}) x 100 : ______`,
          colSpan: 2,
          styles: {
            fillColor: [241, 245, 249],
            fontStyle: 'bold',
            halign: 'right',
            fontSize: 7.2,
            textColor: [30, 41, 59]
          }
        },
        {
          content: `Tertimbang (${crit.weight_percentage}%): _________`,
          colSpan: 5,
          styles: {
            fillColor: [239, 246, 255],
            fontStyle: 'bold',
            halign: 'center',
            fontSize: 7.3,
            textColor: [0, 74, 173]
          }
        }
      ]);
    });

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX, bottom: 12 },
      head: [['No', 'Aspek & Indikator Penilaian', '1', '2', '3', '4', '5']],
      body: tableBody,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 7.4,
        textColor: [15, 23, 42],
        lineColor: [71, 85, 105],
        lineWidth: 0.2,
        cellPadding: { top: 1.35, right: 1.8, bottom: 1.35, left: 1.8 },
        valign: 'middle'
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 7.5
      },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: contentW - 65 },
        2: { cellWidth: 11 },
        3: { cellWidth: 11 },
        4: { cellWidth: 11 },
        5: { cellWidth: 11 },
        6: { cellWidth: 11 }
      }
    });

    y = ((doc as any).lastAutoTable?.finalY || y + 120) + 3;

    // Pastikan blok Total + Catatan + Tanda Tangan tidak terpotong di bawah halaman
    if (y + 42 > pageH - 10) {
      doc.addPage('a4', 'portrait');
      y = 14;
    }

    // Kotak Total Nilai Akhir
    const criteriaSumLabel = criteria.map((_, i) => `K${i + 1}`).join(' + ');
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.45);
    doc.rect(marginX, y, contentW, 8.2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`TOTAL NILAI AKHIR TERTIMBANG (${criteriaSumLabel})  [Skala 0 – 100]`, marginX + 3, y + 5.3);
    doc.setTextColor(0, 74, 173);
    doc.setFontSize(9.5);
    doc.text('_______________ / 100', pageW - marginX - 3, y + 5.4, { align: 'right' });
    y += 10.5;

    // Kotak Catatan Kualitatif
    const halfW = (contentW - 3) / 2;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(71, 85, 105);
    doc.setLineWidth(0.25);
    doc.rect(marginX, y, halfW, 17, 'D');
    doc.rect(marginX + halfW + 3, y, halfW, 17, 'D');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.4);
    doc.setTextColor(15, 23, 42);
    doc.text(
      isFinal ? 'Kelebihan Karya & Paparan (7 Menit):' : 'Kelebihan Karya:',
      marginX + 2.2,
      y + 3.8
    );
    doc.text(
      isFinal ? 'Catatan Tanya Jawab (8 Menit) & Rekomendasi:' : 'Saran Perbaikan & Rekomendasi:',
      marginX + halfW + 5.2,
      y + 3.8
    );
    y += 20;

    // Footer Predikat & Tanda Tangan Juri
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(71, 85, 105);
    doc.text('Predikat: A (>=90 Sangat Inspiratif) • B+ (80–89,99) • B (70–79,99) • C (60–69,99)', marginX, y + 11);

    const signCenterX = pageW - marginX - 34;
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8.2);
    doc.text('Beji, ........ November 2026', signCenterX, y + 1.5, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text('Juri Penilai', signCenterX, y + 5.2, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    const jLabel = juryName || '........................................';
    doc.text(`( ${jLabel} )`, signCenterX, y + 17.5, { align: 'center' });
  });

  doc.save(filename);
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
  const [exportingPdf, setExportingPdf] = useState(false);
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

  const handleDownloadPdf = async () => {
    setExportingPdf(true);
    setDownloadStatus('');
    try {
      const suffix =
        printMode === 'SINGLE' && targetParticipant?.participant_id
          ? targetParticipant.participant_id
          : printMode === 'ALL'
          ? `Bundel_${resolvedTargets.length}_Finalis`
          : 'Master_Kosong';
      const filename = `Rubrik_Penilaian_${stage}_Offline_${suffix}_HGN2026_A4.pdf`;
      await exportOfflineRubricPdf(
        stage,
        activeCriteria,
        juryName,
        juryCategory,
        resolvedTargets,
        filename
      );
      setDownloadStatus('PDF A4 berhasil diunduh');
      setTimeout(() => setDownloadStatus(''), 3000);
    } finally {
      setExportingPdf(false);
    }
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
        {/* Top Controls (PDF Download Only — No Word) */}
        <div className="no-print shrink-0 bg-slate-900 text-white px-4 sm:px-6 py-3 border-b border-slate-700 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <ClipboardList className="w-4 h-4 text-[#FFD000] shrink-0" />
            <span className="font-display font-bold text-xs sm:text-sm">
              Download Rubrik Penilaian Offline (PDF A4) — Tahap {stage === 'FINAL' ? 'FINAL (Top 5)' : 'PENYISIHAN'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={exportingPdf}
              onClick={handleDownloadPdf}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FFD000] via-[#FFB800] to-[#FF9000] hover:brightness-105 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-60"
            >
              {exportingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{exportingPdf ? 'Menyiapkan PDF A4...' : 'Unduh PDF (A4)'}</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs inline-flex items-center gap-1.5 border border-slate-600 cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5 text-cyan-300" />
              <span>Cetak Langsung</span>
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
                Bundel Semua Finalis ({allStageTargets.length} Finalis · PDF A4)
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
              Form Master Kosong (PDF A4)
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
                {/* Compact Kop Surat dengan Logo Proporsional */}
                <div className="flex items-center justify-between gap-3 pb-2.5 border-b-2 border-slate-950 mb-3">
                  <div className="w-14 h-12 shrink-0 flex items-center justify-center">
                    <img
                      src={fk3sLogo}
                      alt="Logo FK3S"
                      referrerPolicy="no-referrer"
                      className="max-h-full max-w-full w-auto h-auto object-contain"
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
                  <div className="w-14 h-12 shrink-0 flex items-center justify-center">
                    <img
                      src={mainHgnLogo}
                      alt="Logo HGN 2026"
                      referrerPolicy="no-referrer"
                      className="max-h-full max-w-full w-auto h-auto object-contain"
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
                              <th className="py-1 px-1.5 border-r border-slate-600 text-center w-8">No</th>
                              <th className="py-1 px-2 border-r border-slate-600 text-left">Indikator Penilaian</th>
                              {[1, 2, 3, 4, 5].map((lv) => (
                                <th
                                  key={lv}
                                  className="py-1 px-1 border-r last:border-r-0 border-slate-600 text-center w-9 font-mono"
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
                                  {cIdx + 1}.{iIdx + 1}
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
                  <span>
                    TOTAL NILAI AKHIR TERTIMBANG ({activeCriteria.map((_, i) => `K${i + 1}`).join(' + ')})
                  </span>
                  <span className="font-mono text-sm">____________ / 100</span>
                </div>

                {/* Qualitative Notes */}
                <div className="grid grid-cols-2 gap-2.5 mt-2.5 text-[10.5px]">
                  <div className="border border-slate-700 p-2 min-h-[54px]">
                    <div className="font-bold text-slate-900">
                      {stage === 'FINAL' ? 'Kelebihan Karya & Paparan (7 Menit):' : 'Kelebihan Karya:'}
                    </div>
                  </div>
                  <div className="border border-slate-700 p-2 min-h-[54px]">
                    <div className="font-bold text-slate-900">
                      {stage === 'FINAL'
                        ? 'Catatan Tanya Jawab (8 Menit) & Rekomendasi:'
                        : 'Saran Perbaikan & Rekomendasi:'}
                    </div>
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
