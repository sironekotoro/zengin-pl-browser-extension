import { describe, expect, it, vi } from 'vitest';
import { ONBOARDING_PAGE, maybeShowOnboarding, type OnboardingApi } from './onboarding';

function createFakeApi(): OnboardingApi {
  return {
    tabs: { create: vi.fn().mockResolvedValue(undefined) },
    runtime: { getURL: vi.fn((path: string) => `moz-extension://fake-id/${path}`) },
  };
}

describe('maybeShowOnboarding', () => {
  it('新規インストール時は案内ページを開く', async () => {
    const api = createFakeApi();
    await maybeShowOnboarding(api, 'install');

    expect(api.tabs.create).toHaveBeenCalledOnce();
    expect(api.tabs.create).toHaveBeenCalledWith({
      url: `moz-extension://fake-id/${ONBOARDING_PAGE}`,
    });
  });

  it('アップデート時は案内ページを開かない', async () => {
    const api = createFakeApi();
    await maybeShowOnboarding(api, 'update');
    expect(api.tabs.create).not.toHaveBeenCalled();
  });

  it('ブラウザ更新時は案内ページを開かない', async () => {
    const api = createFakeApi();
    await maybeShowOnboarding(api, 'browser_update');
    expect(api.tabs.create).not.toHaveBeenCalled();
  });

  it('shared_module_update時は案内ページを開かない', async () => {
    const api = createFakeApi();
    await maybeShowOnboarding(api, 'shared_module_update');
    expect(api.tabs.create).not.toHaveBeenCalled();
  });
});
