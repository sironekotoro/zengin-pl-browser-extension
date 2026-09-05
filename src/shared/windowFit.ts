const RESIZE_BUFFER_PX = 24;
const BOTTOM_MARGIN_PX = 40;

export interface WindowFitInput {
  /** 現在のウィンドウの高さ(外枠含む) */
  windowHeight: number;
  /** 現在のウィンドウの画面上端からの位置 */
  windowTop: number;
  /** スクロールなしで表示するために必要なコンテンツの高さ */
  contentHeight: number;
  /** 現在表示できているコンテンツ領域の高さ */
  viewportHeight: number;
  /** 画面(ディスプレイ)の利用可能な高さ */
  screenAvailHeight: number;
}

/**
 * コンテンツがスクロールなしで収まるように必要なウィンドウの高さを計算する。
 * 拡張が不要、またはこれ以上拡張できない(画面外に出てしまう)場合は null を返す。
 */
export function computeExpandedWindowHeight(input: WindowFitInput): number | null {
  const shortfall = input.contentHeight - input.viewportHeight;
  if (shortfall <= 0) return null;

  const availableBelow = input.screenAvailHeight - input.windowTop - BOTTOM_MARGIN_PX;
  const maxHeight = Math.max(availableBelow, input.windowHeight);
  const targetHeight = Math.min(Math.round(input.windowHeight + shortfall + RESIZE_BUFFER_PX), maxHeight);

  return targetHeight > input.windowHeight ? targetHeight : null;
}
