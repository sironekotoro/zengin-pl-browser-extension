// zengin-pl-api の検索(`name`パラメータ)は単純な部分一致で、
// 半角/全角・大文字/小文字の正規化を行わない。
// 実データ確認の結果、英字を含む名称は全角・大文字で格納されている
// (例: 銀行コード0005の名称は「三菱ＵＦＪ」)。
// そのため、検索語中の半角英字を全角大文字に変換してからAPIへ渡すことで
// 「UFJ」「ufj」のような表記でもヒットしやすくする。
// 数字は銀行コード/支店コード検索(半角のみ有効)に使われるため変換しない。
const HALF_WIDTH_TO_FULL_WIDTH_OFFSET = 0xfee0;

export function normalizeSearchQuery(input: string): string {
  return input.replace(/[A-Za-z]/g, (ch) =>
    String.fromCharCode(ch.toUpperCase().charCodeAt(0) + HALF_WIDTH_TO_FULL_WIDTH_OFFSET),
  );
}
