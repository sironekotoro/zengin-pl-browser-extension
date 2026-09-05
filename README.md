# zengin-pl-browser-extension

銀行名・銀行コード（4桁）・支店名・支店コード（3桁）を検索できる、Chrome / Firefox 向けのブラウザ拡張です。
[`zengin-pl-api`](https://github.com/sironekotoro/zengin-pl-api) が提供する公開APIを利用しています。

> **注意:** 本拡張機能は全国銀行資金決済ネットワーク（全銀ネット）等の公式サービスではありません。
> 非公式の個人プロジェクトであり、データの正確性・最新性を保証するものではありません。

一般利用者向けの使い方ページ・プライバシーポリシーは `docs/`（GitHub Pages）にあります。
GitHub Pagesを有効化後は `https://sironekotoro.github.io/zengin-pl-browser-extension/` で公開される想定です。

## できること

1. **拡張機能アイコンから開く検索画面**
   - 銀行名または4桁の銀行コードで金融機関を検索
   - 銀行を選択後、支店名または3桁の支店コードでその銀行内の支店を検索
   - 銀行名・銀行コード・支店名・支店コード・半角カナをそれぞれコピー可能（コピー後は簡潔なフィードバックを表示）
   - 検索画面は独立したウィンドウとして開き、**他の画面をクリックしても自動的には閉じません**（明示的にウィンドウを閉じるまで残るため、銀行名→支店名の順にコピー＆別アプリへ貼り付ける、といった使い方が可能）
   - 支店の詳細情報が表示された際、スクロールなしで見えるようウィンドウを自動的に縦へ拡張

> **選択文字列の右クリック検索について:** 初版では実装していましたが、Chromeでコンテキストメニュー登録に起因すると見られる重大な不具合（ネイティブの右クリックメニュー自体が表示されなくなる）が確認されたため、原因を切り分けるまでの間、Chrome/Firefox双方で一旦無効化しています。関連する `contextMenus` / `storage` 権限もマニフェストから外しています。詳細は「実装上の注記・既知の制約」を参照してください。

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
  background/  検索ウィンドウの作成/使い回し、初回インストール案内（サービスワーカー/イベントページ）
  popup/       検索画面（HTML/CSS/TS）
  onboarding/  初回インストール時に開く案内ページ（HTML）
  shared/      デバウンス、半角カナ変換、ウィンドウ拡張の計算
  icons/       zengin-pl(Webフロントエンド)のfaviconと揃えたアイコン(source.svg, source.ref)
manifest/      Chrome用・Firefox用の manifest.json
scripts/       ビルドスクリプト・アイコン生成スクリプト
```

## 検索画面の開き方（Chrome/Firefox互換性・持続表示）

`action.default_popup` は設定していません。ツールバーアイコンをクリックした際に自動で閉じる（フォーカスを失うと消える）ドロップダウン式のポップアップは、銀行名→支店名の順にコピー＆別アプリへ貼り付けるような使い方と相性が悪いためです。

代わりに、アイコンクリック（`action.onClicked`）は `src/background/searchWindow.ts` の `openOrFocusSearchWindow()` を通じて検索画面（`popup.html`）を独立した `windows.create()` のウィンドウとして開きます。

- ウィンドウ種別は `type: "normal"`（通常のブラウザウィンドウ、タブが1つだけの状態）です。当初は `type: "popup"`（アドレスバー等のない簡易ウィンドウ）を使用していましたが、環境によってはフォーカスを失うと閉じてしまう報告があったため、確実に閉じずタイトルバーでドラッグ移動もできる通常ウィンドウに変更しました。トレードオフとして、アドレスバーやタブバーなど通常のブラウザウィンドウの外観になります（ミニマルな見た目ではなくなります）。
- 既に検索画面が開いている場合は、新しいウィンドウを作らずそのウィンドウを `windows.update({ focused: true })` でフォーカスするだけにします（ウィンドウが増殖しません）。
- ウィンドウの高さは、直前にフォーカスされていた通常ウィンドウ（ブラウザ本体）の高さに合わせます（480〜900pxの範囲でクランプ）。取得できない場合は既定値（720px）を使います。
- ウィンドウが閉じられたら `windows.onRemoved` で追跡状態をリセットします。
- 支店を選択して詳細情報が表示された際、スクロールが必要になった分だけウィンドウを縦方向に自動で拡張します（`src/popup/popup.ts` の `fitWindowToContent()`、高さの計算は `src/shared/windowFit.ts` の純粋関数として切り出してユニットテストしています）。画面の下端を超えないようクランプします。

この設計はChrome/Firefoxのどちらでも同じコードパスで動作します。

## 初回インストール時の案内ページ

拡張機能がツールバーへ自らピン留めするAPIは(Chrome/Firefoxいずれにも)存在しません。Firefoxは既定でツールバーに表示されますが、Chrome/Edgeでは既定で「拡張機能」メニュー（パズルピース型アイコン）に格納され、ユーザーが手動でピン留めする必要があります。

これに対応するため、初回インストール時（`runtime.onInstalled` の `reason === 'install'`）にのみ、ピン留め手順を説明する案内ページ（`src/onboarding/onboarding.html`）を新しいタブで開きます（`src/background/onboarding.ts`）。アップデート時やブラウザ更新時には表示しません。`tabs.create()` で自拡張機能のページを開くだけなので、追加の権限は必要ありません。

Chrome/Edgeの手順には、実際の操作を撮影したアニメーションGIF（`docs/images/pin-to-toolbar.gif`）を掲載しています。ビルド時に `scripts/build.mjs` が拡張機能パッケージ内へコピーするため、オフラインでも表示されます（外部URLへは接続しません）。

## APIとの通信

- **固定URL:** `https://api.zengin.sironekotoro.com` のみに接続します（`host_permissions` もこの1オリジンに限定）。`*.run.app` のような内部URLはコードに含めていません。
- **APIコントラクト:** [`zengin-pl-api` の openapi.yaml](https://github.com/sironekotoro/zengin-pl-api/blob/main/openapi.yaml) を正本とし、`src/api/types.ts` に対応するレスポンス型を定義しています。
- **呼び出すエンドポイント:** `GET /api/banks`, `GET /api/banks/{bankCode}`, `GET /api/banks/{bankCode}/branches`, `GET /api/banks/{bankCode}/branches/{branchCode}`
- **送信タイミング:** 検索欄への入力に対してはデバウンス（400ms）を設けたうえで自動検索し、フォーム送信（検索ボタン/Enter）で即座に検索します。

## 権限

| 権限 | 用途 |
|---|---|
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

### アイコン

拡張機能のアイコンは、[`zengin-pl`](https://github.com/sironekotoro/zengin-pl)（同じ検索データを使うWebフロントエンド）の favicon（`web/favicon.svg`）と揃えています。SVGをそのまま [`@resvg/resvg-js`](https://github.com/yisibl/resvg-js) でラスタライズして `icon16/48/128.png` を生成しており、手描きのプレースホルダーではありません。

取得元のコミットは `src/icons/source.ref` にピン留めしており（`src/icons/source.svg` はその時点のコピー）、`zengin-pl` 側でfaviconが更新された場合は以下で追随できます。

```bash
npm run icons                 # zengin-pl の master 最新版を取得し、アイコンとピン留めを更新
npm run icons -- --ref <sha>  # 特定コミット時点のfaviconを取得
npm run icons:offline         # ネットワークを使わず、手元の src/icons/source.svg から再生成のみ行う
```

zengin-pl側のfaviconは512のviewBoxに対し線の太さ(`stroke-width`)が30で、ツールバーの16px相当まで縮小すると線が細すぎて視認性が悪いという指摘があったため、`src/icons/source.svg`(同期元の正本)自体は変更せず、`scripts/sync-icon.mjs` がラスタライズする際にのみ線の太さを2倍にしています（`STROKE_WIDTH_MULTIPLIER`）。zengin-pl側のfaviconデザインが変わった場合もこの倍率は自動的に追随します。

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
7. Tabキーのみで一連の操作（検索欄フォーカス→検索→結果選択→コピー）が行えることを確認
8. 検索画面を開いたまま他のウィンドウ/タブをクリックしても検索画面が閉じないことを確認
9. 小さめのウィンドウサイズで検索を行い、支店を選択して詳細情報が表示された際にスクロールなしで全項目が見えるようウィンドウが自動的に縦へ拡張されることを確認

## ストア申請用スクリーンショット

拡張機能のウィンドウは縦長（440px幅）のため、そのままではChromeウェブストアが要求する横長サイズ（1280×800 / 640×400）に収まりません。実機で撮影した縦長のスクリーンショット（`docs/images/search-screenshot.png`）を素材として、規定サイズの横長画像へ合成するスクリプトを用意しています。

```bash
npm run store-screenshot              # 1280x800 を store-assets/ に生成
npm run store-screenshot -- 640 400   # 640x400 を生成
```

出力は `store-assets/` 配下に保存されます。素材画像を撮り直した場合は、`scripts/generate-store-screenshot.mjs` 内の `SOURCE_IMAGE_WIDTH` / `SOURCE_IMAGE_HEIGHT` の実寸も合わせて更新してください。

## CI

GitHub Actions（`.github/workflows/ci.yml`）で、push/PRごとに以下を実行します。

- 型検査（`tsc --noEmit`）
- ユニットテスト（Vitest）
- Chrome向け・Firefox向けビルド

## 実装上の注記・既知の制約

- **選択文字列の右クリック検索は一旦無効化しています。** 初版では `contextMenus` API を使い、Webページ上で選択した文字列を右クリックから検索欄へ引き継ぐ機能を実装していましたが、Chromeで「拡張機能のメニュー項目どころか、ネイティブの右クリックメニュー自体が表示されなくなる」という重大な不具合が実機で確認されました。考えられる原因として、Chrome(MV3)のservice worker起動のたびにコンテキストメニューを `removeAll()` → `create()` で再登録するようにしていた対応が、ユーザーが右クリックした瞬間の登録処理と競合し、Chromeがそのタイミングでネイティブメニュー自体の構築に失敗した可能性があります。原因の切り分け・再発防止策の検証ができるまで、Chrome/Firefox双方でこの機能を無効化し、関連コード(`contextMenus`によるメニュー登録、右クリック時の検索語引き継ぎ用の一時ストレージ)を削除し、`contextMenus` / `storage` 権限もマニフェストから外しました。再度有効化する際は、実機での再現確認を伴う形で慎重に進める想定です。
- `zengin-pl-api` の `kana` フィールドは全角カタカナで返されます。検索画面で表示する「半角カナ」は、クライアント側でJIS X 0201に基づく標準的な変換（`src/shared/kana.ts`）を行った結果であり、API自体を変更・推測してはいません。
- 支店の検索結果一覧（`GET /api/banks/{bankCode}/branches`）にはカナ情報が含まれないため、支店を選択したタイミングで `GET /api/banks/{bankCode}/branches/{branchCode}` を追加で呼び出し、半角カナ表示用のデータを取得しています。
- **検索の表記揺れについて:**
  - 半角/全角・大文字小文字の表記揺れ(例: `UFJ`/`ufj`/`ＵＦＪ`)は、[`zengin-pl`](https://github.com/sironekotoro/zengin-pl) / [`zengin-pl-api`](https://github.com/sironekotoro/zengin-pl-api) 側でNFKC正規化・大文字小文字無視の比較に対応済みで、API側で吸収されています(拡張機能側でのクエリ正規化は行っていません)。
  - 多くの銀行の `name` は「銀行」等の業態種別を含みません（例: 銀行コード `0001` の `name` は「みずほ」、`0138` は「横浜」）。一方で信用金庫・農協等は「〇〇信金」「〇〇農協」のように種別を含む名称になっており、この扱いは業態によって一貫していません。実データで52件のベース名衝突（例: `横浜` = 銀行/信金/農協）が確認されているため、API側でも接尾辞の自動除去は意図的に見送られています。拡張機能側でも同様に自動除去は行わず、検索欄下にヒントを表示するに留めています。
