import React from 'react';

export type Icon3DType =
  | 'trophy'
  | 'teacher'
  | 'book'
  | 'video'
  | 'medal'
  | 'calendar'
  | 'drive'
  | 'judging'
  | 'documents'
  | 'analytics'
  | 'results'
  | 'security';

interface Icon3DProps {
  type: Icon3DType;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Icon3D: React.FC<Icon3DProps> = ({ type, size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-9 h-9 rounded-xl p-1.5',
    md: 'w-11 h-11 rounded-2xl p-2',
    lg: 'w-14 h-14 rounded-2xl p-3',
    xl: 'w-18 h-18 rounded-3xl p-3.5'
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none bg-gradient-to-br from-[#0052CC] via-[#1D4ED8] to-[#0A2558] dark:from-[#1D4ED8] dark:via-[#0F296B] dark:to-[#071330] border-2 border-[#FFAA00] shadow-[0_6px_16px_-3px_rgba(0,74,173,0.45)] ${sizeClasses[size]} ${className}`}
    >
      <svg viewBox="0 0 64 64" fill="none" className="w-full h-full drop-shadow-[0_3px_5px_rgba(0,0,0,0.45)]">
        <defs>
          {/* Vibrant Golden Orange matching HGN "Lomba Guru" & Ribbon */}
          <linearGradient id="gold3d" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFF078" />
            <stop offset="45%" stopColor="#FFB800" />
            <stop offset="100%" stopColor="#EA580C" />
          </linearGradient>
          {/* Bright Cyan-Blue matching HGN splashes & FK3S inner ring */}
          <linearGradient id="blue3d" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#7DD3FC" />
            <stop offset="50%" stopColor="#0088FF" />
            <stop offset="100%" stopColor="#004AAD" />
          </linearGradient>
          {/* Crimson Red accent matching FK3S emblem figure */}
          <linearGradient id="emerald3d" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FF8080" />
            <stop offset="50%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#B91C1C" />
          </linearGradient>
          {/* Crisp White Highlight */}
          <linearGradient id="glass3d" x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="100%" stopColor="#E2E8F0" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {type === 'trophy' && (
          <g>
            <path d="M18 12H46V26C46 33.732 39.732 40 32 40C24.268 40 18 33.732 18 26V12Z" fill="url(#gold3d)" />
            <path d="M12 15H18V25C18 27 12 26 12 20V15Z" fill="url(#glass3d)" />
            <path d="M52 15H46V25C46 27 52 26 52 20V15Z" fill="url(#glass3d)" />
            <rect x="28" y="39" width="8" height="10" rx="2" fill="url(#gold3d)" />
            <rect x="20" y="48" width="24" height="6" rx="3" fill="url(#emerald3d)" />
            <circle cx="32" cy="24" r="5" fill="url(#glass3d)" />
          </g>
        )}

        {type === 'teacher' && (
          <g>
            <circle cx="32" cy="18" r="10" fill="url(#gold3d)" />
            <path d="M14 52C14 41 22 34 32 34C42 34 50 41 50 52H14Z" fill="url(#glass3d)" />
            <path d="M27 34L32 46L37 34H27Z" fill="url(#emerald3d)" />
            <path d="M32 7L48 13L32 19L16 13L32 7Z" fill="url(#gold3d)" />
          </g>
        )}

        {type === 'book' && (
          <g>
            <path d="M10 16C18 14 26 16 32 20V50C26 46 18 44 10 46V16Z" fill="url(#glass3d)" />
            <path d="M54 16C46 14 38 16 32 20V50C38 46 46 44 54 46V16Z" fill="url(#gold3d)" />
            <path d="M29 18H35V51H29V18Z" fill="url(#emerald3d)" />
          </g>
        )}

        {type === 'video' && (
          <g>
            <rect x="8" y="16" width="34" height="32" rx="7" fill="url(#glass3d)" />
            <path d="M42 25L56 18V46L42 39V25Z" fill="url(#gold3d)" />
            <circle cx="19" cy="25" r="3.5" fill="url(#emerald3d)" />
            <polygon points="21,29 32,35 21,41" fill="url(#blue3d)" />
          </g>
        )}

        {type === 'medal' && (
          <g>
            <path d="M22 8L28 24H20L14 8H22Z" fill="url(#glass3d)" />
            <path d="M42 8L36 24H44L50 8H42Z" fill="url(#emerald3d)" />
            <circle cx="32" cy="38" r="16" fill="url(#gold3d)" />
            <polygon points="32,27 35,34 43,35 37,40 39,48 32,44 25,48 27,40 21,35 29,34" fill="url(#glass3d)" />
          </g>
        )}

        {type === 'calendar' && (
          <g>
            <rect x="10" y="14" width="44" height="40" rx="8" fill="url(#glass3d)" />
            <path d="M10 22C10 17.5817 13.5817 14 18 14H46C50.4183 14 54 17.5817 54 22V27H10V22Z" fill="url(#gold3d)" />
            <rect x="20" y="8" width="5" height="10" rx="2.5" fill="url(#emerald3d)" />
            <rect x="39" y="8" width="5" height="10" rx="2.5" fill="url(#emerald3d)" />
            <circle cx="24" cy="36" r="3.5" fill="url(#blue3d)" />
            <circle cx="32" cy="36" r="3.5" fill="url(#gold3d)" />
            <circle cx="40" cy="36" r="3.5" fill="url(#blue3d)" />
            <circle cx="24" cy="45" r="3.5" fill="url(#blue3d)" />
            <circle cx="32" cy="45" r="3.5" fill="url(#emerald3d)" />
          </g>
        )}

        {type === 'drive' && (
          <g>
            <path d="M24 12H40L54 36H38L24 12Z" fill="url(#gold3d)" />
            <path d="M24 12L10 36L18 50L32 26L24 12Z" fill="url(#glass3d)" />
            <path d="M18 50H46L54 36H26L18 50Z" fill="url(#emerald3d)" />
          </g>
        )}

        {type === 'judging' && (
          <g>
            <rect x="14" y="46" width="36" height="6" rx="3" fill="url(#gold3d)" />
            <rect x="27" y="12" width="10" height="22" rx="3" transform="rotate(-35 27 12)" fill="url(#gold3d)" />
            <rect x="20" y="24" width="24" height="6" rx="2" transform="rotate(-35 20 24)" fill="url(#glass3d)" />
          </g>
        )}

        {type === 'documents' && (
          <g>
            <rect x="14" y="10" width="32" height="44" rx="5" fill="url(#glass3d)" />
            <rect x="20" y="16" width="30" height="40" rx="5" fill="url(#gold3d)" />
            <rect x="26" y="24" width="18" height="4" rx="2" fill="url(#glass3d)" />
            <rect x="26" y="32" width="18" height="4" rx="2" fill="url(#glass3d)" />
            <rect x="26" y="40" width="12" height="4" rx="2" fill="url(#emerald3d)" />
          </g>
        )}

        {type === 'analytics' && (
          <g>
            <rect x="12" y="34" width="10" height="18" rx="3" fill="url(#glass3d)" />
            <rect x="27" y="22" width="10" height="30" rx="3" fill="url(#emerald3d)" />
            <rect x="42" y="12" width="10" height="40" rx="3" fill="url(#gold3d)" />
          </g>
        )}

        {type === 'results' && (
          <g>
            <rect x="8" y="34" width="16" height="18" rx="3" fill="url(#glass3d)" />
            <rect x="24" y="22" width="16" height="30" rx="3" fill="url(#gold3d)" />
            <rect x="40" y="38" width="16" height="14" rx="3" fill="url(#emerald3d)" />
            <polygon points="32,7 35,13 41,14 36.5,18 37.5,24 32,21 26.5,24 27.5,18 23,14 29,13" fill="url(#gold3d)" />
          </g>
        )}

        {type === 'security' && (
          <g>
            <path d="M32 8L50 15V31C50 43 42 51 32 56C22 51 14 43 14 31V15L32 8Z" fill="url(#gold3d)" />
            <path d="M32 14L44 19V30C44 39 38.5 45 32 49C25.5 45 20 39 20 30V19L32 14Z" fill="url(#glass3d)" />
            <path d="M26 31L30 35L39 25" stroke="#004AAD" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}
      </svg>
    </div>
  );
};
