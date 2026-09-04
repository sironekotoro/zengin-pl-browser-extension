import { describe, expect, it } from 'vitest';
import { SEED_SEARCH_MESSAGE, isSeedSearchMessage } from './messages';

describe('isSeedSearchMessage', () => {
  it('正しい形のメッセージを判定する', () => {
    expect(isSeedSearchMessage({ type: SEED_SEARCH_MESSAGE, term: 'みずほ' })).toBe(true);
  });

  it('typeが一致しない場合はfalse', () => {
    expect(isSeedSearchMessage({ type: 'other', term: 'みずほ' })).toBe(false);
  });

  it('termが文字列でない場合はfalse', () => {
    expect(isSeedSearchMessage({ type: SEED_SEARCH_MESSAGE, term: 123 })).toBe(false);
  });

  it('null・非オブジェクトはfalse', () => {
    expect(isSeedSearchMessage(null)).toBe(false);
    expect(isSeedSearchMessage('みずほ')).toBe(false);
    expect(isSeedSearchMessage(undefined)).toBe(false);
  });
});
