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
    'Подивись сюди!',
    'Який код на табло?',
    'Передаю предмет у шлюз!',
    `${g(partnerGender, 'Готовий', 'Готова')}? Тримаємо важелі разом!`,
  ];
}

export function buildTransitionNarration(
  playerNames: Record<PlayerRole, string>,
  playerGenders: Record<PlayerRole, PlayerGender>
): string {
  const p2Action = g(playerGenders.p2, 'залишився', 'залишилася');
  const p1Action = g(playerGenders.p1, 'опинився', 'опинилася');
  return `Панель пікнула, пролунав хрипкий сигнал тривоги — і важкі червоні міжвагонні двері з гуркотом зачинилися прямо між вами! ${playerNames.p2} ${p2Action} у Тамбурі А біля щитка NOTBREMSE, а ${playerNames.p1} ${p1Action} у сусідньому Вагоні Б.`;
}
