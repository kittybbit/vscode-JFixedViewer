# レコード種別ごとの行背景色の計画

## 作業概要

- 標準テキストエディターで、レコード種別を行全体の背景色で見分けられるようにする。
  [仕様](SPECS.md)の受け入れ条件を1スライスで満たす。
- 定義、解析、描画と、全銀・JPX・NTT の配色を一緒に届ける。各変更をそろえることで実サンプルで表示を確認できる。
- [アーキテクチャ](../../architecture.md)、[検証方針](../../validation.md)、
  [証跡方針](../../evidence.md)に従う。

## 現在の状態

- 機能とスライス1の改訂計画は独立レビュー R4 と利用者の承認を経て `PLAN_APPROVED`。
  完了済みのスライスはない。
- 当初計画は `c08455a05ad32383008a095bb714d079e5788c16` としてコミット済みで、親と比較ベースは
  `64f09ff622a6719776e590be47967def9c3da4b4`。以前記録した `.git/index.lock` の書き込み失敗は
  この計画コミットで解消済み。
- 2026-11-21 の追加ユーザー指示で、全銀・JPX・NTT の38形式・206行への配色、近い役割への共通色、
  および `npm run compile` の修正が追加された。当初の R2 レビューと計画承認は当初計画に適用する。
- 配色方式はファイル定義 JSON の `light` / `dark` 別の RGB 指定を採用する。
- 作業ツリーの製品・テスト差分は未コミットの実装候補。改訂計画文書をコミットした後に作業を再開する。
  ホスト実行と Qlty の必須証跡の不足は[調査と文書検証](#調査と文書検証)を参照。

[ライフサイクル状態](../../README.md#ライフサイクル状態)に従う。

## GitHub スタック

- 取り込み先は `main`。スライス1のPRのみを作り、対象は `main`、ヘッドブランチは
  `codex/record-row-background`。比較ベースは `64f09ff622a6719776e590be47967def9c3da4b4`。
- 当初計画コミットは `c08455a05ad32383008a095bb714d079e5788c16`、親と比較ベースは
  `64f09ff622a6719776e590be47967def9c3da4b4`。計画コミットには `SPECS.md` と `TASKS.md` のみを含む。
- 再計画は当初計画コミットを親とし、`SPECS.md` と `TASKS.md` のみを含める。
  スライス1の実装候補は未コミット。スライスの完了コミットと PR URL は未確定。
  完了承認と完了コミットの直後に Main が PR を公開し、ベース・ヘッド・差分・PR URL を記録する。
  同じ PR の最上位ヘッドに終了差分を含める。
- 終了判定に進む前と終了コミット後に、Main が最新ヘッドの Verify、CodeQL の解析対象との対応、
  必須チェック、適用される Qlty Cloud の結果を確認する。終了承認とマージ承認を個別に得る。
  Main はマージ前に方式と対象 SHA を確定し、マージ後に `main` の取り込み SHA を終了証跡に記録する。

[GitHub 標準のスタック PR](../../README.md#github-標準のスタック-pr)に従う。

## 人による承認

- 当初計画 `Approved`。利用者がレビュー済みの当初計画を `c08455a05ad32383008a095bb714d079e5788c16`
  としてコミットした。独立レビュー R2 の対象と判定は[調査と文書検証](#調査と文書検証)を参照する。
- 改訂計画 `Approved`。独立レビュー R4 後に利用者が明示的に承認した。
  対象はこの2文書と、[実装と検証支援のパス](#実装と検証支援のパス)に列挙したスライス1の範囲。
  承認時点の文書 blob は `1426f7b7bc2e14faec861b684cae5cd3d2211a6a` と
  `bf324a389722bd8c23379a4c00d61d2eeb30f8e0`。承認記録の追記のみで計画の内容に変更はない。
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

| 行の役割 | `light` | `dark` |
| -------- | ------- | ------ |
| ヘッダー・管理 | `#5CA5EA40` | `#284B7140` |
| 通常データ | `#E8B05C40` | `#694F2740` |
| 内訳・補足 | `#A887DD40` | `#46365E40` |
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

| テーマ | ヘッダー・管理 | 通常データ | 内訳・補足 | 小計・トレーラ | エンド・総合計 |
| ------ | -------------- | ---------- | ---------- | -------------- | -------------- |
| Light Modern | 8.98 / 6.48 | 9.55 / 6.82 | 8.84 / 6.30 | 9.20 / 6.63 | 8.86 / 6.32 |
| Dark Modern | 9.04 / 5.37 | 8.71 / 5.31 | 9.37 / 5.68 | 8.80 / 5.24 | 8.63 / 5.17 |
| Light High Contrast | 11.66 / 6.42 | 12.41 / 6.27 | 11.48 / 6.85 | 11.94 / 6.30 | 11.51 / 6.86 |
| Dark High Contrast | 18.72 / 13.71 | 18.29 / 14.10 | 19.12 / 13.37 | 18.40 / 13.98 | 18.21 / 14.21 |

<!-- markdownlint-enable MD013 -->

行背景5色の区別、選択範囲と周囲の区別、交互項目・カーソル強調・診断と重なった文字の読みやすさは、
この計算に加えて実ホストで確認する。

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
フィクスチャ、生成物、ロックファイルを変更する作業は対象外。既存の実ホストスモークを再利用する。
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
- 固定したリビジョンの使い捨てスナップショットで `npm ci`、`npm exec -- tsc -p . --noEmit`、
  `npm run compile`、
  `npm exec -- webpack --mode production --devtool false`、`npm run test:prepare`、
  `npm run test:architecture`、`npm run test:desktop`、`npm run test:desktop:min`、
  `npm run test:web` を実行する。必要に応じて Chromium と表示サーバーを用意する。
  `engines.vscode` が `^1.100.0` のままであることと、両ビルド、両ホストへの依存方向、
  公開コマンド・設定・テレメトリ契約の維持を確認する。
  `npm run compile` が Qlty を自動起動せずに両版をビルドし、`npm run qlty` と `prepackage` の品質検査経路が
  保持されることを、スクリプトの基準との差分と実行結果で確認する。
- [Qlty の品質条件](../../validation.md#品質条件)に従う。基準と最終の使い捨てスナップショットで
  `qlty check --all --sarif --no-fix` と
  `qlty smells --all --sarif --no-snippets` を実行し、
  公式 SARIF、設定・解析パス・対象の識別情報、終了コードを保持して新規・悪化指摘を確認する。
  総合チェック `npm run qlty` も使い捨て環境で実行し、承認パスに反映した整形があれば
  実際の最終差分を再検証する。対象 Markdown、相対リンク・構造、差分空白を検査する。

### 実ホストの目視手順

1. 最終スナップショットで `npm run test:prepare` を実行し、`out/smoke-extension` を使う。
   デスクトップは安定版の拡張開発ホストにこのパスを渡す。Web は同じスナップショットで以下を実行する。
   用意したデスクトップ 1.100.0 でも同じ拡張開発パスで手順2・3を確認する。

   ```sh
   npm exec -- vscode-test-web --browserType=chromium --quality=stable \
     --extensionDevelopmentPath=out/smoke-extension .
   ```

2. [総合振込のサンプル](../../../../sample/zengin/50200121.sougou_furikomi.dat)を開き、
   `JFixedViewer: 固定長のファイル形式を選択` から `全銀協規定形式/総合振込` を選ぶ。
   文字コードの再読込が必要なら未編集の状態で選択を完了させる。
   エディターを広げ、ヘッダー、データ、データ (EDI)、トレーラ、エンドの5色が行末の右まで続くことを確認する。
3. 同じ文書を開いたまま、Light Modern、Dark Modern、Light High Contrast、
   Dark High Contrast の組み込みテーマを順に切り替える。形式の再選択や文書の再読込なしに色が更新され、
   5色の違いと通常時の文字が見えることを確認する。各テーマでヘッダー、データ、データ (EDI)、
   トレーラ、エンドの全5種について項目の一部を選択し、選択文字と選択範囲の境界を見分けられることを確かめる。
   各テーマで `line`、`marker`、`alternating` の表示を切り替え、行背景の上でそれぞれを見分ける。
   `alternating` では全5種で交互項目を見分けられることを確認し、カーソルを動かして現在項目の強調とホバーを確認する。
4. 安定版デスクトップと Web でサンプルの作業用コピーを使い、データ行を増やして文書を分割する。
   片方を先頭、もう片方を末尾までスクロールし、両方で該当する行種別が着色されることを確認する。
   トレーラを `8` だけに短縮し、着色と行長診断を確認する。未知の種別に変えて背景が消え診断が
   更新されること、種別を戻して診断を無効にすると背景が残ることを確認する。行の追加・削除の後、
   隠して再表示し、別形式に切り替え、最後に `なし/なし` を選んで両表示の残像がないことを確認する。
5. 検査した入力、各ホストとブラウザーのバージョン、テーマ名、設定、観察結果、画面の証跡を
   保存する。自動テストと手順2〜4の目視結果を個別に記録する。目視を実施できない場合は
   対象ホストと不足する観察を Missing として Main に返す。

### リスクと停止条件

- 行背景と既存の強調の重なりはテーマと描画ホストに依存する。実装担当が目視し、
  仕様と配色の範囲で確認できない場合は Main に戻す。
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
- 実装候補は比較ベース `64f09ff622a6719776e590be47967def9c3da4b4` からの未コミット変更。
  解析 DTO、色ペア検証、行背景の VS Code 描画、強調線の分離、38形式・206行の組み込み配色、
  回帰テスト、`package.json` の compile 起動経路を含む。JSON は色プロパティを除き計画時の内容と一致し、
  206行すべてに有効な色ペアがあり重複キーはない。
- 使い捨てスナップショット `/tmp/JFixedViewer-row-background-final.TY9Hdf` で
  型検査 `npm exec -- tsc -p . --noEmit` と `npm run compile`（Desktop/Web）が通過した。
  `npm run test:prepare` も通過した。
  `npm run test:architecture` は 7/7 通過。Node/Mocha 模擬 VS Code ホストで
  `extension.test.js` は 34 passing（ログ `/tmp/jfixedviewer-web-check.QO1wp4/mock-test.log`）。
  これらは実 VS Code ホストでの統合実行を代替しない。
- 実ホストの自動試験はテスト開始前に停止した。キャッシュ済み Desktop ホストは実行ファイルがなく
  `Electron ENOENT`。`/Applications/Visual Studio Code.app/Contents/MacOS/Code` を指定した安定版試行と、
  `test:desktop:min` の VS Code 1.100.0 試行はいずれも `SIGABRT`。
  Web は Chromium の起動時に macOS `bootstrap_check_in Permission denied (1100)` で停止した
  （ログ `/tmp/jfixedviewer-web-check.QO1wp4/desktop-host.log`、`web-host.log`）。
  最小対応版と Web の目視、および選択範囲や診断などとの重なりを含む手順2〜4の全項目は未確認。
- デスクトップの VS Code 1.147.0 を GUI から起動し、開発ホストで総合振込のサンプルを確認した。
  Shift JIS で表示され、5種の背景色と項目境界を目視できた。ダークテーマから Light Modern を
  一時プレビューすると、形式の再選択をせずに行背景が切り替わった。確認後はプレビューを解除した。
- Qlty は CLI の初期ログ作成時に `PermissionDenied`、終了コード 101 となり、SARIF を取得できなかった。
  `package.json` の変更は `compile` からの自動起動を外したもので、Qlty CLI 自体の障害を解消していない。
  計画文書2件の Markdown lint と差分の空白チェックは通過した。
  実ホストと Qlty の必須証跡が欠けるため、完了判定と `SLICE_READY` は保留する。
- 実装候補の既存結果は、最終差分と検査内容、コマンド、設定、依存、ツール、検証範囲、比較ベースが一致し、
  ログと入力の識別情報を参照できる項目に限って再利用する。変更で影響を受ける項目と Missing は実装段階で
  検証し、GUI で未確認の項目も記録する。[証跡の有効性](../../evidence.md#証跡の有効性)に従う。

## 機能の終了判定

- 最上位の PR と、機能フォルダー外から参照できる終了証跡に、受け入れ結果、正確な識別情報、
  独立レビュー、承認、各ホストの検証、GitHub の最新ヘッドのチェックを保持する。
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
