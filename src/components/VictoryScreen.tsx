import React, { useEffect, useState } from 'react';
import { Bus, Clock, Footprints, RotateCcw, Trophy } from 'lucide-react';
import { PlayerRole, QuestConfig } from '../types/game';
import { PlayerAvatar } from './ItemIcons';

interface VictoryScreenProps {
  quest: QuestConfig;
  playerNames: Record<PlayerRole, string>;
  elapsedMs: number | null;
  chosenEndingId: string | null;
  onChooseEnding: (choiceId: string) => void;
  onRestart: () => void;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

export const VictoryScreen: React.FC<VictoryScreenProps> = ({
  quest,
  playerNames,
  elapsedMs,
  chosenEndingId,
  onChooseEnding,
  onRestart,
}) => {
  const selectedChoice = quest.victory.choices.find((c) => c.id === chosenEndingId);
  const [bestMs, setBestMs] = useState<number | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);

  useEffect(() => {
    if (elapsedMs === null || elapsedMs <= 0) return;
    const storageKey = `nashdom-best-time-${quest.id}`;
    try {
      const raw = window.localStorage.getItem(storageKey);
      const prevBest = raw ? parseInt(raw, 10) : NaN;
      if (Number.isNaN(prevBest) || elapsedMs < prevBest) {
        window.localStorage.setItem(storageKey, String(elapsedMs));
        setBestMs(elapsedMs);
        setIsNewRecord(!Number.isNaN(prevBest));
      } else {
        setBestMs(prevBest);
        setIsNewRecord(false);
      }
    } catch {
      // Ignore storage failures in restricted browsing modes
    }
  }, [elapsedMs, quest.id]);

  return (
    <div className="relative z-10 w-full h-full flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-[#070a12]/38">
      {/* Atmospheric night Stuttgart S-Bahn platform glow tint */}
      <div
        className="absolute inset-0 pointer-events-none opacity-55"
        style={{
          background:
            'radial-gradient(circle at 50% 18%, rgba(16, 185, 129, 0.2), transparent 52%), radial-gradient(circle at 15% 85%, rgba(220, 38, 38, 0.18), transparent 48%)',
        }}
      />

      <div className="relative z-10 w-full max-w-3xl max-h-[85dvh] overflow-y-auto rounded-2xl bg-[#10141f]/88 backdrop-blur-md border border-zinc-700/70 shadow-[0_24px_70px_rgba(0,0,0,0.85)] p-4 sm:p-7 space-y-4 sm:space-y-5 my-auto">
        {/* Header */}
        <div className="text-center space-y-1.5">
          <p className="text-xs font-mono-tech text-emerald-400 tracking-widest uppercase">
            Місію виконано · S-Bahn S2
          </p>
          <h1 className="font-display text-2xl sm:text-4xl tracking-wide text-white uppercase text-balance">
            {quest.victory.title}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">{quest.victory.subtitle}</p>
        </div>

        {/* Completion Speed Timer & Best Record */}
        {elapsedMs !== null && (
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 py-3 px-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
            <div className="flex items-center gap-2 text-sm text-zinc-200">
              <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-zinc-400">Час проходження:</span>
              <span className="font-mono-tech text-lg font-bold text-white tracking-wider">
                {formatDuration(elapsedMs)}
              </span>
            </div>
            {bestMs !== null && (
              <>
                <span className="hidden sm:inline text-zinc-700" aria-hidden="true">
                  ·
                </span>
                <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                  <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                  {isNewRecord ? (
                    <span className="font-semibold text-amber-300">
                      Новий рекорд швидкості!
                    </span>
                  ) : (
                    <span className="text-zinc-400">
                      Найкращий час:{' '}
                      <span className="font-mono-tech font-bold text-amber-300">
                        {formatDuration(bestMs)}
                      </span>
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Short funny Ukrainian dialogue */}
        <div className="space-y-3">
          {quest.victory.dialogue.map((line, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 ${
                line.speaker === 'p2' ? 'flex-row-reverse text-right' : ''
              }`}
            >
              <div className="shrink-0">
                <PlayerAvatar
                  role={line.speaker}
                  name={playerNames[line.speaker]}
                  avatarUrl={quest.players[line.speaker].avatarUrl}
                  online
                  speaking={false}
                  size="sm"
                />
              </div>
              <div
                className={`max-w-[78%] rounded-xl px-4 py-3 text-sm leading-relaxed border ${
                  line.speaker === 'p1'
                    ? 'bg-sky-950/35 border-sky-500/30 text-zinc-100'
                    : 'bg-rose-950/35 border-rose-500/30 text-zinc-100'
                }`}
              >
                {line.text}
              </div>
            </div>
          ))}
        </div>

        {/* Final Choice or Epilogue */}
        {!selectedChoice ? (
          <div className="space-y-2.5 pt-1">
            <p className="text-xs font-semibold text-zinc-400 text-center">
              Оберіть фінал цієї нічної пригоди:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {quest.victory.choices.map((choice, idx) => (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => onChooseEnding(choice.id)}
                  className="group flex items-start gap-3 p-4 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 hover:border-amber-400/70 text-left transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-zinc-800 group-hover:bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    {idx === 0 ? <Footprints className="w-5 h-5" /> : <Bus className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                      {choice.label}
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5 leading-snug">
                      {choice.subtitle}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-2 border-t border-zinc-800">
            <div className="text-center text-xs font-semibold text-amber-300">
              Ваш вибір: {selectedChoice.label}
            </div>
            <div className="space-y-2.5">
              {selectedChoice.epilogue.map((line, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 ${
                    line.speaker === 'p2' ? 'flex-row-reverse text-right' : ''
                  }`}
                >
                  <div className="shrink-0">
                    <PlayerAvatar
                      role={line.speaker}
                      name={playerNames[line.speaker]}
                      avatarUrl={quest.players[line.speaker].avatarUrl}
                      online
                      speaking={false}
                      size="sm"
                    />
                  </div>
                  <div className="max-w-[78%] rounded-xl px-4 py-2.5 text-sm leading-relaxed bg-zinc-900 border border-zinc-700/80 text-zinc-100">
                    {line.text}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={onRestart}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <RotateCcw className="w-4 h-4" />
                Пройти квест ще раз
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
