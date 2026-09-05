import { afterEach, describe, expect, it, vi } from 'vitest';
import { ZenginApiError, getBank, getBranch, searchBanks, searchBranches } from './client';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('searchBanks', () => {
  it('銀行一覧を取得し、正しいURLを組み立てる', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ banks: [{ code: '0001', name: 'みずほ', kana: 'ミズホ' }] }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await searchBanks('みずほ');

    expect(result.banks).toHaveLength(1);
    expect(result.banks[0]?.code).toBe('0001');
    const [calledUrl] = fetchMock.mock.calls[0] as [string];
    expect(calledUrl).toBe('https://api.zengin.sironekotoro.com/api/banks?name=%E3%81%BF%E3%81%9A%E3%81%BB');
  });

  it('該当なしの場合は空配列を返す', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ banks: [] })));
    const result = await searchBanks('存在しない銀行名');
    expect(result.banks).toEqual([]);
  });

  it('400エラー時はErrorResponseの内容でZenginApiErrorを投げる', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          { error: { code: 'invalid_request', message: 'Query parameter "name" is required' } },
          400,
        ),
      ),
    );

    await expect(searchBanks('')).rejects.toMatchObject({
      code: 'invalid_request',
      status: 400,
    });
  });

  it('ネットワークエラー時はnetwork_errorのZenginApiErrorを投げる', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const error = await searchBanks('みずほ').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ZenginApiError);
    expect((error as ZenginApiError).code).toBe('network_error');
    expect((error as ZenginApiError).status).toBe(0);
  });
});

describe('getBank', () => {
  it('銀行コードで銀行を取得する', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ bank: { code: '0001', name: 'みずほ' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await getBank('0001');

    expect(result.bank.name).toBe('みずほ');
    const [calledUrl] = fetchMock.mock.calls[0] as [string];
    expect(calledUrl).toBe('https://api.zengin.sironekotoro.com/api/banks/0001');
  });

  it('404の場合はErrorResponseに基づくエラーを投げる', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ error: { code: 'bank_not_found', message: 'Bank not found: 9999' } }, 404),
      ),
    );

    await expect(getBank('9999')).rejects.toMatchObject({
      code: 'bank_not_found',
      status: 404,
    });
  });
});

describe('searchBranches', () => {
  it('銀行内の支店を検索する', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        bank: { code: '0001', name: 'みずほ' },
        branches: [{ code: '001', name: '東京営業部' }],
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await searchBranches('0001', '東京');

    expect(result.branches).toHaveLength(1);
    const [calledUrl] = fetchMock.mock.calls[0] as [string];
    expect(calledUrl).toBe(
      'https://api.zengin.sironekotoro.com/api/banks/0001/branches?name=%E6%9D%B1%E4%BA%AC',
    );
  });
});

describe('getBranch', () => {
  it('銀行コードと支店コードで支店詳細を取得する', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        bank: { code: '0001', name: 'みずほ' },
        branch: { code: '001', name: '東京営業部', kana: 'トウキヨウエイギヨウブ' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await getBranch('0001', '001');

    expect(result.branch.kana).toBe('トウキヨウエイギヨウブ');
    const [calledUrl] = fetchMock.mock.calls[0] as [string];
    expect(calledUrl).toBe('https://api.zengin.sironekotoro.com/api/banks/0001/branches/001');
  });

  it('応答がJSONとして解析できない場合はinvalid_responseを投げる', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('not json', { status: 200, headers: { 'Content-Type': 'text/plain' } }),
      ),
    );

    await expect(getBranch('0001', '001')).rejects.toMatchObject({
      code: 'invalid_response',
    });
  });

  it('500エラーでErrorResponse形式でない場合はunknown_errorを投げる', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, 500)));

    await expect(getBranch('0001', '001')).rejects.toMatchObject({
      code: 'unknown_error',
      status: 500,
    });
  });
});
