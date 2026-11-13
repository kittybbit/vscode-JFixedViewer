# 要件と検証の対応

計画の版 `plan-v2`（S2 の再計画、S1 の結果を維持）。具体的な契約は [SPECS](SPECS.md)、実装パスと結果は
[TASKS](TASKS.md)に置く。S1 は検証・完了済み。S2 の途中検証を保持し、
責務抽出と Web 準備後の最終入力に対する検証は未実施。

<!-- markdownlint-disable MD013 -->

| 要件   | スライス          | 確認する内容                            | 主な検証場所                         |
| ------ | ----------------- | --------------------------------------- | ------------------------------------ |
| R1     | S1 Pass、S2で維持 | 最低版1.100、正確な型、両ホスト         | 型/Desktop/Web bundle/全ホスト smoke |
| R2     | S2                | 単位・encoding、省略、旧columns         | loader/Domain/Application、既存回帰  |
| R3、R4 | S2                | 再読込、dirty、fallback、失敗解除       | fake host、共有実ホストsmoke         |
| R5     | S2                | 元URI、世代/版/encoding、close/非表示   | 遅延fake、分割表示、host smoke       |
| R6     | S2                | Shift_JIS/UTF-8/UTF-16の表示変換        | encoding test、全style/hover/強調    |
| R7     | S2                | 途中境界、安全な範囲、単位表示          | Domain/Application/診断、host smoke  |
| R8     | S2                | バイト長、N型、上限、編集/保存/encoding | Domain/Application/fake、既存回帰    |
| R9     | S2                | JIS系全銀33/JPX、ASCII不変、モード      | 既存サンプル回帰、定義の属性差分     |
| R10    | S1 Pass、S2       | 内容/パス非送信、既存eventとopt-out     | 全Desktopテスト、差分レビュー        |

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
- Web の公式資材準備は R1/R3/R6/R9 の実ホスト検証の前提に対応する。
  `node --test scripts/prepare-web-runtime.test.mjs` で取得・cache・失敗・識別の契約を確認し、
  cold/warm cache の `npm run test:web` で Chromium/ESM の同じ実 smoke を確認する。
  原本の404と公式同 commit 資材による成功は別の証跡として維持する。
- 品質改善は閾値・全体対象を変えず Qlty の新規/悪化0件と総合通過で確認する。
  一時保護による CodeQL は S2 の最新 PR head と解析 revision を Main が照合し、
  全層統合後の復旧まで記録する。S1 の完了・承認・最新チェックを置き換えない。
