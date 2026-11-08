# SDD 導入の機能計画

## 作業概要

- `SPECS.md` に沿って SDD と層構造を導入し、固定長表示の挙動を保つ。
  各スライスは単独で価値があり、個別の PR としてレビューできる。
- 対象はスライス2。PR #9 の先端で必要なチェックが通ったため、現行挙動の回帰テストと
  デスクトップ版および Web 版の実ホストのスモークテストを追加する。
- 着手するスライスの検証と対象パスを確認する。同一形式を使う文書間の状態共有、
  両ホストの入口、VS Code の最小バージョンを維持する。
- 承認された範囲、設計、影響、検証を変える判断は Main に戻す。
  既存の承認範囲で解決できる決定的な失敗は、修正ループで修正して検証し直す。

## 現在の状態

- ライフサイクル状態 `PLAN_COMMITTED`
- 次の作業は、スライス2の完了コミットと PR 公開。
- 独立した `plan-reviewer` は日本語版の再レビューで `Ready for approval` と判定した。
  残る指摘は0件。レビュー対象の `TASKS.md` の SHA-256 は
  `8e04d9a5a2e66d56c22164e085a121d6ff818e619adce87981029976bbb526fd`。
- 日本語化前の計画では、独立した `plan-reviewer` が2件の指摘の解消を確認し、
  `Ready for approval` と判定した。レビュー対象の `TASKS.md` の SHA-256 は
  `f7826717a511c38adef8b5e3e5aa528060fb462c468ccd644a2daab46493a62c`。
  当時の文書の識別情報と検証結果は
  `/tmp/jfixedviewer-sdd-plan-revision.ahsshs/record.txt` にある。
- Main は元の計画をコミット `27164e6ab80afa1a9a5884a7aeaf489dcc2bf01f` に記録し、
  `PLAN_COMMITTED` まで進めた。対象の3パスだけをステージし、
  `git diff --cached --check` が通った。
- Main は日本語化の再計画を `8f3ed672e8af8799ab8850c2feb468d34f30795a` にコミットした。
  対象の3パスだけをステージし、`git diff --cached --check` が通った。

## 日本語化の再計画

利用者の追加指示を `SDD-4` に記録する。再計画のコミットで日本語化するのは上記の機能文書3点。
スライス1では既存の承認対象のうち、SDD 方針、アーキテクチャ、ユースケース、テンプレート、
案内文書、7ロールの説明と指示、ルートの `README.md`、新しい Verify の手順表示名と SDD の
コメントを日本語にする。Verify のワークフローとジョブの識別子、実行条件、処理は維持する。

スライス1の独立レビューの `Ready` は英語版の差分に対する判定。
日本語化した差分は別途検証し、独立レビューを受け、完了承認を得てからコミットする。
スライス2と3の実装・検証範囲、依存関係、承認対象パスは既存計画を引き継ぐ。

## GitHub スタック

