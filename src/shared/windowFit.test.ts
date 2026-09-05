import { describe, expect, it } from 'vitest';
import { computeExpandedWindowHeight } from './windowFit';

describe('computeExpandedWindowHeight', () => {
  it('コンテンツがすでに収まっている場合はnullを返す', () => {
    const result = computeExpandedWindowHeight({
      windowHeight: 720,
      windowTop: 80,
      contentHeight: 600,
      viewportHeight: 650,
      screenAvailHeight: 1080,
    });
    expect(result).toBeNull();
  });

  it('不足分に余裕(バッファ)を加えた高さを返す', () => {
    const result = computeExpandedWindowHeight({
      windowHeight: 640,
      windowTop: 80,
      contentHeight: 1000,
      viewportHeight: 400,
      screenAvailHeight: 2000,
    });
    // shortfall = 600, target = 640 + 600 + 24 = 1264
    // availableBelow = 2000 - 80 - 40 = 1880 > 1264 なのでclampされない
    expect(result).toBe(1264);
  });

  it('画面からはみ出す場合は画面内に収まる高さにクランプする', () => {
    const result = computeExpandedWindowHeight({
      windowHeight: 640,
      windowTop: 700,
      contentHeight: 2000,
      viewportHeight: 400,
      screenAvailHeight: 1080,
    });
    // availableBelow = 1080 - 700 - 40 = 340 < windowHeight なので maxHeight = windowHeight(640)
    expect(result).toBeNull();
  });

  it('画面内に収まる範囲で最大までクランプして拡張する', () => {
    const result = computeExpandedWindowHeight({
      windowHeight: 640,
      windowTop: 100,
      contentHeight: 5000,
      viewportHeight: 400,
      screenAvailHeight: 1080,
    });
    // availableBelow = 1080 - 100 - 40 = 940
    expect(result).toBe(940);
  });

  it('screenAvailHeightがwindowHeightより小さくてもwindowHeightより縮めない(現状維持でnull扱い)', () => {
    const result = computeExpandedWindowHeight({
      windowHeight: 900,
      windowTop: 50,
      contentHeight: 950,
      viewportHeight: 800,
      screenAvailHeight: 700,
    });
    // shortfall = 150, availableBelow = 700-50-40=610 < windowHeight(900) -> maxHeight = 900
    // target = min(900+150+24, 900) = 900 -> 900 > 900 は false なので null
    expect(result).toBeNull();
  });
});
