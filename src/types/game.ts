export type PlayerRole = 'p1' | 'p2';

export type PlayerGender = 'm' | 'f';

export type SceneMode = 'shared' | 'split';

export type QuestAct = 1 | 2 | 3 | 4;

export type ItemIconId = 'screwdriver' | 'service_key' | 'wire_cutters' | 'fuse';

export type ProtocolSwitchColor = 'red' | 'blue' | 'yellow' | 'green';

export interface PlayerProfile {
  name: string;
  gender: PlayerGender;
}

export interface TransferHatchItem {
  id: string;
  name: string;
  from: PlayerRole;
}

export interface QuestItem {
  id: string;
  name: string;
  shortName: string;
  description: string;
  icon: ItemIconId;
  transferable: boolean;
}

export type HotspotType =
  | 'clue_inspect'
  | 'phone_pin'
  | 'note'
  | 'pickup'
  | 'locked_container'
  | 'hatch_combo'
  | 'transition'
  | 'keypad'
  | 'fuse_slot'
  | 'led_display'
  | 'transfer_hatch'
  | 'protocol_panel'
  | 'db_manual'
  | 'coop_lever';

export interface LedCodeEntry {
  station: string;
  digit: string;
}

export interface LedRiddleEntry {
  index: number;
  question: string;
  reference: string;
}

export interface ManualTabSection {
  id: string;
  title: string;
  subtitle: string;
  rows: Array<{
    code: string;
    detail: string;
    highlight?: string;
  }>;
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
  /** For 'clue_inspect' (route board / carriage plate) */
  clueBadge?: string;
  clueDisplay?: string;
  clueHintText?: string;
  /** For 'phone_pin' / 'note' hotspot (e.g. smartphone) */
  pinCode?: string;
  pinHintText?: string;
  noteSender?: string;
  noteTime?: string;
  noteText?: string;
  /** For 'pickup' that requires Scene 1 phone to be unlocked first */
  requiresClueRead?: boolean;
  beforeClueText?: string;
  /** For 'pickup' or 'locked_container' */
  givesItemId?: string;
  /** For 'hatch_combo' yielding multiple items */
  givesItemIds?: string[];
  comboCode?: string;
  comboPlaceholder?: string;
  comboHintText?: string;
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
  ledRiddles?: LedRiddleEntry[];
  /** For 'protocol_panel' (Act 3 Vestibule A) */
  protocolStatus?: {
    errorCode: string;
    pressure: string;
    phase: string;
  };
  protocolSolution?: ProtocolSwitchColor[];
  /** For 'db_manual' (Act 3 Carriage B) */
  manualTabs?: ManualTabSection[];
  /** For 'coop_lever' or gated Act 3 hotspots */
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
  /** Optional asymmetric task text per player in split mode */
  taskByRole?: Record<PlayerRole, string>;
  /** Optional per-act asymmetric task text */
  taskByActAndRole?: Partial<Record<QuestAct, Record<PlayerRole, string>>>;
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
      defaultGender: PlayerGender;
      avatarUrl: string;
      accentColor: string;
      badgeLabel: string;
      carLabel: string;
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
  /** Monotonic state revision counter for conflict-free P2P sync */
  version: number;
  /** Timestamp (ms) of last authoritative mutation */
  updatedAt: number;
  /** Monotonic restart counter so explicit RESTART is never overwritten by union merge */
  resetEpoch: number;
  /** Active campaign act (1..4) */
  act: QuestAct;
  currentSceneId: string;
  phase: 'playing' | 'transition' | 'victory';
  transitionText: string | null;
  /** Strict Scene 1 progression tracking */
  scene1: {
    phoneUnlocked: boolean;
    clueRead: boolean;
  };
  /** Synced player profiles (names & genders) */
  players: Record<PlayerRole, PlayerProfile>;
  inventory: InventoryEntry[];
  /** Items permanently consumed/used so union-merge on reconnect never resurrects them */
  consumedItems: string[];
  /** Persistent transfer hatch item synced across both players */
  transferHatchItem: TransferHatchItem | null;
  /** Hotspot IDs that have been picked up, unlocked, or solved */
  solvedHotspots: string[];
  /** Global quest flags (e.g. 'phone_unlocked', 'keypad_unlocked', 'fuse_inserted', 'protocol_solved') */
  flags: string[];
  /** Total mistakes recorded across puzzles (e.g. Act 3 protocol switches) */
  mistakes: number;
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

export type GameMutationAction =
  | { kind: 'UNLOCK_PHONE'; hotspotId: string; toast: string }
  | { kind: 'READ_SCENE1_CLUE'; hotspotId: string; toast: string }
  | { kind: 'COLLECT_ITEM'; hotspotId: string; itemId: string; owner: 'shared' | PlayerRole; toast: string }
  | { kind: 'UNLOCK_CONTAINER'; hotspotId: string; consumedItemId?: string; givesItemId: string; owner: 'shared' | PlayerRole; toast: string }
  | { kind: 'UNLOCK_HATCH_COMBO'; hotspotId: string; consumedItemId: string; givesItemIds: string[]; owner: 'shared' | PlayerRole; toast: string }
  | { kind: 'SOLVE_KEYPAD'; hotspotId: string; flag: string; toast: string }
  | { kind: 'INSERT_FUSE'; hotspotId: string; itemId: string; flag: string; toast: string }
  | { kind: 'SOLVE_PROTOCOL'; hotspotId: string; flag: string; toast: string }
  | { kind: 'RECORD_MISTAKE'; toast?: string }
  | { kind: 'PUT_IN_HATCH'; itemId: string; fromRole: PlayerRole; fromName: string; fromGender: PlayerGender }
  | { kind: 'TAKE_FROM_HATCH'; toRole: PlayerRole; toName: string; toGender: PlayerGender }
  | { kind: 'UPDATE_PLAYER_PROFILE'; role: PlayerRole; name: string; gender: PlayerGender }
  | { kind: 'START_TIMER'; startedAt: number }
  | { kind: 'START_TRANSITION'; hotspotId: string; targetSceneId: string; narration: string; assignItemsOnSplit?: Record<string, PlayerRole> }
  | { kind: 'COMPLETE_TRANSITION'; targetSceneId: string }
  | { kind: 'COMPLETE_ESCAPE'; elapsedMs?: number }
  | { kind: 'CHOOSE_VICTORY'; choiceId: string }
  | { kind: 'RESTART'; startedAt?: number };

export type PeerMessage =
  | { type: 'FULL_STATE'; state: GameState }
  | { type: 'REQUEST_STATE' }
  | { type: 'PLAYER_HELLO'; role: PlayerRole; name: string; gender: PlayerGender }
  | { type: 'POINTER'; ping: PointerPing }
  | { type: 'LEVER_HOLD'; role: PlayerRole; holding: boolean }
  | { type: 'PTT_STATUS'; role: PlayerRole; speaking: boolean }
  | { type: 'QUICK_PING'; message: RadioPingMessage }
  | { type: 'REMOTE_COMMAND'; effect: RemoteSceneEffect }
  | { type: 'EMERGENCY_SIREN'; alert: EmergencySirenAlert }
  | { type: 'LATENCY_PING'; id: string; sentAt: number }
  | { type: 'LATENCY_PONG'; id: string; sentAt: number }
  | { type: 'GAME_MUTATION'; action: GameMutationAction };