- 起点は GitHub の `main`、コミット `56b4823cbb04873a7d909b2d4a530e6334efb517`。
- 第1層の `codex/sdd-adoption-harness` は `main` を対象にする。
  [PR #9](https://github.com/kittybbit/vscode-JFixedViewer/pull/9) の先端は
  `e685673dbb613faf495ebcd569eb156975bb7016`。
- 第2層の `codex/sdd-adoption-tests` は、検証済みの上記ヘッドを起点に作成した。
- 第3層の `codex/sdd-adoption-architecture` は承認済みの第2層のブランチとヘッドを
  起点にする。第3層のヘッドに全スライスと終了差分を含める。
- 後続 PR の URL、検証時のベースとヘッドの SHA、終了コミット、マージ結果は確認後に記録する。

各スライスで独立レビューの `Ready` と明示的な完了承認を得たら、Main がコミットし、
その層の PR を公開または更新する。後続のブランチを作成したり作業を始めたりする前に、
Main は先行 PR のベースと最新ヘッドを確かめ、そのヘッドに対する Verify と CodeQL、
適用されるリポジトリのルールと Cloud のチェックが通っていることを確認する。
Verify は PR ヘッドの SHA をチェックアウトする。CodeQL は解析したリビジョンと、
その PR の最新ヘッドとの対応を記録する。公開時とマージ時に GitHub のルールを再確認する。
チェックが欠けている、失敗している、古い、または実行中の場合は後続に進まない。
想定どおりのスキップは、該当ルールが認めている場合に限り通過として扱う。

[GitHub 標準のスタック手順][github-stack]で PR を結び付け、順序を確認する。
機能の終了判定（Feature Exit）、終了承認、終了コミットの後、最上位 PR の最新ヘッドで
必要なチェックが通るのを待つ。3件の PR、順序、ベース、ヘッド、終了コミットと、
スタック全体を `main` に取り込む GitHub 標準の Rebase merge について、別途マージ承認を得る。
Rebase merge で履歴を直線に保ち、変更ごとのコミットを残す。
現在の UI で操作でき、リポジトリのルールが許可していることを確認する。
マージはスタック全体の承認と検証が済んでから一括で行う。マージ対象の識別情報が変わった場合や
標準の操作を使えない場合は Main に判断を戻す。各 PR の実際のマージ結果と取り込み先の
コミットを記録する。一部しかマージできていなければ、確認済みの状態と残作業を記録する。

[github-stack]: https://docs.github.com/en/pull-requests/how-tos/create-pull-requests/creating-stacked-pull-requests

## 人による承認

- 日本語化の再計画は `Approved`。独立レビュー後にこの会話で明示的な承認を得た。
  対象は機能文書3点と、スライス1の承認済みパス内で `SDD-4` を満たす日本語化。
- 元の計画は `Approved`。独立レビュー後にこの会話で明示的な承認を得た。
  対象はレビュー済みのスライス1〜3の実装と検証で、承認パスは下記の各一覧に記載する。

各スライスの実装と検証は下記の一覧を境界とする。独立レビューの `Ready`、完了承認、
コミットはそれぞれ別に記録する。終了とマージにもそれぞれ明示的な承認が要る。
Main は操作前に、実際の承認、対象とパス、レビューとコミットの参照を記録する。
一覧にないパスや設計・検証範囲の重要な変更は、再計画と改めての承認が必要になる。

## スライス1. SDD ハーネスと初期 Verify

- ライフサイクル状態 `SLICE_COMMITTED`。修正コミットを公開し、先端の検証が通った。
- 受け入れ条件。SDD 方針、ロール、案内、テンプレート、ユースケースを日本語でたどれる。
  修正、再計画、完了、機能終了、マージを区別できることを手順例で確かめる。
  Verify と CodeQL は、今後のスタックの先行ブランチを含め、あらゆるブランチを対象にした
  PR で動く。CodeQL の PR 対象ブランチの絞り込みを外し、既存の push 時と定期実行時の
  挙動と解析設定を維持する。日本語化で手順の意味とチェックの条件を変えない。
- 設計上の責務と境界（Solution Shape）。`AGENTS.md` はリポジトリの制約と担当の振り分けを担う。
  SDD 本則は状態遷移と承認、検証方針はチェックの選択と修正、証跡方針は識別情報と再利用の条件を
  定める。各 Codex ロールは自身の手順を定め、Copilot と `.agent.md` は参照先を案内する。
  ユースケースには長く使える観察可能な挙動を書く。アーキテクチャ文書には目標の層構造と、
  スライス3まで依存ルールの自動検査が未導入であることを書く。検証は GitHub Actions と
  既存の npm ツールで行う。
- 参照元コミット `80ab0a84` から再利用できる SDD 方針を引き継ぎ、AJS 固有の責務を外す。
  7ロールの ID と権限の境界を保ち、ライフサイクル状態は `TASKS.md` の用語にそろえる。
  独立レビューと、Main が実行する承認後のコミット操作は分ける。
- Verify は Node 24 と `npm ci` でロック済みの依存を使い、PR の最新ヘッドで
  変更された Markdown、型、両ホストの本番バンドルを検査する。
  ドットで始まるディレクトリ配下も Markdownlint CLI2 0.22.0 の対象にする。
  PR のマージベースからの差分で追加、変更、改名先の Markdown を選ぶ。
  CodeQL の PR 解析の方式は維持する。拡張のパッケージに SDD やテストのツールを含めない。
- 検証は Markdown lint、相対リンクとアンカー、TOML と YAML の構文、手順のシナリオ、
  `git diff --check`、`npm exec -- tsc -p . --noEmit`、
  `npm exec -- webpack --mode production --devtool false`。
  マニフェストの両バンドルのパスを確認し、`main` と将来の先行ブランチの例
  `codex/fixed-width-example-base` に対するワークフローの起動条件とヘッドの選択を静的に検証する。
  Qlty の解析入力が変わった場合は後述の証跡を取る。公開後は実際の PR チェックを確認する。
  このスライスの実行時挙動は現行と同じ。

### スライス1の日本語版の検証

- 再計画コミットを基準に Qlty を実行した。基準と最終の証跡は
  `/private/tmp/jfixed-sdd-ja-s1-base-evidence.UNpbMm` と
  `/private/tmp/jfixed-sdd-ja-s1-final-evidence.9k7b8mi7` にある。
  全体の `check` は27件から既存の1件に減り、`smells` の4件は一致した。
  総合チェックは通過し、整形による変更はなかった。
- Markdown 20件と相対リンク54件の検証が通った。Verify は手順の表示名、
  Codex ロールは説明と指示の文章を変更した。設定の照合結果は
  `/tmp/jfixedviewer-sdd-localization.TNMMug/record.txt` にある。
- 型チェックと両ホストの本番ビルド、VSIX に含まれるファイルの確認が通った。
  ログは最終の証跡フォルダーにある。PR 公開後に Verify と CodeQL の結果を確認する。
- 独立した `implementation-reviewer` は日本語版を `Ready` と判定した。残る指摘は0件。
  レビュー対象28パスの内容一覧の SHA-256 は
  `b54a97df7ef3949d6a54e936e0b18ea33e74f88dde02761a416306ff57f9419c`。
- 完了承認は `Approved`。独立レビュー後にこの会話で明示的な承認を得た。
  対象はレビュー済みの日本語版スライス1の差分と、下記の承認対象パス。
  Main が28パスだけをステージし、`git diff --cached --check` を通して
  `2c5c0d20652e458f5468494f44a2570ba5bd5e29` にコミットし、PR #9 を公開した。

### PR 公開後の Verify 修正

- PR #9 の修正前のヘッド `2c5c0d20652e458f5468494f44a2570ba5bd5e29` で
  CodeQL は通過し、Verify は `npm ci` で失敗した。
  `ubuntu-latest` の Ubuntu 26.04 に、ロック済みの Playwright 1.56.1 が対応していない。
  [失敗したジョブ](https://github.com/kittybbit/vscode-JFixedViewer/actions/runs/42472193466/job/128705357615)
  のログを `/private/tmp/jfixed-sdd-s1-publish.snzfjn_8/verify-ci-failure.log` に保存した。
- Verify のランナーを、同じ Playwright が対応する `ubuntu-24.04` に固定する。
  `npm ci` と既存の検証を引き続き実行する。修正後の差分は独立レビューと完了承認に進む。
- ワークフローの構文と、ロック済み Playwright が Ubuntu 24.04 用の Chromium を選ぶことを
  確認した。`/tmp/jfixedviewer-sdd-ubuntu-correction.eBQcoA/record.txt` を参照する。
- Qlty の基準と修正後の証跡は `/private/tmp/jfixed-sdd-s1-ci-base-evidence.DFfPMP` と
  `/private/tmp/jfixed-sdd-s1-ci-final-evidence.poltlbx3` にある。
  指摘の増加や悪化はなく、総合チェックが通った。ランナーでの検証は PR 更新後に行う。
- 独立再レビューは `Ready`。残る指摘は0件。レビューした2パスの内容一覧の SHA-256 は
  `0e7b09b129d89f1224a36734c11d4f9536dbecfdafab9540b39f8fdac23485bf`。
- 修正の完了承認は `Approved`。独立再レビュー後にこの会話で承認を得た。
  対象は Verify のランナー指定と、この証跡の追記。
- Main が対象の2パスをステージし、`git diff --cached --check` の通過後に
  `e685673dbb613faf495ebcd569eb156975bb7016` を追加コミットし、PR #9 を更新した。
- [Verify][slice1-verify] は
  Ubuntu 24.04 で同じヘッドをチェックアウトして通過した。
  [CodeQL][slice1-codeql] は
  同じヘッドに対応する `refs/pull/9/head` の解析が通過した。追加のチェックは表示されていない。
  確認した PR とルールは `/private/tmp/jfixed-sdd-s1-publish.snzfjn_8` に記録した。

[slice1-verify]: https://github.com/kittybbit/vscode-JFixedViewer/actions/runs/42473987017
[slice1-codeql]: https://github.com/kittybbit/vscode-JFixedViewer/actions/runs/42473982773

### スライス1の日本語化前の実装と検証

- ローカル検証と差分のファイル一覧、ハッシュは
  `/tmp/jfixedviewer-sdd-slice1-static.Z4V7su/record.txt` と同じディレクトリにある。
  承認済みの28パス、Markdown のリンクと lint、ロールとワークフローの構文、状態遷移の例、
  型、両ホストの本番ビルド、パッケージからの除外を検証した。要求と検証の対応は変わっていない。
- Qlty の基準証跡は `/private/tmp/jfixed-sdd-s1-evidence-base.PQsC5T`。
  英語版の最終証跡は `/private/tmp/jfixed-sdd-s1-evidence-final.2r6mo3h_`。
  全件の `check` は基準の28件のうち未変更の2件が残り、終了コードは1だった。
  `smells` は基準と同じ4件で、終了コードは0。総合チェックは整形による変更なしで通過した。
  検証対象の差分はスナップショットの一覧とハッシュに、後から追記した状態・証跡の情報は
  Markdown の検証に対応する。
- `/private/tmp/jfixed-sdd-s1-evidence-final.nf6dhzo7` の型、ビルド、パッケージの検証は、
  レビュー後の修正が Verify に渡す Markdown の引数だけだったため、英語版の修正後も有効だった。
- 修正では Markdown のパスを文字どおりに渡す場合と、対象ファイルがない場合を確かめた。
  証跡は `/tmp/jfixedviewer-sdd-lint-correction.b3ATWM/record.txt`。
- 独立した `implementation-reviewer` は、Verify の指摘解消と責務の分け方を確認し、
  英語版を `SLICE_READY` と判定した。レビュー対象28ファイルの一覧の SHA-256 は
  `bb35e704e7f9f40c1e9aca93d8b56697bec280a4c24b5c74b9d5453573ac2715`。
  当時の判定は `Ready`、完了承認は `Pending`。日本語化した差分には新たな判定が要る。
- 実際の PR ヘッドに対する GitHub の Verify と CodeQL は公開待ち。実ホストの
  スモークテストはスライス2で行う。

### スライス1の承認対象パス

- `AGENTS.md`
- `.agent.md`
- `.codex/agents/approval-committer.toml`
- `.codex/agents/feature-author.toml`
- `.codex/agents/feature-closer.toml`
- `.codex/agents/implementation-reviewer.toml`
- `.codex/agents/implementer.toml`
- `.codex/agents/plan-reviewer.toml`
- `.codex/agents/planner.toml`
- `.github/copilot-instructions.md`
- `.github/pull_request_template.md`
- `.github/workflows/codeql.yml`
- `.github/workflows/verify.yml`
- `.vscodeignore`
- `README.md`（開発者向けの SDD 方針への案内）
- `docs/requirements/use-cases/README.md`
- `docs/requirements/use-cases/uc-display-fixed-width.md`
- `docs/requirements/use-cases/uc-clear-decorations.md`
- `docs/requirements/use-cases/uc-switch-editors.md`
- `docs/specs/README.md`
- `docs/specs/architecture.md`
- `docs/specs/evidence.md`
- `docs/specs/validation.md`
- `docs/specs/features/_templates/ADR.template.md`
- `docs/specs/features/_templates/SPECS.template.md`
- `docs/specs/features/_templates/TASKS.template.md`
- `docs/specs/features/_templates/TRACEABILITY.template.md`
- `docs/specs/features/sdd-adoption/TASKS.md`（承認や証跡の参照）

## スライス2. 現行挙動と実ホストのテスト

- ライフサイクル状態 `SLICE_APPROVED`。独立レビュー後に完了承認を得た。
- 受け入れ条件。デスクトップ安定版で既存実装の挙動をテストする。
  デスクトップ安定版、デスクトップ 1.75.0、Web 安定版の実ホストで共通のスモークテストを実行し、
  それぞれで拡張が起動し、`vscode-JFixedViewer.FiletypePicker` が登録されることを確認する。
- 設計上の責務と境界（Solution Shape）。テスト専用の代替ホストから既存の実装の入口を呼び出し、
  代替した外部依存に渡る装飾オプションとテレメトリを観測する。CJS ローダーによる VS Code と
  テレメトリの差し替えは、テストを分離したうえで、モジュール読み込み中に限って使う。
  `finally` で元に戻す。コンパイル済みの既存実装が参照する接続情報と `DEVELOPMENT` には
  テストプロセス内で固定のダミー値を入れ、実行後に戻す。
  スライス3でテストの接続先を変える際も、回帰シナリオは保つ。
  スモークテストは既存のロック済み CLI と Web ランナーを使い、実際の安定版と最小対応版を起動する。
- SDD-2 の全ケースをテストする。組み込みの全銀と JPX の定義を使い、先に一致した行の優先、
  モード更新とキャプチャ不一致時のリセット、同一形式内での共有と別形式からの分離、空白行や
  不一致のレコードの除外、日本語ホバーの内容と位置を確かめる。補助平面の文字で UTF-16 座標を確認し、
  短い行でも範囲を切り詰めないことを確かめる。エディターがない場合の形式選択、キャンセル時の
  装飾保持と空の `file_type`、組み込みの空形式による解除を扱う。
  エディター切替時の再適用、同じ形式で共有する装飾の破棄、非アクティブ化時の破棄を確かめる。
  テレメトリはイベント名、各プロパティの値、選択や起動との前後関係を確認する。
  エディター切替だけでは装飾イベントを送らない。
- 無視対象の `out/smoke-extension` に、通常のマニフェストと `dist` 構成を持つ
  スモーク用の拡張を作る。webpack のスモーク用フラグを明示し、秘密情報を含まない空の接続文字列を
  渡す。Node でマニフェストを配置する。通常のバンドルは既存の環境変数の解決方法を保ち、
  `dist` に出力する。共通のブラウザ用テストの入口を、Web ランナーが参照できるように
  スモーク用の拡張内へバンドルする。拡張を起動する前にホストのテレメトリを無効化し、
  テスト用プロファイルを分離する。スモーク用の処理では、実際のキーを読む前に dotenv を省く。
- `npm run test:prepare`、`npm run test:desktop`、`npm run test:desktop:min`、
  `npm run test:web` を追加する。`npm test` はデスクトップ用の入口として維持し、prehook で
  テストを準備する。CI の本番ビルドを維持し、準備と全ホストのテストコマンドを追加する。
  Linux では Electron を Xvfb で実行し、Web 用にロック済みの Playwright Chromium を導入する。
- 検証は先行 PR のチェック、通常ビルドとスモーク用ビルドの成果物、秘密情報のないスモーク用ビルド、
  3つの実ホストでの起動、現行挙動のテスト、Qlty の証跡、`git diff --check`。
  Verify でも同じコマンドを使う。利用できないホストは `Missing` として記録し、準備完了には進まない。

### スライス2の検証

- 先行 PR #9 の検証済みヘッド `e685673dbb613faf495ebcd569eb156975bb7016` を基準とした。
  ローカル検証の最終差分 SHA-256 は
  `e8a4f012cd965c0975eae52496f5318b0c693d40ed9e54736c6929e9077b3b6b`。
- デスクトップ安定版 1.145.2 の回帰テスト4件とスモークテスト1件、デスクトップ 1.75.0 と
  Web 安定版 1.145.2 のスモークテストが通った。macOS の安定版は実行ファイルを
  `VSCODE_TEST_EXECUTABLE` で指定した。Web 実行後の型チェックも通った。
- 型チェックと本番ビルドが通り、両本番バンドルの SHA-256 は基準と一致した。
  テスト準備は本番バンドルを上書きせず、スモーク成果物に `.env` のテスト用の値は含まれなかった。
  実ホストとビルドのログは `/private/tmp/jfixed-sdd-s2-final-evidence.a_ajwktx` にある。
- 独立レビューの指摘に沿って、先に一致する定義の優先、形式間のモード分離、同形式の
  別文書でのハンドル共有、キャンセルと解除のイベントを確認するテストを補強した。
  隔離環境で挙動を1件ずつ変えた場合も、5件すべてを該当するアサーションが検出した。
- Qlty の基準は `/private/tmp/jfixed-sdd-s2-base-evidence.6aFsBE`、最終結果は
  `/private/tmp/jfixed-sdd-s2-final-evidence._2nohgvz` にある。
  全体の `check` は既存の指摘1件、`smells` は既存の指摘4件で基準と一致した。
  総合チェックは通過し、整形による変更はなかった。
- Verify の既存チェックを維持したうえで、テスト準備と3ホストのコマンドを追加した。
  GitHub 上での実行はスライス2の PR 公開後に確認する。
- 独立再レビューは `Ready`。残る指摘は0件。レビューした10パスの内容一覧の SHA-256 は
  `ca9ed1fc1bcbdda9e5ed2853c26b9b2a499c70288d8c0eb49cf7a55951ff9a6c`。
- 完了承認は `Approved`。独立再レビュー後にこの会話で明示的な承認を得た。
  対象はレビュー済みのスライス2の差分と下記の承認対象パス。

### スライス2の承認対象パス

- `.github/workflows/verify.yml`
- `.vscode-test.mjs`
- `package.json`（スクリプトのみ）
- `webpack.config.js`
- `scripts/prepare-smoke.mjs`
- `src/test/extension.test.ts`（サンプルを置き換える）
- `src/test/smoke.test.ts`
- `src/test/smoke.ts`
- `src/test/support/characterizationHost.ts`
- `docs/specs/features/sdd-adoption/TASKS.md`（承認や証跡の参照）

## スライス3. Clean Architecture への移行と依存ルールの検査

- ライフサイクル状態 `PLANNED`
- 受け入れ条件。移行後もビルド、スモークテスト、現行挙動の回帰テストが通る。
  移動後の定義 JSON はバイト単位で同じで、コマンドとマニフェストの互換性を維持する。
  アーキテクチャテストで本番コードの違反が0件となり、意図的な禁止例は検出する。
- 設計上の責務と境界（Solution Shape）。ドメイン層はコンパイル済みのルールと初期モードから、
  行、モード遷移、範囲を計算し、ホストに依存せず項目と次のモードを返す。
  アプリケーション層は順序付きの形式一覧、形式ごとのモード、装飾 DTO、型付きテレメトリポートを担う。
  定義ローダーは順序、ID、正規表現を保つ。組み込み JSON を読み込む処理と、テレメトリ SDK を生成する処理は、
  インフラストラクチャ層に置く。プレゼンテーション層は形式選択 UI、イベント、ホスト向けの変換、
  形式ごとに1つの装飾ハンドルとファイル名の関連付けを担う。bootstrap はアダプターと
  ユースケースを生成・破棄し、購読を登録する。拡張の入口では既存の有効化・無効化関数だけを公開する。
- 同じ形式を使うファイル間でモードを再利用し、装飾ハンドルを共有する現行挙動を保つ。
  装飾を置き換える前に、そのファイル名に関連付けられた従来のハンドルを破棄する。
  形式一覧に空形式を残して装飾の解除に使い、アクティブエディターの切替時に前回の形式を再適用する。
  VS Code の範囲、スタイル、信頼済みホバー、一括適用は現行と同じとする。
  編集イベントの購読、自動判定、範囲の切り詰め、状態のリセット、文書ごとの分離は対象外。
  テレメトリ接続文字列のログを削除する。イベントの順序、名前、ペイロードは保ち、
  ファイルの内容やパスは送らない。
- 既存の TypeScript コンパイラの AST と Node のテストで、層の依存ルールを検査する。
  除外はテストファイルに限り、本番ソースのルートをすべて分類して未分類ファイルを違反にする。
  相対依存の許可先は、ドメイン層からドメイン層、アプリケーション層からドメイン層と
  アプリケーション層、インフラストラクチャ層からドメイン層、アプリケーション層、
  インフラストラクチャ層、リソース層。プレゼンテーション層からアプリケーション層と
  プレゼンテーション層、bootstrap からアプリケーション層、インフラストラクチャ層、
  プレゼンテーション層、bootstrap へ依存できる。拡張の入口の依存先は bootstrap。
  VS Code を import できるのは拡張の入口、bootstrap、インフラストラクチャ層、
  VS Code 向けプレゼンテーション層。SDK を import できるのは
  `infrastructure/telemetry` のみ。本番コードで Node 組み込み依存を禁止し、
  組み込み JSON の読み込みはインフラストラクチャ層に限る。
  アプリケーションのファクトリーを使えるのはアプリケーション層と bootstrap。
  インフラストラクチャの具体実装を使用・生成できるのはインフラストラクチャ層と bootstrap。
- import と型の import、再エクスポート、import 型クエリ、リテラルの動的 import、
  `require`、import-equals を検査し、静的に解析できない動的なローダー参照は違反とする。
  相対参照は TypeScript の解決方法に従う。禁止される依存方向、VS Code、SDK、JSON、
  `node:` の有無それぞれの Node 組み込み依存、依存の組み立ての誤用を検査し、
  対応する許可例も確かめる。静的検査は列挙したルールを検証し、責務の配置と抽象化の妥当性は
  独立レビューで判断する。Verify に `npm run test:architecture` を追加する。
- 検証は先行 PR のチェック、スライス2の全項目、アーキテクチャの許可例・禁止例、
  エンジン指定、マニフェストと JSON の同一性、`git diff --check`、Qlty の証跡。
  ブラウザーで動くこと、回帰テストは接続先だけを変更していること、最小対応版で実際に起動することを確認する。

### スライス3の承認対象パス

- `.github/workflows/verify.yml`
- `package.json`（アーキテクチャテストのスクリプトのみ）
- `src/extension.ts`
- `src/domain/fixedWidth/projectFields.ts`
- `src/application/fixedWidth/FixedWidthDecoration.ts`
- `src/application/telemetry/TelemetryPort.ts`
- `src/infrastructure/definitions/loadBuiltInDefinitions.ts`
- `src/infrastructure/telemetry/VscodeTelemetryAdapter.ts`
- `src/presentation/vscode/FixedWidthPresentation.ts`
- `src/bootstrap/activateExtension.ts`
- `src/resource/definitions/clear.json`
- `src/resource/definitions/jpx.json`
- `src/resource/definitions/zengin.json`
- `src/definitions/DefinitionHolder.ts`（削除）
- `src/definitions/types.d.ts`（削除）
- `src/definitions/clear.json`（移動）
- `src/definitions/jpx.json`（移動）
- `src/definitions/zengin.json`（移動）
- `src/extension/Constants.ts`（削除）
- `src/extension/Extension.ts`（削除）
- `src/extension/command/FiletypePicker.ts`（削除）
- `src/extension/editor/TextDecorator.ts`（削除）
- `src/extension/editor/TextDecoratorFactory.ts`（削除）
- `src/extension/events/ChangeActiveTextEditorHandler.ts`（削除）
- `src/extension/events/EventDispatcher.ts`（削除）
- `src/extension/events/TextDecoratorHandler.ts`（削除）
- `src/test/architecture.test.ts`
- `src/test/support/architectureRules.ts`
- `src/test/extension.test.ts`（必要な接続先のみ変更し、アサーションは維持）
- `src/test/support/characterizationHost.ts`（接続先の変更のみ）
- `docs/specs/architecture.md`（検査対象の境界を記録）
- `docs/specs/features/sdd-adoption/TASKS.md`（承認や証跡の参照）

## 検証と証跡

- 基準は `56b4823cbb04873a7d909b2d4a530e6334efb517` の内容と一致する使い捨てのスナップショット。
  Main は `tsc --noEmit` と webpack の両本番ビルドが通ることを確認した。
  基準時点では実ホストとアーキテクチャのチェックはなく、既存のサンプルテストは挙動を検証していない。
- 当初の Qlty 証跡は `/private/tmp/jfixed-sdd-evidence.drmE5r`、バージョンは 0.645.0。
  `check` は終了コード1、指摘27件で、当時は解析ファイルの一覧と件数が未取得だった。
  `smells` は終了コード0、指摘4件、解析ファイル14件。指摘には変更対象外のロックファイルにある
  CVE-2026-46681、README の行長、CodeQL の既存 YAML が含まれる。
  実装の検証を通過とする前に、基準と最終の各コマンドで、解析対象の一覧と0件でない件数を取得し記録する。
- 影響を受けるスライスごとに分離した基準と最終のスナップショットを使い、ツールのバージョン、
  設定、選択条件をそろえて解析対象の一覧と SARIF を比較する。
  `qlty check --all --sarif --no-fix` と
  `qlty smells --all --sarif --no-snippets` を実行し、実際の終了コードを残す。新規または悪化した指摘がないことを確認する。
  使い捨ての最終スナップショットで `npm run qlty` を実行し、原則として通過を要件とする。
  整形の変更は承認済みのパスに限って作業ツリーへ反映し、新しい差分で最終検証をやり直す。
  未変更の既存指摘のため総合チェックが通らない場合は、失敗の記録、該当する指摘、影響を受ける承認条件を
  添えて Main に戻し、人による個別の判断を得てから進む。スキャナーでの指摘の抑止、依存の変更、
  失敗したチェックを通過と記録することは認めない。新規指摘や必須の GitHub・Cloud チェックの
  失敗は例外の対象外とする。
- 範囲、正確なベースと差分の識別情報、承認したパスと検査したパス、ツールのバージョン、コマンドと
  終了コード、設定と依存の識別情報、出力、検証範囲は関係者が参照できる別ファイルに残す。
  検証、レビュー、コミットのたびに、ここから証跡を参照できるようにする。
  必須の証跡が未確定、未取得または失敗の場合は、方針に沿った明示的な個別承認がない限り
  準備完了と判定しない。
- 日本語版の草案で、Markdown 20件と相対リンク54件、ロールと CI の設定を照合した。
  `/tmp/jfixedviewer-sdd-localization.TNMMug/record.txt` を参照する。
- 日本語化した作業ツリーの Qlty 証跡は `/private/tmp/jfixed-sdd-ja-evidence.t_bedk6_`。
  全体の `check` は既存の指摘1件で終了コード1、`smells` の指摘4件は基準と一致した。
  総合チェックは通過した。スライス1の正式な独立レビューは再計画のコミット後に行う。
- 英語版の証跡は履歴として参照し、入力が同じ検証は証跡方針に従って再利用する。
  既存の `.serena/` はすべての範囲の対象外。

## 機能の終了判定

各スライスが独立レビューの `Ready`、承認、コミット、公開を済ませたら、終了判定の担当者が
SDD-1〜SDD-4、統合後の製品と Qlty の証跡、各 PR の最新チェックを確かめる。
再利用する知識はアーキテクチャ文書とユースケースにある。記述の整合性を確認し、
必要な修正の反映は下記のパスに限る。

- `docs/specs/architecture.md`
- `docs/requirements/use-cases/uc-display-fixed-width.md`
- `docs/requirements/use-cases/uc-clear-decorations.md`
- `docs/requirements/use-cases/uc-switch-editors.md`

対応する機能の挙動は維持するため、リリースと変更履歴の更新は今回の対象外。
残った課題には担当者か対応方針を明記し、外部の終了証跡に記録する。
最上位の層で終了時の正確な差分をレビューし、検証してから別途終了承認を得る。
終了コミットで削除するのは次の機能文書に限る。

- `docs/specs/features/sdd-adoption/SPECS.md`
- `docs/specs/features/sdd-adoption/TASKS.md`
- `docs/specs/features/sdd-adoption/TRACEABILITY.md`

各承認の判断、検証、実際のマージ結果は、Main と利用者が参照できる終了証跡に残す。
すべての PR がマージされたことを GitHub で確認してから、Main がそこに `CLOSED` を記録する。
統合専用のブランチや PR は作らない。
