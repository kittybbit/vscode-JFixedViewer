# ファイル形式別エンコーディング制御とバイト長対応の計画

## 作業概要

- [仕様](SPECS.md)の R1〜R10 を2スライスで実現する。S1 は最低版と API の利用条件、
  S2 は形式別読込、バイト表示・検証、組み込み移行を一体で扱う。
- ライフサイクル状態は `PLAN_APPROVED`、計画の版は `plan-v1`。
  独立レビュー `plan-review-v1` は指摘なしの `Ready for approval`。
- Main が今回限定の承認省略条件を適用した。次は計画だけのコミット。
  計画コミット後に S1 の実装を開始する。
- [SDD 方針](../../README.md)、[検証方針](../../validation.md)、
  [証跡方針](../../evidence.md)、[アーキテクチャ](../../architecture.md)を使う。

## 現在の状態

- ベース `main` / `0b4400e45a9d97d86ab17658bedd593e9e95ef80`。
  Main のリモート確認でも最新 `main` と一致。ブランチ `codex/encoding-byte-length`。
- 受付 `intake-v1`、計画担当 `planner`、記録日2026年11月12日。
- 受付の証跡 `/tmp/jfixedviewer-encoding-byte-length-intake-v1/` の
  `validation.log` と `inputs.sha256`。調査内容は本計画の根拠として引き継ぐ。
- 他の機能は引き継がない。未追跡 `.serena/` は全ての編集・検査・ステージ対象外。
- S1、S2 とも計画範囲は `PLAN_APPROVED`。計画コミット、実装、PR は未実施。

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

## 人による承認

- 計画段階は `Approved`（今回限定の承認省略条件による）。人の個別承認は受けていない。
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
  再読込の小さいアダプターを `documentEncoding.ts` に置ける。
  文字コードを勝手に戻す常駐処理や、ファイルへの書込・自動保存は追加しない。
- Bootstrap だけが具体的な codec アダプターを生成し、Application のファクトリーへ注入する。
  Application の内部 `analyze/decorate` は Promise を返す形へ変え、Presentation とテストを
  await 対応する。Domain の同期契約と拡張入口の `activate/deactivate` は維持する。
- 依存方向の検査は `test:architecture`、抽象化の目的と責務の妥当性は独立レビューで確認する。
  テレメトリ SDK とオプトアウトのコードは編集しない。

## スライス S1. VS Code 1.100 と文字コード API の利用条件

- 状態 `PLAN_APPROVED`。価値は最低対応の明示と、以後の文字コード機能を両ホストで使える基盤。
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
- 開始条件: 計画の指摘なしレビュー、Main の承認省略記録、計画だけのコミット。
  完了・レビュー・コミット・PR・最新チェックの証跡は未作成。

## スライス S2. 形式別読込とバイト単位の表示・検証

- 状態 `PLAN_APPROVED`。依存は S1 完了コミットと、その最新 PR ヘッドのチェック通過。
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
  `src/presentation/vscode/decorationStyle.ts`、`src/presentation/vscode/diagnostics.ts`。
- 組み立て・定義: `src/bootstrap/activateExtension.ts`、
  `src/resource/definitions/zengin.json`、`src/resource/definitions/jpx.json`。
- 検証支援: `src/test/extension.test.ts`、`src/test/support/characterizationHost.ts`、
  `src/test/smoke.ts`、`src/test/support/encodingSmoke.ts`、
  `src/test/encoding.test.ts`（新規）、`.vscode-test.mjs`。
  `.vscode-test.mjs` は新しい Desktop テスト入口を追加するためだけに変更する。
- 恒久文書: `README.md`、`CHANGELOG.md`、`sample/README.md`、`docs/specs/architecture.md`、
  `docs/requirements/use-cases/uc-display-fixed-width.md`、
  `docs/requirements/use-cases/uc-validate-fixed-width.md`、
  `docs/requirements/use-cases/uc-switch-editors.md`。
- メタデータ: 本機能の `SPECS.md`、`TASKS.md`、`TRACEABILITY.md`。
  新規候補は責務を分けるために列挙しており、不要なら作成しなくてよい。
- 対象外: 解除 JSON、サンプルデータの書換、テレメトリ実装、独自コーデック、追加 npm 依存、
  新しい利用者設定、CI の検証範囲縮小、業務文字種の追加検証、改行なしデータの自動分割。

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
