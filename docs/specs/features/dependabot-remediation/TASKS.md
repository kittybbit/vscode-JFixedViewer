# Dependabot 警告の解消計画

## 作業概要

- [仕様](SPECS.md)に従い、Dependabot が報告した npm 依存関係の脆弱性を解消する。
- スライス1で npm の依存宣言とロックファイルを更新し、VS Code 1.75.0 と既存のテスト範囲を維持する。
- [検証方針](../../validation.md)と[証跡方針](../../evidence.md)に従う。
  独立レビューと計画承認を経て、計画をコミットした後に実装を開始する。

## 現在の状態

- ライフサイクル状態 `SLICE_APPROVED`。次はスライス1のコミットと PR 公開。
- 状態遷移は `PLAN_APPROVED` → `PLAN_COMMITTED` → `IMPLEMENTING` → `IMPLEMENTED`。
- 機能ブランチは `codex/dependabot-remediation`。計画のベースは `origin/main` の
  `1acf5a8bf78919a4baf903905208af9617339111`。
- 2026-11-09 に GitHub API から取得した未解決の警告は 76 件。すべて `package-lock.json` が対象で、
  パッケージは 25 種。取得結果は `/tmp/jfixedviewer-dependabot-01a1c07b.json`。
- 警告一覧の SHA-256 は `84e7e7c4da6aae3ac97d69233f4e5f6eb16c8fed5b2d205e9f2bc4c57cce580f`。
- 使い捨ての調査用コピーでは、更新候補のロックファイルに 76 件の警告の脆弱範囲と一致する項目がなかった。
  `npm audit` の指摘も更新前の 41 件から 0 件になった。
  候補は `/tmp/jfixedviewer-temporal-trial.mHGYRz/host-probe/` にある。最終差分の検証は実装後に行う。

