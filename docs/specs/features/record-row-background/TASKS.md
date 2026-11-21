# レコード種別ごとの行背景色の計画

## 作業概要

- 標準テキストエディターで、レコード種別を行全体の背景色で見分けられるようにする。
  [仕様](SPECS.md)の受け入れ条件を1スライスで満たす。
- 定義、解析、描画、総合振込の配色を一緒に届ける。各変更をそろえることで実サンプルで表示を確認できる。
- [アーキテクチャ](../../architecture.md)、[検証方針](../../validation.md)、
  [証跡方針](../../evidence.md)に従う。

## 現在の状態

- 機能とスライス1のライフサイクル状態は `PLAN_APPROVED`。
- 独立レビュー R2 で Ready for approval。2026-11-21 の利用者の続行指示を、
  Main がレビュー済み計画とスライス1の計画承認として記録した。
- 計画コミット時に `.git/index.lock` の作成が環境の書き込み制限で失敗した。
  計画コミットが実装の開始条件であるため、実装は未着手。
- 受付と計画の証跡は[調査と文書検証](#調査と文書検証)に記録する。

[ライフサイクル状態](../../README.md#ライフサイクル状態)に従う。

## GitHub スタック

- 取り込み先は `main`。スライス1のPRのみを作り、対象は `main`、ヘッドブランチは
  `codex/record-row-background`。比較ベースは `64f09ff622a6719776e590be47967def9c3da4b4`。
- 調査に用いたローカルのリビジョンは `04b27dc1a5e9c2035886217fc89297d57f571ffc`。
  共通祖先 `a5f31fa9a3641ab52373aea958f00ea2ecac096f` からの両差分は、
  Main が比較した19パスとそれぞれの blob が一致する。計画コミット前に正確な `main` を親にする。
- 計画コミット、スライスのヘッド SHA と PR URL は未確定。完了承認と完了コミットの直後に Main が
  PR を公開し、ベース・ヘッド・差分・PR URL を記録する。同じ PR の最上位ヘッドに終了差分を含める。
- 終了判定に進む前と終了コミット後に、Main が最新ヘッドの Verify、CodeQL の解析対象との対応、
  必須チェック、適用される Qlty Cloud の結果を確認する。終了承認とマージ承認を個別に得る。
  Main はマージ前に方式と対象 SHA を確定し、マージ後に `main` の取り込み SHA を終了証跡に記録する。

[GitHub 標準のスタック PR](../../README.md#github-標準のスタック-pr)に従う。

## 人による承認

- 計画 `Approved`。2026-11-21 に利用者が本ブランチの機能の続行を指示し、Main が承認と判断した。
  対象はこの `SPECS.md` と `TASKS.md`、およびスライス1に列挙した実装・検証支援の7パスと状態・証跡の追記。
  独立レビュー R2 の対象と判定は[調査と文書検証](#調査と文書検証)を参照する。
  承認前の文書 blob は `4517ed2ba717cd97f6ab6e907ad09dabd9efb75e` と
  `4bc7e58dae4a337ae90c44b3b42caee311751c38`。実質的な計画変更はない。
  現在の HEAD と `main` はともに比較ベース `64f09ff622a6719776e590be47967def9c3da4b4`。
  計画コミットは環境の書き込み制限により未実施。
- スライス1の完了 `Pending`。対象候補は列挙したスライスのパスと、状態・証跡の追記。
  実装の独立レビュー判定、承認結果、完了コミットは未確定。
- 終了 `Pending`。対象候補は[終了時の反映・削除](#機能の終了判定)のパス。
  終了判定、終了差分の独立レビュー判定、承認結果、終了コミットは未確定。
- マージ `Pending`。対象候補はスライス1の PR から `main` への取り込み。
  終了時のベース・ヘッド、マージ方式、最新のチェック、承認結果、マージ結果は未確定。

[人による承認](../../README.md#人による承認)に従う。

## スライス1. 行定義の背景色を表示する

### 価値と依存関係

総合振込でヘッダー、トレーラ、エンドが一目で判別できる。診断の設定にかかわらず、短い行にも
一致した行定義の背景色を表示する。データ行と背景色の設定がない組み込み形式では既存の表示を保つ。
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

総合振込は以下の色を使う。VS Code 1.100.0 では選択範囲の上に行背景が重なり、
選択文字にテーマの前景色が使われる。通常時と選択時の文字を読めるよう、アルファを `40`（64/255）とする。

| 行定義 | `light` | `dark` |
| ------ | ------- | ------ |
| ヘッダー | `#5CA5EA40` | `#284B7140` |
| トレーラ | `#64BC8040` | `#285B3D40` |
| エンド | `#96969640` | `#55555540` |

VS Code 1.100.0 のテーマ既定値に行背景を sRGB で合成した文字コントラスト比を示す。
各セルは通常時と選択時の順で、小数第2位まで表示する。計算途中では色の値を丸めず、
[通常の文字の目安 4.5:1](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)と
比較した。24通りすべてがこの目安を上回る。

| テーマ | ヘッダー | トレーラ | エンド |
| ------ | -------- | -------- | ------ |
| Light Modern | 8.98 / 6.48 | 9.20 / 6.63 | 8.86 / 6.32 |
| Dark Modern | 9.04 / 5.37 | 8.80 / 5.24 | 8.63 / 5.17 |
| Light High Contrast | 11.66 / 6.42 | 11.94 / 6.30 | 11.51 / 6.86 |
| Dark High Contrast | 18.72 / 13.71 | 18.40 / 13.98 | 18.21 / 14.21 |

行背景3色の区別、選択範囲と周囲の区別、交互項目・カーソル強調・診断と重なった文字の読みやすさは、
この計算に加えて実ホストで確認する。

### 実装と検証支援のパス

- `src/domain/fixedWidth/projectFields.ts`
- `src/application/fixedWidth/FixedWidthDecoration.ts`
- `src/infrastructure/definitions/loadBuiltInDefinitions.ts`
- `src/resource/definitions/zengin.json`（`sougou_furikomi` の3行定義への色の追加）
- `src/presentation/vscode/DocumentRenderSession.ts`
- `src/presentation/vscode/EditorDecorations.ts`
- `src/test/extension.test.ts`（行背景の回帰と既存の装飾アサーションの対応）

状態・証跡の追記はこの `TASKS.md` に置く。新規依存、拡張の設定、他の定義、CI、既存サンプル、
フィクスチャ、生成物、ロックファイルを変更する作業は対象外。既存の実ホストスモークを再利用する。
恒久文書の更新は終了段階で行う。[仕様の対象外](SPECS.md#対象外)も適用する。

### 受け入れ条件と検証

- 定義と解析のテストでは、有効色の読み込み、省略と不正値、同名ルールと複数ルールが一致した場合の順序、
  モードの変更、UTF-16 の短い行、byte 項目の境界不成立、項目定義なしの一致行、空行・空白行・未知行を確認する。
  行背景の有無と既存の長さ・未知行診断が独立していることを、診断設定の有効・無効で確かめる。
- 模擬ホストで、総合振込の3色のペアと全行装飾オプション、データ・データ (EDI) と他の組み込み形式に
  背景色がないことを確認する。行背景と項目装飾の呼び出しを区別して、境界線、区切り、交互色、
  ホバー、カーソル位置の項目強調が維持されることを検証する。
  ハイコントラスト用の輪郭オプションは有色行の交互項目と現在項目に限って適用されることを確認する。
- 模擬ホストで、前後20行の端、重複・離れた複数表示範囲、スクロールによる古い範囲の消去、
  分割間の独立性を確認する。既存の文書読み出し・エンコード回数を観測して解析の再利用を確かめ、
  行番号による取得と全文を走査しない設計を独立レビューでも確認する。
  行の追加・削除、種別・モードの変更、古い非同期結果、同形式の再選択、他形式・解除への切替、
  非表示・再表示、close・破棄で範囲とハンドルが更新されることを確かめる。
- 固定したリビジョンの使い捨てスナップショットで `npm ci`、`npm exec -- tsc -p . --noEmit`、
  `npm exec -- webpack --mode production --devtool false`、`npm run test:prepare`、
  `npm run test:architecture`、`npm run test:desktop`、`npm run test:desktop:min`、
  `npm run test:web` を実行する。必要に応じて Chromium と表示サーバーを用意する。
  `engines.vscode` が `^1.100.0` のままであることと、両ビルド、両ホストへの依存方向、
  公開コマンド・設定・テレメトリ契約の維持を確認する。
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
   エディターを広げ、ヘッダー・トレーラ・エンドの3色が行末の右まで続き、データ・データ (EDI) には
   行背景が付かないことを確認する。
3. 同じ文書を開いたまま、Light Modern、Dark Modern、Light High Contrast、
   Dark High Contrast の組み込みテーマを順に切り替える。形式の再選択や文書の再読込なしに色が更新され、
   3色の違いと通常時の文字が見えることを確認する。各テーマでヘッダー、トレーラ、エンドの項目を選択し、
   選択文字が読め、選択部分と周囲を見分けられることを確かめる。カーソルを移動し、
   現在項目の強調とホバーが見えることも確認する。
   各テーマで `line`、`marker`、`alternating` の表示を切り替え、行背景の上でそれぞれを見分ける。
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

## 機能の終了判定

- 最上位の PR と、機能フォルダー外から参照できる終了証跡に、受け入れ結果、正確な識別情報、
  独立レビュー、承認、各ホストの検証、GitHub の最新ヘッドのチェックを保持する。
  Main はマージ結果を確認してから `CLOSED` を記録する。残るリスクがあれば担当を記録する。
- 終了差分で、利用者向けの変更記録と必要な恒久記述を更新する。
  - `CHANGELOG.md`（未リリースの項目に総合振込とテーマ追従を記載）
  - `README.md`（機能一覧に総合振込の行背景色を記載）
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
