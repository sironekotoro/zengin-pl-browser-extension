import type { StorageArea } from '../shared/pendingSearch';
import { setPendingSearchTerm } from '../shared/pendingSearch';

export const SEARCH_MENU_ID = 'zengin-search-selection';
export const SEARCH_MENU_TITLE = '銀行・支店コードを検索';

export interface MenuApi {
  contextMenus: {
    removeAll(): Promise<void>;
    create(props: { id: string; title: string; contexts: string[] }): unknown;
  };
  windows: {
    create(props: { url: string; type: string; width: number; height: number }): Promise<unknown>;
  };
  runtime: {
    getURL(path: string): string;
  };
}

export interface MenuClickInfo {
  menuItemId: string | number;
  selectionText?: string;
}

/**
 * 「銀行・支店コードを検索」コンテキストメニューを登録する。
 * contexts: ['selection'] のため、Webページ上で文字列が選択されている時だけ表示される。
 */
export async function registerContextMenu(api: MenuApi): Promise<void> {
  await api.contextMenus.removeAll();
  api.contextMenus.create({
    id: SEARCH_MENU_ID,
    title: SEARCH_MENU_TITLE,
    contexts: ['selection'],
  });
}

/**
 * メニュークリック時のハンドラ。選択文字列を一時保存し、拡張機能の検索画面を
 * 独立したウィンドウとして開く(ツールバーのポップアップを強制的に開く方式には依存しない)。
 * ここではAPIへの通信は一切行わない。
 */
export async function handleMenuClick(
  api: MenuApi,
  storage: StorageArea,
  info: MenuClickInfo,
): Promise<void> {
  if (info.menuItemId !== SEARCH_MENU_ID) return;
  const selection = info.selectionText;
  if (!selection || !selection.trim()) return;

  await setPendingSearchTerm(selection, storage);
  await api.windows.create({
    url: api.runtime.getURL('popup.html'),
    type: 'popup',
    width: 420,
    height: 640,
  });
}
