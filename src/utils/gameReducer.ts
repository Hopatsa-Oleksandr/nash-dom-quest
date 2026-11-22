import {
  GameMutationAction,
  GameState,
  InventoryEntry,
  PlayerRole,
  QuestAct,
  QuestConfig,
  TransferHatchItem,
} from '../types/game';
import { g } from './ukrainianGrammar';

export function createInitialGameState(
  quest: QuestConfig,
  initialVersion = 1,
  resetEpoch = 0
): GameState {
  return {
    questId: quest.id,
    version: initialVersion,
    updatedAt: Date.now(),
    resetEpoch,
    act: 1,
    currentSceneId: quest.initialSceneId,
    phase: 'playing',
    transitionText: null,
    scene1: {
      phoneUnlocked: false,
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
    consumedItems: [],
    transferHatchItem: null,
    solvedHotspots: [],
    flags: [],
    mistakes: 0,
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

function computeActFromProgress(
  currentSceneId: string,
  flags: string[],
  currentAct: QuestAct
): QuestAct {
  if (flags.includes('protocol_solved')) return 4;
  if (flags.includes('keypad_unlocked') && flags.includes('fuse_inserted')) return 3;
  if (currentSceneId === 'scene-2-split') return Math.max(2, currentAct) as QuestAct;
  return currentAct;
}

function normalizeHatchItem(
  raw: unknown,
  quest?: QuestConfig
): TransferHatchItem | null {
  if (!raw) return null;
  if (typeof raw === 'object' && 'id' in raw && 'from' in raw) {
    const obj = raw as { id: string; name?: string; from: PlayerRole };
    return {
      id: obj.id,
      name: obj.name ?? quest?.items[obj.id]?.name ?? 'Предмет',
      from: obj.from,
    };
  }
  return null;
}

function phaseRank(state: Pick<GameState, 'currentSceneId' | 'phase'>): number {
  if (state.phase === 'victory') return 4;
  if (state.currentSceneId === 'scene-2-split') return 3;
  if (state.phase === 'transition') return 2;
  return 1;
}

function unionStrings(a: string[], b: string[]): string[] {
  const set = new Set<string>(a);
  for (const item of b) {
    set.add(item);
  }
  return Array.from(set);
}

/**
 * Bulletproof union-merge reconciliation for P2P reconnects and 2-second heartbeats.
 * Guarantees that progress, collected items, solved puzzles, and items placed in the
 * Transfer Hatch while briefly offline are NEVER lost.
 */
export function mergeRemoteGameState(
  local: GameState,
  incomingRaw: GameState,
  myRole: PlayerRole,
  quest?: QuestConfig
): GameState {
  const otherRole: PlayerRole = myRole === 'p1' ? 'p2' : 'p1';

  const incoming: GameState = {
    ...local,
    ...incomingRaw,
    version: typeof incomingRaw.version === 'number' ? incomingRaw.version : local.version,
    updatedAt: typeof incomingRaw.updatedAt === 'number' ? incomingRaw.updatedAt : local.updatedAt,
    resetEpoch: typeof incomingRaw.resetEpoch === 'number' ? incomingRaw.resetEpoch : local.resetEpoch,
    act: incomingRaw.act ?? local.act,
    scene1: {
      phoneUnlocked: Boolean(incomingRaw.scene1?.phoneUnlocked),
      clueRead: Boolean(incomingRaw.scene1?.clueRead),
    },
    players: incomingRaw.players ?? local.players,
    inventory: Array.isArray(incomingRaw.inventory) ? incomingRaw.inventory : local.inventory,
    consumedItems: Array.isArray(incomingRaw.consumedItems) ? incomingRaw.consumedItems : [],
    transferHatchItem: normalizeHatchItem(incomingRaw.transferHatchItem, quest),
    solvedHotspots: Array.isArray(incomingRaw.solvedHotspots)
      ? incomingRaw.solvedHotspots
      : local.solvedHotspots,
    flags: Array.isArray(incomingRaw.flags) ? incomingRaw.flags : local.flags,
    mistakes: typeof incomingRaw.mistakes === 'number' ? incomingRaw.mistakes : local.mistakes,
    leverHold: {
      ...local.leverHold,
      ...(incomingRaw.leverHold ?? {}),
      [myRole]: local.leverHold[myRole],
    },
  };

  // Explicit RESTART handling: higher resetEpoch cleanly replaces older session state
  if (incoming.resetEpoch > local.resetEpoch) {
    return incoming;
  }
  if (incoming.resetEpoch < local.resetEpoch) {
    return local;
  }

  // Union of solved puzzles, flags, consumed items, and Scene 1 clues
  const mergedSolved = unionStrings(local.solvedHotspots, incoming.solvedHotspots);
  const mergedFlags = unionStrings(local.flags, incoming.flags);
  const mergedConsumed = unionStrings(local.consumedItems, incoming.consumedItems);
  const mergedPhoneUnlocked = local.scene1.phoneUnlocked || incoming.scene1.phoneUnlocked;
  const mergedClueRead = local.scene1.clueRead || incoming.scene1.clueRead || mergedPhoneUnlocked;

  // Scene & phase progression: strictly advance forward
  const localRank = phaseRank(local);
  const incomingRank = phaseRank(incoming);
  const leader =
    incomingRank > localRank
      ? incoming
      : localRank > incomingRank
        ? local
        : incoming.version > local.version
          ? incoming
          : incoming.version === local.version && incoming.updatedAt > local.updatedAt
            ? incoming
            : local;

  const mergedSceneId = leader.currentSceneId;
  const mergedPhase = leader.phase;
  const mergedTransitionText = mergedPhase === 'transition' ? leader.transitionText : null;

  // Transfer Hatch reconciliation: non-null transferHatchItem ALWAYS wins unless
  // the item has already been consumed OR the peer with null has a strictly higher
  // version AND already holds that item as the recipient in its inventory.
  let mergedHatch: TransferHatchItem | null = null;
  const localHatch = local.transferHatchItem;
  const incomingHatch = incoming.transferHatchItem;

  if (localHatch && incomingHatch) {
    mergedHatch = incoming.version > local.version ? incomingHatch : localHatch;
  } else if (localHatch && !incomingHatch) {
    const recipient: PlayerRole = localHatch.from === 'p1' ? 'p2' : 'p1';
    const recipientAlreadyTookIt =
      incoming.version > local.version &&
      (mergedConsumed.includes(localHatch.id) ||
        incoming.inventory.some((e) => e.itemId === localHatch.id && e.owner === recipient));
    mergedHatch = recipientAlreadyTookIt ? null : localHatch;
  } else if (!localHatch && incomingHatch) {
    const recipient: PlayerRole = incomingHatch.from === 'p1' ? 'p2' : 'p1';
    const recipientAlreadyTookIt =
      local.version > incoming.version &&
      (mergedConsumed.includes(incomingHatch.id) ||
        local.inventory.some((e) => e.itemId === incomingHatch.id && e.owner === recipient));
    mergedHatch = recipientAlreadyTookIt ? null : incomingHatch;
  }

  if (mergedHatch && mergedConsumed.includes(mergedHatch.id)) {
    mergedHatch = null;
  }

  // Inventory union merge (excluding consumed items and item currently sitting in the hatch)
  const itemOwnerMap = new Map<string, 'shared' | PlayerRole>();
  const primaryInv = incoming.version >= local.version ? incoming.inventory : local.inventory;
  const secondaryInv = incoming.version >= local.version ? local.inventory : incoming.inventory;

  for (const entry of secondaryInv) {
    if (mergedConsumed.includes(entry.itemId)) continue;
    if (mergedHatch?.id === entry.itemId) continue;
    itemOwnerMap.set(entry.itemId, entry.owner);
  }
  for (const entry of primaryInv) {
    if (mergedConsumed.includes(entry.itemId)) continue;
    if (mergedHatch?.id === entry.itemId) continue;
    const prevOwner = itemOwnerMap.get(entry.itemId);
    // Prefer specific split-mode player owner over 'shared'
    if (prevOwner && prevOwner !== 'shared' && entry.owner === 'shared') {
      continue;
    }
    itemOwnerMap.set(entry.itemId, entry.owner);
  }

  const mergedInventory: InventoryEntry[] = Array.from(itemOwnerMap.entries()).map(
    ([itemId, owner]) => ({ itemId, owner })
  );

  const mergedAct = computeActFromProgress(
    mergedSceneId,
    mergedFlags,
    Math.max(local.act, incoming.act) as QuestAct
  );
  const mergedMistakes = Math.max(local.mistakes, incoming.mistakes);
  const mergedStartedAt =
    local.startedAt !== null && incoming.startedAt !== null
      ? Math.min(local.startedAt, incoming.startedAt)
      : local.startedAt ?? incoming.startedAt;
  const mergedElapsedMs = leader.elapsedMs ?? local.elapsedMs ?? incoming.elapsedMs;
  const mergedVictoryChoice =
    incoming.version >= local.version
      ? incoming.victoryChoiceId ?? local.victoryChoiceId
      : local.victoryChoiceId ?? incoming.victoryChoiceId;

  const mergedLastEvent =
    incoming.version > local.version
      ? incoming.lastEvent ?? local.lastEvent
      : incoming.version === local.version && incoming.updatedAt > local.updatedAt
        ? incoming.lastEvent ?? local.lastEvent
        : local.lastEvent ?? incoming.lastEvent;

  const mergedPlayers = {
    ...local.players,
    [otherRole]: incoming.players[otherRole] ?? local.players[otherRole],
  };

  const mergedLeverHold = {
    ...local.leverHold,
    [otherRole]: incoming.leverHold[otherRole],
  };

  // Detect whether anything actually changed compared to local state to avoid unnecessary re-renders
  const sameInventory =
    mergedInventory.length === local.inventory.length &&
    mergedInventory.every(
      (e, idx) =>
        local.inventory[idx]?.itemId === e.itemId && local.inventory[idx]?.owner === e.owner
    );
  const sameHatch =
    (mergedHatch === null && local.transferHatchItem === null) ||
    (mergedHatch !== null &&
      local.transferHatchItem !== null &&
      mergedHatch.id === local.transferHatchItem.id &&
      mergedHatch.from === local.transferHatchItem.from);

  const nothingChanged =
    mergedSceneId === local.currentSceneId &&
    mergedPhase === local.phase &&
    mergedAct === local.act &&
    mergedPhoneUnlocked === local.scene1.phoneUnlocked &&
    mergedClueRead === local.scene1.clueRead &&
    mergedSolved.length === local.solvedHotspots.length &&
    mergedFlags.length === local.flags.length &&
    mergedConsumed.length === local.consumedItems.length &&
    mergedMistakes === local.mistakes &&
    sameInventory &&
    sameHatch &&
    mergedVictoryChoice === local.victoryChoiceId &&
    mergedStartedAt === local.startedAt &&
    mergedElapsedMs === local.elapsedMs &&
    mergedLeverHold[otherRole] === local.leverHold[otherRole] &&
    mergedPlayers[otherRole].name === local.players[otherRole].name &&
    mergedPlayers[otherRole].gender === local.players[otherRole].gender &&
    mergedLastEvent?.id === local.lastEvent?.id &&
    incoming.version <= local.version;

  if (nothingChanged) {
    return local;
  }

  return {
    ...local,
    version: Math.max(local.version, incoming.version),
    updatedAt: Math.max(local.updatedAt, incoming.updatedAt),
    act: mergedAct,
    currentSceneId: mergedSceneId,
    phase: mergedPhase,
    transitionText: mergedTransitionText,
    scene1: {
      phoneUnlocked: mergedPhoneUnlocked,
      clueRead: mergedClueRead,
    },
    players: mergedPlayers,
    inventory: mergedInventory,
    consumedItems: mergedConsumed,
    transferHatchItem: mergedHatch,
    solvedHotspots: mergedSolved,
    flags: mergedFlags,
    mistakes: mergedMistakes,
    leverHold: mergedLeverHold,
    victoryChoiceId: mergedVictoryChoice,
    startedAt: mergedStartedAt,
    elapsedMs: mergedElapsedMs,
    lastEvent: mergedLastEvent,
  };
}

export function applyGameMutation(
  state: GameState,
  action: GameMutationAction,
  quest: QuestConfig
): GameState {
  const nextVer = state.version + 1;
  const now = Date.now();

  switch (action.kind) {
    case 'UNLOCK_PHONE': {
      const alreadyUnlocked =
        state.scene1.phoneUnlocked && state.solvedHotspots.includes(action.hotspotId);
      if (alreadyUnlocked) return state;

      return {
        ...state,
        version: nextVer,
        updatedAt: now,
        scene1: {
          phoneUnlocked: true,
          clueRead: true,
        },
        solvedHotspots: unionStrings(state.solvedHotspots, [action.hotspotId]),
        flags: unionStrings(state.flags, ['phone_unlocked']),
        lastEvent: {
          id: uid(),
          text: action.toast,
          tone: 'success',
        },
      };
    }

    case 'READ_SCENE1_CLUE': {
      const alreadyRead = state.scene1.clueRead && state.solvedHotspots.includes(action.hotspotId);
      if (alreadyRead) return state;

      return {
        ...state,
        version: nextVer,
        updatedAt: now,
        scene1: {
          ...state.scene1,
          clueRead: true,
        },
        solvedHotspots: unionStrings(state.solvedHotspots, [action.hotspotId]),
        lastEvent: {
          id: uid(),
          text: action.toast,
          tone: 'info',
        },
      };
    }

    case 'COLLECT_ITEM': {
      // Strict Scene 1 guard: cannot collect screwdriver from trash bin before unlocking smartphone
      if (action.hotspotId === 'hs-trashbin' && !state.scene1.phoneUnlocked) {
        return state;
      }

      const alreadySolved = state.solvedHotspots.includes(action.hotspotId);
      const alreadyHasItem =
        state.inventory.some((entry) => entry.itemId === action.itemId) ||
        state.consumedItems.includes(action.itemId);
      if (alreadySolved && alreadyHasItem) return state;

      return {
        ...state,
        version: nextVer,
        updatedAt: now,
        solvedHotspots: unionStrings(state.solvedHotspots, [action.hotspotId]),
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
      if (state.solvedHotspots.includes(action.hotspotId)) return state;

      if (
        action.consumedItemId &&
        !state.inventory.some((entry) => entry.itemId === action.consumedItemId)
      ) {
        return state;
      }

      const filteredInventory = action.consumedItemId
        ? state.inventory.filter((entry) => entry.itemId !== action.consumedItemId)
        : state.inventory;

      const nextConsumed = action.consumedItemId
        ? unionStrings(state.consumedItems, [action.consumedItemId])
        : state.consumedItems;

      const alreadyHasNew = filteredInventory.some((entry) => entry.itemId === action.givesItemId);
      return {
        ...state,
        version: nextVer,
        updatedAt: now,
        solvedHotspots: unionStrings(state.solvedHotspots, [action.hotspotId]),
        consumedItems: nextConsumed,
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

    case 'UNLOCK_HATCH_COMBO': {
      if (state.solvedHotspots.includes(action.hotspotId)) return state;
      if (!state.inventory.some((entry) => entry.itemId === action.consumedItemId)) {
        return state;
      }

      const filteredInventory = state.inventory.filter(
        (entry) => entry.itemId !== action.consumedItemId
      );
      const nextInventory = [...filteredInventory];
      for (const itemId of action.givesItemIds) {
        if (!nextInventory.some((e) => e.itemId === itemId)) {
          nextInventory.push({ itemId, owner: action.owner });
        }
      }

      return {
        ...state,
        version: nextVer,
        updatedAt: now,
        solvedHotspots: unionStrings(state.solvedHotspots, [action.hotspotId]),
        consumedItems: unionStrings(state.consumedItems, [action.consumedItemId]),
        inventory: nextInventory,
        lastEvent: {
          id: uid(),
          text: action.toast,
          tone: 'success',
        },
      };
    }

    case 'SOLVE_KEYPAD': {
      if (state.flags.includes(action.flag)) return state;
      const nextFlags = unionStrings(state.flags, [action.flag]);
      const nextAct = computeActFromProgress(state.currentSceneId, nextFlags, state.act);
      const unlockedAct3 = nextAct === 3 && state.act < 3;

      return {
        ...state,
        version: nextVer,
        updatedAt: now,
        act: nextAct,
        solvedHotspots: unionStrings(state.solvedHotspots, [action.hotspotId]),
        flags: nextFlags,
        lastEvent: {
          id: uid(),
          text: unlockedAct3
            ? `${action.toast} Акт 3 активовано: відкрийте електрощит розблокування та інструкцію DB!`
            : action.toast,
          tone: 'success',
        },
      };
    }

    case 'INSERT_FUSE': {
      if (state.flags.includes(action.flag)) return state;
      if (!state.inventory.some((entry) => entry.itemId === action.itemId)) return state;

      const nextFlags = unionStrings(state.flags, [action.flag]);
      const nextAct = computeActFromProgress(state.currentSceneId, nextFlags, state.act);
      const unlockedAct3 = nextAct === 3 && state.act < 3;

      return {
        ...state,
        version: nextVer,
        updatedAt: now,
        act: nextAct,
        solvedHotspots: unionStrings(state.solvedHotspots, [action.hotspotId]),
        flags: nextFlags,
        consumedItems: unionStrings(state.consumedItems, [action.itemId]),
        inventory: state.inventory.filter((entry) => entry.itemId !== action.itemId),
        lastEvent: {
          id: uid(),
          text: unlockedAct3
            ? `${action.toast} Акт 3 активовано: відкрийте електрощит розблокування та інструкцію DB!`
            : action.toast,
          tone: 'success',
        },
      };
    }

    case 'SOLVE_PROTOCOL': {
      if (state.flags.includes(action.flag)) return state;
      const nextFlags = unionStrings(state.flags, [action.flag]);
      const nextAct = computeActFromProgress(state.currentSceneId, nextFlags, state.act);

      return {
        ...state,
        version: nextVer,
        updatedAt: now,
        act: nextAct,
        solvedHotspots: unionStrings(state.solvedHotspots, [action.hotspotId]),
        flags: nextFlags,
        lastEvent: {
          id: uid(),
          text: action.toast,
          tone: 'success',
        },
      };
    }

    case 'RECORD_MISTAKE': {
      return {
        ...state,
        version: nextVer,
        updatedAt: now,
        mistakes: state.mistakes + 1,
        lastEvent: action.toast
          ? {
              id: uid(),
              text: action.toast,
              tone: 'warning',
            }
          : state.lastEvent,
      };
    }

    case 'PUT_IN_HATCH': {
      const exists = state.inventory.some((entry) => entry.itemId === action.itemId);
      if (!exists || state.transferHatchItem !== null) return state;
      const itemName = quest.items[action.itemId]?.name ?? 'Предмет';
      const putVerb = g(action.fromGender, 'поклав', 'поклала');
      return {
        ...state,
        version: nextVer,
        updatedAt: now,
        inventory: state.inventory.filter((entry) => entry.itemId !== action.itemId),
        transferHatchItem: {
          id: action.itemId,
          name: itemName,
          from: action.fromRole,
        },
        lastEvent: {
          id: uid(),
          text: `${action.fromName} ${putVerb} «${itemName}» у шлюз передачі`,
          tone: 'info',
        },
      };
    }

    case 'TAKE_FROM_HATCH': {
      if (!state.transferHatchItem) return state;
      const itemId = state.transferHatchItem.id;
      const itemName = state.transferHatchItem.name || quest.items[itemId]?.name || 'Предмет';
      const takeVerb = g(action.toGender, 'забрав', 'забрала');
      const alreadyHas = state.inventory.some((entry) => entry.itemId === itemId);

      return {
        ...state,
        version: nextVer,
        updatedAt: now,
        transferHatchItem: null,
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

      const reassignedInventory = state.inventory
        .filter((entry) => entry.itemId !== 'service_key')
        .map((entry) => {
          const assignedRole = action.assignItemsOnSplit?.[entry.itemId];
          return assignedRole ? { ...entry, owner: assignedRole } : entry;
        });

      return {
        ...state,
        version: nextVer,
        updatedAt: now,
        solvedHotspots: unionStrings(state.solvedHotspots, [action.hotspotId]),
        consumedItems: unionStrings(state.consumedItems, ['service_key']),
        inventory: reassignedInventory,
        phase: 'transition',
        transitionText: action.narration,
        leverHold: { p1: false, p2: false },
      };
    }

    case 'COMPLETE_TRANSITION': {
      if (state.currentSceneId === action.targetSceneId && state.phase === 'playing') {
        return state;
      }
      const nextAct = computeActFromProgress(action.targetSceneId, state.flags, Math.max(2, state.act) as QuestAct);
      return {
        ...state,
        version: nextVer,
        updatedAt: now,
        act: nextAct,
        currentSceneId: action.targetSceneId,
        phase: 'playing',
        transitionText: null,
        lastEvent: {
          id: uid(),
          text: 'Акт 2 · Двері заблоковано! Передайте «Кусачки» через шлюз і тримайте зв’язок по рації.',
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
        version: nextVer,
        updatedAt: now,
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
        version: nextVer,
        updatedAt: now,
        victoryChoiceId: action.choiceId,
      };
    }

    case 'RESTART': {
      return {
        ...createInitialGameState(quest, nextVer, state.resetEpoch + 1),
        players: state.players,
        startedAt: action.startedAt ?? Date.now(),
      };
    }

    default:
      return state;
  }
}