[ライフサイクル状態](../../README.md#ライフサイクル状態)に従う。

## GitHub スタック

- PR はスライス1の 1 件。取り込み先は `main`。計画時点のベースと機能ブランチのヘッドは
  `1acf5a8bf78919a4baf903905208af9617339111`。PR は未公開。
- 完了承認を得てスライス1をコミットしたら、機能ブランチから PR を公開する。
  同じブランチを最上位のヘッドとし、終了差分も含める。
- 終了コミット後のヘッドで Verify、CodeQL、適用される Cloud のチェックと、現行の GitHub ルールで
  求められるその他の条件を確認する。CodeQL の解析リビジョンと PR ヘッドの対応を記録する。
- `main` の現行ルールでは PR、CodeQL の検査、直線的な履歴が必要。マージ承認の時点で再確認し、
  最新のベースとヘッド、チェック、ルールに沿うマージ方式、取り込み先のコミットを PR に残す。

[GitHub 標準のスタック PR](../../README.md#github-標準のスタック-pr)に従う。

## 計画の独立レビュー

- 2026-11-09 に `plan-reviewer` が `Ready for approval` と判定した。対応が必要な指摘はなかった。
- レビュー時点の `SPECS.md` の SHA-256
  `b43be0ceb71d4c0be8e2ac1602749195e7cc838a0bd6b4c18358eae3332f8377`。
- レビュー時点の `TASKS.md` の SHA-256
  `3316401e6412b2a334fbeb8e534d3c7011d975adfff41aff5349360d8185dd7b`。
- 計画の検証記録は `/tmp/jfixedviewer-dependabot-plan-01a1c07b.log`。
  調査用コピーの実機・配布検証は `/tmp/jfixedviewer-temporal-trial.mHGYRz/probe-summary.log`。

## 人による承認

- 計画承認は `Approved`。2026-11-09 に利用者が、上記の独立レビューを通過した計画を承認した。
  スライス1の `package.json`、`package-lock.json` と「必須検証」の範囲を対象とする。
  計画コミットは `97d57bf4e7be1129d70113158de041642850a5f2`。
- 完了承認は `Approved`。2026-11-09 に利用者が、独立レビュー済みのスライス1を承認した。
  対象は `package.json`、`package-lock.json`、本書の実装・検証記録、コミットと PR 公開。
- 終了承認は `Pending`。機能文書の削除 2 件と PR に保持する終了証跡を対象とする。
- マージ承認は `Pending`。終了コミットを含む PR の最新ヘッドと `main` への取り込みを対象とする。

計画のコミット対象は `docs/specs/features/dependabot-remediation/SPECS.md` と
`docs/specs/features/dependabot-remediation/TASKS.md`。承認結果、レビュー、コミットの識別情報は
[人による承認](../../README.md#人による承認)に従って段階ごとに追記する。

## スライス1. 脆弱な npm 依存関係の更新

- 状態は `SLICE_APPROVED`。先行スライスはない。製品パスは `package.json` と
  `package-lock.json`。計画コミットは `97d57bf4e7be1129d70113158de041642850a5f2`。
  検証記録のため、この `TASKS.md` も更新した。検証支援パスは変更していない。
- 既存のロックファイルを npm で更新する。`npm audit fix --package-lock-only --ignore-scripts`
  で互換範囲内の修正版を解決する。
  開発依存の `@vscode/test-cli` は `^0.0.15`、`@vscode/test-web` は `^0.0.81`、
  `@vscode/vsce` は `^4.1.0` に更新する。
  ロック内の `webpack` と `rimraf` は既存の宣言範囲内で更新する。
  更新後の webpack は `terser-webpack-plugin` を間接依存として提供しない。
  既存のビルド設定が直接読み込むため、`terser-webpack-plugin` `^5.6.1` を直接の開発依存に追加する。
- 上流の依存範囲から修正版を解決できない経路に次の `overrides` を使い、ロックを再生成する。
  - `@vscode/test-cli` 配下の `mocha` は `^12.0.3` にする。
    `diff` 等の修正版を解決する。
  - `glob` の `>=9 <14.0.2` を `^14.0.4` にする。
  - `minimatch` の `>=7 <11.0.1` を `^11.0.5` にする。

- 設計の責務と境界は[アーキテクチャ](../../architecture.md#設計の責務と境界)に従う。
  npm が依存解決を担い、配布・ビルド・テストのツールは開発依存に置く。
  更新候補のテスト CLI と VSCE は Node.js 22 以上を要求する。
  CI の Node.js 24 で既存の実行方法とテスト範囲を確認する。
- 調査で確認した実行時依存の更新は、テレメトリ SDK の間接依存 `@nevware21/ts-utils` の
  `0.11.7` から `0.16.0` への更新。SDK を使う責務はインフラストラクチャ層にあり、
  ホストの入口、イベント名とデータ、オプトアウト、層間契約、依存方向を維持する。
  固定長表示のソース、テスト、CI、`engines.vscode` は編集範囲外。
- 既存のテスト実行条件や生成物の契約が変わる場合、最小対応版の引き上げが必要な場合、
  または承認範囲外のパスや依存判断が必要になった場合は Main に戻す。

### 必須検証

ベースと最終の使い捨てスナップショットで Node.js 24 を使用する。フォーマットを実行する処理も
スナップショット内で行う。ベースと最終で影響を受けるビルド、テスト、配布物を比較し、
コマンド、バージョン、入力の識別情報、結果、失敗時の原因、生ログを記録する。

1. `npm ci` でロックを再現し、`npm audit --json` が最終で 0 件になることを確認する。
   最新の GitHub 警告一覧を取得し、取得済みの 76 件も含め、全ロック項目を npm パッケージ名と
   SemVer の脆弱範囲で照合する。ネストした項目も含め、一致が 0 件であることを確認する。
   新しい警告が現れた場合も同じ受け入れ条件で扱い、範囲の判断が必要なら Main に戻す。
2. `npm exec -- tsc -p . --noEmit` で型を確認する。
   `npm exec -- webpack --mode production --devtool false` で両ホストのバンドルを生成する。
   `npm run test:prepare`、`npm run test:architecture` を実行し、
   アーキテクチャ検査結果と設計の責務・境界のレビューを分けて記録する。
3. Chromium を準備し、`npm run test:desktop`、`npm run test:desktop:min`、`npm run test:web`
   を実行する。固定長表示とテレメトリの回帰テストを含め、実行したホストのバージョンと結果を記録する。
   CI では現行の Verify の実行方法を使う。
4. `npm exec -- vsce package --out <一時出力先>` で VSIX を生成する。
   同梱ファイルとマニフェストを比較し、両ホストの入口と VS Code 1.75.0 の宣言を確認する。
5. ベースと最終で Qlty 0.645.0 以降の同じバージョンを使い、
   `qlty check --all --sarif --no-fix` を実行する。
   `qlty smells --all --sarif --no-snippets` も実行する。
   SARIF、設定、対象パス、件数、終了コードを比較し、最終の `npm run qlty` を実行する。
   新規・悪化した指摘がなく、総合チェックが通ることを[品質条件](../../validation.md#品質条件)に従って確認する。
6. 変更した Markdown の lint、相対リンクと構造、`git diff --check` を確認する。

### 実装と検証結果

- 実装は計画の承認範囲内。VS Code の最低対応版 `1.75.0` と `main`、`browser` の宣言は維持。
  実行時依存のテレメトリ SDK とその層境界、拡張のソースコードを変更していない。
- GitHub Dependabot の未解決警告76件を更新後のロックと名前・脆弱 SemVer 範囲で照合した。
  基準ロックは91項目が該当し、更新後は該当0件。GitHub API の警告一覧は受付時と同一だった。
- 基準の `npm audit` は41件、更新後は0件。`npm ci` は更新後のロックから成功した。
- Node.js `v24.21.0`、npm `11.19.0` で型チェック、デスクトップ版と Web 版の本番ビルド、
  テスト準備が成功。アーキテクチャテストは7件すべて通過。
- デスクトップ安定版 VS Code `1.145.2` の回帰テストは5件通過。最低対応版
  `1.75.0` のデスクトップスモークと、Web 安定版 `1.145.2` のスモークが成功。
- `vsce package` が成功。VSIX にデスクトップと Web の両エントリーポイントが含まれ、
  `engines.vscode` は `^1.75.0`。基準版と最終版は同じ11ファイルとマニフェストで、
  エントリーポイント、実行時依存、VS Code 対応版が一致した。バンドルはそれぞれ生成に使った
  webpack と SDK 間接依存を含むため、バンドルサイズが変わった。
- Qlty `0.645.0`。ベースと最終の設定 SHA-256 は同一の
  `ef66ff4bc2fc0987ea6ce019c5370b11aed4a3ebbb448ad64473d913bec0af6e`。
  check の SARIF は基準1件（`@nevware21/ts-utils`）、最終0件。smells は両方0件。
  基準と最終の check パス一覧はそれぞれ61件と63件で、最終には機能記録2件が加わる。
  smells は基準・最終とも18ファイルを調べて0件。対象一覧はメトリクス出力と一致する。
  最終の `npm run qlty` も通過。
- 機能文書の Markdown lint は2件とも通過。相対リンクとアンカー13件、差分の空白検査も通過。
- 変更後の追跡対象は製品2ファイルとこの検証記録。テストファイルは追加していない。
  Verify、CodeQL、Cloud の PR チェックは PR 未公開のため未実施。

すべてのログ、SARIF、解析パス一覧は
`/tmp/jfixedviewer-dependabot-impl-01a1c07b.log` と
`/tmp/jfixedviewer-temporal-trial.mHGYRz/` に保持する。`smells` の18ファイル一覧は
`evidence-smells-targets.txt` に、VSIX のファイル一覧は `vsix-base-files.txt` と
`vsix-final-files.txt` に記録する。

### 実装の独立レビュー

- 2026-11-09 に `implementation-reviewer` が `Ready` と判定した。対応が必要な指摘はなかった。
- 計画コミットは `97d57bf4e7be1129d70113158de041642850a5f2`。
- レビュー時点の全差分（`git diff --binary`）の SHA-256 は
  `dc5a690607e16252466ecb69572f322f000ec1a7957d65fce1881d774a0d2be5`。
- レビュー担当は全76件を独立に照合し、更新後のロックに該当する脆弱な項目がないことを確認した。

[証跡の取り扱い](../../evidence.md#証跡の取り扱い)と
[決定的な失敗の修正ループ](../../validation.md#決定的な失敗の修正ループ)に従う。

## 機能の終了判定

利用者向けの挙動と互換性を維持するため、今回の計画では恒久文書の更新は予定していない。
終了承認の対象は `docs/specs/features/dependabot-remediation/SPECS.md` と
`docs/specs/features/dependabot-remediation/TASKS.md` の削除、および PR に保持する終了証跡。
PR に検証、レビュー、承認、対象コミット、最新のチェック結果を残し、マージ後に取り込み先のコミットと
Dependabot の再評価結果を確認する。受付時の警告が解消され、残る警告がないことを記録する。

[機能の終了判定](../../README.md#機能の終了判定)に従う。
