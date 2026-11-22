import { QuestConfig } from '../types/game';

export const PILOT_QUEST_S2: QuestConfig = {
  id: 'stuttgart-s2-last-train',
  title: 'Останній рейс S2 (Stuttgart)',
  subtitle: 'Аварійна зупинка у нічному вагоні S-Bahn',
  location: 'Штутгарт · Лінія S2',
  players: {
    p1: {
      defaultName: 'Юяся',
      defaultGender: 'f',
      avatarUrl: '/assets/avatar-p1.png',
      accentColor: '#fb7185',
      badgeLabel: 'Гравець 1',
      carLabel: 'Вагон Б',
    },
    p2: {
      defaultName: 'Сясюня',
      defaultGender: 'm',
      avatarUrl: '/assets/avatar-p2.png',
      accentColor: '#38bdf8',
      badgeLabel: 'Гравець 2',
      carLabel: 'Тамбур А',
    },
  },
  items: {
    screwdriver: {
      id: 'screwdriver',
      name: 'Викрутка',
      shortName: 'Викрутка',
      description: 'Міцна хрестова викрутка з технічного комплекту. Підійде для гвинтів люка під сидінням.',
      icon: 'screwdriver',
      transferable: true,
    },
    service_key: {
      id: 'service_key',
      name: 'Службовий ключ',
      shortName: 'Ключ DB',
      description: 'Тригранний службовий ключ Deutsche Bahn для панелі зв’язку Sprechstelle.',
      icon: 'service_key',
      transferable: true,
    },
    fuse: {
      id: 'fuse',
      name: 'Запобіжник 32A',
      shortName: 'Запобіжник',
      description: 'Керамічний силовий запобіжник на 32А. Без нього аварійний контур дверей не запрацює.',
      icon: 'fuse',
      transferable: true,
    },
  },
  initialSceneId: 'scene-1-wagon',
  scenes: {
    'scene-1-wagon': {
      id: 'scene-1-wagon',
      title: 'Вагон S-Bahn S2 — Аварійна зупинка',
      mode: 'shared',
      task: 'Оглянути забутий смартфон на сидінні та знайти спосіб відкрити прохід.',
      sharedView: {
        backgroundUrl: '/assets/scene1.jpg',
        illustrationId: 'scene1-shared',
        locationLabel: 'Вагон 2 · Спільний огляд',
      },
      hotspots: [
        {
          id: 'hs-smartphone',
          label: 'Забутий смартфон',
          x: 34,
          y: 62,
          type: 'note',
          title: 'Забутий смартфон на сидінні',
          description: 'Екран ще світиться. На заблокованому дисплеї видно термінове SMS від провідника.',
          noteSender: 'Провідник S-Bahn · S2',
          noteTime: '23:41',
          noteText:
            'Аварійна зупинка! Службовий ключ впав під люк біля правого сидіння. Викрутку я залишив у смітнику під вікном — дістаньте її.',
        },
        {
          id: 'hs-trashbin',
          label: 'Смітник під вікном',
          x: 56,
          y: 59,
          type: 'pickup',
          requiresClueRead: true,
          beforeClueText:
            'Звичайний залізний смітник. Немає сенсу ритися в ньому без причини.',
          title: 'Смітник під вікном',
          description:
            'Ви обережно заглядаєте всередину металевого смітника під вікном. Як і писав провідник, на дні лежить хрестова викрутка.',
          givesItemId: 'screwdriver',
          alreadyTakenText: 'У смітнику більше нічого корисного немає — лише зім’яті квитки VVS.',
        },
        {
          id: 'hs-seat-hatch',
          label: 'Люк під сидінням',
          x: 72,
          y: 78,
          type: 'locked_container',
          title: 'Люк під правим сидінням',
          description:
            'Металева вентиляційна кришка під правим сидінням закручена на 4 гвинти. Крізь отвори щось металево блищить.',
          requiredItemId: 'screwdriver',
          lockedHint: 'Люк закручений на 4 гвинти. Голими руками не відкрити.',
          givesItemId: 'service_key',
          unlockedText:
            'Гвинти успішно відкручено! Всередині під проводами лежав тригранний службовий ключ.',
          alreadyTakenText: 'Люк відкритий і порожній. Службовий ключ уже в інвентарі.',
        },
        {
          id: 'hs-sprechstelle',
          label: 'Панель зв’язку Sprechstelle',
          x: 16,
          y: 47,
          type: 'transition',
          title: 'Панель зв’язку Sprechstelle',
          description:
            'Аварійний переговорний пристрій біля червоних дверей. Щоб активувати сервісний режим і відкрити міжвагонний замок, потрібен службовий ключ.',
          requiredItemId: 'service_key',
          lockedHint: 'Панель заблокована тригранним замком. Потрібен «Службовий ключ».',
          targetSceneId: 'scene-2-split',
        },
      ],
    },
    'scene-2-split': {
      id: 'scene-2-split',
      title: 'Розділені вагони S2',
      mode: 'split',
      task: 'Скоординуватися по рації та відкрити аварійні двері разом.',
      taskByRole: {
        p1: 'Продиктуй код з табло партнеру по рації та передай запобіжник через шлюз.',
        p2: 'Дізнайся 4-значний код у партнера по рації та отримай запобіжник через шлюз.',
      },
      viewsByRole: {
        p1: {
          backgroundUrl: '/assets/scene2-p1.jpg',
          illustrationId: 'scene2-p1',
          locationLabel: 'Вагон Б',
        },
        p2: {
          backgroundUrl: '/assets/scene2-p2.jpg',
          illustrationId: 'scene2-p2',
          locationLabel: 'Тамбур А',
        },
      },
      hotspots: [
        // =====================================================
        // Player 1 (Юяся, Carriage B / Вагон Б) — STRICT ASYMMETRY
        // =====================================================
        {
          id: 'hs-overhead-display',
          label: 'Табло S-Bahn',
          role: 'p1',
          x: 48,
          y: 23,
          type: 'led_display',
          title: 'Інформаційне табло маршруту S2',
          description:
            'Табло мерехтить у діагностичному режимі. Продиктуйте ці чотири цифри партнеру по рації для боксу NOTBREMSE!',
          ledEntries: [
            { station: 'S2', digit: '4' },
            { station: 'Beutelsbach', digit: '7' },
            { station: 'Filderstadt', digit: '1' },
            { station: 'Stuttgart', digit: '9' },
          ],
        },
        {
          id: 'hs-luggage-rack',
          label: 'Багажна полиця',
          role: 'p1',
          x: 24,
          y: 35,
          type: 'pickup',
          title: 'Багажна полиця над сидіннями',
          description:
            'За решіткою багажної полиці лежить запасний силовий «Запобіжник 32A»! Візьміть його та передайте партнеру через «Шлюз передачі».',
          givesItemId: 'fuse',
          alreadyTakenText: 'На багажній полиці більше нічого немає.',
        },
        {
          id: 'hs-transfer-hatch-b',
          label: 'Шлюз передачі',
          role: 'p1',
          x: 51,
          y: 67,
          type: 'transfer_hatch',
          title: 'Шлюз передачі між вагонами',
          description:
            'Пневматичний сервісний шлюз у перегородці дозволяє передати невеликий предмет у Тамбур А.',
        },
        {
          id: 'hs-lever-b',
          label: 'Аварійний важіль Б',
          role: 'p1',
          x: 79,
          y: 53,
          type: 'coop_lever',
          title: 'Аварійний важіль дверей (Секція Б)',
          description:
            'Синхронний ручний клапан відкриття дверей. Після введення коду та встановлення запобіжника у Тамбурі А тримайте важелі разом протягом 3 секунд!',
          leverLabel: 'ВАЖІЛЬ Б · ТРИМАЙ!',
          requiredFlags: ['keypad_unlocked', 'fuse_inserted'],
        },

        // =====================================================
        // Player 2 (Сясюня, Vestibule A / Тамбур А) — ZERO CODE LEAKS
        // =====================================================
        {
          id: 'hs-notbremse-keypad',
          label: 'Бокс NOTBREMSE',
          role: 'p2',
          x: 31,
          y: 48,
          type: 'keypad',
          title: 'Аварійний бокс NOTBREMSE',
          description:
            'Червоний захисний бокс вимагає 4-значний код розблокування. Дізнайтеся цифри у партнера по рації.',
          keypadCode: '4719',
          keypadLabel: 'NOTBREMSE · ВВЕДІТЬ КОД',
          unlockedText: 'Код прийнято! Електронний замок аварійного контуру розблоковано.',
        },
        {
          id: 'hs-fuse-panel',
          label: 'Щиток SICHERUNG 32A',
          role: 'p2',
          x: 56,
          y: 54,
          type: 'fuse_slot',
          title: 'Щиток живлення SICHERUNG 32A',
          description:
            'У тримачі бракує головного запобіжника на 32А. Отримайте запобіжник від партнера через «Шлюз передачі» та вставте його сюди.',
          requiredItemId: 'fuse',
          lockedHint:
            'Гніздо порожнє. Потрібен «Запобіжник 32A» — отримайте його через «Шлюз передачі» зліва.',
          unlockedText: 'Запобіжник 32A встановлено! Живлення аварійних важелів відновлено.',
        },
        {
          id: 'hs-transfer-hatch-a',
          label: 'Шлюз передачі',
          role: 'p2',
          x: 9,
          y: 69,
          type: 'transfer_hatch',
          title: 'Шлюз передачі між вагонами',
          description:
            'Пневматичний сервісний шлюз із сусіднього вагона. Коли партнер покладе предмет, ви зможете забрати його тут.',
        },
        {
          id: 'hs-lever-a',
          label: 'Аварійний важіль А',
          role: 'p2',
          x: 78,
          y: 52,
          type: 'coop_lever',
          title: 'Аварійний важіль дверей (Секція А)',
          description:
            'Щоб скинути тиск у дверях, обидва гравці повинні одночасно натиснути й утримувати свої важелі протягом 3 секунд.',
          leverLabel: 'ВАЖІЛЬ А · ТРИМАЙ!',
          requiredFlags: ['keypad_unlocked', 'fuse_inserted'],
        },
      ],
    },
  },
  victory: {
    title: 'Двері відчинено! Ви на пероні!',
    subtitle: 'Останній рейс S2 позаду · Нічний Штутгарт зустрічає прохолодою',
    dialogue: [],
    choices: [
      {
        id: 'walk-dark',
        label: 'Йти пішки по темряві',
        subtitle: 'Прогулянка нічним Штутгартом під світлом ліхтариків',
        epilogue: [],
      },
      {
        id: 'wait-bus',
        label: 'Чекати на Ersatzverkehr (автобус)',
        subtitle: 'Довіритися легендарному замісному автобусу DB',
        epilogue: [],
      },
    ],
  },
};

export const QUESTS_REGISTRY: Record<string, QuestConfig> = {
  [PILOT_QUEST_S2.id]: PILOT_QUEST_S2,
};
