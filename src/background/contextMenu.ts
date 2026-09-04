import type { StorageArea } from '../shared/pendingSearch';
import { setPendingSearchTerm } from '../shared/pendingSearch';
import { openOrFocusSearchWindow, type WindowManagerApi, type WindowTracker } from './searchWindow';

export const SEARCH_MENU_ID = 'zengin-search-selection';
export const SEARCH_MENU_TITLE = '銀行・支店コードを検索';

export interface ContextMenuApi {
  contextMenus: {
    removeAll(): Promise<void>;
    create(props: { id: string; title: string; contexts: string[] }): unknown;
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
export async function registerContextMenu(api: ContextMenuApi): Promise<void> {
  await api.contextMenus.removeAll();
  api.contextMenus.create({
    id: SEARCH_MENU_ID,
    title: SEARCH_MENU_TITLE,
    contexts: ['selection'],
  });
}

/**
 * メニュークリック時のハンドラ。選択文字列を一時保存し、検索画面のウィンドウを
 * 開く(既に開いていればフォーカスするだけ)。ここではAPIへの通信は一切行わない。
 */
export async function handleMenuClick(
  windowApi: WindowManagerApi,
  tracker: WindowTracker,
  storage: StorageArea,
  info: MenuClickInfo,
): Promise<void> {
  if (info.menuItemId !== SEARCH_MENU_ID) return;
  const selection = info.selectionText?.trim();
  if (!selection) return;

  await setPendingSearchTerm(selection, storage);
  await openOrFocusSearchWindow(windowApi, tracker, selection);
}
