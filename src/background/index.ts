import browser from 'webextension-polyfill';
import {
  handleMenuClick,
  registerContextMenu,
  type ContextMenuApi,
  type MenuClickInfo,
} from './contextMenu';
import {
  handleSearchWindowRemoved,
  openOrFocusSearchWindow,
  type WindowManagerApi,
  type WindowTracker,
} from './searchWindow';

// webextension-polyfill の型はより厳密(リテラル型)なため、
// このファイル固有の橋渡しとして最小限のインターフェースへ適合させる。
const contextMenuApi: ContextMenuApi = {
  contextMenus: {
    removeAll: () => browser.contextMenus.removeAll(),
    create: (props) => browser.contextMenus.create({ ...props, contexts: ['selection'] }),
  },
};

const windowApi: WindowManagerApi = {
  windows: {
    create: (props) => browser.windows.create({ ...props, type: 'popup' }),
    update: (windowId, updateInfo) => browser.windows.update(windowId, updateInfo),
    getLastFocused: (getInfo) => browser.windows.getLastFocused(getInfo as never),
  },
  runtime: {
    getURL: (path) => browser.runtime.getURL(path),
    sendMessage: (message) => browser.runtime.sendMessage(message),
  },
};

const tracker: WindowTracker = { windowId: undefined };

browser.runtime.onInstalled.addListener(() => {
  void registerContextMenu(contextMenuApi);
});

browser.contextMenus.onClicked.addListener((info) => {
  void handleMenuClick(windowApi, tracker, browser.storage.local, info as MenuClickInfo);
});

// default_popup を設定していないため、アイコンクリックでこのハンドラが発火する。
// コンテキストメニューと同じ「使い回し可能な検索ウィンドウ」を開く。
browser.action.onClicked.addListener(() => {
  void openOrFocusSearchWindow(windowApi, tracker);
});

browser.windows.onRemoved.addListener((windowId) => {
  handleSearchWindowRemoved(tracker, windowId);
});
