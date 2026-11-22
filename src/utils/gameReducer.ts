import {
  GameMutationAction,
  GameState,
  PlayerRole,
  QuestConfig,
} from '../types/game';
import { g } from './ukrainianGrammar';

export function createInitialGameState(
  quest: QuestConfig,
  initialVersion = 1
): GameState {
  return {
    questId: quest.id,
    stateVersion: initialVersion,
    currentSceneId: quest.initialSceneId,
    phase: 'playing',
    transitionText: null,
    scene1: {
      clueRead: false,
    },
    players: {
      p1: {
        name: quest.players.p1.defaultName,
        gender: quest.players.p1.defaultGender,
      },
      p2: {
        name: quest.players.p2.defaultName,
        gender: quest.players.p2.defaultGender,
      },
    },
    inventory: [],
    transferHatchItem: null,
    transferHatchFromRole: null,
    solvedHotspots: [],
    flags: [],
    leverHold: { p1: false, p2: false },
    victoryChoiceId: null,
    startedAt: null,
    elapsedMs: null,
    lastEvent: undefined,
  };
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Reconciles an incoming FULL_STATE snapshot (initial sync or 2s heartbeat) with local state
 * without dropping local live lever-hold state or regressing to older revisions.
 */
export function mergeRemoteGameState(
  local: GameState,
  incoming: GameState,
  myRole: PlayerRole
): GameState {
  const otherRole: PlayerRole = myRole === 'p1' ? 'p2' : 'p1';

  // Ensure backward compatibility with any partial/older payload shape
  const normalizedIncoming: GameState = {
    ...local,
    ...incoming,
    stateVersion: typeof incoming.stateVersion === 'number' ? incoming.stateVersion : local.stateVersion,
    scene1: incoming.scene1 ?? local.scene1,
    players: incoming.players ?? local.players,
    transferHatchItem:
      incoming.transferHatchItem !== undefined ? incoming.transferHatchItem : local.transferHatchItem,
    transferHatchFromRole:
      incoming.transferHatchFromRole !== undefined
        ? incoming.transferHatchFromRole
        : local.transferHatchFromRole,
    leverHold: {
      ...local.leverHold,
      ...(incoming.leverHold ?? {}),
      [myRole]: local.leverHold[myRole],
    },
  };

  if (normalizedIncoming.stateVersion > local.stateVersion) {
    return normalizedIncoming;
  }

  if (normalizedIncoming.stateVersion === local.stateVersion) {
    // Same revision: sync partner's live lever hold and partner's profile without thrashing state
    const partnerHoldChanged =
      local.leverHold[otherRole] !== normalizedIncoming.leverHold[otherRole];
    const partnerProfileChanged =
      local.players[otherRole].name !== normalizedIncoming.players[otherRole].name ||
      local.players[otherRole].gender !== normalizedIncoming.players[otherRole].gender;

    if (!partnerHoldChanged && !partnerProfileChanged) {
      return local;
    }

    return {
      ...local,
      leverHold: {
        ...local.leverHold,
        [otherRole]: normalizedIncoming.leverHold[otherRole],
      },
      players: {
        ...local.players,
        [otherRole]: normalizedIncoming.players[otherRole],
      },
    };
  }

  // Incoming state is older than local state -> keep local (caller may push local back)
  return local;
}

export function applyGameMutation(
  state: GameState,
  action: GameMutationAction,
  quest: QuestConfig
): GameState {
  const nextVer = state.stateVersion + 1;

  switch (action.kind) {
    case 'READ_SCENE1_CLUE': {
      const alreadyRead = state.scene1.clueRead && state.solvedHotspots.includes(action.hotspotId);
      if (alreadyRead) return state;

      return {
        ...state,
        stateVersion: nextVer,
        scene1: {
          ...state.scene1,
          clueRead: true,
        },
        solvedHotspots: state.solvedHotspots.includes(action.hotspotId)
          ? state.solvedHotspots
          : [...state.solvedHotspots, action.hotspotId],
        lastEvent: {
          id: uid(),
          text: action.toast,
          tone: 'info',
        },
      };
    }

    case 'COLLECT_ITEM': {
      // Strict Scene 1 guard: cannot collect screwdriver from trash bin before reading smartphone SMS
      if (action.hotspotId === 'hs-trashbin' && !state.scene1.clueRead) {
        return state;
      }

      const alreadySolved = state.solvedHotspots.includes(action.hotspotId);
      const alreadyHasItem = state.inventory.some((entry) => entry.itemId === action.itemId);
      if (alreadySolved && alreadyHasItem) return state;

      return {
        ...state,
        stateVersion: nextVer,
        solvedHotspots: alreadySolved
          ? state.solvedHotspots
          : [...state.solvedHotspots, action.hotspotId],
        inventory: alreadyHasItem
          ? state.inventory
          : [...state.inventory, { itemId: action.itemId, owner: action.owner }],
        lastEvent: {
          id: uid(),
          text: action.toast,
          tone: 'success',
        },
      };
    }

    case 'UNLOCK_CONTAINER': {
      const alreadySolved = state.solvedHotspots.includes(action.hotspotId);
      if (alreadySolved) return state;

      // Strict Scene 1 guard: must actually possess the required item (e.g. screwdriver)
      if (
        action.consumedItemId &&
        !state.inventory.some((entry) => entry.itemId === action.consumedItemId)
      ) {
        return state;
      }

      const filteredInventory = action.consumedItemId
        ? state.inventory.filter((entry) => entry.itemId !== action.consumedItemId)
        : state.inventory;

      const alreadyHasNew = filteredInventory.some((entry) => entry.itemId === action.givesItemId);
      return {
        ...state,
        stateVersion: nextVer,
        solvedHotspots: [...state.solvedHotspots, action.hotspotId],
        inventory: alreadyHasNew
          ? filteredInventory
          : [...filteredInventory, { itemId: action.givesItemId, owner: action.owner }],
        lastEvent: {
          id: uid(),
          text: action.toast,
          tone: 'success',
        },
      };
    }

    case 'SOLVE_KEYPAD': {
      if (state.flags.includes(action.flag)) return state;
      return {
        ...state,
        stateVersion: nextVer,
        solvedHotspots: state.solvedHotspots.includes(action.hotspotId)
          ? state.solvedHotspots
          : [...state.solvedHotspots, action.hotspotId],
        flags: [...state.flags, action.flag],
        lastEvent: {
          id: uid(),
          text: action.toast,
          tone: 'success',
        },
      };
    }

    case 'INSERT_FUSE': {
      if (state.flags.includes(action.flag)) return state;
      if (!state.inventory.some((entry) => entry.itemId === action.itemId)) return state;

      return {
        ...state,
        stateVersion: nextVer,
        solvedHotspots: state.solvedHotspots.includes(action.hotspotId)
          ? state.solvedHotspots
          : [...state.solvedHotspots, action.hotspotId],
        flags: [...state.flags, action.flag],
        inventory: state.inventory.filter((entry) => entry.itemId !== action.itemId),
        lastEvent: {
          id: uid(),
          text: action.toast,
          tone: 'success',
        },
      };
    }

    case 'PUT_IN_HATCH': {
      const exists = state.inventory.some((entry) => entry.itemId === action.itemId);
      if (!exists || state.transferHatchItem !== null) return state;
      const itemName = quest.items[action.itemId]?.name ?? 'Предмет';
      const putVerb = g(action.fromGender, 'поклав', 'поклала');
      return {
        ...state,
        stateVersion: nextVer,
        inventory: state.inventory.filter((entry) => entry.itemId !== action.itemId),
        transferHatchItem: action.itemId,
        transferHatchFromRole: action.fromRole,
        lastEvent: {
          id: uid(),
          text: `${action.fromName} ${putVerb} «${itemName}» у шлюз передачі`,
          tone: 'info',
        },
      };
    }

    case 'TAKE_FROM_HATCH': {
      if (!state.transferHatchItem) return state;
      const itemId = state.transferHatchItem;
      const itemName = quest.items[itemId]?.name ?? 'Предмет';
      const takeVerb = g(action.toGender, 'забрав', 'забрала');
      const alreadyHas = state.inventory.some((entry) => entry.itemId === itemId);

      return {
        ...state,
        stateVersion: nextVer,
        transferHatchItem: null,
        transferHatchFromRole: null,
        inventory: alreadyHas
          ? state.inventory.map((e) => (e.itemId === itemId ? { ...e, owner: action.toRole } : e))
          : [...state.inventory, { itemId, owner: action.toRole }],
        lastEvent: {
          id: uid(),
          text: `${action.toName} ${takeVerb} «${itemName}» зі шлюзу передачі`,
          tone: 'success',
        },
      };
    }

    case 'UPDATE_PLAYER_PROFILE': {
      const curr = state.players[action.role];
      if (curr.name === action.name && curr.gender === action.gender) return state;
      return {
        ...state,
        players: {
          ...state.players,
          [action.role]: {
            name: action.name,
            gender: action.gender,
          },
        },
      };
    }

    case 'START_TRANSITION': {
      if (state.phase === 'transition' || state.currentSceneId === action.targetSceneId) {
        return state;
      }
      if (!state.inventory.some((entry) => entry.itemId === 'service_key')) {
        return state;
      }
      return {
        ...state,
        stateVersion: nextVer,
        solvedHotspots: state.solvedHotspots.includes(action.hotspotId)
          ? state.solvedHotspots
          : [...state.solvedHotspots, action.hotspotId],
        inventory: state.inventory.filter((entry) => entry.itemId !== 'service_key'),
        phase: 'transition',
        transitionText: action.narration,
        leverHold: { p1: false, p2: false },
      };
    }

    case 'COMPLETE_TRANSITION': {
      if (state.currentSceneId === action.targetSceneId && state.phase === 'playing') {
        return state;
      }
      return {
        ...state,
        stateVersion: nextVer,
        currentSceneId: action.targetSceneId,
        phase: 'playing',
        transitionText: null,
        lastEvent: {
          id: uid(),
          text: 'Двері заблоковано! Тримайте зв’язок по рації.',
          tone: 'warning',
        },
      };
    }

    case 'START_TIMER': {
      if (state.startedAt !== null) return state;
      return {
        ...state,
        startedAt: action.startedAt,
      };
    }

    case 'COMPLETE_ESCAPE': {
      if (state.phase === 'victory') return state;
      const computedElapsed =
        typeof action.elapsedMs === 'number'
          ? Math.max(0, action.elapsedMs)
          : state.startedAt !== null
            ? Math.max(0, Date.now() - state.startedAt)
            : 0;
      return {
        ...state,
        stateVersion: nextVer,
        phase: 'victory',
        leverHold: { p1: false, p2: false },
        elapsedMs: computedElapsed,
        lastEvent: {
          id: uid(),
          text: 'Аварійні двері відчинено!',
          tone: 'success',
        },
      };
    }

    case 'CHOOSE_VICTORY': {
      if (state.victoryChoiceId === action.choiceId) return state;
      return {
        ...state,
        stateVersion: nextVer,
        victoryChoiceId: action.choiceId,
      };
    }

    case 'RESTART': {
      return {
        ...createInitialGameState(quest, nextVer),
        players: state.players,
        startedAt: action.startedAt ?? Date.now(),
      };
    }

    default:
      return state;
  }
}
