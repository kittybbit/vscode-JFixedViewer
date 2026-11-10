# フィールドメタデータと詳細表示の計画

## 作業概要

- [仕様](SPECS.md)に従い、項目名と位置の詳細表示、カーソル位置の項目の強調を追加する。
- JPX で詳細表示を先に検証し、全銀33形式を続ける。組み込み全34形式を公式仕様と照合し、
  対応するサンプルを用意する。
- [SDD 方針](../../README.md)、[アーキテクチャ](../../architecture.md)、
  [検証方針](../../validation.md)、[証跡方針](../../evidence.md)を適用する。

## 現在の状態

- 機能は `PLAN_COMMITTED`。承認済みの計画コミット後、スライス1を実装した。
- 比較ベースは `1e9e333924a949944150a79e60dd177b55a71044`。
  計画を準備するブランチは `codex/field-metadata-and-details`。
- 2026年11月10日に `plan-reviewer` が計画全体を独立レビューし、Ready と判定した。
  修正を要する指摘はなかった。
- レビュー対象は次の SHA-256 で識別する。この状態とレビュー結果の追記はレビュー対象の計画内容と分けて検証する。
  - `SPECS.md` `c92c6d1c76eff6c9f77d0052429f83fecc2d691f78f6f6adeda3ed04abbd9cc3`
  - `TASKS.md` `144dd02330a571654d3b746848c67512bfe9c53020a73f560c37948cb7a30e82`
  - `TRACEABILITY.md` `662b057671e726dd2b49e1e15f9ea57d6b28711b4b9be98fa563ff5e5bdb54bd`

## 調査と検証の引き継ぎ

- 現行の組み込み定義は [全銀](../../../../src/resource/definitions/zengin.json) 33形式、
  [JPX](../../../../src/resource/definitions/jpx.json) 1形式。
  予備照合で全銀のファイル名先頭8桁は全33形式、JPX の項目順と幅は全83項目が公式仕様と一致した。
- 全銀協 AP-I-13 の第Ⅱ部8節で総合振込の EDI 識別は113桁目。現行定義は114桁目を見る。
  同24節で商業手形割引の内訳は `230`、合計は `231`。
  現行定義は両方を `^230` で判定する。同31節の荷為替輸入信用状発行依頼は
  構成区分 `01`、`02` を採取するが、現行の取引情報は `^10`、`^20` で照合する。
- 現行の行判定は条件とモードで最初に一致した定義を使う。
  `fileNamePattern` は読み込み時に構築するが、形式の選択はコマンドの一覧から行う。
- 受付は Markdown の検査、相対リンクと構造の確認、空白差分の検査が Pass。
  計画についても変更した Markdown 全件で同じ検証を行い、文書の内容をハッシュで特定する。

## GitHub スタック

- 1層目は `codex/field-metadata-and-details` から `main` へ。計画時のベースは
  `1e9e333924a949944150a79e60dd177b55a71044`。承認後の計画コミット、スライス1の
  完了コミットと PR の URL・ヘッドは実績をここに追記する。
- 2層目は `codex/field-metadata-and-details-zengin` から1層目のブランチへ。
  ベースは1層目のチェック通過済みの最新ヘッド。後続作業の前に Main が Verify、CodeQL の
  解析リビジョンとの対応、その他の必須チェックと適用される Cloud チェックを記録する。
  2層目のヘッドはスライス1・2と、終了時の差分を含む。ヘッド、PR の URL とチェックは未確定。
- 終了承認後のコミットで変わったヘッドのチェックを確認する。両 PR を開いた状態でマージ承認を
  得てから、承認された順序でマージし、取り込み先と実際のマージ結果を記録する。

