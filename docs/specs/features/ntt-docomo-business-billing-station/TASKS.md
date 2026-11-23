# ビリングステーション固定長形式対応の計画

## 作業概要

- [仕様](SPECS.md)に、公式7系統と既存11形式の照合、採否、受け入れ条件を記録した。
- 展開済みの専用線料金内訳書、R始まりの番号別明細内訳書、VoIP のダイヤル通話明細内訳書を順に追加する。
- [SDD 方針](../../README.md)、[アーキテクチャ](../../architecture.md)、
  [検証方針](../../validation.md)、[証跡方針](../../evidence.md)に従う。

## 現在の状態

- ライフサイクル状態 `PLAN_APPROVED`。S1〜S3 の独立計画レビューと利用者の計画承認を確認した。
- 機能ブランチ `codex/ntt-docomo-business-billing-station`。
  ベースは `main` の `493110c313f4427afd83b5cb5ea182782c7f03dd`。
- 計画のコミット後、承認された順序で S1 から着手する。

[ライフサイクル状態](../../README.md#ライフサイクル状態)に従う。

## 各スライスに共通する契約と検証

- リソースの定義 JSON に公式の項目境界と行判定を置く。Infrastructure の組み込み定義ローダーは
  JSON を既存の型に変換する。名称は既存の quick pick に表示し、色・ホバーは既存の DTO と行装飾、
  診断は Domain の既存処理を使う。解凍済みの文書を `shiftjis` で再読込し、`byte` 単位で扱う。
  再読込には既存の文書状態とエディターのライフサイクル契約を適用する。
- 形式名、パターンの正負、全レコード型の符号と項目数・位置・長さ・型を公式項目表と突き合わせる。
  全レコードの実バイト数と CRLF を確認する。文字をまたぐ境界、行長不一致、未知の識別子、
  数字だけを許す項目の不正値、仕様に適合した符号や空白による誤検出がないことをテストする。
  各行の名前・色の組と、先頭・後方項目のホバー位置を確認する。
- `N` は既存の診断が受理する半角数字または全空白のみを許す数値項目で使う。
  符号、数字と空白の混在、十進小数などを許す項目は、項目境界を保持できる表示用定義とし、
  `N` を割り当てない。金額や日付の変換、コード表検索、請求上の整合性の診断は対象外。
- テストでは本番 JSON と独立した期待値を使い、既存の実ホスト入口から呼び出す。
  形式選択、文書の再読込、診断、内容を変更しないこと、文書切替後の表示を確認する。
  S1〜S3 と既存ドコモ7形式・NTT東西4形式を段階ごとに回帰確認する。
- 各スライスで `npm run compile`、`npm run test:prepare`、`npm run test:architecture`、
  `npm run test:desktop`、`npm run test:web` を実施する。ホスト境界を変える場合は Main に
  戻し、最小対応版の検証を含めて再計画する。Markdown の lint、リンク、`git diff --check` も行う。
  Qlty は基準と最終の `qlty check --all --sarif --no-fix` と
  `qlty smells --all --sarif --no-snippets`、最終の `npm run qlty` を実行し、同一条件で比較する。
  [品質条件](../../validation.md#品質条件)の入力、版、解析対象、終了コード、出力を記録する。
- 下記の列挙パスを各スライスの承認候補とする。各スライスで `README.md` と
  `sample/README.md` にその形式の利用方法を、`CHANGELOG.md` に利用者向け変更を記録する。
  既存11形式の JSON、共通のパーサー、設定、パッケージ、テレメトリは実装範囲外とする。
  項目表に未解決の矛盾が見つかった場合や対象範囲が変わる場合は Main に戻す。

## S1 専用線料金内訳書を表示する

- 区分 `01`/`11`/`12`/`21`/`81` の5種を先頭2バイトで認識する。
  公式仕様書本文6〜7、9〜13ページの項目を定義し、各行を510バイトとする。
  エンドレコード図に後半小計290桁の記載がある。個々の幅の合計は296バイトで、
  本文12ページの §6 エンドレコード表の215〜510バイト（296）に従う。
  区分 `81` の項番9「ご請求番号合計回線数」は43〜47バイト（1始まり）とする。
  本文13ページ §6(5) の桁位置は「53〜47」とあるが、幅5、前欄の33〜42、次欄の48〜510と、
  本文7ページ §4(5) の配置図から43〜47と確定できる。表示と検証では43〜47を期待値とする。
  ファイル名メタデータは `^U[0-9]{7}-[0-9]{5}-[0-9]{3}-[EWC]\\.txt$` 相当とする。
  形式名は「専用線料金内訳書」、形式キーは `leased_line@billingStation`。
- 通常請求、企業等付加コードによる統合、按分と高額利用割引の一括計上を確認する。
  一括計上は擬似回線IDを使うデータレコード。本文8ページの符号付き金額は文字欄として扱う。
  日本語の宛名等を含め、任意項目の空白を許容する。
- ベースは `main` の上記コミット、先行スライスなし。カテゴリ登録をここで行う。
  `sample/.gitattributes` には `billingStation/* -text whitespace=-blank-at-eol` を追加し、
  S1〜S3 のサンプルに適用する。
- 対象パス

  - `src/resource/definitions/billingStation.json`
  - `src/infrastructure/definitions/loadBuiltInDefinitions.ts`
  - `src/test/extension.test.ts`
  - `src/test/smoke.ts`
  - `src/test/support/billingStationFixtures.ts`
  - `src/test/support/billingStationSmoke.ts`
  - `sample/.gitattributes`
  - `sample/billingStation/U0000001-00001-001-C.txt`
  - `sample/billingStation/U0000002-79001-001-C.txt`
  - `README.md`
  - `sample/README.md`
  - `CHANGELOG.md`

## S2 R始まりの番号別明細内訳書を表示する

- 形式名は「番号別明細内訳書（R始まり）」、形式キーは `statement_r@billingStation`、
  展開・結合後の名前は `N00000`。
  管理、OCN 番号別の初回と継続、請求書作成番号合計の初回と継続、会社合計の6種を
  512バイトとして扱う。§5 の内訳欄は明細コード、内訳コード、金額、残回数、税区分の
  計21バイトを最大17組とし、残りを表に従って照合する。
- `11`/`51` はレコードNoの `01` と `02`〜`99` で分岐し、予約値と未知の種類は
  誤った行定義に一致させない。OCN 番号と請求番号の前置文字の許容を仕様例と照合する。
  18件以上で継続、空の内訳組、負の金額、OCN 番号の先頭0省略の例を検証する。
- S1 の最新 PR ヘッドと必須チェックの記録を待つ。S1 で追加したローダーを再利用する。
- 対象パス

  - `src/resource/definitions/billingStation.json`
  - `src/test/extension.test.ts`
  - `src/test/support/billingStationFixtures.ts`
  - `src/test/support/billingStationSmoke.ts`
  - `sample/billingStation/N00000`
  - `README.md`
  - `sample/README.md`
  - `CHANGELOG.md`

## S3 VoIP のダイヤル通話明細内訳書を表示する

- 形式名は「ダイヤル通話明細内訳書（VoIP）」、形式キーは `dial_voip@billingStation`、
  展開・結合後の名前は `R00000`。
  共通管理、電番管理、通話明細、電番合計、終了の5種を128バイトとして扱い、
  先頭の `1`/`2`/`3`/`5`/`9` で判定する。通常ダイヤルの媒体名 `R` + 5桁とも
  名前だけでは区別できないケースがあるため、既存の形式選択で指定する。
- 付属の固定長 Word §5 と公式元号変更の対象一覧に従い、作成日付6桁と料金月4桁を
  和暦・西暦下2桁のどちらでも同じ境界で表示する。テストには両表記を含める。
  通話明細の通話種別コード `b`、番号と日付の文字欄、通話料金の整数部・小数部、
  合計・終了の識別と診断を確認する。
- S2 の最新 PR ヘッドと必須チェックの記録を待つ。S1 で追加したローダーを再利用する。
- 対象パス

  - `src/resource/definitions/billingStation.json`
  - `src/test/extension.test.ts`
  - `src/test/support/billingStationFixtures.ts`
  - `src/test/support/billingStationSmoke.ts`
  - `sample/billingStation/R00000`
  - `README.md`
  - `sample/README.md`
  - `CHANGELOG.md`

## 計画文書の検証

- 受付の担当は `feature-author`。変更した Markdown の lint、相対リンク、空白検査は `Pass`。
- 計画の担当は `planner`。対象は `SPECS.md` と `TASKS.md`。両文書の
  `markdownlint-cli2` 0.22.0、相対リンク・見出し、差分と未追跡ファイルの空白検査は `Pass`。
- 製品と実ホストの検証は `Not Applicable`。今回の差分は計画文書のみ。

## 独立計画レビュー

- `plan-reviewer` による初回判定は Needs revision。S1 の区分 `81` の
  ご請求番号合計回線数の位置と検証期待値の明記を求めた。
- 2026年11月24日に S1〜S3 を独立再レビューし、Ready for approval と判定した。
  修正後の文書検証の参照は `5027af`、再レビューの確認出力の参照は `b35d36`。
- 再レビュー対象の SHA-256
  - `SPECS.md` `110d6c293e74a1c7d67f4e6ea9d42cf617f04c3c860b976f12ca76b18507c986`
  - `TASKS.md` `a1ac1dbf9cfab75c517f02a1ae35670e19a33b765bba53dc943d106e22ae2bb3`

## GitHub スタック

| 順序 | 層 | PR のベース | 正確なベース | ヘッド・PR |
| --- | --- | --- | --- | --- |
| 1 | S1 | `main` | 現時点の対象は上記ベース SHA | 未公開 |
| 2 | S2 | S1 ブランチ | S1 の必須チェック通過済みヘッドを記録して確定 | 未作成 |
| 3 | S3 | S2 ブランチ | S2 の必須チェック通過済みヘッドを記録して確定 | 未作成 |

各層の実装を承認後にコミットして公開する。後続の作業前に先行の最新ヘッドの Verify、
CodeQL の解析対象 SHA と先行ヘッドとの対応、該当するリポジトリ必須チェックと Cloud の結果を記録する。
終了差分は S3 ヘッドに追加し、最新の結果を確認する。
[GitHub 標準のスタック PR](../../README.md#github-標準のスタック-pr)に従う。

## 人による承認

| 段階 | 状態 | 対象 | レビュー・コミット |
| --- | --- | --- | --- |
| 計画 | `Approved` | S1〜S3、各スライス記載の実装パス | 再レビュー `b35d36` |
| 完了 | `Pending` | S1、S2、S3 ごとに正確な差分を特定して承認 | 未記録 |
| 終了 | `Pending` | 終了判定時に最上位層の差分とパスを特定 | 未記録 |
| マージ | `Pending` | 取り込み順と対象、ベース、ヘッド、最新チェックを PR で特定 | 未記録 |

2026年11月24日に利用者が、独立再レビュー済みの S1〜S3 の計画と列挙された実装パスを承認した。
Main が記録し、この承認記録を含む計画文書をコミットする。

[人による承認](../../README.md#人による承認)に従う。

## 機能の終了判定

恒久要件 `docs/requirements/use-cases/uc-display-fixed-width.md` と
`docs/requirements/use-cases/uc-validate-fixed-width.md` に、採用した形式の表示と診断の具体例を
反映する。既存 UC を確認し、記述を変更した場合は終了差分のレビューと終了承認を得る。
作業用 `docs/specs/features/ntt-docomo-business-billing-station/SPECS.md` と
`docs/specs/features/ntt-docomo-business-billing-station/TASKS.md` の削除も終了差分の対象とする。
判定、承認、チェック、最終的に取り込まれたコミットを PR に記録する。
[機能の終了判定](../../README.md#機能の終了判定)に従う。
