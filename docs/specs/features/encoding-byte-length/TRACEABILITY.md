# 要件と検証の対応

計画の版 `plan-v4` revision 2（S2 の契約別テスト分割と fixture 抽出、既存承認を維持）。具体的な契約は
[SPECS](SPECS.md)、実装パスと結果は [TASKS](TASKS.md) に置く。S1 は検証・完了済み。
S2 の実装と受け入れ検証は完了した。表の Pass は今回の最終入力での検証結果を示す。
独立実装レビュー `s2-review-v2` は Ready・指摘0件。Main が今回限定の承認省略条件を適用した。
PR の最新 head 検査は公開後に Main が行う。

<!-- markdownlint-disable MD013 -->

| 要件   | スライス         | 確認する内容                            | 主な検証場所                         |
| ------ | ---------------- | --------------------------------------- | ------------------------------------ |
| R1     | S1 Pass、S2 Pass | 最低版1.100、正確な型、両ホスト         | 型/Desktop/Web bundle/全ホスト smoke |
| R2     | S2 Pass          | 単位・encoding、省略、旧columns         | loader/Domain/Application、既存回帰  |
| R3、R4 | S2 Pass          | 再読込、dirty、fallback、失敗解除       | fake host、共有実ホストsmoke         |
| R5     | S2 Pass          | 元URI、世代/版/encoding、close/非表示   | 遅延fake、分割表示、host smoke       |
| R6     | S2 Pass          | Shift_JIS/UTF-8/UTF-16の表示変換        | encoding test、全style/hover/強調    |
| R7     | S2 Pass          | 途中境界、安全な範囲、単位表示          | Domain/Application/診断、host smoke  |
| R8     | S2 Pass          | バイト長、N型、上限、編集/保存/encoding | Domain/Application/fake、既存回帰    |
| R9     | S2 Pass          | JIS系全銀33/JPX、ASCII不変、モード      | 既存サンプル回帰、定義の属性差分     |
| R10    | S1 Pass、S2 Pass | 内容/パス非送信、既存eventとopt-out     | 全Desktopテスト、差分レビュー        |

<!-- markdownlint-enable MD013 -->

- BOM と内容 U+FEFF、置換・孤立サロゲート、API/native codec 不一致は encoding test と
  共有 host smoke を使い分け、fake だけでホスト互換を証明しない。
- 共通の固定長契約は共通テストで確認する。host smoke は API とアダプター境界の
  最小限の確認にし、同じ全サンプル回帰を各ホストに重複実装しない。
- 全体 Qlty、アーキテクチャ、Markdown/リンク/構文、GitHub 最新ヘッドの確認は
  各実装スライスに横断して適用する。終了時は有効な証跡を再利用する。

- S2 の責務抽出は R3〜R5/R10 を選択・再読込、R5〜R8 を描画 session、R6/R7/R9 を
  editor 装飾と共通 style へ対応付ける。遅延 fake・分割表示・実ホスト smoke の範囲は維持する。
  Domain/Application/codec の局所整理は R2/R6〜R8 の既存共通テストで同じ契約を確かめる。
- Web は標準 `vscode-test-web` CLI の cold/warm cache で R1/R3/R6/R9 と
  追加済みの共有実ホスト smoke を確認する。新規取得で資材が同梱され、同じ完全な cache で
  標準 CLI も通過したため、補完 helper とその単体検証は不要として削除する。
  製品の Web 検証範囲は維持する。初回404と後続の成功を別に保持し、欠落原因は未確定とする。
- 品質改善は閾値・全体対象を変えず Qlty の新規/悪化0件と総合通過で確認する。
  一時保護による CodeQL は S2 の最新 PR head と解析 revision を Main が照合し、
  全層統合後の復旧まで記録する。S1 の完了・承認・最新チェックを置き換えない。

- S2 の Desktop 46件、最低版1.100.0、標準 Web cold/warm、型、bundle、architecture、
  Qlty の実行結果と有効入力は [TASKS](TASKS.md) の実装結果と最終検証 index を参照する。
  `scripts/prepare-web-runtime.test.mjs` 専用の旧 helper unit は plan-v3 で helper を削除したため
  `Not Applicable`。Web 全ホストの smoke 検証は標準 CLI で維持し、cold/warm とも成功した。
  S2 PR は未公開のため GitHub の最新 head Verify / CodeQL / Cloud は未確認であり、Main が確認する。

- plan-v4 revision 2 は codec/投影、ホスト選択、解析結果の失効、再読込競合の契約で
  既存23件を5/12/2/4件へ分ける。共有の `encodingFixtures.ts` は形式定義と型だけを扱う。
  R2/R3/R5〜R9 の既存シナリオと期待値を維持し、Desktop の新規3入口と元23件の対応、
  型・test:prepare・全 Desktop テスト・全体 Qlty で確認する。
  fixture 専用の重複テストは加えず、製品の契約と共通 smoke、標準 Web、最低版の範囲を維持する。
- review-v1 の再open encoding 照合・URI再読込直列化・実ホスト dirty/read failure の3指摘は
  `DocumentRenderSession`、`FileTypeSelection`、共有 smoke と fake/host 境界のテストで修正した。
  Desktop 全46件・最低版・Web cold/warm・Qlty の生結果、解析対象一覧と入力 hash は
  [TASKS](TASKS.md) の `s2-final` 証跡 index に記録する。
