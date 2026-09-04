import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SEARCH_MENU_ID,
  handleMenuClick,
  registerContextMenu,
  type ContextMenuApi,
} from './contextMenu';
import type { WindowManagerApi, WindowTracker } from './searchWindow';
import type { StorageArea } from '../shared/pendingSearch';
import { PENDING_SEARCH_KEY } from '../shared/pendingSearch';

function createFakeContextMenuApi(): ContextMenuApi {
  return {
    contextMenus: {
      removeAll: vi.fn().mockResolvedValue(undefined),
      create: vi.fn(),
    },
  };
}

function createFakeWindowApi(): WindowManagerApi {
  return {
    windows: {
      create: vi.fn().mockResolvedValue({ id: 1 }),
      update: vi.fn().mockResolvedValue(undefined),
      getLastFocused: vi.fn().mockResolvedValue({ height: 800 }),
    },
    runtime: {
      getURL: vi.fn((path: string) => `moz-extension://fake-id/${path}`),
      sendMessage: vi.fn().mockResolvedValue(undefined),
    },
  };
}

function createFakeStorage(): StorageArea {
  const data: Record<string, unknown> = {};
  return {
    get: vi.fn(async (keys) => {
      const list = Array.isArray(keys) ? keys : [keys];
      const result: Record<string, unknown> = {};
      for (const key of list) if (key && key in data) result[key] = data[key];
      return result;
    }),
    set: vi.fn(async (items) => {
      Object.assign(data, items);
    }),
    remove: vi.fn(async (keys) => {
      const list = Array.isArray(keys) ? keys : [keys];
      for (const key of list) delete data[key];
    }),
  };
}

describe('registerContextMenu', () => {
  it('既存メニューを削除してから選択専用メニューを1件登録する', async () => {
    const api = createFakeContextMenuApi();
    await registerContextMenu(api);

    expect(api.contextMenus.removeAll).toHaveBeenCalledOnce();
    expect(api.contextMenus.create).toHaveBeenCalledOnce();
    expect(api.contextMenus.create).toHaveBeenCalledWith({
      id: SEARCH_MENU_ID,
      title: '銀行・支店コードを検索',
      contexts: ['selection'],
    });
  });
});

describe('handleMenuClick', () => {
  let windowApi: WindowManagerApi;
  let tracker: WindowTracker;
  let storage: StorageArea;

  beforeEach(() => {
    windowApi = createFakeWindowApi();
    tracker = { windowId: undefined };
    storage = createFakeStorage();
  });

  it('対象メニューのクリックで選択文字列を保存し、検索画面のウィンドウを開く', async () => {
    await handleMenuClick(windowApi, tracker, storage, {
      menuItemId: SEARCH_MENU_ID,
      selectionText: 'みずほ銀行',
    });

    await expect(storage.get(PENDING_SEARCH_KEY)).resolves.toEqual({
      [PENDING_SEARCH_KEY]: 'みずほ銀行',
    });
    expect(windowApi.windows.create).toHaveBeenCalledOnce();
    expect(windowApi.windows.create).toHaveBeenCalledWith({
      url: 'moz-extension://fake-id/popup.html',
      type: 'popup',
      width: expect.any(Number),
      height: expect.any(Number),
    });
  });

  it('既に検索ウィンドウが開いている場合は新規作成せず、選択文字列をメッセージで伝える', async () => {
    tracker.windowId = 5;

    await handleMenuClick(windowApi, tracker, storage, {
      menuItemId: SEARCH_MENU_ID,
      selectionText: 'みずほ銀行',
    });

    expect(windowApi.windows.create).not.toHaveBeenCalled();
    expect(windowApi.windows.update).toHaveBeenCalledWith(5, { focused: true });
    expect(windowApi.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'zengin:seed-search',
      term: 'みずほ銀行',
    });
  });

  it('対象外のメニューIDでは何もしない', async () => {
    await handleMenuClick(windowApi, tracker, storage, {
      menuItemId: 'other-menu',
      selectionText: 'みずほ銀行',
    });

    expect(windowApi.windows.create).not.toHaveBeenCalled();
    await expect(storage.get(PENDING_SEARCH_KEY)).resolves.toEqual({});
  });

  it('選択文字列が空の場合は何もしない', async () => {
    await handleMenuClick(windowApi, tracker, storage, {
      menuItemId: SEARCH_MENU_ID,
      selectionText: '   ',
    });

    expect(windowApi.windows.create).not.toHaveBeenCalled();
  });

  it('選択文字列が未定義の場合は何もしない', async () => {
    await handleMenuClick(windowApi, tracker, storage, { menuItemId: SEARCH_MENU_ID });

    expect(windowApi.windows.create).not.toHaveBeenCalled();
  });

  it('選択文字列をAPIへ直接送信することはない(ウィンドウを開くだけ)', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    await handleMenuClick(windowApi, tracker, storage, {
      menuItemId: SEARCH_MENU_ID,
      selectionText: '東京都庁',
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
