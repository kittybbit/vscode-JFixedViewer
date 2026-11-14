# 固定長形式サンプル

サンプルは JFixedViewer の表示確認用に作成した架空データです。金融機関、取引所、
銘柄や取引の実データではありません。

組み込みの全銀と JPX 形式は Shift_JIS のバイト数で項目とレコードを検証します。
このディレクトリのサンプルデータ部は ASCII で構成しているため、文字数とバイト数は同じです。
レコード区切りの LF はデータ部の幅に含めません。

## JPX

- [jpx/SH_DER.csv](jpx/SH_DER.csv)
  - 形式: JPX / 四本値（デリバティブ）
  - 仕様: [JPX 総研データフィードサービス仕様書 v4.0 (ZIP)](https://www.jpx.co.jp/markets/paid-info-equities/reference/co3pgt0000004g0w-att/JPXReferenceDFS.zip)

JPX の配信名の拡張子は `.csv` で、データ部分は657バイトの固定長です。
データには日経225先物のコード値を使っています。基準値段は架空値、予備項目は JPX の仕様で
指定された空白またはゼロで埋めています。サンプルは仕様にある1バイト文字で構成し、LF はレコード区切りとして
追加しています。データ部分の幅には含めません。

## 全銀協制定形式

全銀のサンプルは、全銀協「適用業務およびレコード・フォーマット」AP-I-13 (2026年10月改訂) にある33形式です。
公式仕様書は[全銀協 AP-I-13 (PDF)](https://www.zenginkyo.or.jp/fileadmin/res/abstract/efforts/system/jba_protocol_pc.pdf)を参照してください。

以下のページは仕様書の第Ⅱ部に印刷されたページ番号です。

- **振込入金通知(A)** (`furikomi_nyuukin_tuuchi_a`)
  - [サンプル](zengin/50200001.furikomi_nyuukin_tuuchi_a.dat)
  - AP-I-13 第Ⅱ部 §1、pp.17–18
- **振込入金通知(B)** (`furikomi_nyuukin_tuuchi_b`)
  - [サンプル](zengin/50200001.furikomi_nyuukin_tuuchi_b.dat)
  - AP-I-13 第Ⅱ部 §1、pp.18–19
- **入出金取引明細** (`nyuusyukkin_torihiki_meisai`)
  - [サンプル](zengin/50200003.nyuusyukkin_torihiki_meisai.dat)
  - AP-I-13 第Ⅱ部 §2、pp.20–24
- **残高通知(預金)** (`zanndaka_tuuchi_yokin`)
  - [サンプル](zengin/50200004.zanndaka_tuuchi_yokin.dat)
  - AP-I-13 第Ⅱ部 §3、pp.26–28
- **給与振込(民間)** (`kyuuyo_furikomi_minkan`)
  - [サンプル](zengin/50200111.kyuuyo_furikomi_minkan.dat)
  - AP-I-13 第Ⅱ部 §4、pp.29–30
- **賞与振込(民間)** (`syouyo_furikomi_minkan`)
  - [サンプル](zengin/50200112.syouyo_furikomi_minkan.dat)
  - AP-I-13 第Ⅱ部 §5、p31。共通レイアウトは§4、pp.29–30
- **給与振込(地方公務員)** (`kyuuyo_furikomi_chihoukoumuin`)
  - [サンプル](zengin/50200171.kyuuyo_furikomi_chihoukoumuin.dat)
  - AP-I-13 第Ⅱ部 §6、p32。共通レイアウトは§4、pp.29–30
- **賞与振込(地方公務員)** (`syouyo_furikomi_chihoukoumuin`)
  - [サンプル](zengin/50200172.syouyo_furikomi_chihoukoumuin.dat)
  - AP-I-13 第Ⅱ部 §7、p33。共通レイアウトは§4、pp.29–30
- **総合振込** (`sougou_furikomi`)
  - [サンプル](zengin/50200121.sougou_furikomi.dat)
  - AP-I-13 第Ⅱ部 §8、pp.34–35
- **株式配当金振込** (`kabushiki_haitoukin_furikomi`)
  - [サンプル](zengin/50200141.kabushiki_haitoukin_furikomi.dat)
  - AP-I-13 第Ⅱ部 §9、pp.36–37
- **年金信託契約に係る年金・一時金給付金振込** (`nenkin_shintaku_keiyaku`)
  - [サンプル](zengin/50200143.nenkin_shintaku_keiyaku.dat)
  - AP-I-13 第Ⅱ部 §10、p38。共通項目は§9、pp.36–37を使い、末尾項目は§10 p38に従う
- **公的年金保険の年金・一時金給付金振込** (`kouteki_nenkin_hoken`)
  - [サンプル](zengin/50200144.kouteki_nenkin_hoken.dat)
  - AP-I-13 第Ⅱ部 §11、p39。レイアウトは§10 p38を継承し、種別コードは§11 p39に従う
- **医療保険の給付金振込** (`iryou_hoken_kyufukin_furikomi`)
  - [サンプル](zengin/50200145.iryou_hoken_kyufukin_furikomi.dat)
  - AP-I-13 第Ⅱ部 §12、p40。レイアウトは§10 p38を継承し、種別コードは§12 p40に従う
- **振込口座照会(依頼明細)** (`furikomi_kouza_shokai_irai_meisai`)
  - [サンプル](zengin/50200198.furikomi_kouza_shokai_irai_meisai.dat)
  - AP-I-13 第Ⅱ部 §13、pp.41–42
- **振込口座照会(処理結果明細)** (`furikomi_kouza_shokai_shori_kekka_meisai`)
  - [サンプル](zengin/50200199.furikomi_kouza_shokai_shori_kekka_meisai.dat)
  - AP-I-13 第Ⅱ部 §14、p43。共通ヘッダーは§13 p41を使い、種別コード99と処理結果項目は§14に従う
- **預金口座振替(依頼明細)** (`yokin_kouza_furikae_irai_meisai`)
  - [サンプル](zengin/50200191.yokin_kouza_furikae_irai_meisai.dat)
  - AP-I-13 第Ⅱ部 §15、pp.44–46
- **預金口座振替(処理結果明細)** (`yokin_kouza_furikae_shori_kekka_meisai`)
  - [サンプル](zengin/50200191.yokin_kouza_furikae_shori_kekka_meisai.dat)
  - AP-I-13 第Ⅱ部 §16、p47。共通ヘッダーは§15 p44を使い、処理結果項目は§16に従う。種別コード91は§15から継承
- **預金口座振替変更通知** (`yokin_kouza_furikae_henkou_tuuchi`)
  - [サンプル](zengin/50200193.yokin_kouza_furikae_henkou_tuuchi.dat)
  - AP-I-13 第Ⅱ部 §17、pp.48–49
- **住宅ローン関係(財形ローン)** (`jyuutaku_loan_kankei_zaikei_loan`)
  - [サンプル](zengin/50200211.jyuutaku_loan_kankei_zaikei_loan.dat)
  - AP-I-13 第Ⅱ部 §18、pp.51–54
- **住宅ローン関係(その他)** (`jyuutaku_loan_kankei_sonota`)
  - [サンプル](zengin/50200212.jyuutaku_loan_kankei_sonota.dat)
  - AP-I-13 第Ⅱ部 §19、p55
- **財形貯蓄関係(依頼明細)** (`zaikei_chochiku_kankei_irai_meisai`)
  - [サンプル](zengin/50200300.zaikei_chochiku_kankei_irai_meisai.dat)
  - AP-I-13 第Ⅱ部 §20、pp.56–59
- **財形貯蓄関係(処理結果明細:積立内容)** (`zaikei_chochiku_kankei_shori_kekka_meisai_tumitate_naiyou`)
  - [サンプル](zengin/50200301.zaikei_chochiku_kankei_shori_kekka_meisai_tumitate_naiyou.dat)
  - AP-I-13 第Ⅱ部 §21、pp.60–63
- **財形貯蓄関係(処理結果明細:利子補給)** (`zaikei_chochiku_kankei_shori_kekka_meisai_rishi_hokyuu`)
  - [サンプル](zengin/50200302.zaikei_chochiku_kankei_shori_kekka_meisai_rishi_hokyuu.dat)
  - AP-I-13 第Ⅱ部 §22、p64。データレイアウトは§21、pp.60–63を継承し、種別コードは§22 p64に従う
- **財形貯蓄関係(処理結果明細:その他)** (`zaikei_chochiku_kankei_shori_kekka_meisai_sonota`)
  - [サンプル](zengin/50200309.zaikei_chochiku_kankei_shori_kekka_meisai_sonota.dat)
  - AP-I-13 第Ⅱ部 §23、p65。データレイアウトは§21、pp.60–63を継承し、種別コードは§23 p65に従う
- **借入金計算書** (`kariirekin_keisansho`)
  - [サンプル](zengin/50200231.kariirekin_keisansho.dat)
  - AP-I-13 第Ⅱ部 §24、pp.67–72
- **借入金残高明細** (`kariirekin_zaikoumeisai`)
  - [サンプル](zengin/50200232.kariirekin_zaikoumeisai.dat)
  - AP-I-13 第Ⅱ部 §25、pp.73–76
- **借入金残高合計** (`kariirekin_zandaka_goukei`)
  - [サンプル](zengin/50200233.kariirekin_zandaka_goukei.dat)
  - AP-I-13 第Ⅱ部 §26、pp.77–78
- **外国為替取引明細(会計性)** (`fx_torihiki_meisai_kaikeisei`)
  - [サンプル](zengin/50200425.fx_torihiki_meisai_kaikeisei.dat)
  - AP-I-13 第Ⅱ部 §27、pp.83–119
- **外国為替取引明細(非会計性)** (`fx_torihiki_meisai_hikaikeisei`)
  - [サンプル](zengin/50200426.fx_torihiki_meisai_hikaikeisei.dat)
  - AP-I-13 第Ⅱ部 §28、pp.122–134
- **外国為替関連情報** (`fx_kanren_jouhou`)
  - [サンプル](zengin/50200427.fx_kanren_jouhou.dat)
  - AP-I-13 第Ⅱ部 §29、pp.138–140
- **外国送金依頼** (`gaikoku_soukin_irai`)
  - [サンプル](zengin/50200435.gaikoku_soukin_irai.dat)
  - AP-I-13 第Ⅱ部 §30、pp.142–146
- **荷為替輸入信用状発行依頼** (`nigawase_yunyuu_lc_hakkou_irai`)
  - [サンプル](zengin/50200428.nigawase_yunyuu_lc_hakkou_irai.dat)
  - AP-I-13 第Ⅱ部 §31、pp.150–165
- **外貨預金入出金取引明細** (`gaika_yokin_nyuushukkin_torihiki_meisai`)
  - [サンプル](zengin/50200009.gaika_yokin_nyuushukkin_torihiki_meisai.dat)
  - AP-I-13 第Ⅱ部 §32、pp.167–172

サンプル名の先頭8桁は仕様書の
ファイル名条件、後半は形式を見分けるための説明です。振込入金通知(A)/(B)と預金口座振替の依頼/
処理結果は先頭8桁が同じなので、形式を一覧から手動で選択してください。選択肢にある形式 ID と
手動選択の動作は変えていません。

ファイルを VS Code で開き、コマンド JFixedViewer: 固定長のファイル形式を選択 から表の形式を選びます。
レコード行の順序と分岐は AP-I-13 に合わせ、各ファイルに必要な行種別を置いています。入出金取引明細と
外貨預金入出金取引明細には普通預金系・定期預金系の口座グループ、外国為替取引明細には各取引の
ヘッダー・明細・トレーラを置き、借入金計算書と信用状依頼では分岐する行を含めています。

全銀のサンプルは仕様の文字集合から選んだ ASCII の架空値で構成し、実在の金融機関、口座、人物、
取引を示しません。各固定長レコードのデータ部は形式所定の幅で、LF をレコード区切りとして付けています。
N 型の数字埋め、C 型の左詰めとスペース埋め、任意項目の省略値は公式の各表に従います。
`.gitattributes` は LF と意味のある行末空白を保持します。可変レコードのタグ列は外側の固定長項目の
値として載せ、タグを別フィールドに分割して表示しません。

総合振込の EDI 識別欄は §8 p35 の113桁目に置きます。通常行は空白、EDI行は `Y` です。
借入金計算書の商業手形割引は §24 p71 の内訳 `230` と合計 `231`、荷為替輸入信用状は
§31 pp.150–165 の信用状発行 `01` と条件変更 `02` を含みます。財形依頼の `目的区分` は
§20 p57 で財形信託の場合のみ使うため、この財形信託ではない例では空白です。

可変長タグ列がある6レコードは、タグを含む全体を1つの固定長項目として示します。個々のタグ値には
固定の N/C 型がないため、外側項目の型を設定していません。外国送金の会計処理内訳にある2項目は、
複数の型・桁数をまとめる集約欄なので型を `-` としています。
