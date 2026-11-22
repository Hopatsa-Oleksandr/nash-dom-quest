import { PlayerGender, PlayerRole } from '../types/game';

/**
 * Selects the grammatically correct Ukrainian word form based on player gender.
 */
export function g(gender: PlayerGender, male: string, female: string): string {
  return gender === 'f' ? female : male;
}

export function getGenderLabel(gender: PlayerGender): string {
  return gender === 'f' ? 'Жінка' : 'Чоловік';
}

export function getQuickRadioPings(partnerGender: PlayerGender): string[] {
  return [
    'Прийом! Чуєш мене?',
    'Передаю предмет у шлюз!',
    'Який 4-значний код на табло?',
    'Продиктуй статус електрощита (помилка, тиск, фаза)!',
    `${g(partnerGender, 'Готовий', 'Готова')}? Тримаємо аварійні важелі разом!`,
  ];
}

export function buildTransitionNarration(
  playerNames: Record<PlayerRole, string>,
  playerGenders: Record<PlayerRole, PlayerGender>
): string {
  const p2Action = g(playerGenders.p2, 'залишився', 'залишилася');
  const p1Action = g(playerGenders.p1, 'опинився', 'опинилася');
  return `Панель пікнула, пролунав хрипкий сигнал тривоги — і важкі червоні міжвагонні двері з гуркотом зачинилися прямо між вами! ${playerNames.p2} ${p2Action} у Тамбурі А з «Кусачками» біля боксу NOTBREMSE, а ${playerNames.p1} ${p1Action} у сусідньому Вагоні Б.`;
}
