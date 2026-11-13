# ファイル形式別エンコーディング制御とバイト長対応の計画

## 作業概要

- [仕様](SPECS.md)の R1〜R10 を2スライスで実現する。S1 は最低版と API の利用条件、
  S2 は形式別読込、バイト表示・検証、組み込み移行を一体で扱う。
- S2 の Web 検証支援だけを再計画した `plan-v3` は `PLAN_APPROVED`。
  旧 `plan-v2` は `fb9daff695847bb729dc28a92eceb5c499df782d` で計画のみをコミット済み。
  `plan-v1` の独立レビュー `plan-review-v1` と計画コミットは履歴として維持する。
- Main は今回限定の承認省略条件を `plan-review-v2` の Ready・指摘0件に適用した。
  S1 実装完了。
- [SDD 方針](../../README.md)、[検証方針](../../validation.md)、
  [証跡方針](../../evidence.md)、[アーキテクチャ](../../architecture.md)を使う。

## 現在の状態

- ベース `main` / `0b4400e45a9d97d86ab17658bedd593e9e95ef80`。
  Main のリモート確認でも最新 `main` と一致。ブランチ `codex/encoding-byte-length`。
- 受付 `intake-v1`、計画担当 `planner`、記録日2026年11月12日。
- 受付の証跡 `/tmp/jfixedviewer-encoding-byte-length-intake-v1/` の
  `validation.log` と `inputs.sha256`。調査内容は本計画の根拠として引き継ぐ。
- 他の機能は引き継がない。未追跡 `.serena/` は全ての編集・検査・ステージ対象外。
- S1 は `SLICE_COMMITTED`（ヘッド `0e43098bb523ea0eee5fbffeddd08c7bbb8b7ab1`）、
  S2 の Web 支援改訂は `PLAN_APPROVED`。正確な比較ベースは同じ S1 ヘッド。
  S1 最新ヘッドの検査は全て通過し、S2 の改訂計画は `fb9daff695847bb729dc28a92eceb5c499df782d`。
  現在の作業ブランチは `codex/encoding-byte-length-byte`。

