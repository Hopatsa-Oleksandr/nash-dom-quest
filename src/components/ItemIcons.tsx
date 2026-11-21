import React, { useEffect, useState } from 'react';
import { ItemIconId, PlayerRole } from '../types/game';

export const ItemIcon: React.FC<{ icon: ItemIconId; className?: string }> = ({
  icon,
  className = 'w-7 h-7',
}) => {
  switch (icon) {
    case 'screwdriver':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
          {/* Insulated red DB-style handle */}
          <path
            d="M8.5 34.5L17 26L22 31L13.5 39.5C12.1 40.9 9.9 40.9 8.5 39.5C7.1 38.1 7.1 35.9 8.5 34.5Z"
            fill="#DC2626"
            stroke="#FCA5A5"
            strokeWidth="1.5"
          />
          <path d="M15.5 27.5L20.5 32.5" stroke="#7F1D1D" strokeWidth="2.5" />
          {/* Steel shaft */}
          <path d="M20.5 27.5L35 13" stroke="#E4E4E7" strokeWidth="3" strokeLinecap="round" />
          {/* Cross tip */}
          <path
            d="M34 10.5L39.5 8.5L37.5 14L34 10.5Z"
            fill="#A1A1AA"
            stroke="#F4F4F5"
            strokeWidth="1.2"
          />
        </svg>
      );
    case 'service_key':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
          {/* Metallic triangular DB conductor key */}
          <rect
            x="8"
            y="18"
            width="16"
            height="12"
            rx="6"
            fill="#D4D4D8"
            stroke="#FAFAFA"
            strokeWidth="1.5"
          />
          <circle cx="14" cy="24" r="3" fill="#18181B" />
          <path d="M24 24H40" stroke="#E4E4E7" strokeWidth="3.5" strokeLinecap="round" />
          {/* Triangular key barrel */}
          <polygon
            points="35,19 42,24 35,29"
            fill="#F59E0B"
            stroke="#FEF3C7"
            strokeWidth="1.4"
          />
        </svg>
      );
    case 'fuse':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
          {/* Brass end caps */}
          <rect x="6" y="17" width="8" height="14" rx="2" fill="#F59E0B" stroke="#FEF08A" strokeWidth="1.4" />
          <rect x="34" y="17" width="8" height="14" rx="2" fill="#F59E0B" stroke="#FEF08A" strokeWidth="1.4" />
          {/* Glass/ceramic body */}
          <rect x="14" y="18" width="20" height="12" fill="#1E293B" stroke="#94A3B8" strokeWidth="1.5" />
          {/* Glowing filament */}
          <path
            d="M15 24H19L21.5 20.5L24.5 27.5L27 22L29 24H33"
            stroke="#38BDF8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
};

