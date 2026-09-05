import browser from 'webextension-polyfill';
import { maybeShowOnboarding, type OnboardingApi } from './onboarding';
import {
  handleSearchWindowRemoved,
  openOrFocusSearchWindow,
  type WindowManagerApi,
  type WindowTracker,
} from './searchWindow';

// webextension-polyfill の型はより厳密(リテラル型)なため、
// このファイル固有の橋渡しとして最小限のインターフェースへ適合させる。
const windowApi: WindowManagerApi = {
  windows: {
    create: (props) => browser.windows.create(props as never),
    update: (windowId, updateInfo) => browser.windows.update(windowId, updateInfo),
    getLastFocused: (getInfo) => browser.windows.getLastFocused(getInfo as never),
  },
  runtime: {
    getURL: (path) => browser.runtime.getURL(path),
  },
};

const onboardingApi: OnboardingApi = {
  tabs: { create: (props) => browser.tabs.create(props) },
  runtime: { getURL: (path) => browser.runtime.getURL(path) },
};

const tracker: WindowTracker = { windowId: undefined };

browser.runtime.onInstalled.addListener((details) => {
  void maybeShowOnboarding(onboardingApi, details.reason);
});

// default_popup を設定していないため、アイコンクリックでこのハンドラが発火する。
// 検索画面のウィンドウを開く(既に開いていればフォーカスするだけ)。
browser.action.onClicked.addListener(() => {
  void openOrFocusSearchWindow(windowApi, tracker);
});

browser.windows.onRemoved.addListener((windowId) => {
  handleSearchWindowRemoved(tracker, windowId);
});
