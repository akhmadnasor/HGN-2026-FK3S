export interface EmbedResolution {
  canEmbed: boolean;
  embedUrl: string;
  directUrl: string;
  provider: 'YOUTUBE' | 'GOOGLE_DRIVE_FILE' | 'GOOGLE_DRIVE_FOLDER' | 'GOOGLE_DOCS' | 'EXTERNAL' | 'NONE';
  notice: string;
}

/**
 * Safely validates and transforms external URLs into trusted embeddable preview URLs
 * without pretending a generic Google Drive folder is a directly playable video file.
 */
export function resolveSafeEmbed(rawUrl: string | undefined | null, expectedType: 'VIDEO' | 'DOCUMENT' | 'FOLDER'): EmbedResolution {
  const clean = String(rawUrl || '').trim();
  if (!clean || !/^https?:\/\//i.test(clean)) {
    return {
      canEmbed: false,
      embedUrl: '',
      directUrl: '',
      provider: 'NONE',
      notice: 'Tautan belum tersedia untuk dokumen ini. Silakan periksa tab Folder Google Drive utama.'
    };
  }

  try {
    const parsed = new URL(clean);
    const host = parsed.hostname.toLowerCase();

    // 1. YouTube links
    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      let videoId = '';
      if (host.includes('youtu.be')) {
        videoId = parsed.pathname.replace('/', '').split('/')[0];
      } else if (parsed.pathname.startsWith('/shorts/')) {
        videoId = parsed.pathname.replace('/shorts/', '').split('/')[0];
      } else if (parsed.pathname.startsWith('/embed/')) {
        videoId = parsed.pathname.replace('/embed/', '').split('/')[0];
      } else {
        videoId = parsed.searchParams.get('v') || '';
      }

      if (videoId && /^[a-zA-Z0-9_-]{6,20}$/.test(videoId)) {
        return {
          canEmbed: true,
          embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0`,
          directUrl: clean,
          provider: 'YOUTUBE',
          notice: 'Pratinjau Video YouTube Resmi'
        };
      }
    }

    // 2. Google Drive Folder links
    if (host.includes('drive.google.com') && (parsed.pathname.includes('/drive/folders/') || parsed.pathname.includes('/drive/u/'))) {
      const match = parsed.pathname.match(/\/folders\/([a-zA-Z0-9_-]+)/);
      const folderId = match ? match[1] : '';

      if (expectedType === 'VIDEO') {
        return {
          canEmbed: false,
          embedUrl: '',
          directUrl: clean,
          provider: 'GOOGLE_DRIVE_FOLDER',
          notice: 'Tautan yang diberikan adalah Folder Google Drive, bukan file video langsung. Klik tombol "Buka Folder Google Drive" untuk memutar video di dalam folder.'
        };
      }

      if (folderId) {
        return {
          canEmbed: true,
          embedUrl: `https://drive.google.com/embeddedfolderview?id=${folderId}#list`,
          directUrl: clean,
          provider: 'GOOGLE_DRIVE_FOLDER',
          notice: 'Pratinjau Daftar Isi Folder Google Drive'
        };
      }
    }

    // 3. Google Drive individual file (/file/d/FILE_ID/...)
    if (host.includes('drive.google.com')) {
      const fileMatch = parsed.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      const idParam = parsed.searchParams.get('id');
      const fileId = fileMatch ? fileMatch[1] : idParam || '';

      if (fileId && /^[a-zA-Z0-9_-]+$/.test(fileId)) {
        return {
          canEmbed: true,
          embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
          directUrl: clean,
          provider: 'GOOGLE_DRIVE_FILE',
          notice: 'Pratinjau File Google Drive'
        };
      }
    }

    // 4. Google Docs / Sheets / Slides
    if (host.includes('docs.google.com')) {
      const docMatch = parsed.pathname.match(/\/(document|presentation|spreadsheets)\/d\/([a-zA-Z0-9_-]+)/);
      if (docMatch) {
        const docType = docMatch[1];
        const docId = docMatch[2];
        return {
          canEmbed: true,
          embedUrl: `https://docs.google.com/${docType}/d/${docId}/preview`,
          directUrl: clean,
          provider: 'GOOGLE_DOCS',
          notice: 'Pratinjau Dokumen Google Docs/Slides'
        };
      }
    }

    return {
      canEmbed: false,
      embedUrl: '',
      directUrl: clean,
      provider: 'EXTERNAL',
      notice: 'Penyedia tautan membatasi penyematan langsung (iframe). Gunakan tombol "Buka di Tab Baru" di bawah ini.'
    };
  } catch {
    return {
      canEmbed: false,
      embedUrl: '',
      directUrl: clean,
      provider: 'NONE',
      notice: 'Format URL tidak dapat dipratinjau secara langsung.'
    };
  }
}

export function formatRupiah(amount: number | string): string {
  const num = Number(amount || 0);
  if (Number.isNaN(num)) return String(amount);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
}
