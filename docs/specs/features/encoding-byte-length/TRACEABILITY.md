# 要件と検証の対応

計画の版 `plan-v1`。具体的な契約は [SPECS](SPECS.md)、実装パスとコマンドは
[TASKS](TASKS.md)に置く。実装前のため全て検証は未実施。

| 要件 | スライス | 確認する内容 | 主な検証場所 |
| --- | --- | --- | --- |
| R1 | S1、S2で維持 | 最低版1.100、正確な型、両ホスト | 型/両bundle/最低版/安定版/Web、CI差分 |
| R2 | S2 | 単位・encoding、省略、旧columns | loader/Domain/Application、既存回帰 |
| R3、R4 | S2 | 再読込、dirty、fallback、失敗解除 | fake host、共有実ホストsmoke |
| R5 | S2 | 元URI、世代/版/encoding、close/非表示 | 遅延fake、分割表示、host smoke |
| R6 | S2 | Shift_JIS/UTF-8/UTF-16の表示変換 | encoding test、全style/hover/強調 |
| R7 | S2 | 途中境界、安全な範囲、単位表示 | Domain/Application/診断、host smoke |
| R8 | S2 | バイト長、N型、上限、編集/保存/encoding | Domain/Application/fake、既存回帰 |
| R9 | S2 | JIS系全銀33/JPX、ASCII不変、モード | 既存サンプル回帰、定義の属性差分 |
| R10 | S1、S2 | 内容/パス非送信、既存eventとopt-out | fake reporter、差分レビュー |

- BOM と内容 U+FEFF、置換・孤立サロゲート、API/native codec 不一致は encoding test と
  共有 host smoke を使い分け、fake だけでホスト互換を証明しない。
- 共通の固定長契約は共通テストで確認する。host smoke は API とアダプター境界の
  最小限の確認にし、同じ全サンプル回帰を各ホストに重複実装しない。
- 全体 Qlty、アーキテクチャ、Markdown/リンク/構文、GitHub 最新ヘッドの確認は
  各実装スライスに横断して適用する。終了時は有効な証跡を再利用する。
