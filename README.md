# zengin-pl-browser-extension

銀行名・銀行コード（4桁）・支店名・支店コード（3桁）を検索できる、Chrome / Firefox 向けのブラウザ拡張です。
[`zengin-pl-api`](https://github.com/sironekotoro/zengin-pl-api) が提供する公開APIを利用しています。

> **注意:** 本拡張機能は全国銀行資金決済ネットワーク（全銀ネット）等の公式サービスではありません。
> 非公式の個人プロジェクトであり、データの正確性・最新性を保証するものではありません。

## できること

1. **拡張機能アイコンから開く検索画面**
   - 銀行名または4桁の銀行コードで金融機関を検索
   - 銀行を選択後、支店名または3桁の支店コードでその銀行内の支店を検索
   - 銀行名・銀行コード・支店名・支店コード・半角カナをそれぞれコピー可能（コピー後は簡潔なフィードバックを表示）
2. **選択文字列の右クリック検索**
   - Webページ上で文字列を選択したときだけ、コンテキストメニューに「銀行・支店コードを検索」を表示
   - クリックすると検索画面が新しいウィンドウで開き、選択文字列が銀行検索欄に反映される
   - **選択文字列は、ユーザーが検索を確定する（検索ボタンを押す/Enterを押す）まで外部APIへ送信されない**

## 非対象機能（初版のスコープ外）

- 口座番号・口座種別・名義・メモ・任意タグの入力や保存
- お気に入り・マイ口座機能
- データのエクスポート／インポート
- Webページの内容を読み取る機能、フォーム自動入力、解析・広告・トラッキング

## アーキテクチャ

- **言語:** TypeScript（strictモード）
- **形式:** WebExtension / Manifest V3（Chrome・Firefox共通のソースから、ブラウザ別の `manifest.json` を出力）
- **ビルドツール:** [esbuild](https://esbuild.github.io/) + `tsc --noEmit`（型検査専用）
  - 理由: 本拡張は画面が1つのポップアップのみで、フレームワークやバンドラの高度な機能（ルーティング、HMR、複雑なコード分割等）を必要としません。esbuildは設定がほぼ不要で高速、依存も少なく、活発にメンテナンスされているため、最小構成の目的に合致します。型検査はesbuildが行わないため `tsc --noEmit` を別途CIで実行しています。
- **テスト:** [Vitest](https://vitest.dev/)（TypeScript/ESMネイティブで高速、esbuildベースで追加設定がほぼ不要）
- **クロスブラウザ互換:** [`webextension-polyfill`](https://github.com/mozilla/webextension-polyfill)（Mozilla公式。`chrome.*` と `browser.*` の差異を吸収し、Promiseベースの統一APIを提供）

### ディレクトリ構成

```
src/
  api/         zengin-pl-api の OpenAPI 契約に基づく型とクライアント
  background/  コンテキストメニューの登録・クリック処理（サービスワーカー/イベントページ）
  popup/       検索画面（HTML/CSS/TS）
  shared/      デバウンス、半角カナ変換、検索語の一時引き継ぎストレージ
  icons/       生成されたプレースホルダーアイコン
manifest/      Chrome用・Firefox用の manifest.json
scripts/       ビルドスクリプト・アイコン生成スクリプト
```

## 右クリック検索の実装方針（Chrome/Firefox互換性）

コンテキストメニューをクリックした際、`browser.action.openPopup()` のようなツールバーポップアップを強制的に開くAPIには依存していません（Chrome/Firefox間で対応状況・挙動が異なり、確実に動作しない可能性があるため）。

代わりに、選択文字列を `storage.local` に一時保存したうえで、検索画面（`popup.html`）を独立した `windows.create()` のポップアップウィンドウとして開きます。これはツールバーアイコンをクリックした場合と同じHTML/JSを再利用しており、Chrome・Firefoxのどちらでも同じ挙動になります。

## APIとの通信

- **固定URL:** `https://api.zengin.sironekotoro.com` のみに接続します（`host_permissions` もこの1オリジンに限定）。`*.run.app` のような内部URLはコードに含めていません。
- **APIコントラクト:** [`zengin-pl-api` の openapi.yaml](https://github.com/sironekotoro/zengin-pl-api/blob/main/openapi.yaml) を正本とし、`src/api/types.ts` に対応するレスポンス型を定義しています。
- **呼び出すエンドポイント:** `GET /api/banks`, `GET /api/banks/{bankCode}`, `GET /api/banks/{bankCode}/branches`, `GET /api/banks/{bankCode}/branches/{branchCode}`
- **送信タイミング:** 検索欄への入力に対してはデバウンス（400ms）を設けたうえで自動検索し、フォーム送信（検索ボタン/Enter）で即座に検索します。右クリック検索で引き継いだ文字列は検索欄に反映されるのみで、ユーザーが検索を確定するまでAPIへは送信されません。

## 権限

| 権限 | 用途 |
|---|---|
| `contextMenus` | 選択文字列がある場合のみ右クリックメニューに検索項目を表示するため |
| `storage` | 右クリック検索で選択した文字列を、検索画面が開くまでの間だけ一時的に引き継ぐため |
| `host_permissions: https://api.zengin.sironekotoro.com/*` | 検索APIへの通信のみに限定 |

クリップボードへのコピーは、検索画面（ユーザー操作のあるページコンテキスト）から `navigator.clipboard.writeText()` を呼び出す方式のため、追加のクリップボード権限は要求していません。

任意サイトの内容を読み取る権限、広いホスト権限、フォーム自動入力、解析・広告・トラッキングは追加していません。

## セットアップ

```bash
npm install
```

### 型検査・テスト

```bash
npm run typecheck
npm test
```

### ビルド

```bash
npm run build:chrome   # dist/chrome に出力
npm run build:firefox  # dist/firefox に出力
npm run build          # 両方まとめて実行
```

アイコン（`src/icons/`）は依存ライブラリなしのスクリプトで生成したプレースホルダーです。差し替える場合は `src/icons/icon{16,48,128}.png` を置き換えてください（再生成する場合は `npm run icons`）。

## ローカルでの読み込み方法

### Chrome / Edge など Chromium系

1. `npm run build:chrome`
2. `chrome://extensions` を開き、右上の「デベロッパーモード」を有効化
3. 「パッケージ化されていない拡張機能を読み込む」から `dist/chrome` を選択

### Firefox

1. `npm run build:firefox`
2. `about:debugging#/runtime/this-firefox` を開く
3. 「一時的なアドオンを読み込む」から `dist/firefox/manifest.json` を選択

(Firefoxの一時的な読み込みはブラウザを再起動すると解除されます。)

## 動作確認手順（手動）

1. 拡張機能アイコンをクリックし、検索画面を開く
2. 銀行名（例: `みずほ`）または銀行コード（例: `0001`）を入力し、検索結果が表示されることを確認
3. 銀行を選択し、支店セクションが表示されることを確認
4. 支店名（例: `東京`）または支店コード（例: `001`）で検索し、結果が表示されることを確認
5. 支店を選択し、銀行名・銀行コード・支店名・支店コード・半角カナの各項目が表示され、「コピー」でクリップボードにコピーできることを確認
6. 該当なしの検索語、通信不可時の挙動（エラーメッセージ表示）を確認
7. 任意のWebページで文字列を選択し、右クリックメニューに「銀行・支店コードを検索」が表示されること、選択していない状態では表示されないことを確認
8. メニューをクリックし、新しいウィンドウで検索画面が開き、検索欄に選択文字列が反映されること、かつ検索ボタン/Enterを押すまで結果が表示されない（＝APIが呼ばれない）ことを確認
9. Tabキーのみで一連の操作（検索欄フォーカス→検索→結果選択→コピー）が行えることを確認

## CI

GitHub Actions（`.github/workflows/ci.yml`）で、push/PRごとに以下を実行します。

- 型検査（`tsc --noEmit`）
- ユニットテスト（Vitest）
- Chrome向け・Firefox向けビルド

## 実装上の注記・既知の制約

- `zengin-pl-api` の `kana` フィールドは全角カタカナで返されます。検索画面で表示する「半角カナ」は、クライアント側でJIS X 0201に基づく標準的な変換（`src/shared/kana.ts`）を行った結果であり、API自体を変更・推測してはいません。
- 支店の検索結果一覧（`GET /api/banks/{bankCode}/branches`）にはカナ情報が含まれないため、支店を選択したタイミングで `GET /api/banks/{bankCode}/branches/{branchCode}` を追加で呼び出し、半角カナ表示用のデータを取得しています。