[GitHub 標準のスタック PR](../../README.md#github-標準のスタック-pr)に従う。

## 人による承認

- 計画承認は `Approved`。2026年11月10日に、この機能のレビュー済みの `SPECS.md`、
  `TASKS.md`、`TRACEABILITY.md` と、両スライスの列挙パス・実装範囲が承認された。
  レビューの識別情報は「現在の状態」に記録した。計画コミットはこの記録を含むコミットで特定する。
- スライス1の完了承認、スライス2の完了承認、終了承認、マージ承認はいずれも `Pending`。
  2026年11月10日の利用者の指示に従い、この機能では各スライスをAIが独立レビューし、
  指摘の解消後は人による完了承認を待たずにコミットとスタック PR の公開に進める。
  後続のスライスは先行 PR の必須チェックが最新ヘッドで通った後に始める。
  保留した人による承認は全スライスの実装後にまとめ、実際の判断と対象の識別情報を記録する。

[人による承認](../../README.md#人による承認)に従う。

## スライス1. 項目の詳細表示と JPX サンプル

状態は `SLICE_READY`。項目名が分かるホバーとカーソルの強調を追加し、JPX 四本値で一通り使えるようにした。
`main` を対象とする1層目。ベースは承認済み計画コミット `47e55e960b9a5cb46df9c7783b7a90b26dac141f`。

### 実装結果と検証証跡

- 独立レビューは Ready。指摘3件の解消と追加の指摘がないことを確認した。
  レビュー対象の全差分の SHA-256 は次のとおり。完了承認は利用者の指示に従い保留する。
  `5eb40f86d5d748c24fa77f3c47ef83d25cbe8eaccf4cf2c16ebf0b299e9041a4`
- 全銀の既存 `columns` はインフラストラクチャ層で読み込み時に `fields` へ正規化した。
  ドメインは共通項目表現から位置・番号を投影し、旧ホバー表示を維持する。
  JPX は v4.0 §3.4.4.2 の83項目名・型・順序・幅を持つ定義にし、項目名を安全な文字列として表示する。
- カーソル位置の範囲をエディター単位に表示する。境界では次項目を選び、実際の行末、空白行と不一致行は解除する。
  行ごとの範囲は1回だけ作り、カーソル移動時に対象行だけを参照する。編集、形式変更、解除、非表示、拡張破棄を確認した。
- [JPX サンプル](../../../../sample/jpx/SH_DER.csv)は657バイト、BOMなし、ASCII、LF終端。
  取引識別 `01`、ポスト区分 `F2`、`IDX/NK225/NK225F/A2/FUT`、銘柄コード `161120018` を設定した。
  予備の空白・ゼロ、基準値段の `+` を公式仕様に合わせた。取引なし時の成立日付・時刻24項目は
  v4.0 §3.4.4.2 の項番と桁範囲に従ってゼロ埋めし、657バイトを維持した。
  `.vscodeignore` の VSIX 一覧で `sample/` が除外されることを確認した。
- 公式照合元は JPX 総研データフィードサービス仕様書 v4.0 §3.4.4.2 と別紙。
  読み込み済みの証跡は `/private/tmp/jfixedviewer-jpx-0.pdf`、`-1.pdf`、`-2.pdf` と
  `/private/tmp/jfixedviewer-jpx-v4.txt`、`/private/tmp/jfixedviewer-jpx-codes.txt`。
  配信ファイル名 `SH_DER.csv` と銘柄コードの根拠は以下に記録する。
  - [JPX データフィードサービス仕様書](https://www.jpx.co.jp/markets/paid-info-equities/reference/co3pgt0000004g0w-att/JPXReferenceDFS.zip)
  - [証券コード協議会「先物・オプション取引識別コード仕様」](https://www.jpx.co.jp/sicc/securities-code/nlsgeu0000032d48-att/%28HP%29sakimono20250526.pdf)
- JPX の項番・桁範囲による日付・時刻24項目の独立検査、`npm run test:prepare`、型検査、
  アーキテクチャ、Desktop 回帰17件、`git diff --check` は Pass。
  修正後サンプルの実画面は Desktop と Web で Pass。
  復元後の Desktop 回帰17件のログは `/private/tmp/jfv-rf2.FvwV3tzr/` に保存した。
  JPX サンプルの UI ログと入力ハッシュは `/private/tmp/jfv-ui-r1.h99zZoLA/` に保存した。
- Qlty 0.645.0 の基準証跡は `/private/tmp/jfixedviewer-field-meta-quality-base.s902REYl/`。
  文書整形前の証跡は `/private/tmp/jfv-qf2.86Z9mjAR/`。
  最終検査の入力、SARIF、結果は `/private/tmp/jfv-s1-ok.5iOzcjcd/` に保存する。
- 先行候補の型・prepare・architecture、Desktop 回帰17件、Qlty のログは
  `/private/tmp/jfv-rf1.B8hePMpa/` と `/private/tmp/jfv-qf1.BfxBQmjh/` に保存した。
- 旧 `columns` の回帰テストは `characterizationHost.ts` から生 JSON をローダーへ注入する。
  旧行名・項目位置・ホバーと、`A😀BC` のUTF-16範囲 `[3, 5)` を確認し、
  行末で可視範囲をクリップしつつ定義幅のホバー `位置: 4 - 6 (3桁)` を維持する。
  組み込み全銀に対する境界・短行など新旧共通のテストは残した。
- 実装パスはこの節の「承認候補パス」一覧と一致する。`.serena/` は既存の未追跡項目であり、読み書きしていない。
  レビュー修正の製品・テスト差分は承認候補パス内である。
  `TASKS.md` と `TRACEABILITY.md` は検証結果と対応付けに合わせて更新し、差分検査を行った。
- 計画承認は `Approved`。スライス1の完了承認とスライス2の完了承認、終了承認、マージ承認は `Pending`。
  2026年11月10日の利用者指示に従い、実装の独立レビューで指摘が解消した後は、完了承認を待たず次スライスへ進む。
  独立レビューと完了コミット・PRは Main の担当。

### 詳細表示の責務と境界

- 組み込み JSON の行は、既存の `columns`、または名前・長さ・型を持つ `fields` の一方を使う。
  読み込み時にインフラストラクチャ層で共通の項目表現にそろえる。旧形式の項目は名前・型の
  メタデータを持たず、位置、幅、行名と従来のホバーを維持する。
- ドメインは既存の行・モード選択を再利用し、項目番号、位置、幅とメタデータを計算する。
  項目番号は1から数える。開始位置を含み、終了位置を含まない UTF-16 範囲をアプリケーション層の
  装飾 DTO で表示層に渡す。ドメインとアプリケーション層は VS Code API とファイルを扱わない。
- 表示層は行名、項目名、1から数えた開始・終了位置、桁数をホバーに表示する。
  項目名は文字列として組み込み、項目名付きのホバーで Markdown のコマンドを許可しない。
  短い行では装飾範囲を実在する文字に収め、ホバーの桁数と位置は定義上の値を使う。
- 表示層は解析済みの装飾範囲を使い、各エディターの主選択のカーソル位置を個別に強調する。
  境界では直後の項目を選び、行末、空白行、不一致行では強調を解除する。
  カーソル移動で文書全体を再解析しない。既存の装飾と区別できるテーマ色を使う。
  文書編集後は既存の再描画で範囲を更新し、
  形式の変更、装飾解除、非表示化と拡張の破棄で不要になった強調を解放する。
- 既存の形式選択、境界表示3方式、URI ごとの形式、分割表示時の解析共有と独立した装飾を保つ。
  拡張の入口、VS Code の最小対応バージョン、設定、テレメトリには手を加えない。

### 詳細表示と JPX の受け入れ条件・検証

- JPX v4.0 §3.3・§3.4.4 と別紙ファイル名一覧で83項目の名前・型・順序・幅、657バイトの長さ、
  レコード区分 `2`、ファイル識別 `001`、DFS のファイル名 `SH_DER.csv` を確認する。
  JPX のデータ型は仕様の文字列とする。配信名は定義に記録し、表示の行判定は従来の `^2` を使う。
  固定長の行を表示するための形式の自動選択やファイル検証は追加しない。
- JPX サンプルは仕様上使用できる1バイトの文字で構成し、値、ゼロ埋めと空白埋めを照合する。
  BOM を入れず、行区切りの LF を幅の計算から除く。`sample/README.md` で
  形式の手動選択、架空データ、配信名の拡張子が `.csv` の固定長ファイルであることを説明する。
- 共通の回帰テストで、旧 `columns` の境界・行名・ホバー、JPX の新項目の名前・番号・型・位置、
  短い行、境界前後、行末、UTF-16、カーソル移動、複数エディターの強調の独立性、
  編集後の更新、形式変更、装飾解除、非表示化、破棄、再解析回数、内容とテレメトリの保全を確認する。
  旧 JSON の互換テストは組み込み全形式の移行後も使える入力をテスト内に用意する。
  JPX のファイルを読み、行バイト長、先頭コード、項目範囲、末尾の空白を確認する。
- デスクトップ安定版と Web 安定版で JPX サンプルを開き、形式を選択してホバー、カーソル移動、
  境界表示3方式、編集・装飾解除と分割表示を確認する。実ホストの既存スモークは別途実行する。

### スライス1の承認候補パス

- `src/domain/fixedWidth/projectFields.ts`
- `src/application/fixedWidth/FixedWidthDecoration.ts`
- `src/infrastructure/definitions/loadBuiltInDefinitions.ts`
- `src/presentation/vscode/FixedWidthPresentation.ts`
- `src/presentation/vscode/decorationStyle.ts`
- `src/resource/definitions/jpx.json`
- `src/test/extension.test.ts`
- `src/test/support/characterizationHost.ts`
- `sample/.gitattributes`
- `sample/README.md`
- `sample/jpx/SH_DER.csv`
- `.vscodeignore`

サンプルの固定長データに限り、`sample/.gitattributes` で LF と意味のある行末空白を扱う。
リポジトリで配布する `sample/` を VSIX から除外する。
VSIX の対象ファイル一覧で除外を確認する。他の空白検査とパッケージ対象は従来どおり。
全銀定義と全銀サンプルはこのスライスの対象外。

## スライス2. 全銀33形式の照合とサンプル

状態は `PLANNED`。全銀の組み込み全形式に公式仕様の項目情報を追加し、確認できた定義の誤りを修正する。
各形式とその表示分岐を開いて確認できるサンプルを同時に用意する。1層目の完了コミットと PR 公開、
最新ヘッドの必須チェック通過を着手条件とする。

### 全銀定義の責務と境界

- AP-I-13 第Ⅰ部5・7節と第Ⅱ部1～32節でファイル名の先頭8桁、レコード順・識別、
  モード、項目名・型・順序・幅、レコード長を確認する。公式表で参照先が指定された共用レイアウトは
  参照先まで確認する。モードの取得位置と適用条件は両方を照合する。
- 全銀定義の JSON にスライス1の `fields` を使う。全銀の `N` と `C` はそれぞれ数字と文字列として
  表す。表示層で使う座標は従来どおりとする。項目を分ける根拠と、名前の同じ小項目を
  識別するための親項目名を公式表と対応付ける。
- 総合振込の EDI 識別は113桁目に合わせ、EDI と通常の項目構成をそれぞれ用いる。
  借入金計算書の商業手形割引は内訳 `^230` と合計 `^231` に分ける。
  荷為替輸入信用状の取引情報は、取得する `01`、`02` に判定をそろえる。
  その他の差異は、公式仕様で確認した項目・幅、レコード条件とモード、ファイル名情報に限り修正する。
  可変項目のタグ列は外側の固定長項目の中に収め、タグごとの表示・解析は追加しない。
  既存形式の選択肢、形式 ID と手動選択の入口は維持する。
- 定義の照合で新たな判定機構、互換性に関わる選択、未確定の仕様解釈、
  検証範囲や対象パスの追加が必要になったら Main に戻す。既存の解析・表示契約を使う。

### 全銀の受け入れ条件・検証

- 全銀33形式の全行定義について、照合元の節・ページ、項目名・型・順序・幅、レコード長、
  レコード識別とモード、確認できた差異と対処を検証証跡に記録する。
  `sample/README.md` に形式ごとの参照箇所、主な補正と確認方法を記載する。正式な通信上の名前と、
  先頭8桁に既存 ID を付けた閲覧用ファイル名を区別する。接頭辞を共有する振込入金通知 A/B と
  預金口座振替の依頼・処理結果は README でそれぞれの形式選択肢を案内する。
- 33ファイルを1形式ずつ用意する。各ファイルは、公式仕様が認めるレコード順、必須項目、
  区分値、件数・合計や連番、文字と埋め方を満たす架空データを LF で区切る。
  省略可能な数字項目の空白と、可変項目のタグ長・有効桁数は仕様の個別規則に従う。
  モードや区分で表示を分ける既存の全分岐を、同じファイル内の仕様に沿った明細・グループで確認できる。
  仕様の制約で同一ファイル内にまとめられない分岐が見つかった場合は Main に戻す。
- 全34サンプルの一覧と組み込み形式 ID が一対一で、全レコードが想定の定義に割り当たることを
  共通テストで確認する。ファイルごとの想定レコード順・バイト数と行定義の対応を、
  実装の正規表現と項目幅だけから自動生成せず、仕様との照合結果から検証する。
  総合振込では113桁目と114桁目の `Y` と空白を入れ替えたデータで EDI と通常を区別する。
  借入金計算書の `230`、`231`、輸入信用状の `01`、`02` とそれぞれの後続行も回帰テストで区別する。
- デスクトップ安定版と Web 安定版で代表例を開き、同じプレフィックスの形式を選び分け、
  入出金明細のモードに応じた項目名とカーソル強調を確認する。全件の構造と分岐の網羅は共通テストで確認する。

### スライス2の承認候補パス

- `src/resource/definitions/zengin.json`
- `src/test/extension.test.ts`
- `sample/.gitattributes`
- `sample/README.md`
- `sample/zengin/50200001.furikomi_nyuukin_tuuchi_a.dat`
- `sample/zengin/50200001.furikomi_nyuukin_tuuchi_b.dat`
- `sample/zengin/50200003.nyuusyukkin_torihiki_meisai.dat`
- `sample/zengin/50200004.zanndaka_tuuchi_yokin.dat`
- `sample/zengin/50200111.kyuuyo_furikomi_minkan.dat`
- `sample/zengin/50200112.syouyo_furikomi_minkan.dat`
- `sample/zengin/50200171.kyuuyo_furikomi_chihoukoumuin.dat`
- `sample/zengin/50200172.syouyo_furikomi_chihoukoumuin.dat`
- `sample/zengin/50200121.sougou_furikomi.dat`
- `sample/zengin/50200141.kabushiki_haitoukin_furikomi.dat`
- `sample/zengin/50200143.nenkin_shintaku_keiyaku.dat`
- `sample/zengin/50200144.kouteki_nenkin_hoken.dat`
- `sample/zengin/50200145.iryou_hoken_kyufukin_furikomi.dat`
- `sample/zengin/50200198.furikomi_kouza_shokai_irai_meisai.dat`
- `sample/zengin/50200199.furikomi_kouza_shokai_shori_kekka_meisai.dat`
- `sample/zengin/50200191.yokin_kouza_furikae_irai_meisai.dat`
- `sample/zengin/50200191.yokin_kouza_furikae_shori_kekka_meisai.dat`
- `sample/zengin/50200193.yokin_kouza_furikae_henkou_tuuchi.dat`
- `sample/zengin/50200211.jyuutaku_loan_kankei_zaikei_loan.dat`
- `sample/zengin/50200212.jyuutaku_loan_kankei_sonota.dat`
- `sample/zengin/50200300.zaikei_chochiku_kankei_irai_meisai.dat`
- `sample/zengin/50200301.zaikei_chochiku_kankei_shori_kekka_meisai_tumitate_naiyou.dat`
- `sample/zengin/50200302.zaikei_chochiku_kankei_shori_kekka_meisai_rishi_hokyuu.dat`
- `sample/zengin/50200309.zaikei_chochiku_kankei_shori_kekka_meisai_sonota.dat`
- `sample/zengin/50200231.kariirekin_keisansho.dat`
- `sample/zengin/50200232.kariirekin_zaikoumeisai.dat`
- `sample/zengin/50200233.kariirekin_zandaka_goukei.dat`
- `sample/zengin/50200425.fx_torihiki_meisai_kaikeisei.dat`
- `sample/zengin/50200426.fx_torihiki_meisai_hikaikeisei.dat`
- `sample/zengin/50200427.fx_kanren_jouhou.dat`
- `sample/zengin/50200435.gaikoku_soukin_irai.dat`
- `sample/zengin/50200428.nigawase_yunyuu_lc_hakkou_irai.dat`
- `sample/zengin/50200009.gaika_yokin_nyuushukkin_torihiki_meisai.dat`

実行時のモデル、ローダー、表示層、JPX 定義とサンプルは、このスライスで変更しない。

## 両スライスの検証と証跡

- ローカルで変更 Markdown の lint・リンク・構造、`git diff --check`、型検査
  `npm exec -- tsc -p . --noEmit`、両ホスト向け本番ビルド
  `npm exec -- webpack --mode production --devtool false` を行う。
- `npm run test:prepare`、`npm run test:architecture`、`npm run test:desktop`、
  `npm run test:desktop:min`、`npm run test:web` を実行する。
  共通の自動テストは既存のデスクトップテストに組み込む。各ホストのスモークと表示の確認を
  分けて記録する。Web は Chromium を使う。
  最小対応版は VS Code 1.75.0 の起動と既存コマンドをスモークで確認する。
- 各層のベースと最終入力から使い捨てのスナップショットを作る。Qlty 0.645.0 以降で
  次の2コマンドを各入力に実行する。
  `qlty check --all --sarif --no-fix` と `qlty smells --all --sarif --no-snippets`。
  使用した設定と入力の識別情報、解析パス一覧と件数、SARIF 2.1.0 生出力、終了コードを残す。
  使い捨ての最終入力で `npm run qlty` を実行し、許可範囲の整形が出た場合は反映して検証する。
  新規・悪化した指摘がなく、最終の総合チェックが通過したことを確認する。
- 必須チェックは Pass、Failed、Missing、または理由付きの Not Applicable を記録する。
  確定した入力と検査パス、実行者、バージョン、結果・ログ、再現条件を記録し、実装レビューに渡す。
  PR の最新ヘッドでの Verify、CodeQL、適用される Cloud などの必須チェックは別に記録する。

[証跡の取り扱い](../../evidence.md#証跡の取り扱い)と
[決定的な失敗の修正ループ](../../validation.md#決定的な失敗の修正ループ)に従う。

## リスクと判断の担当

- 実装担当は公式仕様と定義の差異、行末空白と桁数、識別値、分岐とレコード順を確認して証跡に残す。
  同じ定義を使った実装とテストが同じ誤りを見逃すことを避けるため、期待値は公式表から選ぶ。
- 実装担当はホストでの視認性と強調の破棄、再解析回数を確認する。範囲外の変更、
  仕様の解釈が確定できない差異や必須チェックの不足は Main が判断し、必要に応じ再計画する。

## 機能の終了判定

- 2層目の最新ヘッドで統合した受け入れ条件と検証結果を確認する。
- 終了差分では `README.md` に項目詳細・カーソル強調とサンプルへの導線、
  `CHANGELOG.md` の未リリース欄に利用者から見える変更を記録する。
  `docs/requirements/use-cases/uc-display-fixed-width.md`、
  `docs/requirements/use-cases/uc-switch-editors.md`、
  `docs/requirements/use-cases/uc-clear-decorations.md` に表示・切替・解除の挙動を反映する。
  層の境界と依存ルールは維持する。
- 終了差分の独立レビューと終了承認を得て、この機能の
  `docs/specs/features/field-metadata-and-details/SPECS.md`、
  `docs/specs/features/field-metadata-and-details/TASKS.md`、
  `docs/specs/features/field-metadata-and-details/TRACEABILITY.md` を削除する。
  最上位 PR に、計画・完了・終了・マージ各段階の識別情報、承認、最新チェックと
  実際のマージ結果の参照を保持する。

[機能の終了判定](../../README.md#機能の終了判定)に従う。
