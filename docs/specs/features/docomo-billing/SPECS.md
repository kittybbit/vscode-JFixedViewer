# ドコモのご利用料金管理サービスの固定長明細表示

## 目的

NTTドコモのご利用料金管理サービスから取得した固定長明細を VS Code で開き、
明細の種類を選ぶとレコードと項目の境界を確認できるようにする。

## 根拠

対象は「システム用データダウンロード」の展開済み `.cla` ファイル。
レコードの構造と項目は、2026年11月22日に公開されていた
[NTTドコモのファイル仕様書一覧](https://gorikan.billing.smt.docomo.ne.jp/bbilling/html/download_02.html)
と各種類の仕様書に基づく。全7種類を含む
[公式デモ](https://www.docomo-bp-site.ne.jp/demo/html/top_demo.html)の出力で、
改行、バイト幅、文字コード、レコード識別位置を照合した。

| 種類 | 明細 | 改行を除くバイト幅 |
| --- | --- | ---: |
| M | [ご利用内訳明細][docomo-m] | 262 |
| F | [通話・通信・ドコモ光電話通信明細][docomo-f] | 138 |
| A | [データ通信・パケット通信明細][docomo-a] | 156 |
| W | [WORLD CALL通信明細][docomo-w] | 128 |
| J | [WORLD WING通信明細][docomo-j] | 126 |
| G | [WORLD WINGパケット通信明細][docomo-g] | 156 |
| E | [docomo Wi-Fi通信明細][docomo-e] | 124 |

[docomo-m]: https://gorikan.billing.smt.docomo.ne.jp/bbilling/html/BillingFile_M.pdf
[docomo-f]: https://gorikan.billing.smt.docomo.ne.jp/bbilling/html/BillingFile_F.pdf
[docomo-a]: https://gorikan.billing.smt.docomo.ne.jp/bbilling/html/BillingFile_A.pdf
[docomo-w]: https://gorikan.billing.smt.docomo.ne.jp/bbilling/html/BillingFile_W.pdf
[docomo-j]: https://gorikan.billing.smt.docomo.ne.jp/bbilling/html/BillingFile_J.pdf
[docomo-g]: https://gorikan.billing.smt.docomo.ne.jp/bbilling/html/BillingFile_G.pdf
[docomo-e]: https://gorikan.billing.smt.docomo.ne.jp/bbilling/html/BillingFile_E.pdf

既存の[固定長の項目表示](../../../requirements/use-cases/uc-display-fixed-width.md)と
[固定長レコードの検証](../../../requirements/use-cases/uc-validate-fixed-width.md)を適用する。
既存の組み込み形式「NTT」は NTT 東西の別形式であり、今回のファイルとは定義を共用しない。

## 要件と受け入れ条件

- 既存の形式選択コマンドから、対象の7種類を個別に選べる。
- 改行で区切られた対象ファイルを `shiftjis` のバイト単位で解釈し、
  管理、明細、集計・合計、終了などを各仕様の判定条件に従って表示する。
  M の請求書作成番号レコードは初回と継続を区別する。
- 日本語の行名・項目名と、1から数えた開始・終了バイト位置、バイト幅を既存のホバーで表示する。
  全角文字や半角カナを含む項目も、実在する文字境界に沿って装飾する。
- 対象仕様に沿った合成データで、各レコードの識別と項目幅、改行を含まない行長、
  末尾 CRLF を確認する。未知のレコード、短い行、長い行、文字を分断する境界は既存の診断に従う。
  空白埋めや符号など、各仕様で許容される値に対する誤診断も確認する。
- デスクトップ版と Web 版で、組み込み形式の選択から装飾、ホバー、診断までを検証する。
  文書を再読込する場合も、既存の未保存編集の保護と読み取り専用の表示契約を保つ。

## 決定事項と影響

- 既存の組み込み定義の構造、文字コードの再読込、バイト境界の処理を利用する。
  デモでは、管理と終了・合計の種別コードが M で13–14バイト目、その他で12–13バイト目にある。
  電話番号別の明細・合計と M の請求書作成番号のコードは、
  M が16–17バイト目、E が12–13バイト目、F/A/W/J/G が15–16バイト目にある。
  M の請求書作成番号の連番は18–19バイト目にあり、初回は `01`、継続は `02`–`99` とする。
- M の請求書作成番号の初回レコードにある口座・氏名の項目は、開始位置と幅が明記された
  詳細表 3-3-1 に従う。G は原本の第15版（2025年4月9日）を用いる。
- 管理、明細・内訳、M の請求書作成番号、電話番号別合計、終了・M の合計は既存の行役割別配色で表示する。
- E と G のデモには Windows-31J で U+FF0D に対応する全角マイナスがある。
  VS Code の既存の `shiftjis` での再読込と、バイト幅を合成データで確認する。
- 検証用データは合成する。公式デモのアーカイブや元の値はリポジトリに追加しない。
  文書の内容やパスをテレメトリに含めない。

## 互換性

VS Code のデスクトップ版と Web 版、既存の最小対応版を維持する。
既存形式の表示、診断、エディター切替時の挙動を保つ。

## 対象外

- 改行のない連結レコード、ZIP または LHA の展開、CSV ダウンロードデータ。
- 料金の再計算、業務上の値の妥当性判定、レコードの修正や変換。
