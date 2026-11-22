import { QuestConfig } from '../types/game';

export const PILOT_QUEST_S2: QuestConfig = {
  id: 'stuttgart-s2-last-train',
  title: 'Останній рейс S2 (Stuttgart)',
  subtitle: '4-актна кооперативна пригода у нічному вагоні S-Bahn',
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
    wire_cutters: {
      id: 'wire_cutters',
      name: 'Кусачки',
      shortName: 'Кусачки',
      description: 'Ізольовані сталеві кусачки DB. Легко переріжуть товсту металеву стяжку або дріт.',
      icon: 'wire_cutters',
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
      title: 'Акт 1 · Спільний вагон S2',
      mode: 'shared',
      task: 'Акт 1 · Знайдіть PIN-код від смартфона провідника, відкрийте люк і розблокуйте Sprechstelle.',
      sharedView: {
        backgroundUrl: '/assets/scene1.jpg',
        illustrationId: 'scene1-shared',
        locationLabel: 'Вагон 07 · Спільний огляд',
      },
      hotspots: [
        {
          id: 'hs-route-board',
          label: 'Маршрутне табло над вікном',
          x: 52,
          y: 19,
          type: 'clue_inspect',
          title: 'Маршрутне табло над вікном',
          description:
            'Над вікном висить інформаційна панель рейсу з зафіксованим часом аварійної зупинки.',
          clueBadge: 'S-BAHN STUTTGART · МАРШРУТ',
          clueDisplay: 'Лінія S2 · Аварійна зупинка о 23:40',
          clueHintText: 'Підказка до PIN-коду: перші 2 цифри — година зупинки.',
        },
        {
          id: 'hs-carriage-plate',
          label: 'Табличка номера вагона',
          x: 25,
          y: 31,
          type: 'clue_inspect',
          title: 'Заводська табличка біля дверей',
          description:
            'Над червоними дверима приклепана металева сервісна табличка Deutsche Bahn.',
          clueBadge: 'DEUTSCHE BAHN · ТАБЛИЧКА',
          clueDisplay: 'Wagen Nr. 07 · BR 430 (Stuttgart)',
          clueHintText: 'Підказка до PIN-коду: останні 2 цифри — номер вагона.',
        },
        {
          id: 'hs-smartphone',
          label: 'Забутий смартфон',
          x: 34,
          y: 62,
          type: 'phone_pin',
          pinCode: '2307',
          pinHintText: 'Підказка: огляньте маршрутне табло над вікном та табличку біля дверей.',
          title: 'Забутий смартфон провідника',
          description:
            'Екран захищено 4-значним PIN-кодом. Зверху мерехтить сповіщення про термінове SMS від провідника.',
          noteSender: 'Провідник S-Bahn · S2',
          noteTime: '23:41',
          noteText:
            'Викрутка в смітнику. Люк під сидінням на кодовому замку — слово з трьох символів (назва лінії + перша літера Штутгарта).',
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
          type: 'hatch_combo',
          title: 'Кодовий люк під правим сидінням',
          description:
            'Металева технічна кришка закручена на 4 гвинти й додатково заблокована 3-символьним сервісним замком.',
          requiredItemId: 'screwdriver',
          comboCode: 'S2S',
          comboPlaceholder: '3 символи (напр. A1B)',
          comboHintText: 'Підказка з SMS: назва лінії + перша латинська літера назви Штутгарта.',
          lockedHint: 'Люк закручений на 4 гвинти. Голими руками не відкрити — потрібна «Викрутка».',
          givesItemIds: ['service_key', 'wire_cutters'],
          unlockedText:
            'Гвинти відкручено, кодовий замок клацнув! Всередині лежали «Службовий ключ» та сталеві «Кусачки».',
          alreadyTakenText: 'Люк відкритий і порожній. Обидва інструменти вже забрано.',
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
      task: 'Скоординуватися по рації та пройти аварійний протокол евакуації.',
      taskByRole: {
        p1: 'Отримай кусачки через шлюз, зніми запобіжник 32A і передай партнеру. Розшифруй код на табло.',
        p2: 'Передай кусачки через шлюз, введи 4-значний код від партнера та встав запобіжник 32A.',
      },
      taskByActAndRole: {
        2: {
          p1: 'Акт 2 · Отримай «Кусачки» через шлюз, зніми «Запобіжник 32A» і передай його назад. Продиктуй код із табло.',
          p2: 'Акт 2 · Передай «Кусачки» у шлюз, дізнайся 4-значний код по рації та встав «Запобіжник 32A» у щиток.',
        },
        3: {
          p1: 'Акт 3 · Відкрий «Інструкцію DB Notfall-Handbuch» і допоможи партнеру виставити правильний порядок 4 тумблерів.',
          p2: 'Акт 3 · Продиктуй статус «Електрощита розблокування» по рації та натисни 4 тумблери за інструкцією DB.',
        },
        4: {
          p1: 'Акт 4 · Усі системи готові! Одночасно натисніть і утримуйте аварійні важелі протягом 3 секунд!',
          p2: 'Акт 4 · Усі системи готові! Одночасно натисніть і утримуйте аварійні важелі протягом 3 секунд!',
        },
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
          y: 21,
          type: 'led_display',
          title: 'Діагностичне табло маршруту S2',
          description:
            'Табло мерехтить у сервісному режимі. Розгадайте 4 цифри коду по порядку та продиктуйте їх партнеру по рації для боксу NOTBREMSE!',
          ledRiddles: [
            {
              index: 1,
              question: 'Скільки проміжних станцій між Waiblingen і Beutelsbach?',
              reference: 'Маршрут S2: Waiblingen → Rommelshausen → Stetten → Endersbach → Beutelsbach',
            },
            {
              index: 2,
              question: 'Номер лінії S-Bahn Stuttgart?',
              reference: 'Рейс: S-Bahn S2 (Schorndorf ↔ Filderstadt)',
            },
            {
              index: 3,
              question: 'Остання цифра року випуску на серійній табличці?',
              reference: 'Табличка потяга: DB Regio BR 430 · Baujahr 2016',
            },
            {
              index: 4,
              question: 'Кількість аварійних дверей у вагоні?',
              reference: 'Схема безпеки вагона: Notausgang × 4 виходи',
            },
          ],
        },
        {
          id: 'hs-luggage-rack',
          label: 'Багажна полиця',
          role: 'p1',
          x: 24,
          y: 34,
          type: 'locked_container',
          title: 'Багажна полиця над сидіннями',
          description:
            'За решіткою полиці закріплений запасний силовий «Запобіжник 32A», але він міцно притягнутий товстою сталевою стяжкою.',
          requiredItemId: 'wire_cutters',
          lockedHint:
            'Запобіжник 32A затягнутий товстою сталевою стяжкою. Потрібні «Кусачки»! Попросіть партнера передати їх через «Шлюз передачі».',
          givesItemId: 'fuse',
          unlockedText:
            'Сталеву стяжку перерізано! «Запобіжник 32A» у вашому інвентарі — тепер передайте його партнеру назад через «Шлюз передачі».',
          alreadyTakenText: 'На багажній полиці більше нічого немає — стяжку перерізано, запобіжник забрано.',
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
            'Двосторонній пневматичний шлюз у перегородці. Через нього можна отримувати інструменти з Тамбура А та передавати предмети назад.',
        },
        {
          id: 'hs-db-manual',
          label: 'Інструкція DB Notfall-Handbuch',
          role: 'p1',
          x: 31,
          y: 62,
          type: 'db_manual',
          title: 'Інструкція DB Notfall-Handbuch',
          description:
            'Офіційний аварійний довідник Deutsche Bahn. Використовуйте всі три вкладки, щоб визначити точну послідовність 4 кольорових тумблерів для Тамбура А.',
          requiredFlags: ['keypad_unlocked', 'fuse_inserted'],
          lockedHint:
            'Аварійна папка DB заблокована в електронному сейфі. Спочатку завершіть Акт 2: у Тамбурі А мають ввести 4-значний код NOTBREMSE та вставити запобіжник 32A.',
          manualTabs: [
            {
              id: 'errors',
              title: 'Коди помилок',
              subtitle: 'Крок 1: визначте номер протоколу за кодом помилки на дисплеї',
              rows: [
                {
                  code: 'ПОМИЛКА A-2',
                  detail: 'Розгерметизація гальмівної магістралі',
                  highlight: '→ Протокол I',
                },
                {
                  code: 'ПОМИЛКА B-4',
                  detail: 'Збій блокування міжвагонного контуру',
                  highlight: '→ Протокол II',
                },
                {
                  code: 'ПОМИЛКА C-1',
                  detail: 'Перевантаження лінії живлення дверей',
                  highlight: '→ Протокол III',
                },
              ],
            },
            {
              id: 'switches',
              title: 'Порядок тумблерів',
              subtitle: 'Крок 2: знайдіть базову послідовність за Протоколом і рівнем Тиску',
              rows: [
                {
                  code: 'Протокол I · Тиск ЖОВТИЙ',
                  detail: 'Базова черга перемикання',
                  highlight: '1. Синій → 2. Червоний → 3. Жовтий → 4. Зелений',
                },
                {
                  code: 'Протокол II · Тиск ЗЕЛЕНИЙ',
                  detail: 'Базова черга перемикання',
                  highlight: '1. Зелений → 2. Жовтий → 3. Червоний → 4. Синій',
                },
                {
                  code: 'Протокол II · Тиск ЧЕРВОНИЙ',
                  detail: 'Базова черга перемикання',
                  highlight: '1. Жовтий → 2. Зелений → 3. Синій → 4. Червоний',
                },
                {
                  code: 'Протокол III · Тиск ЧЕРВОНИЙ',
                  detail: 'Базова черга перемикання',
                  highlight: '1. Червоний → 2. Жовтий → 3. Зелений → 4. Синій',
                },
              ],
            },
            {
              id: 'phase',
              title: 'Корекція фази',
              subtitle: 'Крок 3: застосуйте поправку залежно від активної Фази на щиті',
              rows: [
                {
                  code: 'ФАЗА 1',
                  detail: 'Номінальний режим струму',
                  highlight: 'Залишити базовий порядок без змін',
                },
                {
                  code: 'ФАЗА 2',
                  detail: 'Зсув синхронізації обмоток',
                  highlight: 'Поміняйте місцями 2-й та 3-й тумблери',
                },
                {
                  code: 'ФАЗА 3',
                  detail: 'Аварійна інверсія полярності',
                  highlight: 'Введіть порядок у зворотному напрямку (4 → 3 → 2 → 1)',
                },
              ],
            },
          ],
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
            'Синхронний ручний клапан відкриття дверей. Коли всі 3 підсистеми розблоковано, тримайте важелі разом протягом 3 секунд!',
          leverLabel: 'ВАЖІЛЬ Б · ТРИМАЙ!',
          requiredFlags: ['keypad_unlocked', 'fuse_inserted', 'protocol_solved'],
        },

        // =====================================================
        // Player 2 (Сясюня, Vestibule A / Тамбур А) — ZERO SPOILERS
        // =====================================================
        {
          id: 'hs-notbremse-keypad',
          label: 'Бокс NOTBREMSE',
          role: 'p2',
          x: 31,
          y: 47,
          type: 'keypad',
          title: 'Аварійний бокс NOTBREMSE',
          description:
            'Червоний захисний бокс вимагає 4-значний код розблокування. Дізнайтеся цифри у партнера по рації.',
          keypadCode: '3264',
          keypadLabel: 'NOTBREMSE · ВВЕДІТЬ КОД',
          unlockedText: 'Код прийнято! Електронний замок боксу NOTBREMSE розблоковано.',
        },
        {
          id: 'hs-fuse-panel',
          label: 'Щиток SICHERUNG 32A',
          role: 'p2',
          x: 56,
          y: 53,
          type: 'fuse_slot',
          title: 'Щиток живлення SICHERUNG 32A',
          description:
            'У тримачі бракує головного запобіжника на 32А. Спочатку передайте «Кусачки» партнеру, а потім отримайте «Запобіжник 32A» через «Шлюз передачі».',
          requiredItemId: 'fuse',
          lockedHint:
            'Гніздо порожнє. Потрібен «Запобіжник 32A» — передайте «Кусачки» у шлюз зліва й дочекайтеся запобіжника від партнера.',
          unlockedText: 'Запобіжник 32A встановлено! Живлення щита аварійного протоколу подано.',
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
            'Двосторонній пневматичний шлюз у перегородці. Покладіть сюди інструмент для партнера або заберіть надісланий предмет.',
        },
        {
          id: 'hs-protocol-panel',
          label: 'Електрощит розблокування',
          role: 'p2',
          x: 43,
          y: 75,
          type: 'protocol_panel',
          title: 'Електрощит розблокування (Акт 3)',
          description:
            'Аварійний протокол Deutsche Bahn. Продиктуйте партнеру статус на екрані та натисніть 4 кольорові тумблери в правильному порядку.',
          requiredFlags: ['keypad_unlocked', 'fuse_inserted'],
          lockedHint:
            'Електрощит знеструмлений. Спочатку завершіть Акт 2: введіть 4-значний код у боксі NOTBREMSE та вставте «Запобіжник 32A».',
          protocolStatus: {
            errorCode: 'B-4',
            pressure: 'ЧЕРВОНИЙ',
            phase: '2',
          },
          protocolSolution: ['yellow', 'blue', 'green', 'red'],
          unlockedText:
            'Протокол DB виконано бездоганно! Блокування знято — переходьте до синхронних аварійних важелів (Акт 4)!',
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
          requiredFlags: ['keypad_unlocked', 'fuse_inserted', 'protocol_solved'],
        },
      ],
    },
  },
  victory: {
    title: 'Двері відчинено! Ви на пероні!',
    subtitle: 'Усі 4 акти пройдено · Нічний Штутгарт зустрічає прохолодою',
    dialogue: [],
    choices: [
      {
        id: 'walk',
        label: 'Йти пішки по коліях',
        subtitle: 'Прогулянка нічним Штутгартом під світлом ліхтариків',
        epilogue: [],
      },
      {
        id: 'wait-bus',
        label: 'Чекати на Ersatzverkehr',
        subtitle: 'Довіритися легендарному замісному автобусу DB',
        epilogue: [],
      },
    ],
  },
};

export const QUESTS_REGISTRY: Record<string, QuestConfig> = {
  [PILOT_QUEST_S2.id]: PILOT_QUEST_S2,
};
