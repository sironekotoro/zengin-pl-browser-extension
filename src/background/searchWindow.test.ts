import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_SEARCH_WINDOW_HEIGHT,
  MAX_SEARCH_WINDOW_HEIGHT,
  MIN_SEARCH_WINDOW_HEIGHT,
  SEARCH_WINDOW_WIDTH,
  handleSearchWindowRemoved,
  openOrFocusSearchWindow,
  type WindowManagerApi,
  type WindowTracker,
} from './searchWindow';
import { SEED_SEARCH_MESSAGE } from '../shared/messages';

function createFakeApi(overrides: Partial<WindowManagerApi> = {}): WindowManagerApi {
  return {
    windows: {
      create: vi.fn().mockResolvedValue({ id: 42 }),
      update: vi.fn().mockResolvedValue(undefined),
      getLastFocused: vi.fn().mockResolvedValue({ height: 800 }),
      ...overrides.windows,
    },
    runtime: {
      getURL: vi.fn((path: string) => `moz-extension://fake-id/${path}`),
      sendMessage: vi.fn().mockResolvedValue(undefined),
      ...overrides.runtime,
    },
  };
}

describe('openOrFocusSearchWindow', () => {
  let tracker: WindowTracker;

  beforeEach(() => {
    tracker = { windowId: undefined };
  });

  it('未追跡の場合は新しいウィンドウを作成し、IDを記録する', async () => {
    const api = createFakeApi();
    await openOrFocusSearchWindow(api, tracker);

    expect(api.windows.create).toHaveBeenCalledOnce();
    expect(api.windows.create).toHaveBeenCalledWith({
      url: 'moz-extension://fake-id/popup.html',
      type: 'normal',
      width: SEARCH_WINDOW_WIDTH,
      height: 800,
    });
    expect(tracker.windowId).toBe(42);
  });

  it('現在の画面の高さを超えないようMAXでクランプする', async () => {
    const api = createFakeApi({
      windows: { getLastFocused: vi.fn().mockResolvedValue({ height: 5000 }) } as never,
    });
    await openOrFocusSearchWindow(api, tracker);
    expect(api.windows.create).toHaveBeenCalledWith(
      expect.objectContaining({ height: MAX_SEARCH_WINDOW_HEIGHT }),
    );
  });

  it('高さが小さすぎる場合はMINでクランプする', async () => {
    const api = createFakeApi({
      windows: { getLastFocused: vi.fn().mockResolvedValue({ height: 100 }) } as never,
    });
    await openOrFocusSearchWindow(api, tracker);
    expect(api.windows.create).toHaveBeenCalledWith(
      expect.objectContaining({ height: MIN_SEARCH_WINDOW_HEIGHT }),
    );
  });

  it('高さが取得できない場合は既定値を使う', async () => {
    const api = createFakeApi({
      windows: { getLastFocused: vi.fn().mockRejectedValue(new Error('unsupported')) } as never,
    });
    await openOrFocusSearchWindow(api, tracker);
    expect(api.windows.create).toHaveBeenCalledWith(
      expect.objectContaining({ height: DEFAULT_SEARCH_WINDOW_HEIGHT }),
    );
  });

  it('既にウィンドウが開いている場合は新規作成せずフォーカスするだけ', async () => {
    tracker.windowId = 7;
    const api = createFakeApi();

    await openOrFocusSearchWindow(api, tracker);

    expect(api.windows.update).toHaveBeenCalledOnce();
    expect(api.windows.update).toHaveBeenCalledWith(7, { focused: true });
    expect(api.windows.create).not.toHaveBeenCalled();
  });

  it('既存ウィンドウ再利用時、検索語があればメッセージで伝える', async () => {
    tracker.windowId = 7;
    const api = createFakeApi();

    await openOrFocusSearchWindow(api, tracker, 'みずほ銀行');

    expect(api.runtime.sendMessage).toHaveBeenCalledOnce();
    expect(api.runtime.sendMessage).toHaveBeenCalledWith({
      type: SEED_SEARCH_MESSAGE,
      term: 'みずほ銀行',
    });
  });

  it('検索語がなければメッセージを送らない', async () => {
    tracker.windowId = 7;
    const api = createFakeApi();

    await openOrFocusSearchWindow(api, tracker);

    expect(api.runtime.sendMessage).not.toHaveBeenCalled();
  });

  it('追跡していたウィンドウが既に閉じられていた場合は新規作成にフォールバックする', async () => {
    tracker.windowId = 7;
    const api = createFakeApi({
      windows: {
        update: vi.fn().mockRejectedValue(new Error('No window with id: 7')),
      } as never,
    });

    await openOrFocusSearchWindow(api, tracker);

    expect(api.windows.create).toHaveBeenCalledOnce();
    expect(tracker.windowId).toBe(42);
  });
});

describe('handleSearchWindowRemoved', () => {
  it('追跡中のウィンドウが閉じられたら追跡を解除する', () => {
    const tracker: WindowTracker = { windowId: 7 };
    handleSearchWindowRemoved(tracker, 7);
    expect(tracker.windowId).toBeUndefined();
  });

  it('別のウィンドウが閉じられても追跡は維持する', () => {
    const tracker: WindowTracker = { windowId: 7 };
    handleSearchWindowRemoved(tracker, 99);
    expect(tracker.windowId).toBe(7);
  });
});
