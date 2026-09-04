import { describe, expect, it } from 'vitest';
import { normalizeSearchQuery } from './searchQuery';

describe('normalizeSearchQuery', () => {
  it('半角英字を全角大文字に変換する', () => {
    expect(normalizeSearchQuery('UFJ')).toBe('ＵＦＪ');
  });

  it('小文字も全角大文字に変換する', () => {
    expect(normalizeSearchQuery('ufj')).toBe('ＵＦＪ');
  });

  it('日本語と混在していても英字部分だけを変換する', () => {
    expect(normalizeSearchQuery('三菱UFJ')).toBe('三菱ＵＦＪ');
  });

  it('数字はコード検索のため変換しない', () => {
    expect(normalizeSearchQuery('0001')).toBe('0001');
  });

  it('既に全角の場合はそのまま', () => {
    expect(normalizeSearchQuery('ＵＦＪ')).toBe('ＵＦＪ');
  });

  it('空文字列を扱える', () => {
    expect(normalizeSearchQuery('')).toBe('');
  });
});
