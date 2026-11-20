# NTTの請求データの固定長形式の計画

## 作業概要

- [SPECS.md](SPECS.md) の4帳票を帳票ごとの S1〜S4 とし、2026年9月以降の4形式を追加する。
  グループを NTT とし、東西の対応するレイアウトを共用する。
- S1 の最初に対象4ロールのモデルを GPT-6.2 Sol に変更し、設定の反映を確認する。
- 再計画版 `plan-v4`。比較ベースは `a5f31fa9a3641ab52373aea958f00ea2ecac096f`。
  ユーザーによるエージェント更新の指定と、最初のスライスへ含めてよいという追記に従う。
- [SDD 方針](../../README.md)、[検証方針](../../validation.md)、
  [証跡方針](../../evidence.md)、[アーキテクチャ](../../architecture.md)に従う。

## 現在の状態

- ライフサイクル状態 `PLAN_COMMITTED`。4スライスを含む `plan-v4` の承認済み計画をコミットした。
- `plan-v3` は独立レビューで指摘0件の `PLAN_READY` だったが、人の承認とコミットは未実施。
  モデル4行の切替を S1 の承認範囲と検証へ加えた。帳票4形式の実装範囲と順序は維持する。
- 未コミットの機能文書2件を `ntt-west-dial-billing` から `ntt-billing` へ移した。
  調査・計画文書以外の変更は未実施。`.serena/` は既存の未追跡で作業対象外。

