import { GameState, PeerMessage, QuestConfig } from '../types/game';

export function createInitialGameState(quest: QuestConfig): GameState {
  return {
    questId: quest.id,
    currentSceneId: quest.initialSceneId,
    phase: 'playing',
    transitionText: null,
    inventory: [],
    solvedHotspots: [],
    flags: [],
    notes: [],
    leverHold: { p1: false, p2: false },
    victoryChoiceId: null,
    startedAt: null,
    elapsedMs: null,
    lastEvent: undefined,
  };
}

type MutationAction = Extract<PeerMessage, { type: 'GAME_MUTATION' }>['action'];

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function applyGameMutation(
  state: GameState,
  action: MutationAction,
  quest: QuestConfig
): GameState {
  switch (action.kind) {
    case 'COLLECT_ITEM': {
      const alreadySolved = state.solvedHotspots.includes(action.hotspotId);
      const alreadyHasItem = state.inventory.some((entry) => entry.itemId === action.itemId);
      if (alreadySolved && alreadyHasItem) return state;

      return {
        ...state,
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

      const filteredInventory = action.consumedItemId
        ? state.inventory.filter((entry) => entry.itemId !== action.consumedItemId)
        : state.inventory;

      const alreadyHasNew = filteredInventory.some((entry) => entry.itemId === action.givesItemId);
      return {
        ...state,
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
      return {
        ...state,
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

    case 'TRANSFER_ITEM': {
      const exists = state.inventory.some((entry) => entry.itemId === action.itemId);
      if (!exists) return state;
      const itemName = quest.items[action.itemId]?.name ?? 'Предмет';
      return {
        ...state,
        inventory: state.inventory.map((entry) =>
          entry.itemId === action.itemId ? { ...entry, owner: action.toRole } : entry
        ),
        lastEvent: {
          id: uid(),
          text: `${action.fromName} передала «${itemName}» → ${action.toName}`,
          tone: 'info',
        },
      };
    }

    case 'START_TRANSITION': {
      if (state.phase === 'transition' || state.currentSceneId === action.targetSceneId) {
        return state;
      }
      return {
        ...state,
        solvedHotspots: state.solvedHotspots.includes(action.hotspotId)
          ? state.solvedHotspots
          : [...state.solvedHotspots, action.hotspotId],
        // Consume service key on opening Sprechstelle
        inventory: state.inventory.filter((entry) => entry.itemId !== 'service_key'),
        phase: 'transition',
        transitionText: action.narration,
        leverHold: { p1: false, p2: false },
      };
    }

    case 'COMPLETE_TRANSITION': {
      return {
        ...state,
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
      return {
        ...state,
        victoryChoiceId: action.choiceId,
      };
    }

    case 'ADD_NOTE': {
      if (state.notes.some((n) => n.id === action.note.id)) return state;
      return {
        ...state,
        notes: [...state.notes, action.note],
      };
    }

    case 'DELETE_NOTE': {
      return {
        ...state,
        notes: state.notes.filter((n) => n.id !== action.noteId),
      };
    }

    case 'RESTART': {
      return {
        ...createInitialGameState(quest),
        startedAt: action.startedAt ?? Date.now(),
      };
    }

    default:
      return state;
  }
}
