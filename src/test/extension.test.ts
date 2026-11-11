import * as assert from "assert";
import { readFileSync, readdirSync } from "node:fs";
import path = require("node:path");
import {
  CharacterizationHost,
  FakeEditor,
} from "./support/characterizationHost";

const commandId = "vscode-JFixedViewer.FiletypePicker";
const zenginAccount = "全銀協規定形式/振込入金通知(A)";
const zenginTransfer = "全銀協規定形式/入出金取引明細";
const zenginGeneralTransfer = "全銀協規定形式/総合振込";
const zenginLoanCalculation = "全銀協規定形式/借入金計算書";
const zenginForeignCurrency = "全銀協規定形式/外貨預金入出金取引明細";
const jpxFourPrices = "JPX/四本値(デリバティブ)";
const clearType = "なし/なし";
const jpxFourPricesFieldNames = [
  "レコード区分",
  "ファイル識別",
  "商品取引識別",
  "予備",
  "予備",
  "ポスト区分",
  "銘柄コード",
  "サインフラグ",
  "基準値段",
  "サインフラグ",
  "前場始値成立値段",
  "前場始値成立日付",
  "前場始値成立時刻",
  "サインフラグ",
  "前場高値成立値段",
  "前場高値成立日付",
  "前場高値成立時刻",
  "サインフラグ",
  "前場安値成立値段",
  "前場安値成立日付",
  "前場安値成立時刻",
  "サインフラグ",
  "前場終値成立値段",
  "前場終値成立日付",
  "前場終値成立時刻",
  "前場取引高",
  "サインフラグ",
  "日中始値成立値段（後場始値成立値段）",
  "日中始値成立日付（後場始値成立日付）",
  "日中始値成立時刻（後場始値成立時刻）",
  "サインフラグ",
  "日中高値成立値段（後場高値成立値段）",
  "日中高値成立日付（後場高値成立日付）",
  "日中高値成立時刻（後場高値成立時刻）",
  "サインフラグ",
  "日中安値成立値段（後場安値成立値段）",
  "日中安値成立日付（後場安値成立日付）",
  "日中安値成立時刻（後場安値成立時刻）",
  "サインフラグ",
  "日中終値成立値段（後場終値成立値段）",
  "日中終値成立日付（後場終値成立日付）",
  "日中終値成立時刻（後場終値成立時刻）",
  "日中取引高（後場取引高）",
  "サインフラグ",
  "特別気配",
  "符号",
  "サインフラグ",
  "ナイトセッション始値成立値段",
  "ナイトセッション始値成立日付",
  "ナイトセッション始値成立時刻",
  "サインフラグ",
  "ナイトセッション高値成立値段",
  "ナイトセッション高値成立日付",
  "ナイトセッション高値成立時刻",
  "サインフラグ",
  "ナイトセッション安値成立値段",
  "ナイトセッション安値成立日付",
  "ナイトセッション安値成立時刻",
  "サインフラグ",
  "ナイトセッション終値成立値段",
  "ナイトセッション終値成立日付",
  "ナイトセッション終値成立時刻",
  "ナイトセッション取引高",
  "年月日",
  "予備",
  "予備",
  "予備",
  "予備",
  "予備",
  "予備",
  "予備",
  "予備",
  "予備",
  "予備",
  "商品グループ群コード",
  "商品グループコード",
  "商品コード",
  "プロダクトタイプコード",
  "限月",
  "予備",
  "商品タイプ",
  "権利行使価格",
  "予備",
];
const jpxFourPricesFieldWidths = [
  1, 3, 2, 4, 2, 3, 12, 1, 18, 1, 18, 8, 4, 1, 18, 8, 4, 1, 18, 8, 4, 1, 18, 8,
  4, 18, 1, 18, 8, 4, 1, 18, 8, 4, 1, 18, 8, 4, 1, 18, 8, 4, 18, 1, 18, 1, 1,
  18, 8, 4, 1, 18, 8, 4, 1, 18, 8, 4, 1, 18, 8, 4, 18, 8, 12, 3, 1, 1, 1, 1, 1,
  18, 1, 18, 3, 6, 10, 3, 8, 1, 3, 18, 48,
];
const jpxNoTradeDateTimeFields = [
  { fieldNumber: 12, start: 66, end: 73 },
  { fieldNumber: 13, start: 74, end: 77 },
  { fieldNumber: 16, start: 97, end: 104 },
  { fieldNumber: 17, start: 105, end: 108 },
  { fieldNumber: 20, start: 128, end: 135 },
  { fieldNumber: 21, start: 136, end: 139 },
  { fieldNumber: 24, start: 159, end: 166 },
  { fieldNumber: 25, start: 167, end: 170 },
  { fieldNumber: 29, start: 208, end: 215 },
  { fieldNumber: 30, start: 216, end: 219 },
  { fieldNumber: 33, start: 239, end: 246 },
  { fieldNumber: 34, start: 247, end: 250 },
  { fieldNumber: 37, start: 270, end: 277 },
  { fieldNumber: 38, start: 278, end: 281 },
  { fieldNumber: 41, start: 301, end: 308 },
  { fieldNumber: 42, start: 309, end: 312 },
  { fieldNumber: 49, start: 370, end: 377 },
  { fieldNumber: 50, start: 378, end: 381 },
  { fieldNumber: 53, start: 401, end: 408 },
  { fieldNumber: 54, start: 409, end: 412 },
  { fieldNumber: 57, start: 432, end: 439 },
  { fieldNumber: 58, start: 440, end: 443 },
  { fieldNumber: 61, start: 463, end: 470 },
  { fieldNumber: 62, start: 471, end: 474 },
];

function header(mode: string): string {
  return `1${"0".repeat(61)}${mode}`;
}

function foreignCurrencyHeader(mode: string): string {
  return `1${"0".repeat(92)}${mode}`;
}

function optionsForLine(editor: FakeEditor, line: number) {
  const call = fieldDecorationCalls(editor).at(-1);
  return (
    call?.options.filter((option) => option.range.start.line === line) ?? []
  );
}

function cursorDecorationCall(editor: FakeEditor) {
  return [...editor.decorationCalls].reverse().find(({ type }) => {
    const options = type.options as {
      backgroundColor?: { id?: string };
    };
    return (
      options.backgroundColor?.id === "editor.wordHighlightStrongBackground"
    );
  });
}

function fieldDecorationCalls(editor: FakeEditor) {
  return editor.decorationCalls.filter(({ type }) => {
    const options = type.options as {
      backgroundColor?: { id?: string } | string;
    };
    return (
      typeof options.backgroundColor !== "object" ||
      options.backgroundColor?.id !== "editor.wordHighlightStrongBackground"
    );
  });
}

function cursorRange(editor: FakeEditor) {
  const range = cursorDecorationCall(editor)?.options[0]?.range;
  return range
    ? {
        start: { line: range.start.line, character: range.start.character },
        end: { line: range.end.line, character: range.end.character },
      }
    : undefined;
}

function renderOptionsForLine(editor: FakeEditor, line: number) {
  return optionsForLine(editor, line).map((option) => option.renderOptions);
}

function rowNames(editor: FakeEditor, line: number): string[] {
  return optionsForLine(editor, line).map((option) => {
    const hover = option.hoverMessage?.value ?? "";
    const match =
      hover.match(/^\*\*(.*?)\*\*/u) ??
      hover.match(/^(.+?) \/ .+ \(項目 \d+\)/u);
    return match?.[1]?.split(" / ", 1)[0] ?? "";
  });
}

function hasRow(editor: FakeEditor, line: number, name: string): boolean {
  return rowNames(editor, line).includes(name);
}

function variableTagIds(
  record: string,
  tagOffset = 16,
  countOffset = 11,
): string[] {
  const count = Number(record.slice(countOffset, countOffset + 2));
  const ids: string[] = [];
  let offset = tagOffset;
  for (let index = 0; index < count; index += 1) {
    const id = record.slice(offset, offset + 3);
    const length = Number(record.slice(offset + 3, offset + 6));
    assert.match(id, /^[A-Z0-9]{3}$/u);
    assert.ok(Number.isInteger(length));
    ids.push(id);
    offset += 6 + length;
  }
  assert.ok(offset <= record.length);
  return ids;
}