[ライフサイクル状態](../../README.md#ライフサイクル状態)に従う。

## GitHub スタック

<!-- markdownlint-disable MD013 -->

| 層  | スライス      | ブランチ                        | PR の対象     | ベースとヘッド            |
| --- | ------------- | ------------------------------- | ------------- | ------------------------- |
| 1   | S1 ダイヤル   | `codex/ntt-billing`             | `main`        | PR #25                    |
| 2   | S2 固定電話   | `codex/ntt-billing-telephone`   | S1 のブランチ | S1 最新通過ヘッドから作成 |
| 3   | S3 ひかり電話 | `codex/ntt-billing-hikari`      | S2 のブランチ | S2 最新通過ヘッドから作成 |
| 4   | S4 専用線     | `codex/ntt-billing-leased-line` | S3 のブランチ | S3 最新通過ヘッドから作成 |

<!-- markdownlint-enable MD013 -->

- S1 を [PR #25](https://github.com/kittybbit/vscode-JFixedViewer/pull/25) として公開した。
  PR のベースは `a5f31fa9a3641ab52373aea958f00ea2ecac096f`、
  ヘッドは `a42a7d9857373d0b346c913daf2603c78d30b7ff`。
  S1 の実装ベースは計画コミット `014e316e17c9a96301994daf5af64b695e507c44`。
- 上記のヘッドで [Verify](https://github.com/kittybbit/vscode-JFixedViewer/actions/runs/44517465873)
  と [CodeQL](https://github.com/kittybbit/vscode-JFixedViewer/actions/runs/44517459985)
  が通過した。
  CodeQL は `refs/pull/25/head` の同じコミットで JavaScript/TypeScript と Actions を解析し、
  検出は0件だった。適用ルールと4チェックの結果は `ntt-billing-evidence/s1-approval/` に保持する。
  GitHub がこのヘッドに記録したチェック以外に必須の Cloud ステータスはなかった。
- 各スライスの完了コミット直後に、その層だけの差分の PR を公開する。
  後続は先行層の最新ヘッドで Verify、CodeQL、必須の GitHub・Cloud チェックが通過してから委任する。
  CodeQL が解析したリビジョンとヘッドの対応、PR URL、ベースとヘッドを本節へ追記する。
- 最上位 S4 のヘッドは全4スライスと終了差分を含む。S4 のブランチに終了コミットを積み、
  変わったヘッドで必要なチェックを確認し直す。
- 終了承認と最新チェックをそろえた後、全層の順序、取り込み先、正確なベースとヘッド、
  マージ方式、終了コミットを特定してマージ承認を得る。
  全層の実際の取り込み先コミットを確認するまで、下位 PR を開いたままにする。

[GitHub 標準のスタック PR](../../README.md#github-標準のスタック-pr)に従う。

## 人による承認

- 計画承認 `Approved`。2026-11-19、利用者がこのチャットで承認した。
  対象は `plan-v4` の S1〜S4、各節の正確なパス、
  共通設計、受け入れ条件、検証、終了時の2文書削除。`plan-v1`〜`plan-v3` も未承認。
  S1 は帳票に加えて、下記4ロールのモデル変更と専用検証を含む。
  承認対象の識別情報と `plan-review-v4` の判定は「計画レビューの証跡（plan-v4）」を参照する。
  計画コミットと承認の証跡は Git 外の `ntt-billing-evidence/plan-approval-v4/summary.txt` に保持する。
- S1 と S2 の完了承認は `Approved`。S3・S4 の完了承認、終了承認、マージ承認は `Pending`。
- 計画承認は列挙した範囲に適用する。各スライスの完了コミット、PR、マージ結果は未記録。
  後続の各承認段階は Main が利用者の承認とレビューを結び付けて追記する。

[人による承認](../../README.md#人による承認)に従う。

## 調査と一次資料

- 西日本の[新旧比較一覧](https://www.ntt-west.co.jp/denwa/2026bill/meisai/charcode/)と
  [現行サンプル一覧](https://www.ntt-west.co.jp/my/code/)を対応範囲の根拠とする。
  東日本の[対応資料](https://flets.com/2026billing/moji_code.html)の ZIP 内 PDF も取得した。
- Main の取得物は `/tmp/jfixedviewer-ntt-official-20261119/`。
  西の比較 PDF の番号 `27/19`、`23/07`、`11`、`15` は
  順にダイヤル2区分、固定電話2区分、ひかり電話、専用線を表す。
  東の ZIP `010/026`、`006/014`、`018`、`022` が対応する。
- 比較表の変更後の欄について項目名、順序、型、桁数、バイト数、識別子、注記を照合する。
  Main の比較で東西6対の対応する項目列・公称幅の差分0を確認済み。説明文と許容値、
  反復展開後の位置と行条件は各スライスで別途照合する。
  永続の調査記録は `ntt-billing-evidence/official-2026-11-19/summary.txt` を参照する。
  一括請求は東の札幌以外と西の金沢以外、広域一括請求・統合請求等は東の札幌と西の金沢が対応する。
  今回のダイヤルと固定電話は両請求区分で項目列が共通。
- 参考チャット「NTT固定長形式の比較」は東の ZIP 未取得時の調査として参照した。
  今回は取得した ZIP 内 PDF を使い、今回の対象版と請求区分ごとの全項目照合で判断する。
- 新版の6組の公式サンプルは BOM 付き UTF-8 と CRLF。
  M は128、K と N は512、S は700バイト。M の内容は ASCII、
  K・N・S はマルチバイトを含む。BOM と改行を行幅に含めない。
- 固定電話とひかり電話の内訳ブロックは表で中間の反復が省略されている。
  項目を反復回数どおり展開し、初回・継続行のそれぞれを512バイトに照合する。
- 一部の「数字」の内訳額は注記で先頭の半角マイナスを認める。
  桁と注記を確認して型表示を `符号付き数値` とする。既存の `N` 診断と区別する。
- `fileNamePattern` はロードされるが、自動判定の入口はない。形式は手動選択で適用する。

## 共通の設計と承認範囲

- `src/resource/definitions/ntt.json` にグループ `ntt`、名前 `NTT` を置く。
  S1 で追加・登録し、S2〜S4 はそれぞれの帳票の `files` だけを追記する。
  すべて `utf8bom` と `byte` とする。
- 4形式の識別子を `dial_meisai_2026`、`telephone_2026`、
  `hikari_2026`、`leased_line_2026` とし、末尾に `@ntt` を付ける。
- 表示名と請求区分は SPECS に従う。新版 M/K のファイル名は10桁と12桁を受け入れる。
  N/S は公開比較表の10桁を用いる。すべて公式名の拡張子なしを基準にする。
- ASCII 部分の種別・通番を既存の行条件で照合し、初回と継続、繰返しを表す。
  項目を新しいオブジェクトへ動的変換する仕組みや業務バリデーターを追加しない。
  符号付き欄の型表示は既存の自由な `type` 文字列で表す。
- 既存の `src/test/extension.test.ts` に通常コマンドを通る回帰を追加し、
  共通の `src/test/support/nttSmoke.ts` に実ホスト確認を実装する。
  S1 で共通入口を用意し、各後続スライスで対象帳票を追加する。
- 共有文書の `README.md`、`CHANGELOG.md`、`sample/README.md`、
  `docs/requirements/use-cases/uc-display-fixed-width.md` は各スライスの帳票部分だけを追記する。
  `sample/.gitattributes` は追加サンプルの正確なパスに
  `-text whitespace=-blank-at-eol` を設定して、文字コード、改行、末尾 SP を保持する。
- 各スライスは機能内の `SPECS.md` と `TASKS.md` に検証と承認の証跡を追記できる。
  生成物は既存の `out/`、`dist/` に置き、コミットしない。
- 製品の変更は静的定義と登録に収める。ドメイン、Application、Presentation、
  テレメトリ、公開設定、依存、最小対応版、CI、ランナー設定、全銀と JPX の定義は対象外。

## スライス S1. ダイヤル通話料金明細内訳書

- 状態 `SLICE_COMMITTED`。完了承認後にコミットし PR #25 を公開した。スタックの第1層。
- 価値はダイヤル通話の項目と問題を両請求区分で確認できることと、
  今後のロール実行で指定の GPT-6.2 Sol を使えることである。
  R0 と R1〜R6、共通設計・共通検証、後述のモデル設定検証を適用する。
- 承認パスは `src/resource/definitions/ntt.json` の追加と
  `src/infrastructure/definitions/loadBuiltInDefinitions.ts` の登録、
  `src/test/extension.test.ts`、`src/test/support/nttSmoke.ts` の追加、
  `src/test/smoke.ts` の共通入口への接続、上記の共有文書と属性、機能文書。
- モデル変更の正確な承認パスは `.codex/agents/feature-author.toml`、
  `.codex/agents/planner.toml`、`.codex/agents/plan-reviewer.toml`、
  `.codex/agents/implementation-reviewer.toml`。各ファイルの `model` 1行だけを
  `gpt-6.1-sol` から `gpt-6.2-sol` に置き換える。
- 実装担当 `implementer` は先に4行を更新し、実際の設定読込と可用性を確認してから
  ダイヤル帳票を実装する。設定切替は他の帳票に依存せず、その差分と結果を独立に確認できる。
  ユーザーが最初のスライスへまとめることを許容したため、S1 の最初の作業として扱う。
- 追加サンプルは `sample/ntt/M000000000001_202609`。
- 6種は先頭 `1`〜`6`。全行を128バイトとし、各種別を架空サンプルに含める。
- 新版はお客様番号10桁を12バイトへ補充した値と12桁値、10/12桁の名前の両方を確認する。
  西の金沢以外と東の一括請求の対応を明記する。新版は金沢・札幌の区分も共通配置として扱う。
- `utf8bom` の実ホスト認識を最初に確認し、その結果が既存の encoding 完全一致契約で成立したら
  定義・サンプルを仕上げる。
- レビューと完了承認を経て完了コミットを作り、S1 PR を公開する。
  最新ヘッドのチェックを Main が記録してから S2 を委任する。

### S1 の実装と検証（2026-11-19）

- 実装ベースは計画コミット `014e316e17c9a96301994daf5af64b695e507c44`。
  人による計画承認と独立計画レビューは、後述の plan-v4 証跡を参照する。
- R0 PASS。承認された4つのエージェント設定で `model` だけを更新した。
  デスクトップのロール再読込と、ephemeral / read-only の CLI 実行結果は
  Git 外の実装証跡に保存した。実行時の model は `gpt-6.2-sol`、effort は `medium`。
- R1 PASS。実ローダーに `dial_meisai_2026@ntt` を登録した。
  表示名、手動選択、10桁・12桁の拡張子なしファイル名とデータ内番号を確認した。
- R2 PASS。BOM 付き UTF-8、CRLF、末尾 CRLF、SP 補充、6行各128バイトを確認した。
  実ホストの smoke は BOM 認識、CRLF、バイト位置、描画、診断0件、書込み0件を通った。
- R3 PASS。1〜6の全レコード種別、63項目のホバーと幅、診断を確認した。
- R4 PASS。架空値の6種サンプルを追加し、出典・選択方法と Git 属性を記録した。
  項番11「県名」は仕様どおり半角SP2桁にした。
- R5 PASS。未知種別、幅の前後1バイト、N欄の英字・数字/SP混在を診断し、全SPを許容した。
- R6 PASS。東西の公式比較表と対象請求区分を照合し、配置を共通定義にした。
  公式資料の比較証跡は Git 外の `official-2026-11-19/` にある。
- 検証は `npm exec -- tsc -p . --noEmit`、`npm run test:prepare`、
  `npm run test:architecture`（7/7）、production webpack build、
  デスクトップ安定版1.147.0（52件）、最小版1.100.0、Web安定版1.147.0で Pass。
  build の Web asset-size 警告は出たが webpack は exit 0。
- Qlty 0.645.0 の `npm run qlty` は exit 0。ただし合成スナップショットでは
  変更パスなしと報告されたため、最終根拠はキャッシュなし全体検査とする。
  基準・最終を同じ設定で検査し、基準2件（SPECS/TASKS の Prettier 整形）、最終0件。
  smells は基準38・最終39ファイルで0件。SARIF、7プラグインの解析パスと
  設定ハッシュは実装証跡の `qlty/` に保存した。
- S1 の正確な変更パス、内容 SHA-256、コマンドの生ログと省略しない SARIF は
  `s1-implementation-2026-11-19/` に保存した。
  レビュー修正後のホストログは同フォルダーの `review-fix-*.log` と
  `s1-main/min-script-review-fix.log` にある。
  承認は `plan-approval-v4/`、計画レビューは `plan-review-v4/`、
  ロール再読込は `s1-main/codex-role-refresh.txt` を参照する。
- S1 の完了コミットは `a42a7d9857373d0b346c913daf2603c78d30b7ff`。担当は Main。
  承認とステージ済み差分の照合結果は `ntt-billing-evidence/s1-approval/` に保持する。
  webpack の asset-size 警告と Qlty 設定の未対応項目警告はあるが、検査は成功した。
- この機能に個別の `TRACEABILITY.md` はない。R0〜R6 と検証の対応は
  本書と `SPECS.md` に記録し、別ファイルを新設しない。

### S1 の独立実装レビュー

- `implementation-reviewer` を更新後の `gpt-6.2-sol`、`medium` で起動した。
  初回は R4 の県名欄と R5 の数字・空白混在の回帰に指摘があり、実装担当が修正した。
- `s1-review-v2` は Ready。ベース `014e316e17c9a96301994daf5af64b695e507c44` に対する
  17パスの内容と、修正後の実ホストテストおよび Qlty の証跡を照合した。
- レビュー対象の `s1-path-hashes.json` の SHA-256 は次のとおり。

  ```text
  e64e385ee73555e17d7d5f0d01b7928a3d0451a5b9786298f943c3948aa72201
  ```

- 判定と状態追記の検証は Git 外の `ntt-billing-evidence/s1-review-v2/` に保持する。
  完了承認には、上記のレビュー済み差分と下記の再レビュー済み設定を含める。

### S1 のビルド修正と再レビュー

- `npm run compile` と `npm run package` の事前処理で、Qlty が
  `.serena/project.yml` を検査して55件を報告し、ビルドが停止した。
  利用者の指示により、S1 内で再計画を省略して修正した。
- `.qlty/qlty.toml` は `vscode-ajsbutler` を参考に
  トップレベルの `exclude_patterns` へ `**/.serena/**` を追加し、既定の25パターンを維持した。
  以前のローカル Git 除外は外した。
- Git で除外していない検証用コピーで、両ビルドは終了コード0。
  Qlty 全体検査は55件から0件になり、解析対象から外れた4組はすべて `.serena/` 内だった。
  smells は前後とも39ファイルで0件。既存のデスクトップ版・Web版のテスト証跡を再利用した。
- 限定再レビューは Ready、指摘0件。設定ファイルの SHA-256 は次のとおり。

  ```text
  ac1a67c5477e9a03154b0ff11fc13bfa84b1692376c692dc625a17f40cb9856b
  ```

- 検証と判定は Git 外の `ntt-billing-evidence/s1-qlty-serena/` に保持する。
- 2026-11-19、このチャットで利用者が S1 の差分を完了承認した。
  対象は上記の独立レビュー済み17パスと、追加で独立レビューした `.qlty/qlty.toml`。
  完了承認時の18パスの一覧は `s1-qlty-serena/s1-path-hashes.json` にあり、その SHA-256 は
  次のとおり。

  ```text
  995489440cd1efa7ef635abdcad756790a1643ca6d07194ef55de006783f9a3b
  ```

## スライス S2. 電話番号別明細内訳書

- 状態 `SLICE_APPROVED`。独立レビューで指摘0件、利用者の完了承認済み。第2層。
  実装ベースは S1 の `a42a7d9857373d0b346c913daf2603c78d30b7ff`。
- 価値は固定電話の請求内訳と合計を両請求区分で確認できること。
  R1〜R6 と共通設計・共通検証を適用する。
- 承認パスは `src/resource/definitions/ntt.json` の当該形式、
  `src/test/extension.test.ts`、`src/test/support/nttSmoke.ts`、
  上記の共有文書と属性、機能文書。ローダーと実ホスト入口の再変更は予定しない。
- 追加サンプルは `sample/ntt/K000000000001_202609`。
- 管理、電話番号別内訳の初回・継続、お客様番号合計の初回・継続、総合計を含め、
  全通常行512バイトを確認する。種別と通番の条件を分け、内訳ブロックを全反復分展開する。
- 両請求区分は共通配置とし、
  お客様番号の SP 補充と名前10/12桁を検証する。
- 日本語の欄境界を UTF-8 のバイト位置で検証する。
  仕様で許す負の内訳額に誤診断がなく、数字専用欄の不正値は診断されることを確認する。
- 完了承認後のコミットと S2 PR の最新チェックを Main が記録してから S3 を委任する。

### S2 の実装と検証（2026-11-19）

- plan-v4 と承認済み計画コミット `014e316e17c9a96301994daf5af64b695e507c44` の範囲で実装した。
  計画レビューと人による計画承認の証跡は `plan-review-v4/` と `plan-approval-v4/`、
  先行 PR #25 の Verify・CodeQL と適用ルールは `s1-approval/` にある。
- 変更パスは `src/resource/definitions/ntt.json`、`src/test/extension.test.ts`、
  `src/test/support/nttSmoke.ts`、`sample/ntt/K000000000001_202609`、
  `sample/.gitattributes`、ルートの `README.md` と `CHANGELOG.md`、
  `sample/README.md`、`docs/requirements/use-cases/uc-display-fixed-width.md`、
  本書である。S1 の登録と実ホスト入口を再変更せず、S1 の帳票・試験を保持した。
- R1 はローダーから `telephone_2026@ntt` を解決し、手動選択、拡張子なし K 名の10桁・12桁、
  10桁番号の先頭 SP 補充を回帰で確認した。
- R2 は BOM、CRLF、末尾 CRLF、6行の512バイト幅を確認した。
  実ホスト smoke は `utf8bom`、CRLF、日本語欄の UTF-8 バイト境界、診断なし、書込み0件を確認した。
- R3 は管理、電話番号別内訳の初回・継続、お客様番号合計の初回・継続、総合計を区別し、
  内訳1〜16を展開した全フィールド名と幅を照合した。負の内訳額の診断はなく、型表示は `符号付き数値`。
- R4 は架空値だけのサンプルと利用案内を追加し、当該ファイルの文字コード・改行・末尾 SP を Git 属性で保持した。
- R5 は未知種別、幅の前後1バイト、数字専用欄の英字・数字/SP混在、全 SP の許容を通常の選択経路で確認した。
- R6 は西07・東014の比較資料と両請求区分を照合した。配置は共通定義を使い、
  東西の該当する比較列は `official-2026-11-19/layout-comparison.txt` で差分0。
  公式サンプルの個別値は転載せず、取得資料と列対応は Git 外の公式資料証跡に保持した。
- 恒久文書の変更は README、CHANGELOG、サンプル案内、項目表示ユースケースに限定した。
  この機能に独立した `TRACEABILITY.md` はなく、R1〜R6 と検証の対応は既存の SPECS.md と本書に維持した。
- 必須のローカル検証は型検査、`test:prepare`、アーキテクチャ7/7、production webpack、
  デスクトップ安定版53件、Web 安定版の実ホスト smoke、最小版1.100.0で通過した。
  Web は S1 で確認済みの安定版コミットを再利用し、追加 download を必要としなかった。
  ログと Qlty の最終証跡は `s2-implementation-2026-11-19/` と
  `s2-main/min-script-verified.log` に保持する。
- Qlty 0.645.0 の基準と最終の `check` / `smells` はすべて0件で、最終 `npm run qlty` も通過した。
  SARIF、終了コード、解析対象一覧、実行ログは `s2-implementation-2026-11-19/qlty/` に保持する。
  基準と最終の両方で `qlty.toml` の未対応設定に関する警告が記録された。
- 準備状況はローカル検証完了。S2 の独立実装レビュー、完了承認、完了コミット、PR の必須チェックは Main の後続作業。
  S2 PR の最新ヘッドチェック前に S3 へ進まない。webpack には既存の Web asset size 警告がある。
- Main の未追跡 `.serena/` は対象外で変更していない。検証スナップショットと Qlty 対象にも含めていない。

### S2 実装レビュー指摘の修正（2026-11-20）

- `s2-review-v1/summary.txt` の4件を、承認済みS2パス内で修正した。
  ベースは引き続き `a42a7d9857373d0b346c913daf2603c78d30b7ff`。
- 51継続は初回行の複製を除き、先頭18バイト、予備45バイト、5項目×16回の320バイト、
  予備129バイトに変更した。定義は86項目となり、最初と最後の内訳額の位置・型、負額と診断なしを
  fake host と実ホスト smoke の両方で確認した。通常入力では診断0件。
- 11と51の継続通番は `02`〜`99` を受け入れ、`00` と非数字通番を未知行として診断する。
  初回 `01`、継続 `02`・`03`・`99` と範囲外を fake host で確認した。
- Kサンプルと実ホスト fixture は電話番号1件、明細レコード数 `02`、請求額4567、内訳合計4567を一致させた。
  51初回の請求件数と91総合計請求件数は電話番号数の `1`。口座名義と氏名はUTF-8で各文字3バイトの
  半角カナにし、fake host で全レコードの一致を確認した。西日本資料に残る旧予定「2026年1月」と
  延期後の適用開始「2026年9月」をサンプル案内で説明する。
- fake host の通常の形式選択では、マルチバイト文字途中の境界診断、別形式からの `utf8bom` 再読込、
  文書内容、dirty 状態、保存イベント不変を確認した。実ホスト smoke は診断なし、ファイル書込み0件。
- 型検査、`test:prepare`、安定版 Desktop 53件、安定版 Web smoke、production webpack、
  最小版1.100.0を通過した。最小版は `/private/tmp/ntt-s2-min-fix-final.m3AHaN` から実行し、
  拡張 active・exit 0。生成物3件の SHA は `s2-main/min-script-review-fix-final.log` に記録した。
- Qlty 0.645.0 の最終 `npm run qlty`、`check`、`smells` は0件。
  `check` は `--no-cache` で実行し、`smells` には当該バージョンの CLI に無キャッシュ指定がないことを確認した。
  SARIF、終了コード、実行ログ、Qlty の設定・入力一覧 `qlty-final-metadata.txt` と
  `qlty-final-input-paths.txt`、`final-files.sha256`、`final-diff.patch`、
  `final-diff.sha256` は
  `s2-review-fix-2026-11-20/` に保持する。
  Qlty の基準と適用範囲、旧警告は `s2-implementation-2026-11-19/qlty/` の記録を再利用した。
- TRACEABILITY.md は設けていない。R1〜R6 の要件対応は SPECS.md と本書で維持し、今回追加した
  R2/R3/R4/R5 の境界検証を本書に反映した。webpack の既存 Web asset size 警告は継続する。

### S2 再レビュー指摘の修正（2026-11-20）

- 再レビューの残り2件を承認済みパス内で修正した。S1 の `dial_meisai_2026` 定義は、63項目を含む
  オブジェクト全体をベース `a42a7d9857373d0b346c913daf2603c78d30b7ff` のバイト列に復元した。
  S2 の `telephone_2026` 定義オブジェクトは変更していない。
- 10桁請求テストは6行すべての顧客番号を先頭SP2文字＋10桁に統一した。管理・51初回/継続・91は
  先頭12バイト、11初回/継続は各レコードの顧客番号欄を置換し、6欄の値、512バイト幅、診断0件を確認した。
- 型検査、`test:prepare`、安定版 Desktop 53件、Web smoke、アーキテクチャ7/7、production webpack、
  Qlty の `npm run qlty`・全体 `check`・`smells` は通過した。前回 Main が実行した最小版1.100.0の
  3生成物と、extension/web bundle、production bundleのSHAは今回の生成物と一致した。
  前回の最小版証跡（`s2-main/min-script-review-fix-final.log`）を再利用した。
- 最新の SARIF、設定・全125入力パス、実行ログ、生成物比較、S1バイト一致確認は
  `s2-review-fix-2026-11-20/re-review/` に保持する。最終10パスのSHA一覧と差分SHA-256は
  `final-files.sha256` と `final-diff.sha256`、差分本体は `final-diff.patch` に記録した。
  以前の検証メタデータ追記時の候補ハッシュは `final-diff-before-task-metadata.*` に退避し、
  その候補からの変化は `candidate-history.txt` に記録した。

### S2 の独立実装レビュー

- `implementation-reviewer` による3回目の判定は Ready、指摘0件。
  先行するレビューの指摘を解消し、西日本・東日本の公式資料4点と
  6種類のレコード全294項目の名称・型・幅・順序を照合した。
- レビュー対象は S1 ヘッドに対する10パス。下記は対象を特定する
  `final-files.sha256` と `final-diff.patch` の SHA-256。

  ```text
  55ad5d2c8b677aaf629841fe0357905846ed6d01d7f192bf0dcd95bf96b0732d
  36677c282eb9ada5448707c54083a463c7995731fe75ea0807883c6342eac579
  ```

- 判定と本節の追記に対する検証は Git 外の `ntt-billing-evidence/s2-review-v3/` に保持する。
- 2026-11-20、このチャットで利用者が S2 の完了差分を承認した。
  対象は上記のレビュー済み10パスと、別途検証した状態記録。承認対象一覧の SHA-256 は次のとおり。

  ```text
  1928bfbebb6587dc1ceaead9bce885982c4d7d00a3ff9fe1756ee91e83b7e404
  ```

- 完了コミットと PR の証跡は Git 外の `ntt-billing-evidence/s2-approval/` に保持する。

## スライス S3. 電話番号別明細内訳書（ひかり電話）

- 状態 `PLAN_APPROVED`。依存は S2 の完了コミット・PR 公開・最新チェック通過。第3層。
- 価値はひかり電話の専用項目と内訳を確認できること。
  R1〜R6 と共通設計・共通検証を適用する。
- 承認パスは `src/resource/definitions/ntt.json` の当該形式、
  `src/test/extension.test.ts`、`src/test/support/nttSmoke.ts`、
  上記の共有文書と属性、機能文書。
- 追加サンプルは `sample/ntt/N0000000001_202609`。
- 管理、電話番号別内訳の初回・継続、合計の初回・継続、総合計を含め、全通常行512バイト。
  固定電話の定義を流用して項目を省略せず、ひかり電話の反復数と各幅を確認する。
- 網識別コード `5`、日本語欄、符号付き内訳額、
  先頭識別子の前にある ASCII の幅と通番による初回・継続の分岐を確認する。
- 完了承認後のコミットと S3 PR の最新チェックを Main が記録してから S4 を委任する。

## スライス S4. 専用線番号別明細内訳書

- 状態 `PLAN_APPROVED`。依存は S3 の完了コミット・PR 公開・最新チェック通過。第4層。
- 価値は専用線の管理・内訳・請求単位・合計を700バイトの各レコードで確認できること。
  R1〜R6 と共通設計・共通検証を適用する。
- 承認パスは `src/resource/definitions/ntt.json` の当該形式、
  `src/test/extension.test.ts`、`src/test/support/nttSmoke.ts`、
  上記の共有文書と属性、機能文書。
- 追加サンプルは `sample/ntt/S0000000001_202609`。
- 公式表の8種のレコードをすべて含める。同じ種別の欄でも内容に応じて項目名を分け、
  管理、ヘッダ、データ、トレーラ、会社別トレーラ、エンド、請求単位、総合計の位置を照合する。
  会社別トレーラの `14` と `15` を両方含め、全種別の `01,11,12,13,14,15,21,81,91` を確認する。
  先頭の2文字のレコード区分で判定し、全行700バイトを確認する。
- 日本語欄と費用の桁数、数値表現の注記を確認する。
  各種別の短い・長い行を700バイトの期待幅で診断する。
- 完了承認後のコミットと S4 PR の最新チェックを Main が記録し、終了判定を委任する。
  終了差分は同じ S4 ブランチに積む。

## モデル設定の検証

- S1 の設定差分は上記4ファイルの4行とし、TOML パーサーで構文を確認する。
  比較ベースの全7ロールを解析し、対象4ロールの `model` 以外のキーと値、
  他3ロールの内容、名前、`medium`、sandbox、権限、担当、停止条件が等しいことを照合する。
- 受付、計画、独立レビュー、計画承認、Luna による実装、完了承認、終了、マージまでの
  静的なシナリオを確認する。読み取り専用ロールが編集しないこと、人の承認を代行しないこと、
  再委任しないことも確認する。
- 実装時に `codex --version` と現行 CLI の `--help` を記録する。
  `codex debug prompt-input` 等の実際の設定読込を通る機能で、当該チェックアウトの
  4ロールと更新モデルの宣言が読み込まれたことを確認する。
  出力から必要なロールの名前・モデル・設定元だけを証跡へ取り出し、認証情報を記録しない。
- `codex debug models` で実環境のモデルカタログを取得し、
  `gpt-6.2-sol` と `medium` の可用性を確認する。
  バンドルだけの一覧やモデル指定の直接起動は、ロール設定の読込証拠と区別する。
- 必要な実行確認は `codex exec --ephemeral --json --sandbox read-only` の一時実行を使い、
  ファイルを編集しない短い応答で確認する。呼出しは読込確認済みの対象モデルを使い、
  実行記録のモデル、推論設定、エラーとフォールバックの有無を保持する。
  この実行のために新たなユーザーチャットや永続設定を追加しない。
- 読込用出力に対象ロールと設定元が現れない、設定が解釈されない、モデルが利用できない、
  選択モデルを実行記録で確かめられない場合は、確認できた範囲と不足を Main に返す。
  `-m` の直接指定や既存セッションのモデル表示だけでロール更新を `Pass` にしない。
- S1 の独立レビューを委任するとき、Main は更新済みの `implementation-reviewer` 設定が
  参照されることを確認する。現在のセッションに旧宣言が残る場合は、読み込み直す方法を調査して判断し、
  実際の次のロール起動のモデルを証跡に残す。設定ロードのための新たな構成追加は今回に含めない。
- ロール設定だけの差分について製品ビルドと実ホストは `Not Applicable` とし、
  TOML、設定読込、ロール契約と承認フロー、可用性を専用検証にする。
  S1 全体には帳票の製品変更が含まれるため、下記の全必須コマンドを実行する。
  公開後の GitHub・Cloud チェックも S1 の実際の最新ヘッドで通過を確認する。

## 設計の責務と境界

ロールのモデル選択は `.codex/agents/` の構成の責務とし、実装・レビューの権限と承認境界を保つ。
静的な業務レイアウトを Resource に置き、Infrastructure の既存ローダーが共通定義へ変換する。
Domain の行照合とバイト境界、Application の投影と検証、Presentation の選択と描画を再利用する。
同じ JSON の `files` へ帳票ごとに追記するため、実装順による依存をスタックで管理する。
テスト共通入口は S1 が所有し、後続は当該帳票のケースを追加する。
既存のブラウザー対応のテスト経路を使う。設計の妥当性は独立レビューで判断し、
依存方向はアーキテクチャテストで確認する。

## 共通の検証と証跡

R0 は S1 に適用する。R1〜R6 は帳票4スライスに適用する。

<!-- markdownlint-disable MD013 -->

| 要件 | 各スライスで確認する内容                                                 |
| ---- | ------------------------------------------------------------------------ |
| R0   | S1 で4行の差分、全ロール契約、TOML、設定読込、対象モデルの実行と可用性。 |
| R1   | 実ローダー、形式名と識別子、手動選択、全銀・JPX の既存回帰。             |
| R2   | BOM・CRLF・末尾 SP・バイト幅・日本語境界と実ホストの encoding。          |
| R3   | 全種別・初回継続・全反復項目の公式ページ対応、全行幅、ホバーと診断0件。  |
| R4   | 全対応レイアウトの架空サンプル、番号と年月、公式の注記、Git 属性。       |
| R5   | 未知種別、期待幅の前後1バイト、N 欄の英字と数字/SP混在、全 SP の許容。   |
| R6   | 東西の対応資料、両請求区分の共通配置と差分、名前と番号補充。             |

<!-- markdownlint-enable MD013 -->

- 符号付き欄は正当なマイナス値で診断0件、数字専用欄は `INVALID_TYPE` を確認する。
  診断が自由な型表示の意味まで検証するものと案内しない。
- 偽ホストの通常コマンドと手動選択から全サンプルを解析し、ホバー・境界・診断、
  切替と再読込、文書内容・保存・書込み回数の不変を確認する。
- 実ホスト共通 smoke は読み取り専用 FileSystemProvider に架空のバイト列を渡す。
  Node API を使わず実ローダーと既存の選択・描画経路を通す。
  BOM 付き UTF-8 の encoding、先頭行、マルチバイト位置、投影と診断、描画完了、書込み0件を確認する。
  Quick Pick の UI 操作は偽ホストで検証する。
- S1 の smoke は UTF-8 BOM と128バイト、S2・S3 は日本語と符号付き欄、
  S4 は700バイトの各種別を追加する。先行スライスのケースをすべて保持して回帰する。
- 識別子を探す正規表現は ASCII の固定部分だけで位置を定める。
  日本語欄の後ろの byte 番号を UTF-16 文字数として条件に使わない。
- 以下を各スライスの最終検証として実施する。整形を含むコマンドは使い捨てのスナップショットで実行する。

```sh
npm exec -- tsc -p . --noEmit
npm exec -- webpack --mode production --devtool false
npm run test:prepare
npm run test:architecture
npm run test:desktop
npm run test:desktop:min
npm run test:web
qlty check --all --sarif --no-fix
qlty smells --all --sarif --no-snippets
npm run qlty
```

- デスクトップ安定版、最小版1.100.0、Web 安定版を必須とする。
  各ホストで共通 smoke に追加した当該帳票と先行帳票の経路を確認する。
- Qlty は0.645.0以降、基準と最終で同じ版・設定・対象選択を使う。
  公式 SARIF 2.1.0、解析パスと非0件数、終了コード、版、設定ハッシュ、生ログ、
  総合チェックを保持し、新規・悪化0件と最終の総合チェック通過を必要とする。
- Markdown は全変更文書を markdownlint 0.41.0 で検査する。
  相対リンク・構造、`git diff --check`、サンプルのバイトと属性を確認する。
- 証跡は本チャットの書込み可能領域
  `/Users/jconee/.codex/visualizations/2026/11/18/01a1f105-0989-72a2-a0d2-b442eab9937d/ntt-billing-evidence/`
  に置く。作成者、版、ベース、最終入力の内容一覧、承認パス、検査パス、改名、
  未追跡の `.serena/`、設定と lockfile、結果と生ログを保持する。
- 公式資料のハッシュとページ・項目対応は Git 外の証跡に残す。
  製品チェックは実装後に実施し、現在の計画段階では `Not Applicable`。
  GitHub と Cloud のチェックは PR の最新ヘッドに結び付けて別に記録する。

## リスクと停止条件

- 対応版の名前と請求区分、ファイル名10/12桁、SP 補充を区別する。
  公式注記を含めて照合し、抽出テキストだけで同一性を判断しない。
- モデルの反映や可用性は専用検証で確認し、不足やクライアントの旧宣言が残る場合は Main に戻す。
- BOM の実ホスト認識、反復展開、負値は上記の定義と検証で確認する。
  既存エンジンで条件を表せない、未列挙パスが必要、数値表現を扱えない場合は Main に戻す。
- 現行の公開形式に追加の根拠が得られた場合、Main が全項目の仕様と表現可否を確認する。
  後続スライスの追加には再計画・独立レビュー・計画承認が必要。
- 必須のホスト実行や Qlty が環境要因で実行できない場合は生ログを保持して Main に返す。
  不足した証跡を `Pass` にせず、準備完了と判定しない。

## 旧計画の証跡

- `intake-v1` と `plan-v1` の対象は金沢以外の新版ダイヤル1形式だった。
  旧 `plan-review-v1` は2026-11-19に Ready for approval、指摘0件と判定した。
  人の承認・コミット・実装は未実施。
- 旧レビュー対象の SHA-256 は次のとおり。

  ```text
  99312d0ec73626e77dbe956cecd15ec0e51a98504e735e5bf8429cdef986e957  SPECS.md
  bebffda90c378a0a708782edaddf01d1b92d42b59be6e96c11d12e495b25ab13  TASKS.md
  ```

- 旧文書と検証・レビューの結果は、上記と同じチャット領域の
  `ntt-west-dial-billing-evidence/` に保持されている。
  `plan-v2` はユーザーの範囲変更で全体を差し替えたため、旧 Ready 判定を再利用しない。

## 再計画の証跡（plan-v2）

- `planner` が2026-11-19に `plan-v2` を作成した。
  変更は機能文書2件の移動と再計画に限る。計画内容の SHA-256、相対リンク・構造、
  Markdown lint、空白検査と調査入力は Git 外の `ntt-billing-evidence/plan-v2/` に保持する。
- 受付・計画文書のみのため製品ビルド、ホスト実行、アーキテクチャ、
  Qlty 全体比較は現段階で `Not Applicable`。実装時の必須範囲は上記のまま。
- `plan-v2` は人の承認前に次の再計画へ進んだ。承認済み・完了済みスライスはない。

## 計画レビューの証跡（plan-v2）

- `plan-reviewer` が2026-11-19に `plan-review-v2` で Ready for approval と判定した。
  対応を要する指摘は0件。判定記録は Git 外の `ntt-billing-evidence/plan-review-v2/summary.txt` に保持する。
- 対象はベース `a5f31fa9a3641ab52373aea958f00ea2ecac096f` の `plan-v2`、S1〜S4。
  レビュー時点の文書の SHA-256 は次のとおり。

  ```text
  eecb336326cad115cd36b36e4064a5c7533ee759ad4b924e9b714b27f6b43dcd  SPECS.md
  e8140225b6c94ed524833b0461a465164eec54730aab3d3dc2f482a45647822b  TASKS.md
  ```

## 再計画の証跡（plan-v3）

- ユーザーが旧版を対応から外すと決定したため、`planner` が2026-11-19に `plan-v3` を作成した。
  旧版6形式と6サンプル、Shift_JIS と SUB の追加実装・検証、旧版のみの追加候補を範囲から除いた。
- `plan-v2` の対象文書と Ready 判定は Git 外の `ntt-billing-evidence/plan-v2/` と
  `ntt-billing-evidence/plan-review-v2/` に保持する。人の承認とコミットは未実施。
  過去明細の期間限定提供は[旧Bizビリングの案内](https://www.ntt-west.co.jp/denwa/charge/bizbilling/)にあり、
  今回はユーザーが現行版への限定を選択した。
- 更新した2文書の SHA-256、Markdown lint、相対リンク・構造と空白検査は
  Git 外の `ntt-billing-evidence/plan-v3/` に保持する。
  計画文書のみのため製品チェックは `Not Applicable`。今回の計画全体を独立レビューへ渡す。
- 更新すべき承認は `plan-v3` の S1〜S4 と終了範囲の計画承認。
  承認済み・完了済みスライスはない。

## 計画レビューの証跡（plan-v3）

- `plan-reviewer` が2026-11-19に `plan-review-v3` で Ready for approval と判定した。
  対応を要する指摘は0件。記録は Git 外の `ntt-billing-evidence/plan-review-v3/summary.txt` に保持する。
- ベース `a5f31fa9a3641ab52373aea958f00ea2ecac096f` の `plan-v3`、S1〜S4 が対象。
  レビュー時の SHA-256 は次のとおり。

  ```text
  cc0141406bc46cba9590af06e4630e2fd52db77abd2eebe4f7e5b28484c7fb61  SPECS.md
  58a2026e8f24f60012ed85759d01cb3ed996b75d32d5620dbfc7c33c65324be3  TASKS.md
  ```

## 再計画の証跡（plan-v4）

- ユーザーのモデル更新指定を受け、`planner` が2026-11-19に `plan-v4` を作成した。
  独立した層を増やさず S1 の先頭で4ロールの4行を変更する。
  S1〜S4 の帳票、4サンプル、順序、4層のブランチと PR は維持する。
- `plan-v3` の文書、検証、Ready 判定は Git 外の `ntt-billing-evidence/plan-v3/` と
  `ntt-billing-evidence/plan-review-v3/` に保持する。人の承認とコミットは未実施。
- OpenAI の公式資料で表示名 GPT-6.2 Sol と設定値 `gpt-6.2-sol`、
  ロール設定例の `medium` を確認した。CLI 0.169.0 の help で
  `debug prompt-input`、`debug models`、一時実行のオプションを確認した。
  モデル更新後の実際の読込と実行は S1 の検証対象とする。
  [公式モデル一覧](https://learn.chatgpt.com/docs/models)、
  [公式サブエージェント設定](https://learn.chatgpt.com/docs/agent-configuration/subagents)、
  [対応クライアント](https://help.openai.com/en/articles/20001275-chatgpt-work-and-codex)
- 今回編集したのは機能文書2件。文書の識別情報、Markdown lint、相対リンク・構造、
  空白検査と調査入力は Git 外の `ntt-billing-evidence/plan-v4/` に保持する。
  更新すべき承認は S1 の4ロール変更を含む `plan-v4` の計画承認。
  承認済み・完了済みスライスはない。今回の計画全体を独立レビューへ渡す。

## 計画レビューの証跡（plan-v4）

- `plan-reviewer` が2026-11-19に `plan-review-v4` で Ready for approval と判定した。
  対応を要する指摘は0件。記録は Git 外の `ntt-billing-evidence/plan-review-v4/summary.txt` に保持する。
- ベース `a5f31fa9a3641ab52373aea958f00ea2ecac096f` の `plan-v4`、S1〜S4 が対象。
  レビュー時の SHA-256 は次のとおり。

  ```text
  a723edf1412b6d74205c855b187e349d0bfcdd95f9f9af94b1fcec2c1a332bdb  SPECS.md
  fd650a8ff69426a6178b17546aec19dbfbaee49b57fd4aa76f0d966e37b6a129  TASKS.md
  ```

## 機能の終了判定

- S1〜S4 で README、CHANGELOG、サンプル案内、項目表示 UC をそれぞれの帳票分だけ更新する。
  終了判定では4ロールのモデル反映と4形式の受け入れ条件、全層の検証・レビュー・承認・最新チェックを照合する。
- 終了差分の削除対象は `docs/specs/features/ntt-billing/SPECS.md` と
  `docs/specs/features/ntt-billing/TASKS.md` の2件。追加の恒久文書編集は予定しない。
  削除前に受付・旧計画・再計画・実装・承認・レビュー・チェックの証跡を Git 外と PR に保持する。
- `feature-closer` の Close、終了差分の独立レビュー、人の終了承認を得てから Main が
  S4 ブランチで終了コミットを作る。最新ヘッドのチェックと全層のマージ承認をそろえ、
  実際の取り込みコミットを確認した時点で、保持する終了証跡を `CLOSED` にする。

[機能の終了判定](../../README.md#機能の終了判定)に従う。
