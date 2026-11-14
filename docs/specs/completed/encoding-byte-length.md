# ファイル形式別エンコーディング制御とバイト長対応

## 判定と状態

- 2026年11月14日の終了判定は `CLOSE_READY`。終了差分の独立レビュー
  `close-review-v1` は Ready・指摘0件。Main が今回限定の承認省略条件を適用し、
  終了承認を `CLOSE_APPROVED` とした。本書は終了承認時点の記録で、実マージ前の状態を示す。
- GitHub Stack #23（ID `3540326`）に PR #21、#22 が登録された。native stack による統合は
  終了 head の SHA を固定した GitHub 標準の atomic squash で行い、2件の squash commit を作る計画。
  実行と実マージ識別情報の記録は Main が承認後に行う。
- 対象は `encoding-byte-length`、比較ベースは `main` の
  `0b4400e45a9d97d86ab17658bedd593e9e95ef80`、終了準備時の最上位ヘッドは
  `7fc29697a2f939dc1db9db8860b16df073e9e720`。
- 今回限定の承認省略条件は、独立 AI レビューに指摘がない場合に適用するという利用者の指示に基づく。
  S1 と S2 では Main が条件適用を記録済みで、人の個別承認を受けたとは記録していない。
  終了段階にも Main が条件を適用した。マージ段階の条件適用は最新チェック確認後に
  Main が記録する。正確な終了入力と承認は外部の `close-approval.json` に保持する。
- 機能文書の削除予定は本機能の `SPECS.md`、`TASKS.md`、`TRACEABILITY.md` のみ。
  終了差分にはこの3件の削除を含める。正確な Git blob と削除前の SHA-256 は外部に保持する。
- 全層の実マージ結果を確認するまでは `CLOSED` と記録しない。Main は確認後に実際の取り込み先と
  コミット識別情報を PR #22 と保持終了証跡へ記録する。最終状態はそこから追跡し、追記だけの
  第三 PR は作らない。

削除予定パスと現行内容の識別情報:

- `docs/specs/features/encoding-byte-length/SPECS.md`
  - Git blob: `acb7a2a06875c158a42e25c25b5fab465736fb4c`
  - SHA-256: `7b1acd908d293130013b02213e78850e4f36e93fadedd2f41970aaf6356a3618`
- `docs/specs/features/encoding-byte-length/TASKS.md`
  - Git blob: `87436af404808827827eec98fff401ea4f0d9cd9`
  - SHA-256: `8522355cc65b50d695af51409cafe4995cfd1206350c3c81012739cb7ef64b2d`
- `docs/specs/features/encoding-byte-length/TRACEABILITY.md`
  - Git blob: `3e1bd952c3a51562512e3f56ab74b362ee3414e3`
  - SHA-256: `db6c8db2e17c58ed702abb2fb8c8cb4bec11749c08f72b7437b1cd527dcf7ba7`

## スライスと受け入れ

機能の受け入れ条件 R1〜R10、設計契約、要件と検証の対応は、終了準備時点で保持した次の記録にある。

<!-- markdownlint-disable MD013 -->