const zenginSimpleRows = "ヘッダー|データ|トレーラ|エンド";
const zenginSamples = [
  [
    "50200001.furikomi_nyuukin_tuuchi_a.dat",
    "振込入金通知(A)",
    200,
    zenginSimpleRows,
  ],
  [
    "50200001.furikomi_nyuukin_tuuchi_b.dat",
    "振込入金通知(B)",
    200,
    zenginSimpleRows,
  ],
  [
    "50200003.nyuusyukkin_torihiki_meisai.dat",
    "入出金取引明細",
    200,
    "ヘッダー|データ(普通預金・当座預金・貯蓄預金)|トレーラ|ヘッダー|データ(通知預金・定期預金・積立定期預金)|トレーラ|エンド",
  ],
  [
    "50200004.zanndaka_tuuchi_yokin.dat",
    "残高通知(預金)",
    200,
    zenginSimpleRows,
  ],
  [
    "50200111.kyuuyo_furikomi_minkan.dat",
    "給与振込(民間)",
    120,
    zenginSimpleRows,
  ],
  [
    "50200112.syouyo_furikomi_minkan.dat",
    "賞与振込(民間)",
    120,
    zenginSimpleRows,
  ],
  [
    "50200171.kyuuyo_furikomi_chihoukoumuin.dat",
    "給与振込(地方公務員)",
    120,
    zenginSimpleRows,
  ],
  [
    "50200172.syouyo_furikomi_chihoukoumuin.dat",
    "賞与振込(地方公務員)",
    120,
    zenginSimpleRows,
  ],
  [
    "50200121.sougou_furikomi.dat",
    "総合振込",
    120,
    "ヘッダー|データ|データ(EDI)|トレーラ|エンド",
  ],
  [
    "50200141.kabushiki_haitoukin_furikomi.dat",
    "株式配当金振込",
    120,
    zenginSimpleRows,
  ],
  [
    "50200143.nenkin_shintaku_keiyaku.dat",
    "年金信託契約に係る年金・一時金給付金振込",
    120,
    zenginSimpleRows,
  ],
  [
    "50200144.kouteki_nenkin_hoken.dat",
    "公的年金保険の年金・一時金給付金振込",
    120,
    zenginSimpleRows,
  ],
  [
    "50200145.iryou_hoken_kyufukin_furikomi.dat",
    "医療保険の給付金振込",
    120,
    zenginSimpleRows,
  ],
  [
    "50200198.furikomi_kouza_shokai_irai_meisai.dat",
    "振込口座照会(依頼明細)",
    120,
    zenginSimpleRows,
  ],
  [
    "50200199.furikomi_kouza_shokai_shori_kekka_meisai.dat",
    "振込口座照会(処理結果明細)",
    120,
    zenginSimpleRows,
  ],
  [
    "50200191.yokin_kouza_furikae_irai_meisai.dat",
    "預金口座振替(依頼明細)",
    120,
    zenginSimpleRows,
  ],
  [
    "50200191.yokin_kouza_furikae_shori_kekka_meisai.dat",
    "預金口座振替(処理結果明細)",
    120,
    zenginSimpleRows,
  ],
  [
    "50200193.yokin_kouza_furikae_henkou_tuuchi.dat",
    "預金口座振替変更通知",
    120,
    zenginSimpleRows,
  ],
  [
    "50200211.jyuutaku_loan_kankei_zaikei_loan.dat",
    "住宅ローン関係(財形ローン)",
    550,
    zenginSimpleRows,
  ],
  [
    "50200212.jyuutaku_loan_kankei_sonota.dat",
    "住宅ローン関係(その他)",
    550,
    zenginSimpleRows,
  ],
  [
    "50200300.zaikei_chochiku_kankei_irai_meisai.dat",
    "財形貯蓄関係(依頼明細)",
    300,
    zenginSimpleRows,
  ],
  [
    "50200301.zaikei_chochiku_kankei_shori_kekka_meisai_tumitate_naiyou.dat",
    "財形貯蓄関係(処理結果明細:積立内容)",
    300,
    zenginSimpleRows,
  ],
  [
    "50200302.zaikei_chochiku_kankei_shori_kekka_meisai_rishi_hokyuu.dat",
    "財形貯蓄関係(処理結果明細:利子補給)",
    300,
    zenginSimpleRows,
  ],
  [
    "50200309.zaikei_chochiku_kankei_shori_kekka_meisai_sonota.dat",
    "財形貯蓄関係(処理結果明細:その他) ",
    300,
    zenginSimpleRows,
  ],
  [
    "50200231.kariirekin_keisansho.dat",
    "借入金計算書",
    250,
    "ヘッダー|データ(手形貸付・証書貸付)|データ(商業手形割引〔内訳〕)|データ(商業手形割引〔合計〕)|トレーラ|エンド",
  ],
  [
    "50200232.kariirekin_zaikoumeisai.dat",
    "借入金残高明細 ",
    250,
    "ヘッダー|データ(手形貸付・証書貸付)|データ(商業手形割引)|トレーラ|エンド",
  ],
  [
    "50200233.kariirekin_zandaka_goukei.dat",
    "借入金残高合計",
    250,
    zenginSimpleRows,
  ],
  [
    "50200425.fx_torihiki_meisai_kaikeisei.dat",
    "外国為替取引明細(会計性)",
    250,
    "ヘッダー|データ(本体情報)|データ(輸出手形買取)|データ(輸出手形買取内訳)|データ(利息・手数料)|トレーラ|ヘッダー|データ(本体情報)|データ(輸入手形決済)|データ(輸入手形決済内訳)|トレーラ|ヘッダー|データ(本体情報)|データ(輸出手形取立支払)|データ(輸出手形取立支払内訳)|トレーラ|ヘッダー|データ(本体情報)|データ(仕向送金取組)|データ(仕向送金取組内訳)|トレーラ|ヘッダー|データ(本体情報)|データ(被仕向送金支払)|データ(被仕向送金支払内訳)|トレーラ|ヘッダー|データ(本体情報)|データ(利息・手数料情報（都度請求）)|トレーラ|ヘッダー|データ(利息・手数料一括請求（合計）)|データ(利息・手数料一括請求（内訳）)|トレーラ|ヘッダー|データ(為替予約（先物予約締結）)|トレーラ|ヘッダー|データ(為替予約（先物予約履行）)|トレーラ|ヘッダー|データ(為替予約（先物予約残高明細）)|トレーラ|エンド",
  ],
  [
    "50200426.fx_torihiki_meisai_hikaikeisei.dat",
    "外国為替取引明細(非会計性)",
    250,
    "ヘッダー|データ(輸出信用状到着案内（固定レコード）)|データ(輸出信用状到着案内（可変レコード）)|トレーラ|ヘッダー|データ(輸入船積書類到着案内（固定レコード）)|データ(輸入船積書類到着案内（可変レコード）)|トレーラ|ヘッダー|データ(被仕向送金到着案内（固定レコード）)|データ(被仕向送金到着案内（可変レコード）)|データ(利息・手数料)|トレーラ|ヘッダー|データ(輸出手形経過情報（固定レコード）)|データ(輸出手形経過情報（可変レコード）)|トレーラ|エンド",
  ],
  ["50200427.fx_kanren_jouhou.dat", "外国為替関連情報", 250, zenginSimpleRows],
  [
    "50200435.gaikoku_soukin_irai.dat",
    "外国送金依頼",
    250,
    "ヘッダー|データ(本体情報)|データ(会計処理内訳)|データ(送金指図内訳（可変レコード）)|トレーラ|エンド",
  ],
  [
    "50200428.nigawase_yunyuu_lc_hakkou_irai.dat",
    "荷為替輸入信用状発行依頼",
    250,
    "ヘッダー|データ(本体情報(1))|データ(本体情報(2))|データ(本体情報(3))|データ(取引情報(1))|データ(取引情報(2))|データ(取引情報(3))|データ(取引情報(4))|データ(取引情報(5))|データ(取引情報(6))|データ(取引情報(7))|データ(本体情報(1))|データ(本体情報(2))|データ(本体情報(3))|データ(取引情報(1))|データ(取引情報(2))|データ(内訳情報)|トレーラ|エンド",
  ],
  [
    "50200009.gaika_yokin_nyuushukkin_torihiki_meisai.dat",
    "外貨預金入出金取引明細",
    250,
    "ヘッダー|データ(本体情報(1)：普通預金･当座預金･貯蓄預金の場合)|データ(内訳情報)|トレーラ|ヘッダー|データ(本体情報(2)：通知預金･定期預金･積立定期預金の場合)|データ(内訳情報)|トレーラ|エンド",
  ],
] as const;

