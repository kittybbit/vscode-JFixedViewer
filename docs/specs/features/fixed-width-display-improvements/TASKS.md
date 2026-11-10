# 固定長表示の改善の計画

## 作業概要

- [仕様](SPECS.md)に境界表示の調整、編集時の更新、文書間の解析と装飾の分離をまとめた。
  [要件と検証の対応](TRACEABILITY.md)に実装順と検証を記録する。
- 比較ベースは `a443801f978bec1e8345db7b3d8478de1ae652d9`。
  [検証方針](../../validation.md)と[証跡の取り扱い](../../evidence.md)に従う。
- 文書を正しく追随させる処理と、境界の見た目を設定する処理を順に実装する。
  スライス1で既存の表示を独立させ、スライス2でその描画の入口に表示設定を適用する。

## 現在の状態

- 計画は `PLAN_COMMITTED`（`5615f9204cf4683c5cf14e02c334ddb3b020a290`）。独立再レビューで
  `plan-reviewer` が Ready と判定し、利用者が計画を承認した。
- スライス1は `SLICE_READY`。独立再レビューで `implementation-reviewer` が Ready と判定した。
  再レビュー対象の全差分 SHA256 は `3402ed7a8c793131ad06379404a1858fa023afceffb3bb0304ad0b833d6b7564`。
  スライス2は未着手。先行する確認用コミットの GitHub チェック通過後に開始する。
- 受付証跡は `/private/tmp/jfixedviewer-intake.v9dYPz/evidence.txt`。
  計画の初回レビューで指摘された表の整形を修正した。
- 再レビュー対象の3文書の SHA256 と文書検証は
  `/private/tmp/jfixedviewer-plan-format.xA2Bkf/evidence.txt` に記録した。
  本節は判定と承認を反映した記録で、実装範囲は同じ。

