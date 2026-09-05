import { describe, expect, it } from 'vitest';
import { toHalfWidthKana } from './kana';

describe('toHalfWidthKana', () => {
  it('清音を半角カナに変換する', () => {
    expect(toHalfWidthKana('トウキヨウ')).toBe('ﾄｳｷﾖｳ');
  });

  it('濁音を半角カナ+濁点に変換する', () => {
    expect(toHalfWidthKana('ミズホ')).toBe('ﾐｽﾞﾎ');
  });

  it('半濁音を半角カナ+半濁点に変換する', () => {
    expect(toHalfWidthKana('パピプペポ')).toBe('ﾊﾟﾋﾟﾌﾟﾍﾟﾎﾟ');
  });

  it('長音記号を変換する', () => {
    expect(toHalfWidthKana('スーパー')).toBe('ｽｰﾊﾟｰ');
  });

  it('対応表にない文字はそのまま保持する', () => {
    expect(toHalfWidthKana('東京123')).toBe('東京123');
  });

  it('空文字列を扱える', () => {
    expect(toHalfWidthKana('')).toBe('');
  });
});
