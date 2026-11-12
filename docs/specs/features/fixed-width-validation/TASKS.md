# 固定長レコード検証の計画

## 作業概要

- [仕様](SPECS.md)の R1〜R8 を1スライスで実現する。現在は `PLAN_APPROVED`、実装は未着手。
- レコード長、N 型の文字種、未知のレコードを、選択済みで表示中の文書の「問題」に示す。
- 必読文書は [SDD 方針](../../README.md)、[検証方針](../../validation.md)、
  [証跡方針](../../evidence.md)、[アーキテクチャ](../../architecture.md)。
- 独立計画レビューは指摘0件で通過。次は Main が計画をコミットし、実装担当へ渡す。

## 現在の状態

- ライフサイクル状態 `PLAN_APPROVED`、担当 Main、記録の版 `plan-main-v1`、作成日 2026-11-12。
- 正確なベース `37d6ab7965266d30526e1590e93ecdf4f544cb20`、ブランチ `codex/fixed-width-validation`。
- 無関係な未追跡 `.serena/` は対象外。改名なし。計画文書以外の変更なし。
- Main は N 型で全 SP を許容し、C・型なし・`-` の文字種を検証しないこと、
  表示中の文書だけを対象とすること、診断上限後も装飾解析を続けることに同意済み。
- 受付証跡と計画文書検証の参照は本書末尾。入力内容の SHA-256 は引き継ぎ記録に添える。

