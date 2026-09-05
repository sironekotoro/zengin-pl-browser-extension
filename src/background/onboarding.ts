export const ONBOARDING_PAGE = 'onboarding.html';

export interface OnboardingApi {
  tabs: {
    create(props: { url: string }): Promise<unknown>;
  };
  runtime: {
    getURL(path: string): string;
  };
}

/**
 * 初回インストール時のみ、ツールバーへのピン留め方法などを案内するページを開く。
 * (Chromeには拡張機能が自らツールバーにピン留めするAPIが存在しないため、
 * 手順を案内するページを表示することで対応する。Firefoxは既定でツールバーに
 * 追加されるため必須ではないが、同じ案内を表示しても害はない。)
 * アップデートやブラウザ更新時(reasonが'install'以外)には表示しない。
 */
export async function maybeShowOnboarding(api: OnboardingApi, reason: string): Promise<void> {
  if (reason !== 'install') return;
  await api.tabs.create({ url: api.runtime.getURL(ONBOARDING_PAGE) });
}
