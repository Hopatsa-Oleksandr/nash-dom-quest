import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Delete,
  KeyRound,
  Lock,
  PackageCheck,
  Radio,
  Send,
  Smartphone,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import {
  GameState,
  HotspotConfig,
  PlayerGender,
  PlayerRole,
  QuestConfig,
} from '../types/game';
import { ItemIcon } from './ItemIcons';
import { playErrorBuzz, playKeypadTone } from '../utils/soundFx';
import { g } from '../utils/ukrainianGrammar';

interface HotspotModalProps {
  hotspot: HotspotConfig;
  quest: QuestConfig;
  gameState: GameState;
  role: PlayerRole;
  playerNames: Record<PlayerRole, string>;
  playerGenders: Record<PlayerRole, PlayerGender>;
  sceneMode: 'shared' | 'split';
  soloTestMode: boolean;
  onClose: () => void;
  onCollectItem: (hotspot: HotspotConfig, itemId: string) => void;
  onUnlockContainer: (hotspot: HotspotConfig) => void;
  onSolveKeypad: (hotspot: HotspotConfig) => void;
  onInsertFuse: (hotspot: HotspotConfig) => void;
  onPutInHatch: (itemId: string) => void;
  onTakeFromHatch: () => void;
  onTriggerTransition: (hotspot: HotspotConfig) => void;
  onSetLeverHolding: (holding: boolean, overrideRole?: PlayerRole) => void;
  onCompleteEscape: () => void;
}

