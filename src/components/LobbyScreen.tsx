import React, { useState } from 'react';
import { Check, Copy, Play, Radio, Users } from 'lucide-react';
import { PlayerRole, QuestConfig } from '../types/game';
import { PlayerAvatar } from './ItemIcons';

interface LobbyScreenProps {
  quest: QuestConfig;
  initialRoom: string;
  initialRole: PlayerRole;
  initialName: string;
  onJoin: (params: {
    roomId: string;
    role: PlayerRole;
    playerName: string;
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
  onJoin,
}) => {
  const [role, setRole] = useState<PlayerRole>(initialRole);
  const [roomId, setRoomId] = useState<string>(initialRoom || generateRoomCode());
  const [playerName, setPlayerName] = useState<string>(
    initialName || quest.players[initialRole].defaultName
  );
  const [copied, setCopied] = useState(false);

  const partnerRole: PlayerRole = role === 'p1' ? 'p2' : 'p1';
  const partnerDefaultName = quest.players[partnerRole].defaultName;

  const handleRoleSwitch = (nextRole: PlayerRole) => {
    setRole(nextRole);
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
    return url.toString();
  };

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(getInviteUrl());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard fallback ignored
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRoom = roomId.trim() || generateRoomCode();
    const cleanName = playerName.trim() || quest.players[role].defaultName;
    onJoin({ roomId: cleanRoom, role, playerName: cleanName, soloTestMode: false });
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
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleRoleSwitch(r)}
                    className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl border text-left transition-all ${
                      selected
                        ? r === 'p1'
                          ? 'bg-sky-950/40 border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.18)]'
                          : 'bg-rose-950/40 border-rose-400 shadow-[0_0_20px_rgba(251,113,133,0.18)]'
                        : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <PlayerAvatar
                      role={r}
                      name={cfg.defaultName}
                      avatarUrl={cfg.avatarUrl}
                      online={selected}
                      speaking={false}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">{cfg.defaultName}</div>
                      <div className="text-[11px] text-zinc-400">
                        {r === 'p1' ? 'Хост · Тамбур А' : 'Партнер · Вагон Б'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Room Code + Player Name */}
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
                  placeholder="S2-4719"
                  maxLength={20}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-amber-400 focus:outline-none font-mono-tech text-sm font-bold text-white tracking-wider"
                />
                <button
                  type="button"
                  onClick={handleCopyInvite}
                  className="px-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-semibold text-zinc-100 flex items-center gap-1.5 shrink-0 transition-colors"
                  title={`Скопіювати посилання для ${partnerDefaultName}`}
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span className="hidden sm:inline">{copied ? 'Скопійовано' : 'Запросити'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="name-input" className="block text-xs font-semibold text-zinc-300">
                3. Ваше ім’я в грі
              </label>
              <input
                id="name-input"
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder={quest.players[role].defaultName}
                maxLength={24}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-amber-400 focus:outline-none text-sm font-semibold text-white"
              />
            </div>
          </div>

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
