import { SEED_SEARCH_MESSAGE, type SeedSearchMessage } from '../shared/messages';

export const SEARCH_WINDOW_WIDTH = 440;
export const DEFAULT_SEARCH_WINDOW_HEIGHT = 720;
export const MAX_SEARCH_WINDOW_HEIGHT = 900;
export const MIN_SEARCH_WINDOW_HEIGHT = 480;

/** 検索ウィンドウのIDを保持する。単純なオブジェクトにすることでテスト時に注入できる。 */
export interface WindowTracker {
  windowId: number | undefined;
}

export interface WindowManagerApi {
  windows: {
    create(props: {
      url: string;
      type: string;
      width: number;
      height: number;
    }): Promise<{ id?: number }>;
    update(windowId: number, updateInfo: { focused: boolean }): Promise<unknown>;
    getLastFocused(getInfo: { windowTypes: string[] }): Promise<{ height?: number }>;
  };
  runtime: {
    getURL(path: string): string;
    sendMessage(message: SeedSearchMessage): Promise<unknown>;
  };
}

function clampHeight(height: number | undefined): number {
  if (!height) return DEFAULT_SEARCH_WINDOW_HEIGHT;
  return Math.min(MAX_SEARCH_WINDOW_HEIGHT, Math.max(MIN_SEARCH_WINDOW_HEIGHT, height));
}

/**
 * 検索画面のウィンドウを開く。
 * 既に開いている場合は新しく作らずフォーカスするだけにする(重複ウィンドウの増殖を防ぐ)。
 * 右クリック検索から呼ばれ、かつ既存ウィンドウを再利用した場合は、
 * popup.html側がストレージを再読込しない(初期化処理が再実行されない)ため、
 * runtime.sendMessage で新しい検索語を伝える。
 */
export async function openOrFocusSearchWindow(
  api: WindowManagerApi,
  tracker: WindowTracker,
  seedTerm?: string,
): Promise<void> {
  if (tracker.windowId !== undefined) {
    try {
      await api.windows.update(tracker.windowId, { focused: true });
      if (seedTerm) {
        const message: SeedSearchMessage = { type: SEED_SEARCH_MESSAGE, term: seedTerm };
        await api.runtime.sendMessage(message).catch(() => undefined);
      }
      return;
    } catch {
      // ウィンドウが既に閉じられている等。新規作成にフォールバックする。
      tracker.windowId = undefined;
    }
  }

  let height = DEFAULT_SEARCH_WINDOW_HEIGHT;
  try {
    const lastFocused = await api.windows.getLastFocused({ windowTypes: ['normal'] });
    height = clampHeight(lastFocused.height);
  } catch {
    // 取得できない場合は既定値を使う。
  }

  const win = await api.windows.create({
    url: api.runtime.getURL('popup.html'),
    type: 'popup',
    width: SEARCH_WINDOW_WIDTH,
    height,
  });
  tracker.windowId = win.id;
}

/** 追跡していたウィンドウが閉じられた際に呼び出す。 */
export function handleSearchWindowRemoved(tracker: WindowTracker, windowId: number): void {
  if (tracker.windowId === windowId) {
    tracker.windowId = undefined;
  }
}