export const HotspotModal: React.FC<HotspotModalProps> = ({
  hotspot,
  quest,
  gameState,
  role,
  playerNames,
  playerGenders,
  sceneMode,
  soloTestMode,
  onClose,
  onCollectItem,
  onUnlockContainer,
  onSolveKeypad,
  onInsertFuse,
  onPutInHatch,
  onTakeFromHatch,
  onTriggerTransition,
  onSetLeverHolding,
  onCompleteEscape,
}) => {
  const [keypadValue, setKeypadValue] = useState('');
  const [keypadError, setKeypadError] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);

  const otherRole: PlayerRole = role === 'p1' ? 'p2' : 'p1';
  const isSolved = gameState.solvedHotspots.includes(hotspot.id);
  const myAccessibleItems = gameState.inventory.filter(
    (entry) => sceneMode === 'shared' || entry.owner === 'shared' || entry.owner === role
  );
  const hasRequiredItem = hotspot.requiredItemId
    ? myAccessibleItems.some((e) => e.itemId === hotspot.requiredItemId)
    : false;

  const lockedByClue = Boolean(hotspot.requiresClueRead && !gameState.scene1.clueRead);

  const missingFlags = (hotspot.requiredFlags ?? []).filter((f) => !gameState.flags.includes(f));
  const leversReady = missingFlags.length === 0;
  const bothHolding = gameState.leverHold.p1 && gameState.leverHold.p2;

  const hatchItem = gameState.transferHatchItem
    ? quest.items[gameState.transferHatchItem] ?? null
    : null;
  const isIncomingHatch = Boolean(hatchItem && gameState.transferHatchFromRole !== role);
  const isOutgoingHatch = Boolean(hatchItem && gameState.transferHatchFromRole === role);
  const transferableInventoryItem =
    myAccessibleItems
      .map((entry) => quest.items[entry.itemId])
      .find((item) => Boolean(item?.transferable)) ?? null;

  // Release lever automatically if modal closes
  useEffect(() => {
    return () => {
      if (hotspot.type === 'coop_lever') {
        onSetLeverHolding(false, role);
        if (soloTestMode) {
          onSetLeverHolding(false, otherRole);
        }
      }
    };
  }, [hotspot.type, onSetLeverHolding, otherRole, role, soloTestMode]);

  // Synchronized 3-second hold timer when BOTH players hold their levers
  useEffect(() => {
    if (hotspot.type !== 'coop_lever' || !leversReady) return;
    if (!bothHolding) {
      setHoldProgress(0);
      return;
    }

    const startTime = performance.now();
    const durationMs = 3000;
    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const pct = Math.min(100, (elapsed / durationMs) * 100);
      setHoldProgress(pct);
      if (pct >= 100) {
        onCompleteEscape();
        onClose();
        return;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [bothHolding, hotspot.type, leversReady, onClose, onCompleteEscape]);

  const handleDigit = (digit: string) => {
    if (isSolved || keypadValue.length >= 4) return;
    playKeypadTone(digit);
    const next = keypadValue + digit;
    setKeypadValue(next);
    setKeypadError(false);

    if (next.length === 4) {
      if (next === hotspot.keypadCode) {
        onSolveKeypad(hotspot);
      } else {
        playErrorBuzz();
        setKeypadError(true);
        window.setTimeout(() => {
          setKeypadValue('');
          setKeypadError(false);
        }, 650);
      }
    }
  };

  const handleClear = () => {
    setKeypadValue('');
    setKeypadError(false);
  };

  const handleBackspace = () => {
    setKeypadValue((prev) => prev.slice(0, -1));
    setKeypadError(false);
  };

  const releaseLever = () => {
    onSetLeverHolding(false, role);
    if (soloTestMode) {
      onSetLeverHolding(false, otherRole);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={hotspot.title}
    >
      <div
        className="relative w-full max-w-md max-h-[85dvh] overflow-y-auto rounded-2xl bg-[#121620] border border-zinc-700/70 shadow-[0_24px_60px_rgba(0,0,0,0.85)] text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-3.5 bg-[#121620]/95 backdrop-blur-sm border-b border-zinc-800/90">
          <h2 className="font-display text-base sm:text-lg tracking-wide text-zinc-50 uppercase truncate">
            {hotspot.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
            aria-label="Закрити"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-3.5 sm:space-y-4">
          {/* NOTE / SMARTPHONE */}
          {hotspot.type === 'note' && (
            <>
              <p className="text-sm text-zinc-300 leading-relaxed">{hotspot.description}</p>
              <div className="rounded-xl bg-[#090d16] border border-sky-500/35 p-4 space-y-2.5 shadow-inner">
                <div className="flex items-center justify-between text-xs text-sky-300/90">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Smartphone className="w-4 h-4" />
                    {hotspot.noteSender}
                  </span>
                  <span className="font-mono-tech text-zinc-400">{hotspot.noteTime}</span>
                </div>
                <p className="text-sm sm:text-base font-medium text-zinc-100 leading-relaxed">
                  «{hotspot.noteText}»
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold text-zinc-100 transition-colors"
              >
                Зрозуміло
              </button>
            </>
          )}

          {/* PICKUP (Trashbin / Luggage rack — strictly gated by clueRead if required) */}
          {hotspot.type === 'pickup' && (
            <>
              {lockedByClue ? (
                <>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    {hotspot.beforeClueText ?? hotspot.description}
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold text-zinc-100 transition-colors"
                  >
                    Закрити
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    {isSolved ? hotspot.alreadyTakenText : hotspot.description}
                  </p>
                  {!isSolved && hotspot.givesItemId && quest.items[hotspot.givesItemId] && (
                    <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-zinc-900/90 border border-amber-500/35">
                      <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                        <ItemIcon icon={quest.items[hotspot.givesItemId].icon} className="w-8 h-8" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-amber-300">
                          {quest.items[hotspot.givesItemId].name}
                        </div>
                        <div className="text-xs text-zinc-400 leading-snug">
                          {quest.items[hotspot.givesItemId].description}
                        </div>
                      </div>
                    </div>
                  )}
                  {!isSolved && hotspot.givesItemId ? (
                    <button
                      type="button"
                      onClick={() => {
                        onCollectItem(hotspot, hotspot.givesItemId!);
                        onClose();
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm transition-colors"
                    >
                      Взяти «{quest.items[hotspot.givesItemId]?.name}»
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold text-zinc-100 transition-colors"
                    >
                      Закрити
                    </button>
                  )}
                </>
              )}
            </>
          )}

          {/* LOCKED CONTAINER (Seat hatch -> requires Screwdriver -> gives Service Key) */}
          {hotspot.type === 'locked_container' && (
            <>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {isSolved ? hotspot.alreadyTakenText : hotspot.description}
              </p>

              {!isSolved && !hasRequiredItem && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-xs sm:text-sm text-red-200">
                  <Lock className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
                  <span>{hotspot.lockedHint}</span>
                </div>
              )}

              {!isSolved && hasRequiredItem && hotspot.requiredItemId && (
                <button
                  type="button"
                  onClick={() => onUnlockContainer(hotspot)}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <Wrench className="w-4 h-4" />
                  Застосувати «{quest.items[hotspot.requiredItemId]?.name}»
                </button>
              )}

              {isSolved && hotspot.givesItemId && (
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/35 text-sm text-emerald-200">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>{hotspot.unlockedText}</span>
                </div>
              )}

              {(isSolved || !hasRequiredItem) && (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold text-zinc-100 transition-colors"
                >
                  Закрити
                </button>
              )}
            </>
          )}

          {/* TRANSITION (Sprechstelle -> requires Service Key -> triggers Scene 2 split) */}
          {hotspot.type === 'transition' && (
            <>
              <p className="text-sm text-zinc-300 leading-relaxed">{hotspot.description}</p>
              {!hasRequiredItem ? (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-xs sm:text-sm text-red-200">
                  <Lock className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
                  <span>{hotspot.lockedHint}</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onTriggerTransition(hotspot);
                    onClose();
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <KeyRound className="w-4 h-4" />
                  Повернути «Службовий ключ» та відкрити прохід
                </button>
              )}
              {!hasRequiredItem && (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold text-zinc-100 transition-colors"
                >
                  Закрити
                </button>
              )}
            </>
          )}

          {/* TRANSFER HATCH (Persistent state-backed hatch between Carriage B and Vestibule A) */}
          {hotspot.type === 'transfer_hatch' && (
            <>
              <p className="text-sm text-zinc-300 leading-relaxed">{hotspot.description}</p>

              {isIncomingHatch && hatchItem ? (
                <>
                  <div className="rounded-xl bg-emerald-950/40 border border-emerald-400/60 p-4 space-y-3 shadow-[0_0_24px_rgba(16,185,129,0.2)]">
                    <div className="flex items-center gap-2 text-xs font-mono-tech font-bold text-emerald-300 uppercase tracking-wider">
                      <PackageCheck className="w-4 h-4 shrink-0" />
                      <span>Отримано предмет!</span>
                    </div>
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-emerald-500/40 flex items-center justify-center shrink-0">
                        <ItemIcon icon={hatchItem.icon} className="w-8 h-8" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white">{hatchItem.name}</div>
                        <div className="text-xs text-zinc-300 leading-snug">
                          {hatchItem.description}
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onTakeFromHatch();
                      onClose();
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <PackageCheck className="w-4 h-4" />
                    Забрати «{hatchItem.name}»
                  </button>
                </>
              ) : isOutgoingHatch && hatchItem ? (
                <>
                  <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-sky-950/35 border border-sky-500/40">
                    <div className="w-12 h-12 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0">
                      <ItemIcon icon={hatchItem.icon} className="w-8 h-8" />
                    </div>
                    <div className="min-w-0 text-xs sm:text-sm text-sky-100 leading-snug">
                      У шлюзі лежить <strong>«{hatchItem.name}»</strong>. Очікуємо, поки{' '}
                      {playerNames[otherRole]} {g(playerGenders[otherRole], 'забере', 'забере')}{' '}
                      предмет зі свого боку.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold text-zinc-100 transition-colors"
                  >
                    Закрити
                  </button>
                </>
              ) : transferableInventoryItem ? (
                <>
                  <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-zinc-900/90 border border-sky-500/35">
                    <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                      <ItemIcon icon={transferableInventoryItem.icon} className="w-8 h-8" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-sky-300">
                        {transferableInventoryItem.name}
                      </div>
                      <div className="text-xs text-zinc-400 leading-snug">
                        Готово до передачі партнеру ({playerNames[otherRole]}) через шлюз.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onPutInHatch(transferableInventoryItem.id);
                      onClose();
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    Передати «{transferableInventoryItem.name}» в шлюз
                  </button>
                </>
              ) : (
                <>
                  <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs sm:text-sm text-zinc-300">
                    Шлюз порожній. Покладіть сюди предмет або дочекайтеся передачі від партнера.
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold text-zinc-100 transition-colors"
                  >
                    Закрити
                  </button>
                </>
              )}
            </>
          )}

          {/* KEYPAD (NOTBREMSE 4-digit code for Vestibule A — zero spoiler hints) */}
          {hotspot.type === 'keypad' && (
            <>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {isSolved ? hotspot.unlockedText : hotspot.description}
              </p>

              <div
                className={`rounded-xl bg-[#090d14] border p-4 space-y-3 ${
                  keypadError
                    ? 'border-red-500 animate-shake'
                    : isSolved
                      ? 'border-emerald-500/60'
                      : 'border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-mono-tech text-zinc-400">
                  <span>{hotspot.keypadLabel ?? 'NOTBREMSE'}</span>
                  <span
                    className={
                      isSolved
                        ? 'text-emerald-400'
                        : keypadError
                          ? 'text-red-400'
                          : 'text-amber-400'
                    }
                  >
                    {isSolved ? 'РОЗБЛОКОВАНО' : keypadError ? 'ПОМИЛКА КОДУ' : 'ОЧІКУВАННЯ'}
                  </span>
                </div>

                {/* 4-digit LCD display */}
                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, 3].map((idx) => {
                    const char = isSolved ? '✓' : keypadValue[idx];
                    return (
                      <div
                        key={idx}
                        className={`h-12 rounded-lg flex items-center justify-center font-mono-tech text-2xl font-bold border ${
                          isSolved
                            ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-300'
                            : keypadError
                              ? 'bg-red-950/40 border-red-500/60 text-red-300'
                              : 'bg-zinc-900 border-zinc-700 text-amber-300'
                        }`}
                      >
                        {char ?? '·'}
                      </div>
                    );
                  })}
                </div>

                {!isSolved && (
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                      <button
                        key={digit}
                        type="button"
                        onClick={() => handleDigit(digit)}
                        className="h-11 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:scale-95 font-mono-tech text-lg font-bold text-white transition-all"
                      >
                        {digit}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleClear}
                      className="h-11 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-400 hover:text-zinc-100 transition-colors"
                    >
                      Скинути
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDigit('0')}
                      className="h-11 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:scale-95 font-mono-tech text-lg font-bold text-white transition-all"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={handleBackspace}
                      className="h-11 rounded-lg bg-zinc-900 hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors"
                      aria-label="Стерти"
                    >
                      <Delete className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {isSolved && (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm transition-colors"
                >
                  Чудово! Продовжити
                </button>
              )}
            </>
          )}

          {/* FUSE SLOT (Vestibule A inserts Fuse received via Transfer Hatch) */}
          {hotspot.type === 'fuse_slot' && (
            <>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {isSolved ? hotspot.unlockedText : hotspot.description}
              </p>

              {isSolved ? (
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-sm text-emerald-200">
                  <Zap className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Запобіжник 32A вставлено. Аварійні важелі під напругою!</span>
                </div>
              ) : hasRequiredItem ? (
                <button
                  type="button"
                  onClick={() => {
                    onInsertFuse(hotspot);
                    onClose();
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <Zap className="w-4 h-4" />
                  Вставити «Запобіжник 32A» у щиток
                </button>
              ) : (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-950/35 border border-amber-500/35 text-xs sm:text-sm text-amber-200">
                  <Radio className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
                  <span>{hotspot.lockedHint}</span>
                </div>
              )}

              {(isSolved || !hasRequiredItem) && (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold text-zinc-100 transition-colors"
                >
                  Закрити
                </button>
              )}
            </>
          )}

          {/* OVERHEAD LED DISPLAY (Carriage B reads code and dictates via PTT radio) */}
          {hotspot.type === 'led_display' && (
            <>
              <p className="text-sm text-zinc-300 leading-relaxed">{hotspot.description}</p>
              <div className="rounded-xl bg-[#07090d] border border-amber-500/40 p-4 space-y-2.5 shadow-inner animate-led-flicker">
                <div className="flex items-center justify-between text-[11px] font-mono-tech text-amber-500/80 border-b border-amber-500/20 pb-2">
                  <span>S-BAHN STUTTGART · S2</span>
                  <span>ДІАГНОСТИКА</span>
                </div>
                <div className="space-y-2">
                  {hotspot.ledEntries?.map((entry) => (
                    <div
                      key={entry.station}
                      className="flex items-center justify-between font-mono-tech text-base sm:text-lg"
                    >
                      <span className="text-amber-200/90">{entry.station}</span>
                      <span className="text-amber-400 font-bold tracking-widest">
                        → {entry.digit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold text-zinc-100 transition-colors"
              >
                Передати код по рації
              </button>
            </>
          )}

          {/* CO-OP SIMULTANEOUS LEVER HOLD (3 seconds together, mobile-safe) */}
          {hotspot.type === 'coop_lever' && (
            <>
              <p className="text-sm text-zinc-300 leading-relaxed">{hotspot.description}</p>

              {/* Prerequisites checklist (spoiler-free) */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div
                  className={`p-2.5 rounded-lg border flex items-center gap-2 ${
                    gameState.flags.includes('keypad_unlocked')
                      ? 'bg-emerald-950/35 border-emerald-500/40 text-emerald-300'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                  }`}
                >
                  {gameState.flags.includes('keypad_unlocked') ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <Lock className="w-4 h-4 shrink-0" />
                  )}
                  <span>Код NOTBREMSE</span>
                </div>
                <div
                  className={`p-2.5 rounded-lg border flex items-center gap-2 ${
                    gameState.flags.includes('fuse_inserted')
                      ? 'bg-emerald-950/35 border-emerald-500/40 text-emerald-300'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                  }`}
                >
                  {gameState.flags.includes('fuse_inserted') ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <Lock className="w-4 h-4 shrink-0" />
                  )}
                  <span>Запобіжник 32A</span>
                </div>
              </div>

              {!leversReady ? (
                <div className="p-3.5 rounded-xl bg-amber-950/35 border border-amber-500/35 text-xs sm:text-sm text-amber-200">
                  Важелі ще заблоковані. Спочатку у Тамбурі А потрібно ввести 4-значний код у боксі NOTBREMSE та вставити запобіжник 32A у щиток.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {/* Live status of both players */}
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div
                      className={`px-3 py-2 rounded-lg border text-center font-semibold transition-colors truncate ${
                        gameState.leverHold.p1
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                          : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                      }`}
                    >
                      {playerNames.p1}: {gameState.leverHold.p1 ? 'ТРИМАЄ!' : 'Очікування'}
                    </div>
                    <div
                      className={`px-3 py-2 rounded-lg border text-center font-semibold transition-colors truncate ${
                        gameState.leverHold.p2
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                          : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                      }`}
                    >
                      {playerNames.p2}: {gameState.leverHold.p2 ? 'ТРИМАЄ!' : 'Очікування'}
                    </div>
                  </div>

                  {/* Synchronized 3-second progress meter */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono-tech">
                      <span className="text-zinc-400">ТИСК АВАРІЙНИХ ДВЕРЕЙ</span>
                      <span className={bothHolding ? 'text-emerald-400 font-bold' : 'text-zinc-400'}>
                        {(holdProgress / 33.33).toFixed(1)} / 3.0 с
                      </span>
                    </div>
                    <div className="h-3.5 w-full rounded-full bg-zinc-900 border border-zinc-700 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-transform duration-75 origin-left"
                        style={{ transform: `scaleX(${holdProgress / 100})` }}
                      />
                    </div>
                  </div>

                  {/* Mobile-safe press-and-hold lever button */}
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      try {
                        e.currentTarget.setPointerCapture(e.pointerId);
                      } catch {
                        // Ignore capture errors on synthetic events
                      }
                      onSetLeverHolding(true, role);
                      if (soloTestMode) {
                        onSetLeverHolding(true, otherRole);
                      }
                    }}
                    onPointerUp={releaseLever}
                    onPointerCancel={releaseLever}
                    onLostPointerCapture={releaseLever}
                    onContextMenu={(e) => e.preventDefault()}
                    className={`w-full py-4 px-5 rounded-xl font-display text-xl tracking-wider uppercase select-none touch-none transition-all ${
                      gameState.leverHold[role]
                        ? 'bg-emerald-500 text-zinc-950 scale-[0.98] shadow-[0_0_24px_rgba(16,185,129,0.55)]'
                        : 'bg-red-600 hover:bg-red-500 text-white shadow-[0_8px_24px_rgba(220,38,38,0.4)]'
                    }`}
                  >
                    {gameState.leverHold[role]
                      ? bothHolding
                        ? 'ТРИМАЙТЕ РАЗОМ...'
                        : 'ТРИМАЮ! ЧЕКАЮ ПАРТНЕРА...'
                      : 'ТРИМАЙ! (3 СЕКУНДИ)'}
                  </button>
                  {soloTestMode && (
                    <p className="text-[11px] text-center text-zinc-400">
                      У тестовому режимі утримання синхронно активує обидва важелі.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
