import browser from 'webextension-polyfill';
import { handleMenuClick, registerContextMenu, type MenuApi, type MenuClickInfo } from './contextMenu';

// webextension-polyfill の型はより厳密(リテラル型)なため、
// このファイル固有の橋渡しとして最小限のインターフェースへ適合させる。
const menuApi: MenuApi = {
  contextMenus: {
    removeAll: () => browser.contextMenus.removeAll(),
    create: (props) => browser.contextMenus.create({ ...props, contexts: ['selection'] }),
  },
  windows: {
    create: (props) => browser.windows.create({ ...props, type: 'popup' }),
  },
  runtime: {
    getURL: (path) => browser.runtime.getURL(path),
  },
};

browser.runtime.onInstalled.addListener(() => {
  void registerContextMenu(menuApi);
});

browser.contextMenus.onClicked.addListener((info) => {
  void handleMenuClick(menuApi, browser.storage.local, info as MenuClickInfo);
});
