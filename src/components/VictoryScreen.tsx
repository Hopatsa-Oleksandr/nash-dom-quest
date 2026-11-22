import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Bus, Clock, Footprints, LogOut, RotateCcw, Trophy } from 'lucide-react';
import { DialogueLine, PlayerGender, PlayerRole, QuestConfig } from '../types/game';
import { PlayerAvatar } from './ItemIcons';
import { g } from '../utils/ukrainianGrammar';

interface VictoryScreenProps {
  quest: QuestConfig;
  playerNames: Record<PlayerRole, string>;
  playerGenders: Record<PlayerRole, PlayerGender>;
  elapsedMs: number | null;
  mistakes: number;
  chosenEndingId: string | null;
  onChooseEnding: (choiceId: string) => void;
  onRestart: () => void;
  onExitToMenu: () => void;
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
  playerGenders,
  elapsedMs,
  mistakes,
  chosenEndingId,
  onChooseEnding,
  onRestart,
  onExitToMenu,
}) => {
  const selectedChoice = quest.victory.choices.find((c) => c.id === chosenEndingId);
  const [bestMs, setBestMs] = useState<number | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);

  const dynamicDialogue: DialogueLine[] = useMemo(
    () => [
      {
        speaker: 'p2',
        text: `Ура! Свіже нічне повітря! Я вже ${g(playerGenders.p2, 'думав', 'думала')}, що ми залишимося ночувати у цьому вагоні №07 до ранку!`,
      },
      {
        speaker: 'p1',
        text: `А я ${g(playerGenders.p1, 'попереджав', 'попереджала')}, що без викрутки, кусачок і довідника DB Notfall-Handbuch у нічний S2 краще не сідати!`,
      },
      {
        speaker: 'p2',
        text: `Зате як чітко ти ${g(playerGenders.p1, 'розшифрував', 'розшифрувала')} табло, ${g(playerGenders.p1, 'передав', 'передала')} запобіжник у шлюз і ${g(playerGenders.p1, 'провів', 'провела')} мене через ті 4 тумблери!`,
      },
      {
        speaker: 'p1',
        text:
          mistakes === 0
            ? `А ти без жодної помилки ${g(playerGenders.p2, 'впорався', 'впоралася')} з NOTBREMSE і щитом розблокування! Справжня команда. Ну що, куди далі?`
            : `А ти ${g(playerGenders.p2, 'витримав', 'витримала')} навіть іскри на електрощиті й ${g(playerGenders.p2, 'дотиснув', 'дотиснула')} аварійні важелі! Ну що, куди далі?`,
      },
    ],
    [mistakes, playerGenders.p1, playerGenders.p2]
  );

  const dynamicEpilogue: DialogueLine[] = useMemo(() => {
    if (!selectedChoice) return [];
    if (selectedChoice.id === 'walk') {
      return [
        {
          speaker: 'p1',
          text: 'Пішки по нічному Штутгарту — найкращий спосіб перевести подих після цієї аварійної зупинки!',
        },
        {
          speaker: 'p2',
          text: `${g(playerGenders.p2, 'Згоден', 'Згодна')}! Тільки якщо побачиш по дорозі ще один червоний потяг S2 — обходимо його десятою дорогою!`,
        },
      ];
    }
    return [
      {
        speaker: 'p2',
        text: 'Дивись, нічний автобус N2 вже під’їжджає! Сподіваюся, у нього двері відкриваються без 4-значного коду.',
      },
      {
        speaker: 'p1',
        text: 'Тільки-но сядемо — я одразу перевірю, чи працює кнопка зупинки, бо ще один такий квест я сьогодні не витримаю!',
      },
    ];
  }, [playerGenders.p2, selectedChoice]);

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

        {/* Completion Speed Timer, Mistakes Count & Best Record */}
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 py-3 px-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
          {elapsedMs !== null && (
            <div className="flex items-center gap-2 text-sm text-zinc-200">
              <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-zinc-400">Час проходження:</span>
              <span className="font-mono-tech text-lg font-bold text-white tracking-wider">
                {formatDuration(elapsedMs)}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs sm:text-sm">
            <AlertTriangle
              className={`w-4 h-4 shrink-0 ${
                mistakes === 0 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            />
            <span className="text-zinc-400">Помилок:</span>
            <span
              className={`font-mono-tech font-bold ${
                mistakes === 0 ? 'text-emerald-300' : 'text-amber-300'
              }`}
            >
              {mistakes}
            </span>
          </div>

          {bestMs !== null && (
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
          )}
        </div>

        {/* Short funny Ukrainian dialogue with dynamic gender agreement */}
        <div className="space-y-3">
          {dynamicDialogue.map((line, index) => (
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
                  gender={playerGenders[line.speaker]}
                  avatarUrl={quest.players[line.speaker].avatarUrl}
                  online
                  speaking={false}
                  size="sm"
                />
              </div>
              <div
                className={`max-w-[78%] rounded-xl px-4 py-3 text-sm leading-relaxed border ${
                  line.speaker === 'p1'
                    ? 'bg-rose-950/35 border-rose-500/30 text-zinc-100'
                    : 'bg-sky-950/35 border-sky-500/30 text-zinc-100'
                }`}
              >
                {line.text}
              </div>
            </div>
          ))}
        </div>

        {/* Final Choice or Epilogue */}
        {!selectedChoice ? (
          <div className="space-y-3 pt-1">
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
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={onExitToMenu}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Вийти в головне меню</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-2 border-t border-zinc-800">
            <div className="text-center text-xs font-semibold text-amber-300">
              Ваш вибір: {selectedChoice.label}
            </div>
            <div className="space-y-2.5">
              {dynamicEpilogue.map((line, index) => (
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
                      gender={playerGenders[line.speaker]}
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
                Грати ще раз
              </button>
              <button
                type="button"
                onClick={onExitToMenu}
                className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-100 font-bold text-sm flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <LogOut className="w-4 h-4" />
                Вийти в меню
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
