# レコード種別ごとの行背景色の計画

## 作業概要

- 標準テキストエディターで、レコード種別を行全体の背景色で見分けられるようにする。
  [仕様](SPECS.md)の受け入れ条件を1スライスで満たす。
- 定義、解析、描画と、全銀・JPX・NTT の配色を一緒に届ける。各変更をそろえることで実サンプルで表示を確認できる。
- [アーキテクチャ](../../architecture.md)、[検証方針](../../validation.md)、
  [証跡方針](../../evidence.md)に従う。

## 現在の状態

- 現在の再計画は `PLAN_APPROVED`。このスライスのローカル検証は GUI を起動せず、
  テストコードで確認できる範囲に限る。独立計画レビューと利用者の承認を得た。計画コミットは未完了。
- 直前の実装状態は `IMPLEMENTED`。Qlty の複雑度検査で出た7件を修正し、基準・修正後とも
  指摘0件を確認した。独立実装レビュー R4 は、当時の計画で求めた実ホスト試験と目視、および
  Qlty の一部証跡の不足により Findings と判定した。
- 当初計画は `c08455a05ad32383008a095bb714d079e5788c16` としてコミット済みで、親と比較ベースは
  `64f09ff622a6719776e590be47967def9c3da4b4`。以前記録した `.git/index.lock` の書き込み失敗は
  この計画コミットで解消済み。
- 改訂計画は独立レビュー R4 と利用者の承認を経て
  `921f346d9f9e1d52d38d3e148356c1164730c40d`（tree `bcbca7897a837ae41838636bc0ee63ff83b69acc`）として
  コミット済み。親は当初計画 `c08455a05ad32383008a095bb714d079e5788c16`、統合ベースは
  `64f09ff622a6719776e590be47967def9c3da4b4`。開始条件を満たし、先行スライスはない。
- 2026-11-21 の追加ユーザー指示で、全銀・JPX・NTT の38形式・206行への配色、近い役割への共通色、
  および `npm run compile` の修正が加わった。当初の R2 は初回計画のみ、R4 は改訂計画を対象とする。