[ライフサイクル状態](../../README.md#ライフサイクル状態)に従う。

## GitHub スタック

- S1: `codex/encoding-byte-length` → `main`。現時点の先行ベースは上記 SHA。
  計画コミットを含め、S1 完了コミット直後に Main が PR を公開する。
- S2: `codex/encoding-byte-length-byte` → `codex/encoding-byte-length`。
  S1 PR の最新ヘッドの Verify、CodeQL、適用される Cloud チェックを確認した後に作成する。
  S1 の正確なヘッドをベースとして記録し、S2 だけの差分をレビュー・公開する。
- 最上位 S2 に全スライスと終了差分を含める。PR URL、各ベース・ヘッド、CodeQL が解析した
  リビジョン、終了コミット、統合順と実際のマージ結果は各段階で Main が追記する。
- main のルールは PR、線形履歴、CodeQL の high-or-higher / errors 等。
  調査出力は `/tmp/jfixedviewer-encoding-byte-length-main/github-main-rules.json`。
  公開時・統合時には最新の適用ルールを確認し、未取得・古い・失敗したチェックでは進まない。
- 統合は S1、S2 の順。GitHub が許可する squash または rebase の標準操作を使い、
  実際の取り込み先と識別情報を Main が確認する。独自統合ブランチは作らない。

### S2 PR の CodeQL と一時保護（Main のみ）

1. 改訂計画の独立レビュー・今回限定の条件適用と計画コミット後、S2 PR 公開前に Main が実行する。
   対象リポジトリは `kittybbit/vscode-JFixedViewer`、対象は先行ブランチ
   `codex/encoding-byte-length` だけ。`main` の ruleset、CodeQL default setup、閾値、
   必須検査、他ブランチは変更しない。
2. GitHub REST API で branch / protection / applicable rules と
   CodeQL default setup を GET し、
   実行直前の先行 head、未保護・ルールなし、protection の404を HTTP status と本文で保存する。
   `/repos/kittybbit/vscode-JFixedViewer/branches/codex%2Fencoding-byte-length/protection`
   が protection の対象。権限不足の404と区別し、branch GET の成功と `protected: false` を確認する。
   同じリポジトリ prefix の `branches/codex%2Fencoding-byte-length`、
   `rules/branches/codex%2Fencoding-byte-length`、`code-scanning/default-setup`、
   `rulesets/4182060` が残りの GET 対象。前提が変わった場合は上書きせず Main が再判断する。
3. 同 endpoint を PUT し、必要な4属性を
   `required_status_checks: null`、`enforce_admins: false`、
   `required_pull_request_reviews: null`、`restrictions: null` とする最小保護を追加する。
   force push / deletion / lock / linear history 等の追加許可は設定しない。
   要求本文、応答、時刻・実行者を保存し、再 GET の保護状態と意味のある全属性を記録する。
   先行 head と適用ルールも確認する。成功を未確認のまま PR 公開へ進まない。
4. S2 完了の独立レビュー・条件適用・コミット後に通常の stack PR を S1 向けへ公開する。
   正確な S2 head に対する Verify、CodeQL、対象言語の解析 revision と PR head の対応、
   適用される Cloud を確認する。保護追加だけでは発火成功の証拠にしない。
   CodeQL が未取得・実行中・失敗・別 head の場合は停止し、条件を緩めず Main へ戻す。
5. 終了差分後も最新 S2 head の検査を確認し、承認条件に従って S1、S2 を標準操作で統合する。
   S1 統合後の S2 の base は GitHub の再指定と実際の head を記録し、必要な最新チェックと
   識別が変わったマージ段階の条件適用を確認する。S1 の一時保護は両層の統合確認まで保つ。
6. 全層の実マージ後、ブランチ削除前に再 GET し、タスクが追加した保護と意味のある全属性が
   同じ場合だけ同 endpoint を DELETE して元の未保護へ戻す。応答・再 GET の404、
   branch の未保護・ルールを確認して復旧を記録する。他者が保護を変更した場合は削除せず、
   残存設定・理由・担当 Main を終了証跡へ残して判断を求める。未統合の中断でも勝手に削除しない。
   復旧確認後に通常の不要ブランチ削除へ進む。

- 操作前/追加後/復旧前/復旧後の raw JSON、HTTP status、payload と head の索引は
  `/tmp/jfixedviewer-encoding-byte-length-main/stack-protection/` に保存し、終了証跡へ参照を移す。
  この計画担当と implementer は外部設定を操作しない。
- 根拠は GitHub の[default setup の発火条件](https://docs.github.com/en/code-security/concepts/code-scanning/setup-types)と
  [branch protection REST API](https://docs.github.com/en/rest/branches/branch-protection)。
  一時保護は検査の発火に必要な運用であり、実際の検査成功やマージ承認に置き換えない。

## 人による承認

- 旧 `plan-v1` の計画段階は `Approved`（今回限定の承認省略条件による）。
  人の個別承認は受けていない。
  Main は2026年11月12日、`plan-review-v1` の指摘0件を根拠として条件を適用した。
  対象は `plan-v1` の S1・S2、列挙した編集候補パス、検証、終了範囲。
  レビュー入力は `/tmp/jfixedviewer-encoding-byte-length-plan-v1/inputs.sha256`。
  判定後の本追記は状態・承認のメタデータだけで、仕様・実装範囲・検証条件は変更していない。
- 今回の利用者の指示により、AI の独立レビューで指摘がない場合は人の個別承認を省略する。
  この機能の計画、スライス完了、終了、マージの各段階に適用する今回限定の条件であり、
  リポジトリ全体の方針は変更しない。人が具体的な差分を承認したとは記録しない。
- Main は指摘のないレビューと正確な入力、対象パス、判断段階を結び付けて条件の適用を記録する。
  指摘は作成者へ戻して修正し、全差分の再レビューを受ける。検査不足や必須チェックを省略しない。
- この計画の実装候補パスは以下に限定する。実装で新規パスや契約変更が必要なら Main に戻し、
  計画の該当箇所を更新して独立レビューを受ける。
- S1 の完了承認段階は `Approved`。既存の `s1-review-v2`、今回限定の条件適用、完了コミット、
  PR #21 の最新チェックは維持する。詳細は S1 の記録を参照する。
- 旧 S2 改訂計画 `plan-v2` の承認は `Approved`（今回限定の承認省略条件による）。
  Main は2026年11月13日、`plan-review-v2` の `Ready for approval`、指摘0件を確認した。
  対象は `plan-v2` の全変更、列挙したパス、責務抽出、Web 準備、Main 限定の外部操作と復旧。
  正確なレビュー入力は `/tmp/jfixedviewer-encoding-byte-length-plan-v2/inputs.sha256`。
  人の個別承認を受けたとは記録しない。本追記は状態・承認のメタデータだけで、計画範囲は不変。
  計画のみのコミットは `fb9daff695847bb729dc28a92eceb5c499df782d`、S2 の先行ベースは
  S1 完了ヘッド `0e43098bb523ea0eee5fbffeddd08c7bbb8b7ab1`。
  先行 S1 ブランチの一時保護は Main が計画どおり適用し、再 GET で `protected: true` を確認した。
  変更前/適用後の証跡は `/tmp/jfixedviewer-encoding-byte-length-main/stack-protection/verification.json`。
  S2 PR は未公開のため CodeQL の S2 head 解析・通過は未確認。実行は Main が公開後に記録する。
  実装完了の結果はこの節とは別に記録する。
- `plan-v3` の Web 支援改訂の承認は `Approved`（今回限定の承認省略条件による）。
  Main は `plan-review-v3` の `Ready for approval`、指摘0件を確認し、条件を適用した。
  対象は不要 helper の削除、標準 CLI / CI への復帰、専用 unit の対象外化と再検証範囲。
  正確な入力は `/tmp/jfixedviewer-encoding-byte-length-plan-v3/inputs.sha256`。
  人の個別承認を受けたとは記録しない。本追記は状態・条件適用だけで、計画範囲は不変。
  計画だけをコミットしてから実装を再開する。
  S1 と影響のない `plan-v2` の承認・結果、一時保護と復旧条件は維持する。

[人による承認](../../README.md#人による承認)と、今回の利用者の指示を合わせて適用する。

## 設計の責務と境界

- Domain は行判定・モード・論理項目幅と、与えられた境界表による位置変換・検証を担当する。
  `byteOffsets.ts` に純粋な境界表と変換を置く。ホスト、非同期 API、コーデックは持ち込まない。
- Application に `TextEncodingPort.ts` を設ける。入力は不変の文字列と文字コード、出力は
  各行のバイト長とバイト境界・UTF-16 境界、または内容を持たない失敗コード。
  `FixedWidthDecoration` がポートから得た境界を使い、Domain の同じ行投影を表示と検証へ渡す。
  DTO は論理位置・幅・単位と UTF-16 表示位置を分け、ホストに Domain 型を公開しない。
- Infrastructure の `VscodeTextEncodingAdapter` が `workspace.encode/decode` を扱う。
  標準 API はストリーミング境界を返さず、decode の部分呼出しも認めないため、
  `encodedBoundaries.ts` で標準 `TextDecoder` のストリームから位置を得る。
  独自コーデックや新しい本番依存は追加しない。対応5文字コードは状態を持たないため、
  先頭の ASCII 補助文字はデータ部分の幅に影響しない。不一致は安全に失敗させる。
- snapshot ごとに encode/decode を各1回、境界作成はバイト数に比例する走査とする。
  全 prefix の再変換、各文字ごとのホスト API、分割表示ごとの重複解析は行わない。
  使い終えたスナップショットと境界表を永続キャッシュに保持しない。
- Presentation は開始元 URI、再読込、選択と描画の世代、表示中のエディター、通知を担当する。
  再読込のアダプターを `documentEncoding.ts` に置く。S2 では選択、描画セッション、
  エディターの装飾ハンドルを下記の責務ごとに分ける。
  文字コードを勝手に戻す常駐処理や、ファイルへの書込・自動保存は追加しない。
- Bootstrap だけが具体的な codec アダプターを生成し、Application のファクトリーへ注入する。
  Application の内部 `analyze/decorate` は Promise を返す形へ変え、Presentation とテストを
  await 対応する。Domain の同期契約と拡張入口の `activate/deactivate` は維持する。
- 依存方向の検査は `test:architecture`、抽象化の目的と責務の妥当性は独立レビューで確認する。
  テレメトリ SDK とオプトアウトのコードは編集しない。

## スライス S1. VS Code 1.100 と文字コード API の利用条件

- 状態 `SLICE_COMMITTED`。価値は最低対応の明示と、以後の文字コード機能を両ホストで使える基盤。
  S2 の機能がなくても既存の表示・診断をそのまま提供できる。
- `engines.vscode` を `^1.100.0`、`@types/vscode` を厳密な `1.100.0` にする。
  最新型への暗黙更新で最低版にない API を使わない。既存 npm lock を更新する。
- 最低版テストの実行バージョンと CI の表示を1.100.0へ合わせる。
  既存の安定版 Desktop / Web の実行範囲は減らさない。
- 共有実ホストスモークに `TextDocument.encoding`、明示 encoding による全量 encode/decode の
  使用を加える。Shift_JIS の `Aあ` が3バイトで往復することと、対応 Unicode 系の往復を確認する。
- 正確な製品・設定パス: `package.json`、`package-lock.json`、`.github/workflows/verify.yml`。
- 検証支援パス: `src/test/smoke.ts`、`src/test/support/encodingSmoke.ts`（新規）。
- 恒久文書パス: `README.md`、`CHANGELOG.md`。最低対応版と互換性変更だけを反映する。
- メタデータパス: 本機能の `SPECS.md`、`TASKS.md`、`TRACEABILITY.md`。
- 対象外: 定義 JSON、Domain / Application のバイト処理、再読込 UI、表示・診断の意味の変更。
- 受け入れ: 正確な1.100.0の型でビルドでき、Desktop安定版・1.100.0・Web安定版で
  既存スモークと追加 API 確認が通る。変更文書・lock・CIの検査と Qlty 条件を満たす。
- 必須検証は次の「各実装スライスの最終検証」を全て適用する。CI は変更前後の実行範囲を照合する。
- 実装差分は独立レビュー済み。完了コミット、PR、最新ヘッドの検査を完了した。

### S1 の実装結果

- 変更した製品・設定パス: `package.json`、`package-lock.json`、
  `.github/workflows/verify.yml`、`README.md`、`CHANGELOG.md`。
- 変更した検証パス: `src/test/smoke.ts`、`src/test/support/encodingSmoke.ts`。
  共通ホスト smoke は `TextDocument.encoding`、Shift_JIS `Aあ` の3バイト、UTF-8 の日本語と
  サロゲートペアの全量 encode/decode を確かめる。検証コードは内容をログに出さない。
- 変更した計画メタデータ: `TASKS.md`、`TRACEABILITY.md`。TRACEABILITY の表だけ
  `MD013` を無効化し、SDD README の幅広い表と同じ Prettier/Markdownlint の扱いにした。
  要件、範囲、検証条件は変更していない。
- 受入条件 R1: `npm ci`（一時コピー）、`npm run test:prepare`、
  `npm exec -- tsc -p . --noEmit`、production Desktop/Web webpack、
  `npm run test:architecture` は
  `Pass`。アーキテクチャテスト7件。最低版 VS Code 1.100.0 smoke と Web 安定版 smoke は
  `Pass`。Desktop 1.146.0 の全テストと共有 smoke は23件 `Pass`。
- `test:desktop` の Desktop 安定版実行は、配布物の `Code` 実行ファイルを指定し、
  一時コピーのテスト設定に専用 `--user-data-dir` のみを追加した。テストファイルと範囲は
  `.vscode-test.mjs` と一致する。元設定、final snapshot 設定、差分、`files` 配列の一致記録は
  `/tmp/jfixedviewer-encoding-byte-length-s1/stable-host/test-config-plan.mjs`、
  `test-config-final-snapshot.mjs`、`test-config.diff`、
  `test-config-verification.log` に保存した。実行ログは `desktop-suite.log`、終了コードは
  `desktop-suite.exit-code`。
- Markdown lint、リンク・節、`git diff --check`、package/lock の1.100.0整合性は `Pass`。
  Qlty 0.645.0 の全体SARIF 2.1.0 は baseline check の既存 Prettier note が1件、smells 0件。
  最終は check / smells とも指摘0件、`npm run qlty` も `Pass`。Qlty の SARIF と実行ログ、
  対象パス一覧、ハッシュは `/tmp/jfixedviewer-encoding-byte-length-s1/` に保存した。
  既存の `qlty.toml` 未対応項目の警告は両スナップショットで同じ。
- 製品検証証跡とコマンド別ログ: `/tmp/jfixedviewer-encoding-byte-length-s1/validation/validation.log`
  と `validation/steps/`。S1 製品・検証パスの基準と最終の SHA-256 は
  `/tmp/jfixedviewer-encoding-byte-length-s1/baseline/product-inputs.sha256` と
  `final/product-inputs.sha256`、作業ツリーは `validation/inputs.sha256`。
  Qlty 全体 check の対象は `baseline/analysis-paths.txt` (103) と
  `final/analysis-paths.txt` (104)、対応する全ファイルの SHA-256 一覧は各
  `inputs.sha256`。smells の全ソース対象は各
  `smells-analysis-paths.txt` (21/22) と `smells-inputs.sha256`。元の公式 SARIF は維持し、
  デバッグ補完 SARIF、invoke YAML、対象数の根拠は各 snapshot の `check-debug.sarif`、
  `smells-debug.sarif`、`qlty-invocations/`、`analysis-paths-summary.json`、
  `qlty-debug-full.log` に保存した。Qlty の canonical SARIF は Desktop の使い捨て
  user-data-dir 調整より前の設定に対応する。機能メタデータの別検査対象は
  `validation/current-metadata.sha256` に記録し、Qlty 入力ハッシュと区別した。
- 各PRの最新ヘッドに対する Verify、CodeQL、Cloudチェックは PR 未作成のため `Not Applicable`。
  PR公開後、Main が S1 の最新ヘッドで確認する。終了条件と S2 の検証は未実施。

### S1 の次の状態遷移

- 独立レビューと今回限定の条件適用を完了した。Main が完了差分をコミットし S1 PR を公開する。
- S1 最新PRヘッドの必須チェック完了後に初めて S2 ブランチへ進む。

### S1 の独立レビューと条件適用

- `s1-review-v1` は対応表の整形に P3 が1件。作成者が Prettier 3.6.2 で修正した。
- `s1-review-v2` は全9パスを対象に `Ready`、指摘0件。入力は
  `/tmp/jfixedviewer-encoding-byte-length-main/s1-review-v2-inputs.json`。
  製品の入力は変わらず、文書整形に対応する検査とメタデータのハッシュを更新した。
- Main はこの指摘なし判定を確認し、今回の利用者指示による完了承認の省略条件を適用した。
  完了段階は `Approved`。人が個別の実装差分を承認したものではない。
  対象は上記入力の9パスと、この状態・承認の追記。実装範囲と検証条件は変更していない。
- 本追記は別のメタデータ検査を行い、承認済みパスだけを完了コミットに含める。

### S1 の公開と最新チェック

- Main が完了コミット `0e43098bb523ea0eee5fbffeddd08c7bbb8b7ab1` を作成し、
  [PR #21](https://github.com/kittybbit/vscode-JFixedViewer/pull/21) を `main` に向けて公開した。
- 2026年11月13日、同じヘッドで `verify`、`CodeQL`、
  `Analyze (actions)`、`Analyze (javascript-typescript)` の全てが `success`。
  CodeQL の実際の解析も `refs/pull/21/head` と同じコミットに対応する。
- 必須の Cloud チェックは適用ルールと公開されたチェックに存在しない。
  独立した status context も0件。空の combined status の `pending` は実行中の検査ではない。
- 生出力は `/tmp/jfixedviewer-encoding-byte-length-main/` の
  `s1-head-check-runs.json`、`s1-head-statuses.json`、`s1-codeql-analyses.json`。
- このヘッドを S2 の正確な先行ベースとし、S2 の実装開始条件を満たした。
  S1 は機能全体の終了判定まで開いたままとする。

## スライス S2. 形式別読込とバイト単位の表示・検証

- 状態 `PLAN_APPROVED`。Web 支援の再計画で停止し、未コミット差分を保全した。
  依存は S1 完了コミットと、
  その最新 PR ヘッドのチェック通過、改訂計画のレビュー・条件適用・計画だけのコミット。
- 価値は JIS 系の全銀33形式と JPX を正しい文字コードで読み、バイト幅で表示・診断すること。
  表示だけをバイト化して診断を UTF-16 のままにする中間段階は公開しない。
- 受け入れ条件は仕様の R2〜R10 と「文字コードとバイト位置」「読込と非同期処理」
  「組み込み定義の移行」の全契約。S1 の対応条件も引き続き満たす。

### 正確な編集候補パス

- Domain: `src/domain/fixedWidth/projectFields.ts`、`src/domain/fixedWidth/validateRecord.ts`、
  `src/domain/fixedWidth/byteOffsets.ts`（新規）。
- Application: `src/application/fixedWidth/FixedWidthDecoration.ts`、
  `src/application/fixedWidth/TextEncodingPort.ts`（新規）。
- Infrastructure: `src/infrastructure/definitions/loadBuiltInDefinitions.ts`、
  `src/infrastructure/encoding/VscodeTextEncodingAdapter.ts`（新規）、
  `src/infrastructure/encoding/encodedBoundaries.ts`（新規）。
- Presentation: `src/presentation/vscode/FixedWidthPresentation.ts`、
  `src/presentation/vscode/documentEncoding.ts`（新規）、
  `src/presentation/vscode/FileTypeSelection.ts`（新規）、
  `src/presentation/vscode/DocumentRenderSession.ts`（新規）、
  `src/presentation/vscode/EditorDecorations.ts`（新規）、
  `src/presentation/vscode/decorationStyle.ts`、`src/presentation/vscode/diagnostics.ts`。
- 組み立て・定義: `src/bootstrap/activateExtension.ts`、
  `src/resource/definitions/zengin.json`、`src/resource/definitions/jpx.json`。
- 検証支援: `src/test/extension.test.ts`、`src/test/support/characterizationHost.ts`、
  `src/test/smoke.ts`、`src/test/support/encodingSmoke.ts`、
  `src/test/encoding.test.ts`（新規）、
  `src/test/support/fakeTextEncoding.ts`（新規）、
  `src/test/support/fakeVscodeTypes.ts`（新規）、`.vscode-test.mjs`。
  `.vscode-test.mjs` は新しい Desktop テスト入口を追加するためだけに変更する。
- Web 支援の撤去: 未コミットの `scripts/run-web-tests.mjs`、
  `scripts/prepare-web-runtime.mjs`、`scripts/prepare-web-runtime.test.mjs` は作成不要とし削除する。
  `package.json` の `scripts.test:web` を S1 の標準 `vscode-test-web` CLI に戻す。
  `.github/workflows/verify.yml` は追加した helper unit と
  runtime-assets の upload step を削除して
  S1 の実行条件へ戻す。既存の Chromium 準備、全ホスト、Web smoke、タイムアウトを維持する。
  新しいパス・依存・ツールは追加せず、lock は変更しない。
- 恒久文書: `README.md`、`CHANGELOG.md`、`sample/README.md`、`docs/specs/architecture.md`、
  `docs/requirements/use-cases/uc-display-fixed-width.md`、
  `docs/requirements/use-cases/uc-validate-fixed-width.md`、
  `docs/requirements/use-cases/uc-switch-editors.md`。
- メタデータ: 本機能の `SPECS.md`、`TASKS.md`、`TRACEABILITY.md`。
  新規候補は責務を分けるために列挙しており、不要なら作成しなくてよい。
- 対象外: 解除 JSON、サンプルデータの書換、テレメトリ実装、独自コーデック、追加 npm 依存、
  新しい利用者設定、CI の検証範囲縮小、業務文字種の追加検証、改行なしデータの自動分割。

### plan-v2 再計画の理由と比較する入力（履歴）

- 再計画時の旧計画は `plan-v1` / `f5f54ce7d36ad349d9dfe4802229c04c8a5c6068`。
  S2 の比較ベースは S1 の `0e43098bb523ea0eee5fbffeddd08c7bbb8b7ab1`。
  現行ヘッドは `plan-v2` の計画コミット `fb9daff695847bb729dc28a92eceb5c499df782d`。
  S2 は未コミットで、再計画開始時の製品・テスト・設定・定義の一覧と SHA-256 を
  `/tmp/jfixedviewer-encoding-byte-length-plan-v2/preserved-inputs.sha256` に保全した。
  Main の既存 TASKS 追記は `inherited-tasks.diff` に保持し、製品差分と `.serena/` は編集しない。
- Qlty 0.645.0 の全体 baseline は check / smells とも0件。停止時の final-01 は check が
  Prettier 8件、smells が53件。`FixedWidthPresentation.ts` の file complexity は123、
  `characterizationHost.ts` は79（閾値55）。関数の分岐、引数、return も新規指摘がある。
  smells の終了コード0は指摘なしを意味しない。閾値・設定・解析対象を維持して全件解消する。
  公式 SARIF は `/tmp/jfixedviewer-encoding-byte-length-s2/qlty/` 配下の
  `{baseline,final-01}/repo/check-01.sarif` と
  `{baseline,final-01}/qlty-results/smells-01.sarif`、終了コードと対象一覧は同スナップショットにある。
  両者の設定 SHA-256 は `ef66ff4bc2fc0987ea6ce019c5370b11aed4a3ebbb448ad64473d913bec0af6e`。
- 初回の Web 1.146.0 / `69047191fc427f2f92828279aae1d90d8eeda7ab` のキャッシュで
  `@vscode/iconv-lite-umd` の JS が欠け、追加 smoke で404となった。同 commit の公式 CDN 資材の
  補完後は通過した。元の失敗 `stable-host/web-suite-01.log`、成功 `web-suite-02.log` /
  `web-suite-03.log` と Main の `web-runtime/asset-record.json` を保持する。
  当初の「公式配布物の欠落」という判断は、下記の fresh 取得で支持されず訂正した。
  初回キャッシュの欠落原因は未確定で、コピー処理が原因とも断定しない。
- CodeQL default setup は default / protected branch 向け PR を対象とする。
  S1 ブランチは未保護・適用ルールなしで、main ruleset `4182060` は default branch のみ。
  Main は先行ブランチだけに計画どおりの一時保護を適用し、再 GET で `protected: true` を確認した。
  元の調査は `/tmp/jfixedviewer-encoding-byte-length-main/stack-codeql-research.json`、
  GET/PUT/再 GET は `/tmp/jfixedviewer-encoding-byte-length-main/stack-protection/verification.json`。
  S2 PR は未公開のため、CodeQL が正確な S2 head を解析して通過した証拠はまだない。

### 責務抽出と維持する契約

- `FixedWidthPresentation.ts` はコマンド登録・ホストイベントの購読と各担当への配送、
  全体 dispose の組み立てを担う。新たなインフラストラクチャ実装の生成は bootstrap に限る。
- `FileTypeSelection.ts` は quick pick の開始元 URI、選択要求の世代、同一 URI の再読込直列化、
  選択の確定・解除、失敗通知と選択結果を担当する。`documentEncoding.ts` を呼び、
  render session の失効・適用を依頼する。再読込結果の成功・失敗・古い要求を区別し、
  古い結果で最新状態を消さない。既存のテレメトリ送信は選択結果を受ける入口で1回に保つ。
- `DocumentRenderSession.ts` は URI ごとの形式・文書・版・encoding・描画世代の状態、
  debounce、一度だけの解析と in-flight 共有、完了時の照合、表示結果の短命キャッシュと
  診断を担当する。Application ポートを呼び、最新 snapshot の表示 DTO を editor 担当へ渡す。
  編集・保存・設定・encoding・非表示・close・dispose による失効をここに集める。
  非表示で選択を失う契約には変えず、最後の表示が隠れたときの診断消去と再表示を維持する。
- `EditorDecorations.ts` は editor ごとの装飾ハンドルの生成・再利用・適用・破棄、
  カーソル項目、交互色、解除時の描画消去を担当する。選択や codec の判断を持たせない。
  URI の一度の解析を分割表示へ配り、同じ形式の再選択で許可されたハンドル再利用を維持する。
- 同じ状態を複数担当で別々に保持しない。選択要求と描画要求は別の世代として session の
  不変な要求レコードで照合する。URI、文書、版、encoding、形式、世代は意味を持つレコードへ
  まとめ、位置引数の増加を避ける。依存は入口 → 選択/session/editor、選択 → session と
  documentEncoding、session → Application/editor/diagnostics、editor → style とする。
  逆向き import や相互参照、共有 singleton を追加しない。
- `documentEncoding.ts` は再読込前の安全条件と API 呼出し後の検証を内部関数へ分け、
  dirty / untitled / close / URI不一致 / encoding不一致を同じ失敗コードで返す。
  Adapter の全量往復、`encodedBoundaries.ts` の BOM 除去・ストリーム走査・行内射影も
  各既存ファイルの内部関数に分ける。標準デコーダーの各出力の JS `.length` を累積し、
  全量一致と境界だけを記録する。全 prefix の再変換や独自 codec は導入しない。
- Domain の `projectFields.ts` / `validateRecord.ts` は論理幅、行長、途中境界、N型の
  目的別の内部関数と入力レコードへ整理する。Application の `FixedWidthDecoration.ts` は
  codec 結果判定、行投影、検証蓄積を内部関数へ分ける。新規の Domain/Application モジュールは
  追加せず、ホストを知らない契約、診断上限後も続くモード追跡、表示と診断の同じ境界表を保つ。
  内部ポートの引数は同ファイルの要求型にまとめてよい。入口と Domain の公開挙動は変えない。
- `fakeTextEncoding.ts` にテスト専用の既知 Unicode / Shift_JIS fixture 変換を移し、
  `fakeVscodeTypes.ts` に fake の document/URI/range/event/diagnostic/decoration の値と
  ライフサイクルを移す。`characterizationHost.ts` は呼出数・遅延 hook・イベント配送と
  拡張の起動/破棄を担う。fake は実ホストの codec の代わりとして扱わない。
  `encoding.test.ts` / `encodingSmoke.ts` / `diagnostics.ts` の局所指摘は既存パス内で整理する。
- ファイル分割の理由は選択・snapshot・描画ハンドル・テスト環境の寿命と責務の違い。
  閾値回避だけの転送関数や多重の抽象化を追加せず、全体 SARIF と独立レビューで
  新規指摘0件と責務の妥当性を確認する。本番依存、層の依存方向、SDK 境界、R1〜R10 は維持する。

### plan-v3: 標準 Web CLI への復帰

- 対象は S2 の Web 検証支援だけ。比較する計画は `plan-v2`、現在 HEAD は
  `fb9daff695847bb729dc28a92eceb5c499df782d`、S2 の先行ベースは S1 の
  `0e43098bb523ea0eee5fbffeddd08c7bbb8b7ab1`。製品コード、DTO、責務抽出、全銀/JPX、
  最低1.100、テレメトリ、品質閾値、CodeQL の一時保護と復旧条件は変更しない。
- fresh cold 取得では同じ1.146.0 / `69047191fc427f2f92828279aae1d90d8eeda7ab` に
  対象資材が同梱され、補完を行わず smoke が成功した。資材の SHA-256 は公式 CDN と一致する。
  Main の `web-runtime/fresh-host-asset-record.json` は `status: existing`、
  sourceUrl / httpStatus は null。同じ完全なキャッシュで標準 CLI を直接実行しても exit 0。
  ログとコマンドは `/tmp/jfixedviewer-encoding-byte-length-s2/validation/final-01/` の
  `web-cold.log`、`web-warm.log`、`web-original-cli.log` と各 command / exit-code。
  これにより不足資材を補う独自 helper の必要性がなくなった。
- 上記3 scripts の削除と package/CI の復帰を一体の修正とする。標準コマンドは S1 と同じ
  Chromium / stable / ESM、開発入口 `out/smoke-extension`、
  テスト入口 `out/smoke-extension/dist/smoke.js` を維持する。
  `npm run test:web` が標準 CLI を直接起動し、追加済みの全実ホスト smoke を通す。
  helper 自体を削除するため `node --test scripts/prepare-web-runtime.test.mjs` は
  理由付き `Not Applicable` とする。製品の Web 検証範囲や失敗条件は縮小しない。
- 使い捨て環境に公式 CLI が完全な host cache を新規取得する cold 実行と、同じ cache の
  warm 実行を残す。cold は `npm run test:web -- --testRunnerDataDir=<専用の空ディレクトリ>`、
  warm は同じコマンドへ `--commit=<coldで取得したcommit>` を加えて実行する。
  host version / commit、実コマンド、exit、ログ、資材一覧と SHA-256 を外部証跡に保持する。
  新しい製品 helper や CDN 補完は使わず、取得や smoke の失敗は失敗として記録する。
  既存の他 cache を消さず、cold 用の空ディレクトリを別に作る。
- snapshot 作成では root の開発依存 `node_modules` と host 内の nested runtime 依存、
  `out/smoke-extension/dist` の生成 bundle を区別する。一律の名前除外で host や smoke を
  不完全にしない。実際に検査した cache と生成物を保全し、初回404の原因とは混同しない。
- 恒久文書の訂正は承認済みの `README.md`、`CHANGELOG.md`、`sample/README.md`、
  `docs/specs/architecture.md` と3ユースケースのうち、helper 専用説明や誤った配布物欠落の
  説明がある箇所だけに限る。新しい文書・要件は追加せず、必要な削除・訂正は実装担当が行う。
  本計画時点のこれらの差分には該当説明がなく、製品の説明は維持できる。

### plan-v3 の検証再利用と残るリスク

- 製品検証の索引は `/tmp/jfixedviewer-encoding-byte-length-s2/validation/` の
  `final-validation-status.txt`、`validation.log`、`evidence-final-hashes.sha256`。
  `final-01/` の型、両 bundle、npm ci、
  test:prepare、architecture 7件、Desktop 41件、最低1.100 smoke と cold/warm Web の成功を
  保持する。品質指摘の解消後の全体 check / smells と総合通過は
  `/tmp/jfixedviewer-encoding-byte-length-s2/qlty/final-06/qlty-results/` にある。
  これらは対応する `inputs.sha256` と検査設定に結び付け、未完成の最終メタデータを完成扱いしない。
  helper ありの cold/warm は履歴として残し、最終 Web は復帰した標準 CLI の条件で更新する。
- 本番 TS / テスト TS / 依存 / ビルドと各検査の関連入力が一致する場合、型・bundle・prepare・
  architecture・Desktop / 最低版の結果を再利用する。package の test:web 以外に差分がなく、
  lock が不変であることを確認する。標準 CLI cold/warm Web、package/CI の整合・構文と
  実行範囲、変更 Markdown の lint/リンク/Prettier/diff、最後の全体 Qlty は更新する。
  baseline は同じ S1 ベース・設定・対象選択なら再利用し、品質条件は維持する。
- plan-v3 は Web 支援の改訂範囲だけレビュー・条件適用・計画コミットを必要とする。
  本番の責務抽出とその他の `plan-v2` 承認は維持する。実装完了・終了のレビューは未実施。
  Main は外部保護の競合/復旧と最新 CodeQL、implementer は cache/生成物の完全性と
  入力一致、reviewer は標準実行経路と証跡の妥当性を確認する。初回欠落の原因は未確定のまま保持する。

### 検証シナリオ

- 省略した `utf16` 定義と旧 `columns` を従来の範囲・ホバーで確認する。
  明示 encoding を持たない従来形式は、対応5種以外の現在文字コードでも使える。
- Shift_JIS の ASCII / 半角カナ / 全角、UTF-8 の日本語 / 絵文字、UTF-16 LE/BE の
  サロゲートペア、空行、最終空行、LF/CRLF、生成 BOM と内容 U+FEFF を確認する。
- 行長の一致・不足・余剰、文字途中の開始/終了、短い行の一部項目、N 型の完全/不足範囲、
  1000件上限と後続モード、検証無効でも不正範囲を描画しないことを確認する。
- 全量往復の置換、孤立サロゲート、API / TextDecoder の意図的な結果不一致、例外、
  不明な encoding と非対応の現在 encoding を再現し、誤った解析・内容引用をしないことを確認する。
- 同 encoding は再読込0回、異 encoding は元 URI を再読込、dirty / untitled / close は安全停止。
  適用後 encoding の不一致、再読込拒否、読込失敗、再選択による復帰を確認する。
- quick pick 中のアクティブ変更、連続選択、再読込直列化、解析待機中の編集・設定変更・保存・
  encoding変更・非表示・close・dispose を遅延可能な fake host で再現する。
  古い処理は別 URI や最新の選択へ描画せず、最新の診断も消さない。
- 同 URI の分割表示へ一度の解析を配り、最後の表示を隠すと診断を消す。
  再表示・再openで最新内容を再評価し、解除・キャンセルの契約を保つ。
- 既存の全銀33サンプルと JPX の全項目、行条件、モード、全表示設定・ホバー・強調・解除を
  回帰検証する。定義差分は追加2属性だけで、形式 ID と既存データに変更がないことを確認する。
- 1000行の10回編集をまとめた後、最後のスナップショットだけを適用し、encode/decode は
  各スナップショットで各1回、分割表示で増えないことを確認する。過去の結果は破棄する。
- 実ホストのメモリ FileSystemProvider に既知の Shift_JIS バイトを渡し、
  `openTextDocument(uri, {encoding})` の再読込と encoding を確認する。
  provider は読み出すデータを保持し、書込を記録して拒否する。dirty拒否のテストでは
  エディター内の未保存編集を許し、読込不能・codec と境界の統合・書込0回も確認する。
  fake の再現テストに加え Desktop安定版・最低版・Web で同じ smoke を実行する。
- 既存テレメトリの正常・editorなし・キャンセル、追加失敗時の空ID、古い完了・編集時の追加0件を
  検証する。イベントのプロパティとオプトアウト実装を維持し、テキストやパスを含めない。

## 各実装スライスの最終検証

- 基準と最終を別の使い捨てスナップショットにし、対象パスの内容一覧、base/head、設定と lock の
  ハッシュ、ツール・Node/npm バージョン、実際の終了コードと生出力を保持する。
  作業ツリーを整形する可能性がある `npm run qlty` や npm の lifecycle は直接実行しない。
- 変更した Markdown 全件の lint、相対リンクと節、JSON/YAML の構文、`git diff --check`。
- `npm ci`（使い捨て環境）、`npm exec -- tsc -p . --noEmit`、
  `npm exec -- webpack --mode production --devtool false`、`npm run test:prepare`、
  `npm run test:architecture`、`npm run test:desktop`、
  `npm run test:desktop:min`、`npm run test:web`。
  Desktop の headless Linux は CI と同じ `xvfb-run -a` を使う。macOS は既存のホストで実行する。
  Web には必要な Playwright Chromium を準備し、全ホストの成功を省略しない。
- Qlty 0.645.0 以上。同じ設定・対象選択で全体の
  `qlty check --all --sarif --no-fix` と
  `qlty smells --all --sarif --no-snippets` を
  基準・最終で取得する。公式 SARIF 2.1.0、生出力、解析パス一覧と0件でない件数、終了コード、
  入力と設定の識別情報を残す。独自の比較ツールを追加しない。
- 最終スナップショットで `npm run qlty` を実行し、新規・悪化指摘0件かつ総合チェック通過を
  必須とする。承認候補パスの整形だけを作業ツリーへ反映して、影響する証跡を更新する。
  既存指摘だけによる不通過も勝手に無視せず Main へ返す。
- 証跡は `/tmp/jfixedviewer-encoding-byte-length-s1/`、
  `/tmp/jfixedviewer-encoding-byte-length-s2/` に保持し、TASKS にファイル名と結果を追記する。
  各結果は `Pass` / `Failed` / `Missing` / 理由付き `Not Applicable` で記録する。
- 各 PR の正確な最新ヘッドに対する Verify、CodeQL と解析リビジョン、適用される Qlty Cloud 等を
  Main が別に確認する。ローカルの通過でリモートの証跡を代用しない。

## 計画調査と文書の証跡

- 公式1.100.0型定義、全銀 AP-I-13 付録1、JPX v4.0 §3.3、
  [WHATWG Encoding Standard](https://encoding.spec.whatwg.org/#interface-textdecoder)を確認した。
  API の引数、全量変換の条件、fallback、BOM、streaming/fatal の契約を設計へ反映した。
- 一次資料、JPX の抽出テキストと該当ページ画像は
  `/tmp/jfixedviewer-encoding-byte-length-plan-v1/` に保持する。
- Main は2層構成、対応5encoding、JIS系全銀とJPXの移行、BOMとcodec不一致の検出、
  失敗時の解除・固定通知・テレメトリの扱いを計画判断として確認した。
  これは計画の独立レビューや人の個別承認を代行したものではない。
- 変更・検査パスはこの機能の `SPECS.md`、`TASKS.md`、`TRACEABILITY.md`。改名なし。
  最終入力一覧は `inputs.sha256`、調査と検証の生出力は `validation.log` と `research.md`。
  計画文書3件の Markdown lint（0.22.0 / 0.40.0）、相対リンクと節、構造・
  未置換テンプレート・空白、追跡/未追跡差分の検査は全て `Pass`。
  ネットワーク照会を避け、既存キャッシュの CLI 0.22.0 を直接実行した。
- 製品・テスト・設定・恒久文書は計画では編集しない。製品の検証と全体 Qlty はこの段階で
  `Not Applicable`、実装の必須条件として上記に定めた。

### plan-v2 の調査・文書検証

- 記録者 planner、再計画範囲 S2 のみ。調査と原状保全は
  `/tmp/jfixedviewer-encoding-byte-length-plan-v2/research.md`、
  `preserved-inputs.sha256`、`starting-status.txt`、`starting-head.txt`。
  Main の再計画前入力 `s2-replan-entry-inputs.json`（Main 証跡ディレクトリ、21パス）とも
  計画外の20パスのハッシュが一致する。
- 計画3文書の正確な SHA-256 は同ディレクトリの `inputs.sha256`、その一覧自体の SHA-256 を
  引き継ぎで計画識別に使う。調査対象と文書検証のコマンド・終了コードは `validation.log`。
  別途 Main が追記するレビュー・承認メタデータはその入力と区別して検証する。
- 文書の Markdown lint 0.22.0、相対リンク/節/構造、Prettier 3.6.2、
  `git diff --check` と製品・テスト・設定・定義の保全は全て `Pass`。
  整形は使い捨てコピーで行い、最終作業ツリーは読み取りの `--check` で確認した。
  計画段階の製品検査は `Not Applicable`。
  変更は本機能の SPECS/TASKS/TRACEABILITY のみ。コミットと外部設定変更は行わない。

### plan-v3 の調査・文書検証

- 記録者 planner、範囲 S2 の Web 支援のみ。SPECS の要件・挙動は変更しない。
  `/tmp/jfixedviewer-encoding-byte-length-plan-v3/` の
  `entry-inputs.json` と `entry-diff.patch` に
  開始時の追跡/未追跡入力を保全し、Main の `s2-plan-v3-entry-inputs.json` の37パスとも照合した。
- 調査参照は `research.md`、計画3文書の SHA-256 は `inputs.sha256`、その一覧自体の
  SHA-256 が引き継ぎの計画識別。文書 lint 0.22.0、相対リンク/節/構造、Prettier 3.6.2、
  `git diff --check`、計画外入力のハッシュ保全は `validation.log` に記録する。
  製品・テスト・設定・恒久文書を編集せず、コミット・外部操作・製品検査は行わない。

## 機能の終了判定

- 全スライスをコミット・公開し最新チェックを確認した後に `feature-closer` へ委任する。
- 恒久文書は S1/S2 で上記パスに必要な現行挙動を反映する。終了担当は同じ恒久文書パスに限り、
  反映漏れを修正できる。新しい挙動・範囲・検証判断が必要なら Main に戻す。
- 保持する終了証跡は `docs/specs/completed/encoding-byte-length.md`（新規）。
  受付・計画・レビュー・承認省略の根拠、各スライス、検証、PR順、base/head、終了コミット、
  最新チェック、実際のマージ結果、残存リスクを移す。必要な生出力は参照可能な成果物として保持する。
- 削除するパスは本機能の `SPECS.md`、`TASKS.md`、`TRACEABILITY.md` だけ。
  `feature-closer` が終了差分を準備し独立レビューへ返し、Main が今回の省略条件を記録して
  終了コミットを行う。対象外の機能・テンプレート・証跡は削除しない。
- 終了コミットで変わった最新ヘッドの検査を確認し、マージ段階の条件適用を Main が記録する。
  全層の実際のマージを確認するまで `CLOSED` と記録しない。

[機能の終了判定](../../README.md#機能の終了判定)に従う。
