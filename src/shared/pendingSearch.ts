export const PENDING_SEARCH_KEY = 'pendingSearchTerm';
export const MAX_PENDING_SEARCH_LENGTH = 500;

export interface StorageArea {
  get(keys: string | string[] | null): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
}

/**
 * 右クリック検索で選択した文字列を、ポップアップが読み取るまでの間だけ一時保存する。
 * ここで保存された値がユーザーの確認なしにAPIへ送信されることはない
 * (ポップアップ側で検索欄に反映されるだけで、検索の実行にはユーザーの操作が必要)。
 */
export async function setPendingSearchTerm(term: string, storage: StorageArea): Promise<void> {
  const trimmed = term.trim().slice(0, MAX_PENDING_SEARCH_LENGTH);
  if (!trimmed) return;
  await storage.set({ [PENDING_SEARCH_KEY]: trimmed });
}

/**
 * 保存されている検索語を取得し、取得と同時に削除する(一度だけ引き継ぐ)。
 */
export async function takePendingSearchTerm(storage: StorageArea): Promise<string | null> {
  const stored = await storage.get(PENDING_SEARCH_KEY);
  const value = stored[PENDING_SEARCH_KEY];
  if (typeof value !== 'string' || value.length === 0) return null;
  await storage.remove(PENDING_SEARCH_KEY);
  return value;
}
