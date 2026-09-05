// zengin-pl-api の `kana` フィールドは全角カタカナで返される。
// 振込明細等で使う半角カナ表記への変換はクライアント側の付加機能として実装する
// （JIS X 0201 の対応表に基づく標準的な変換で、API仕様の変更や推測は行っていない）。

const DAKUTEN_MAP: Readonly<Record<string, string>> = {
  ガ: 'ｶ',
  ギ: 'ｷ',
  グ: 'ｸ',
  ゲ: 'ｹ',
  ゴ: 'ｺ',
  ザ: 'ｻ',
  ジ: 'ｼ',
  ズ: 'ｽ',
  ゼ: 'ｾ',
  ゾ: 'ｿ',
  ダ: 'ﾀ',
  ヂ: 'ﾁ',
  ヅ: 'ﾂ',
  デ: 'ﾃ',
  ド: 'ﾄ',
  バ: 'ﾊ',
  ビ: 'ﾋ',
  ブ: 'ﾌ',
  ベ: 'ﾍ',
  ボ: 'ﾎ',
  ヴ: 'ｳ',
};

const HANDAKUTEN_MAP: Readonly<Record<string, string>> = {
  パ: 'ﾊ',
  ピ: 'ﾋ',
  プ: 'ﾌ',
  ペ: 'ﾍ',
  ポ: 'ﾎ',
};

const PLAIN_MAP: Readonly<Record<string, string>> = {
  ア: 'ｱ',
  イ: 'ｲ',
  ウ: 'ｳ',
  エ: 'ｴ',
  オ: 'ｵ',
  カ: 'ｶ',
  キ: 'ｷ',
  ク: 'ｸ',
  ケ: 'ｹ',
  コ: 'ｺ',
  サ: 'ｻ',
  シ: 'ｼ',
  ス: 'ｽ',
  セ: 'ｾ',
  ソ: 'ｿ',
  タ: 'ﾀ',
  チ: 'ﾁ',
  ツ: 'ﾂ',
  テ: 'ﾃ',
  ト: 'ﾄ',
  ナ: 'ﾅ',
  ニ: 'ﾆ',
  ヌ: 'ﾇ',
  ネ: 'ﾈ',
  ノ: 'ﾉ',
  ハ: 'ﾊ',
  ヒ: 'ﾋ',
  フ: 'ﾌ',
  ヘ: 'ﾍ',
  ホ: 'ﾎ',
  マ: 'ﾏ',
  ミ: 'ﾐ',
  ム: 'ﾑ',
  メ: 'ﾒ',
  モ: 'ﾓ',
  ヤ: 'ﾔ',
  ユ: 'ﾕ',
  ヨ: 'ﾖ',
  ラ: 'ﾗ',
  リ: 'ﾘ',
  ル: 'ﾙ',
  レ: 'ﾚ',
  ロ: 'ﾛ',
  ワ: 'ﾜ',
  ヲ: 'ｦ',
  ン: 'ﾝ',
  ァ: 'ｧ',
  ィ: 'ｨ',
  ゥ: 'ｩ',
  ェ: 'ｪ',
  ォ: 'ｫ',
  ッ: 'ｯ',
  ャ: 'ｬ',
  ュ: 'ｭ',
  ョ: 'ｮ',
  ー: 'ｰ',
  '、': '､',
  '。': '｡',
  '「': '｢',
  '」': '｣',
  '・': '･',
};

/**
 * 全角カタカナ文字列を半角カナ（JIS X 0201）に変換する。
 * 対応表にない文字（漢字・ひらがな・対応する半角形のない仮名など）はそのまま返す。
 */
export function toHalfWidthKana(input: string): string {
  let result = '';
  for (const ch of input) {
    const dakuten = DAKUTEN_MAP[ch];
    if (dakuten !== undefined) {
      result += dakuten + 'ﾞ';
      continue;
    }
    const handakuten = HANDAKUTEN_MAP[ch];
    if (handakuten !== undefined) {
      result += handakuten + 'ﾟ';
      continue;
    }
    const plain = PLAIN_MAP[ch];
    result += plain !== undefined ? plain : ch;
  }
  return result;
}
