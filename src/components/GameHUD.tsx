import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  Battery,
  BatteryLow,
  BatteryWarning,
  BookOpen,
  Check,
  Copy,
  Flame,
  MessageSquare,
  Mic,
  MicOff,
  Radio,
  Send,
  Siren,
  Terminal,
  Volume2,
  VolumeX,
  WifiOff,
  X,
} from 'lucide-react';
import {
  EmergencySirenAlert,
  GameState,
  PlayerRole,
  QuestConfig,
  RadioPingMessage,
  RemoteEffectKind,
  RemoteSceneEffect,
  SceneConfig,
} from '../types/game';
import { ConnectionStatus } from '../hooks/usePeerMultiplayer';
import { ItemIcon, PlayerAvatar } from './ItemIcons';
import { QUICK_RADIO_PINGS } from '../data/questsData';

const REMOTE_COMMANDS: Array<{
  cmd: string;
  aliases: string[];
  kind: RemoteEffectKind;
  label: string;
}> = [
  { cmd: 'light', aliases: ['light', 'світло', 'blink', 'лампа'], kind: 'light', label: 'Миготіння світла' },
  { cmd: 'alarm', aliases: ['alarm', 'тривога', 'red', 'маяк'], kind: 'alarm', label: 'Аварійний маяк' },
  { cmd: 'surge', aliases: ['surge', 'струм', 'spark', 'напруга'], kind: 'surge', label: 'Стрибок напруги' },
  { cmd: 'ping', aliases: ['ping', 'сигнал', 'chime', 'дзвінок'], kind: 'ping', label: 'Сервісний сигнал' },
];

interface GameHUDProps {
  quest: QuestConfig;
  scene: SceneConfig;
  gameState: GameState;
  role: PlayerRole;
  roomId: string;
  playerNames: Record<PlayerRole, string>;
  connectionStatus: ConnectionStatus;
  partnerOnline: boolean;
  speakingState: Record<PlayerRole, boolean>;
  micPermission: 'prompt' | 'granted' | 'denied';
  isMicMuted: boolean;
  audioLevels: number[];
  radioMessages: RadioPingMessage[];
  radioChatLog: RadioPingMessage[];
  selectedItemId: string | null;
  soloTestMode: boolean;
  notesCount: number;
  hasUnreadNotes: boolean;
  activeRemoteEffect: RemoteSceneEffect | null;
  emergencySiren: EmergencySirenAlert | null;
  pingMs: number | null;
  ambientMuted: boolean;
  batteryLevel: number;
  batteryDepleted: boolean;
  radioOverheating: boolean;
  pttHoldSeconds: number;
  onToggleMicMute: () => void;
  onToggleAmbient: () => void;
  onTriggerSiren: () => void;
  onSelectItem: (itemId: string | null) => void;
  onTransferItem: (itemId: string) => void;
  onStartTalking: () => void;
  onStopTalking: () => void;
  onSendQuickPing: (text: string) => void;
  onSendRemoteCommand: (kind: RemoteEffectKind, commandText: string, label: string) => void;
  onOpenNotebook: () => void;
  onSwitchSoloRole: () => void;
  portraitMode?: boolean;
  portraitStage?: React.ReactNode;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  quest,
  scene,
  gameState,
  role,
  roomId,
  playerNames,
  connectionStatus,
  partnerOnline,
  speakingState,
  micPermission,
  isMicMuted,
  audioLevels,
  radioMessages,
  radioChatLog,
  selectedItemId,
  soloTestMode,
  notesCount,
  hasUnreadNotes,
  activeRemoteEffect,
  emergencySiren,
  pingMs,
  ambientMuted,
  batteryLevel,
  batteryDepleted,
  radioOverheating,
  pttHoldSeconds,
  onToggleMicMute,
  onToggleAmbient,
  onTriggerSiren,
  onSelectItem,
  onTransferItem,
  onStartTalking,
  onStopTalking,
  onSendQuickPing,
  onSendRemoteCommand,
  onOpenNotebook,
  onSwitchSoloRole,
  portraitMode = false,
  portraitStage,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [quickPingOpen, setQuickPingOpen] = useState(false);
  const [radioTab, setRadioTab] = useState<'pings' | 'console'>('pings');
  const [consoleInput, setConsoleInput] = useState('');
  const [consoleError, setConsoleError] = useState<string | null>(null);
  const [radioSignalPct, setRadioSignalPct] = useState<number>(88);
  const [browserOnline, setBrowserOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const onOnline = () => setBrowserOnline(true);
    const onOffline = () => setBrowserOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const handleConsoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = consoleInput.trim().toLowerCase();
    if (!raw) return;
    const matched = REMOTE_COMMANDS.find((c) => c.aliases.includes(raw));
    if (!matched) {
      setConsoleError('Невідома команда. Доступні: light, alarm, surge, ping');
      return;
    }
    setConsoleError(null);
    setConsoleInput('');
    onSendRemoteCommand(matched.kind, matched.cmd, matched.label);
  };

  const otherRole: PlayerRole = role === 'p1' ? 'p2' : 'p1';
  const isSpeaking = speakingState[role];
  const partnerSpeaking = speakingState[otherRole];

  // Radio link quality: smoothly dims PTT button to grey/off on lost connection or weak signal
  const isConnectionLost =
    !browserOnline ||
    (!soloTestMode &&
      (!partnerOnline ||
        connectionStatus === 'waiting' ||
        connectionStatus === 'initializing' ||
        connectionStatus === 'reconnecting' ||
        connectionStatus === 'error'));
  const isWeakSignal = !isConnectionLost && activeRemoteEffect?.kind === 'surge';
  const isRadioDimmed = isConnectionLost || isWeakSignal || batteryDepleted || isMicMuted;
  const roundedBattery = Math.max(0, Math.min(100, Math.round(batteryLevel)));
  const isBatteryCritical = roundedBattery <= 15 || batteryDepleted;
  const isBatteryLow = !isBatteryCritical && roundedBattery <= 35;

  // Fluctuating radio signal strength driven by distance between players' train sections
  const trainSectionDistance =
    gameState.phase === 'transition' ? 1 : scene.mode === 'split' ? 2 : 0;