[ライフサイクル状態](../../README.md#ライフサイクル状態)に従う。

## GitHub スタック

1. スライス1のブランチは `codex/fixed-width-display-improvements`。
   PR の対象は `main`。計画開始時のベースは上記 SHA。
   計画承認後のコミットはこのブランチに置く。実装のベースとする計画コミットは承認後に記録する。
2. スライス2のブランチは `codex/fixed-width-boundary-styles`。
   PR の対象はスライス1のブランチ。開始前に先行 PR の最新ヘッドと Verify、CodeQL、
   その他の必須チェックおよび適用される Qlty Cloud の通過を確認し、SHA と結果を記録する。
   CodeQL の解析リビジョンとヘッドの対応も記録する。後続ブランチのベースはその先行ヘッド。
3. スライス2のヘッドに全スライスを含め、同じ PR に終了差分を追加する。
   PR の URL、ベースとヘッド、終了コミット、最新チェック、実際のマージ結果は順に記録する。
   最下位の PR から統合する。マージ時の取り込み先や方式、対象 SHA は承認時に特定する。

[GitHub 標準のスタック PR](../../README.md#github-標準のスタック-pr)に従う。

## 人による承認

- 計画承認は `Approved`（2026-11-10）。独立再レビューで Ready と判定した計画文書3件と、
  下記の各スライスの実装対象を承認した。
  計画コミットのパスはこのフォルダーの `SPECS.md`、`TASKS.md`、`TRACEABILITY.md`。
- 利用者の指示により、スライス1とスライス2の完了承認はまとめて行う。それまでは `Pending` と記録する。
  各スライスの検証と独立レビューで指摘が解消したら、完了承認を待たずに確認用のコミットとドラフト PR を
  用意する。後続の開始には先行 PR の最新ヘッドのチェック通過が必要。
- 終了承認、マージ承認は個別に `Pending`。

[人による承認](../../README.md#人による承認)に従う。

## スライス1. 文書ごとの表示と編集への追随

### 受け入れ条件と範囲

- [仕様](SPECS.md#要件と受け入れ条件)の要件2〜4を満たす。各文書が選んだ形式に従い、
  編集中に再選択せず確認できる。区切りのスタイルとホバーの表示形式は既存のものを使う。
- 同じ URI を閉じて開き直すと、以前に選んだ形式で現時点の内容を表示する。表示がなくなった
  エディターの装飾は破棄する。文書の関連付けは表示の有無にかかわらずセッション中に保持する。
- 別 URI の装飾や解析結果には影響しない。同じパスでスキーム、権限部、クエリ、
  フラグメントが異なる URI も識別する。URI は関連付けと対象の照合にだけ使う。

### 設計の責務と境界

- Application の既存ポートを維持する。解析モードを `decorate` のローカル変数に置き、
  先頭からの解析ごとに初期化する。Domain の行照合と項目位置の契約を使う。
  ヘッダーが後続行に影響するため、編集後は選択済みの文書を先頭から解析する。
- Presentation に URI と選択形式の対応、表示中の `TextEditor` ごとの装飾ハンドルを置く。
  文書とエディターでは状態の寿命が異なる。共通の型やポートに VS Code の型を追加しない。
  `なし/なし` はその URI の関連付けと全表示の装飾を解除する。
  イベント名と `clear@clear` を含む形式の値、キャンセル時の空の値、選択後の送信順を維持する。
- `onDidChangeVisibleTextEditors` を使い、新たに表示された関連付け済みのエディターを描画し、
  表示から外れたエディターのハンドルを破棄する。表示済みの別文書に再適用しない。
  形式選択が確定したらその時点のアクティブなエディターの文書を対象にし、同じ文書を表示中の
  エディターに結果を反映する。拡張機能の破棄後に選択が戻ってきた場合は処理を終える。
- `onDidChangeTextDocument` の実際の内容変更を対象に、表示中の選択済み文書ごとに
  最後の通知から100ミリ秒待って描画する。スプリットの各表示で解析を繰り返さず、
  1回の更新で得た範囲とホバーを同じ文書の表示先に使う。再描画時に文書の実体と
  形式の関連付け、現在の表示先を確かめる。形式の再選択、解除、最後の表示の消失と
  拡張機能の破棄では対象の待機を取り消す。閉じた文書の保留処理は開き直した文書に渡さない。
- タイマーとハンドルは Presentation の寿命に従い、同じエディターの再描画では使える
  ハンドルを再利用する。別文書間で共有しない。新しい依存パッケージと公開ポートは不要。

### 承認対象パス

- `src/application/fixedWidth/FixedWidthDecoration.ts`
- `src/presentation/vscode/FixedWidthPresentation.ts`
- `src/test/extension.test.ts`
- `src/test/support/characterizationHost.ts`
- `docs/specs/architecture.md`
- `docs/requirements/use-cases/uc-display-fixed-width.md`
- `docs/requirements/use-cases/uc-switch-editors.md`
- `docs/requirements/use-cases/uc-clear-decorations.md`
- `README.md`
- `CHANGELOG.md`
- `docs/specs/features/fixed-width-display-improvements/TASKS.md`

境界設定、定義 JSON、ドメイン規則、テレメトリ SDK、ロックファイル、CI、生成物は対象外。
変更するテストは既存のテストとそのホスト支援に収める。新規の固定データファイルは不要。

### 検証

- 下記の[共通検証](#各スライスの共通検証)を実行する。
- 既存の全銀、JPX、短い行と UTF-16 のホバー、キャンセル、エディターなし、選択・解除と
  テレメトリのテストを維持する。形式単位の共有を期待するテストは新しい分離契約に更新する。
- ホストのテストでヘッダーありとなしの文書、同じ表示名の異なる URI、文書の切替・開き直し、
  同時表示と分割表示、解除、行の追加・削除と Undo/Redo、ヘッダー編集後のモード、
  空の変更通知、文書ごとの連続通知の集約を確認する。待機中の選び直し、表示消失、解除、破棄で
  古い処理が走らず、ハンドルと購読が一度だけ破棄され、イベントを余分に送信しないことを確かめる。
- Desktop 安定版と Web 安定版で合成の全銀データを2文書並べて表示し、一方のモードヘッダーを
  編集した結果、もう一方の表示、分割表示の同期、解除と同じ URI での再表示を確認する。
  編集を元に戻した後、拡張の操作で原文、保存内容、未保存状態が変化しないことを確認する。
- 1,000行の合成文書で100ミリ秒以内に10件の編集通知を続け、最後の通知からの待機後に、
  1回の解析と各表示1回の更新で最新内容を描画することをテストする。時間はテスト側で制御する。
  実ホストで編集を妨げる描画の遅延が再現する場合は、実装担当が計測結果を添えて Main に戻す。

### 実装結果と証跡

- 受け入れ条件を満たした。Application の解析モードを呼び出し単位にし、Presentation で URI ごとの形式と
  表示中のエディターごとの装飾を管理する。編集を100ミリ秒まとめて再解析し、同じ URI の分割表示に
  同一結果を反映する。閉じて開き直した文書の形式を保ち、解除・表示消失・破棄では待機処理と装飾を破棄する。
- 変更した承認対象パス:
  `src/application/fixedWidth/FixedWidthDecoration.ts`、
  `src/presentation/vscode/FixedWidthPresentation.ts`、`src/test/extension.test.ts`、
  `src/test/support/characterizationHost.ts`、`docs/specs/architecture.md`、
  `docs/requirements/use-cases/uc-display-fixed-width.md`、
  `docs/requirements/use-cases/uc-switch-editors.md`、
  `docs/requirements/use-cases/uc-clear-decorations.md`、`README.md`、`CHANGELOG.md`、
  本ファイル。
- ホストテストで全銀・JPX・ホバー・UTF-16 範囲・テレメトリを維持し、ヘッダーの編集、別 URI の独立、
  分割表示、解除、同じ URI の再オープン、1000行への10回編集を確認した。Desktop 1.145.2 で9件、
  最小対応版 1.75.0 のスモーク、Web 安定版のスモークが通過した。
- Main による実画面確認も Desktop 1.145.2 と Web 安定版
  (`c4453f8ea430795f941c1b2ff6c9321135a74a02`) で通過した。2文書間のモード分離、ヘッダー編集と Undo、
  同 URI の分割同期と解除、再オープン、クリーン状態、原文と保存バイトの維持を確認した。
  入力・バンドル識別情報は `/private/tmp/jfixed-host-ui.dMwuVJ/final-inputs.txt`、結果は同フォルダーの
  `desktop-final.log` と `web-final.log`。
- 型チェック、テスト準備、アーキテクチャ7件、本番ビルド、Desktop、Desktop 1.75.0、Web の終了コードは
  すべて0。ログと結果一覧は `/private/tmp/jfixedviewer-slice1.9XKYl8/evidence/` の
  `types.log`、`test-prepare.log`、`architecture.log`、`production-build.log`、`desktop.log`、
  `desktop-min.log`、`web.log`、`status.txt`。
- Qlty 0.645.0、設定 SHA256
  `ef66ff4bc2c0987ea6ce019c5370b11aed4a3ebbb448ad64473d913bec0af6e`、lockfile SHA256
  `4b3f5831ca7e1381037527fe7026b4a1a21d3f20b16b6cde39f8590a2a7832ec`。比較ベースと最終の
  `qlty check --all --sarif --no-fix`、
  `qlty smells --all --sarif --no-snippets` は終了コード0で検出0件。
  最終の `npm run qlty` も終了コード0。base/final は各49ジョブで197件のプラグイン×対象を検査し、
  実ファイルパスは各64件。SARIF、標準エラー、パス一覧、総合結果は
  同証跡フォルダーの `base-check.sarif`、`base-smells.sarif`、`final-check.sarif`、
  `final-smells.sarif`、`*-stderr`、`base-paths.log`、`final-paths.log`、`final-qlty.log`、
  `final-qlty-metadata.log`、`base-status.txt`、`final-status.txt`、`final-qlty-status.txt`、
  `final-qlty-metadata-status.txt`。
- `TRACEABILITY.md` は変更していない。要件2〜4とユースケース、ホスト検証の対応および結果区分は計画どおりで、
  新しい対応関係や検証結果の分類は生じていない。
- Qlty は `qlty.toml` の既存の未対応キーについて警告したが、検査は完了し検出はなかった。Web の実画面ログに
  VS Code の翻訳リソース 404 が出たが、操作シナリオは完了し、製品動作への影響は確認されなかった。
- 独立実装レビューでは製品コードの不備はなく、待機中の再選択・解除・表示消失・破棄と不要イベント、
  購読の一度だけの破棄に関するテスト不足が指摘された。承認済みの2テストパスだけを更新し、再選択・解除・
  Close を伴わない非表示・拡張の破棄をフェイク時計の保留数、描画数、イベント数、購読破棄数で検証した。
  URI 分離テストも同じ `path` で scheme、authority、query、fragment が異なる URI に更新した。
- 指摘修正後に `npm run test:prepare` と Desktop 1.145.2 を再実行し、13件すべて通過した。
  Markdown lint（変更Markdown 7件）、`git diff --check`、`npm run qlty`、
  Qlty の最終 SARIF check と smells も終了コード0、検出0件。出力は証跡フォルダーの
  `review-fix-test-prepare.log`、
  `review-fix-desktop.log`、`review-fix-qlty.log`、`review-fix-check.sarif`、
  `review-fix-smells.sarif`、`review-fix-check.stderr`、`review-fix-smells.stderr`、
  `review-fix-status.txt`、`review-fix-check-status.txt`、`review-fix-smells-status.txt`。
  文書検査の出力は `review-fix-markdownlint.log` と `review-fix-diff-check.log`。
- 製品コード、プレゼンテーション SHA256 (`4a9cfabb97652cdb95fc8418b4df2a0c8fbc1c9955bd6533aaf4e948b15b31aa`)、
  UI 検証用バンドルは不変。したがって前記 Desktop/Web 実画面検証を再利用した。識別情報と操作結果は
  `/private/tmp/jfixed-host-ui.dMwuVJ/final-inputs.txt`、`desktop-final.log`、`web-final.log`。
- 人によるスライス完了承認は利用者の指示どおり `Pending`。この差分の独立再レビューは通過済み。

## スライス2. 境界の見た目を選べる設定

### 設定と表示の受け入れ条件

- [仕様](SPECS.md#表示設定)の3方式、色、太さ、フォールバックを提供する。
  設定の変更は対象 URI の選択済み表示に反映し、別フォルダーや未選択・解除済みの文書に波及させない。
- すべての方式で元のデータと論理上のホバー座標を保つ。実在しない終端を行末に重ねず、
  テーマや折り返しが変わっても表示は VS Code の項目範囲に追随する。

### 設定と描画の責務

- `package.json` の `contributes.configuration` に `resource` スコープの設定を宣言する。
  Presentation は `workspace.getConfiguration` と `affectsConfiguration` を URI 付きで使う。
  実行時の値も検証する。設定を切り替えるときは、対象文書の最新の内容から描画を作る。
  保留中の編集と一緒に反映できるときは同じ描画にまとめる。
- VS Code 向けの描画を新規 `decorationStyle.ts` に分ける。
  表示の設定値の解決、項目範囲の可視部分への変換、設定ごとの装飾オプションを扱い、
  リソースの所有とイベント処理は `FixedWidthPresentation.ts` に置く。
  Application と Domain の契約、依存方向はスライス1のままとする。
- `line` は `after` に空の `contentText`、背景色、幅、文字高を指定し、項目終端に縦線を描画する。
  `marker` は `after.contentText` に区切り記号を指定する。行末を超える項目には付加表示を行わない。
  `alternating` は偶数項目の文字が存在する範囲に `backgroundColor` を設定する。
  可視の項目範囲を使い、ホバーの数値は元の定義から作る。空の範囲にホバーを登録しない。
- エディターごとに必要な装飾タイプだけを作る。新しい描画に切り替えた後は置き換えた
  ハンドルを破棄する。設定の効果を確認するためだけのコマンドやテレメトリは追加しない。

### スライス2の承認対象パス

- `package.json`
- `src/presentation/vscode/FixedWidthPresentation.ts`
- `src/presentation/vscode/decorationStyle.ts`（新規）
- `src/test/extension.test.ts`
- `src/test/support/characterizationHost.ts`
- `src/test/smoke.ts`
- `docs/requirements/use-cases/uc-display-fixed-width.md`
- `README.md`
- `CHANGELOG.md`
- `docs/specs/features/fixed-width-display-improvements/TASKS.md`

設定宣言以外のマニフェスト項目、ロックファイル、CI、定義、生成物は対象外。
アーキテクチャの新しい層や公開インターフェースを追加しない。

### スライス2の検証

- 下記の[共通検証](#各スライスの共通検証)を実行する。
- テストで3方式の範囲と描画オプション、偶数項目を行ごとに数えること、色と太さの有効値と
  不正値、短い行末への境界の集中防止、終端が行末に一致する場合、全角と補助文字、
  日本語ホバー、設定変更時の対象 URI と複数表示、旧ハンドルの破棄を確認する。
- 実ホストの共有スモークで既存コマンドと設定3件の登録・既定値の取得を確認する。
  Desktop 安定版と Web 安定版で、既定のライト・ダークの各テーマ、3方式、設定変更、
  折り返し、短い行、全銀と JPX、日本語ホバー、原文と保存内容の維持を目視と操作で確認する。
  複数フォルダーで片方だけに設定を置いて両方を表示し、設定の適用範囲も確認する。
- 縦線がかすれる、色が本文を隠す、あるいは終端が折り返しで別の位置に見える場合は
  再現条件を記録して解消する。現在のホスト API では要件を満たせない場合は Main に戻す。

## 各スライスの共通検証

- 変更した Markdown すべてを CI と同じ `markdownlint-cli2@0.22.0` で検査し、相対リンクと
  構造、`git diff --check`、要件と承認範囲との対応を確かめる。
- 型チェック `npm exec -- tsc -p . --noEmit`。
- 本番ビルド `npm exec -- webpack --mode production --devtool false`。
- `npm run test:prepare`、`npm run test:architecture`、
  `npm run test:desktop`、`npm run test:desktop:min`（1.75.0）、`npm run test:web`。
  Desktop 安定版と Web 安定版の
  実機確認は各スライスの手順に従い、ホスト、版、手順、結果を残す。
- [Qlty の品質条件](../../validation.md#品質条件)に従う。正確な基準と最終の使い捨て
  スナップショットで `qlty check --all --sarif --no-fix` と
  `qlty smells --all --sarif --no-snippets` を実行し、最終で `npm run qlty` を実行する。
  ツール版、入力と設定、解析パスと件数、終了コード、公式 SARIF と総合チェックを保存する。
  Main の環境では通常起動でログ書き込みが制限された。隔離したスナップショットで実行環境を
  確かめ、解析が完了しない場合は証跡を添えて Main に戻す。
- 初回ベースの型チェック、テストコンパイル、アーキテクチャ検査7件、両ホスト向けビルド、
  スモーク用のビルド、Desktop 1.145.2 のテスト5件は Main の事前確認で通過。
  実装の検証は各スライスの承認済みの範囲、基準、最終入力に対して行い、結果と証跡をここに記録する。
- 最小対応版の [VS Code 型定義](https://github.com/microsoft/vscode/blob/1.75.0/src/vscode-dts/vscode.d.ts)
  で可視エディター、文書変更、設定のイベント、URI スコープと装飾 API を確認した。
  [設定の公式仕様](https://code.visualstudio.com/api/references/contribution-points#contributes.configuration)
  で `resource` スコープがフォルダー設定を扱えることを確認した。
  [テーマ色の公式仕様](https://code.visualstudio.com/api/references/theme-color#editor-colors)を
  参照する。描画とテーマの実際の挙動は実ホストで検証する。

[証跡の取り扱い](../../evidence.md#証跡の取り扱い)と
[決定的な失敗の修正ループ](../../validation.md#決定的な失敗の修正ループ)に従う。

## 機能の終了判定

- スライス1で文書の表示・切替・解除の恒久ユースケース、アーキテクチャ、README、変更履歴に
  新しい文書単位の挙動を反映する。スライス2で表示の恒久ユースケース、README、変更履歴に
  設定と表示の挙動を反映する。終了時に内容と検証の対応を確認する。
- 最上位層で削除する対象は `docs/specs/features/fixed-width-display-improvements/SPECS.md`、
  `docs/specs/features/fixed-width-display-improvements/TASKS.md`、
  `docs/specs/features/fixed-width-display-improvements/TRACEABILITY.md` の3件。
  計画では終了時の追加の恒久文書編集を想定していない。
- 機能フォルダーを削除する前に、両 PR から参照できる終了証跡を最上位 PR に置く。
  レビュー、承認、検証、比較ベースと各ヘッド、終了コミット、最新のチェックを結び付ける。
  マージ承認と実際のマージの結果は終了証跡に追記する。

[機能の終了判定](../../README.md#機能の終了判定)に従う。
