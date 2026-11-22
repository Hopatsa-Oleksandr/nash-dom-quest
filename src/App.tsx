import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Flame, LogOut, PackageCheck, ShieldAlert } from 'lucide-react';
import { PILOT_QUEST_S2 } from './data/questsData';
import { HotspotConfig, NotebookNote, PlayerGender, PlayerRole } from './types/game';
import { usePeerMultiplayer } from './hooks/usePeerMultiplayer';
import { LobbyScreen } from './components/LobbyScreen';
import { SceneArtwork } from './components/SceneArtwork';
import { GameHUD } from './components/GameHUD';
import { HotspotModal } from './components/HotspotModal';
import { NotebookModal } from './components/NotebookModal';
import { VictoryScreen } from './components/VictoryScreen';
import { trainAmbientEngine } from './utils/ambientAudio';
import { playErrorBuzz } from './utils/soundFx';
import { buildTransitionNarration, g } from './utils/ukrainianGrammar';

interface SessionConfig {
  roomId: string;
  role: PlayerRole;
  playerName: string;
  playerGender: PlayerGender;
  soloTestMode: boolean;
}

function triggerHaptic(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore if vibration is blocked or unsupported
    }
  }
}

function parseInitialUrlSession(): {
  autoJoin: SessionConfig | null;
  prefillRoom: string;
  prefillRole: PlayerRole;
  prefillName: string;
  prefillGender: PlayerGender;
} {
  if (typeof window === 'undefined') {
    return {
      autoJoin: null,
      prefillRoom: '',
      prefillRole: 'p1',
      prefillName: '',
      prefillGender: PILOT_QUEST_S2.players.p1.defaultGender,
    };
  }
  const params = new URLSearchParams(window.location.search);
  const room = params.get('room')?.trim() ?? '';
  const rawRole = params.get('role')?.trim().toLowerCase();
  const role: PlayerRole = rawRole === 'p2' ? 'p2' : 'p1';
  const name = params.get('name')?.trim() ?? '';
  const rawGender = params.get('gender')?.trim().toLowerCase();
  const gender: PlayerGender =
    rawGender === 'm' || rawGender === 'f'
      ? rawGender
      : PILOT_QUEST_S2.players[role].defaultGender;

  if (room && (rawRole === 'p1' || rawRole === 'p2')) {
    return {
      autoJoin: {
        roomId: room,
        role,
        playerName: name || PILOT_QUEST_S2.players[role].defaultName,
        playerGender: gender,
        soloTestMode: false,
      },
      prefillRoom: room,
      prefillRole: role,
      prefillName: name,
      prefillGender: gender,
    };
  }

  return {
    autoJoin: null,
    prefillRoom: room,
    prefillRole: role,
    prefillName: name,
    prefillGender: gender,
  };
}