[ライフサイクル状態](../../README.md#ライフサイクル状態)に従う。

## GitHub スタック

- 1層のみ。スライス1のブランチは `codex/fixed-width-validation`、取り込み先は `main`。
  計画コミット後の SHA を実装開始ベースとして記録し、完了コミット直後に PR を公開する。
- PR、ヘッド、完了・終了コミットは未作成。Main が実際の識別情報を追記する。
  最上位ヘッドは本機能の全差分と終了差分を含む同一ブランチの最新ヘッド。
- 各 PR 最新ヘッドで Verify、CodeQL、適用される Cloud とその他の必須チェックを確認する。
  CodeQL の解析 SHA と PR ヘッドの対応も記録する。実行中・未取得・失敗のまま終了へ進めない。
- Main のルール調査では、`main` は PR 必須、線形履歴、CodeQL の high_or_higher/errors が必須。
  `feature-*` ルールは今回のブランチ名には適用されず、従来の branch protection は存在しない。
  マージ前に現行ルールを再確認し、Main は squash を使う予定。強制マージやルール回避は行わない。
- 終了コミット後にも最新ヘッドのチェックを確認する。実際のマージ SHA と取り込み先の結果を
  保持する終了証跡に記録してから `CLOSED` とする。

[GitHub 標準のスタック PR](../../README.md#github-標準のスタック-pr)に従う。

## 人による承認

- 計画は `Waived`、完了・終了・マージは `Pending`。
  Main は2026-11-12、今回の利用者指示と指摘0件の独立レビューに基づき計画承認を省略した。
  対象はスライス1の「正確な変更対象」の全パス、仕様 R1〜R8、検証と終了範囲。
  レビュー担当は `/root/validation_plan_review`、判定は `PLAN_READY`、指摘は0件。
  レビュー済み SHA-256 は SPECS `ce3891bd6faafba55fbc7300655a77680618e49417f08307994922b74c82903f`、
  TASKS `da336225b76455708d54e231af0358aa19caa9371700119826e0c56868155b04`、
  TRACEABILITY `e1af5ab3a2cd22a63bd00c05ef60a041b790d3331cdd7259f68f5b0b1d4ee40a`。
  この追記は状態と承認省略のメタデータだけで、実質的な計画内容は変更していない。
- 今回の利用者指示は、AI レビューで指摘がない場合に人の承認を省略して先へ進むというもの。
  Main が対応する独立レビューで指摘0件となった正確な範囲に結び付け、各段階を
  `Waived`（利用者指示に基づく省略）として記録する。人が承認したという記録にはしない。
- 指摘があれば作成者へ返し、修正後の全差分を再レビューする。未解決の指摘がある状態では省略しない。
  新たな設計や範囲の判断があれば Main に戻す。必須チェック失敗や証跡不足を省略理由にしない。
- 計画の範囲は次節の全パスと仕様。完了はレビュー済みの全実装差分と証跡、終了は後述の正確な
  反映・削除範囲、マージは PR のベース・ヘッド・終了コミット・方式・最新チェックに結び付ける。
- この今回限りの扱いのために、恒久的な SDD 方針とロール定義は変更しない。

[人による承認](../../README.md#人による承認)の記録項目を使い、利用者の今回の指示を優先する。

## スライス1. 固定長レコードの問題表示

### 価値と開始条件

- 状態 `PLAN_APPROVED`。行と数値項目の誤りを「問題」から見つけ、編集・設定・形式選択で更新できる。
- 共通検証だけでは利用者が使えず、UI だけでは検証が成立しないため1件にまとめる。
  単独でレビュー、検証、コミット、公開できる最小の利用可能な機能とする。
- 開始条件は独立計画レビュー Ready、Main による今回の承認省略記録、計画コミット。
  先行スライスはない。実装中も計画コミットの契約を維持する。

### 設計の責務と境界

- ドメインの新規 `validateRecord.ts` が、行テキストと既存の `FixedWidthProjection` から
  問題コード、UTF-16 範囲、項目名、長さ情報を返す。VS Code、URI、SDK に依存させない。
  行判定・モード遷移を再実装せず、既存の `projectFields()` を唯一の判定元とする。
- アプリケーションの `FixedWidthDecoration.ts` に、装飾フィールドと問題を同じ走査で返す
  `analyze()` を加える。既存 `decorate()` は検証なしの互換ラッパーとして残す。
  既存 choices と fileTypeForName は維持し、定義読み込み・bootstrap の組み立ては変えない。
- `analyze()` は検証の有効・無効を受け、無効なら検証ルールを呼ばない。
  空白行除外、文書先頭からのモード、行番号の付与、最大1000件と打切りの集約は
  アプリケーションが担う。行の問題は長さ、項目番号の順。打切り時も行射影は最後まで続ける。
- 問題の DTO と解析結果はアプリケーションからプレゼンテーションへ公開する。
  プレゼンテーションからドメインを直接 import しない。
- VS Code 向けの新規 `diagnostics.ts` に resource scope の設定読み取りと、
  DTO を `vscode.Diagnostic` に変換する処理を置く。標準の `DiagnosticCollection` を使い、
  source は `JFixedViewer`、通常は Error、打切り情報は Information とする。
  独自の問題パネルや自動修正は作らない。
- `FixedWidthPresentation` が診断コレクション1つを所有し、URI ごとに1度だけ登録する。
  `decorateDocument()` の同じ解析結果を表示と診断に使い、分割エディターでは結果を共有する。
  起動途中の失敗も既存の dispose 経路で診断コレクションを破棄する。
- 既存の表示イベントと100msの待機処理に統合する。設定無効時も装飾は解析する。
  最後の表示が隠れる時・文書を閉じる時・形式解除時は該当 URI の診断を消す。
  閉じた URI の形式選択を保持する既存契約は維持し、再表示時に再解析する。
  拡張の破棄後、古いタイマーや保留中の Quick Pick は診断を作れないようにする。
- 設定変更は影響のある表示文書だけを再解析し、再有効化時は現在の内容を反映する。
  設定が不正な型の場合は既定 `true` に戻す。キャンセルでは診断も維持する。
- 境界を増やす目的は、純粋な検証規則とホスト固有の診断 API を分けること。
  既存のアプリケーションを拡張して行走査を共有し、別の検証サービスや行判定器は増やさない。
  自動アーキテクチャテストの結果とは別に、独立レビューでこの責務と境界を判断する。

### 正確な変更対象

以下が製品・検証支援・恒久文書の実装承認範囲。各行は1つの正確なパスを表す。

- `src/domain/fixedWidth/validateRecord.ts`（新規）
- `src/application/fixedWidth/FixedWidthDecoration.ts`
- `src/presentation/vscode/diagnostics.ts`（新規）
- `src/presentation/vscode/FixedWidthPresentation.ts`
- `package.json`（設定の追加だけ。依存、scripts、最小対応版は維持）
- `src/test/extension.test.ts`
- `src/test/support/characterizationHost.ts`
- `src/test/smoke.ts`
- `README.md`
- `CHANGELOG.md`
- `docs/requirements/use-cases/README.md`
- `docs/requirements/use-cases/uc-validate-fixed-width.md`（新規）
- `docs/requirements/use-cases/uc-clear-decorations.md`
- `docs/requirements/use-cases/uc-switch-editors.md`
- `docs/specs/architecture.md`（担当表と診断の責務・表示中の文書に限る寿命の説明だけ）

作業状態・要件対応の更新範囲は以下。

- `docs/specs/features/fixed-width-validation/SPECS.md`
- `docs/specs/features/fixed-width-validation/TASKS.md`
- `docs/specs/features/fixed-width-validation/TRACEABILITY.md`

組み込み JSON、サンプル、ロックファイル、テレメトリ、入口、ビルド、CI、品質設定、
アーキテクチャテストのルールは対象外。列挙外のパスや重要な契約変更が必要なら編集前に Main へ戻す。

### 受け入れ条件とテスト

- R1〜R3: 正常、短い・長い行、未知行、モード依存行、UTF-16 のサロゲートを検証する。
  幅だけの旧 `columns` も行判定と長さを検証し、文字種は検証しない。
- N は数字、全 SP、数字と SP の混在、英字、全角数字、タブを含む項目を検証する。
  完全な N のみを対象とし、不足した項目への追加の型診断を出さない。
  C・型なし・`-` は型診断を出さない。
- 空文書、途中の空白行、末尾改行による空行を無視し、空白行でモードが変化しない。
  未知行の後もモードを維持し、別文書では先頭から開始する。
- 全銀33形式215レコードと JPX の既存サンプルに診断がないことを、既存のモード分岐と併せて確認する。
  既存のサンプルを検証に合わせて変更しない。
- R4〜R6: 選択、変更、キャンセル、解除、編集のまとめ、100ms前後、設定の無効・再有効化、
  resource scope、分割 URI の重複排除、別 URI の分離、最後の表示が隠れる場合、閉じる・再表示、
  破棄、起動失敗、保留中の操作からの再登録防止をホスト代替のテストで確認する。
- 0、1000、1001件の境界を検証し、打切り情報の数・範囲・重大度・コードと、
  上限後にあるモード依存行の装飾が継続することを確認する。
- R8: 既存の装飾・ホバー・項目強調・エディター切替・テレメトリの回帰をすべて維持する。
  診断更新でテレメトリ件数・送信値が増えず、項目値を診断文に埋め込まないことも確認する。
- 実ホストの共有スモークを拡張し、設定の既定値と診断変換の実際の Range・Severity・code、
  実際の `DiagnosticCollection` の登録・取得・削除・破棄を確認する。
  一時文書と専用コレクションを後処理し、テストが利用者設定や文書内容を変えない。

### 最終検証と証跡

- 実装担当は基準と最終に使い捨てスナップショットを別々に作る。実装開始の計画コミットを
  基準とし、最終は未追跡の新規ファイルを含めた正確な入力一覧と SHA-256 を記録する。
  `.serena/`、キャッシュ、証跡出力、無関係な変更を入力に混ぜない。整形可能なコマンドは
  スナップショットのみで実行し、承認済みパスの整形だけを作業ツリーへ反映する。
- 各結果は Pass、Failed、Missing、理由付き Not Applicable とし、版、Node/npm/TypeScript、
  設定・ロックファイルの hash、比較ベース、変更パス、コマンド、終了コード、生出力を保持する。
  テスト結果は要件との対応と同じ入力に結び付ける。失敗は契約と不備のある側を特定して修正する。
- 文書検証: 変更した全 Markdown の lint、相対リンク、見出し・未置換テンプレートの確認、
  `git diff --check`。新規文書も `git diff --no-index --check /dev/null <path>` で確認する。
  `package.json` の構文と追加設定の型・既定値・scope を確認する。
- 製品検証: `npm exec -- tsc -p . --noEmit`、
  `npm exec -- webpack --mode production --devtool false`、`npm run test:prepare`、
  `npm run test:architecture`、`npm run test:desktop`、`npm run test:desktop:min`、
  `npm run test:web` をすべて実行する。両バンドルと desktop 安定版・1.75.0・Web の実ホストを対象とする。
  ホスト起動に承認や表示環境が必要なら Main に伝え、未実施を通過と記録しない。
- Qlty は0.645.0以降。基準・最終で同じ版、同じ `.qlty/qlty.toml`、対象選定を使い、
  全体を `qlty check --all --sarif --no-fix` と
  `qlty smells --all --sarif --no-snippets` で解析する。
  各コマンドの公式 SARIF 2.1.0 の生出力、実際の終了コード、実行識別情報、解析パス一覧と0件でない件数、
  設定 hash を保存する。解析不能・不完全な SARIF を通過として扱わない。
- 公式 SARIF のパスと対応可能な指摘を照合して、新規・悪化が0件であることを確認する。
  指摘だけによる非0終了と実行失敗を分ける。独自の比較ツールや品質設定変更は追加しない。
  最終スナップショットの `npm run qlty` の通過を要件とする。
  通常権限でのログ作成が失敗する既知の環境制約は、承認付きの実行などで解消し、失敗ログも保持する。
- 性能は同一入力の検証無効・有効を比較する。1万行程度の正常入力と不正入力について、
  解析時間と利用可能ならヒープ使用量、行数・文字数・診断件数・実行環境を記録する。
  1回の編集群で1回だけ文書解析し、上限超過でも診断が1001件以内で、結果が決定的であることを確認する。
  時間の絶対値を不安定なテスト閾値にせず、重大な応答低下や追加の全体走査があれば Main に戻す。
- 最終検証の後、独立実装レビューで正確な全差分・証跡・責務の境界を確認する。
  指摘修正時は影響する証跡だけを更新し、全差分を再レビューする。
  TASKS と TRACEABILITY に受け入れ条件、検証結果、残るリスク、レビュー・承認省略の参照を残す。

### 準備状況とリスク

- 計画レビューと計画承認省略は完了。実装の最終検証、独立レビュー、完了承認省略、コミット、PR は未実施。
- Main は N の全 SP を許容することで必須性を判定しない点と、C の文字種を対象外にする点を受容した。
  利用者には UTF-16 文字位置ベースで、バイト長・業務上の妥当性の保証ではない旨を説明する。
- 非表示文書では診断を消す範囲、1000件上限は今回の仕様とし、README と新規ユースケースに明記する。
- 残るリスクの担当は Main。通常の走査で重大な応答低下、サンプル誤検知、ホストの不整合があれば
  準備完了とせず、必要な再計画または範囲内修正を判断する。

## 調査と文書検証の証跡

- 受付担当は全銀33ファイル215レコードを試査し、既存行判定と長さがすべて一致した。
  N 型2318項目のうち834項目は全 SP、残りは ASCII 数字のみ。
  `/private/tmp/jfixed-validation-intake-20261112/sample-audit.json` を参照。
- 受付文書検証は同フォルダーの `markdownlint.log`、`links.json`。
- Main の GitHub ルール調査の生出力は
  `/private/tmp/jfixed-validation-main-20261112/rules-4182060.json` と `rules-4182063.json`。
- 計画担当は現行 `projectFields.ts`、`FixedWidthDecoration.ts`、`FixedWidthPresentation.ts`、
  bootstrap、既存の回帰・スモーク・ホスト代替、package の scripts を読み、共通走査と寿命の境界を確認した。
- 計画文書検証は Pass。markdownlint-cli2 0.23.3（markdownlint 0.41.1）で3文書を lint し、
  相対リンク13件（fragment を含む）、構造、`git diff --check` と新規3文書の空白検査を確認した。
  `/private/tmp/jfixed-validation-plan-20261112/` の
  `markdownlint.log` と `validation.json` に保存。
  最終内容 hash は引き継ぎに添える。製品検証と SARIF は計画文書だけのため Not Applicable。
  基準・最終の製品検証は実装担当の責務。

## 機能の終了判定

- 全スライスの完了コミット・PR 公開と最新ヘッドの必要なチェックを確認し、
  Main が `FEATURE_EXIT_READY` を記録して `feature-closer` に委任する。
- 恒久文書はスライス1で反映する。終了時に編集できるのは、同スライスで列挙した恒久文書の
  不足部分と終了証跡のみ。製品やテストの追加修正が必要なら Main に戻す。
- 削除予定は次の3パスだけ。`feature-closer` は削除せず、終了差分として明示する。
  承認省略条件を満たした後の実際の削除とコミットは Main が行う。
  `docs/specs/features/fixed-width-validation/SPECS.md`、
  `docs/specs/features/fixed-width-validation/TASKS.md`、
  `docs/specs/features/fixed-width-validation/TRACEABILITY.md`。
- 保持する終了証跡は `/private/tmp/jfixed-validation-exit-20261112/` に置き、
  PR 本文・会話から参照できる要約と識別情報を残す。
  受付、計画、レビュー、承認省略、全検証、生出力の参照、終了差分の正確な識別情報、
  GitHub/Cloud の最新チェック、実際のマージ結果を保持する。
- 終了差分全体（恒久文書の追加変更と上記の削除予定）を独立レビュー・文書検証に回す。
  Close と指摘0件のレビュー後に Main が終了承認省略と対象を記録して終了コミットする。
  最新ヘッドのチェック確認後、マージ対象の識別情報と方式に対する省略条件を記録し、
  実際の統合を確認してから `CLOSED` とする。

[機能の終了判定](../../README.md#機能の終了判定)に従う。
