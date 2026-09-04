import { describe, expect, it, vi } from 'vitest';
import {
  MAX_PENDING_SEARCH_LENGTH,
  PENDING_SEARCH_KEY,
  setPendingSearchTerm,
  takePendingSearchTerm,
  type StorageArea,
} from './pendingSearch';

function createFakeStorage(initial: Record<string, unknown> = {}): StorageArea {
  const data: Record<string, unknown> = { ...initial };
  return {
    get: vi.fn(async (keys) => {
      if (keys === null) return { ...data };
      const list = Array.isArray(keys) ? keys : [keys];
      const result: Record<string, unknown> = {};
      for (const key of list) {
        if (key in data) result[key] = data[key];
      }
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

describe('pendingSearch', () => {
  it('setで保存した値をtakeで取得できる', async () => {
    const storage = createFakeStorage();
    await setPendingSearchTerm('みずほ銀行', storage);
    await expect(takePendingSearchTerm(storage)).resolves.toBe('みずほ銀行');
  });

  it('takeした値はストレージから削除される（一度きりの引き継ぎ）', async () => {
    const storage = createFakeStorage();
    await setPendingSearchTerm('みずほ銀行', storage);
    await takePendingSearchTerm(storage);
    await expect(takePendingSearchTerm(storage)).resolves.toBeNull();
  });

  it('保存された値がない場合はnullを返す', async () => {
    const storage = createFakeStorage();
    await expect(takePendingSearchTerm(storage)).resolves.toBeNull();
  });

  it('前後の空白を除去し、空文字列は保存しない', async () => {
    const storage = createFakeStorage();
    await setPendingSearchTerm('   ', storage);
    await expect(takePendingSearchTerm(storage)).resolves.toBeNull();
  });

  it('長すぎる文字列は上限で切り詰める', async () => {
    const storage = createFakeStorage();
    const long = 'あ'.repeat(MAX_PENDING_SEARCH_LENGTH + 100);
    await setPendingSearchTerm(long, storage);
    const result = await takePendingSearchTerm(storage);
    expect(result).toHaveLength(MAX_PENDING_SEARCH_LENGTH);
  });

  it('取得したキー名は仕様通りである', async () => {
    expect(PENDING_SEARCH_KEY).toBe('pendingSearchTerm');
  });
});
