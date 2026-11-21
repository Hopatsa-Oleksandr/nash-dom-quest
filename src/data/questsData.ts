import { QuestConfig } from '../types/game';

export const PILOT_QUEST_S2: QuestConfig = {
  id: 'stuttgart-s2-last-train',
  title: 'Останній рейс S2 (Stuttgart)',
  subtitle: 'Аварійна зупинка у нічному вагоні S-Bahn',
  location: 'Штутгарт · Лінія S2',
  players: {
    p1: {
      defaultName: 'Сясюня',
      avatarUrl: '/assets/avatar-p1.png',
      accentColor: '#38bdf8',
      badgeLabel: 'Гравець 1',
    },
    p2: {
      defaultName: 'Юяся',
      avatarUrl: '/assets/avatar-p2.png',
      accentColor: '#fb7185',
      badgeLabel: 'Гравець 2',
    },
  },
  items: {
    screwdriver: {
      id: 'screwdriver',
      name: 'Викрутка',
      shortName: 'Викрутка',
      description: 'Міцна хрестова викрутка з технічного комплекту. Підійде для гвинтів під сидінням.',
      icon: 'screwdriver',
      transferable: true,
    },
    service_key: {
      id: 'service_key',
      name: 'Службовий ключ',
      shortName: 'Ключ DB',
      description: 'Тригранний службовий ключ Deutsche Bahn для панелей зв’язку та замків вагону.',
      icon: 'service_key',
      transferable: true,
    },
    fuse: {
      id: 'fuse',
      name: 'Запобіжник',
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
      task: "Знайти спосіб зв'язатися з машиністом та відкрити прохід.",
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
          description: 'Екран ще світиться. На заблокованому дисплеї видно свіже повідомлення від техніка зміни.',
          noteSender: 'Технік S-Bahn · Зміна B',
          noteTime: '23:41',
          noteText:
            'Ключ від щитка скинув у смітник біля вікна, а код — перевір табло у наступному вагоні.',
        },
        {
          id: 'hs-trashbin',
          label: 'Смітник біля вікна',
          x: 56,
          y: 59,
          type: 'pickup',
          title: 'Смітник біля вікна',
          description:
            'Ви обережно заглядаєте всередину металевого смітника під вікном. Замість ключа на дні лежить забута викрутка — схоже, ключ встиг закотитися під люк.',
          givesItemId: 'screwdriver',
          alreadyTakenText: 'У смітнику більше нічого корисного немає — лише зім’яті квитки VVS.',
        },
        {
          id: 'hs-seat-hatch',
          label: 'Люк під сидінням',
          x: 72,
          y: 78,
          type: 'locked_container',
          title: 'Технічний люк під сидінням',
          description:
            'Металева вентиляційна кришка під сидінням щільно прикручена гвинтами. Крізь отвори щось металево блищить.',
          requiredItemId: 'screwdriver',
          lockedHint: 'Кришка закручена на гвинти. Потрібна викрутка, щоб її відкрити.',
          givesItemId: 'service_key',
          unlockedText:
            'Ви відкрутили гвинти викруткою! Всередині під проводами лежав тригранний службовий ключ.',
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
          lockedHint: 'Панель заблокована тригранним замком. Знайдіть службовий ключ.',
          targetSceneId: 'scene-2-split',
          transitionNarration:
            'Панель пікнула, пролунав хрипкий сигнал тривоги — і важкі червоні міжвагонні двері з гуркотом зачинилися прямо між вами! Сясюня залишилася біля щитка NOTBREMSE, а Юяся опинилася в сусідньому вагоні.',
        },
      ],
    },
    'scene-2-split': {
      id: 'scene-2-split',
      title: 'Розділені вагони S2',
      mode: 'split',
      task: 'Відкрити аварійні двері вручну та вибратися на перон.',
      viewsByRole: {
        p1: {
          backgroundUrl: '/assets/scene2-p1.jpg',
          illustrationId: 'scene2-p1',
          locationLabel: 'Тамбур А · Сясюня',
        },
        p2: {
          backgroundUrl: '/assets/scene2-p2.jpg',
          illustrationId: 'scene2-p2',
          locationLabel: 'Сусідній вагон · Юяся',
        },
      },
      hotspots: [
        // Player 1 (Сясюня) hotspots
        {
          id: 'hs-notbremse-keypad',
          label: 'Бокс NOTBREMSE (Код)',
          role: 'p1',
          x: 31,
          y: 48,
          type: 'keypad',
          title: 'Аварійний бокс NOTBREMSE',
          description:
            'Червоний захисний бокс вимагає 4-значний код розблокування. Запитайте код по рації у Юясі — він має бути на табло в сусідньому вагоні.',
          keypadCode: '4719',
          keypadLabel: 'NOTBREMSE · ВВЕДІТЬ КОД',
          unlockedText: 'Код прийнято! Електронний замок аварійного контуру розблоковано.',
        },
        {
          id: 'hs-fuse-panel',
          label: 'Щиток запобіжників',
          role: 'p1',
          x: 56,
          y: 54,
          type: 'fuse_slot',
          title: 'Щиток аварійного живлення',
          description:
            'У тримачі бракує головного запобіжника на 32А. Попросіть Юясю знайти запобіжник у її вагоні та передати через шлюз.',
          requiredItemId: 'fuse',
          lockedHint:
            'Гніздо порожнє. Потрібен «Запобіжник» — попросіть Юясю передати його через кнопку «Передати» в інвентарі.',
          unlockedText: 'Запобіжник встановлено! Живлення аварійних важелів відновлено.',
        },
        {
          id: 'hs-lever-a',
          label: 'Аварійний важіль А',
          role: 'p1',
          x: 78,
          y: 52,
          type: 'coop_lever',
          title: 'Аварійний важіль дверей (Секція А)',
          description:
            'Щоб скинути тиск у дверях, ви і Юяся повинні одночасно натиснути й утримувати свої важелі протягом 3 секунд.',
          leverLabel: 'ВАЖІЛЬ А · ТРИМАЙ!',
          requiredFlags: ['keypad_unlocked', 'fuse_inserted'],
        },

        // Player 2 (Юяся) hotspots
        {
          id: 'hs-overhead-display',
          label: 'Табло S-Bahn',
          role: 'p2',
          x: 48,
          y: 23,
          type: 'led_display',
          title: 'Інформаційне табло маршруту S2',
          description:
            'Табло мерехтить у діагностичному режимі. Продиктуйте ці чотири цифри Сясюні по рації для боксу NOTBREMSE!',
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
          role: 'p2',
          x: 24,
          y: 35,
          type: 'pickup',
          title: 'Багажна полиця над сидіннями',
          description:
            'За решіткою багажної полиці закотився запасний силовий запобіжник! Візьміть його і натисніть «Передати» в інвентарі, щоб надіслати Сясюні.',
          givesItemId: 'fuse',
          alreadyTakenText: 'На багажній полиці більше нічого немає.',
        },
        {
          id: 'hs-lever-b',
          label: 'Аварійний важіль Б',
          role: 'p2',
          x: 79,
          y: 53,
          type: 'coop_lever',
          title: 'Аварійний важіль дверей (Секція Б)',
          description:
            'Синхронний ручний клапан відкриття дверей. Дочекайтеся, поки Сясюня введе код і вставить запобіжник, а потім тримайте важелі разом 3 секунди!',
          leverLabel: 'ВАЖІЛЬ Б · ТРИМАЙ!',
          requiredFlags: ['keypad_unlocked', 'fuse_inserted'],
        },
      ],
    },
  },
  victory: {
    title: 'Двері відчинено! Ви на пероні!',
    subtitle: 'Останній рейс S2 позаду · Нічний Штутгарт зустрічає прохолодою',
    dialogue: [
      {
        speaker: 'p1',
        text: 'Оце так «комфортна поїздка з Deutsche Bahn»! Добре, що ти не загубила той запобіжник на полиці.',
      },
      {
        speaker: 'p2',
        text: 'Ага, зате тепер ми точно знаємо код від половини потягів S2! Але дивись на табло перону — наступний потяг «орієнтовно ніколи». Що робимо?',
      },
    ],
    choices: [
      {
        id: 'walk-dark',
        label: 'Йти пішки по темряві',
        subtitle: 'Прогулянка нічним Штутгартом під світлом ліхтариків',
        epilogue: [
          {
            speaker: 'p1',
            text: 'Погнали пішки! Зате точно без затримок і раптових аварійних зупинок.',
          },
          {
            speaker: 'p2',
            text: 'Згодна! Якщо знайдемо відкриту пекарню з бретцелями — цей квест офіційно вважається ідеальним побаченням.',
          },
        ],
      },
      {
        id: 'wait-bus',
        label: 'Чекати на Ersatzverkehr (автобус)',
        subtitle: 'Довіритися легендарному замісному автобусу DB',
        epilogue: [
          {
            speaker: 'p2',
            text: 'Чекаємо на Ersatzverkehr! Там обіцяли автобус через 7 хвилин... ну, або 47.',
          },
          {
            speaker: 'p1',
            text: 'Головне, щоб двері в автобусі не довелося відкривати викруткою і кодом 4719! Ха-ха, вибираємось додому!',
          },
        ],
      },
    ],
  },
};

export const QUESTS_REGISTRY: Record<string, QuestConfig> = {
  [PILOT_QUEST_S2.id]: PILOT_QUEST_S2,
};

export const QUICK_RADIO_PINGS: string[] = [
  'Прийом! Чуєш мене?',
  'Подивись сюди!',
  'Код на табло: 4-7-1-9!',
  'Передаю запобіжник!',
  'Готова? Тримаємо важелі разом!',
];
