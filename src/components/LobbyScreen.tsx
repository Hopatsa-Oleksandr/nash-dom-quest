import React, { useRef, useState } from 'react';
import { Check, Copy, Link2, Play, Radio, Share2, Users } from 'lucide-react';
import { PlayerGender, PlayerRole, QuestConfig } from '../types/game';
import { PlayerAvatar } from './ItemIcons';
import { copyTextToClipboard } from '../utils/clipboard';

interface LobbyScreenProps {
  quest: QuestConfig;
  initialRoom: string;
  initialRole: PlayerRole;
  initialName: string;
  initialGender: PlayerGender;
  onJoin: (params: {
    roomId: string;
    role: PlayerRole;
    playerName: string;
    playerGender: PlayerGender;
    soloTestMode: boolean;
  }) => void;
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'S2-';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  quest,
  initialRoom,
  initialRole,
  initialName,
  initialGender,
  onJoin,
}) => {
  const [role, setRole] = useState<PlayerRole>(initialRole);
  const [roomId, setRoomId] = useState<string>(initialRoom || generateRoomCode());
  const [playerName, setPlayerName] = useState<string>(
    initialName || quest.players[initialRole].defaultName
  );
  const [playerGender, setPlayerGender] = useState<PlayerGender>(initialGender);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'manual'>('idle');
  const [showInviteBox, setShowInviteBox] = useState<boolean>(false);
  const inviteInputRef = useRef<HTMLInputElement | null>(null);
  const copyTimerRef = useRef<number | null>(null);

  const partnerRole: PlayerRole = role === 'p1' ? 'p2' : 'p1';
  const partnerDefaultName = quest.players[partnerRole].defaultName;
  const partnerDefaultGender = quest.players[partnerRole].defaultGender;

  const handleRoleSwitch = (nextRole: PlayerRole) => {
    setRole(nextRole);
    setPlayerGender(quest.players[nextRole].defaultGender);
    // Update name automatically if it was still one of the default names
    if (
      !playerName.trim() ||
      playerName === quest.players.p1.defaultName ||
      playerName === quest.players.p2.defaultName
    ) {
      setPlayerName(quest.players[nextRole].defaultName);
    }
  };

  const getInviteUrl = () => {
    const clean = roomId.trim() || 'S2-LIVE';
    const url = new URL(window.location.href);
    url.searchParams.set('room', clean);
    url.searchParams.set('role', partnerRole);
    url.searchParams.set('name', partnerDefaultName);
    url.searchParams.set('gender', partnerDefaultGender);
    return url.toString();
  };

  const inviteUrl = typeof window !== 'undefined' ? getInviteUrl() : '';
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleCopyInvite = async () => {
    const urlToCopy = getInviteUrl();
    const ok = await copyTextToClipboard(urlToCopy);
    setShowInviteBox(true);

    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current);
    }

    if (ok) {
      setCopyState('copied');
      copyTimerRef.current = window.setTimeout(() => {
        setCopyState('idle');
      }, 2800);
    } else {
      setCopyState('manual');
      // Auto-select the visible URL input so user can copy with one tap / Ctrl+C
      window.setTimeout(() => {
        inviteInputRef.current?.focus();
        inviteInputRef.current?.select();
      }, 30);
    }
  };

  const handleNativeShare = async () => {
    if (!canNativeShare) return;
    try {
      await navigator.share({
        title: quest.title,
        text: `Приєднуйся до кімнати ${roomId.trim() || 'S2-LIVE'} у квесті «${quest.title}»!`,
        url: getInviteUrl(),
      });
    } catch {
      // User cancelled share sheet
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRoom = roomId.trim() || generateRoomCode();
    const cleanName = playerName.trim() || quest.players[role].defaultName;
    onJoin({
      roomId: cleanRoom,
      role,
      playerName: cleanName,
      playerGender,
      soloTestMode: false,
    });
  };

  return (
    <div className="relative w-full h-[100dvh] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-[#090b10]">
      {/* Atmospheric Stuttgart S-Bahn radial ambience */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 20% 20%, rgba(185, 28, 28, 0.2), transparent 46%), radial-gradient(circle at 82% 78%, rgba(30, 58, 138, 0.24), transparent 50%)',
        }}
      />

      <div className="relative z-10 w-full max-w-2xl max-h-[85dvh] overflow-y-auto rounded-2xl bg-[#111520]/95 border border-zinc-800 shadow-[0_24px_70px_rgba(0,0,0,0.8)] p-4 sm:p-7 my-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 pb-4 sm:pb-5 border-b border-zinc-800/90">
          <div className="space-y-1">
            <div className="text-[11px] sm:text-xs font-mono-tech text-red-400 tracking-wider uppercase">
              {quest.location} · Кооператив на 2 гравців
            </div>
            <h1 className="font-display text-xl sm:text-3xl font-bold tracking-wide text-white uppercase text-balance">
              {quest.title}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400">{quest.subtitle}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400 shrink-0">
            <Radio className="w-4 h-4 text-emerald-400" />
            <span>P2P Рація + Синхронізація</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="pt-4 sm:pt-5 space-y-4 sm:space-y-5">
          {/* Role selection */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-zinc-300">
              1. Оберіть свою роль у потязі
            </label>
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {(['p1', 'p2'] as PlayerRole[]).map((r) => {
                const cfg = quest.players[r];
                const selected = role === r;
                const displayGender = selected ? playerGender : cfg.defaultGender;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleRoleSwitch(r)}
                    className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl border text-left transition-all ${
                      selected
                        ? r === 'p1'
                          ? 'bg-rose-950/40 border-rose-400 shadow-[0_0_20px_rgba(251,113,133,0.18)]'
                          : 'bg-sky-950/40 border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.18)]'
                        : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <PlayerAvatar
                      role={r}
                      name={selected ? playerName.trim() || cfg.defaultName : cfg.defaultName}
                      gender={displayGender}
                      avatarUrl={cfg.avatarUrl}
                      online={selected}
                      speaking={false}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">
                        {cfg.defaultName}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        {r === 'p1' ? `Хост · ${cfg.carLabel}` : `Партнер · ${cfg.carLabel}`}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Room Code + Player Name & Gender */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label htmlFor="room-input" className="block text-xs font-semibold text-zinc-300">
                2. Код кімнати (однаковий для обох)
              </label>
              <div className="flex gap-2">
                <input
                  id="room-input"
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  placeholder="S2-8420"
                  maxLength={20}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-amber-400 focus:outline-none font-mono-tech text-sm font-bold text-white tracking-wider"
                />
                <button
                  type="button"
                  onClick={handleCopyInvite}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors ${
                    copyState === 'copied'
                      ? 'bg-emerald-950/70 border-emerald-500/70 text-emerald-200'
                      : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-100'
                  }`}
                  title={`Скопіювати посилання для ${partnerDefaultName}`}
                >
                  {copyState === 'copied' ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  <span>{copyState === 'copied' ? 'Скопійовано' : 'Запросити'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="name-input" className="block text-xs font-semibold text-zinc-300">
                  3. Ім’я та стать гравця
                </label>
                <span className="text-[11px] text-zinc-400">
                  {playerGender === 'f' ? 'Жінка' : 'Чоловік'}
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  id="name-input"
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder={quest.players[role].defaultName}
                  maxLength={24}
                  className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-amber-400 focus:outline-none text-sm font-semibold text-white"
                />
                {/* Gender Toggle: Ч / Ж */}
                <div
                  className="flex items-center p-1 rounded-xl bg-zinc-950 border border-zinc-700 shrink-0"
                  role="group"
                  aria-label="Стать гравця"
                >
                  <button
                    type="button"
                    onClick={() => setPlayerGender('m')}
                    aria-pressed={playerGender === 'm'}
                    title="Чоловік"
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      playerGender === 'm'
                        ? 'bg-sky-500 text-zinc-950 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Ч
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlayerGender('f')}
                    aria-pressed={playerGender === 'f'}
                    title="Жінка"
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      playerGender === 'f'
                        ? 'bg-rose-500 text-zinc-950 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Ж
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Invite Link Confirmation & Manual Copy Fallback Box */}
          {showInviteBox && (
            <div
              className={`rounded-xl border p-3 space-y-2 transition-colors ${
                copyState === 'copied'
                  ? 'bg-emerald-950/35 border-emerald-500/45'
                  : 'bg-zinc-900/90 border-amber-500/45'
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span
                  className={`flex items-center gap-1.5 font-semibold ${
                    copyState === 'copied' ? 'text-emerald-300' : 'text-amber-300'
                  }`}
                >
                  {copyState === 'copied' ? (
                    <>
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Посилання для {partnerDefaultName} скопійовано! Надішліть його партнеру:
                      </span>
                    </>
                  ) : (
                    <>
                      <Link2 className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Скопіюйте посилання для {partnerDefaultName} (Ctrl+C або утримуйте поле):
                      </span>
                    </>
                  )}
                </span>
                {canNativeShare && (
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-[11px] font-semibold flex items-center gap-1 shrink-0 transition-colors"
                  >
                    <Share2 className="w-3 h-3" />
                    <span>Поділитися</span>
                  </button>
                )}
              </div>
              <input
                ref={inviteInputRef}
                type="text"
                readOnly
                value={inviteUrl}
                onFocus={(e) => e.currentTarget.select()}
                onClick={(e) => e.currentTarget.select()}
                aria-label="Посилання-запрошення для партнера"
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700/90 font-mono-tech text-[11px] text-zinc-200 select-all focus:border-amber-400 focus:outline-none"
              />
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <button
              type="submit"
              className="flex-1 py-3 px-6 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(220,38,38,0.35)] transition-colors whitespace-nowrap"
            >
              <Play className="w-4 h-4 fill-current" />
              Увійти у вагон S2
            </button>

            <button
              type="button"
              onClick={() =>
                onJoin({
                  roomId: roomId.trim() || 'SOLO-S2',
                  role,
                  playerName: playerName.trim() || quest.players[role].defaultName,
                  playerGender,
                  soloTestMode: true,
                })
              }
              className="py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-xs font-semibold text-zinc-300 hover:text-white flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Users className="w-4 h-4 text-zinc-400" />
              Соло-перегляд (1 пристрій)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