- 配色方式はファイル定義 JSON の `light` / `dark` 別の RGB 指定を採用する。
- 実装差分は未コミット。現在の比較ベース、パス、差分識別、通過と不足は
  [調査と文書検証](#調査と文書検証)を参照する。

[ライフサイクル状態](../../README.md#ライフサイクル状態)に従う。

## GitHub スタック

- 取り込み先は `main`。スライス1のPRのみを作り、対象は `main`、ヘッドブランチは
  `codex/record-row-background`。比較ベースは `64f09ff622a6719776e590be47967def9c3da4b4`。
- 当初計画コミットは `c08455a05ad32383008a095bb714d079e5788c16`、親と比較ベースは
  `64f09ff622a6719776e590be47967def9c3da4b4`。計画コミットには `SPECS.md` と `TASKS.md` のみを含む。
- 改訂計画コミットは `921f346d9f9e1d52d38d3e148356c1164730c40d`、親は当初計画コミット、tree は
  `bcbca7897a837ae41838636bc0ee63ff83b69acc`。これも `SPECS.md` と `TASKS.md` のみを含む。
- スライス1の実装差分は比較ベースからの未コミット変更。スライス完了コミットと PR URL は未確定。
  完了承認と完了コミットの直後に Main が PR を公開し、ベース・ヘッド・差分・PR URL を記録する。
  同じ PR の最上位ヘッドに終了差分を含める。
- 終了判定に進む前と終了コミット後に、Main が最新ヘッドの Verify、CodeQL の解析対象との対応、
  必須チェック、適用される Qlty Cloud の結果を確認する。終了承認とマージ承認を個別に得る。
  Main はマージ前に方式と対象 SHA を確定し、マージ後に `main` の取り込み SHA を終了証跡に記録する。

[GitHub 標準のスタック PR](../../README.md#github-標準のスタック-pr)に従う。

## 人による承認

- 当初計画 `Approved`。利用者がレビュー済みの当初計画を `c08455a05ad32383008a095bb714d079e5788c16`
  としてコミットした。独立レビュー R2 の対象と判定は[調査と文書検証](#調査と文書検証)を参照する。
- 改訂計画 `Approved`。独立レビュー R4 後に利用者が明示的に承認し、
  `921f346d9f9e1d52d38d3e148356c1164730c40d` としてコミットした。
  対象はこの2文書と、[実装と検証支援のパス](#実装と検証支援のパス)に列挙したスライス1の範囲。
  承認時点の文書 blob は `1426f7b7bc2e14faec861b684cae5cd3d2211a6a` と
  `bf324a389722bd8c23379a4c00d61d2eeb30f8e0`。承認記録の追記のみで計画の内容に変更はない。
- GUI を起動しない検証への再計画 `Approved`。2026-11-22 に利用者が明示的に承認した。
  承認対象は `TASKS.md` と `SPECS.md` の検証方法の変更。基準の HEAD は
  `921f346d9f9e1d52d38d3e148356c1164730c40d`。計画コミットは未完了。
  独立計画レビューは `PLAN_READY`。レビュー対象の blob は、状態・判定の追記前の
  `SPECS.md` が `27e40dd45cd88e30dcb9037a4bc918e61538e00f`、
  `TASKS.md` が `3edaee5c1736c9b851e89e8d30c2efacae41df46`。
  GitHub の既存の必須チェックは引き続き適用する。
  計画2文書の lint と差分の空白検査は通過した。ステージ時に `.git/index.lock` の作成が
  `Operation not permitted` となり、計画コミットの手前で停止した。
- スライス1の完了 `Pending`。対象候補は承認されたスライス1の範囲。
  独立実装レビュー、完了承認、完了コミットは未確定。
- 終了 `Pending`。対象候補は[終了時の反映・削除](#機能の終了判定)のパス。
  終了判定、終了差分の独立レビュー判定、承認結果、終了コミットは未確定。
- マージ `Pending`。対象候補はスライス1の PR から `main` への取り込み。
  終了時のベース・ヘッド、マージ方式、最新のチェック、承認結果、マージ結果は未確定。

[人による承認](../../README.md#人による承認)に従う。

## スライス1. 行定義の背景色を表示する

### 価値と依存関係

全銀・JPX・NTT でレコードの役割を背景色で判別できる。形式が異なっても近い役割の行は同じ色を使う。
診断の設定にかかわらず、短い行にも一致した行定義の背景色を表示する。
先行スライスはない。対象ベース、計画の独立レビューと人の承認、計画コミットが着手条件。

### 設計の責務と境界

- インフラストラクチャの組み込み定義ローダーで `backgroundColor` の両値を検査する。
  有効な組は色ペアとして行定義へ渡す。省略や不正な色指定で、形式、正規表現、項目、診断を失わない。
  VS Code のテーマ色 ID や任意の CSS は受け付けない。
- ドメインの `projectFields` は、条件と現在のモードに最初に一致した行定義から色ペアも返す。
  行名で引き直すと同名ルールを区別できないため、同じ一致結果から色と項目を得る。モード更新の順序、
  `rowName`、項目の論理位置、診断の契約を保ち、ドメインに VS Code API を持ち込まない。
- アプリケーションの `analyze` は、行番号と色ペアを持つ行背景 DTO を項目・診断とは別の配列にまとめる。
  空行・空白行は既存の判定前の除外に従う。項目がない行や個別項目の byte 境界を安全に表示できない行も、
  一致したルールに色があれば対象に含める。文書全体の再エンコード失敗時の安全停止と、
  `decorate` が項目配列を返す契約は維持する。診断の有効・無効や診断件数の上限は行背景を左右しない。
- `DocumentRenderSession` は解析後に行番号で索引化し、既存の描画更新データとして URI ごとに共有する。
  文書版、形式、文字コード、世代の照合を通った解析だけを適用する。
  `EditorDecorations` は既存の表示範囲と前後20行、行長の索引を使って、対象行だけを色ペアでまとめる。
  隣接・重複範囲は既存の正規化に従い、スクロールや分割時に全文や全背景色 DTO を再走査しない。
- `EditorDecorations` は色ペアごと、エディターごとに、`isWholeLine: true` と
  `light.backgroundColor`、`dark.backgroundColor` を持つ VS Code の装飾タイプを利用する。
  対象行の先頭からテキスト末尾までの UTF-16 範囲を標準の全行装飾に渡す。
  VS Code にテーマ切替を任せるため、独自のリスナーや再解析は不要。
  項目装飾と独立したハンドルにすることで、表示可能な項目がなくても行を着色できる。
  新しい表示範囲・解析結果に応じて全色の適用範囲を更新し、不要になった色から範囲を消す。
  同じ形式の再選択では保持したタイプの範囲を消し、他形式への切替・解除・非表示・close・破棄では
  既存のエディター装飾と同じ経路でタイプを破棄する。
- 有色行のカーソル位置の項目と交互項目は、既存の背景色に加えてそれぞれ
  `editor.wordHighlightStrongBorder` の実線と `editor.rangeHighlightBorder` の点線で囲む。
  VS Code の組み込みハイコントラストテーマでは既存の強調色が定義されず、これらの輪郭色が設定される。
  通常の組み込みテーマでは輪郭が透明となる。行背景のない行は既存の項目装飾を使う。

組み込みの行定義は、近い役割に以下の共通色を使う。VS Code 1.100.0 では選択範囲の上に行背景が重なり、
選択文字にテーマの前景色が使われる。通常時と選択時の文字を読めるよう、アルファを `40`（64/255）とする。

| 行の役割       | `light`     | `dark`      |
| -------------- | ----------- | ----------- |
| ヘッダー・管理 | `#5CA5EA40` | `#284B7140` |
| 通常データ     | `#E8B05C40` | `#694F2740` |
| 内訳・補足     | `#A887DD40` | `#46365E40` |
| 小計・トレーラ | `#64BC8040` | `#285B3D40` |
| エンド・総合計 | `#96969640` | `#55555540` |

配色前の定義の行名と、形式内での役割を使い、次の順で最初に該当する役割に分類する。
複数の役割を示す語がある場合は上位の分類を優先する。

1. エンド・総合計（灰）。`エンド`、`終了`、`総合計` を含む行。NTT の `エンドレコード（専用線ID単位）` を含む。
2. 小計・トレーラ（緑）。`トレーラ` または `合計` を含む集計行。全銀の `データ(商業手形割引〔合計〕)`、
   NTT の `電番合計レコード` や `会社別トレーラレコード` を含む。
3. ヘッダー・管理（青）。`ヘッダ` または `管理` を含む行と、請求単位の先頭情報を持つ NTT の `請求単位レコード`。
4. 内訳・補足（紫）。`内訳`、`明細`、`EDI` を含む行と、補足情報を持つ NTT の `割引情報レコード`。
   NTT の `通話明細レコード` と全銀の `データ(EDI)` を含む。
5. 通常データ（橙）。上の分類に該当しない本体・取引データ行。NTT の `データレコード（専用線回線番号単位）` と
   JPX の `レコード` を含む。

VS Code 1.100.0 のテーマ既定値に行背景を sRGB で合成した文字コントラスト比を示す。
各セルは通常時と選択時の順で、小数第2位まで表示する。計算途中では色の値を丸めず、
[通常の文字の目安 4.5:1](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)と
比較した。40通りすべてがこの目安を上回る。

<!-- markdownlint-disable MD013 -->

| テーマ              | ヘッダー・管理 | 通常データ    | 内訳・補足    | 小計・トレーラ | エンド・総合計 |
| ------------------- | -------------- | ------------- | ------------- | -------------- | -------------- |
| Light Modern        | 8.98 / 6.48    | 9.55 / 6.82   | 8.84 / 6.30   | 9.20 / 6.63    | 8.86 / 6.32    |
| Dark Modern         | 9.04 / 5.37    | 8.71 / 5.31   | 9.37 / 5.68   | 8.80 / 5.24    | 8.63 / 5.17    |
| Light High Contrast | 11.66 / 6.42   | 12.41 / 6.27  | 11.48 / 6.85  | 11.94 / 6.30   | 11.51 / 6.86   |
| Dark High Contrast  | 18.72 / 13.71  | 18.29 / 14.10 | 19.12 / 13.37 | 18.40 / 13.98  | 18.21 / 14.21  |

<!-- markdownlint-enable MD013 -->

配色の読みやすさの根拠にはこの計算を用いる。装飾の設定値と更新は模擬ホストのテストで確認する。

### 実装と検証支援のパス

- `src/domain/fixedWidth/projectFields.ts`
- `src/application/fixedWidth/FixedWidthDecoration.ts`
- `src/infrastructure/definitions/loadBuiltInDefinitions.ts`
- `src/resource/definitions/zengin.json`、`src/resource/definitions/jpx.json`、
  `src/resource/definitions/ntt.json`（全行定義への色の追加）
- `package.json`（コンパイルから Qlty の自動起動を外し、品質検査は個別コマンドで実行）
- `src/presentation/vscode/DocumentRenderSession.ts`
- `src/presentation/vscode/EditorDecorations.ts`
- `src/test/extension.test.ts`（行背景の回帰と既存の装飾アサーションの対応）

状態・証跡の追記はこの `TASKS.md` に置く。新規依存、拡張の設定、解除用の定義、CI、既存サンプル、
フィクスチャ、生成物、ロックファイルを変更する作業は対象外。
恒久文書の更新は終了段階で行う。[仕様の対象外](SPECS.md#対象外)も適用する。

### 受け入れ条件と検証

- 定義と解析のテストでは、有効色の読み込み、省略と不正値、同名ルールと複数ルールが一致した場合の順序、
  モードの変更、UTF-16 の短い行、byte 項目の境界不成立、項目定義なしの一致行、空行・空白行・未知行を確認する。
  行背景の有無と既存の長さ・未知行診断が独立していることを、診断設定の有効・無効で確かめる。
- 比較ベースの全銀・JPX・NTT の全38形式・206行定義を、配色前の行名と役割から上の順で分類する。
  形式と行の位置で最終定義と対応付け、206行それぞれの `light`・`dark` が期待する色ペアと一致すること、
  色指定以外の内容が比較ベースの定義と一致することを確認する。
  模擬ホストで、総合振込の5色のペアと全行装飾オプションを確認する。
  行背景と項目装飾の呼び出しを区別して、境界線、区切り、交互色、
  ホバー、カーソル位置の項目強調が維持されることを検証する。
  ハイコントラスト用の輪郭オプションは有色行の交互項目と現在項目に限って適用されることを確認する。
- 模擬ホストで、前後20行の端、重複・離れた複数表示範囲、スクロールによる古い範囲の消去、
  分割間の独立性を確認する。既存の文書読み出し・エンコード回数を観測して解析の再利用を確かめ、
  行番号による取得と全文を走査しない設計を独立レビューでも確認する。
  行の追加・削除、種別・モードの変更、古い非同期結果、同形式の再選択、他形式・解除への切替、
  非表示・再表示、close・破棄で範囲とハンドルが更新されることを確かめる。
- 検証対象の差分を特定し、`npm ci`、`npm exec -- tsc -p . --noEmit`、`npm run compile`、
  `npm exec -- webpack --mode production --devtool false`、`npm run test:prepare`、
  `npm run test:architecture` と [Node でのテスト](#node-でのテスト)を実行する。
  `engines.vscode` が `^1.100.0` のままであることと、両ビルド、両ホストへの依存方向、
  公開コマンド・設定・テレメトリ契約の維持を確認する。
  `npm run compile` が Qlty を自動起動せずに両版をビルドし、`npm run qlty` と `prepackage` の品質検査経路が
  保持されることを、スクリプトの基準との差分と実行結果で確認する。
- [Qlty の品質条件](../../validation.md#品質条件)に従う。基準と最終の入力のそれぞれに対して
  `qlty check --all --sarif --no-fix` と
  `qlty smells --all --sarif --no-snippets` を実行し、
  公式 SARIF、設定・解析パス・対象の識別情報、終了コードを保持して新規・悪化指摘を確認する。
  総合チェック `npm run qlty` を実行し、整形で最終差分が変わった場合は再検証する。
  対象 Markdown、相対リンク・構造、差分空白を検査する。

### Node でのテスト

`npm run test:prepare` の後、既存の模擬ホストを使う5スイートを Node と Mocha で実行する。
テストの読み込み時に `vscode` モジュールだけを空のオブジェクトに置き換え、各テストが用意する
模擬ホストを使う。実行結果と、使用したモジュール置換コードと対象スイートを証跡に残す。

- `out/test/extension.test.js`
- `out/test/encoding.test.js`
- `out/test/encodingSelection.test.js`
- `out/test/encodingLifecycle.test.js`
- `out/test/encodingReloadRace.test.js`

このスライスでは、GUI を起動する実ホストのスモークと目視は対象外とし、Not Applicable と記録する。
両版のビルドと最小対応版の宣言は確認する。既存のホストテストや CI の定義は維持する。

### リスクと停止条件

- 実際の色の合成、選択範囲や診断と重なったときの見え方、テーマ切替時の表示、
  実ホスト固有の互換性は、色の計算・装飾オプションの検査・ビルドだけでは確認できない。
- 表示範囲更新で全文の再処理や色別ハンドルの滞留が生じると、大きな文書や分割表示に影響する。
  実装担当が索引利用と破棄を検証し、独立レビューで確認する。
- 承認パス、色の契約、互換性、責務、依存関係、検証や承認の境界を変える必要があれば、編集前に
  Main に戻して再計画する。

[決定的な失敗の修正ループ](../../validation.md#決定的な失敗の修正ループ)に従う。

## 調査と文書検証

- 改訂計画の R3 はツリー `802d9fd43e82e1bc67b19e46bd2c3bee62c43cdc` に Needs revision と判定した。
  行の役割を独立に判定する優先順と、全5色での選択文字・選択境界の目視手順を追加した。
- 独立レビュー R4 の判定は Ready for approval。
  対象はツリー `201ec27fd5241c884632b9bdeb05d68f9b1a243b`。
  比較ベースの行定義から期待色を独立に求め、38形式・206行の両テーマの色と、色以外の定義が一致した。
  4テーマ・5種の目視手順も確認した。文書検証は次のログに記録した。
  `/tmp/JFixedViewer-row-background-r3-fix.xqvZ1g/validation.log`

- 受付証跡は `/tmp/JFixedViewer-row-background-intake.74pYLv/validation.log`。
- VS Code 1.100.0 の描画側はライト用 CSS を `vs` と `hc-light`、ダーク用 CSS を
  `vs-dark` と `hc-black` に適用する。
  [VS Code 1.100.0 の実装](https://github.com/microsoft/vscode/blob/1.100.0/src/vs/editor/browser/services/abstractCodeEditorService.ts)
- 行全体の装飾とテーマ別オプションの公開契約を確認した。
  [VS Code API](https://code.visualstudio.com/api/references/vscode-api#DecorationRenderOptions)
- VS Code 1.100.0 の組み込みテーマは、強調の背景色をライト・ダークに、対応する輪郭色を
  両ハイコントラストテーマに定義する。
  [カーソル強調用のテーマ色](https://github.com/microsoft/vscode/blob/1.100.0/src/vs/editor/contrib/wordHighlighter/browser/highlightDecorations.ts)、
  [交互項目に使うテーマ色](https://github.com/microsoft/vscode/blob/1.100.0/src/vs/editor/common/core/editorColorRegistry.ts)
- 初回の計画文書検証は `/tmp/JFixedViewer-row-background-plan.ttrYe7/validation.log`。
  `plan-reviewer` の独立レビュー R1 は、初回計画のツリー
  `300d6cf027b57b833803815151e49ef428ff5891` に `Replan required` と判定した。
  VS Code 1.100.0 の Light High Contrast では、旧配色を重ねた選択文字のコントラスト比が
  1.90〜2.03:1 だった。行背景は選択背景より後に描画される一方、選択文字の前景色指定は維持される。
  [描画の登録順](https://github.com/microsoft/vscode/blob/1.100.0/src/vs/editor/browser/view.ts#L201-L207)、
  [描画の連結順](https://github.com/microsoft/vscode/blob/1.100.0/src/vs/editor/browser/view/viewOverlays.ts#L163-L185)、
  [選択文字の前景色](https://github.com/microsoft/vscode/blob/1.100.0/src/vs/editor/browser/viewParts/selections/selections.ts#L400-L404)
- 再計画で総合振込の配色と目視手順を見直した。計算条件、結果、参照元の識別情報と文書検証は
  `/tmp/JFixedViewer-row-background-replan.9G75W6/validation.log` に記録する。
  製品ビルド・ホストテスト・Qlty はスライスで実施する。

- 独立レビュー R2 は検査ツリー
  `64b51a474cb37b29d5cd92884b926ddf0c6d37ba` に対して Ready for approval と判定した。
  レビュー対象の `SPECS.md` は `4517ed2ba717cd97f6ab6e907ad09dabd9efb75e`、
  `TASKS.md` は判定追記前の `6e048394639e8066d43b56ba00f0401e4609e154`。
  4テーマ・3種別の通常時と選択時を独立に再計算し、計画の結果と一致した。
- 現在の HEAD は改訂計画コミット `921f346d9f9e1d52d38d3e148356c1164730c40d`、親は当初計画
  `c08455a05ad32383008a095bb714d079e5788c16`、比較ベースは
  `64f09ff622a6719776e590be47967def9c3da4b4`。製品・テスト変更と本記録は未コミット。
  製品の変更パスは `package.json`、`src/application/fixedWidth/FixedWidthDecoration.ts`、
  `src/domain/fixedWidth/projectFields.ts`、`src/infrastructure/definitions/loadBuiltInDefinitions.ts`、
  `src/presentation/vscode/DocumentRenderSession.ts`、`src/presentation/vscode/EditorDecorations.ts`、
  `src/resource/definitions/{jpx,ntt,zengin}.json`、`src/test/extension.test.ts`。
  独立実装レビュー R3 時点の HEAD `921f346d9f9e1d52d38d3e148356c1164730c40d` からの
  binary diff SHA-256（製品とテストの10パス）は
  `d6136175e65cd04af424cad85eafd4c25890cdbcf564211d2595282b3089f4eb`。
  未追跡の `.serena/` は作業範囲外で、このスライス差分に含めない。
- 実装には解析時の行背景 DTO、色ペア検証、表示範囲に応じた行装飾、カーソル・交互項目の輪郭線、
  38形式・206行の配色、既存挙動の回帰テスト、compile 時の Qlty 自動起動削除を含む。
  組み込み JSON は色以外の内容が比較ベースと一致し、206行すべてに有効な色ペアがあり、重複キーはない。
  既存の色装飾ハンドルを1回の描画更新で二重に設定していた呼び出しを1回にし、同色・同範囲の再描画ごとに
  色別ハンドルを1度だけ設定するテストを追加した。表示の色や適用範囲は変えない局所的な負荷改善。
- 更新後の実装・テストを `/tmp/JFixedViewer-row-background-final.TY9Hdf` に反映して検証した。
  `npm exec -- tsc -p . --noEmit`、`npm run compile`（Desktop/Web）、
  `npm run test:prepare` は通過。
  `npm run test:architecture` は 7/7 通過。`mock-vscode.cjs` による Node/Mocha 模擬ホストで
  `extension.test.js` は、レビュー指摘に対応した直接アサーション追加後も34 passing
  （ログ `/tmp/jfixedviewer-row-background-findings.mock.log`）。
  総合振込5色、全組み込み行の配色、表示範囲・スクロール・分割・編集・切替、装飾破棄を含む。
  独立実装レビューは行背景を直接検査するテストの不足を Findings と判定した。
  修正前の差分 SHA-256 は `ab241352713c5e7b174632e48d960ceab4d124d533f78094bb41906615488771`。
  指摘された直接検査を既存テストに追加した。モード別行選択と
  色の有無、byte境界不成立時の色、前後20行・範囲端・重複/離れた表示範囲、行挿入・削除、
  失効した非同期結果、なし/なし解除、非表示後の再表示、close/dispose 後の装飾ハンドル、
  無色行の cursor/alternating 輪郭を確認する。
  再レビュー後、同一文書でモードを有効・不正・有効に編集し、後続行背景が消えて戻る検査も追加した。
  独立実装レビュー R3 で製品・テストの指摘解消を確認した。必須検証証跡の不足により判定は Findings。
  更新後 `npm exec -- tsc -p . --noEmit` と `npm run compile-tests` は通過。
  これらは実 VS Code の自動テストや全目視を代替しない。
- 使い捨てスナップショット `/tmp/jfixedviewer-sdd-final.nCsHjy` では、ロックファイルとキャッシュからの
  `npm ci --offline` と本番 Webpack ビルドが通過した。Web には基準でも出るサイズ警告3件が残る。
  `npm-ci.log` と `production.log` を参照。回帰テスト追記後も製品コードと依存関係は同一。
- 同じスナップショットで Desktop 安定版と `test:desktop:min`（VS Code 1.100.0）を再試行した。
  いずれもテスト開始前に `SIGABRT` で終了した。`desktop.log` と `desktop-min.log` を参照。
  1.100.0 の GUI は起動したが、検証用フォルダーの信頼確認で止めたため、表示は未確認。
- Web の `test:web` は Chromium 起動時の macOS
  `bootstrap_check_in Permission denied (1100)` で停止した
  （`/tmp/jfixedviewer-web-check.QO1wp4/web-host.log`）。別途、Main が VS Code Web 1.147.0
  commit `8a14f0cc1b08d531eb83255ea3764ae22aa932b5` を起動し、localhost の組み込みブラウザーで
  総合振込の5色を Light Modern、Dark Modern、Light High Contrast、Dark High Contrast で確認した。
  DOM の computed CSS は両モード5色の RGB と alpha `0.25` が定義と一致した
  （light: `92,165,234` / `232,176,92` / `168,135,221` / `100,188,128` / `150,150,150`、
  dark: `40,75,113` / `105,79,39` / `70,54,94` / `40,91,61` / `85,85,85`）。
  起動は `--browserType=none --host=127.0.0.1 --port=38117` の手動確認で、
  変更前スナップショット `/tmp/jfixedviewer-web-check.QO1wp4` を使用し、自動 `test:web` ではない。
  この4テーマの確認は二重呼び出し修正前であり、色・範囲の描画は同じだが、最終入力でのホスト目視ではない。
  選択範囲、診断、表示モード、編集・分割と解除を含む残りの目視は Missing。
  標準 `npm run test:web` は起動制限があり、Desktop 自動 test も未実行。
- その後、最終製品差分と package-lock が一致する `/tmp/jfixedviewer-web-smoke.eQ6wsH` で
  `npm run test:prepare`、`npm run compile`（Desktop/Web）、`npm run test:architecture`（7/7）が通過した。
  `@vscode/test-web` の `createApp` 経路で VS Code Web 1.147.0 の既存 `smoke.js` を
  IAB Chromium の `http://localhost:38119` から実行し、標準 `codeAutomationExit` が 0 を返した。
  Chromium の別起動による手順であり、通常の `npm run test:web` 起動失敗と区別して Web smoke PASS とする。
  この確認は最終差分と一致するスナップショットを使い、製品・テストソースを追加変更していない。
- デスクトップの VS Code 1.147.0 を GUI から起動し、開発ホストで総合振込のサンプルを確認した。
  Shift JIS で表示され、5種の背景色と項目境界を目視できた。ダークテーマから Light Modern を
  一時プレビューすると、形式の再選択をせずに行背景が切り替わった。確認後はプレビューを解除した。
  これは二重描画呼び出しの局所修正前の入力による観察。
- Qlty は `qlty --version`、`qlty check --all --sarif --no-fix`、
  `qlty smells --all --sarif --no-snippets` が初期ログの rolling appender 作成時に
  `PermissionDenied`、終了コード 101 で停止し、SARIF を生成しなかった。`QLTY_LOG_STDERR=1` と
  `/tmp` の XDG cache/state/data/config への指定でも同じ結果
  （出力 `/tmp/jfixedviewer-qlty-check.log`、`/tmp/jfixedviewer-qlty-smells.log`）。
  集約コマンド `npm run qlty` も同じ初期ログのエラーで停止した。
  `/tmp/jfixedviewer-sdd-final.nCsHjy/qlty-aggregate.log` を参照。
  `package.json` の変更は compile からの自動起動の削除に限る。
- 最新の `SPECS.md` と `TASKS.md` は `markdownlint-cli2` 0.22.0 /
  `markdownlint` 0.40.0 で lint 通過し、
  `git diff --check 64f09ff622a6719776e590be47967def9c3da4b4` も通過。
  Desktop の自動テスト、所定の目視、Qlty の SARIF が不足するため `SLICE_READY` は保留する。
- 残りの検証用に `/tmp/jfixedviewer-sdd-check.M8vcZY` の `base` と `final` に使い捨て環境を用意した。
  両方で `npm ci --offline` が通過し、`final` で最新差分を確認して `npm run test:prepare` が通過した。
- ワークスペースの書き込み許可後に、この環境で残りのコマンドを再試行した。Desktop 安定版と
  最小対応版はテスト開始前の `SIGABRT` でともに終了コード1。
  `desktop-retry.log`、`desktop-min-retry.log` を参照。最小対応版の GUI は `final` を制限モードで開いた。
  Qlty は両ツリーの `check` と `smells` がすべて終了コード101で、SARIF 出力は空だった。
  `base-check.log`、`base-smells.log`、`final-check.log`、`final-smells.log` を参照。
  `npm run qlty` も同じ初期ログの権限エラーで止まった。`qlty-retry.log` を参照。
- 2026-11-21 の再開後、Qlty の初期ログを使い捨て環境に出し、公式 `smells` で基準0件、
  導入差分7件を確認した。実装担当が承認済みの `EditorDecorations.ts` と `extension.test.ts` で
  描画とテストの分岐を整理した。検証対象や設定、実装の範囲は維持した。修正後の HEAD からの
  製品・テスト差分 SHA-256 は `bbf667dc29b594fa9bbf8d7634186809c054e6c72ec61510332c84ec6fb8a5dc`。
- 修正後の証跡は `/tmp/jfixedviewer-row-qlty-r4.8W9yhI` にある。Qlty 0.645.0 の
  `smells --all --sarif --no-snippets` は基準と最終で共通の39ファイルを解析し、いずれも終了コード0、
  指摘0件。公式 SARIF 2.1.0、対象一覧、設定と入力のハッシュを保持した。
  `check --all --sarif --no-fix` は共通キャッシュへのロック書き込みが許可されず終了コード99で、
  両入力の SARIF が空。`npm run qlty` は `qlty:fmt` が終了コード99で停止し集約結果は1。
  型検査、Desktop/Web ビルド、本番ビルド、テスト準備、アーキテクチャ7件、模擬ホスト34件、
  変更したパスに対する Prettier と ESLint の直接検査は通過した。
- 修正後の標準 Desktop 自動テストは安定版、1.100.0 とも、起動時に `SIGABRT` で終了コード1。
  代替の GUI 開発ホスト（1.147.0）は既存ランナーの6ファイルを実行し、58件中57件が通過した。
  残る既存スモークは、引き継がれたプロファイルの `jfixedviewer.boundaryStyle` が `marker` で、
  既定値 `line` の確認に失敗した。1.100.0 を指定した GUI 起動も実際には1.147.0で実行された。
  実行結果は `desktop-gui-runner.json` と `desktop-gui-minimum-attempt.json` に、
  ビルド結果は `desktop-gui-prepare.log` にある。
  Web 目視のローカルサーバーはループバックの listen が `EPERM` で停止した。
  修正後の Web 実ホスト試験と、各ホストの所定の目視は Missing。
- 独立実装レビュー R4 は、上記の修正後の差分 SHA-256 を照合した。全38形式・206行の配色、
  色以外の定義と既存テストの維持、レイヤー境界、
  表示行の索引参照、装飾の保持・破棄、Qlty `smells` の7件解消を確認した。
  製品・テストの追加指摘はなかった。Qlty `check` と集約、および確定差分の実ホスト試験と目視を
  証跡の指摘とし、判定は Findings（`IMPLEMENTED`）とした。
- 利用者の指示に従い、`codex/record-row-background` の既存チェックアウトで作業を再開した。
  承認済みの `precompile` 削除を再反映し、製品・テスト差分が R4 の SHA-256 と一致することを確認した。
  同ブランチで `npm run compile`、`npm run test:prepare`、`npm run test:architecture`（7件）は通過。
  Desktop 安定版は起動時に `SIGABRT`、最小対応版はキャッシュに実行ファイルがなく `ENOENT`、
  Web は配布元の名前解決が `ENOTFOUND` となり、いずれもテスト開始前に停止した。
- 同じブランチのビルドを使い、既存の配布物キャッシュを指定して最小対応版と Web を再試行した。
  VS Code 1.100.0 は実行ファイルを読み込んだ後に `SIGABRT` で終了した。
  Web は VS Code 1.147.0 の配布物を取得済みの状態で開始したが、ループバックの待ち受けが
  `EPERM` となり、Chromium も権限エラーで終了した。ランナーは終了コード0を返したが、
  テスト結果は出力されなかったため Pass と扱わない。
- 同ブランチで標準の `qlty check --all --sarif --no-fix` を再実行した。
  共有ディレクトリへのログ作成が `PermissionDenied` となり終了コード101、SARIF は空だった。
  生ログと入力の識別情報は `/tmp/jfixedviewer-row-qlty-r4.8W9yhI` の
  `checkout-standard-check` で始まるファイルにある。
- 利用者の指示に従い、GUI を起動せず既存ブランチでテストコードによる検証を行った。
  型検査とテスト準備は通過。アーキテクチャ検査は7件、模擬ホストは5スイートの57件がすべて通過。
  実ホストのスモークと目視は今回の実行対象外。製品・テスト差分は R4 の SHA-256 と一致した。
  出力と終了コードは同じ証跡ディレクトリの `checkout-no-gui-` で始まるファイルにある。
- 実装候補の既存結果は、最終差分と検査内容、コマンド、設定、依存、ツール、検証範囲、比較ベースが一致し、
  ログと入力の識別情報を参照できる項目に限って再利用する。変更で影響を受ける項目と検証範囲内の
  Missing は実装段階で検証する。[証跡の有効性](../../evidence.md#証跡の有効性)に従う。

## 機能の終了判定

- 最上位の PR と、機能フォルダー外から参照できる終了証跡に、受け入れ結果、正確な識別情報、
  独立レビュー、承認、両版のビルドとテストコードの結果、GitHub の最新ヘッドのチェックを保持する。
  Main はマージ結果を確認してから `CLOSED` を記録する。残るリスクがあれば担当を記録する。
- 終了差分で、利用者向けの変更記録と必要な恒久記述を更新する。
  - `CHANGELOG.md`（未リリースの項目に対応形式とテーマ追従を記載）
  - `README.md`（機能一覧に全銀・JPX・NTT の行背景色を記載）
  - `docs/requirements/use-cases/uc-display-fixed-width.md`（色の表示ルールと対象レコード）
  - `docs/requirements/use-cases/uc-switch-editors.md`（分割、表示範囲、再表示と更新）
  - `docs/requirements/use-cases/uc-clear-decorations.md`（解除時の行背景色の消去）
  - `docs/specs/architecture.md`（解析時の行背景 DTO、共有索引、エディターごとの装飾の寿命）
- 終了承認の対象に、終了コミットで削除する次の2文書も含める。
  - `docs/specs/features/record-row-background/SPECS.md`
  - `docs/specs/features/record-row-background/TASKS.md`
- 終了差分の独立レビューと、変更した Markdown の lint・相対リンク・構造・差分空白検査を行う。
  有効なスライスの証跡を再利用し、終了コミット後は最新の GitHub チェックと照合する。

[機能の終了判定](../../README.md#機能の終了判定)に従う。