suite("固定長表示の現行挙動", () => {
  let host: CharacterizationHost;

  setup(() => {
    host = new CharacterizationHost();
    host.start();
  });

  teardown(() => {
    host.dispose();
  });

  test("組み込みの全銀と JPX の定義、空白行、不一致行、ホバー、UTF-16 範囲を保つ", async () => {
    const zengin = host.createEditor("50200001-a.txt", [
      "1😀",
      "   ",
      "不一致の行",
      "2😀",
      "8",
      "9",
    ]);
    host.setActiveEditor(zengin);
    await host.chooseFileType(zenginAccount);

    const decorationStyle = host.decorationTypes[0].options as {
      isWholeLine: boolean;
    };
    assert.strictEqual(decorationStyle.isWholeLine, false);

    const shortHeader = optionsForLine(zengin, 0);
    assert.strictEqual(shortHeader[1].range.end.character, 3);
    const defaultBoundary = renderOptionsForLine(zengin, 0)[1]?.after as {
      contentText: string;
      backgroundColor: { id: string };
      width: string;
      height: string;
    };
    assert.deepStrictEqual(
      {
        ...defaultBoundary,
        backgroundColor: defaultBoundary.backgroundColor.id,
      },
      {
        contentText: "",
        backgroundColor: "editor.foreground",
        width: "1px",
        height: "1em",
      },
    );
    const partialDataField = optionsForLine(zengin, 3)[1];
    assert.strictEqual(partialDataField.range.end.character, 3);
    assert.strictEqual(partialDataField.renderOptions, undefined);

    assert.strictEqual(host.registeredCommands.has(commandId), true);
    assert.deepStrictEqual(rowNames(zengin, 0).slice(0, 1), ["ヘッダー"]);
    assert.deepStrictEqual(rowNames(zengin, 3).slice(0, 1), ["データ"]);
    assert.deepStrictEqual(rowNames(zengin, 4).slice(0, 1), ["トレーラ"]);
    assert.deepStrictEqual(rowNames(zengin, 5).slice(0, 1), ["エンド"]);
    assert.deepStrictEqual(optionsForLine(zengin, 1), []);
    assert.deepStrictEqual(optionsForLine(zengin, 2), []);

    const dataFields = optionsForLine(zengin, 3);
    assert.deepStrictEqual(
      {
        start: dataFields[1].range.start.character,
        end: dataFields[1].range.end.character,
      },
      { start: 1, end: 3 },
    );
    assert.strictEqual(zengin.document.lineAt(3).text.length, 3);
    assert.strictEqual(dataFields.at(-1)?.range.end.character, 3);

    const jpx = host.createEditor("jpx.txt", ["2Ａ😀"]);
    host.setActiveEditor(jpx);
    await host.chooseFileType(jpxFourPrices);
    assert.strictEqual(hasRow(jpx, 0, "レコード"), true);
    assert.strictEqual(jpx.document.lineAt(0).text.length, 4);
    assert.strictEqual(optionsForLine(jpx, 0)[1].range.end.character, 4);
    assert.strictEqual(
      optionsForLine(jpx, 0)[1].hoverMessage?.value,
      "**レコード / ファイル識別 (項目 2)**  \n位置: 2 - 4 (3桁)\nデータ型: C",
    );
    assert.strictEqual(
      optionsForLine(jpx, 0)[1].hoverMessage?.isTrusted,
      false,
    );
    assert.ok(optionsForLine(jpx, 0)[1].renderOptions?.after);

    const loan = host.createEditor("50200231-loan.txt", ["230"]);
    host.setActiveEditor(loan);
    await host.chooseFileType(zenginLoanCalculation);
    assert.strictEqual(hasRow(loan, 0, "データ(商業手形割引〔内訳〕)"), true);
    assert.strictEqual(hasRow(loan, 0, "データ(商業手形割引〔合計〕)"), false);
  });

  test("全銀33形式のサンプルを公式レコード行へ割り当てる", async function () {
    this.timeout(10000);
    const sampleDirectory = path.resolve(__dirname, "../../sample/zengin");
    const expectedFiles = zenginSamples.map(([fileName]) => fileName).sort();
    assert.strictEqual(zenginSamples.length, 33);
    assert.strictEqual(new Set(expectedFiles).size, 33);
    assert.deepStrictEqual(readdirSync(sampleDirectory).sort(), expectedFiles);

    for (const [
      fileName,
      formatName,
      recordBytes,
      rowSequence,
    ] of zenginSamples) {
      const sampleBytes = readFileSync(path.join(sampleDirectory, fileName));
      assert.strictEqual(sampleBytes.at(-1), 0x0a, fileName);
      assert.strictEqual(sampleBytes.includes(0x0d), false, fileName);
      assert.strictEqual(
        sampleBytes.every((byte) => byte < 0x80),
        true,
        fileName,
      );

      const records = sampleBytes.subarray(0, -1).toString("ascii").split("\n");
      const expectedRows = rowSequence.split("|");
      assert.strictEqual(records.length, expectedRows.length, fileName);
      assert.match(fileName.slice(0, 8), /^\d{8}$/u);
      for (const record of records) {
        assert.strictEqual(record.length, recordBytes, fileName);
      }

      const editor = host.createEditor(fileName, records);
      host.setActiveEditor(editor);
      await host.chooseFileType(`全銀協規定形式/${formatName}`);
      await host.waitForPendingRender();
      for (const [line, expectedRow] of expectedRows.entries()) {
        const fieldRows = rowNames(editor, line);
        assert.ok(
          fieldRows.length > 0,
          `${fileName}:${line + 1} has no fields`,
        );
        assert.deepStrictEqual(
          [...new Set(fieldRows)],
          [expectedRow],
          `${fileName}:${line + 1}`,
        );
      }
    }

    const generalTransfer = readFileSync(
      path.join(sampleDirectory, "50200121.sougou_furikomi.dat"),
      "ascii",
    ).split("\n");
    assert.strictEqual(generalTransfer[1]?.[112], " ");
    assert.strictEqual(generalTransfer[1]?.[113], " ");
    assert.strictEqual(generalTransfer[2]?.[112], "Y");
    assert.strictEqual(generalTransfer[2]?.[113], " ");

    const loan = readFileSync(
      path.join(sampleDirectory, "50200231.kariirekin_keisansho.dat"),
      "ascii",
    ).split("\n");
    assert.strictEqual(loan[2]?.slice(0, 3), "230");
    assert.strictEqual(loan[3]?.slice(0, 3), "231");

    const letterOfCredit = readFileSync(
      path.join(sampleDirectory, "50200428.nigawase_yunyuu_lc_hakkou_irai.dat"),
      "ascii",
    ).split("\n");
    assert.strictEqual(letterOfCredit[1]?.slice(7, 9), "01");
    assert.strictEqual(letterOfCredit[11]?.slice(7, 9), "02");

    const assertOfficialBytes = (
      record: string,
      position: readonly [number, number],
      expected: string,
    ) => {
      const [start, end] = position;
      assert.strictEqual(
        record.slice(start - 1, end),
        expected,
        `Official bytes ${start}-${end}`,
      );
    };

    const assertKindCode = (
      fileName: string,
      kindCode: string,
      specification: string,
    ) => {
      const header =
        readFileSync(path.join(sampleDirectory, fileName), "ascii").split(
          "\n",
        )[0] ?? "";
      assert.strictEqual(
        header.slice(1, kindCode.length + 1),
        kindCode,
        `${specification} kind code`,
      );
    };

    assertKindCode(
      "50200112.syouyo_furikomi_minkan.dat",
      "12",
      "AP-I-13 §5 p31",
    );
    assertKindCode(
      "50200171.kyuuyo_furikomi_chihoukoumuin.dat",
      "71",
      "AP-I-13 §6 p32",
    );
    assertKindCode(
      "50200172.syouyo_furikomi_chihoukoumuin.dat",
      "72",
      "AP-I-13 §7 p33",
    );
    assertKindCode(
      "50200143.nenkin_shintaku_keiyaku.dat",
      "43",
      "AP-I-13 §10 p38",
    );
    assertKindCode(
      "50200144.kouteki_nenkin_hoken.dat",
      "44",
      "AP-I-13 §11 p39",
    );
    assertKindCode(
      "50200145.iryou_hoken_kyufukin_furikomi.dat",
      "45",
      "AP-I-13 §12 p40",
    );
    assertKindCode(
      "50200199.furikomi_kouza_shokai_shori_kekka_meisai.dat",
      "99",
      "AP-I-13 §14 p43",
    );
    assertKindCode(
      "50200191.yokin_kouza_furikae_shori_kekka_meisai.dat",
      "91",
      "AP-I-13 §15 p44",
    );
    assertKindCode(
      "50200212.jyuutaku_loan_kankei_sonota.dat",
      "12",
      "AP-I-13 §19 p55",
    );
    assertKindCode(
      "50200302.zaikei_chochiku_kankei_shori_kekka_meisai_rishi_hokyuu.dat",
      "2",
      "AP-I-13 §22 p64",
    );
    assertKindCode(
      "50200309.zaikei_chochiku_kankei_shori_kekka_meisai_sonota.dat",
      "9",
      "AP-I-13 §23 p65",
    );

    // AP-I-13 §31 p151 の発行ヘッダーは発行依頼時の信用状番号・発行日を空白とし、
    // 通知銀行を指定しない場合は銀行情報も空白にする。
    const issueHeader = letterOfCredit[1] ?? "";
    assertOfficialBytes(issueHeader, [10, 25], " ".repeat(16));
    assertOfficialBytes(issueHeader, [26, 33], " ".repeat(8));
    assertOfficialBytes(issueHeader, [69, 69], "1");
    assertOfficialBytes(issueHeader, [70, 209], " ".repeat(140));

    const issueTrade1 = letterOfCredit[4] ?? "";
    // AP-I-13 §31 p153 のTENORコード。
    assertOfficialBytes(issueTrade1, [75, 75], "1");
    assertOfficialBytes(issueTrade1, [76, 76], "1");
    assertOfficialBytes(issueTrade1, [102, 102], "1");
    // AP-I-13 §31 p154 の掛率・決済条件・譲渡条件。
    assertOfficialBytes(issueTrade1, [138, 140], "100");
    assertOfficialBytes(issueTrade1, [211, 211], "1");
    assertOfficialBytes(issueTrade1, [212, 212], "1");
    assertOfficialBytes(issueTrade1, [213, 213], "1");
    assertOfficialBytes(issueTrade1, [214, 248], " ".repeat(35));

    const issueTrade2 = letterOfCredit[5] ?? "";
    // AP-I-13 §31 p155 の信用状期限と船積期限。
    assertOfficialBytes(issueTrade2, [9, 16], "20261231");
    assertOfficialBytes(issueTrade2, [46, 53], " ".repeat(8));
    assertOfficialBytes(issueTrade2, [63, 70], "20261215");
    assertOfficialBytes(issueTrade2, [71, 78], " ".repeat(8));

    const invoiceAndInsurance = letterOfCredit[6] ?? "";
    // AP-I-13 §31 p156 のINVOICE通数、保険証券通数、保険料率既定値。
    assertOfficialBytes(invoiceAndInsurance, [8, 9], "01");
    assertOfficialBytes(invoiceAndInsurance, [81, 82], "01");
    assertOfficialBytes(invoiceAndInsurance, [83, 85], "110");

    const issueTrade6 = letterOfCredit[9] ?? "";
    // AP-I-13 §31 p160 の建値・付保条件。
    assertOfficialBytes(issueTrade6, [128, 128], "1");
    assertOfficialBytes(issueTrade6, [129, 138], " ".repeat(10));
    assertOfficialBytes(
      issueTrade6,
      [139, 168],
      "TOKYO                         ",
    );
    assertOfficialBytes(issueTrade6, [169, 169], "2");
    assertOfficialBytes(issueTrade6, [170, 219], " ".repeat(50));

    const changeHeader = letterOfCredit[11] ?? "";
    // AP-I-13 §31 p151 の変更依頼は既存の信用状番号・発行日を指定する。
    assertOfficialBytes(changeHeader, [10, 25], "LC000001        ");
    assertOfficialBytes(changeHeader, [26, 33], "20261101");
    assertOfficialBytes(changeHeader, [69, 69], "1");
    assertOfficialBytes(changeHeader, [70, 209], " ".repeat(140));

    const changeTrade1 = letterOfCredit[14] ?? "";
    // AP-I-13 §31 p163 では変更依頼用の取引情報(1)は空白指定。
    assertOfficialBytes(changeTrade1, [75, 248], " ".repeat(174));

    const changeTrade2 = letterOfCredit[15] ?? "";
    // AP-I-13 §31 p164 の期限、船積場所、到着場所。
    assertOfficialBytes(changeTrade2, [9, 16], "20261231");
    assertOfficialBytes(changeTrade2, [46, 53], " ".repeat(8));
    assertOfficialBytes(changeTrade2, [83, 147], " ".repeat(65));
    assertOfficialBytes(changeTrade2, [148, 212], " ".repeat(65));

    const fxNonAccounting = readFileSync(
      path.join(sampleDirectory, "50200426.fx_torihiki_meisai_hikaikeisei.dat"),
      "ascii",
    ).split("\n");
    // AP-I-13 §28 pp.125, 128, 130, 133 の非会計FXタグID。
    assert.deepStrictEqual(variableTagIds(fxNonAccounting[2] ?? ""), [
      "APT",
      "MCD",
      "MCT",
      "PTO",
    ]);
    assert.deepStrictEqual(variableTagIds(fxNonAccounting[6] ?? ""), [
      "DLC",
      "BRW",
      "MCD",
      "ORG",
      "DFT",
      "INV",
      "BLD",
      "IPC",
    ]);
    assert.deepStrictEqual(variableTagIds(fxNonAccounting[10] ?? ""), [
      "RBN",
      "BSN",
    ]);
    assert.deepStrictEqual(variableTagIds(fxNonAccounting[15] ?? ""), ["PCN"]);

    const foreignRemittance = readFileSync(
      path.join(sampleDirectory, "50200435.gaikoku_soukin_irai.dat"),
      "ascii",
    ).split("\n");
    // AP-I-13 §30 p145 の外国送金タグとp144のSPOT条件・引落口座。
    assert.deepStrictEqual(variableTagIds(foreignRemittance[3] ?? ""), [
      "BNN",
      "BNA",
      "BAN",
      "BAB",
    ]);

    const lcDetail = letterOfCredit[16] ?? "";
    // AP-I-13 §31 p165 の信用状内訳タグID。
    assert.deepStrictEqual(variableTagIds(lcDetail, 12, 7), ["CVN", "ADC"]);

    const fxAccounting = readFileSync(
      path.join(sampleDirectory, "50200425.fx_torihiki_meisai_kaikeisei.dat"),
      "ascii",
    ).split("\n");
    // AP-I-13 §27 pp112, 114, 117–118 の差引表示・予約相場通貨。
    assertOfficialBytes(fxAccounting[31] ?? "", [72, 72], "1");
    assertOfficialBytes(fxAccounting[35] ?? "", [138, 138], "1");
    assertOfficialBytes(fxAccounting[38] ?? "", [125, 125], "1");
    assertOfficialBytes(fxAccounting[41] ?? "", [138, 138], "1");
    // AP-I-13 §27 p83 の為替予約残高明細は勘定日を空白にする。
    assertOfficialBytes(fxAccounting[40] ?? "", [5, 7], "530");
    assertOfficialBytes(fxAccounting[40] ?? "", [26, 41], " ".repeat(16));
    for (const group of ["510", "520"]) {
      const header =
        fxAccounting.find(
          (record) => record[0] === "1" && record.slice(4, 7) === group,
        ) ?? "";
      assertOfficialBytes(header, [26, 41], "20261101".repeat(2));
    }

    // AP-I-13 §30 p144 のSPOT区分と引落口座条件。
    assertOfficialBytes(foreignRemittance[2] ?? "", [10, 11], "01");
    assertOfficialBytes(foreignRemittance[2] ?? "", [66, 68], "JPY");
    assertOfficialBytes(foreignRemittance[2] ?? "", [69, 69], "1");
  });

  test("旧columns JSONをローダーへ注入し、旧ホバーとUTF-16範囲を保つ", async () => {
    const legacyHost = new CharacterizationHost({
      jpx: {
        type: "legacy_fixture",
        name: "旧形式",
        files: [
          {
            file_type: "columns_compatibility",
            name: "旧columns",
            finame_pattern: "columns-fixture",
            rows: [
              {
                name: "旧行",
                condition: "^A",
                columns: [3, 3],
              },
            ],
          },
        ],
      },
    });
    legacyHost.start();
    try {
      const editor = legacyHost.createEditor("columns-fixture.txt", ["A😀BC"]);
      legacyHost.setActiveEditor(editor);
      await legacyHost.chooseFileType("旧形式/旧columns");

      const fields = optionsForLine(editor, 0);
      assert.strictEqual(editor.document.lineAt(0).text.length, 5);
      assert.strictEqual(fields.length, 2);
      assert.deepStrictEqual(
        fields.map((field) => ({
          start: field.range.start.character,
          end: field.range.end.character,
        })),
        [
          { start: 0, end: 3 },
          { start: 3, end: 5 },
        ],
      );
      assert.strictEqual(
        fields[0].hoverMessage?.value,
        "**旧行**  \n位置: 1 - 3 (3桁)",
      );
      assert.strictEqual(
        fields[1].hoverMessage?.value,
        "**旧行**  \n位置: 4 - 6 (3桁)",
      );
      assert.strictEqual(fields[0].hoverMessage?.isTrusted, true);
      assert.deepStrictEqual(rowNames(editor, 0), ["旧行", "旧行"]);
    } finally {
      legacyHost.dispose();
    }
  });

  test("JPX サンプルの全項目を表示し、カーソル強調の範囲と寿命を保つ", async () => {
    const samplePath = path.resolve(__dirname, "../../sample/jpx/SH_DER.csv");
    const sampleBytes = readFileSync(samplePath);
    assert.strictEqual(sampleBytes.length, 658);
    assert.strictEqual(sampleBytes.subarray(0, 4).toString("ascii"), "2001");
    assert.strictEqual(sampleBytes.at(-1), 0x0a);
    assert.strictEqual(sampleBytes.includes(0x0d), false);
    assert.strictEqual(
      sampleBytes.subarray(0, -1).every((byte) => byte < 0x80),
      true,
    );

    const record = sampleBytes.subarray(0, -1).toString("ascii");
    assert.strictEqual(record.length, 657);
    assert.strictEqual(record.slice(0, 1), "2");
    assert.strictEqual(record.slice(1, 4), "001");
    assert.strictEqual(record.slice(4, 6), "01");
    assert.strictEqual(record.slice(6, 12), "      ");
    assert.strictEqual(record.slice(12, 15), "F2 ");
    assert.strictEqual(record.slice(15, 27), "161120018   ");
    assert.strictEqual(record.slice(27, 28), "+");
    assert.strictEqual(record.slice(28, 46), "000000000100000000");
    assert.strictEqual(record.slice(492, 500), "20261110");
    assert.strictEqual(record.slice(500, 520), " ".repeat(20));
    assert.strictEqual(record.slice(520, 538), "0".repeat(18));
    assert.strictEqual(record.slice(538, 539), " ");
    assert.strictEqual(record.slice(539, 557), "0".repeat(18));
    assert.strictEqual(record.slice(557, 560), "IDX");
    assert.strictEqual(record.slice(560, 566), "NK225 ");
    assert.strictEqual(record.slice(566, 576), "NK225F    ");
    assert.strictEqual(record.slice(576, 579), "A2 ");
    assert.strictEqual(record.slice(579, 587), "20261200");
    assert.strictEqual(record.slice(587, 588), " ");
    assert.strictEqual(record.slice(588, 591), "FUT");
    assert.strictEqual(record.slice(591, 609), "0".repeat(18));
    assert.strictEqual(record.slice(609), " ".repeat(48));
    assert.strictEqual(jpxNoTradeDateTimeFields.length, 24);
    for (const { start, end } of jpxNoTradeDateTimeFields) {
      const width = end - start + 1;
      assert.strictEqual(record.slice(start - 1, end), "0".repeat(width));
    }
    const primary = host.createEditor("SH_DER.csv", [record]);
    host.setActiveEditor(primary);
    await host.chooseFileType(jpxFourPrices);
    const eventsBeforeCursorMoves = host.reporters[0].events.length;
    assert.strictEqual(primary.document.getText(), record);

    const initialFields = optionsForLine(primary, 0);
    assert.strictEqual(initialFields.length, 83);
    assert.deepStrictEqual(
      initialFields.map(
        (field) =>
          field.hoverMessage?.value.match(
            /^\*\*レコード \/ (.+) \(項目 /u,
          )?.[1],
      ),
      jpxFourPricesFieldNames,
    );
    let fieldStart = 0;
    for (const [index, field] of initialFields.entries()) {
      assert.strictEqual(
        field.hoverMessage?.value.endsWith("\nデータ型: C"),
        true,
      );
      assert.deepStrictEqual(
        {
          start: field.range.start.character,
          end: field.range.end.character,
        },
        {
          start: fieldStart,
          end: fieldStart + jpxFourPricesFieldWidths[index],
        },
      );
      fieldStart += jpxFourPricesFieldWidths[index];
    }
    assert.strictEqual(fieldStart, 657);
    for (const { fieldNumber, start, end } of jpxNoTradeDateTimeFields) {
      assert.deepStrictEqual(
        {
          start: initialFields[fieldNumber - 1].range.start.character + 1,
          end: initialFields[fieldNumber - 1].range.end.character,
        },
        { start, end },
      );
    }
    assert.strictEqual(
      initialFields[0].hoverMessage?.value,
      "**レコード / レコード区分 (項目 1)**  \n位置: 1 - 1 (1桁)\nデータ型: C",
    );
    assert.strictEqual(
      initialFields.at(-1)?.hoverMessage?.value,
      "**レコード / 予備 (項目 83)**  \n位置: 610 - 657 (48桁)\nデータ型: C",
    );

    const split = host.createEditor(
      "SH_DER.csv",
      [],
      primary.document.uri.toString(),
    );
    host.setVisibleEditors([primary, split]);
    const primaryCursorType = cursorDecorationCall(primary)?.type;
    const splitCursorType = cursorDecorationCall(split)?.type;
    assert.notStrictEqual(primaryCursorType, splitCursorType);
    assert.deepStrictEqual(cursorRange(primary), {
      start: { line: 0, character: 0 },
      end: { line: 0, character: 1 },
    });
    assert.deepStrictEqual(cursorRange(split), {
      start: { line: 0, character: 0 },
      end: { line: 0, character: 1 },
    });

    const lineAtCallsBeforeMove = primary.document.lineAtCallCount;
    host.setSelection(primary, 0, 1);
    assert.strictEqual(
      primary.document.lineAtCallCount,
      lineAtCallsBeforeMove + 1,
    );
    assert.deepStrictEqual(cursorRange(primary), {
      start: { line: 0, character: 1 },
      end: { line: 0, character: 4 },
    });
    assert.deepStrictEqual(cursorRange(split), {
      start: { line: 0, character: 0 },
      end: { line: 0, character: 1 },
    });
    host.setSelection(primary, 0, 657);
    assert.deepStrictEqual(cursorDecorationCall(primary)?.options, []);
    assert.strictEqual(
      host.reporters[0].events.length,
      eventsBeforeCursorMoves,
    );
    assert.strictEqual(primary.document.getText(), record);

    host.setSelection(primary, 0, 1);
    host.changeDocument(primary, ["2A", "   ", "x"]);
    await host.waitForPendingRender();
    assert.strictEqual(primary.document.getText(), "2A\n   \nx");
    assert.deepStrictEqual(cursorRange(primary), {
      start: { line: 0, character: 1 },
      end: { line: 0, character: 2 },
    });
    host.setSelection(primary, 0, 2);
    assert.deepStrictEqual(cursorDecorationCall(primary)?.options, []);
    host.setSelection(primary, 1, 0);
    assert.deepStrictEqual(cursorDecorationCall(primary)?.options, []);
    host.setSelection(primary, 2, 0);
    assert.deepStrictEqual(cursorDecorationCall(primary)?.options, []);

    host.setActiveEditor(primary);
    const previousCursorType = cursorDecorationCall(primary)?.type;
    await host.chooseFileType(zenginAccount);
    assert.strictEqual(previousCursorType?.disposeCount, 1);
    await host.chooseFileType(jpxFourPrices);
    const changedFormatCursorType = cursorDecorationCall(primary)?.type;
    await host.chooseFileType(clearType);
    assert.strictEqual(changedFormatCursorType?.disposeCount, 1);
    assert.strictEqual(primaryCursorType?.disposeCount, 1);
    assert.strictEqual(splitCursorType?.disposeCount, 1);

    await host.chooseFileType(jpxFourPrices);
    const hiddenCursorType = cursorDecorationCall(primary)?.type;
    host.setVisibleEditors([]);
    assert.strictEqual(hiddenCursorType?.disposeCount, 1);
    assert.deepStrictEqual(cursorDecorationCall(primary)?.options, []);

    host.setVisibleEditors([primary]);
    const disposedCursorType = cursorDecorationCall(primary)?.type;
    host.dispose();
    assert.strictEqual(disposedCursorType?.disposeCount, 1);
  });

  test("境界線、交互色、区切り記号の色と太さを切り替える", async () => {
    const uri = "file:///boundary-style.txt";
    const editor = host.createEditor(
      "50200003-boundary-style.txt",
      [header("1"), `2${"x".repeat(180)}`],
      uri,
    );
    host.setActiveEditor(editor);
    await host.chooseFileType(zenginTransfer);

    const reporter = host.reporters[0];
    const eventCount = reporter.events.length;
    const headerFields = optionsForLine(editor, 0);
    const fields = optionsForLine(editor, 1);
    assert.ok(fields.length > 2);
    const defaultLine = fields[0].renderOptions?.after as {
      width: string;
      backgroundColor: { id: string };
    };
    assert.deepStrictEqual(
      {
        ...defaultLine,
        backgroundColor: defaultLine.backgroundColor.id,
      },
      {
        contentText: "",
        backgroundColor: "editor.foreground",
        width: "1px",
        height: "1em",
      },
    );

    host.setConfiguration(uri, {
      boundaryStyle: "marker",
      boundaryColor: "invalid",
      boundaryWidth: 7,
    });
    const marked = optionsForLine(editor, 1);
    const marker = marked[0].renderOptions?.after as {
      contentText: string;
      color: { id: string };
    };
    assert.deepStrictEqual(
      { contentText: marker.contentText, color: marker.color.id },
      { contentText: "│", color: "editor.foreground" },
    );
    assert.strictEqual(marked.at(-1)?.renderOptions, undefined);

    host.setConfiguration(uri, {
      boundaryStyle: "line",
      boundaryColor: "#1a2b3c",
      boundaryWidth: 4,
    });
    const customLine = optionsForLine(editor, 1)[0].renderOptions?.after as {
      width: string;
      backgroundColor: string;
    };
    assert.deepStrictEqual(customLine, {
      contentText: "",
      backgroundColor: "#1a2b3c",
      width: "4px",
      height: "1em",
    });

    host.setConfiguration(uri, {
      boundaryStyle: "alternating",
      boundaryColor: "#1a2b3c",
      boundaryWidth: 4,
    });
    const backgroundType = host.decorationTypes.find((type) => {
      const options = type.options as { backgroundColor?: string };
      return options.backgroundColor === "#1a2b3c40";
    });
    assert.ok(backgroundType);
    const alternating = fieldDecorationCalls(editor).at(-1);
    assert.strictEqual(alternating?.type, backgroundType);
    assert.strictEqual(
      alternating?.options.length,
      Math.floor(headerFields.length / 2) + Math.floor(fields.length / 2),
    );
    assert.ok(
      alternating?.options.every((option) => option.hoverMessage === undefined),
    );
    assert.strictEqual(reporter.events.length, eventCount);
  });

  test("各文書の設定範囲を保ち、色と太さの不正値を既定に戻す", async () => {
    const firstUri = "file:///one/fixed.txt";
    const secondUri = "file:///two/fixed.txt";
    const lines = [header("1"), `2${"x".repeat(210)}`];
    const first = host.createEditor("50200003-one-fixed.txt", lines, firstUri);
    const firstSplit = host.createEditor(
      "50200003-one-fixed.txt",
      lines,
      firstUri,
    );
    const second = host.createEditor(
      "50200003-two-fixed.txt",
      lines,
      secondUri,
    );

    host.setActiveEditor(first);
    host.setConfiguration(firstUri, {
      boundaryStyle: "unknown",
      boundaryColor: "#12345g",
      boundaryWidth: 1.5,
    });
    await host.chooseFileType(zenginTransfer);
    const firstDefaultLine = optionsForLine(first, 1)[0].renderOptions
      ?.after as {
      width: string;
      backgroundColor: { id: string };
    };
    assert.deepStrictEqual(
      {
        ...firstDefaultLine,
        backgroundColor: firstDefaultLine.backgroundColor.id,
      },
      {
        contentText: "",
        backgroundColor: "editor.foreground",
        width: "1px",
        height: "1em",
      },
    );

    host.setActiveEditor(second);
    await host.chooseFileType(zenginTransfer);
    const firstLineCallsWhileHidden = first.document.lineAtCallCount;
    const secondLineCallsBeforeConfiguration = second.document.lineAtCallCount;
    const firstCallsBeforeConfiguration = fieldDecorationCalls(first).length;
    const firstCallsWhileHidden = fieldDecorationCalls(first).length;
    const secondCallsBeforeConfiguration = fieldDecorationCalls(second).length;

    host.setConfiguration(firstUri, {
      boundaryStyle: "alternating",
      boundaryColor: "#abcdef",
      boundaryWidth: 2,
    });
    assert.strictEqual(
      fieldDecorationCalls(first).length,
      firstCallsWhileHidden,
    );
    assert.strictEqual(
      fieldDecorationCalls(second).length,
      secondCallsBeforeConfiguration,
    );
    assert.strictEqual(
      first.document.lineAtCallCount,
      firstLineCallsWhileHidden,
    );
    assert.strictEqual(
      second.document.lineAtCallCount,
      secondLineCallsBeforeConfiguration,
    );
    assert.strictEqual(fieldDecorationCalls(firstSplit).length, 0);

    const firstLineCallsBeforeVisible = first.document.lineAtCallCount;
    const secondLineCallsBeforeVisible = second.document.lineAtCallCount;
    host.setVisibleEditors([first, firstSplit, second]);
    const firstType = fieldDecorationCalls(first).at(-1)?.type;
    const secondType = fieldDecorationCalls(second).at(-1)?.type;
    const firstSplitType = fieldDecorationCalls(firstSplit).at(-1)?.type;
    assert.strictEqual(
      fieldDecorationCalls(first).length,
      firstCallsBeforeConfiguration + 2,
    );
    assert.strictEqual(
      fieldDecorationCalls(second).length,
      secondCallsBeforeConfiguration,
    );
    assert.strictEqual(
      first.document.lineAtCallCount,
      firstLineCallsBeforeVisible + first.document.lineCount + 2,
    );
    assert.strictEqual(
      second.document.lineAtCallCount,
      secondLineCallsBeforeVisible,
    );
    const secondLine = optionsForLine(second, 1)[0].renderOptions?.after as {
      width: string;
      backgroundColor: { id: string };
    };
    assert.strictEqual(secondLine.backgroundColor.id, "editor.foreground");

    const firstBackground = fieldDecorationCalls(first).at(-1);
    const splitBackground = fieldDecorationCalls(firstSplit).at(-1);
    const firstBackgroundType = firstBackground?.type;
    const splitBackgroundType = splitBackground?.type;
    assert.deepStrictEqual(
      (firstBackground?.type.options as { backgroundColor: string })
        .backgroundColor,
      "#abcdef40",
    );
    assert.deepStrictEqual(
      (splitBackground?.type.options as { backgroundColor: string })
        .backgroundColor,
      "#abcdef40",
    );
    assert.strictEqual(fieldDecorationCalls(second).at(-1)?.type, secondType);
    assert.strictEqual(
      (
        optionsForLine(second, 1)[0].renderOptions?.after as {
          backgroundColor: { id: string };
        }
      ).backgroundColor.id,
      "editor.foreground",
    );

    const firstCallsBeforeVisibleConfiguration =
      fieldDecorationCalls(first).length;
    const secondCallsBeforeVisibleConfiguration =
      fieldDecorationCalls(second).length;
    const firstLineCallsBeforeVisibleConfiguration =
      first.document.lineAtCallCount;
    const secondLineCallsBeforeVisibleConfiguration =
      second.document.lineAtCallCount;
    host.setConfiguration(firstUri, {
      boundaryStyle: "marker",
      boundaryColor: "#abcdef",
      boundaryWidth: 2,
    });
    assert.strictEqual(
      fieldDecorationCalls(first).length,
      firstCallsBeforeVisibleConfiguration + 2,
    );
    assert.strictEqual(
      fieldDecorationCalls(second).length,
      secondCallsBeforeVisibleConfiguration,
    );
    assert.strictEqual(
      first.document.lineAtCallCount,
      firstLineCallsBeforeVisibleConfiguration + first.document.lineCount + 2,
    );
    assert.strictEqual(
      second.document.lineAtCallCount,
      secondLineCallsBeforeVisibleConfiguration,
    );
    assert.strictEqual(firstBackgroundType?.disposeCount, 1);
    assert.strictEqual(splitBackgroundType?.disposeCount, 1);
    const firstMarkerCall = [...fieldDecorationCalls(first)]
      .reverse()
      .find((call) =>
        call.options.some(
          (option) =>
            (
              option.renderOptions?.after as
                | { contentText?: string }
                | undefined
            )?.contentText === "│",
        ),
      );
    const splitMarkerCall = [...fieldDecorationCalls(firstSplit)]
      .reverse()
      .find((call) =>
        call.options.some(
          (option) =>
            (
              option.renderOptions?.after as
                | { contentText?: string }
                | undefined
            )?.contentText === "│",
        ),
      );
    assert.ok(firstMarkerCall);
    assert.ok(splitMarkerCall);
    assert.strictEqual(fieldDecorationCalls(second).at(-1)?.type, secondType);

    host.dispose();
    assert.strictEqual(firstBackgroundType?.disposeCount, 1);
    assert.strictEqual(splitBackgroundType?.disposeCount, 1);
  });

  test("1回の解析ではモードを引き継ぎ、別文書では先頭から解析する", async () => {
    const normal = `2${"x".repeat(111)} Y`;
    const edi = `2${"x".repeat(111)}Y `;
    const general = host.createEditor("50200121-general.txt", [normal, edi]);
    host.setActiveEditor(general);
    await host.chooseFileType(zenginGeneralTransfer);
    assert.strictEqual(hasRow(general, 0, "データ"), true);
    assert.strictEqual(hasRow(general, 0, "データ(EDI)"), false);
    assert.strictEqual(hasRow(general, 1, "データ(EDI)"), true);
    assert.strictEqual(hasRow(general, 1, "データ"), false);

    const first = host.createEditor("50200003-first.txt", [header("5"), "2"]);
    host.setActiveEditor(first);
    await host.chooseFileType(zenginTransfer);
    const firstType = fieldDecorationCalls(first).at(-1)?.type;
    assert.strictEqual(
      hasRow(first, 1, "データ(通知預金・定期預金・積立定期預金)"),
      true,
    );

    const sameType = host.createEditor("50200003-second.txt", ["2"]);
    host.setActiveEditor(sameType);
    await host.chooseFileType(zenginTransfer);
    assert.deepStrictEqual(optionsForLine(sameType, 0), []);
    const sameTypeHandleBeforeForeign =
      fieldDecorationCalls(sameType).at(-1)?.type;

    const otherType = host.createEditor("50200009-foreign.txt", [
      foreignCurrencyHeader("1"),
      "201",
    ]);
    host.setActiveEditor(otherType);
    await host.chooseFileType(zenginForeignCurrency);
    assert.strictEqual(
      hasRow(
        otherType,
        1,
        "データ(本体情報(1)：普通預金･当座預金･貯蓄預金の場合)",
      ),
      true,
    );
    const beforeSwitch = host.reporters[0].events.length;
    host.setActiveEditor(sameType);
    assert.deepStrictEqual(optionsForLine(sameType, 0), []);
    const sameTypeHeadHandle = fieldDecorationCalls(sameType).at(-1)?.type;
    assert.strictEqual(sameTypeHandleBeforeForeign?.disposeCount, 1);
    assert.strictEqual(host.reporters[0].events.length, beforeSwitch);

    host.setActiveEditor(first);
    assert.strictEqual(sameTypeHeadHandle?.disposeCount, 1);
    assert.strictEqual(firstType?.disposeCount, 1);
    assert.strictEqual(fieldDecorationCalls(first).length, 3);
    assert.strictEqual(
      hasRow(first, 1, "データ(通知預金・定期預金・積立定期預金)"),
      true,
    );
    assert.strictEqual(host.reporters[0].events.length, beforeSwitch);

    const badHeader = `1${"0".repeat(61)}X`;
    const reset = host.createEditor("50200003-reset.txt", [badHeader, "2"]);
    host.setActiveEditor(reset);
    await host.chooseFileType(zenginTransfer);
    assert.strictEqual(hasRow(reset, 0, "ヘッダー"), true);
    assert.deepStrictEqual(optionsForLine(reset, 1), []);

    const update = host.createEditor("50200003-updated.txt", [
      header("1"),
      "2",
    ]);
    host.setActiveEditor(update);
    await host.chooseFileType(zenginTransfer);
    assert.strictEqual(
      hasRow(update, 1, "データ(普通預金・当座預金・貯蓄預金)"),
      true,
    );
  });

  test("エディターがない選択、キャンセル、テレメトリの順序と安全な値を保つ", async () => {
    await host.chooseFileType(zenginAccount);
    const reporter = host.reporters[0];
    assert.strictEqual(reporter.connectionString, "sdd-characterization-dummy");
    assert.deepStrictEqual(
      reporter.events.map((event) => event.name),
      ["ext.activate", "ext.decorate"],
    );
    assert.deepStrictEqual(reporter.events[0].properties, {
      development: "false",
    });
    assert.deepStrictEqual(reporter.events[1].properties, {
      file_type: "furikomi_nyuukin_tuuchi_a@zengin",
      development: "false",
    });
    assert.strictEqual(host.decorationTypes.length, 0);

    const editor = host.createEditor("50200001.txt", ["2"]);
    host.setActiveEditor(editor);
    await host.chooseFileType(zenginAccount);
    const originalType = fieldDecorationCalls(editor).at(-1)?.type;
    const callCount = fieldDecorationCalls(editor).length;
    const eventsBeforeCancel = reporter.events.length;
    await host.chooseFileType(undefined);
    assert.strictEqual(fieldDecorationCalls(editor).length, callCount);
    assert.strictEqual(originalType?.disposeCount, 0);
    assert.strictEqual(reporter.events.length, eventsBeforeCancel + 1);
    assert.deepStrictEqual(reporter.events.at(-1), {
      name: "ext.decorate",
      properties: { file_type: "", development: "false" },
    });

    const replacementEditor = host.createEditor("50200001.txt", ["2"]);
    const eventsBeforeSwitch = reporter.events.length;
    host.setActiveEditor(replacementEditor);
    assert.strictEqual(originalType?.disposeCount, 1);
    assert.strictEqual(fieldDecorationCalls(replacementEditor).length, 1);
    assert.strictEqual(reporter.events.length, eventsBeforeSwitch);
  });

  test("編集をまとめて再解析し、編集後のヘッダーと最新内容に追随する", async () => {
    const editor = host.createEditor("50200003-edited.txt", [header("5"), "2"]);
    host.setActiveEditor(editor);
    await host.chooseFileType(zenginTransfer);
    assert.strictEqual(
      hasRow(editor, 1, "データ(通知預金・定期預金・積立定期預金)"),
      true,
    );

    const originalType = fieldDecorationCalls(editor).at(-1)?.type;
    const callsBeforeEdit = fieldDecorationCalls(editor).length;
    host.changeDocument(editor, [header("1"), "2"]);
    host.changeDocument(editor, [header("5"), "2"]);
    host.changeDocument(editor, [header("1"), "2"]);
    host.sendEmptyDocumentChange(editor);
    await host.waitForPendingRender();

    assert.strictEqual(
      fieldDecorationCalls(editor).length,
      callsBeforeEdit + 1,
    );
    assert.strictEqual(
      hasRow(editor, 1, "データ(普通預金・当座預金・貯蓄預金)"),
      true,
    );
    assert.strictEqual(
      hasRow(editor, 1, "データ(通知預金・定期預金・積立定期預金)"),
      false,
    );
    assert.strictEqual(fieldDecorationCalls(editor).at(-1)?.type, originalType);
    assert.strictEqual(originalType?.disposeCount, 0);

    host.changeDocument(editor, [header("5"), "2"]);
    await host.waitForPendingRender();
    assert.strictEqual(
      hasRow(editor, 1, "データ(通知預金・定期預金・積立定期預金)"),
      true,
    );
    host.changeDocument(editor, [header("1"), "2"]);
    await host.waitForPendingRender();
    assert.strictEqual(
      hasRow(editor, 1, "データ(普通預金・当座預金・貯蓄預金)"),
      true,
    );

    const unselected = host.createEditor("unselected.txt", ["2"]);
    host.setActiveEditor(unselected);
    host.changeDocument(unselected, [header("5"), "2"]);
    await host.waitForPendingRender();
    assert.strictEqual(fieldDecorationCalls(unselected).length, 0);
  });

  test("1000行を10回編集しても、最後の通知から一度だけ描画する", async () => {
    const uri = "file:///large/50200003.txt";
    const primary = host.createEditor("50200003.txt", [header("1"), "2"], uri);
    host.setActiveEditor(primary);
    await host.chooseFileType(zenginTransfer);
    const split = host.createEditor("50200003.txt", [], uri);
    host.setVisibleEditors([primary, split]);

    const primaryCallsBefore = fieldDecorationCalls(primary).length;
    const splitCallsBefore = fieldDecorationCalls(split).length;
    const timers = host.useFakeTimers();
    try {
      for (let edit = 1; edit <= 10; edit += 1) {
        const lines = [header("1"), ...Array<string>(998).fill("2"), "9"];
        lines[1] = `2${"x".repeat(edit)}`;
        host.changeDocument(primary, lines);
        if (edit < 10) {
          timers.advanceBy(9);
        }
      }

      timers.advanceBy(99);
      assert.strictEqual(
        fieldDecorationCalls(primary).length,
        primaryCallsBefore,
      );
      assert.strictEqual(fieldDecorationCalls(split).length, splitCallsBefore);
      timers.advanceBy(1);
      assert.strictEqual(
        fieldDecorationCalls(primary).length,
        primaryCallsBefore + 1,
      );
      assert.strictEqual(
        fieldDecorationCalls(split).length,
        splitCallsBefore + 1,
      );
      assert.strictEqual(primary.document.lineCount, 1000);
      assert.strictEqual(hasRow(primary, 999, "エンド"), true);
      assert.strictEqual(hasRow(split, 999, "エンド"), true);
    } finally {
      timers.restore();
    }
  });

  test("同じ URI の分割表示に同じ解析結果を配り、別 URI と解除を分ける", async () => {
    const primary = host.createEditor(
      "50200003-split.txt",
      [header("5"), "2"],
      "file:///first/50200003-split.txt?view=primary#left",
    );
    host.setActiveEditor(primary);
    await host.chooseFileType(zenginTransfer);

    const split = host.createEditor(
      "50200003-split.txt",
      [],
      "file:///first/50200003-split.txt?view=primary#left",
    );
    const sameNameOtherUri = host.createEditor(
      "50200003-split.txt",
      ["2"],
      "vscode-remote://authority/first/50200003-split.txt?view=other#right",
    );
    assert.notStrictEqual(
      sameNameOtherUri.document.uri.toString(),
      primary.document.uri.toString(),
    );
    assert.strictEqual(
      new URL(sameNameOtherUri.document.uri.toString()).pathname,
      new URL(primary.document.uri.toString()).pathname,
    );
    host.setVisibleEditors([primary, split, sameNameOtherUri]);
    assert.strictEqual(
      hasRow(split, 1, "データ(通知預金・定期預金・積立定期預金)"),
      true,
    );
    assert.strictEqual(fieldDecorationCalls(sameNameOtherUri).length, 0);
    assert.notStrictEqual(
      fieldDecorationCalls(primary).at(-1)?.type,
      fieldDecorationCalls(split).at(-1)?.type,
    );

    host.changeDocument(primary, [header("1"), "2"]);
    await host.waitForPendingRender();
    assert.strictEqual(
      hasRow(primary, 1, "データ(普通預金・当座預金・貯蓄預金)"),
      true,
    );
    assert.strictEqual(
      hasRow(split, 1, "データ(普通預金・当座預金・貯蓄預金)"),
      true,
    );
    assert.strictEqual(fieldDecorationCalls(sameNameOtherUri).length, 0);

    host.setActiveEditor(primary);
    host.setVisibleEditors([primary, split, sameNameOtherUri]);
    const primaryType = fieldDecorationCalls(primary).at(-1)?.type;
    const splitType = fieldDecorationCalls(split).at(-1)?.type;
    await host.chooseFileType(clearType);
    assert.strictEqual(primaryType?.disposeCount, 1);
    assert.strictEqual(splitType?.disposeCount, 1);
    assert.deepStrictEqual(fieldDecorationCalls(primary).at(-1)?.options, []);
    assert.deepStrictEqual(fieldDecorationCalls(split).at(-1)?.options, []);
    assert.strictEqual(fieldDecorationCalls(sameNameOtherUri).length, 0);
  });

  test("閉じて開き直した URI は形式を保ち、古い待機処理を破棄する", async () => {
    const uri = "file:///reopened/50200003.txt";
    const editor = host.createEditor("50200003.txt", [header("5"), "2"], uri);
    host.setActiveEditor(editor);
    await host.chooseFileType(zenginTransfer);
    host.changeDocument(editor, [header("1"), "2"]);
    host.closeDocument(editor);
    await host.waitForPendingRender();
    assert.strictEqual(fieldDecorationCalls(editor).length, 2);
    assert.deepStrictEqual(fieldDecorationCalls(editor).at(-1)?.options, []);

    const reopened = host.createEditor("50200003.txt", [header("1"), "2"], uri);
    host.setVisibleEditors([reopened]);
    assert.strictEqual(
      hasRow(reopened, 1, "データ(普通預金・当座預金・貯蓄預金)"),
      true,
    );

    host.changeDocument(reopened, [header("5"), "2"]);
    const callsBeforeDispose = fieldDecorationCalls(reopened).length;
    const currentType = fieldDecorationCalls(reopened).at(-1)?.type;
    host.dispose();
    assert.strictEqual(currentType?.disposeCount, 1);
    await host.waitForPendingRender();
    assert.strictEqual(
      fieldDecorationCalls(reopened).length,
      callsBeforeDispose,
    );
  });

  test("待機中に再選択すると古い更新を取り消し、余分なイベントを送らない", async () => {
    const editor = host.createEditor("50200003-reselect.txt", [
      header("1"),
      "2",
    ]);
    host.setActiveEditor(editor);
    await host.chooseFileType(zenginTransfer);

    const reporter = host.reporters[0];
    const eventsBeforeEdit = reporter.events.length;
    const callsBeforeEdit = fieldDecorationCalls(editor).length;
    const originalType = fieldDecorationCalls(editor).at(-1)?.type;
    const timers = host.useFakeTimers();
    try {
      host.changeDocument(editor, [header("5"), "2"]);
      assert.strictEqual(timers.pendingCount, 1);
      assert.strictEqual(reporter.events.length, eventsBeforeEdit);

      await host.chooseFileType(zenginTransfer);
      assert.strictEqual(timers.pendingCount, 0);
      assert.strictEqual(originalType?.disposeCount, 0);
      assert.strictEqual(
        fieldDecorationCalls(editor).length,
        callsBeforeEdit + 1,
      );
      assert.strictEqual(
        fieldDecorationCalls(editor).at(-1)?.type,
        originalType,
      );
      assert.strictEqual(reporter.events.length, eventsBeforeEdit + 1);

      const callsAfterReselection = fieldDecorationCalls(editor).length;
      const eventsAfterReselection = reporter.events.length;
      timers.advanceBy(100);
      assert.strictEqual(
        fieldDecorationCalls(editor).length,
        callsAfterReselection,
      );
      assert.strictEqual(reporter.events.length, eventsAfterReselection);
    } finally {
      timers.restore();
    }
  });

  test("解除すると待機中の更新を取り消し、余分なイベントを送らない", async () => {
    const editor = host.createEditor("50200003-clear-pending.txt", [
      header("1"),
      "2",
    ]);
    host.setActiveEditor(editor);
    await host.chooseFileType(zenginTransfer);

    const reporter = host.reporters[0];
    const eventsBeforeEdit = reporter.events.length;
    const callsBeforeEdit = fieldDecorationCalls(editor).length;
    const originalType = fieldDecorationCalls(editor).at(-1)?.type;
    const timers = host.useFakeTimers();
    try {
      host.changeDocument(editor, [header("5"), "2"]);
      assert.strictEqual(timers.pendingCount, 1);
      assert.strictEqual(reporter.events.length, eventsBeforeEdit);

      await host.chooseFileType(clearType);
      assert.strictEqual(timers.pendingCount, 0);
      assert.strictEqual(originalType?.disposeCount, 1);
      assert.strictEqual(
        fieldDecorationCalls(editor).length,
        callsBeforeEdit + 1,
      );
      assert.deepStrictEqual(fieldDecorationCalls(editor).at(-1)?.options, []);
      assert.strictEqual(reporter.events.length, eventsBeforeEdit + 1);
      assert.deepStrictEqual(reporter.events.at(-1), {
        name: "ext.decorate",
        properties: { file_type: "clear@clear", development: "false" },
      });

      const callsAfterClear = fieldDecorationCalls(editor).length;
      const eventsAfterClear = reporter.events.length;
      timers.advanceBy(100);
      assert.strictEqual(fieldDecorationCalls(editor).length, callsAfterClear);
      assert.strictEqual(reporter.events.length, eventsAfterClear);
    } finally {
      timers.restore();
    }
  });

  test("Close なしで表示から外れると待機中の更新と装飾を破棄する", async () => {
    const editor = host.createEditor("50200003-hidden.txt", [header("1"), "2"]);
    host.setActiveEditor(editor);
    await host.chooseFileType(zenginTransfer);

    const reporter = host.reporters[0];
    const eventsBeforeEdit = reporter.events.length;
    const callsBeforeEdit = fieldDecorationCalls(editor).length;
    const originalType = fieldDecorationCalls(editor).at(-1)?.type;
    const timers = host.useFakeTimers();
    try {
      host.changeDocument(editor, [header("5"), "2"]);
      assert.strictEqual(timers.pendingCount, 1);
      assert.strictEqual(reporter.events.length, eventsBeforeEdit);

      host.setVisibleEditors([]);
      assert.strictEqual(timers.pendingCount, 0);
      assert.strictEqual(originalType?.disposeCount, 1);
      assert.strictEqual(
        fieldDecorationCalls(editor).length,
        callsBeforeEdit + 1,
      );
      assert.deepStrictEqual(fieldDecorationCalls(editor).at(-1)?.options, []);
      assert.strictEqual(reporter.events.length, eventsBeforeEdit);

      const callsAfterHide = fieldDecorationCalls(editor).length;
      timers.advanceBy(100);
      assert.strictEqual(fieldDecorationCalls(editor).length, callsAfterHide);
      assert.strictEqual(reporter.events.length, eventsBeforeEdit);
    } finally {
      timers.restore();
    }
  });

  test("破棄時に待機処理と購読を一度だけ破棄し、余分なイベントを送らない", async () => {
    const editor = host.createEditor("50200003-dispose-pending.txt", [
      header("1"),
      "2",
    ]);
    host.setActiveEditor(editor);
    await host.chooseFileType(zenginTransfer);

    const reporter = host.reporters[0];
    const eventsBeforeEdit = reporter.events.length;
    const callsBeforeEdit = fieldDecorationCalls(editor).length;
    const timers = host.useFakeTimers();
    try {
      host.changeDocument(editor, [header("5"), "2"]);
      assert.strictEqual(timers.pendingCount, 1);
      assert.strictEqual(reporter.events.length, eventsBeforeEdit);

      host.dispose();
      assert.strictEqual(timers.pendingCount, 0);
      assert.strictEqual(host.commandDisposalCount, 1);
      assert.deepStrictEqual(host.eventSubscriptionStats, {
        activeEditor: { registered: 0, disposed: 0, active: 0 },
        visibleEditors: { registered: 1, disposed: 1, active: 0 },
        editorSelections: { registered: 1, disposed: 1, active: 0 },
        documentChanges: { registered: 1, disposed: 1, active: 0 },
        documentClose: { registered: 1, disposed: 1, active: 0 },
      });
      assert.strictEqual(host.registeredCommands.has(commandId), false);
      assert.strictEqual(reporter.disposeCount, 1);
      assert.strictEqual(reporter.events.length, eventsBeforeEdit + 1);
      assert.strictEqual(reporter.events.at(-1)?.name, "ext.deactivate");

      host.dispose();
      const eventsAfterDispose = reporter.events.length;
      timers.advanceBy(100);
      assert.strictEqual(fieldDecorationCalls(editor).length, callsBeforeEdit);
      assert.strictEqual(reporter.events.length, eventsAfterDispose);
      assert.strictEqual(reporter.disposeCount, 1);
      assert.strictEqual(host.commandDisposalCount, 1);
      assert.strictEqual(
        host.eventSubscriptionStats.visibleEditors.disposed,
        1,
      );
      assert.strictEqual(
        host.eventSubscriptionStats.documentChanges.disposed,
        1,
      );
      assert.strictEqual(host.eventSubscriptionStats.documentClose.disposed, 1);
    } finally {
      timers.restore();
    }
  });

  test("空形式で装飾を解除し、同じ文書の再適用と破棄を保つ", async () => {
    const editor = host.createEditor("50200001.txt", ["2"]);
    host.setActiveEditor(editor);
    await host.chooseFileType(zenginAccount);
    const originalType = fieldDecorationCalls(editor).at(-1)?.type;
    assert.strictEqual(optionsForLine(editor, 0).length, 1);

    const eventsBeforeClear = host.reporters[0].events.length;
    await host.chooseFileType(clearType);
    assert.strictEqual(originalType?.disposeCount, 1);
    assert.deepStrictEqual(fieldDecorationCalls(editor).at(-1)?.options, []);
    assert.strictEqual(host.reporters[0].events.length, eventsBeforeClear + 1);
    assert.deepStrictEqual(host.reporters[0].events.at(-1), {
      name: "ext.decorate",
      properties: { file_type: "clear@clear", development: "false" },
    });

    const reporter = host.reporters[0];
    const eventsBeforeSwitch = reporter.events.length;
    const replacementEditor = host.createEditor("50200001.txt", ["2"]);
    host.setActiveEditor(replacementEditor);
    assert.strictEqual(fieldDecorationCalls(replacementEditor).length, 0);
    assert.strictEqual(reporter.events.length, eventsBeforeSwitch);

    host.dispose();
    assert.strictEqual(originalType?.disposeCount, 1);
    assert.strictEqual(reporter.events.at(-1)?.name, "ext.deactivate");
    assert.deepStrictEqual(reporter.events.at(-1)?.properties, {
      development: "false",
    });
    assert.strictEqual(reporter.disposeCount, 1);
  });
});