interface PlayerAvatarProps {
  role: PlayerRole;
  name: string;
  avatarUrl: string;
  online: boolean;
  speaking: boolean;
  isMe?: boolean;
  size?: 'sm' | 'md';
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  role,
  name,
  avatarUrl,
  online,
  speaking,
  isMe = false,
  size = 'md',
}) => {
  const resolvedAvatarUrl =
    avatarUrl || (role === 'p1' ? '/assets/avatar-p1.png' : '/assets/avatar-p2.png');
  const [imgStatus, setImgStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const dim = size === 'sm' ? 'w-10 h-10' : 'w-11 h-11 sm:w-12 sm:h-12';

  useEffect(() => {
    setImgStatus('loading');
  }, [resolvedAvatarUrl]);

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <div className="relative">
        {/* Green glowing pulse ring when speaking */}
        {speaking && (
          <span
            className="absolute -inset-1 rounded-full border-2 border-emerald-400 animate-speaker-ring pointer-events-none"
            aria-hidden="true"
          />
        )}
        <div
          className={`relative ${dim} rounded-full overflow-hidden border-2 transition-all duration-150 bg-zinc-900 ${
            speaking
              ? 'border-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.75)] scale-105'
              : online
                ? role === 'p1'
                  ? 'border-sky-400/80 shadow-[0_2px_10px_rgba(0,0,0,0.65)]'
                  : 'border-rose-400/80 shadow-[0_2px_10px_rgba(0,0,0,0.65)]'
                : 'border-zinc-600/70 opacity-65'
          }`}
        >
          {/* Automatically tries /assets/avatar-p1.png or /assets/avatar-p2.png first with object-cover */}
          {imgStatus !== 'error' && (
            <img
              key={resolvedAvatarUrl}
              src={resolvedAvatarUrl}
              alt={name}
              referrerPolicy="no-referrer"
              onLoad={(e) => {
                if (e.currentTarget.naturalWidth > 0) {
                  setImgStatus('loaded');
                } else {
                  setImgStatus('error');
                }
              }}
              onError={() => setImgStatus('error')}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-150 ${
                imgStatus === 'loaded' ? 'opacity-100' : 'opacity-0'
              }`}
            />
          )}

          {/* Fallback SVG rendered only when avatar image fails to load (or while fetching) */}
          {imgStatus !== 'loaded' && (role === 'p1' ? (
            /* Clean illustrated placeholder SVG for Сясюня (p1) */
            <svg viewBox="0 0 64 64" className="w-full h-full" aria-label={name}>
              <defs>
                <linearGradient id="av1Bg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#0f2942" />
                  <stop offset="100%" stopColor="#1e3a5f" />
                </linearGradient>
              </defs>
              <rect width="64" height="64" fill="url(#av1Bg)" />
              {/* Shoulders / dark coat */}
              <path d="M12 64C12 50 21 44 32 44C43 44 52 50 52 64Z" fill="#0f172a" />
              <path d="M25 45L32 53L39 45" stroke="#38bdf8" strokeWidth="2.5" fill="none" />
              {/* Hair back */}
              <path d="M17 30C17 17 24 12 32 12C40 12 47 17 47 30V45H17V30Z" fill="#2c1d18" />
              {/* Face */}
              <circle cx="32" cy="29" r="11.5" fill="#f5d0b5" />
              {/* Hair bangs */}
              <path d="M20 26C22 18 27 15 34 15C40 15 44 19 44 26C40 22 35 20 28 21C24 22 21 24 20 26Z" fill="#2c1d18" />
              {/* Eyes & smile */}
              <circle cx="28" cy="29" r="1.5" fill="#1e293b" />
              <circle cx="36" cy="29" r="1.5" fill="#1e293b" />
              <path d="M28.5 34C30.2 35.8 33.8 35.8 35.5 34" stroke="#9a5543" strokeWidth="1.6" strokeLinecap="round" fill="none" />
            </svg>
          ) : (
            /* Clean illustrated placeholder SVG for Юяся (p2) */
            <svg viewBox="0 0 64 64" className="w-full h-full" aria-label={name}>
              <defs>
                <linearGradient id="av2Bg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#3b1526" />
                  <stop offset="100%" stopColor="#5b1f39" />
                </linearGradient>
              </defs>
              <rect width="64" height="64" fill="url(#av2Bg)" />
              {/* Shoulders / scarf */}
              <path d="M12 64C12 50 21 44 32 44C43 44 52 50 52 64Z" fill="#1f1625" />
              <path d="M22 46C26 51 38 51 42 46" stroke="#fb7185" strokeWidth="4" strokeLinecap="round" fill="none" />
              {/* Hair back */}
              <path d="M16 32C16 17 23 11 32 11C41 11 48 17 48 32L50 47H14L16 32Z" fill="#7c4a27" />
              {/* Face */}
              <circle cx="32" cy="29" r="11.5" fill="#f7d6be" />
              {/* Hair bangs */}
              <path d="M20 25C22 17 27 14 33 14C39 14 44 18 44 25C39 20 33 19 26 21C23 22 21 23.5 20 25Z" fill="#7c4a27" />
              {/* Eyes & smile */}
              <circle cx="28" cy="29" r="1.5" fill="#1e293b" />
              <circle cx="36" cy="29" r="1.5" fill="#1e293b" />
              <path d="M28.5 34C30.2 35.8 33.8 35.8 35.5 34" stroke="#9a5543" strokeWidth="1.6" strokeLinecap="round" fill="none" />
            </svg>
          ))}
        </div>
        {/* Live online presence indicator dot */}
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#090b10] ${
            speaking ? 'bg-emerald-400' : online ? 'bg-emerald-500' : 'bg-zinc-500'
          }`}
          title={online ? 'У мережі' : 'Офлайн'}
        />
      </div>
      <span className="text-[11px] font-semibold tracking-wide text-zinc-100 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] whitespace-nowrap">
        {name}
        {isMe ? ' (Ви)' : ''}
      </span>
    </div>
  );
};
