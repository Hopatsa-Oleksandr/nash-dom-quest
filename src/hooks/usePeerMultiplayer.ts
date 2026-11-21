import { useCallback, useEffect, useRef, useState } from 'react';
import Peer, { DataConnection, MediaConnection } from 'peerjs';
import {
  EmergencySirenAlert,
  GameState,
  PeerMessage,
  PlayerRole,
  PointerPing,
  QuestConfig,
  RadioPingMessage,
  RemoteEffectKind,
  RemoteSceneEffect,
} from '../types/game';
import { applyGameMutation, createInitialGameState } from '../utils/gameReducer';
import {
  playDoorReleaseVictory,
  playDoorSlam,
  playEmergencySiren,
  playErrorBuzz,
  playItemPickup,
  playRadioClick,
  playRadioCrackle,
  playRadioWhiteNoise,
  playRemoteEffectSfx,
  playSuccessUnlock,
  playTransferWhoosh,
} from '../utils/soundFx';

export type ConnectionStatus = 'idle' | 'initializing' | 'waiting' | 'connected' | 'reconnecting' | 'error';

interface UsePeerMultiplayerOptions {
  roomId: string | null;
  role: PlayerRole;
  playerName: string;
  quest: QuestConfig;
  soloTestMode: boolean;
}

export function usePeerMultiplayer({
  roomId,
  role,
  playerName,
  quest,
  soloTestMode,
}: UsePeerMultiplayerOptions) {
  const [gameState, setGameState] = useState<GameState>(() => createInitialGameState(quest));
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [partnerName, setPartnerName] = useState<string>(
    quest.players[role === 'p1' ? 'p2' : 'p1'].defaultName
  );
  const [partnerOnline, setPartnerOnline] = useState<boolean>(false);
  const [speakingState, setSpeakingState] = useState<Record<PlayerRole, boolean>>({
    p1: false,
    p2: false,
  });
  const [micPermission, setMicPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [audioLevels, setAudioLevels] = useState<number[]>([0.15, 0.2, 0.15, 0.2, 0.15, 0.2, 0.15]);
  const [pointerPings, setPointerPings] = useState<PointerPing[]>([]);
  const [radioMessages, setRadioMessages] = useState<RadioPingMessage[]>([]);
  const [radioChatLog, setRadioChatLog] = useState<RadioPingMessage[]>([]);
  const [peerActivityActive, setPeerActivityActive] = useState<boolean>(false);
  const [activeRemoteEffect, setActiveRemoteEffect] = useState<RemoteSceneEffect | null>(null);
  const [emergencySiren, setEmergencySiren] = useState<EmergencySirenAlert | null>(null);
  const [pingMs, setPingMs] = useState<number | null>(null);

  const peerRef = useRef<Peer | null>(null);
  const dataConnRef = useRef<DataConnection | null>(null);
  const mediaCallRef = useRef<MediaConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const waveformRafRef = useRef<number | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const peerActivityTimerRef = useRef<number | null>(null);
  const remoteEffectTimerRef = useRef<number | null>(null);
  const sirenTimerRef = useRef<number | null>(null);
  const gameStateRef = useRef<GameState>(gameState);
  const isMicMutedRef = useRef<boolean>(isMicMuted);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    isMicMutedRef.current = isMicMuted;
  }, [isMicMuted]);

  const otherRole: PlayerRole = role === 'p1' ? 'p2' : 'p1';

  // Ensure a hidden <audio> element exists to play incoming remote radio voice
  useEffect(() => {
    const audioEl = document.createElement('audio');
    audioEl.autoplay = true;
    audioEl.setAttribute('playsinline', 'true');
    audioEl.style.display = 'none';
    document.body.appendChild(audioEl);
    remoteAudioRef.current = audioEl;
    return () => {
      audioEl.srcObject = null;
      audioEl.remove();
      remoteAudioRef.current = null;
    };
  }, []);

  const triggerPeerActivityPulse = useCallback(() => {
    setPeerActivityActive(true);
    if (peerActivityTimerRef.current !== null) {
      window.clearTimeout(peerActivityTimerRef.current);
    }
    peerActivityTimerRef.current = window.setTimeout(() => {
      setPeerActivityActive(false);
      peerActivityTimerRef.current = null;
    }, 420);
  }, []);

  const activateRemoteEffect = useCallback((effect: RemoteSceneEffect) => {
    setActiveRemoteEffect(effect);
    playRemoteEffectSfx(effect.kind);
    if (remoteEffectTimerRef.current !== null) {
      window.clearTimeout(remoteEffectTimerRef.current);
    }
    remoteEffectTimerRef.current = window.setTimeout(() => {
      setActiveRemoteEffect((prev) => (prev?.id === effect.id ? null : prev));
      remoteEffectTimerRef.current = null;
    }, 3800);
  }, []);

  const activateEmergencySiren = useCallback((alert: EmergencySirenAlert) => {
    setEmergencySiren(alert);
    playEmergencySiren();
    if (sirenTimerRef.current !== null) {
      window.clearTimeout(sirenTimerRef.current);
    }
    sirenTimerRef.current = window.setTimeout(() => {
      setEmergencySiren((prev) => (prev?.id === alert.id ? null : prev));
      sirenTimerRef.current = null;
    }, 3600);
  }, []);

  useEffect(() => {
    return () => {
      if (peerActivityTimerRef.current !== null) {
        window.clearTimeout(peerActivityTimerRef.current);
      }
      if (remoteEffectTimerRef.current !== null) {
        window.clearTimeout(remoteEffectTimerRef.current);
      }
      if (sirenTimerRef.current !== null) {
        window.clearTimeout(sirenTimerRef.current);
      }
    };
  }, []);

  const sendMessage = useCallback(
    (msg: PeerMessage, silent = false) => {
      const conn = dataConnRef.current;
      if (conn && conn.open) {
        try {
          conn.send(msg);
          if (!silent) {
            triggerPeerActivityPulse();
          }
        } catch {
          // Ignore transient send errors while reconnecting
        }
      }
    },
    [triggerPeerActivityPulse]
  );

  const addPointerPing = useCallback((ping: PointerPing) => {
    setPointerPings((prev) => [...prev.slice(-5), ping]);
    window.setTimeout(() => {
      setPointerPings((prev) => prev.filter((p) => p.id !== ping.id));
    }, 1050);
  }, []);

  const pushRadioMessage = useCallback((msg: RadioPingMessage) => {
    setRadioMessages((prev) => [...prev.slice(-3), msg]);
    setRadioChatLog((prev) => [...prev.slice(-5), msg]);
    window.setTimeout(() => {
      setRadioMessages((prev) => prev.filter((m) => m.id !== msg.id));
    }, 5200);
  }, []);

  const playSoundForAction = useCallback(
    (action: Extract<PeerMessage, { type: 'GAME_MUTATION' }>['action']) => {
      switch (action.kind) {
        case 'COLLECT_ITEM':
        case 'UNLOCK_CONTAINER':
          playItemPickup();
          break;
        case 'SOLVE_KEYPAD':
        case 'INSERT_FUSE':
          playSuccessUnlock();
          break;
        case 'TRANSFER_ITEM':
          playTransferWhoosh();
          break;
        case 'START_TRANSITION':
          playDoorSlam();
          break;
        case 'COMPLETE_ESCAPE':
          playDoorReleaseVictory();
          break;
        default:
          break;
      }
    },
    []
  );

  // Dispatch a game state mutation locally AND sync to partner
  const dispatchMutation = useCallback(
    (action: Extract<PeerMessage, { type: 'GAME_MUTATION' }>['action']) => {
      playSoundForAction(action);
      if (action.kind !== 'START_TIMER') {
        triggerPeerActivityPulse();
      }
      setGameState((prev) => applyGameMutation(prev, action, quest));
      sendMessage({ type: 'GAME_MUTATION', action });
    },
    [playSoundForAction, quest, sendMessage, triggerPeerActivityPulse]
  );

  // Incoming data message handler
  const handleIncomingData = useCallback(
    (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return;
      const msg = raw as PeerMessage;
      if (msg.type === 'LATENCY_PING') {
        sendMessage({ type: 'LATENCY_PONG', id: msg.id, sentAt: msg.sentAt }, true);
        return;
      }
      if (msg.type === 'LATENCY_PONG') {
        const rtt = Math.max(1, Math.round(performance.now() - msg.sentAt));
        setPingMs((prev) => (prev === null ? rtt : Math.round(prev * 0.35 + rtt * 0.65)));
        return;
      }
      triggerPeerActivityPulse();

      switch (msg.type) {
        case 'PLAYER_HELLO': {
          setPartnerName(msg.name);
          setPartnerOnline(true);
          // Host sends full state snapshot on join
          if (role === 'p1') {
            sendMessage({ type: 'FULL_STATE', state: gameStateRef.current });
          }
          break;
        }
        case 'REQUEST_STATE': {
          if (role === 'p1') {
            sendMessage({ type: 'FULL_STATE', state: gameStateRef.current });
          }
          break;
        }
        case 'FULL_STATE': {
          setGameState(msg.state);
          break;
        }
        case 'GAME_MUTATION': {
          playSoundForAction(msg.action);
          setGameState((prev) => applyGameMutation(prev, msg.action, quest));
          break;
        }
        case 'POINTER': {
          addPointerPing(msg.ping);
          break;
        }
        case 'LEVER_HOLD': {
          setGameState((prev) => ({
            ...prev,
            leverHold: {
              ...prev.leverHold,
              [msg.role]: msg.holding,
            },
          }));
          break;
        }
        case 'PTT_STATUS': {
          setSpeakingState((prev) => ({
            ...prev,
            [msg.role]: msg.speaking,
          }));
          playRadioClick(msg.speaking);
          break;
        }
        case 'QUICK_PING': {
          playRadioClick(true);
          playRadioCrackle('burst');
          pushRadioMessage(msg.message);
          break;
        }
        case 'REMOTE_COMMAND': {
          playRadioCrackle('burst');
          activateRemoteEffect(msg.effect);
          pushRadioMessage({
            id: msg.effect.id,
            fromRole: 'p2',
            fromName: msg.effect.fromName,
            text: `Команда [${msg.effect.commandText}]: ${msg.effect.label}`,
            timestamp: msg.effect.timestamp,
          });
          break;
        }
        case 'EMERGENCY_SIREN': {
          activateEmergencySiren(msg.alert);
          pushRadioMessage({
            id: msg.alert.id,
            fromRole: msg.alert.fromRole,
            fromName: msg.alert.fromName,
            text: 'АВАРІЙНА СИРЕНА! Потрібна термінова увага!',
            timestamp: msg.alert.timestamp,
            status: 'packet_error',
          });
          break;
        }
      }
    },
    [
      activateEmergencySiren,
      activateRemoteEffect,
      addPointerPing,
      playSoundForAction,
      pushRadioMessage,
      quest,
      role,
      sendMessage,
      triggerPeerActivityPulse,
    ]
  );

  // Establish PeerJS P2P connection when roomId is active (and not in soloTestMode)
  useEffect(() => {
    if (!roomId || soloTestMode) {
      setConnectionStatus(soloTestMode ? 'connected' : 'idle');
      setPartnerOnline(soloTestMode);
      return;
    }

    let cancelled = false;
    const cleanRoom = roomId.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
    const myPeerId = `nashdom-quest-${cleanRoom}-${role}`;
    const targetPeerId = `nashdom-quest-${cleanRoom}-${otherRole}`;

    setConnectionStatus('initializing');

    const peer = new Peer(myPeerId, {
      debug: 0,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      },
    });
    peerRef.current = peer;

    const attachConnection = (conn: DataConnection) => {
      if (dataConnRef.current && dataConnRef.current !== conn) {
        try {
          dataConnRef.current.close();
        } catch {
          // ignore
        }
      }
      dataConnRef.current = conn;

      const onOpen = () => {
        if (cancelled) return;
        setConnectionStatus('connected');
        setPartnerOnline(true);
        conn.send({ type: 'PLAYER_HELLO', role, name: playerName } as PeerMessage);
        if (role === 'p1') {
          conn.send({ type: 'FULL_STATE', state: gameStateRef.current } as PeerMessage);
        } else {
          conn.send({ type: 'REQUEST_STATE' } as PeerMessage);
        }
      };

      if (conn.open) {
        onOpen();
      } else {
        conn.on('open', onOpen);
      }

      conn.on('data', handleIncomingData);

      conn.on('close', () => {
        if (cancelled) return;
        setPartnerOnline(false);
        setConnectionStatus('waiting');
        setPingMs(null);
        setSpeakingState({ p1: false, p2: false });
        setGameState((prev) => ({
          ...prev,
          leverHold: { ...prev.leverHold, [otherRole]: false },
        }));
      });

      conn.on('error', () => {
        if (cancelled) return;
        setPartnerOnline(false);
        setConnectionStatus('reconnecting');
        setPingMs(null);
      });
    };

    const connectToHost = () => {
      if (cancelled || peer.destroyed || !peer.open) return;
      if (dataConnRef.current?.open) return;
      try {
        const conn = peer.connect(targetPeerId, { reliable: true });
        attachConnection(conn);
      } catch {
        // Retry on timer
      }
    };

    peer.on('open', () => {
      if (cancelled) return;
      setConnectionStatus('waiting');

      // Client (p2) initiates connection to Host (p1), retrying until host is ready
      if (role === 'p2') {
        connectToHost();
        reconnectTimerRef.current = window.setInterval(() => {
          if (!dataConnRef.current?.open) {
            connectToHost();
          }
        }, 3000);
      }
    });

    peer.on('connection', (incomingConn) => {
      if (cancelled) return;
      attachConnection(incomingConn);
    });

    // Incoming WebRTC audio call for Push-to-Talk Radio
    peer.on('call', (incomingCall) => {
      if (cancelled) return;
      incomingCall.answer();
      incomingCall.on('stream', (remoteStream) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
          remoteAudioRef.current.play().catch(() => {});
        }
      });
    });

    peer.on('error', (err) => {
      if (cancelled) return;
      if (err.type === 'peer-unavailable') {
        // Host not online yet; p2 timer will keep retrying cleanly
        setConnectionStatus('waiting');
      } else if (err.type === 'unavailable-id') {
        setConnectionStatus('error');
      } else {
        setConnectionStatus('reconnecting');
      }
    });

    peer.on('disconnected', () => {
      if (cancelled || peer.destroyed) return;
      setConnectionStatus('reconnecting');
      try {
        peer.reconnect();
      } catch {
        // ignore
      }
    });

    return () => {
      cancelled = true;
      if (reconnectTimerRef.current) {
        window.clearInterval(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (waveformRafRef.current) {
        cancelAnimationFrame(waveformRafRef.current);
        waveformRafRef.current = null;
      }
      if (mediaCallRef.current) {
        mediaCallRef.current.close();
        mediaCallRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      if (dataConnRef.current) {
        dataConnRef.current.close();
        dataConnRef.current = null;
      }
      peer.destroy();
      peerRef.current = null;
    };
  }, [roomId, role, otherRole, playerName, soloTestMode, handleIncomingData]);

  // Random intermittent radio static crackles while either player is transmitting
  useEffect(() => {
    const channelActive = speakingState.p1 || speakingState.p2;
    if (!channelActive) return;

    let timerId: number | null = null;
    let cancelled = false;

    const scheduleNextCrackle = () => {
      const delay = 750 + Math.floor(Math.random() * 1650);
      timerId = window.setTimeout(() => {
        if (cancelled) return;
        playRadioCrackle(Math.random() < 0.35 ? 'burst' : 'short');
        scheduleNextCrackle();
      }, delay);
    };

    scheduleNextCrackle();
    return () => {
      cancelled = true;
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
    };
  }, [speakingState.p1, speakingState.p2]);

  // Real-time PeerJS radio latency (ping) measurement loop
  useEffect(() => {
    if (soloTestMode) {
      setPingMs(3);
      const id = window.setInterval(() => {
        setPingMs(2 + Math.floor(Math.random() * 4));
      }, 2800);
      return () => window.clearInterval(id);
    }

    if (!partnerOnline || connectionStatus !== 'connected') {
      setPingMs(null);
      return;
    }

    const sendPing = () => {
      sendMessage(
        {
          type: 'LATENCY_PING',
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          sentAt: performance.now(),
        },
        true
      );
    };

    sendPing();
    const intervalId = window.setInterval(sendPing, 2600);
    return () => window.clearInterval(intervalId);
  }, [connectionStatus, partnerOnline, sendMessage, soloTestMode]);

  // Waveform animation loop while speaking
  const startWaveformLoop = useCallback((stream: MediaStream) => {
    try {
      const AudioContextCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextCtor();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 32;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const bars = Array.from({ length: 7 }, (_, i) => {
          const val = dataArray[i + 1] ?? 0;
          return Math.max(0.18, Math.min(1, val / 190));
        });
        setAudioLevels(bars);
        waveformRafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // Fallback animated bars handled in UI
    }
  }, []);

  const stopWaveformLoop = useCallback(() => {
    if (waveformRafRef.current) {
      cancelAnimationFrame(waveformRafRef.current);
      waveformRafRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevels([0.15, 0.2, 0.15, 0.2, 0.15, 0.2, 0.15]);
  }, []);

  // Push-to-Talk start (hold)
  const startTalking = useCallback(async () => {
    if (isMicMutedRef.current) {
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
      }
      return;
    }
    playRadioClick(true);
    playRadioWhiteNoise();
    setSpeakingState((prev) => ({ ...prev, [role]: true }));
    sendMessage({ type: 'PTT_STATUS', role, speaking: true });

    if (soloTestMode) {
      // Animate waveform in solo preview mode
      let frame = 0;
      const tick = () => {
        frame += 0.25;
        setAudioLevels(
          Array.from({ length: 7 }, (_, i) => 0.3 + Math.abs(Math.sin(frame + i * 0.7)) * 0.65)
        );
        waveformRafRef.current = requestAnimationFrame(tick);
      };
      tick();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setMicPermission('denied');
      return;
    }

    try {
      let stream = localStreamRef.current;
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        localStreamRef.current = stream;
        setMicPermission('granted');
      }

      stream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
      startWaveformLoop(stream);

      const peer = peerRef.current;
      if (peer && !peer.destroyed && roomId && partnerOnline) {
        const cleanRoom = roomId.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
        const targetPeerId = `nashdom-quest-${cleanRoom}-${otherRole}`;
        if (!mediaCallRef.current) {
          const call = peer.call(targetPeerId, stream);
          mediaCallRef.current = call;
          call.on('close', () => {
            if (mediaCallRef.current === call) {
              mediaCallRef.current = null;
            }
          });
        }
      }
    } catch {
      setMicPermission('denied');
    }
  }, [otherRole, partnerOnline, role, roomId, sendMessage, soloTestMode, startWaveformLoop]);

  // Push-to-Talk release
  const stopTalking = useCallback(() => {
    setSpeakingState((prev) => {
      if (!prev[role]) return prev;
      playRadioClick(false);
      return { ...prev, [role]: false };
    });
    sendMessage({ type: 'PTT_STATUS', role, speaking: false });
    stopWaveformLoop();

    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });
    }
  }, [role, sendMessage, stopWaveformLoop]);

  // Toggle local Mute ('Режим тиші'): disables microphone tracks immediately even outside PTT
  const toggleMicMute = useCallback(() => {
    setIsMicMuted((prev) => {
      const nextMuted = !prev;
      isMicMutedRef.current = nextMuted;
      if (nextMuted) {
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach((track) => {
            track.enabled = false;
          });
        }
        setSpeakingState((curr) => {
          if (!curr[role]) return curr;
          playRadioClick(false);
          sendMessage({ type: 'PTT_STATUS', role, speaking: false });
          return { ...curr, [role]: false };
        });
        stopWaveformLoop();
      }
      return nextMuted;
    });
  }, [role, sendMessage, stopWaveformLoop]);

  // Send live laser pointer tap in shared scene
  const emitPointerTap = useCallback(
    (x: number, y: number) => {
      const ping: PointerPing = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        x,
        y,
        playerRole: role,
        playerName,
        timestamp: Date.now(),
      };
      addPointerPing(ping);
      sendMessage({ type: 'POINTER', ping });
    },
    [addPointerPing, playerName, role, sendMessage]
  );

  // Sync simultaneous lever hold
  const setLeverHolding = useCallback(
    (holding: boolean, overrideRole?: PlayerRole) => {
      const targetRole = overrideRole ?? role;
      setGameState((prev) => {
        if (prev.leverHold[targetRole] === holding) return prev;
        return {
          ...prev,
          leverHold: {
            ...prev.leverHold,
            [targetRole]: holding,
          },
        };
      });
      sendMessage({ type: 'LEVER_HOLD', role: targetRole, holding });
    },
    [role, sendMessage]
  );

  // Fallback quick-ping text radio message (with random packet-drop errors under distance / low battery)
  const sendQuickPing = useCallback(
    (
      text: string,
      options?: {
        isSplitDistance?: boolean;
        isLowBattery?: boolean;
        isSurge?: boolean;
      }
    ) => {
      playRadioClick(true);
      playRadioCrackle('burst');

      let dropChance = 0;
      if (options?.isSplitDistance) dropChance += 0.25;
      if (options?.isLowBattery) dropChance += 0.3;
      if (options?.isSurge) dropChance += 0.35;
      dropChance = Math.min(0.65, dropChance);

      if (dropChance > 0 && Math.random() < dropChance) {
        playErrorBuzz();
        const errorTexts: string[] = [];
        if (options?.isLowBattery) {
          errorTexts.push('НЕДОСТАВЛЕНО: сигнал переривається (низький заряд рації)');
        }
        if (options?.isSplitDistance) {
          errorTexts.push('НЕДОСТАВЛЕНО: сигнал переривається між вагонами');
        }
        if (options?.isSurge) {
          errorTexts.push('ПОМИЛКА ПАКЕТА: електромагнітні перешкоди в ефірі');
        }
        const errorMsg: RadioPingMessage = {
          id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          fromRole: role,
          fromName: 'РАЦІЯ · ПОМИЛКА',
          text:
            errorTexts[Math.floor(Math.random() * errorTexts.length)] ??
            'НЕДОСТАВЛЕНО: сигнал переривається',
          timestamp: Date.now(),
          status: 'packet_error',
        };
        pushRadioMessage(errorMsg);
        return;
      }

      const message: RadioPingMessage = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        fromRole: role,
        fromName: playerName,
        text,
        timestamp: Date.now(),
        status: 'ok',
      };
      pushRadioMessage(message);
      sendMessage({ type: 'QUICK_PING', message });
    },
    [playerName, pushRadioMessage, role, sendMessage]
  );

  // Inject a sporadic radio packet error notice into the radio chat feed
  const reportRadioPacketError = useCallback(
    (reasonText: string) => {
      playRadioCrackle('burst');
      const errorMsg: RadioPingMessage = {
        id: `pkt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        fromRole: role,
        fromName: 'РАЦІЯ · ЗБІЙ',
        text: reasonText,
        timestamp: Date.now(),
        status: 'packet_error',
      };
      pushRadioMessage(errorMsg);
    },
    [pushRadioMessage, role]
  );

  // Player 2 remote console command affecting Player 1's scene components
  const sendRemoteCommand = useCallback(
    (kind: RemoteEffectKind, commandText: string, label: string) => {
      playRadioClick(true);
      playRadioCrackle('burst');
      triggerPeerActivityPulse();
      const effect: RemoteSceneEffect = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        kind,
        commandText,
        label,
        fromName: playerName,
        timestamp: Date.now(),
      };
      activateRemoteEffect(effect);
      pushRadioMessage({
        id: effect.id,
        fromRole: role,
        fromName: playerName,
        text: `Команда [${commandText}] → ${label}`,
        timestamp: effect.timestamp,
        status: 'ok',
      });
      sendMessage({ type: 'REMOTE_COMMAND', effect });
    },
    [activateRemoteEffect, playerName, pushRadioMessage, role, sendMessage, triggerPeerActivityPulse]
  );

  // Trigger synchronized Emergency Siren on both players' screens
  const triggerEmergencySiren = useCallback(() => {
    const alert: EmergencySirenAlert = {
      id: `siren-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fromRole: role,
      fromName: playerName,
      timestamp: Date.now(),
    };
    triggerPeerActivityPulse();
    activateEmergencySiren(alert);
    pushRadioMessage({
      id: alert.id,
      fromRole: role,
      fromName: playerName,
      text: 'АВАРІЙНА СИРЕНА! Потрібна термінова увага!',
      timestamp: alert.timestamp,
      status: 'packet_error',
    });
    sendMessage({ type: 'EMERGENCY_SIREN', alert });
  }, [activateEmergencySiren, playerName, pushRadioMessage, role, sendMessage, triggerPeerActivityPulse]);

  return {
    gameState,
    connectionStatus,
    partnerName,
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
    startTalking,
    stopTalking,
    toggleMicMute,
    emitPointerTap,
    setLeverHolding,
    sendQuickPing,
    reportRadioPacketError,
    sendRemoteCommand,
    triggerEmergencySiren,
  };
}