[仕様](https://github.com/kittybbit/vscode-JFixedViewer/blob/7fc29697a2f939dc1db9db8860b16df073e9e720/docs/specs/features/encoding-byte-length/SPECS.md)、
[タスク・承認履歴](https://github.com/kittybbit/vscode-JFixedViewer/blob/7fc29697a2f939dc1db9db8860b16df073e9e720/docs/specs/features/encoding-byte-length/TASKS.md)、
[要件と検証の対応](https://github.com/kittybbit/vscode-JFixedViewer/blob/7fc29697a2f939dc1db9db8860b16df073e9e720/docs/specs/features/encoding-byte-length/TRACEABILITY.md)

<!-- markdownlint-enable MD013 -->

全条件はスライス検証と独立レビューで確認した。

- **S1: VS Code 1.100 と文字コード API の利用条件**
  - 比較ベース `0b4400e45a9d97d86ab17658bedd593e9e95ef80`、完了コミット
    `0e43098bb523ea0eee5fbffeddd08c7bbb8b7ab1`。
  - `s1-review-v2` は Ready、指摘0。Main が利用者指示の条件を適用した。
  - [PR #21](https://github.com/kittybbit/vscode-JFixedViewer/pull/21)
    は `main` 向けで open。Verify、CodeQL、Analyze (actions)、Analyze
    (javascript-typescript) は同一 head で success。CodeQL の解析も同じ SHA。
- **S2: 形式別読込とバイト単位の表示・検証**
  - 比較ベース `0e43098bb523ea0eee5fbffeddd08c7bbb8b7ab1`、完了コミット
    `7fc29697a2f939dc1db9db8860b16df073e9e720`。
  - `s2-review-v2` は Ready、指摘0。レビュー入力 manifest SHA-256 は
    `5e8cb82f60f38b59460fbd4dfa7527c7d5bf3220b924e3229123fd7834ac5550`。
    Main が利用者指示の条件を適用し、承認・コミット対応を `s2-approval.json` に記録した。
  - [PR #22](https://github.com/kittybbit/vscode-JFixedViewer/pull/22)
    は S1 ブランチ向けで open。Verify、CodeQL、Analyze (actions)、Analyze
    (javascript-typescript) は head `7fc29697a2f939dc1db9db8860b16df073e9e720`
    で success。CodeQL の解析も同じ SHA。

PR #21 と #22 は GitHub Stack #23 に native link され、先行 PR の base、後続 PR の base/head、
stack 順序を確認した。各段に適用される ruleset、Verify、CodeQL を Main が最上位 head で再確認する。
PR #22 の終了差分を含む新しい head でも、必須チェックと CodeQL 解析リビジョンを確認する。
native link の生証跡と確認記録は保管証跡の `github/native-stack/` にある。

## 統合検証と運用準備

スライス最終入力で R1〜R10 の対応、Desktop/Web、最低対応版、アーキテクチャ、品質条件を確認した。

- 型確認、production webpack、`test:prepare`、`npm ci`、architecture 7/7 が成功。
- Desktop VS Code 1.146.0 の46件、最低版 VS Code 1.100.0 の smoke が成功。
- 標準 `vscode-test-web` の cold/warm が成功。親証跡の本番起動・command 登録 smoke も成功。
- 組み込み全銀33形式と JPX は `shiftjis` / `byte` に移行し、byte 境界の codec は5種類に限定した。
  dirty 文書を上書きしない読込、固定長表示、装飾と診断の更新を確認した。
- テレメトリのイベント一覧とオプトアウトを維持し、文書内容、パス、認証情報を送信しない。
- Qlty 0.645.0 の公式 SARIF 2.1.0 で基準・最終の check / smells は各0件、全体 check も通過。
- S2 の最終10文書は Markdown lint、Prettier、相対リンク、見出しと構造、`git diff --check` が通過。

詳細なコマンド、入力識別、ログは保管証跡の `s2-final/` と `production-startup/` に保持する。保管先は `/Users/jconee/.codex/visualizations/2026/11/12/01a1cffe-d3f0-7b02-aaab-b3ffff043fee/encoding-byte-length-evidence/`。完了済みの検証は入力と範囲が一致するため再利用し、終了差分に必要な文書検証は外部終了証跡に分けて記録した。

## 恒久文書と利用者向け変更

現行の対応挙動は [README](../../../README.md)、[CHANGELOG](../../../CHANGELOG.md)、
[サンプルガイド](../../../sample/README.md)、[アーキテクチャ](../architecture.md)、
[項目表示](../../requirements/use-cases/uc-display-fixed-width.md)、
[エディター切替](../../requirements/use-cases/uc-switch-editors.md)、
[固定長レコード検証](../../requirements/use-cases/uc-validate-fixed-width.md)に記録した。
今回の終了差分では、同じ未リリース欄にある旧「検証は文字位置ベース」を、現在の契約と一致する
「検証は形式の単位（文字位置またはバイト数）」に直した。

## 残るリスクと担当

- 過去の標準 Web 初回実行で cache 404 があったが、原因は未確定。後続の標準 CLI cold/warm は成功し、
  runtime の内容確認と本番起動 smoke も通過した。再発時の確認と対応は Main が担当する。
- native stack 登録前の CodeQL 対応として S1 ブランチに一時的な最小保護を追加した。
  stack の登録後も設定は残っている。全層統合後、Main が現設定を読み直し、追加時と同じ設定が
  残っている場合だけ元の未保護状態へ戻す。第三者の変更があれば消さずに、その状態と担当を
  終了証跡へ残す。復旧は Main の担当。
- 終了コミット後の最新チェック、マージ段階の条件適用、実マージと保護復旧は Main が担当する。
  終了承認後の実施状況と最終状態は、PR #22 と外部保持証跡から確認できる。
