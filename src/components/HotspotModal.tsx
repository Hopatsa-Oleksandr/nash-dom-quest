import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Delete,
  KeyRound,
  Lock,
  PackageCheck,
  Radio,
  RotateCcw,
  Scissors,
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
  ProtocolSwitchColor,
  QuestConfig,
} from '../types/game';
import { ItemIcon } from './ItemIcons';
import { playErrorBuzz, playKeypadTone } from '../utils/soundFx';
import { g } from '../utils/ukrainianGrammar';

const PROTOCOL_SWITCHES: Array<{
  color: ProtocolSwitchColor;
  label: string;
  idleClass: string;
  activeClass: string;
  dotClass: string;
}> = [
  {
    color: 'red',
    label: 'Червоний',
    idleClass: 'bg-red-950/70 hover:bg-red-900/80 border-red-500/70 text-red-100',
    activeClass: 'bg-red-600 border-red-200 text-white shadow-[0_0_20px_rgba(239,68,68,0.65)]',
    dotClass: 'bg-red-500',
  },
  {
    color: 'blue',
    label: 'Синій',
    idleClass: 'bg-sky-950/70 hover:bg-sky-900/80 border-sky-500/70 text-sky-100',
    activeClass: 'bg-sky-600 border-sky-200 text-white shadow-[0_0_20px_rgba(14,165,233,0.65)]',
    dotClass: 'bg-sky-400',
  },
  {
    color: 'yellow',
    label: 'Жовтий',
    idleClass: 'bg-amber-950/70 hover:bg-amber-900/80 border-amber-400/70 text-amber-100',
    activeClass: 'bg-amber-500 border-amber-100 text-zinc-950 shadow-[0_0_20px_rgba(245,158,11,0.65)]',
    dotClass: 'bg-amber-400',
  },
  {
    color: 'green',
    label: 'Зелений',
    idleClass: 'bg-emerald-950/70 hover:bg-emerald-900/80 border-emerald-500/70 text-emerald-100',
    activeClass: 'bg-emerald-500 border-emerald-100 text-zinc-950 shadow-[0_0_20px_rgba(16,185,129,0.65)]',
    dotClass: 'bg-emerald-400',
  },
];

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
  onUnlockPhone: (hotspot: HotspotConfig) => void;
  onCollectItem: (hotspot: HotspotConfig, itemId: string) => void;
  onUnlockContainer: (hotspot: HotspotConfig) => void;
  onUnlockHatchCombo: (hotspot: HotspotConfig) => void;
  onSolveKeypad: (hotspot: HotspotConfig) => void;
  onInsertFuse: (hotspot: HotspotConfig) => void;
  onSolveProtocol: (hotspot: HotspotConfig) => void;
  onRecordMistake: (toast?: string) => void;
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
  onUnlockPhone,
  onCollectItem,
  onUnlockContainer,
  onUnlockHatchCombo,
  onSolveKeypad,
  onInsertFuse,
  onSolveProtocol,
  onRecordMistake,
  onPutInHatch,
  onTakeFromHatch,
  onTriggerTransition,
  onSetLeverHolding,
  onCompleteEscape,
}) => {
  const [keypadValue, setKeypadValue] = useState('');
  const [keypadError, setKeypadError] = useState(false);
  const [comboValue, setComboValue] = useState('');
  const [comboError, setComboError] = useState(false);
  const [manualTabId, setManualTabId] = useState<string>(
    hotspot.manualTabs?.[0]?.id ?? 'errors'
  );
  const [protocolSeq, setProtocolSeq] = useState<ProtocolSwitchColor[]>([]);
  const [protocolSparkError, setProtocolSparkError] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);

  const otherRole: PlayerRole = role === 'p1' ? 'p2' : 'p1';
  const isSolved = gameState.solvedHotspots.includes(hotspot.id);
  const myAccessibleItems = gameState.inventory.filter(
    (entry) => sceneMode === 'shared' || entry.owner === 'shared' || entry.owner === role
  );
  const hasRequiredItem = hotspot.requiredItemId
    ? myAccessibleItems.some((e) => e.itemId === hotspot.requiredItemId)
    : false;

  const lockedByPhone = Boolean(hotspot.requiresClueRead && !gameState.scene1.phoneUnlocked);

  const missingFlags = (hotspot.requiredFlags ?? []).filter((f) => !gameState.flags.includes(f));
  const flagsReady = missingFlags.length === 0;
  const bothHolding = gameState.leverHold.p1 && gameState.leverHold.p2;

  const hatchItem = gameState.transferHatchItem
    ? quest.items[gameState.transferHatchItem.id] ?? null
    : null;
  const isIncomingHatch = Boolean(
    gameState.transferHatchItem && hatchItem && gameState.transferHatchItem.from !== role
  );
  const isOutgoingHatch = Boolean(
    gameState.transferHatchItem && hatchItem && gameState.transferHatchItem.from === role
  );
  const transferableInventoryItems = myAccessibleItems
    .map((entry) => quest.items[entry.itemId])
    .filter((item): item is NonNullable<typeof item> => Boolean(item?.transferable));

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
    if (hotspot.type !== 'coop_lever' || !flagsReady) return;
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
  }, [bothHolding, flagsReady, hotspot.type, onClose, onCompleteEscape]);

  const handleDigit = (digit: string, expectedCode: string | undefined, onSuccess: () => void) => {
    if (isSolved || keypadValue.length >= 4) return;
    playKeypadTone(digit);
    const next = keypadValue + digit;
    setKeypadValue(next);
    setKeypadError(false);

    if (next.length === 4) {
      if (next === expectedCode) {
        onSuccess();
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

  const handleComboSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSolved || !hasRequiredItem) return;
    const normalized = comboValue.trim().toUpperCase();
    const expected = (hotspot.comboCode ?? '').toUpperCase();
    if (normalized === expected) {
      setComboError(false);
      onUnlockHatchCombo(hotspot);
    } else {
      playErrorBuzz();
      setComboError(true);
      window.setTimeout(() => setComboError(false), 750);
    }
  };

  const handleToggleProtocolSwitch = (color: ProtocolSwitchColor) => {
    if (isSolved || protocolSparkError) return;
    playKeypadTone(color === 'red' ? '1' : color === 'blue' ? '3' : color === 'yellow' ? '6' : '9');
    setProtocolSeq((prev) => {
      if (prev.includes(color)) {
        return prev.filter((c) => c !== color);
      }
      if (prev.length >= 4) return prev;
      return [...prev, color];
    });
  };

  const handleVerifyProtocol = () => {
    if (isSolved || protocolSparkError || protocolSeq.length !== 4) return;
    const expected = hotspot.protocolSolution ?? ['yellow', 'blue', 'green', 'red'];
    const isMatch = expected.every((color, idx) => protocolSeq[idx] === color);
    if (isMatch) {
      onSolveProtocol(hotspot);
    } else {
      playErrorBuzz();
      setProtocolSparkError(true);
      onRecordMistake(
        'ІСКРИ В ЕЛЕКТРОЩИТІ! Неправильний порядок тумблерів — перевірте інструкцію DB (Помилка +1).'
      );
      window.setTimeout(() => {
        setProtocolSparkError(false);
        setProtocolSeq([]);
      }, 2000);
    }
  };

  const releaseLever = () => {
    onSetLeverHolding(false, role);
    if (soloTestMode) {
      onSetLeverHolding(false, otherRole);
    }
  };

  const activeManualTab =
    hotspot.manualTabs?.find((t) => t.id === manualTabId) ?? hotspot.manualTabs?.[0] ?? null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={hotspot.title}
    >
      <div
        className={`relative w-full ${
          hotspot.type === 'db_manual' ? 'max-w-lg' : 'max-w-md'
        } max-h-[85dvh] overflow-y-auto rounded-2xl bg-[#121620] border shadow-[0_24px_60px_rgba(0,0,0,0.85)] text-zinc-100 transition-colors ${
          protocolSparkError
            ? 'border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.65)] animate-shake'
            : 'border-zinc-700/70'
        }`}
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
          {/* ACT 1: CLUE INSPECT (Route Board & Carriage Plate) */}
          {hotspot.type === 'clue_inspect' && (
            <>
              <p className="text-sm text-zinc-300 leading-relaxed">{hotspot.description}</p>
              <div className="rounded-xl bg-[#090d16] border border-amber-500/40 p-4 space-y-2 shadow-inner">
                {hotspot.clueBadge && (
                  <div className="text-[11px] font-mono-tech text-amber-400/90 tracking-wider uppercase">
                    {hotspot.clueBadge}
                  </div>
                )}
                <div className="font-mono-tech text-lg sm:text-xl font-bold text-white tracking-wide">
                  {hotspot.clueDisplay}
                </div>
                {hotspot.clueHintText && (
                  <p className="text-xs text-sky-300/90 pt-1 border-t border-zinc-800">
                    {hotspot.clueHintText}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold text-zinc-100 transition-colors"
              >
                Запам’ятати та закрити
              </button>
            </>
          )}

          {/* ACT 1: SMARTPHONE WITH 4-DIGIT PIN LOCK (2307) -> CONDUCTOR SMS */}
          {hotspot.type === 'phone_pin' && (
            <>
              {gameState.scene1.phoneUnlocked ? (
                <>
                  <div className="flex items-center gap-2 text-xs font-mono-tech text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>СМАРТФОН РОЗБЛОКОВАНО</span>
                  </div>
                  <div className="rounded-xl bg-[#090d16] border border-sky-500/45 p-4 space-y-2.5 shadow-inner">
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
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-sm font-bold transition-colors"
                  >
                    Зрозуміло! Перевірити смітник
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-zinc-300 leading-relaxed">{hotspot.description}</p>
                  {hotspot.pinHintText && (
                    <div className="p-3 rounded-xl bg-sky-950/35 border border-sky-500/35 text-xs text-sky-200 leading-snug">
                      {hotspot.pinHintText}
                    </div>
                  )}
                  <div
                    className={`rounded-xl bg-[#090d14] border p-4 space-y-3 ${
                      keypadError ? 'border-red-500 animate-shake' : 'border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono-tech text-zinc-400">
                      <span className="flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                        <span>PIN-КОД СМАРТФОНА</span>
                      </span>
                      <span className={keypadError ? 'text-red-400' : 'text-amber-400'}>
                        {keypadError ? 'НЕВІРНИЙ PIN' : 'ЗАБЛОКОВАНО'}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[0, 1, 2, 3].map((idx) => (
                        <div
                          key={idx}
                          className={`h-11 rounded-lg flex items-center justify-center font-mono-tech text-2xl font-bold border ${
                            keypadError
                              ? 'bg-red-950/40 border-red-500/60 text-red-300'
                              : 'bg-zinc-900 border-zinc-700 text-sky-300'
                          }`}
                        >
                          {keypadValue[idx] ?? '·'}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                        <button
                          key={digit}
                          type="button"
                          onClick={() =>
                            handleDigit(digit, hotspot.pinCode, () => onUnlockPhone(hotspot))
                          }
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
                        onClick={() =>
                          handleDigit('0', hotspot.pinCode, () => onUnlockPhone(hotspot))
                        }
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
                  </div>
                </>
              )}
            </>
          )}

          {/* NOTE (fallback) */}
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

          {/* PICKUP (Act 1 Trashbin — strictly gated by phoneUnlocked) */}
          {hotspot.type === 'pickup' && (
            <>
              {lockedByPhone ? (
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

          {/* ACT 1: FLOOR HATCH WITH SCREWDRIVER + 3-CHAR CODE (S2S) -> SERVICE KEY + WIRE CUTTERS */}
          {hotspot.type === 'hatch_combo' && (
            <>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {isSolved ? hotspot.alreadyTakenText : hotspot.description}
              </p>

              {isSolved ? (
                <>
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/35 text-sm text-emerald-200">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>{hotspot.unlockedText}</span>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold text-zinc-100 transition-colors"
                  >
                    Закрити
                  </button>
                </>
              ) : !hasRequiredItem ? (
                <>
                  <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-xs sm:text-sm text-red-200">
                    <Lock className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
                    <span>{hotspot.lockedHint}</span>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold text-zinc-100 transition-colors"
                  >
                    Закрити
                  </button>
                </>
              ) : (
                <form onSubmit={handleComboSubmit} className="space-y-3">
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-950/35 border border-emerald-500/40 text-xs text-emerald-200">
                    <Wrench className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>«Викрутка» готова — тепер введіть 3-символьний код замка.</span>
                  </div>

                  {hotspot.comboHintText && (
                    <p className="text-xs text-zinc-400 leading-snug">{hotspot.comboHintText}</p>
                  )}

                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={comboValue}
                      onChange={(e) => {
                        setComboValue(e.target.value.toUpperCase().slice(0, 3));
                        if (comboError) setComboError(false);
                      }}
                      maxLength={3}
                      placeholder={hotspot.comboPlaceholder ?? '3 символи'}
                      autoFocus
                      className={`w-full h-12 px-4 rounded-xl bg-[#090d14] border text-center font-mono-tech text-2xl font-bold tracking-[0.35em] uppercase focus:outline-none transition-colors ${
                        comboError
                          ? 'border-red-500 text-red-300 animate-shake'
                          : 'border-zinc-700 focus:border-amber-400 text-amber-300'
                      }`}
                    />
                    {comboError && (
                      <p className="text-xs text-red-400 text-center">
                        Невірний код! Перевірте SMS провідника на смартфоні.
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={comboValue.trim().length < 3}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-45 disabled:hover:bg-emerald-500 text-zinc-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <Wrench className="w-4 h-4" />
                    Відкрутити та відкрити люк
                  </button>
                </form>
              )}
            </>
          )}

          {/* LOCKED CONTAINER (Act 2 Luggage Rack -> requires Wire Cutters -> gives Fuse 32A) */}
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
                  {hotspot.requiredItemId === 'wire_cutters' ? (
                    <Scissors className="w-4 h-4" />
                  ) : (
                    <Wrench className="w-4 h-4" />
                  )}
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

          {/* TRANSITION (Act 1 Sprechstelle -> requires Service Key -> triggers Act 2 split) */}
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

          {/* TWO-WAY TRANSFER HATCH (Persistent state-backed hatch between Carriage B & Vestibule A) */}
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
              ) : transferableInventoryItems.length > 0 ? (
                <div className="space-y-2.5">
                  {transferableInventoryItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl bg-zinc-900/90 border border-sky-500/35 p-3 space-y-2.5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                          <ItemIcon icon={item.icon} className="w-7 h-7" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-sky-300">{item.name}</div>
                          <div className="text-xs text-zinc-400 leading-snug">
                            Готово до передачі партнеру ({playerNames[otherRole]}) через шлюз.
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onPutInHatch(item.id);
                          onClose();
                        }}
                        className="w-full py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                      >
                        <Send className="w-4 h-4" />
                        Передати «{item.name}» в шлюз
                      </button>
                    </div>
                  ))}
                </div>
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

          {/* ACT 2: KEYPAD (NOTBREMSE 4-digit code 3264 for Vestibule A — zero spoiler hints) */}
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
                        onClick={() =>
                          handleDigit(digit, hotspot.keypadCode, () => onSolveKeypad(hotspot))
                        }
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
                      onClick={() =>
                        handleDigit('0', hotspot.keypadCode, () => onSolveKeypad(hotspot))
                      }
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

          {/* ACT 2: FUSE SLOT (Vestibule A inserts Fuse 32A received via Transfer Hatch) */}
          {hotspot.type === 'fuse_slot' && (
            <>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {isSolved ? hotspot.unlockedText : hotspot.description}
              </p>

              {isSolved ? (
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-sm text-emerald-200">
                  <Zap className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Запобіжник 32A вставлено. Живлення щита протоколу DB відновлено!</span>
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

          {/* ACT 2: OVERHEAD LED DISPLAY — 4-LINE ROUTE RIDDLE FOR CARRIAGE B (deduces 3264) */}
          {hotspot.type === 'led_display' && (
            <>
              <p className="text-sm text-zinc-300 leading-relaxed">{hotspot.description}</p>
              <div className="rounded-xl bg-[#07090d] border border-amber-500/40 p-3.5 sm:p-4 space-y-2.5 shadow-inner animate-led-flicker">
                <div className="flex items-center justify-between text-[11px] font-mono-tech text-amber-500/80 border-b border-amber-500/20 pb-2">
                  <span>S-BAHN STUTTGART · S2</span>
                  <span>КОД NOTBREMSE · 4 ЦИФРИ</span>
                </div>

                {hotspot.ledRiddles && hotspot.ledRiddles.length > 0 ? (
                  <div className="space-y-2.5">
                    {hotspot.ledRiddles.map((riddle) => (
                      <div
                        key={riddle.index}
                        className="rounded-lg bg-zinc-950/90 border border-amber-500/20 p-2.5 space-y-1"
                      >
                        <div className="flex items-start gap-2 text-xs sm:text-sm font-semibold text-amber-200">
                          <span className="font-mono-tech text-amber-400 shrink-0">
                            #{riddle.index}
                          </span>
                          <span>{riddle.question}</span>
                        </div>
                        <div className="font-mono-tech text-[11px] text-zinc-400 pl-6 leading-snug">
                          {riddle.reference}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
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
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold text-zinc-100 transition-colors"
              >
                Продиктувати код по рації
              </button>
            </>
          )}

          {/* ACT 3: DB NOTFALL-HANDBUCH (3-Tab Manual for Carriage B / p1) */}
          {hotspot.type === 'db_manual' && (
            <>
              {!flagsReady ? (
                <>
                  <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-950/35 border border-amber-500/35 text-xs sm:text-sm text-amber-200">
                    <Lock className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
                    <span>{hotspot.lockedHint}</span>
                  </div>
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
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                    {hotspot.description}
                  </p>

                  {/* 3 Tabs Navigation */}
                  <div className="grid grid-cols-3 gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                    {hotspot.manualTabs?.map((tab) => {
                      const active = activeManualTab?.id === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setManualTabId(tab.id)}
                          className={`px-2 py-2 rounded-lg text-[11px] sm:text-xs font-bold transition-colors leading-tight ${
                            active
                              ? 'bg-red-600 text-white shadow-md'
                              : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
                          }`}
                        >
                          {tab.title}
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Manual Tab Content */}
                  {activeManualTab && (
                    <div className="rounded-xl bg-[#090d16] border border-red-500/30 p-3.5 space-y-2.5">
                      <div className="flex items-center gap-2 text-xs text-red-300 font-semibold border-b border-zinc-800 pb-2">
                        <BookOpen className="w-4 h-4 shrink-0 text-red-400" />
                        <span>{activeManualTab.subtitle}</span>
                      </div>
                      <div className="space-y-2">
                        {activeManualTab.rows.map((row) => (
                          <div
                            key={row.code}
                            className="rounded-lg bg-zinc-900/90 border border-zinc-800 px-3 py-2.5 space-y-1"
                          >
                            <div className="font-mono-tech text-xs font-bold text-amber-300">
                              {row.code}
                            </div>
                            <div className="text-xs text-zinc-400">{row.detail}</div>
                            {row.highlight && (
                              <div className="text-xs sm:text-sm font-bold text-emerald-300 pt-0.5">
                                {row.highlight}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold text-zinc-100 transition-colors"
                  >
                    Закрити інструкцію
                  </button>
                </>
              )}
            </>
          )}

          {/* ACT 3: PROTOCOL SWITCH PANEL (Vestibule A / p2 — Keep Talking style) */}
          {hotspot.type === 'protocol_panel' && (
            <>
              {!flagsReady ? (
                <>
                  <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-950/35 border border-amber-500/35 text-xs sm:text-sm text-amber-200">
                    <Lock className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
                    <span>{hotspot.lockedHint}</span>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold text-zinc-100 transition-colors"
                  >
                    Закрити
                  </button>
                </>
              ) : isSolved ? (
                <>
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/50 text-sm text-emerald-200">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>{hotspot.unlockedText}</span>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm transition-colors"
                  >
                    Перейти до аварійних важелів (Акт 4)
                  </button>
                </>
              ) : (
                <>
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                    {hotspot.description}
                  </p>

                  {/* Live Diagnostic Status LCD (dictate to p1) */}
                  {hotspot.protocolStatus && (
                    <div
                      className={`rounded-xl border p-3.5 font-mono-tech transition-colors ${
                        protocolSparkError
                          ? 'bg-red-950/85 border-red-400 text-red-100 animate-siren-flash'
                          : 'bg-[#080c14] border-amber-500/50 text-amber-200'
                      }`}
                    >
                      <div className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
                        СТАТУС СИСТЕМИ DB · ПРОДИКТУЙТЕ ПАРТНЕРУ
                      </div>
                      <div className="text-xs sm:text-sm font-bold tracking-wide text-center py-1 rounded-lg bg-black/50 border border-zinc-800">
                        ПОМИЛКА: <span className="text-red-400">{hotspot.protocolStatus.errorCode}</span>{' '}
                        | ТИСК: <span className="text-red-400">{hotspot.protocolStatus.pressure}</span>{' '}
                        | ФАЗА: <span className="text-amber-300">{hotspot.protocolStatus.phase}</span>
                      </div>
                    </div>
                  )}

                  {/* Red Spark Error Alert (2 seconds) */}
                  {protocolSparkError && (
                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-600/90 border border-red-200 text-white text-xs sm:text-sm font-bold shadow-[0_0_25px_rgba(239,68,68,0.85)]">
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                      <span>КОРОТКЕ ЗАМИКАННЯ! Невірна послідовність — скидання тумблерів...</span>
                    </div>
                  )}

                  {/* Selected Order Slots 1 -> 4 */}
                  <div className="grid grid-cols-4 gap-2">
                    {[0, 1, 2, 3].map((slot) => {
                      const picked = protocolSeq[slot];
                      const meta = PROTOCOL_SWITCHES.find((s) => s.color === picked);
                      return (
                        <div
                          key={slot}
                          className="h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center gap-1.5 px-1.5 text-[11px] font-mono-tech"
                        >
                          <span className="text-zinc-500">{slot + 1}.</span>
                          {meta ? (
                            <span className="flex items-center gap-1 text-zinc-100 font-bold truncate">
                              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${meta.dotClass}`} />
                              <span className="truncate">{meta.label.slice(0, 4)}</span>
                            </span>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* 4 Colored Interactive Toggle Switches */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {PROTOCOL_SWITCHES.map((sw) => {
                      const orderIdx = protocolSeq.indexOf(sw.color);
                      const isPicked = orderIdx !== -1;
                      return (
                        <button
                          key={sw.color}
                          type="button"
                          disabled={protocolSparkError}
                          onClick={() => handleToggleProtocolSwitch(sw.color)}
                          className={`relative h-14 px-3.5 rounded-xl border-2 font-display text-base tracking-wide uppercase flex items-center justify-between transition-all active:scale-95 ${
                            isPicked ? sw.activeClass : sw.idleClass
                          }`}
                        >
                          <span>{sw.label}</span>
                          <span className="w-7 h-7 rounded-lg bg-black/30 font-mono-tech text-sm font-bold flex items-center justify-center">
                            {isPicked ? orderIdx + 1 : '·'}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Reset + Verify Controls */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={protocolSparkError || protocolSeq.length === 0}
                      onClick={() => setProtocolSeq([])}
                      className="h-11 px-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-xs font-bold text-zinc-200 flex items-center gap-1.5 transition-colors shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Скинути</span>
                    </button>
                    <button
                      type="button"
                      disabled={protocolSparkError || protocolSeq.length !== 4}
                      onClick={handleVerifyProtocol}
                      className="flex-1 h-11 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-zinc-950 font-bold text-sm transition-colors"
                    >
                      ПЕРЕВІРИТИ ПОСЛІДОВНІСТЬ
                    </button>
                  </div>

                  {gameState.mistakes > 0 && (
                    <p className="text-[11px] font-mono-tech text-red-300/90 text-center">
                      Зафіксовано помилок протоколу: {gameState.mistakes}
                    </p>
                  )}
                </>
              )}
            </>
          )}

          {/* ACT 4: CO-OP SIMULTANEOUS LEVER HOLD (3 seconds together, mobile-safe) */}
          {hotspot.type === 'coop_lever' && (
            <>
              <p className="text-sm text-zinc-300 leading-relaxed">{hotspot.description}</p>

              {/* Prerequisites checklist (3 stages, spoiler-free) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                {[
                  { flag: 'keypad_unlocked', label: 'Код NOTBREMSE' },
                  { flag: 'fuse_inserted', label: 'Запобіжник 32A' },
                  { flag: 'protocol_solved', label: 'Протокол DB' },
                ].map((req) => {
                  const done = gameState.flags.includes(req.flag);
                  return (
                    <div
                      key={req.flag}
                      className={`p-2.5 rounded-lg border flex items-center gap-2 ${
                        done
                          ? 'bg-emerald-950/35 border-emerald-500/40 text-emerald-300'
                          : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                      }`}
                    >
                      {done ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      ) : (
                        <Lock className="w-4 h-4 shrink-0" />
                      )}
                      <span className="truncate">{req.label}</span>
                    </div>
                  );
                })}
              </div>

              {!flagsReady ? (
                <div className="p-3.5 rounded-xl bg-amber-950/35 border border-amber-500/35 text-xs sm:text-sm text-amber-200">
                  Важелі ще заблоковані. Спочатку завершіть Акт 2 (код NOTBREMSE + запобіжник 32A) та Акт 3 (протокол розблокування DB).
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
