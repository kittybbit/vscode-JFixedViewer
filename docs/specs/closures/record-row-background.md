# レコード種別の行背景色の終了証跡

## 判定と対象

- 作成担当は `feature-closer`。記録は2026-11-22の終了準備版。
- 行背景色のスライス1の終了判定は Close（`CLOSE_READY`）。
  終了差分の独立再レビューは Ready。2026-11-22 に利用者が本終了差分を承認し、
  機能は `CLOSE_APPROVED`。マージ承認と取り込み結果は未記録。
- 基準・最終の Qlty 解析パス一覧2件を公開 PR #30 の検証証跡に追加することも、利用者が明示的に承認した。
  一覧の対象は公開済みの基準・最終リビジョンにある相対パスとリポジトリルートに限る。
- スタックは [PR #30](https://github.com/kittybbit/vscode-JFixedViewer/pull/30) の1件。
  取り込み先は `main`。比較ベースは `64f09ff622a6719776e590be47967def9c3da4b4`、
  スライス完了コミットと検証済みの PR ヘッドは `a7b7295de66a289e4258fb02ec14ce6cf3a5cd5c`、
  tree は `13853580bb926359e3a5a14519060b4ee32f699a`。
- 計画コミットは `c08455a05ad32383008a095bb714d079e5788c16`、
  配色とビルド手順の再計画コミットは `921f346d9f9e1d52d38d3e148356c1164730c40d`、
  GUI を起動しない検証の再計画コミットは `511e555e5a9a583cda8b586d36696a70b415bee6`。
  独立計画レビュー、計画の承認、実装の独立レビュー Ready、完了承認の記録は
  [スライス完了時の作業計画][slice-record] にある。
- 実装レビューの対象は `511e555` から `a7b7295` までの `package.json` と `src` の10パス。
  バイナリ差分の SHA-256 は `bbf667dc29b594fa9bbf8d7634186809c054e6c72ec61510332c84ec6fb8a5dc`。
  利用者の指定で PR に含まれる `AGENTS.md` と `docs/specs/validation.md` は
  方針の変更。未追跡の `.serena/` は PR の差分に含まれない。

## 受け入れと検証

| 要件 | 確認結果 |
| ---- | -------- |
| 行定義の有効な色と最初に一致した行・モード | 模擬ホストで、無指定・無効な色、短い行、未一致行、診断の有効・無効を確認 |
| 全銀・JPX・NTT の共通配色とテーマへの追従 | 全38形式・206行の初期色と、テーマ別の全行装飾オプションを確認 |
| 表示範囲と前後20行、分割、編集、形式切替、解除 | 模擬ホストで対象行の更新、エディターごとの装飾、古い結果の破棄を確認 |
| 項目装飾と診断の維持 | 行背景とともに境界線、区切り、交互色、ホバー、カーソル強調、診断を確認 |

- 既存のロックファイルを使用した。型検査、デスクトップ版・Web 版の開発・本番ビルド、
  テスト準備、模擬ホスト5スイート57件、アーキテクチャ検査7件が通過。
  VS Code の最低対応は1.100.0。ローカルの実ホスト試験・GUI 目視は承認済み計画で対象外。
- Qlty 0.645.0 の `qlty check --all --sarif --no-fix` と
  `qlty smells --all --sarif --no-snippets` を実行した。
  公式 SARIF は2.1.0、基準と最終のいずれも終了コード0・指摘0件。
  最終の `npm run qlty` も終了コード0。
- [Verify] は成功し、デスクトップ安定版・1.100.0 と Web のテストも通過。
  [CodeQL] は Actions と JavaScript/TypeScript の両ジョブが成功。
  両ジョブの checkout ログの `refs/pull/30/head` は上記の `a7b7295` と一致し、
  [コードスキャン結果]に新規アラートはなかった。PR の表示は4件すべて成功。
- 定義検証はインフラストラクチャ層、最初の一致の選択はドメイン層で扱う。解析結果の行背景 DTO を
  アプリケーション層が返し、VS Code への装飾とその寿命はプレゼンテーション層で扱う。
- 残るリスクは、テーマごとの選択範囲、診断、背景色の重なり方を目視で確認していないこと。
  Main が表示に関する利用者報告を確認する。承認済みの検証では装飾指定と CI の実ホスト試験を用いた。

### Qlty の証跡

| 検査 | 基準の公式 SARIF | 最終の公式 SARIF | 解析パス |
| ---- | ---------------- | ---------------- | -------- |
| `check` | [基準の出力][base-check] | [最終の出力][final-check] | [基準293組][base-paths]、[最終299組][final-paths] |
| `smells` | [基準の出力][base-smells] | [最終の出力][final-smells] | [両入力で一致した39パス][smells-paths] |

- `check` の件数はプラグインとパスの組。先行実行の対象、最終の公式実行記録、選択件数、
  追跡パスの増分を照合し、キャッシュから使われた対象も一覧に記録した。
- 基準入力は上記の比較ベース（tree `014bb75db51498fb01abeb7f039dd69b7d260359`）。
  最終入力は計画コミット `511e555`（tree `e3ce42788039af39184aad996fa44595ee2709fc`）
  からの作業差分。製品・テストの入力は上記のバイナリ差分 SHA-256 で特定でき、完了コミットと一致する。
- 基準・最終で共通の `.qlty/qlty.toml` と `package-lock.json` の SHA-256 は以下のとおり。

  ```text
  ac1a67c5477e9a03154b0ff11fc13bfa84b1692376c692dc625a17f40cb9856b  .qlty/qlty.toml
  94c21516c9deed4ace354be1d0840ce0bcf001b99349b38ee07f70de6faedb18  package-lock.json
  ```

## 終了差分

独立再レビューでは、恒久文書6件の更新、終了記録と証跡7件の追加、作業文書2件の削除予定を照合した。
レビュー記録の追記前の操作一覧 SHA-256 は
`3956c1eeacf0ef3567d6cc9aa0e9db150a0757125f8af092759b873c02b25852`。
操作一覧はパス順の TSV で、パス、操作、HEAD 時点と変更後の各内容の SHA-256 を記録した。
恒久文書6件のバイナリ差分 SHA-256 は `956eea68703a6ab7d468410b15a33b7f6207ce99216b7cee9bc320a98606a3b1`。

反映先は [変更履歴](../../../CHANGELOG.md)、[機能一覧](../../../README.md)、
[固定長の項目表示](../../requirements/use-cases/uc-display-fixed-width.md)、
[エディター切替](../../requirements/use-cases/uc-switch-editors.md)、
[項目の装飾解除](../../requirements/use-cases/uc-clear-decorations.md)、
[アーキテクチャ](../architecture.md)、本記録、および [Qlty の証跡](#qlty-の証跡)に挙げた7ファイル。

終了承認の対象には、同じ PR の終了コミットで行う次の作業文書の削除を含む。

- `docs/specs/features/record-row-background/SPECS.md`
- `docs/specs/features/record-row-background/TASKS.md`

終了コミットを公開した後、Main が PR 最新ヘッドの必須チェックを照合し、
別途承認されたマージの方式、対象 SHA、`main` の取り込み SHA を本記録に追記する。

[slice-record]: https://github.com/kittybbit/vscode-JFixedViewer/blob/a7b7295de66a289e4258fb02ec14ce6cf3a5cd5c/docs/specs/features/record-row-background/TASKS.md
[Verify]: https://github.com/kittybbit/vscode-JFixedViewer/actions/runs/44964840501
[CodeQL]: https://github.com/kittybbit/vscode-JFixedViewer/actions/runs/44964837956
[コードスキャン結果]: https://github.com/kittybbit/vscode-JFixedViewer/runs/137031511352
[base-check]: record-row-background-evidence/base-check.sarif
[final-check]: record-row-background-evidence/final-check.sarif
[base-smells]: record-row-background-evidence/base-smells.sarif
[final-smells]: record-row-background-evidence/final-smells.sarif
[base-paths]: record-row-background-evidence/base-check-analysis-paths.tsv
[final-paths]: record-row-background-evidence/final-check-analysis-paths.tsv
[smells-paths]: record-row-background-evidence/smells-analysis-paths.txt