  useEffect(() => {
    const computeNextSignal = () => {
      if (isConnectionLost || batteryDepleted) {
        return 0;
      }

      // Base strength & fluctuation range depend on physical distance across S-Bahn train sections
      let base = 88;
      let variance = 10;
      let deepFadeChance = 0;

      if (trainSectionDistance === 0) {
        // Same train car (shared section)
        base = 88;
        variance = 10;
        deepFadeChance = 0;
      } else if (trainSectionDistance === 1) {
        // Emergency bulkhead doors closing between cars
        base = 30;
        variance = 16;
        deepFadeChance = 0.45;
      } else {
        // Separated across two sealed S-Bahn sections (split mode)
        base = 44;
        variance = 22;
        deepFadeChance = 0.28;
      }

      // Low battery and electromagnetic surges attenuate RF reception further
      if (isBatteryCritical) {
        base -= 24;
        deepFadeChance += 0.35;
      } else if (isBatteryLow) {
        base -= 12;
        deepFadeChance += 0.14;
      }

      if (activeRemoteEffect?.kind === 'surge') {
        base -= 28;
        deepFadeChance = Math.max(deepFadeChance, 0.72);
      }

      // Brief RF fadeouts across steel carriage walls trigger "searching for network"
      if (deepFadeChance > 0 && Math.random() < Math.min(0.85, deepFadeChance)) {
        return Math.max(4, Math.min(24, Math.round(8 + Math.random() * 14)));
      }

      const jitter = (Math.random() * 2 - 1) * variance;
      return Math.max(6, Math.min(98, Math.round(base + jitter)));
    };

    setRadioSignalPct(computeNextSignal());
    const intervalMs = trainSectionDistance > 0 ? 1150 : 1750;
    const id = window.setInterval(() => {
      setRadioSignalPct(computeNextSignal());
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [
    activeRemoteEffect?.kind,
    batteryDepleted,
    isBatteryCritical,
    isBatteryLow,
    isConnectionLost,
    trainSectionDistance,
  ]);

  const radioSignalBars =
    radioSignalPct <= 8
      ? 0
      : radioSignalPct <= 26
        ? 1
        : radioSignalPct <= 48
          ? 2
          : radioSignalPct <= 70
            ? 3
            : radioSignalPct <= 86
              ? 4
              : 5;

  const isSearchingNetwork = isConnectionLost || batteryDepleted || radioSignalBars <= 1;

  const sectionDistanceLabel =
    trainSectionDistance === 0
      ? 'Спільний вагон (поруч)'
      : trainSectionDistance === 1
        ? 'Перегородка зачиняється'
        : 'Різні вагони (через шлюз)';

  // Real-time radio ping quality metrics (reflecting PeerJS RTT and temporary surge interference)
  const effectivePingMs =
    isConnectionLost || pingMs === null
      ? null
      : activeRemoteEffect?.kind === 'surge'
        ? pingMs + 165
        : pingMs;

  const pingQuality: {
    bars: number;
    label: string;
    textClass: string;
    borderClass: string;
    barClass: string;
  } =
    effectivePingMs === null
      ? {
          bars: 0,
          label: 'Немає зв’язку з партнером',
          textClass: 'text-zinc-500',
          borderClass: 'border-zinc-800/80',
          barClass: 'bg-zinc-600',
        }
      : effectivePingMs <= 80
        ? {
            bars: 4,
            label: 'Відмінний сигнал рації',
            textClass: 'text-emerald-300',
            borderClass: 'border-emerald-500/45',
            barClass: 'bg-emerald-400',
          }
        : effectivePingMs <= 160
          ? {
              bars: 3,
              label: 'Стабільний сигнал рації',
              textClass: 'text-amber-200',
              borderClass: 'border-amber-500/45',
              barClass: 'bg-amber-300',
            }
          : effectivePingMs <= 280
            ? {
                bars: 2,
                label: 'Підвищена затримка рації',
                textClass: 'text-amber-400',
                borderClass: 'border-amber-500/65',
                barClass: 'bg-amber-400',
              }
            : {
                bars: 1,
                label: 'Висока затримка — можливі перешкоди сигналу',
                textClass: 'text-red-300',
                borderClass: 'border-red-500/70',
                barClass: 'bg-red-500',
              };

  // Items visible in the 4-slot inventory for this player
  const visibleInventory = gameState.inventory.filter(
    (entry) => scene.mode === 'shared' || entry.owner === 'shared' || entry.owner === role
  );

  const selectedEntry = visibleInventory.find((e) => e.itemId === selectedItemId) ?? null;
  const selectedItem = selectedEntry ? quest.items[selectedEntry.itemId] : null;
  const canTransfer = scene.mode === 'split' && selectedItem && selectedItem.transferable;

  const radioStatusText = soloTestMode
    ? 'Рація підключена (Соло-тест)'
    : connectionStatus === 'connected' && partnerOnline
      ? 'Рація підключена'
      : connectionStatus === 'error'
        ? 'Конфлікт кімнати — змініть код'
        : 'Очікування партнера...';

  const handleCopyInvite = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomId);
    url.searchParams.set('role', otherRole);
    url.searchParams.set('name', quest.players[otherRole].defaultName);
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  const locationLabel =
    scene.mode === 'shared'
      ? scene.sharedView?.locationLabel
      : scene.viewsByRole?.[role].locationLabel;

  const batteryWidget = (
    <div
      className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border bg-black/55 text-[11px] font-mono-tech transition-colors ${
        isBatteryCritical
          ? 'border-red-500/70 text-red-300'
          : isBatteryLow
            ? 'border-amber-500/60 text-amber-300'
            : isSpeaking
              ? 'border-emerald-400/60 text-emerald-200'
              : 'border-zinc-700/70 text-zinc-200'
      }`}
      title={
        batteryDepleted
          ? 'Батарея рації розряджена — йде аварійне відновлення'
          : 'Заряд рації витрачається під час передачі голосу (PTT)'
      }
      aria-label={`Заряд батареї рації: ${roundedBattery}%`}
    >
      {isBatteryCritical ? (
        <BatteryWarning className="w-3.5 h-3.5 text-red-400 shrink-0" />
      ) : isBatteryLow ? (
        <BatteryLow className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      ) : (
        <Battery className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
      )}
      <div className="w-8 sm:w-9 h-2 rounded-sm bg-zinc-800 border border-zinc-600/80 overflow-hidden p-[1px]">
        <div
          className={`h-full rounded-[1px] transition-all duration-200 ${
            isBatteryCritical
              ? 'bg-red-500'
              : isBatteryLow
                ? 'bg-amber-400'
                : 'bg-emerald-400'
          }`}
          style={{ width: `${roundedBattery}%` }}
        />
      </div>
      <span className="font-bold">{roundedBattery}%</span>
    </div>
  );

  const pingWidget = (
    <div
      className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border bg-black/55 text-[11px] font-mono-tech transition-colors ${pingQuality.borderClass} ${pingQuality.textClass}`}
      title={`Затримка рації (ping): ${effectivePingMs !== null ? `${effectivePingMs} мс` : '—'} · ${pingQuality.label}`}
      aria-label={`Затримка зв’язку рації: ${effectivePingMs !== null ? `${effectivePingMs} мілісекунд` : 'немає з’єднання'}, ${pingQuality.label}`}
    >
      <div className="flex items-end gap-[2px] h-3" aria-hidden="true">
        {[1, 2, 3, 4].map((barLevel) => {
          const heights = ['h-1', 'h-1.5', 'h-2', 'h-3'];
          const lit = barLevel <= pingQuality.bars;
          return (
            <span
              key={barLevel}
              className={`w-[3px] rounded-[1px] transition-colors duration-300 ${
                heights[barLevel - 1]
              } ${lit ? pingQuality.barClass : 'bg-zinc-700/70'}`}
            />
          );
        })}
      </div>
      <span className="font-bold whitespace-nowrap">
        {effectivePingMs !== null ? `${effectivePingMs} мс` : '— мс'}
      </span>
    </div>
  );

  const roomCopyButton = !soloTestMode && (
    <button
      type="button"
      onClick={handleCopyInvite}
      className="flex items-center gap-1 text-[11px] font-mono-tech text-zinc-300 hover:text-white bg-black/45 hover:bg-black/70 border border-zinc-700/70 rounded-md px-2 py-0.5 transition-colors whitespace-nowrap"
      title="Скопіювати посилання-запрошення для партнера"
    >
      {copiedLink ? (
        <>
          <Check className="w-3 h-3 text-emerald-400" />
          <span className="text-emerald-300">Скопійовано</span>
        </>
      ) : (
        <>
          <Copy className="w-3 h-3 text-zinc-400" />
          <span>{roomId}</span>
        </>
      )}
    </button>
  );

  const radioMenuPopoverInner = (
    <>
      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-zinc-800">
        <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-lg">
          <button
            type="button"
            onClick={() => setRadioTab('pings')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
              radioTab === 'pings'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Сигнали
          </button>
          <button
            type="button"
            onClick={() => setRadioTab('console')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-colors ${
              radioTab === 'console'
                ? 'bg-amber-500/20 text-amber-300'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Terminal className="w-3 h-3" />
            <span>Консоль</span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => setQuickPingOpen(false)}
          className="text-zinc-400 hover:text-white p-1"
          aria-label="Закрити меню рації"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Radio Section-Distance Signal Strength Meter & Searching Indicator */}
      <div
        className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] font-mono-tech transition-colors ${
          isSearchingNetwork
            ? 'bg-amber-950/45 border-amber-500/50 text-amber-200'
            : radioSignalBars <= 3
              ? 'bg-zinc-900/90 border-amber-500/35 text-amber-200'
              : 'bg-zinc-900/85 border-emerald-500/30 text-emerald-200'
        }`}
        aria-label={`Сила сигналу рації: ${radioSignalPct}%, ${sectionDistanceLabel}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-end gap-[2px] h-3.5 shrink-0" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((bar) => {
              const barHeights = ['h-1', 'h-1.5', 'h-2', 'h-2.5', 'h-3.5'];
              const isLit = !isSearchingNetwork && bar <= radioSignalBars;
              return (
                <span
                  key={bar}
                  style={
                    isSearchingNetwork
                      ? { animationDelay: `${(bar - 1) * 120}ms` }
                      : undefined
                  }
                  className={`w-[3px] rounded-[1px] transition-all duration-300 ${
                    barHeights[bar - 1]
                  } ${
                    isSearchingNetwork
                      ? 'bg-amber-400 animate-radio-search-bar'
                      : isLit
                        ? radioSignalBars <= 2
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                        : 'bg-zinc-700/70'
                  }`}
                />
              );
            })}
          </div>
          <div className="truncate">
            {isSearchingNetwork ? (
              <span className="flex items-center gap-1.5 font-bold text-amber-300">
                <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 animate-radio-radar" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-300" />
                </span>
                <span className="truncate">Пошук мережі...</span>
              </span>
            ) : (
              <span className="truncate text-zinc-300">{sectionDistanceLabel}</span>
            )}
          </div>
        </div>
        <span className="font-bold shrink-0">{radioSignalPct}%</span>
      </div>

      {radioTab === 'pings' ? (
        <div className="space-y-2">
          {/* Radio Chat Log showing recent messages & packet-drop errors */}
          {radioChatLog.length > 0 && (
            <div className="max-h-28 overflow-y-auto rounded-lg bg-zinc-950/85 border border-zinc-800 p-2 space-y-1.5">
              {radioChatLog.map((entry) => {
                const isErr = entry.status === 'packet_error';
                return (
                  <div
                    key={entry.id}
                    className={`text-[11px] leading-snug rounded px-1.5 py-1 ${
                      isErr
                        ? 'bg-red-950/55 border border-red-500/40 text-red-200 font-mono-tech'
                        : 'text-zinc-300'
                    }`}
                  >
                    <span
                      className={`font-bold mr-1 ${
                        isErr ? 'text-red-400' : 'text-emerald-300'
                      }`}
                    >
                      {entry.fromName}:
                    </span>
                    <span>{entry.text}</span>
                  </div>
                );
              })}
            </div>
          )}

          {(scene.mode === 'split' || isBatteryLow || isBatteryCritical) && (
            <p className="text-[10px] font-mono-tech text-amber-300/90 px-1 leading-snug">
              {isBatteryLow || isBatteryCritical
                ? 'Увага: низький заряд — можливі втрати пакетів зв’язку.'
                : 'Увага: перешкоди між вагонами — сигнал може перериватися.'}
            </p>
          )}

          {micPermission === 'denied' && (
            <p className="text-[11px] text-amber-300 px-1 leading-snug">
              Мікрофон недоступний — використовуйте текстові радіосигнали нижче.
            </p>
          )}
          <div className="flex flex-col gap-1">
            {QUICK_RADIO_PINGS.map((phrase) => (
              <button
                key={phrase}
                type="button"
                onClick={() => {
                  onSendQuickPing(phrase);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-100 bg-zinc-900 hover:bg-emerald-950/60 hover:text-emerald-200 border border-zinc-800 transition-colors"
              >
                {phrase}
              </button>
            ))}
          </div>
        </div>
      ) : role === 'p2' ? (
        <div className="space-y-2">
          <p className="text-[11px] text-zinc-400 leading-snug">
            Введіть коротку команду для віддаленого впливу на вагон {playerNames.p1}:
          </p>
          <form onSubmit={handleConsoleSubmit} className="flex items-center gap-1.5">
            <input
              type="text"
              value={consoleInput}
              onChange={(e) => {
                setConsoleInput(e.target.value);
                if (consoleError) setConsoleError(null);
              }}
              placeholder="light / alarm / surge / ping"
              maxLength={24}
              className="flex-1 px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 focus:border-amber-400 focus:outline-none font-mono-tech text-xs text-amber-200 placeholder:text-zinc-500"
            />
            <button
              type="submit"
              className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shrink-0 transition-colors"
            >
              ОК
            </button>
          </form>
          {consoleError && (
            <p className="text-[11px] text-red-400 leading-tight">{consoleError}</p>
          )}
          <div className="grid grid-cols-2 gap-1.5 pt-0.5">
            {REMOTE_COMMANDS.map((item) => (
              <button
                key={item.cmd}
                type="button"
                onClick={() => {
                  onSendRemoteCommand(item.kind, item.cmd, item.label);
                }}
                className="px-2 py-1.5 rounded-lg bg-zinc-900 hover:bg-amber-950/45 border border-zinc-800 hover:border-amber-500/50 text-left transition-colors"
              >
                <div className="font-mono-tech text-[11px] font-bold text-amber-300">
                  {item.cmd}
                </div>
                <div className="text-[10px] text-zinc-400 truncate">{item.label}</div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-1.5 py-1.5 px-1">
          <p className="text-xs font-semibold text-zinc-200">
            Приймач команд вагона {playerNames.p1}
          </p>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Сервісна консоль керування світлом і тривогою доступна у сусідньому вагоні у {playerNames.p2} (Гравець 2).
          </p>
          {activeRemoteEffect && (
            <div className="mt-1 px-2.5 py-1.5 rounded-lg bg-amber-950/40 border border-amber-500/40 text-[11px] text-amber-200 font-mono-tech">
              Активний імпульс: {activeRemoteEffect.label}
            </div>
          )}
        </div>
      )}
    </>
  );

  const renderPttButton = (fullWidth = false) => (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        onStartTalking();
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        onStopTalking();
      }}
      onPointerCancel={() => onStopTalking()}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative flex items-center ${
        fullWidth ? 'flex-1 justify-between px-3.5 h-12' : 'gap-2.5 sm:gap-3 px-3.5 sm:px-4 h-12 sm:h-13'
      } rounded-2xl border-2 select-none touch-none transition-all duration-500 ease-in-out ${
        radioOverheating
          ? 'bg-red-700/95 border-red-300 text-white shadow-[0_0_32px_rgba(239,68,68,0.85)] scale-[0.98]'
          : isMicMuted
            ? 'bg-zinc-900/80 border-red-800/75 text-red-200/80 opacity-85 shadow-none'
            : batteryDepleted
              ? 'bg-zinc-900/75 border-red-900/70 text-zinc-500 opacity-70 grayscale-[60%] shadow-none'
              : isConnectionLost
                ? isSpeaking
                  ? 'bg-zinc-800/80 border-zinc-600/80 text-zinc-400 opacity-80 grayscale scale-[0.98] shadow-none'
                  : 'bg-zinc-900/70 border-zinc-800/90 text-zinc-500 opacity-65 grayscale shadow-none'
                : isWeakSignal
                  ? isSpeaking
                    ? 'bg-zinc-800/90 border-zinc-500/80 text-zinc-300 opacity-85 saturate-50 scale-[0.98]'
                    : 'bg-zinc-900/80 border-zinc-700/80 text-zinc-400 opacity-75 saturate-50 shadow-none'
                  : isSpeaking
                    ? pttHoldSeconds >= 7
                      ? 'bg-amber-600/95 border-amber-300 text-white shadow-[0_0_26px_rgba(245,158,11,0.7)] scale-[0.98]'
                      : 'bg-emerald-600/95 border-emerald-300 text-white shadow-[0_0_28px_rgba(16,185,129,0.7)] scale-[0.98]'
                    : partnerSpeaking
                      ? 'bg-[#101c1c]/95 border-emerald-500/80 text-emerald-200 shadow-[0_0_18px_rgba(16,185,129,0.35)]'
                      : 'bg-[#121622]/90 hover:bg-[#1a2030] border-zinc-600/80 text-zinc-100 shadow-[0_8px_24px_rgba(0,0,0,0.65)]'
      }`}
      aria-label={
        radioOverheating
          ? 'Перегрів рації — відпустіть кнопку'
          : isMicMuted
            ? 'Режим тиші активний — мікрофон вимкнено'
            : batteryDepleted
              ? 'Рація розряджена'
              : isConnectionLost
                ? 'Рація вимкнена: немає зв’язку з партнером'
                : isWeakSignal
                  ? 'Рація: слабкий сигнал'
                  : 'Рація: натисни і говори'
      }
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors duration-500 ${
            radioOverheating
              ? 'bg-red-300 text-red-950'
              : isMicMuted
                ? 'bg-red-950/85 text-red-400'
                : batteryDepleted
                  ? 'bg-red-950/70 text-red-400'
                  : isConnectionLost
                    ? 'bg-zinc-800/80 text-zinc-500'
                    : isWeakSignal
                      ? 'bg-zinc-800/90 text-zinc-400'
                      : isSpeaking
                        ? pttHoldSeconds >= 7
                          ? 'bg-amber-300 text-amber-950'
                          : 'bg-emerald-400 text-zinc-950'
                        : micPermission === 'denied'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-zinc-800 text-emerald-400'
          }`}
        >
          {radioOverheating ? (
            <Flame className="w-4 h-4" />
          ) : isMicMuted ? (
            <MicOff className="w-4 h-4" />
          ) : batteryDepleted ? (
            <BatteryWarning className="w-4 h-4" />
          ) : isConnectionLost ? (
            <WifiOff className="w-4 h-4" />
          ) : micPermission === 'denied' ? (
            <MicOff className="w-4 h-4" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
        </div>

        <div className="flex flex-col items-start leading-none min-w-0">
          <span className="font-display text-xs sm:text-sm font-bold tracking-wider uppercase whitespace-nowrap truncate max-w-full transition-colors duration-500">
            {radioOverheating
              ? 'ПЕРЕГРІВ РАЦІЇ!'
              : isMicMuted
                ? 'РЕЖИМ ТИШІ'
                : batteryDepleted
                  ? `ПІДЗАРЯДКА (${roundedBattery}%)`
                  : isConnectionLost
                    ? !browserOnline || connectionStatus === 'error'
                      ? 'НЕМАЄ СИГНАЛУ'
                      : isSpeaking
                        ? 'ПЕРЕШКОДИ В ЕФІРІ...'
                        : 'ЗВ’ЯЗОК ВТРАЧЕНО'
                    : isWeakSignal
                      ? 'СЛАБКИЙ СИГНАЛ...'
                      : isSpeaking
                        ? pttHoldSeconds >= 7
                          ? `НАГРІВАННЯ (${Math.floor(pttHoldSeconds)}с)...`
                          : 'ЕФІР АКТИВНИЙ...'
                        : partnerSpeaking
                          ? `${playerNames[otherRole]} ГОВОРИТЬ`
                          : 'НАТИСНИ І ГОВОРИ'}
          </span>
          {/* Live Waveform Bars */}
          <div className="flex items-center gap-0.5 h-3 mt-1" aria-hidden="true">
            {audioLevels.map((lvl, idx) => {
              const activeHeight = isMicMuted
                ? 14
                : isRadioDimmed
                  ? isSpeaking
                    ? Math.max(15, Math.round(lvl * 45))
                    : 14
                  : isSpeaking
                    ? Math.max(25, Math.round(lvl * 100))
                    : partnerSpeaking
                      ? 30 + ((idx * 17) % 60)
                      : 20;
              return (
                <span
                  key={idx}
                  className={`w-1 rounded-full transition-all duration-300 ${
                    isMicMuted
                      ? 'bg-red-500/45'
                      : isRadioDimmed
                        ? 'bg-zinc-600/60'
                        : isSpeaking
                          ? 'bg-white'
                          : partnerSpeaking
                            ? 'bg-emerald-400'
                            : 'bg-zinc-500/70'
                  }`}
                  style={{ height: `${activeHeight}%` }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Integrated 5-Bar Fluctuating RF Signal Strength Meter inside Radio Interface */}
      <div
        className="flex flex-col items-end justify-center pl-2.5 border-l border-white/15 shrink-0"
        title={`Сигнал рації: ${radioSignalPct}% · ${isSearchingNetwork ? 'Пошук мережі...' : sectionDistanceLabel}`}
        aria-hidden="true"
      >
        <div className="flex items-end gap-[2px] h-4">
          {[1, 2, 3, 4, 5].map((bar) => {
            const barHeights = ['h-1', 'h-1.5', 'h-2.5', 'h-3', 'h-4'];
            const isLit = !isSearchingNetwork && bar <= radioSignalBars;
            return (
              <span
                key={bar}
                style={
                  isSearchingNetwork
                    ? { animationDelay: `${(bar - 1) * 120}ms` }
                    : undefined
                }
                className={`w-[3px] rounded-[1px] transition-colors duration-300 ${
                  barHeights[bar - 1]
                } ${
                  isSearchingNetwork
                    ? 'bg-amber-400 animate-radio-search-bar'
                    : isLit
                      ? radioSignalBars <= 2
                        ? 'bg-amber-400'
                        : isSpeaking
                          ? 'bg-white'
                          : 'bg-emerald-400'
                      : 'bg-white/20'
                }`}
              />
            );
          })}
        </div>
        <span
          className={`font-mono-tech text-[9px] font-bold leading-none mt-1 ${
            isSearchingNetwork
              ? 'text-amber-300'
              : radioSignalBars <= 2
                ? 'text-amber-300/90'
                : isSpeaking
                  ? 'text-white/90'
                  : 'text-emerald-300/90'
          }`}
        >
          {isSearchingNetwork ? 'ПОШУК' : `${radioSignalPct}%`}
        </span>
      </div>
    </button>
  );

  const renderInventorySlots = (compactGrid = false) => (
    <div
      className={`${
        compactGrid ? 'grid grid-cols-4 gap-2 w-full' : 'flex items-center gap-1.5'
      } p-1.5 rounded-2xl bg-[#0c101a]/90 backdrop-blur-md border shadow-[0_10px_28px_rgba(0,0,0,0.75)] transition-colors ${
        emergencySiren
          ? 'border-red-500 shadow-[0_0_24px_rgba(239,68,68,0.55)] animate-siren-flash'
          : 'border-zinc-700/75'
      }`}
      aria-label="Інвентар"
    >
      {[0, 1, 2, 3].map((slotIdx) => {
        const entry = visibleInventory[slotIdx];
        const item = entry ? quest.items[entry.itemId] : null;
        const isSelected = Boolean(item && selectedItemId === item.id);

        return (
          <button
            key={slotIdx}
            type="button"
            disabled={!item}
            onClick={() => {
              if (!item) return;
              onSelectItem(isSelected ? null : item.id);
            }}
            className={`relative ${
              compactGrid ? 'h-11 w-full' : 'w-11 h-11 sm:w-12 sm:h-12'
            } rounded-xl border flex flex-col items-center justify-center transition-all ${
              item
                ? isSelected
                  ? 'bg-amber-500/20 border-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.4)] scale-105'
                  : 'bg-zinc-900/95 hover:bg-zinc-800 border-zinc-600/80'
                : 'bg-zinc-950/65 border-zinc-800/70 cursor-default'
            }`}
            title={item ? item.name : 'Порожній слот'}
          >
            {item ? (
              <>
                <ItemIcon icon={item.icon} className="w-7 h-7 sm:w-8 sm:h-8" />
                {scene.mode === 'split' && item.transferable && (
                  <span
                    className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-sky-500 text-zinc-950 flex items-center justify-center"
                    title="Можна передати партнеру"
                  >
                    <Send className="w-2 h-2" />
                  </span>
                )}
              </>
            ) : (
              <span className="text-[10px] font-mono-tech text-zinc-700">{slotIdx + 1}</span>
            )}
          </button>
        );
      })}
    </div>
  );

  // =========================================================================
  // PORTRAIT MOBILE LAYOUT (max-width: 768px & orientation: portrait)
  // 3 stacked sections: Top Header -> Centered 16:9 Stage -> Bottom Control Dock
  // =========================================================================
  if (portraitMode) {
    return (
      <>
        {/* TOP SECTION (outside the scene): Radio Status, Telemetry, Avatars & Current Task */}
        <header className="relative z-20 shrink-0 px-3 pt-2.5 pb-2 bg-[#0b101b]/95 border-b border-zinc-800/80 space-y-2">
          <div className="flex items-start justify-between gap-2">
            {/* Left: Radio Status + Room ID + Battery + Ping + Siren/Mute Badges */}
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      partnerOnline
                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.85)]'
                        : 'bg-amber-400'
                    }`}
                  />
                  <span
                    className={`truncate ${
                      partnerOnline ? 'text-emerald-300' : 'text-amber-300'
                    }`}
                  >
                    {radioStatusText}
                  </span>
                </div>
                {roomCopyButton}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {batteryWidget}
                {pingWidget}
                <button
                  type="button"
                  onClick={onTriggerSiren}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold transition-all whitespace-nowrap ${
                    emergencySiren
                      ? 'bg-red-600 border-red-300 text-white shadow-[0_0_18px_rgba(239,68,68,0.85)] animate-siren-flash'
                      : 'bg-red-950/85 hover:bg-red-800/90 border-red-500/70 text-red-100'
                  }`}
                  title="Запустити аварійну сирену на обох екранах"
                  aria-label="Аварійна сирена"
                >
                  <Siren
                    className={`w-3 h-3 shrink-0 ${
                      emergencySiren ? 'text-white' : 'text-red-400'
                    }`}
                  />
                  <span>Сирена</span>
                </button>
                {soloTestMode && (
                  <button
                    type="button"
                    onClick={onSwitchSoloRole}
                    className="px-2 py-0.5 rounded-md bg-zinc-900 border border-amber-400/50 text-[11px] font-bold text-amber-300 flex items-center gap-1 whitespace-nowrap"
                    title="Перемкнути огляд між Сясюнею та Юясею"
                  >
                    <ArrowRightLeft className="w-3 h-3" />
                    <span>{role === 'p1' ? 'За Юясю' : 'За Сясюню'}</span>
                  </button>
                )}
                {isMicMuted && (
                  <button
                    type="button"
                    onClick={onToggleMicMute}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-950/90 border border-red-500/75 text-red-100 text-[11px] font-semibold whitespace-nowrap"
                    title="Режим тиші активний — натисніть, щоб увімкнути мікрофон"
                    aria-label="Мікрофон вимкнено. Натисніть, щоб вимкнути Режим тиші"
                  >
                    <MicOff className="w-3 h-3 text-red-400 shrink-0" />
                    <span>Мікрофон вимкнено</span>
                  </button>
                )}
              </div>
            </div>

            {/* Right: Compact Avatars (Сясюня & Юяся) */}
            <div
              className={`shrink-0 flex items-start gap-2 bg-[#0f1524]/90 px-2 py-1 rounded-xl border transition-colors ${
                emergencySiren
                  ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.55)] animate-siren-flash'
                  : 'border-zinc-800/90'
              }`}
            >
              <PlayerAvatar
                role="p1"
                name={playerNames.p1}
                avatarUrl={quest.players.p1.avatarUrl}
                online={role === 'p1' ? true : partnerOnline}
                speaking={speakingState.p1}
                isMe={role === 'p1'}
                size="sm"
              />
              <PlayerAvatar
                role="p2"
                name={playerNames.p2}
                avatarUrl={quest.players.p2.avatarUrl}
                online={role === 'p2' ? true : partnerOnline}
                speaking={speakingState.p2}
                isMe={role === 'p2'}
                size="sm"
              />
            </div>
          </div>

          {/* Current Task Banner */}
          <div
            className={`rounded-xl bg-[#0e1422] border px-3 py-1.5 shadow-md transition-colors ${
              emergencySiren
                ? 'border-red-500 shadow-[0_0_18px_rgba(239,68,68,0.5)] animate-siren-flash'
                : 'border-zinc-800/90'
            }`}
          >
            <div className="flex items-center justify-between gap-2 text-[10px] font-medium">
              <span className={emergencySiren ? 'text-red-300' : 'text-zinc-400'}>
                Завдання · {scene.mode === 'shared' ? 'Спільний вагон' : 'Розділені вагони'}
              </span>
              {locationLabel && (
                <span className="font-mono-tech text-zinc-400 truncate max-w-[45%]">
                  {locationLabel}
                </span>
              )}
            </div>
            <p className="text-xs font-bold text-zinc-50 leading-snug mt-0.5">
              {scene.task}
            </p>
          </div>
        </header>

        {/* MIDDLE SECTION: Strictly 16:9 Interactive Scene centered vertically */}
        <section className="relative flex-1 min-h-0 w-full flex flex-col items-center justify-center bg-[#090D16] overflow-hidden">
          {emergencySiren && (
            <div className="pointer-events-none absolute top-2 inset-x-3 z-20 flex justify-center">
              <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-red-700/95 border-2 border-red-300 text-white text-xs font-mono-tech font-bold tracking-wider uppercase shadow-[0_0_24px_rgba(239,68,68,0.85)] animate-siren-flash">
                <Siren className="w-3.5 h-3.5 shrink-0" />
                <span>АВАРІЙНА СИРЕНА · {emergencySiren.fromName}</span>
              </div>
            </div>
          )}

          {portraitStage}

          {radioMessages.length > 0 && (
            <div className="pointer-events-none absolute bottom-2 inset-x-3 z-20 flex flex-col items-center gap-1">
              {radioMessages.map((msg) => {
                const isPacketError = msg.status === 'packet_error';
                return (
                  <div
                    key={msg.id}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border shadow-xl text-xs max-w-full ${
                      isPacketError
                        ? 'bg-red-950/92 border-red-500/70 text-red-100 font-mono-tech animate-shake'
                        : 'bg-[#0c141d]/92 border-emerald-500/45 text-zinc-100'
                    }`}
                  >
                    {isPacketError ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    ) : (
                      <Radio className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    )}
                    <span
                      className={`font-bold shrink-0 ${
                        isPacketError ? 'text-red-300' : 'text-emerald-300'
                      }`}
                    >
                      {msg.fromName}:
                    </span>
                    <span className="truncate">{msg.text}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* BOTTOM SECTION (outside the scene): Dedicated Control Dock (PTT, Tools, 4-Slot Inventory) */}
        <footer className="relative z-20 shrink-0 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-[#0b101b]/95 border-t border-zinc-800/80 space-y-2">
          {/* Anchored Radio Menu Popover above the dock */}
          {quickPingOpen && (
            <div className="absolute bottom-full inset-x-3 mb-2 max-h-[52dvh] overflow-y-auto rounded-xl bg-[#101521]/98 border border-zinc-700 shadow-2xl p-2.5 space-y-2 z-30">
              {radioMenuPopoverInner}
            </div>
          )}

          {/* Searching for Network Micro-Banner above bottom dock */}
          {isSearchingNetwork && !quickPingOpen && (
            <div
              className="pointer-events-none absolute -top-7 left-3 flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#141118]/95 border border-amber-500/55 text-amber-300 text-[10px] font-mono-tech font-bold shadow-lg whitespace-nowrap"
              aria-live="polite"
            >
              <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 animate-radio-radar" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-300" />
              </span>
              <span>Пошук мережі...</span>
            </div>
          )}

          {/* Row 1: PTT Radio Button + Local Mute Toggle */}
          <div className="flex items-center gap-2">
            {renderPttButton(true)}

            <button
              type="button"
              onClick={onToggleMicMute}
              aria-pressed={isMicMuted}
              className={`h-12 w-12 rounded-2xl border flex items-center justify-center transition-colors shrink-0 ${
                isMicMuted
                  ? 'bg-red-950/90 hover:bg-red-900/90 border-red-500/80 text-red-200 shadow-[0_0_16px_rgba(239,68,68,0.28)]'
                  : 'bg-[#121622]/90 hover:bg-[#1a2030] border-zinc-700/80 text-zinc-300'
              }`}
              title={
                isMicMuted
                  ? 'Вимкнути «Режим тиші» (увімкнути мікрофон)'
                  : 'Активувати «Режим тиші» (вимкнути мікрофон)'
              }
              aria-label={
                isMicMuted
                  ? 'Вимкнути Режим тиші та увімкнути мікрофон'
                  : 'Активувати Режим тиші та вимкнути мікрофон'
              }
            >
              {isMicMuted ? (
                <MicOff className="w-4 h-4 text-red-400" />
              ) : (
                <Mic className="w-4 h-4 text-zinc-300" />
              )}
            </button>
          </div>

          {/* Row 2: Quick-Ping / Console + Shared Notebook + Ambient Audio Toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQuickPingOpen((prev) => !prev)}
              className={`flex-1 h-10 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-colors ${
                quickPingOpen || micPermission === 'denied'
                  ? 'bg-amber-500/20 border-amber-400/70 text-amber-300'
                  : 'bg-[#121622]/90 hover:bg-[#1a2030] border-zinc-700/80 text-zinc-200'
              }`}
              title="Текстові сигнали рації та консоль"
              aria-label="Відкрити швидкі сигнали рації"
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Сигнали</span>
            </button>

            <button
              type="button"
              onClick={onOpenNotebook}
              className={`flex-1 h-10 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-colors ${
                hasUnreadNotes
                  ? 'bg-amber-500/20 border-amber-400/80 text-amber-200 shadow-[0_0_14px_rgba(251,191,36,0.28)]'
                  : 'bg-[#121622]/90 hover:bg-[#1a2030] border-zinc-700/80 text-zinc-200'
              }`}
              title="Спільний блокнот для кодів та підказок"
              aria-label="Відкрити спільний блокнот"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Блокнот</span>
              {notesCount > 0 && (
                <span className="font-mono-tech text-[11px] font-bold text-amber-300">
                  {notesCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onToggleAmbient}
              className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors shrink-0 ${
                ambientMuted
                  ? 'bg-zinc-900/75 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                  : 'bg-[#121622]/90 hover:bg-[#1a2030] border-zinc-700/80 text-zinc-200'
              }`}
              title={ambientMuted ? 'Увімкнути фоновий звук потяга' : 'Вимкнути фоновий звук потяга'}
              aria-label={
                ambientMuted ? 'Увімкнути фоновий звук потяга' : 'Вимкнути фоновий звук потяга'
              }
            >
              {ambientMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4 text-sky-400" />
              )}
            </button>
          </div>

          {/* Row 3: Selected Item Action + 4-Slot Inventory Bar */}
          <div className="space-y-1.5">
            {selectedItem && (
              <div className="flex items-center justify-between gap-2 bg-[#0e131e] border border-zinc-700/80 rounded-xl px-3 py-1.5 shadow-lg">
                <span className="text-xs font-semibold text-zinc-100 truncate">
                  {selectedItem.name}
                </span>
                {canTransfer && (
                  <button
                    type="button"
                    onClick={() => {
                      onTransferItem(selectedItem.id);
                      onSelectItem(null);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs flex items-center gap-1 transition-colors shrink-0"
                  >
                    <Send className="w-3 h-3" />
                    <span>Передати</span>
                  </button>
                )}
              </div>
            )}
            {renderInventorySlots(true)}
          </div>
        </footer>
      </>
    );
  }

  // =========================================================================
  // LANDSCAPE / DESKTOP LAYOUT: Fullscreen 16:9 Overlay HUD on Corners
  // =========================================================================
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-2.5 sm:p-4">
      {/* TOP BAR: Top-Left Status & Task | Top-Right Avatars */}
      <div className="flex items-start justify-between gap-3">
        {/* Top-Left: Radio Status + Current Task */}
        <div className="pointer-events-auto max-w-[58%] sm:max-w-md space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  partnerOnline
                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.85)]'
                    : 'bg-amber-400'
                }`}
              />
              <span className={partnerOnline ? 'text-emerald-300' : 'text-amber-300'}>
                {radioStatusText}
              </span>
            </div>

            {roomCopyButton}

            {/* Visual Device Battery Level Widget (depletes when using PTT radio) */}
            {batteryWidget}

            {/* Real-Time Radio Latency (Ping) & Signal Strength Widget */}
            {pingWidget}
          </div>

          <div
            className={`rounded-xl bg-[#0b0f18]/80 backdrop-blur-md border px-3 py-2 shadow-lg transition-colors ${
              emergencySiren
                ? 'border-red-500 shadow-[0_0_22px_rgba(239,68,68,0.5)] animate-siren-flash'
                : 'border-zinc-700/60'
            }`}
          >
            <p
              className={`text-[11px] sm:text-xs font-medium leading-tight ${
                emergencySiren ? 'text-red-300' : 'text-zinc-400'
              }`}
            >
              Завдання · {scene.mode === 'shared' ? 'Спільний вагон' : 'Розділені вагони'}
            </p>
            <p className="text-xs sm:text-sm font-bold text-zinc-50 leading-snug mt-0.5">
              {scene.task}
            </p>
          </div>
        </div>

        {/* Top-Right: Two Circular Player Avatars + Emergency Siren + Mic Muted Indicator */}
        <div className="pointer-events-auto flex flex-col items-end gap-1.5">
          <div className="flex items-start gap-2.5 sm:gap-3.5">
            {soloTestMode && (
              <button
                type="button"
                onClick={onSwitchSoloRole}
                className="mt-1 px-2.5 py-1.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-amber-400/50 text-[11px] font-bold text-amber-300 flex items-center gap-1.5 shadow-lg transition-colors whitespace-nowrap"
                title="Перемкнути огляд між Сясюнею та Юясею"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>{role === 'p1' ? 'За Юясю' : 'За Сясюню'}</span>
              </button>
            )}

            <div
              className={`flex items-start gap-2.5 sm:gap-3.5 bg-[#0b0f18]/65 backdrop-blur-md px-2.5 py-1.5 rounded-2xl border transition-colors ${
                emergencySiren
                  ? 'border-red-500 shadow-[0_0_22px_rgba(239,68,68,0.55)] animate-siren-flash'
                  : 'border-zinc-800/80'
              }`}
            >
              <PlayerAvatar
                role="p1"
                name={playerNames.p1}
                avatarUrl={quest.players.p1.avatarUrl}
                online={role === 'p1' ? true : partnerOnline}
                speaking={speakingState.p1}
                isMe={role === 'p1'}
              />
              <PlayerAvatar
                role="p2"
                name={playerNames.p2}
                avatarUrl={quest.players.p2.avatarUrl}
                online={role === 'p2' ? true : partnerOnline}
                speaking={speakingState.p2}
                isMe={role === 'p2'}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {/* Emergency Siren ('Аварійна сирена') Button */}
            <button
              type="button"
              onClick={onTriggerSiren}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border backdrop-blur-md text-[11px] font-bold tracking-wide transition-all whitespace-nowrap ${
                emergencySiren
                  ? 'bg-red-600 border-red-300 text-white shadow-[0_0_24px_rgba(239,68,68,0.85)] animate-siren-flash'
                  : 'bg-red-950/85 hover:bg-red-800/90 border-red-500/70 hover:border-red-400 text-red-100 shadow-[0_4px_14px_rgba(0,0,0,0.55)]'
              }`}
              title="Запустити аварійну сирену та тривожне миготіння на обох екранах"
              aria-label="Аварійна сирена"
            >
              <Siren
                className={`w-3.5 h-3.5 shrink-0 ${
                  emergencySiren ? 'text-white' : 'text-red-400'
                }`}
              />
              <span>Аварійна сирена</span>
            </button>

            {/* Persistent Top-Corner Indicator when local 'Режим тиші' (Mute) is active */}
            {isMicMuted && (
              <button
                type="button"
                onClick={onToggleMicMute}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-red-950/90 hover:bg-red-900/90 backdrop-blur-md border border-red-500/75 text-red-100 text-[11px] font-semibold shadow-[0_0_18px_rgba(239,68,68,0.32)] transition-colors whitespace-nowrap"
                title="Режим тиші активний — натисніть, щоб увімкнути мікрофон"
                aria-label="Мікрофон вимкнено. Натисніть, щоб вимкнути Режим тиші"
              >
                <MicOff className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span>Мікрофон вимкнено</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ACTIVE EMERGENCY SIREN FLASHING ALERT BANNER */}
      {emergencySiren && (
        <div className="pointer-events-none self-center mt-1 flex items-center gap-2 px-4 py-1.5 rounded-xl bg-red-700/95 border-2 border-red-300 text-white text-xs sm:text-sm font-mono-tech font-bold tracking-wider uppercase shadow-[0_0_30px_rgba(239,68,68,0.85)] animate-siren-flash">
          <Siren className="w-4 h-4 shrink-0" />
          <span>АВАРІЙНА СИРЕНА · {emergencySiren.fromName}</span>
        </div>
      )}

      {/* FLOATING RADIO QUICK-PING & PACKET ERROR MESSAGES */}
      {radioMessages.length > 0 && (
        <div className="pointer-events-none self-center flex flex-col items-center gap-1.5 my-auto max-w-[90%]">
          {radioMessages.map((msg) => {
            const isPacketError = msg.status === 'packet_error';
            return (
              <div
                key={msg.id}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border shadow-xl text-xs sm:text-sm ${
                  isPacketError
                    ? 'bg-red-950/92 border-red-500/70 text-red-100 font-mono-tech animate-shake'
                    : 'bg-[#0c141d]/90 border-emerald-500/45 text-zinc-100'
                }`}
              >
                {isPacketError ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                ) : (
                  <Radio className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                )}
                <span
                  className={`font-bold shrink-0 ${
                    isPacketError ? 'text-red-300' : 'text-emerald-300'
                  }`}
                >
                  {msg.fromName}:
                </span>
                <span>{msg.text}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* BOTTOM BAR: Spacer / Left Info | Bottom-Center PTT Radio | Bottom-Right 4-Slot Inventory */}
      <div className="relative flex items-end justify-between gap-2">
        {/* Bottom-Left subtle location indicator (desktop/tablet) */}
        <div className="hidden md:flex flex-col gap-0.5 text-xs text-zinc-400 bg-[#0b0f18]/70 backdrop-blur-sm border border-zinc-800/80 rounded-xl px-3 py-2 max-w-[200px]">
          <span className="font-mono-tech text-[10px] text-zinc-400 uppercase tracking-wider">
            Локація
          </span>
          <span className="font-semibold text-zinc-200 truncate">{locationLabel}</span>
        </div>

        {/* Bottom-Center: Push-to-Talk Radio Button + Waveform + Fallback Quick Ping */}
        <div className="pointer-events-auto relative flex items-center gap-2 mx-auto md:mx-0">
          {/* Radio Menu Popover: Quick Pings + P2 Remote Command Console */}
          {quickPingOpen && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-72 sm:w-80 rounded-xl bg-[#101521]/95 border border-zinc-700 shadow-2xl p-2.5 space-y-2 z-30">
              {radioMenuPopoverInner}
            </div>
          )}

          {/* Searching for Network Floating Micro-Banner above PTT when signal dips low */}
          {isSearchingNetwork && !quickPingOpen && (
            <div
              className="pointer-events-none absolute -top-7 left-0 flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#141118]/92 border border-amber-500/55 text-amber-300 text-[10px] font-mono-tech font-bold shadow-lg whitespace-nowrap"
              aria-live="polite"
            >
              <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 animate-radio-radar" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-300" />
              </span>
              <span>Пошук мережі...</span>
            </div>
          )}

          {/* Main PTT Radio Button */}
          {renderPttButton(false)}

          {/* Local 'Режим тиші' (Mute) Toggle Button */}
          <button
            type="button"
            onClick={onToggleMicMute}
            aria-pressed={isMicMuted}
            className={`h-12 sm:h-13 px-2.5 sm:px-3 rounded-2xl border flex items-center justify-center gap-1.5 transition-colors shrink-0 ${
              isMicMuted
                ? 'bg-red-950/90 hover:bg-red-900/90 border-red-500/80 text-red-200 shadow-[0_0_16px_rgba(239,68,68,0.28)]'
                : 'bg-[#121622]/90 hover:bg-[#1a2030] border-zinc-700/80 text-zinc-300'
            }`}
            title={
              isMicMuted
                ? 'Вимкнути «Режим тиші» (увімкнути мікрофон, клавіша M)'
                : 'Активувати «Режим тиші» (тимчасово вимкнути мікрофон, клавіша M)'
            }
            aria-label={
              isMicMuted
                ? 'Вимкнути Режим тиші та увімкнути мікрофон'
                : 'Активувати Режим тиші та вимкнути мікрофон'
            }
          >
            {isMicMuted ? (
              <MicOff className="w-4 h-4 text-red-400 shrink-0" />
            ) : (
              <Mic className="w-4 h-4 text-zinc-300 shrink-0" />
            )}
            <span className="text-xs font-bold whitespace-nowrap hidden xl:inline">
              Режим тиші
            </span>
          </button>

          {/* Fallback / Quick-Ping Radio Button */}
          <button
            type="button"
            onClick={() => setQuickPingOpen((prev) => !prev)}
            className={`w-11 h-12 sm:h-13 rounded-2xl border flex items-center justify-center transition-colors shrink-0 ${
              quickPingOpen || micPermission === 'denied'
                ? 'bg-amber-500/20 border-amber-400/70 text-amber-300'
                : 'bg-[#121622]/90 hover:bg-[#1a2030] border-zinc-700/80 text-zinc-300'
            }`}
            title="Текстові сигнали рації"
            aria-label="Відкрити швидкі сигнали рації"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          {/* Shared Notebook ('Блокнот') Button */}
          <button
            type="button"
            onClick={onOpenNotebook}
            className={`relative h-12 sm:h-13 px-3 sm:px-3.5 rounded-2xl border flex items-center gap-1.5 transition-colors shrink-0 ${
              hasUnreadNotes
                ? 'bg-amber-500/20 border-amber-400/80 text-amber-200 shadow-[0_0_16px_rgba(251,191,36,0.28)]'
                : 'bg-[#121622]/90 hover:bg-[#1a2030] border-zinc-700/80 text-zinc-200'
            }`}
            title="Спільний блокнот для кодів та підказок"
            aria-label="Відкрити спільний блокнот"
          >
            <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs font-bold whitespace-nowrap hidden sm:inline">Блокнот</span>
            {notesCount > 0 && (
              <span className="font-mono-tech text-[11px] font-bold text-amber-300">
                {notesCount}
              </span>
            )}
          </button>

          {/* Ambient Train Sound Toggle */}
          <button
            type="button"
            onClick={onToggleAmbient}
            className={`w-11 h-12 sm:h-13 rounded-2xl border flex items-center justify-center transition-colors shrink-0 ${
              ambientMuted
                ? 'bg-zinc-900/75 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                : 'bg-[#121622]/90 hover:bg-[#1a2030] border-zinc-700/80 text-zinc-200'
            }`}
            title={ambientMuted ? 'Увімкнути фоновий звук потяга' : 'Вимкнути фоновий звук потяга'}
            aria-label={
              ambientMuted ? 'Увімкнути фоновий звук потяга' : 'Вимкнути фоновий звук потяга'
            }
          >
            {ambientMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4 text-sky-400" />
            )}
          </button>
        </div>

        {/* Bottom-Right: 4-Slot Inventory Bar + Transfer Button in Split Mode */}
        <div className="pointer-events-auto flex flex-col items-end gap-1.5">
          {/* Selected Item Caption & Transfer Button */}
          {selectedItem && (
            <div className="flex items-center gap-2 bg-[#0e131e]/95 border border-zinc-700/80 rounded-xl px-2.5 py-1.5 shadow-xl">
              <span className="text-xs font-semibold text-zinc-100 whitespace-nowrap">
                {selectedItem.name}
              </span>
              {canTransfer && (
                <button
                  type="button"
                  onClick={() => {
                    onTransferItem(selectedItem.id);
                    onSelectItem(null);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs flex items-center gap-1 transition-colors whitespace-nowrap"
                >
                  <Send className="w-3 h-3" />
                  <span>Передати</span>
                </button>
              )}
            </div>
          )}

          {/* 4-Slot Inventory Bar */}
          {renderInventorySlots(false)}
        </div>
      </div>
    </div>
  );
};