export default function App() {
  const quest = PILOT_QUEST_S2;
  const initialUrl = useMemo(() => parseInitialUrlSession(), []);

  const [session, setSession] = useState<SessionConfig | null>(initialUrl.autoJoin);
  const [activeHotspotId, setActiveHotspotId] = useState<string | null>(null);
  const [hoveredHotspotId, setHoveredHotspotId] = useState<string | null>(null);
  const [notebookOpen, setNotebookOpen] = useState<boolean>(false);
  const [personalNotesByRole, setPersonalNotesByRole] = useState<
    Record<PlayerRole, NotebookNote[]>
  >({ p1: [], p2: [] });
  const [exitConfirmOpen, setExitConfirmOpen] = useState<boolean>(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [ambientMuted, setAmbientMuted] = useState<boolean>(false);
  const [batteryLevel, setBatteryLevel] = useState<number>(100);
  const [batteryDepleted, setBatteryDepleted] = useState<boolean>(false);
  const [pttHoldSeconds, setPttHoldSeconds] = useState<number>(0);
  const [radioOverheating, setRadioOverheating] = useState<boolean>(false);
  const [scanlineBurst, setScanlineBurst] = useState<{
    active: boolean;
    mode: 'ptt' | 'lowbat';
    bandTop: number;
  }>({ active: false, mode: 'ptt', bandTop: 28 });
  const [toast, setToast] = useState<{
    id: string;
    text: string;
    tone: 'info' | 'success' | 'warning';
  } | null>(null);
  const [isMobilePortrait, setIsMobilePortrait] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(max-width: 768px) and (orientation: portrait)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(max-width: 768px) and (orientation: portrait)');
    const sync = (e?: MediaQueryListEvent) => setIsMobilePortrait(e ? e.matches : mq.matches);
    sync();
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', sync);
      return () => mq.removeEventListener('change', sync);
    }
    mq.addListener(sync);
    return () => mq.removeListener(sync);
  }, []);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const overheatTriggeredRef = useRef<boolean>(false);

  const activeRole: PlayerRole = session?.role ?? 'p1';
  const activeName = session?.playerName ?? quest.players[activeRole].defaultName;
  const activeGender: PlayerGender =
    session?.playerGender ?? quest.players[activeRole].defaultGender;

  const {
    gameState,
    connectionStatus,
    partnerName,
    partnerGender,
    partnerOnline,
    speakingState,
    micPermission,
    isMicMuted,
    audioLevels,
    pointerPings,
    radioMessages,
    radioChatLog,
    peerActivityActive,
    activeRemoteEffect,
    emergencySiren,
    pingMs,
    dispatchMutation,
    disconnectPeer,
    reconnectPeer,
    startTalking,
    stopTalking,
    toggleMicMute,
    emitPointerTap,
    setLeverHolding,
    sendQuickPing,
    reportRadioPacketError,
    sendRemoteCommand,
    triggerEmergencySiren,
  } = usePeerMultiplayer({
    roomId: session?.roomId ?? null,
    role: activeRole,
    playerName: activeName,
    playerGender: activeGender,
    quest,
    soloTestMode: session?.soloTestMode ?? false,
  });

  // Display synced event toast notifications
  useEffect(() => {
    if (!gameState.lastEvent) return;
    setToast(gameState.lastEvent);
    const t = window.setTimeout(() => {
      setToast((prev) => (prev?.id === gameState.lastEvent?.id ? null : prev));
    }, 3600);
    return () => window.clearTimeout(t);
  }, [gameState.lastEvent]);

  // Start the quest run timer as soon as the player enters the wagon
  useEffect(() => {
    if (!session) return;
    if (gameState.startedAt === null) {
      dispatchMutation({ kind: 'START_TIMER', startedAt: Date.now() });
    }
  }, [dispatchMutation, gameState.startedAt, session]);

  // Trigger tactile alert vibration on both players' devices when Emergency Siren fires
  useEffect(() => {
    if (!emergencySiren) return;
    triggerHaptic([180, 90, 220, 90, 180]);
  }, [emergencySiren?.id]);

  const isLocalSpeaking = speakingState[activeRole];

  // Track continuous PTT hold duration — trigger Radio Overheat visual warning after 10s
  useEffect(() => {
    if (!session || gameState.phase !== 'playing') {
      setPttHoldSeconds(0);
      setRadioOverheating(false);
      overheatTriggeredRef.current = false;
      return;
    }

    if (isLocalSpeaking && !batteryDepleted) {
      const startedAt = performance.now();
      const id = window.setInterval(() => {
        const secs = (performance.now() - startedAt) / 1000;
        setPttHoldSeconds(secs);
        if (secs >= 10 && !overheatTriggeredRef.current) {
          overheatTriggeredRef.current = true;
          setRadioOverheating(true);
          playErrorBuzz();
          triggerHaptic(300);
          reportRadioPacketError('ПЕРЕГРІВ ПЕРЕДАВАЧА: відпустіть кнопку рації!');
        }
      }, 200);
      return () => window.clearInterval(id);
    }

    // Cool down smoothly after releasing PTT
    setPttHoldSeconds(0);
    if (overheatTriggeredRef.current) {
      const coolId = window.setTimeout(() => {
        setRadioOverheating(false);
        overheatTriggeredRef.current = false;
      }, 1400);
      return () => window.clearTimeout(coolId);
    }
  }, [batteryDepleted, gameState.phase, isLocalSpeaking, reportRadioPacketError, session]);

  // Slowly deplete Device Battery while player holds PTT radio; slow emergency reserve recovery if 0%
  useEffect(() => {
    if (!session || gameState.phase !== 'playing') return;

    if (isLocalSpeaking && !batteryDepleted) {
      const drainId = window.setInterval(() => {
        setBatteryLevel((prev) => {
          const next = Math.max(0, prev - 0.7);
          if (next <= 0) {
            setBatteryDepleted(true);
            stopTalking();
            triggerHaptic(300);
            setToast({
              id: `bat-${Date.now()}`,
              text: 'Батарея рації розряджена! Аварійне відновлення заряду...',
              tone: 'warning',
            });
          }
          return next;
        });
      }, 250);
      return () => window.clearInterval(drainId);
    }

    if (batteryDepleted) {
      const recoverId = window.setInterval(() => {
        setBatteryLevel((prev) => {
          const next = Math.min(12, prev + 1.5);
          if (next >= 12) {
            setBatteryDepleted(false);
            setToast({
              id: `bat-ok-${Date.now()}`,
              text: 'Аварійний резерв рації відновлено (12%). Економте заряд!',
              tone: 'info',
            });
          }
          return next;
        });
      }, 900);
      return () => window.clearInterval(recoverId);
    }
  }, [batteryDepleted, gameState.phase, isLocalSpeaking, session, stopTalking]);

  const handleToggleMicMute = useCallback(() => {
    triggerHaptic(50);
    const nextMuted = !isMicMuted;
    toggleMicMute();
    setToast({
      id: `mute-${Date.now()}`,
      text: nextMuted
        ? 'Режим тиші активовано — мікрофон вимкнено.'
        : 'Режим тиші вимкнено — мікрофон готовий до рації.',
      tone: nextMuted ? 'warning' : 'info',
    });
  }, [isMicMuted, toggleMicMute]);

  const handleStartTalking = useCallback(() => {
    if (isMicMuted) {
      triggerHaptic(50);
      setToast({
        id: `mute-warn-${Date.now()}`,
        text: 'Мікрофон вимкнено (Режим тиші). Вимкніть режим тиші, щоб говорити.',
        tone: 'warning',
      });
      return;
    }
    if (batteryDepleted || batteryLevel <= 0) {
      triggerHaptic(50);
      setToast({
        id: `bat-warn-${Date.now()}`,
        text: 'Рація розряджена! Зачекайте аварійного резерву (12%).',
        tone: 'warning',
      });
      return;
    }
    startTalking();
  }, [batteryDepleted, batteryLevel, isMicMuted, startTalking]);

  // Desktop Spacebar shortcut for Push-to-Talk Radio & M shortcut for Mute ('Режим тиші')
  useEffect(() => {
    if (!session || gameState.phase !== 'playing' || exitConfirmOpen) return;
    const isTypingTarget = () => {
      const tag = document.activeElement?.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA';
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget()) return;
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        handleStartTalking();
      } else if (e.code === 'KeyM' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleToggleMicMute();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isTypingTarget()) {
        e.preventDefault();
        stopTalking();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [exitConfirmOpen, gameState.phase, handleStartTalking, handleToggleMicMute, session, stopTalking]);

  const currentScene = quest.scenes[gameState.currentSceneId] ?? quest.scenes[quest.initialSceneId];
  const currentView =
    currentScene.mode === 'shared'
      ? currentScene.sharedView!
      : currentScene.viewsByRole![activeRole];

  // Occasional sporadic packet-drop warnings during active radio transmission when separated or low battery
  useEffect(() => {
    if (!session || gameState.phase !== 'playing' || !isLocalSpeaking) return;
    const isSplit = currentScene.mode === 'split';
    const isLowBat = batteryLevel <= 35;
    if (!isSplit && !isLowBat) return;

    const delay = 4200 + Math.floor(Math.random() * 3500);
    const timer = window.setTimeout(() => {
      if (Math.random() < (isLowBat ? 0.65 : 0.4)) {
        reportRadioPacketError(
          isLowBat
            ? 'НЕДОСТАВЛЕНО: сигнал переривається (низький заряд рації)'
            : 'НЕДОСТАВЛЕНО: сигнал переривається між вагонами'
        );
      }
    }, delay);
    return () => window.clearTimeout(timer);
  }, [batteryLevel, currentScene.mode, gameState.phase, isLocalSpeaking, reportRadioPacketError, session]);

  // Randomized screen-wide scanlines interference during active PTT or low radio battery
  const isAnyPttActive = speakingState.p1 || speakingState.p2;
  const isLowRadioBattery = batteryDepleted || batteryLevel <= 35;
  const isCriticalBattery = batteryDepleted || batteryLevel <= 15;

  useEffect(() => {
    if (!session || gameState.phase !== 'playing' || (!isAnyPttActive && !isLowRadioBattery)) {
      setScanlineBurst((prev) => (prev.active ? { ...prev, active: false } : prev));
      return;
    }

    let cancelled = false;
    let showTimer: number | null = null;
    let hideTimer: number | null = null;

    const triggerBurst = () => {
      if (cancelled) return;
      const mode: 'ptt' | 'lowbat' =
        isLowRadioBattery && !isAnyPttActive ? 'lowbat' : isCriticalBattery ? 'lowbat' : 'ptt';
      const duration = isAnyPttActive
        ? 300 + Math.floor(Math.random() * 440)
        : isCriticalBattery
          ? 280 + Math.floor(Math.random() * 380)
          : 220 + Math.floor(Math.random() * 300);

      setScanlineBurst({
        active: true,
        mode,
        bandTop: 12 + Math.floor(Math.random() * 68),
      });

      hideTimer = window.setTimeout(() => {
        if (cancelled) return;
        setScanlineBurst((prev) => ({ ...prev, active: false }));
        scheduleNext(false);
      }, duration);
    };

    const scheduleNext = (isInitial: boolean) => {
      if (cancelled) return;
      const delay = isInitial
        ? isAnyPttActive
          ? 120 + Math.floor(Math.random() * 260)
          : 700 + Math.floor(Math.random() * 1400)
        : isAnyPttActive
          ? 580 + Math.floor(Math.random() * 1350)
          : isCriticalBattery
            ? 900 + Math.floor(Math.random() * 1600)
            : 1850 + Math.floor(Math.random() * 2800);

      showTimer = window.setTimeout(triggerBurst, delay);
    };

    scheduleNext(true);

    return () => {
      cancelled = true;
      if (showTimer !== null) window.clearTimeout(showTimer);
      if (hideTimer !== null) window.clearTimeout(hideTimer);
    };
  }, [gameState.phase, isAnyPttActive, isCriticalBattery, isLowRadioBattery, session]);

  // Dynamically modulate background ambient train sound (wheels on rails, transformer hum, isolation)
  useEffect(() => {
    const isPartnerConnected =
      Boolean(session?.soloTestMode) || (connectionStatus === 'connected' && partnerOnline);

    trainAmbientEngine.update({
      active: Boolean(session),
      muted: ambientMuted,
      phase: gameState.phase,
      sceneMode: currentScene.mode,
      hatchOpened: gameState.solvedHotspots.includes('hs-seat-hatch'),
      keypadUnlocked: gameState.flags.includes('keypad_unlocked'),
      fuseInserted: gameState.flags.includes('fuse_inserted'),
      leversHeld: gameState.leverHold.p1 || gameState.leverHold.p2,
      partnerConnected: isPartnerConnected,
      isRadioSpeaking: speakingState.p1 || speakingState.p2,
      remoteSurgeActive: activeRemoteEffect?.kind === 'surge',
    });
  }, [
    activeRemoteEffect?.kind,
    ambientMuted,
    connectionStatus,
    currentScene.mode,
    gameState.flags,
    gameState.leverHold.p1,
    gameState.leverHold.p2,
    gameState.phase,
    gameState.solvedHotspots,
    partnerOnline,
    session,
    speakingState.p1,
    speakingState.p2,
  ]);

  // Unlock Web Audio ambient engine on first user gesture (for iOS Safari & Chrome autoplay policy)
  useEffect(() => {
    if (!session) return;
    const unlock = () => trainAmbientEngine.unlock();
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [session]);

  useEffect(() => {
    return () => {
      trainAmbientEngine.stop();
    };
  }, []);

  const visibleHotspots = currentScene.hotspots.filter(
    (hs) => currentScene.mode === 'shared' || !hs.role || hs.role === activeRole
  );

  const activeHotspot = visibleHotspots.find((hs) => hs.id === activeHotspotId) ?? null;
  const hoveredHotspot = visibleHotspots.find((hs) => hs.id === hoveredHotspotId) ?? null;
  const focusPoint = activeHotspot
    ? { x: activeHotspot.x, y: activeHotspot.y, active: true }
    : hoveredHotspot
      ? { x: hoveredHotspot.x, y: hoveredHotspot.y, active: false }
      : null;

  const playerNames: Record<PlayerRole, string> = {
    p1:
      activeRole === 'p1'
        ? activeName
        : session?.soloTestMode
          ? gameState.players.p1.name || quest.players.p1.defaultName
          : partnerName,
    p2:
      activeRole === 'p2'
        ? activeName
        : session?.soloTestMode
          ? gameState.players.p2.name || quest.players.p2.defaultName
          : partnerName,
  };

  const playerGenders: Record<PlayerRole, PlayerGender> = {
    p1:
      activeRole === 'p1'
        ? activeGender
        : session?.soloTestMode
          ? gameState.players.p1.gender
          : partnerGender,
    p2:
      activeRole === 'p2'
        ? activeGender
        : session?.soloTestMode
          ? gameState.players.p2.gender
          : partnerGender,
  };

  // Sync URL params cleanly when joining from Lobby
  const handleJoinSession = useCallback((cfg: SessionConfig) => {
    setSession(cfg);
    trainAmbientEngine.unlock();
    if (!cfg.soloTestMode && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('room', cfg.roomId);
      url.searchParams.set('role', cfg.role);
      url.searchParams.set('name', cfg.playerName);
      url.searchParams.set('gender', cfg.playerGender);
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // Clean Exit to Main Menu (disconnects PeerJS, clears URL room params, resets session)
  const handleConfirmExit = useCallback(() => {
    triggerHaptic(50);
    disconnectPeer();
    trainAmbientEngine.stop();
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('room');
      url.searchParams.delete('role');
      url.searchParams.delete('name');
      url.searchParams.delete('gender');
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    }
    setActiveHotspotId(null);
    setHoveredHotspotId(null);
    setNotebookOpen(false);
    setPersonalNotesByRole({ p1: [], p2: [] });
    setSelectedItemId(null);
    setBatteryLevel(100);
    setBatteryDepleted(false);
    setPttHoldSeconds(0);
    setRadioOverheating(false);
    setExitConfirmOpen(false);
    setToast(null);
    setSession(null);
  }, [disconnectPeer]);

  // Laser pointer tap on the shared scene canvas
  const handleStageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (currentScene.mode !== 'shared' || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    emitPointerTap(x, y);
  };

  // Hotspot action callbacks (strict 4-Act progression + gender-accurate Ukrainian toasts)
  const handleUnlockPhone = (hotspot: HotspotConfig) => {
    triggerHaptic(220);
    dispatchMutation({
      kind: 'UNLOCK_PHONE',
      hotspotId: hotspot.id,
      toast: `${activeName} ${g(activeGender, 'розблокував', 'розблокувала')} смартфон провідника — перевірте SMS і смітник!`,
    });
  };

  const handleCollectItem = (hotspot: HotspotConfig, itemId: string) => {
    triggerHaptic(50);
    const itemName = quest.items[itemId]?.name ?? 'Предмет';
    dispatchMutation({
      kind: 'COLLECT_ITEM',
      hotspotId: hotspot.id,
      itemId,
      owner: currentScene.mode === 'shared' ? 'shared' : activeRole,
      toast: `${activeName} ${g(activeGender, 'знайшов', 'знайшла')} предмет: «${itemName}»`,
    });
    setSelectedItemId(itemId);
  };

  const handleUnlockContainer = (hotspot: HotspotConfig) => {
    if (!hotspot.givesItemId) return;
    triggerHaptic(300);
    const newItemName = quest.items[hotspot.givesItemId]?.name ?? 'Предмет';
    const verb =
      hotspot.requiredItemId === 'wire_cutters'
        ? g(activeGender, 'перерізав', 'перерізала')
        : g(activeGender, 'відкрив', 'відкрила');
    dispatchMutation({
      kind: 'UNLOCK_CONTAINER',
      hotspotId: hotspot.id,
      consumedItemId: hotspot.requiredItemId,
      givesItemId: hotspot.givesItemId,
      owner: currentScene.mode === 'shared' ? 'shared' : activeRole,
      toast: `${activeName} ${verb} стяжку! Отримано «${newItemName}»`,
    });
    setSelectedItemId(hotspot.givesItemId);
  };

  const handleUnlockHatchCombo = (hotspot: HotspotConfig) => {
    if (!hotspot.requiredItemId || !hotspot.givesItemIds?.length) return;
    triggerHaptic(300);
    dispatchMutation({
      kind: 'UNLOCK_HATCH_COMBO',
      hotspotId: hotspot.id,
      consumedItemId: hotspot.requiredItemId,
      givesItemIds: hotspot.givesItemIds,
      owner: currentScene.mode === 'shared' ? 'shared' : activeRole,
      toast: `${activeName} ${g(activeGender, 'відкрив', 'відкрила')} кодовий люк! Отримано «Службовий ключ» та «Кусачки»`,
    });
    setSelectedItemId(hotspot.givesItemIds[0]);
  };

  const handleSolveKeypad = (hotspot: HotspotConfig) => {
    triggerHaptic(300);
    dispatchMutation({
      kind: 'SOLVE_KEYPAD',
      hotspotId: hotspot.id,
      flag: 'keypad_unlocked',
      toast: `${activeName} ${g(activeGender, 'розблокував', 'розблокувала')} бокс NOTBREMSE!`,
    });
  };

  const handleInsertFuse = (hotspot: HotspotConfig) => {
    if (!hotspot.requiredItemId) return;
    triggerHaptic(300);
    dispatchMutation({
      kind: 'INSERT_FUSE',
      hotspotId: hotspot.id,
      itemId: hotspot.requiredItemId,
      flag: 'fuse_inserted',
      toast: `${activeName} ${g(activeGender, 'вставив', 'вставила')} «Запобіжник 32A» у щиток!`,
    });
    setSelectedItemId(null);
  };

  const handleSolveProtocol = (hotspot: HotspotConfig) => {
    triggerHaptic(300);
    dispatchMutation({
      kind: 'SOLVE_PROTOCOL',
      hotspotId: hotspot.id,
      flag: 'protocol_solved',
      toast: `${activeName} ${g(activeGender, 'виконав', 'виконала')} аварійний протокол DB! Акт 4 — тримайте важелі разом!`,
    });
  };

  const handleRecordMistake = (toast?: string) => {
    triggerHaptic([120, 60, 180]);
    dispatchMutation({
      kind: 'RECORD_MISTAKE',
      toast,
    });
  };

  const handlePutInHatch = (itemId: string) => {
    triggerHaptic(50);
    dispatchMutation({
      kind: 'PUT_IN_HATCH',
      itemId,
      fromRole: activeRole,
      fromName: activeName,
      fromGender: activeGender,
    });
    setSelectedItemId(null);
  };

  const handleTakeFromHatch = () => {
    if (!gameState.transferHatchItem) return;
    triggerHaptic(120);
    const takenId = gameState.transferHatchItem.id;
    dispatchMutation({
      kind: 'TAKE_FROM_HATCH',
      toRole: activeRole,
      toName: activeName,
      toGender: activeGender,
    });
    setSelectedItemId(takenId);
  };

  const handleTriggerTransition = (hotspot: HotspotConfig) => {
    if (!hotspot.targetSceneId) return;
    triggerHaptic(300);
    dispatchMutation({
      kind: 'START_TRANSITION',
      hotspotId: hotspot.id,
      targetSceneId: hotspot.targetSceneId,
      narration: buildTransitionNarration(playerNames, playerGenders),
      assignItemsOnSplit: {
        wire_cutters: 'p2',
      },
    });
    setSelectedItemId(null);
  };

  // Strictly personal local notes (NEVER synced across PeerJS to prevent spoilers)
  const myPersonalNotes = personalNotesByRole[activeRole];

  const handleAddNote = (text: string) => {
    triggerHaptic(50);
    const newNote: NotebookNote = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text,
      authorRole: activeRole,
      authorName: activeName,
      createdAt: Date.now(),
    };
    setPersonalNotesByRole((prev) => ({
      ...prev,
      [activeRole]: [...prev[activeRole], newNote],
    }));
  };

  const handleDeleteNote = (noteId: string) => {
    triggerHaptic(50);
    setPersonalNotesByRole((prev) => ({
      ...prev,
      [activeRole]: prev[activeRole].filter((n) => n.id !== noteId),
    }));
  };

  const handleSwitchSoloRole = () => {
    if (!session) return;
    const nextRole: PlayerRole = session.role === 'p1' ? 'p2' : 'p1';
    setActiveHotspotId(null);
    setSelectedItemId(null);
    setSession({
      ...session,
      role: nextRole,
      playerName: gameState.players[nextRole].name || quest.players[nextRole].defaultName,
      playerGender: gameState.players[nextRole].gender || quest.players[nextRole].defaultGender,
    });
  };

  // Show Lobby if no room/role yet
  if (!session) {
    return (
      <LobbyScreen
        quest={quest}
        initialRoom={initialUrl.prefillRoom}
        initialRole={initialUrl.prefillRole}
        initialName={initialUrl.prefillName}
        initialGender={initialUrl.prefillGender}
        onJoin={handleJoinSession}
      />
    );
  }

  // Show Victory Screen over the smoked SceneArtwork backdrop
  if (gameState.phase === 'victory') {
    return (
      <main className="relative w-full h-[100dvh] bg-[#070a12] overflow-hidden">
        <SceneArtwork
          view={currentView}
          gameState={gameState}
          playerRole={activeRole}
          smokeActive
        />
        <VictoryScreen
          quest={quest}
          playerNames={playerNames}
          playerGenders={playerGenders}
          elapsedMs={gameState.elapsedMs}
          mistakes={gameState.mistakes}
          chosenEndingId={gameState.victoryChoiceId}
          onChooseEnding={(choiceId) => dispatchMutation({ kind: 'CHOOSE_VICTORY', choiceId })}
          onRestart={() => {
            setActiveHotspotId(null);
            setHoveredHotspotId(null);
            setSelectedItemId(null);
            setPersonalNotesByRole({ p1: [], p2: [] });
            setBatteryLevel(100);
            setBatteryDepleted(false);
            dispatchMutation({ kind: 'RESTART', startedAt: Date.now() });
          }}
          onExitToMenu={handleConfirmExit}
        />
      </main>
    );
  }

  const stageCanvasContent = (
    <>
      {/* Illustrated / Photo Scene Backdrop with Depth-of-Field, dynamic chromatic aberration & remote effects */}
      <SceneArtwork
        view={currentView}
        gameState={gameState}
        playerRole={activeRole}
        remoteEffect={activeRemoteEffect}
        focusPoint={focusPoint}
        interferenceLevel={
          speakingState.p1 || speakingState.p2 || activeRemoteEffect?.kind === 'surge'
            ? 'radio'
            : peerActivityActive || Boolean(activeRemoteEffect)
              ? 'data'
              : 'idle'
        }
      />

      {/* Live Partner Laser Pointer Pings (Shared Mode) */}
      {currentScene.mode === 'shared' &&
        pointerPings.map((ping) => (
          <div
            key={ping.id}
            className="pointer-events-none absolute z-10"
            style={{ left: `${ping.x}%`, top: `${ping.y}%` }}
          >
            <span
              className="block w-11 h-11 rounded-full border-2 animate-laser-ripple"
              style={{
                borderColor: ping.playerRole === 'p1' ? '#fb7185' : '#38bdf8',
              }}
            />
            <span
              className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full shadow-lg"
              style={{
                backgroundColor: ping.playerRole === 'p1' ? '#fb7185' : '#38bdf8',
              }}
            />
            <span className="absolute left-3 -top-3 px-1.5 py-0.5 rounded bg-black/75 text-[10px] font-bold text-white whitespace-nowrap">
              {ping.playerName}
            </span>
          </div>
        ))}

      {/* Interactive Glowing Hotspots (no permanent labels; only Transfer Hatch shows incoming badge) */}
      <div className="absolute inset-0 z-10">
        {visibleHotspots.map((hs) => {
          const isSolved = gameState.solvedHotspots.includes(hs.id);
          const isAct3Ready =
            gameState.flags.includes('keypad_unlocked') &&
            gameState.flags.includes('fuse_inserted');
          const isLeverActive =
            hs.type === 'coop_lever' &&
            isAct3Ready &&
            gameState.flags.includes('protocol_solved');
          const isAct3HotspotLocked =
            (hs.type === 'protocol_panel' || hs.type === 'db_manual') && !isAct3Ready;
          const isIncomingHatchHotspot =
            hs.type === 'transfer_hatch' &&
            Boolean(gameState.transferHatchItem) &&
            gameState.transferHatchItem?.from !== activeRole;

          return (
            <button
              key={hs.id}
              type="button"
              onPointerEnter={() => setHoveredHotspotId(hs.id)}
              onPointerLeave={() =>
                setHoveredHotspotId((prev) => (prev === hs.id ? null : prev))
              }
              onFocus={() => setHoveredHotspotId(hs.id)}
              onBlur={() =>
                setHoveredHotspotId((prev) => (prev === hs.id ? null : prev))
              }
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic(50);
                if (currentScene.mode === 'shared') {
                  emitPointerTap(hs.x, hs.y);
                }
                // Instant pickup if Transfer Hatch has an incoming item waiting for this player
                if (isIncomingHatchHotspot) {
                  handleTakeFromHatch();
                  return;
                }
                setActiveHotspotId(hs.id);
              }}
              style={{ left: `${hs.x}%`, top: `${hs.y}%` }}
              className={`group absolute -translate-x-1/2 -translate-y-1/2 w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center focus:outline-none ${
                isAct3HotspotLocked ? 'opacity-55 hover:opacity-85' : ''
              }`}
              aria-label={hs.label}
            >
              {/* Incoming Transfer Hatch Alert Badge */}
              {isIncomingHatchHotspot && (
                <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500 text-zinc-950 font-mono-tech text-[10px] font-bold shadow-[0_0_18px_rgba(16,185,129,0.85)] whitespace-nowrap animate-bounce">
                  <PackageCheck className="w-3 h-3 shrink-0" />
                  <span>Отримано предмет!</span>
                </span>
              )}

              {/* Pulsing outer glow ring */}
              {!isSolved && (
                <span
                  className={`absolute inset-1 rounded-full border-2 animate-hotspot-pulse pointer-events-none ${
                    isIncomingHatchHotspot || isLeverActive
                      ? 'border-emerald-400'
                      : 'border-amber-300/90'
                  }`}
                />
              )}

              {/* Core glowing circular hotspot ring */}
              <span
                className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 flex items-center justify-center backdrop-blur-[2px] transition-transform duration-150 group-hover:scale-110 group-active:scale-95 ${
                  isIncomingHatchHotspot
                    ? 'bg-emerald-500/35 border-emerald-300 text-emerald-100 shadow-[0_0_24px_rgba(16,185,129,0.9)]'
                    : isSolved
                      ? 'bg-emerald-500/25 border-emerald-400/90 text-emerald-300 shadow-[0_0_14px_rgba(16,185,129,0.5)]'
                      : isLeverActive
                        ? 'bg-emerald-500/25 border-emerald-300 text-white shadow-[0_0_18px_rgba(16,185,129,0.7)]'
                        : 'bg-amber-400/20 border-amber-300 text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.65)]'
                }`}
              >
                {isIncomingHatchHotspot ? (
                  <PackageCheck className="w-4 h-4 stroke-[2.5]" />
                ) : isSolved ? (
                  <Check className="w-4 h-4 stroke-[3]" />
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_#fff]" />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );

  const hudSharedProps = {
    quest,
    scene: currentScene,
    gameState,
    role: activeRole,
    roomId: session.roomId,
    playerNames,
    playerGenders,
    connectionStatus,
    partnerOnline,
    speakingState,
    micPermission,
    isMicMuted,
    audioLevels,
    radioMessages,
    radioChatLog,
    selectedItemId,
    soloTestMode: session.soloTestMode,
    notesCount: myPersonalNotes.length,
    hasUnreadNotes: false,
    activeRemoteEffect,
    emergencySiren,
    pingMs,
    ambientMuted,
    batteryLevel,
    batteryDepleted,
    radioOverheating,
    pttHoldSeconds,
    onToggleMicMute: handleToggleMicMute,
    onToggleAmbient: () => {
      triggerHaptic(50);
      setAmbientMuted((prev) => !prev);
    },
    onTriggerSiren: triggerEmergencySiren,
    onSelectItem: setSelectedItemId,
    onPutInHatch: handlePutInHatch,
    onTakeFromHatch: handleTakeFromHatch,
    onReconnect: () => {
      triggerHaptic(50);
      reconnectPeer();
    },
    onRequestExit: () => {
      triggerHaptic(50);
      setExitConfirmOpen(true);
    },
    onStartTalking: handleStartTalking,
    onStopTalking: stopTalking,
    onSendQuickPing: (text: string) => {
      setBatteryLevel((prev) => Math.max(0, prev - 1.5));
      sendQuickPing(text, {
        isSplitDistance: currentScene.mode === 'split',
        isLowBattery: batteryLevel <= 35,
        isSurge: activeRemoteEffect?.kind === 'surge',
      });
    },
    onSendRemoteCommand: (
      kind: Parameters<typeof sendRemoteCommand>[0],
      cmd: string,
      label: string
    ) => {
      triggerHaptic(50);
      setBatteryLevel((prev) => Math.max(0, prev - 2));
      sendRemoteCommand(kind, cmd, label);
    },
    onOpenNotebook: () => {
      triggerHaptic(50);
      setNotebookOpen(true);
    },
    onSwitchSoloRole: handleSwitchSoloRole,
  };

  return (
    <main
      className={
        isMobilePortrait
          ? 'relative w-full h-[100dvh] flex flex-col justify-between bg-[#090D16] overflow-hidden select-none'
          : 'relative w-full h-[100dvh] bg-[#090b10] flex items-center justify-center overflow-hidden select-none'
      }
    >
      {isMobilePortrait ? (
        /* PORTRAIT MOBILE MODE: Top Header -> Vertically Centered 16:9 Stage -> Bottom Control Dock */
        <GameHUD
          {...hudSharedProps}
          portraitMode
          portraitStage={
            <div
              ref={stageRef}
              onClick={handleStageClick}
              className="relative aspect-video w-full bg-[#0c1018] overflow-hidden shrink-0 shadow-[0_0_50px_rgba(0,0,0,0.85)]"
            >
              {stageCanvasContent}
            </div>
          }
        />
      ) : (
        /* LANDSCAPE / DESKTOP MODE: Fullscreen 16:9 Cinematic Escape Room Stage with Corner Overlay HUD */
        <div
          ref={stageRef}
          onClick={handleStageClick}
          className="relative w-full h-full max-w-[177.78dvh] max-h-[56.25vw] aspect-video bg-[#0c1018] overflow-hidden shadow-[0_0_90px_rgba(0,0,0,0.95)]"
        >
          {stageCanvasContent}
          <GameHUD {...hudSharedProps} portraitMode={false} />
        </div>
      )}

      {/* Synced Event Toast Notification */}
      {toast && (
        <div
          className={`pointer-events-none fixed left-1/2 -translate-x-1/2 z-30 max-w-[90%] px-4 py-2 rounded-xl bg-[#0e1422]/95 border border-zinc-600/80 shadow-2xl text-xs sm:text-sm font-semibold text-zinc-100 text-center ${
            isMobilePortrait ? 'top-[132px]' : 'top-20'
          }`}
        >
          {toast.text}
        </div>
      )}

      {/* Scene 1 -> Scene 2 Dramatic Door-Slam Transition Overlay */}
      {gameState.phase === 'transition' && (
        <div className="fixed inset-0 z-40 bg-[#090b10]/92 backdrop-blur-md flex items-center justify-center p-4 sm:p-5">
          <div className="w-full max-w-lg max-h-[85dvh] overflow-y-auto rounded-2xl bg-[#141118] border border-red-500/50 p-5 sm:p-6 text-center space-y-4 shadow-[0_0_60px_rgba(220,38,38,0.28)]">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-600/20 border border-red-500/50 flex items-center justify-center text-red-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-wide text-white uppercase">
              Аварійне блокування дверей!
            </h2>
            <p className="text-sm text-zinc-200 leading-relaxed">
              {gameState.transitionText}
            </p>
            <button
              type="button"
              onClick={() =>
                dispatchMutation({
                  kind: 'COMPLETE_TRANSITION',
                  targetSceneId: 'scene-2-split',
                })
              }
              className="w-full py-3 px-5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-colors"
            >
              Перейти до розділених вагонів
            </button>
          </div>
        </div>
      )}

      {/* Random Fullscreen Scanlines Interference Overlay (active PTT or low radio battery) */}
      <div
        className={`pointer-events-none fixed inset-0 z-25 overflow-hidden transition-opacity duration-150 ${
          scanlineBurst.active ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden="true"
      >
        <div
          className={`absolute -inset-y-4 inset-x-0 ${
            scanlineBurst.mode === 'lowbat'
              ? 'screen-scanlines-grid-lowbat'
              : 'screen-scanlines-grid'
          }`}
        />
        <div
          className={`absolute inset-x-0 h-20 ${
            scanlineBurst.mode === 'lowbat'
              ? 'screen-scanlines-beam-lowbat'
              : 'screen-scanlines-beam'
          }`}
        />
        <div
          className={`absolute inset-x-0 h-[3px] ${
            scanlineBurst.mode === 'lowbat'
              ? 'bg-amber-300/35 shadow-[0_0_14px_rgba(245,158,11,0.55)]'
              : 'bg-sky-200/30 shadow-[0_0_12px_rgba(56,189,248,0.5)]'
          }`}
          style={{ top: `${scanlineBurst.bandTop}%` }}
        />
      </div>

      {/* Synchronized Emergency Siren Red Strobe Viewport Overlay (both players' screens) */}
      <div
        className={`pointer-events-none fixed inset-0 z-30 transition-opacity duration-200 ${
          emergencySiren ? 'opacity-100 siren-screen-flash' : 'opacity-0'
        }`}
        aria-hidden={!emergencySiren}
      />

      {/* Radio Overheat Fullscreen Crimson Border Overlay (triggered after 10s continuous PTT) */}
      <div
        className={`pointer-events-none fixed inset-0 z-30 transition-opacity duration-500 ${
          radioOverheating ? 'opacity-100 radio-overheat-frame' : 'opacity-0'
        }`}
        aria-hidden={!radioOverheating}
      >
        {radioOverheating && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-red-950/92 border border-red-400/80 text-red-100 text-xs font-mono-tech font-bold shadow-[0_0_24px_rgba(239,68,68,0.6)] whitespace-nowrap">
            <Flame className="w-4 h-4 text-red-400 shrink-0" />
            <span>ПЕРЕГРІВ РАЦІЇ · ВІДПУСТІТЬ КНОПКУ</span>
          </div>
        )}
      </div>

      {/* Hotspot Inspection / Puzzle Modal */}
      {activeHotspot && (
        <HotspotModal
          hotspot={activeHotspot}
          quest={quest}
          gameState={gameState}
          role={activeRole}
          playerNames={playerNames}
          playerGenders={playerGenders}
          sceneMode={currentScene.mode}
          soloTestMode={session.soloTestMode}
          onClose={() => setActiveHotspotId(null)}
          onUnlockPhone={handleUnlockPhone}
          onCollectItem={handleCollectItem}
          onUnlockContainer={handleUnlockContainer}
          onUnlockHatchCombo={handleUnlockHatchCombo}
          onSolveKeypad={handleSolveKeypad}
          onInsertFuse={handleInsertFuse}
          onSolveProtocol={handleSolveProtocol}
          onRecordMistake={handleRecordMistake}
          onPutInHatch={handlePutInHatch}
          onTakeFromHatch={handleTakeFromHatch}
          onTriggerTransition={handleTriggerTransition}
          onSetLeverHolding={setLeverHolding}
          onCompleteEscape={() => {
            triggerHaptic(300);
            const elapsedMs =
              gameState.startedAt !== null
                ? Math.max(0, Date.now() - gameState.startedAt)
                : 0;
            dispatchMutation({ kind: 'COMPLETE_ESCAPE', elapsedMs });
          }}
        />
      )}

      {/* Strictly Personal Private Notebook Modal (Not synced across players) */}
      {notebookOpen && (
        <NotebookModal
          notes={myPersonalNotes}
          role={activeRole}
          playerName={activeName}
          onAddNote={handleAddNote}
          onDeleteNote={handleDeleteNote}
          onClose={() => setNotebookOpen(false)}
        />
      )}

      {/* Exit to Main Menu Confirmation Modal */}
      {exitConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setExitConfirmOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Підтвердження виходу в головне меню"
        >
          <div
            className="w-full max-w-sm max-h-[85dvh] overflow-y-auto rounded-2xl bg-[#121620] border border-zinc-700/80 shadow-[0_24px_60px_rgba(0,0,0,0.9)] p-5 space-y-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto w-11 h-11 rounded-full bg-red-950/70 border border-red-500/50 flex items-center justify-center text-red-400">
              <LogOut className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <h2 className="font-display text-lg font-bold tracking-wide text-white uppercase">
                Вихід у головне меню
              </h2>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Ви дійсно хочете вийти в головне меню? Поточний прогрес сесії буде призупинено.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setExitConfirmOpen(false)}
                className="py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold text-sm transition-colors"
              >
                Скасувати
              </button>
              <button
                type="button"
                onClick={handleConfirmExit}
                className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-colors"
              >
                Вийти в меню
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
