# vscode-JFixedViewer

[![MIT ライセンス](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Visual Studio Marketplace のバージョン](https://img.shields.io/visual-studio-marketplace/v/kittybbit.vscode-JFixedViewer)](https://marketplace.visualstudio.com/items?itemName=kittybbit.vscode-JFixedViewer)
[![Visual Studio Marketplace のダウンロード数](https://img.shields.io/visual-studio-marketplace/d/kittybbit.vscode-JFixedViewer)](https://marketplace.visualstudio.com/items?itemName=kittybbit.vscode-JFixedViewer)
[![Visual Studio Marketplace の評価](https://img.shields.io/visual-studio-marketplace/stars/kittybbit.vscode-JFixedViewer)](https://marketplace.visualstudio.com/items?itemName=kittybbit.vscode-JFixedViewer)
[![Qlty の保守性評価](https://qlty.sh/badges/0cc9e169-14e8-44d7-a0de-5c358687a18e/maintainability.png)](https://qlty.sh/gh/kittybbit/projects/vscode-JFixedViewer)

日本でよく利用されている、固定長ファイルを読みやすく表示します。

## 機能

- コマンドパレットの`JFixedViewer:固定長のファイル形式を選択`からファイル形式を選択できます。
  - 選択した固定長ファイル形式に合わせて、項目を`|`区切りで装飾して表示します。この区切りは装飾として表示されるだけで、実際のデータは変更されません。
- ファイルを編集しても、装飾は自動的に更新されません。ファイル形式を再選択する必要があります。
- サポートしているファイル種別は以下の通りです。  
  問題を発見したら[教えて](https://github.com/kittybbit/vscode-JFixedViewer/issues)ください

| カテゴリ       | ファイル種別                                |
| -------------- | ------------------------------------------- |
| 全銀協規定形式 | 振込入金通知                                |
|                | 入出金取引明細 残高通知(預金)               |
|                | 給与振込(民間)                              |
|                | 賞与振込(民間)                              |
|                | 給与振込(地方公務員)                        |
|                | 賞与振込(地方公務員)                        |
|                | 総合振込                                    |
|                | 株式配当金振込                              |
|                | 年金信託契約に係る年金・一時金給付金振込    |
|                | 公的年金保険の年金・一時金給付金振込        |
|                | 医療保険の給付金振込 振込口座照会(依頼明細) |
|                | 振込口座照会(処理結果明細)                  |
|                | 預金口座振替(依頼明細)                      |
|                | 預金口座振替(処理結果明細)                  |
|                | 預金口座振替変更通知                        |
|                | 住宅ローン関係(財形ローン)                  |
|                | 住宅ローン関係(その他)                      |
|                | 財形貯蓄関係(依頼明細)                      |
|                | 財形貯蓄関係(処理結果明細:積立内容)         |
|                | 財形貯蓄関係(処理結果明細:利子補給)         |
|                | 財形貯蓄関係(処理結果明細:その他)           |
|                | 借入金計算書 借入金残高明細 借入金残高合計  |
|                | 外国為替取引明細(会計性)                    |
|                | 外国為替取引明細(非会計性)                  |
|                | 外国為替関連情報                            |
|                | 外国送金依頼                                |
|                | 荷為替輸入信用状発行依頼                    |
|                | 外貨預金入出金取引明細                      |
| JPX            | 四本値(デリバティブ)                        |

## 動作要件

この拡張機能を使用するための特別な要件はありません。

## 拡張機能の設定

この拡張機能には特別な設定はありません。

## テレメトリ

VS Code での使い勝手を改善するため、実行したコマンドの情報だけを収集します。
氏名、住所、ファイルのパスなどの情報は収集しません。
拡張機能は `telemetry.enableTelemetry` の設定に従います。
設定方法は [VS Code の FAQ](https://code.visualstudio.com/docs/supporting/faq#_how-to-disable-telemetry-reporting)を参照してください。

## 既知の問題

現在、既知の問題はありません。

## 開発に参加する

変更を加える前に [SDD ポリシー](docs/specs/README.md) を確認してください。

## ライセンス

MIT
