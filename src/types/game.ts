export type PlayerRole = 'p1' | 'p2';

export type SceneMode = 'shared' | 'split';

export type ItemIconId = 'screwdriver' | 'service_key' | 'fuse';

export interface QuestItem {
  id: string;
  name: string;
  shortName: string;
  description: string;
  icon: ItemIconId;
  transferable: boolean;
}

export type HotspotType =
  | 'note'
  | 'pickup'
  | 'locked_container'
  | 'transition'
  | 'keypad'
  | 'fuse_slot'
  | 'led_display'
  | 'coop_lever';

export interface LedCodeEntry {
  station: string;
  digit: string;
}

export interface HotspotConfig {
  id: string;
  label: string;
  /** Position in percentage of the 16:9 scene canvas */
  x: number;
  y: number;
  type: HotspotType;
  /** Only show in split mode for a specific player (omit for shared) */
  role?: PlayerRole;
  /** Modal header & body description */
  title: string;
  description: string;
  /** For 'note' hotspot (e.g. smartphone) */
  noteSender?: string;
  noteTime?: string;
  noteText?: string;
  /** For 'pickup' or 'locked_container' */
  givesItemId?: string;
  alreadyTakenText?: string;
  /** Required item to unlock or trigger */
  requiredItemId?: string;
  lockedHint?: string;
  unlockedText?: string;
  /** For 'transition' */
  targetSceneId?: string;
  transitionNarration?: string;
  /** For 'keypad' */
  keypadCode?: string;
  keypadLabel?: string;
  /** For 'led_display' */
  ledEntries?: LedCodeEntry[];
  /** For 'coop_lever' */
  leverLabel?: string;
  requiredFlags?: string[];
}

export interface SceneViewConfig {
  /** Optional custom image path (e.g. /assets/scene1.jpg) - falls back to built-in SVG illustration */
  backgroundUrl: string;
  illustrationId: 'scene1-shared' | 'scene2-p1' | 'scene2-p2';
  locationLabel: string;
}

export interface SceneConfig {
  id: string;
  title: string;
  mode: SceneMode;
  task: string;
  /** In 'shared' mode use sharedView; in 'split' mode use viewsByRole */
  sharedView?: SceneViewConfig;
  viewsByRole?: Record<PlayerRole, SceneViewConfig>;
  hotspots: HotspotConfig[];
}

export interface DialogueLine {
  speaker: PlayerRole;
  text: string;
}

export interface VictoryChoice {
  id: string;
  label: string;
  subtitle: string;
  epilogue: DialogueLine[];
}

export interface QuestConfig {
  id: string;
  title: string;
  subtitle: string;
  location: string;
  players: Record<
    PlayerRole,
    {
      defaultName: string;
      avatarUrl: string;
      accentColor: string;
      badgeLabel: string;
    }
  >;
  items: Record<string, QuestItem>;
  initialSceneId: string;
  scenes: Record<string, SceneConfig>;
  victory: {
    title: string;
    subtitle: string;
    dialogue: DialogueLine[];
    choices: VictoryChoice[];
  };
}

export interface InventoryEntry {
  itemId: string;
  /** In shared mode owner is 'shared'; in split mode owner is 'p1' or 'p2' */
  owner: 'shared' | PlayerRole;
}

export interface PointerPing {
  id: string;
  x: number;
  y: number;
  playerRole: PlayerRole;
  playerName: string;
  timestamp: number;
}

export interface RadioPingMessage {
  id: string;
  fromRole: PlayerRole;
  fromName: string;
  text: string;
  timestamp: number;
  status?: 'ok' | 'packet_error';
}

export interface NotebookNote {
  id: string;
  text: string;
  authorRole: PlayerRole;
  authorName: string;
  createdAt: number;
}

export type RemoteEffectKind = 'light' | 'alarm' | 'surge' | 'ping';

export interface RemoteSceneEffect {
  id: string;
  kind: RemoteEffectKind;
  commandText: string;
  label: string;
  fromName: string;
  timestamp: number;
}

export interface EmergencySirenAlert {
  id: string;
  fromRole: PlayerRole;
  fromName: string;
  timestamp: number;
}

export interface GameState {
  questId: string;
  currentSceneId: string;
  phase: 'playing' | 'transition' | 'victory';
  transitionText: string | null;
  inventory: InventoryEntry[];
  /** Hotspot IDs that have been picked up, unlocked, or solved */
  solvedHotspots: string[];
  /** Global quest flags (e.g. 'keypad_unlocked', 'fuse_inserted') */
  flags: string[];
  /** Shared notebook entries synced via PeerJS */
  notes: NotebookNote[];
  /** Simultaneous lever hold states */
  leverHold: Record<PlayerRole, boolean>;
  /** Selected victory choice ID */
  victoryChoiceId: string | null;
  /** Timestamp (ms) when the quest run started */
  startedAt: number | null;
  /** Total elapsed duration (ms) from quest start to door opening */
  elapsedMs: number | null;
  /** Last status toast synced across players */
  lastEvent?: {
    id: string;
    text: string;
    tone: 'info' | 'success' | 'warning';
  };
}

export type PeerMessage =
  | { type: 'FULL_STATE'; state: GameState }
  | { type: 'REQUEST_STATE' }
  | { type: 'PLAYER_HELLO'; role: PlayerRole; name: string }
  | { type: 'POINTER'; ping: PointerPing }
  | { type: 'LEVER_HOLD'; role: PlayerRole; holding: boolean }
  | { type: 'PTT_STATUS'; role: PlayerRole; speaking: boolean }
  | { type: 'QUICK_PING'; message: RadioPingMessage }
  | { type: 'REMOTE_COMMAND'; effect: RemoteSceneEffect }
  | { type: 'EMERGENCY_SIREN'; alert: EmergencySirenAlert }
  | { type: 'LATENCY_PING'; id: string; sentAt: number }
  | { type: 'LATENCY_PONG'; id: string; sentAt: number }
  | {
      type: 'GAME_MUTATION';
      action:
        | { kind: 'COLLECT_ITEM'; hotspotId: string; itemId: string; owner: 'shared' | PlayerRole; toast: string }
        | { kind: 'UNLOCK_CONTAINER'; hotspotId: string; consumedItemId?: string; givesItemId: string; owner: 'shared' | PlayerRole; toast: string }
        | { kind: 'SOLVE_KEYPAD'; hotspotId: string; flag: string; toast: string }
        | { kind: 'INSERT_FUSE'; hotspotId: string; itemId: string; flag: string; toast: string }
        | { kind: 'TRANSFER_ITEM'; itemId: string; toRole: PlayerRole; fromName: string; toName: string }
        | { kind: 'START_TIMER'; startedAt: number }
        | { kind: 'START_TRANSITION'; hotspotId: string; targetSceneId: string; narration: string }
        | { kind: 'COMPLETE_TRANSITION'; targetSceneId: string }
        | { kind: 'COMPLETE_ESCAPE'; elapsedMs?: number }
        | { kind: 'CHOOSE_VICTORY'; choiceId: string }
        | { kind: 'ADD_NOTE'; note: NotebookNote }
        | { kind: 'DELETE_NOTE'; noteId: string }
        | { kind: 'RESTART'; startedAt?: number };
    };
