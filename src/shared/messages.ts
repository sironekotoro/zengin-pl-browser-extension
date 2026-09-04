// 検索画面(popup.html)を再利用(フォーカスするだけ)した際に、
// 右クリック検索で選択した新しい文字列を既に開いている画面へ伝えるためのメッセージ。
export const SEED_SEARCH_MESSAGE = 'zengin:seed-search' as const;

export interface SeedSearchMessage {
  type: typeof SEED_SEARCH_MESSAGE;
  term: string;
}

export function isSeedSearchMessage(value: unknown): value is SeedSearchMessage {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { type?: unknown; term?: unknown };
  return candidate.type === SEED_SEARCH_MESSAGE && typeof candidate.term === 'string';
}
