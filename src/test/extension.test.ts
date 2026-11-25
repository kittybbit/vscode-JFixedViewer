import * as assert from "assert";
import { readFileSync, readdirSync } from "node:fs";
import path = require("node:path");
import { CharacterizationHost } from "./support/characterizationHost";
import {
  createHikariSmokeLines,
  createLeasedLineSmokeLines,
  createTelephoneSmokeLines,
} from "./support/nttSmoke";
import {
  verifyDocomoS1Characterization,
  verifyDocomoS2Characterization,
} from "./support/docomoSmoke";
import {
  billingStationExpectedRows,
  billingStationIdentity,
  billingStationIdentityFromFileName,
  billingStationSummaryFacts,
  createBillingStationFixtureRows,
  displayIndexAtShiftJisByte,
  fixtureValueAtByte,
  leasedLineNumber,
  leasedLineSummaryMatches,
} from "./support/billingStationFixtures";
import {
  FakePosition,
  FakeRange,
  type FakeEditor,
} from "./support/fakeVscodeTypes";
import { createFixedWidthDecoration } from "../application/fixedWidth/FixedWidthDecoration";
import { projectFields } from "../domain/fixedWidth/projectFields";
import { validateRecord } from "../domain/fixedWidth/validateRecord";
import { loadBuiltInDefinitions } from "../infrastructure/definitions/loadBuiltInDefinitions";

const commandId = "vscode-JFixedViewer.FiletypePicker";
const zenginAccount = "全銀協規定形式/振込入金通知(A)";
const zenginTransfer = "全銀協規定形式/入出金取引明細";
const zenginGeneralTransfer = "全銀協規定形式/総合振込";
const zenginLoanCalculation = "全銀協規定形式/借入金計算書";
const zenginForeignCurrency = "全銀協規定形式/外貨預金入出金取引明細";
const jpxFourPrices = "JPX/四本値(デリバティブ)";
const nttDialMeisai = "NTT/ダイヤル通話料金明細内訳書（2026年9月以降）";
const nttDialFileType = "dial_meisai_2026@ntt";
const nttTelephoneMeisai = "NTT/電話番号別明細内訳書（2026年9月以降）";
const nttTelephoneFileType = "telephone_2026@ntt";
const nttHikariMeisai =
  "NTT/電話番号別明細内訳書（ひかり電話）（2026年9月以降）";
const nttHikariFileType = "hikari_2026@ntt";
const nttLeasedLineMeisai = "NTT/専用線番号別明細内訳書（2026年9月以降）";
const nttLeasedLineFileType = "leased_line_2026@ntt";
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

function decorationThemeColor(type: { options: unknown }) {
  const { backgroundColor } = type.options as {
    backgroundColor?: { id?: string };
  };
  return backgroundColor?.id;
}

function cursorDecorationCall(editor: FakeEditor) {
  return [...editor.decorationCalls]
    .reverse()
    .find(
      ({ type }) =>
        decorationThemeColor(type) === "editor.wordHighlightStrongBackground",
    );
}

function fieldDecorationCalls(editor: FakeEditor) {
  return editor.decorationCalls
    .filter(({ type }) => !isWholeLine(type))
    .filter(
      ({ type }) =>
        decorationThemeColor(type) !== "editor.wordHighlightStrongBackground",
    );
}

function isWholeLine(type: { options: unknown }) {
  return (type.options as { isWholeLine?: boolean }).isWholeLine === true;
}

function rowBackgroundDecorationCalls(editor: FakeEditor) {
  return editor.decorationCalls.filter(({ type }) => isWholeLine(type));
}

function currentRowBackgroundCalls(editor: FakeEditor) {
  const callsByType = new Map<
    FakeEditor["decorationCalls"][number]["type"],
    FakeEditor["decorationCalls"][number]
  >();
  rowBackgroundDecorationCalls(editor).forEach((call) => {
    callsByType.delete(call.type);
    callsByType.set(call.type, call);
  });
  return [...callsByType.values()].reverse();
}

function rowBackgroundRows(editor: FakeEditor) {
  return currentRowBackgroundCalls(editor).flatMap(({ type, options }) => {
    const style = type.options as {
      light: { backgroundColor: string };
      dark: { backgroundColor: string };
    };
    assert.ok(style.light);
    assert.ok(style.dark);
    return options.map(({ range }) => ({
      line: range.start.line,
      light: style.light.backgroundColor,
      dark: style.dark.backgroundColor,
    }));
  });
}

function sortedRowBackgroundRows(editor: FakeEditor) {
  return rowBackgroundRows(editor).sort(
    (left, right) => left.line - right.line,
  );
}

function rowBackgroundOptionsForLine(editor: FakeEditor, line: number) {
  return currentRowBackgroundCalls(editor).flatMap(({ options }) =>
    options.filter(({ range }) => range.start.line === line),
  );
}

function visibleFieldLineBounds(editor: FakeEditor) {
  const options = fieldDecorationCalls(editor).at(-1)?.options ?? [];
  return options.length
    ? {
        min: Math.min(...options.map(({ range }) => range.start.line)),
        max: Math.max(...options.map(({ range }) => range.start.line)),
      }
    : undefined;
}

function pauseNextDecode(host: CharacterizationHost) {
  let signalStarted!: () => void;
  let release!: () => void;
  const started = new Promise<void>((resolve) => {
    signalStarted = resolve;
  });
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  host.decodeTextHook = async () => {
    signalStarted();
    await pending;
    return undefined;
  };
  return { started, release };
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

function assertLeasedLineSummaryMatches(
  summaryLine: string,
  detailLines: string[],
) {
  assert.strictEqual(leasedLineSummaryMatches(summaryLine, detailLines), true);
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

  test("ドメインの範囲は実在する文字を示し、未知行全体と空入力を扱う", async () => {
    const rows = [
      {
        name: "データ",
        condition: /^/u,
        fields: [{ name: "値", length: 5 }],
      },
    ];
    const shortProjection = projectFields({
      lineText: "AB",
      rowRules: rows,
      currentMode: undefined,
    });
    assert.deepStrictEqual(validateRecord("AB", shortProjection), [
      {
        code: "INVALID_LENGTH",
        start: 1,
        end: 2,
        expectedLength: 5,
        actualLength: 2,
      },
    ]);

    const emptyProjection = projectFields({
      lineText: "",
      rowRules: rows,
      currentMode: undefined,
    });
    assert.deepStrictEqual(validateRecord("", emptyProjection), [
      {
        code: "INVALID_LENGTH",
        start: 0,
        end: 0,
        expectedLength: 5,
        actualLength: 0,
      },
    ]);
    const emptyAnalysis = createFixedWidthDecoration([
      {
        fileType: "test@empty",
        name: "試験/空行",
        fileNamePattern: /.*/u,
        rows,
      },
    ]).analyze({
      fileType: "test@empty",
      lines: [{ line: 0, text: "", isEmptyOrWhitespace: true }],
      validationEnabled: true,
    });
    const resolvedEmptyAnalysis = await emptyAnalysis;
    assert.deepStrictEqual(resolvedEmptyAnalysis.issues, []);

    assert.deepStrictEqual(
      validateRecord(
        "XYZ",
        projectFields({
          lineText: "XYZ",
          rowRules: [],
          currentMode: undefined,
        }),
      ),
      [{ code: "UNKNOWN_RECORD", start: 0, end: 3 }],
    );
  });

  test("検証は文字位置で長さとN型を診断し、空白項目と文字型を誤検知しない", async () => {
    const decoration = createFixedWidthDecoration([
      {
        fileType: "test@custom",
        name: "試験/検証",
        fileNamePattern: /.*/u,
        rows: [
          {
            name: "データ",
            condition: /^(?=[0-9 A０-９])/u,
            fields: [
              { name: "区分", length: 1, type: "C" },
              { name: "金額", length: 2, type: "N" },
              { name: "自由項目", length: 2, type: "C" },
            ],
          },
        ],
      },
    ]);
    const lines = [
      "A12ab",
      "A  \u0000!",
      "A1 ab",
      "A1",
      "xabc",
      "A12abZZ",
      "A１２ab",
    ].map((text, line) => ({
      line,
      text,
      isEmptyOrWhitespace: /^\s*$/u.test(text),
    }));

    const analysis = await decoration.analyze({
      fileType: "test@custom",
      lines,
      validationEnabled: true,
    });
    assert.deepStrictEqual(
      analysis.issues.map((issue) => ({ code: issue.code, line: issue.line })),
      [
        { code: "INVALID_TYPE", line: 2 },
        { code: "INVALID_LENGTH", line: 3 },
        { code: "UNKNOWN_RECORD", line: 4 },
        { code: "INVALID_LENGTH", line: 5 },
        { code: "INVALID_TYPE", line: 6 },
      ],
    );
    assert.deepStrictEqual(analysis.issues[0], {
      code: "INVALID_TYPE",
      line: 2,
      start: 1,
      end: 3,
      fieldName: "金額",
      fieldNumber: 2,
    });
    assert.deepStrictEqual(analysis.issues[1], {
      code: "INVALID_LENGTH",
      line: 3,
      start: 1,
      end: 2,
      expectedLength: 5,
      actualLength: 2,
    });
    assert.deepStrictEqual(analysis.issues[2], {
      code: "UNKNOWN_RECORD",
      line: 4,
      start: 0,
      end: 4,
    });
    assert.deepStrictEqual(analysis.issues[3], {
      code: "INVALID_LENGTH",
      line: 5,
      start: 5,
      end: 7,
      expectedLength: 5,
      actualLength: 7,
    });
    assert.deepStrictEqual(analysis.issues[4], {
      code: "INVALID_TYPE",
      line: 6,
      start: 1,
      end: 3,
      fieldName: "金額",
      fieldNumber: 2,
    });
    assert.deepStrictEqual(
      await decoration.decorate({ fileType: "test@custom", lines }),
      analysis.fields,
    );
    assert.deepStrictEqual(
      (
        await decoration.analyze({
          fileType: "test@custom",
          lines,
          validationEnabled: false,
        })
      ).issues,
      [],
    );
  });

  test("短い行でも完全なN項目を検証し、不足したN項目は型検証しない", async () => {
    const decoration = createFixedWidthDecoration([
      {
        fileType: "test@short-fields",
        name: "試験/短い項目",
        fileNamePattern: /.*/u,
        rows: [
          {
            name: "データ",
            condition: /^/u,
            fields: [
              { name: "先行項目", length: 1, type: "N" },
              { name: "不足項目", length: 2, type: "N" },
            ],
          },
        ],
      },
    ]);
    const lines = ["x!"].map((text, line) => ({
      line,
      text,
      isEmptyOrWhitespace: false,
    }));

    const analysis = await decoration.analyze({
      fileType: "test@short-fields",
      lines,
      validationEnabled: true,
    });

    assert.deepStrictEqual(
      analysis.issues.map((issue) => ({
        code: issue.code,
        fieldName: issue.code === "INVALID_TYPE" ? issue.fieldName : undefined,
      })),
      [
        { code: "INVALID_LENGTH", fieldName: undefined },
        { code: "INVALID_TYPE", fieldName: "先行項目" },
      ],
    );
  });

  test("診断を1000件で打ち切っても、後続のモード依存装飾を解析する", async () => {
    const decoration = createFixedWidthDecoration([
      {
        fileType: "test@mode",
        name: "試験/モード",
        fileNamePattern: /.*/u,
        rows: [
          {
            name: "ヘッダー",
            condition: /^H/u,
            modeRule: /^H(.)/u,
            modeRulePosition: 1,
            fields: [{ name: "モード", length: 2 }],
          },
          {
            name: "データ",
            condition: /^D/u,
            mode: /^1/u,
            fields: [{ name: "値", length: 2 }],
          },
        ],
      },
    ]);
    const validLines = ["H1", "D2"].map((text, line) => ({
      line,
      text,
      isEmptyOrWhitespace: false,
    }));
    assert.deepStrictEqual(
      (
        await decoration.analyze({
          fileType: "test@mode",
          lines: validLines,
          validationEnabled: true,
        })
      ).issues,
      [],
    );

    const unknownLines = (count: number) =>
      Array.from({ length: count }, (_, line) => ({
        line,
        text: "X",
        isEmptyOrWhitespace: false,
      }));
    const exactlyAtLimit = await decoration.analyze({
      fileType: "test@mode",
      lines: unknownLines(1000),
      validationEnabled: true,
    });
    assert.strictEqual(exactlyAtLimit.issues.length, 1000);
    assert.strictEqual(
      exactlyAtLimit.issues.some((issue) => issue.code === "VALIDATION_LIMIT"),
      false,
    );

    const lines = [
      ...unknownLines(1001),
      ...["H1", "D2"].map((text, index) => ({
        line: index + 1001,
        text,
        isEmptyOrWhitespace: false,
      })),
    ];

    const analysis = await decoration.analyze({
      fileType: "test@mode",
      lines,
      validationEnabled: true,
    });
    assert.strictEqual(analysis.issues.length, 1001);
    assert.strictEqual(
      analysis.issues.filter((issue) => issue.code === "UNKNOWN_RECORD").length,
      1000,
    );
    assert.deepStrictEqual(analysis.issues.at(-1), {
      code: "VALIDATION_LIMIT",
      line: 0,
      start: 0,
      end: 0,
    });
    assert.deepStrictEqual(
      analysis.fields.map(({ line, name }) => ({ line, name })),
      [
        { line: 1001, name: "ヘッダー" },
        { line: 1002, name: "データ" },
      ],
    );
  });

  test("検証を無効化すると診断が消え、再有効化・編集・解除で更新する", async () => {
    host.dispose();
    host = new CharacterizationHost({
      zengin: {
        type: "zengin",
        name: "試験",
        files: [
          {
            file_type: "test",
            name: "検証",
            finame_pattern: ".*",
            rows: [
              {
                name: "データ",
                condition: "^(?=[0-9 A０-９])",
                fields: [
                  { name: "区分", length: 1, type: "C" },
                  { name: "金額", length: 2, type: "N" },
                  { name: "自由項目", length: 2, type: "C" },
                ],
              },
            ],
          },
        ],
      },
    });
    host.start();
    const editor = host.createEditor("validation.txt", ["A1 ab"]);
    host.setActiveEditor(editor);
    await host.chooseFileType("試験/検証");

    const collection = host.diagnosticCollections[0];
    assert.strictEqual(collection.name, "jfixedviewer");
    assert.deepStrictEqual(
      host.diagnosticsFor(editor)?.map(({ code }) => code),
      ["INVALID_TYPE"],
    );

    host.setConfiguration("validation.txt", { validationEnabled: false });
    await host.waitForAnalysis();
    assert.deepStrictEqual(host.diagnosticsFor(editor), []);
    host.setConfiguration("validation.txt", { validationEnabled: true });
    await host.waitForAnalysis();
    assert.deepStrictEqual(
      host.diagnosticsFor(editor)?.map(({ code }) => code),
      ["INVALID_TYPE"],
    );
    host.setConfiguration("validation.txt", { validationEnabled: "invalid" });
    await host.waitForAnalysis();
    assert.deepStrictEqual(
      host.diagnosticsFor(editor)?.map(({ code }) => code),
      ["INVALID_TYPE"],
    );

    const resourceScoped = host.createEditor("validation-disabled.txt", [
      "A1 ab",
    ]);
    host.setConfiguration("validation-disabled.txt", {
      validationEnabled: false,
    });
    host.setActiveEditor(resourceScoped);
    await host.chooseFileType("試験/検証");
    assert.deepStrictEqual(host.diagnosticsFor(resourceScoped), []);
    host.setActiveEditor(editor);
    await host.waitForAnalysis();
    assert.deepStrictEqual(
      host.diagnosticsFor(editor)?.map(({ code }) => code),
      ["INVALID_TYPE"],
    );

    const split = host.createEditor("validation.txt", ["A1 ab"]);
    const setCountBeforeSplit = collection.setCount;
    host.setVisibleEditors([editor, split]);
    assert.strictEqual(collection.setCount, setCountBeforeSplit);
    assert.strictEqual(hasRow(split, 0, "データ"), true);
    assert.deepStrictEqual(
      collection.get(editor.document.uri)?.map(({ code }) => code),
      ["INVALID_TYPE"],
    );
    host.setVisibleEditors([split]);
    assert.deepStrictEqual(
      collection.get(editor.document.uri)?.map(({ code }) => code),
      ["INVALID_TYPE"],
    );

    host.changeDocument(editor, ["A12ab"]);
    await host.waitForPendingRender();
    assert.deepStrictEqual(host.diagnosticsFor(editor), []);
    host.changeDocument(editor, ["A1 ab"]);
    await host.waitForPendingRender();
    assert.deepStrictEqual(
      host.diagnosticsFor(editor)?.map(({ code }) => code),
      ["INVALID_TYPE"],
    );

    host.setVisibleEditors([]);
    assert.strictEqual(collection.get(editor.document.uri), undefined);
    host.closeDocument(split);
    const reopened = host.createEditor("validation.txt", ["A1 ab"]);
    host.setVisibleEditors([reopened]);
    await host.waitForAnalysis();
    assert.deepStrictEqual(
      host.diagnosticsFor(reopened)?.map(({ code }) => code),
      ["INVALID_TYPE"],
    );
    host.closeDocument(reopened);
    assert.strictEqual(collection.get(reopened.document.uri), undefined);

    await host.chooseFileType(clearType);
    assert.strictEqual(collection.get(editor.document.uri), undefined);
    assert.strictEqual(collection.disposeCount, 0);
    host.dispose();
    assert.strictEqual(collection.disposeCount, 1);
    assert.strictEqual(collection.get(editor.document.uri), undefined);
  });

  test("組み込みの全銀と JPX の定義、空白行、不一致行、ホバー、UTF-16表示範囲を保つ", async () => {
    const zengin = host.createEditor("50200001-a.txt", [
      "1あ",
      "   ",
      "X",
      "2あ",
      "8",
      "9",
    ]);
    host.setActiveEditor(zengin);
    await host.chooseFileType(zenginAccount);

    const decorationStyle = host.decorationTypes[0].options as {
      isWholeLine: boolean;
    };
    assert.strictEqual(decorationStyle.isWholeLine, false);
    assert.ok(rowBackgroundRows(zengin).length > 0);

    const shortHeader = optionsForLine(zengin, 0);
    assert.strictEqual(shortHeader[1].range.end.character, 2);
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
    assert.strictEqual(partialDataField.range.end.character, 2);
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
      { start: 1, end: 2 },
    );
    assert.strictEqual(zengin.document.lineAt(3).text.length, 2);
    assert.strictEqual(dataFields.at(-1)?.range.end.character, 2);

    const jpx = host.createEditor("jpx.txt", ["2あ"]);
    host.setActiveEditor(jpx);
    await host.chooseFileType(jpxFourPrices);
    assert.strictEqual(hasRow(jpx, 0, "レコード"), true);
    assert.ok(rowBackgroundRows(jpx).length > 0);
    assert.strictEqual(jpx.document.lineAt(0).text.length, 2);
    assert.strictEqual(optionsForLine(jpx, 0)[1].range.end.character, 2);
    assert.strictEqual(
      optionsForLine(jpx, 0)[1].hoverMessage?.value,
      "**レコード / ファイル識別 (項目 2)**  \n位置: 2 - 4 (3バイト)\nデータ型: C",
    );
    assert.strictEqual(
      optionsForLine(jpx, 0)[1].hoverMessage?.isTrusted,
      false,
    );
    assert.strictEqual(
      optionsForLine(jpx, 0)[1].renderOptions?.after,
      undefined,
    );

    const loan = host.createEditor("50200231-loan.txt", ["230"]);
    host.setActiveEditor(loan);
    await host.chooseFileType(zenginLoanCalculation);
    assert.strictEqual(hasRow(loan, 0, "データ(商業手形割引〔内訳〕)"), true);
    assert.strictEqual(hasRow(loan, 0, "データ(商業手形割引〔合計〕)"), false);
  });

  test("全組み込み行に背景色を設定し、共通の行役割で色をそろえる", () => {
    const definitions = loadBuiltInDefinitions();
    const visibleDefinitions = definitions.filter(
      ({ fileType }) => fileType !== "clear@clear",
    );
    const validColor = /^#[\da-fA-F]{6}(?:[\da-fA-F]{2})?$/u;
    visibleDefinitions.forEach((definition) => {
      definition.rows.forEach((row) => {
        assert.ok(row.backgroundColor, `${definition.fileType}/${row.name}`);
        assert.match(row.backgroundColor.light, validColor);
        assert.match(row.backgroundColor.dark, validColor);
      });
    });

    const rowColor = (fileType: string, name: string) => {
      const definition = definitions.find(
        (candidate) => candidate.fileType === fileType,
      );
      assert.ok(definition, fileType);
      const row = definition.rows.find((candidate) => candidate.name === name);
      assert.ok(row, `${fileType}/${name}`);
      assert.ok(row.backgroundColor, `${fileType}/${name}`);
      return row.backgroundColor;
    };
    const header = { light: "#5CA5EA40", dark: "#284B7140" };
    const data = { light: "#E8B05C40", dark: "#694F2740" };
    const detail = { light: "#A887DD40", dark: "#46365E40" };
    const trailer = { light: "#64BC8040", dark: "#285B3D40" };
    const end = { light: "#96969640", dark: "#55555540" };
    assert.deepStrictEqual(
      rowColor("sougou_furikomi@zengin", "ヘッダー"),
      header,
    );
    assert.deepStrictEqual(
      rowColor("leased_line_2026@ntt", "ヘッダレコード"),
      header,
    );
    assert.deepStrictEqual(rowColor("sougou_furikomi@zengin", "データ"), data);
    assert.deepStrictEqual(
      rowColor("sougou_furikomi@zengin", "データ(EDI)"),
      detail,
    );
    assert.deepStrictEqual(
      rowColor("sougou_furikomi@zengin", "トレーラ"),
      trailer,
    );
    assert.deepStrictEqual(
      rowColor("leased_line_2026@ntt", "トレーラレコード（計上事業所単位）"),
      trailer,
    );
    assert.deepStrictEqual(
      rowColor("leased_line_2026@ntt", "エンドレコード（専用線ID単位）"),
      end,
    );
    assert.deepStrictEqual(
      rowColor("leased_line_2026@ntt", "総合計レコード"),
      end,
    );
    assert.deepStrictEqual(
      rowColor("dial_meisai_2026@ntt", "通話明細レコード"),
      detail,
    );
    assert.deepStrictEqual(
      rowColor("dial_meisai_2026@ntt", "終了レコード"),
      end,
    );
    assert.deepStrictEqual(
      rowColor("telephone_2026@ntt", "電話番号別内訳レコード（初回）"),
      detail,
    );
    assert.deepStrictEqual(
      rowColor("telephone_2026@ntt", "総合計レコード"),
      end,
    );
  });

  test("ドコモ M/F の定義、境界、診断を確認する", async () => {
    await verifyDocomoS1Characterization({
      assert,
      host,
      optionsForLine,
      rowNames,
    });
  });

  test("ドコモ A/W/J/G/E の定義、境界、診断を確認する", async () => {
    await verifyDocomoS2Characterization({
      assert,
      host,
      optionsForLine,
      rowNames,
    });
  });

  test("ビリングステーション専用線料金の定義、統合請求、診断を確認する", async () => {
    const expectedFileType = "leased_line@billingStation";
    const expectedName =
      "NTTドコモビジネス ビリングステーション/専用線料金内訳書";
    const billingDefinitions = loadBuiltInDefinitions().filter(({ fileType }) =>
      fileType.endsWith("@billingStation"),
    );
    assert.deepStrictEqual(
      billingDefinitions.map(({ fileType }) => fileType),
      [expectedFileType],
    );
    const definition = billingDefinitions[0];
    assert.ok(definition);
    assert.strictEqual(definition.name, expectedName);
    assert.strictEqual(definition.encoding, "shiftjis");
    assert.strictEqual(definition.lengthUnit, "byte");
    assert.strictEqual(
      definition.fileNamePattern.test("U0000001-00001-001-C.txt"),
      true,
    );
    assert.strictEqual(
      definition.fileNamePattern.test("U0000001-00001-001-X.txt"),
      false,
    );
    assert.deepStrictEqual(
      definition.rows.map(({ name, backgroundColor, condition, fields }) => ({
        name,
        backgroundColor,
        condition: condition.source,
        fields: (fields ?? []).map(({ name: fieldName, length, type }) => ({
          name: fieldName,
          length,
          type,
        })),
      })),
      billingStationExpectedRows.map((row) => ({
        name: row.name,
        backgroundColor: row.color,
        condition: "^" + row.code,
        fields: row.fields,
      })),
    );

    const sampleDirectory = path.resolve(
      __dirname,
      "../../sample/billingStation",
    );
    const sampleRecords = (fileName: string) => {
      const bytes = readFileSync(path.join(sampleDirectory, fileName));
      const parts = bytes.toString("latin1").split("\r\n");
      assert.strictEqual(parts.pop(), "");
      assert.deepStrictEqual(
        parts.map((line) => Buffer.byteLength(line, "latin1")),
        parts.map(() => 510),
      );
      return parts;
    };
    const regularSample = sampleRecords("U0000001-00001-001-C.txt");
    const mergedSample = sampleRecords("U0000002-79001-001-C.txt");
    const regularIdentity = billingStationIdentityFromFileName(
      "U0000001-00001-001-C.txt",
    );
    const mergedIdentity = billingStationIdentityFromFileName(
      "U0000002-79001-001-C.txt",
    );
    assert.deepStrictEqual(
      [
        billingStationIdentity(regularSample[0]),
        billingStationIdentity(regularSample[1], 10),
        billingStationIdentity(regularSample[4]),
      ],
      Array(3).fill(regularIdentity),
    );
    assert.deepStrictEqual(
      [
        billingStationIdentity(mergedSample[0]),
        billingStationIdentity(mergedSample[8]),
      ],
      Array(2).fill(mergedIdentity),
    );
    assert.deepStrictEqual(
      mergedSample
        .filter((line) => line.startsWith("11"))
        .map((line) => billingStationIdentity(line, 10)),
      ["300000900001", "300000979001"],
    );
    assert.deepStrictEqual(
      regularSample.map((line) => line.slice(0, 2)),
      ["01", "11", "12", "21", "81"],
    );
    assert.deepStrictEqual(
      mergedSample.map((line) => line.slice(0, 2)),
      ["01", "11", "12", "21", "11", "12", "12", "21", "81"],
    );
    assert.strictEqual(regularSample[2].slice(327, 339), "        -123");
    assert.strictEqual(regularSample[2].slice(339, 351), "           0");
    assert.strictEqual(regularSample[3].slice(74, 86), "        -123");
    assert.strictEqual(regularSample[4].slice(32, 42), "     12345");
    assert.strictEqual(mergedSample[1].slice(17, 22), "00001");
    assert.strictEqual(mergedSample[4].slice(17, 22), "79001");
    assert.strictEqual(mergedSample[6].slice(2, 11), "*******01");
    assert.strictEqual(mergedSample[6].slice(327, 339), "       -5000");
    assert.deepStrictEqual(
      mergedSample
        .filter((line) => line.startsWith("12"))
        .map((line) => line.slice(2, 11)),
      ["000000001", "000000002", "*******01"],
    );
    assert.deepStrictEqual(billingStationSummaryFacts(regularSample), {
      groupAmounts: [12345],
      groupCircuitCounts: [1],
      invoiceTotal: 12345,
      invoiceCircuitCount: 1,
    });
    assert.deepStrictEqual(billingStationSummaryFacts(mergedSample), {
      groupAmounts: [12000, 2500],
      groupCircuitCounts: [1, 1],
      invoiceTotal: 14500,
      invoiceCircuitCount: 2,
    });

    const regular = createBillingStationFixtureRows();
    const integratedIdentityOverrides = {
      "01": { 1: "0000002", 2: "79001" },
      "11": { 2: "3000009" },
      "81": { 1: "0000002", 2: "79001" },
    };
    const mergedGroupOne = createBillingStationFixtureRows("00001", {
      ...integratedIdentityOverrides,
      "21": { 1: "12000" },
    });
    const mergedGroupTwo = createBillingStationFixtureRows("79001", {
      ...integratedIdentityOverrides,
      "21": { 1: "2500" },
    });
    const mergedDiscount = createBillingStationFixtureRows("79001", {
      ...integratedIdentityOverrides,
      "12": {
        1: "*******01",
        18: "0",
        19: "0",
        24: "-5000",
        33: "-500",
      },
      "21": { 1: "2500", 2: "0", 7: "-5000", 16: "-500" },
      "81": { 7: "14500", 8: "00002" },
    });
    const lines = [
      mergedGroupOne[0].line,
      mergedGroupOne[1].line,
      mergedGroupOne[2].line,
      mergedGroupOne[3].line,
      mergedGroupTwo[1].line,
      mergedGroupTwo[2].line,
      mergedDiscount[2].line,
      mergedDiscount[3].line,
      mergedDiscount[4].line,
    ];
    assert.strictEqual(mergedDiscount[2].line.slice(2, 11), "*******01");
    const discountStart = billingStationExpectedRows[2].fields
      .slice(0, 24)
      .reduce((total, field) => total + field.length, 0);
    assert.strictEqual(
      fixtureValueAtByte(mergedGroupTwo[2].line, discountStart, 12).trimStart(),
      "-12",
    );
    assert.strictEqual(
      fixtureValueAtByte(mergedDiscount[2].line, discountStart, 12).trimStart(),
      "-5000",
    );

    const editor = host.createEditor(
      "U0000002-79001-001-C.txt",
      lines,
      "billingStation://merged",
    );
    host.setActiveEditor(editor);
    await host.chooseFileType(expectedName);
    await host.waitForAnalysis();
    assert.deepStrictEqual(host.diagnosticsFor(editor) ?? [], []);
    const expectedLineNames = [
      mergedGroupOne[0].name,
      mergedGroupOne[1].name,
      mergedGroupOne[2].name,
      mergedGroupOne[3].name,
      mergedGroupTwo[1].name,
      mergedGroupTwo[2].name,
      mergedDiscount[2].name,
      mergedDiscount[3].name,
      mergedDiscount[4].name,
    ];
    lines.forEach((_, line) => {
      assert.deepStrictEqual(
        [...new Set(rowNames(editor, line))],
        [expectedLineNames[line]],
      );
      const expectedFieldCount = billingStationExpectedRows.find(
        ({ code }) => code === lines[line].slice(0, 2),
      )?.fields.length;
      assert.strictEqual(
        optionsForLine(editor, line).length,
        expectedFieldCount,
      );
    });
    assert.ok(
      optionsForLine(editor, 8)[8]?.hoverMessage?.value.includes(
        "位置: 43 - 47 (5バイト)",
      ),
    );
    assert.deepStrictEqual(
      rowBackgroundRows(editor)
        .sort((left, right) => left.line - right.line)
        .map(({ line, light, dark }) => ({ line, light, dark })),
      lines.map((line, index) => {
        const color = billingStationExpectedRows.find(
          ({ code }) => code === line.slice(0, 2),
        )?.color;
        return {
          line: index,
          light: color?.light,
          dark: color?.dark,
        };
      }),
    );

    const consentNumberStart = 50;
    const consentNumberEnd = 61;
    const invalidNStart = displayIndexAtShiftJisByte(
      regular[2].line,
      consentNumberStart,
    );
    const invalidNEnd = displayIndexAtShiftJisByte(
      regular[2].line,
      consentNumberEnd,
    );
    const invalidLines = [
      {
        fileName: "unknown.txt",
        line: "99" + " ".repeat(508),
        code: "UNKNOWN_RECORD",
      },
      {
        fileName: "short.txt",
        line: regular[2].line.slice(0, -1),
        code: "INVALID_LENGTH",
      },
      {
        fileName: "invalid-n.txt",
        line:
          regular[2].line.slice(0, invalidNStart) +
          "0000000000X" +
          regular[2].line.slice(invalidNEnd),
        code: "INVALID_TYPE",
      },
    ];
    for (const invalid of invalidLines) {
      const invalidEditor = host.createEditor(
        invalid.fileName,
        [invalid.line],
        "billingStation://" + invalid.fileName,
      );
      host.setActiveEditor(invalidEditor);
      await host.chooseFileType(expectedName);
      await host.waitForAnalysis();
      assert.deepStrictEqual(
        host.diagnosticsFor(invalidEditor)?.map(({ code }) => code),
        [invalid.code],
      );
      assert.strictEqual(invalidEditor.document.getText(), invalid.line);
      assert.strictEqual(invalidEditor.document.isDirty, false);
    }

    const header = regular[1].line;
    const headerBoundary = 103;
    const displayBoundary = displayIndexAtShiftJisByte(header, headerBoundary);
    const splitHeader =
      header.slice(0, displayBoundary - 1) +
      "あ" +
      header.slice(displayBoundary + 1);
    const boundaryEditor = host.createEditor(
      "split-boundary.txt",
      [splitHeader],
      "billingStation://split-boundary",
    );
    host.setActiveEditor(boundaryEditor);
    await host.chooseFileType(expectedName);
    await host.waitForAnalysis();
    assert.deepStrictEqual(
      host.diagnosticsFor(boundaryEditor)?.map(({ code }) => code),
      ["INVALID_BYTE_BOUNDARY", "INVALID_BYTE_BOUNDARY"],
    );
    assert.strictEqual(boundaryEditor.document.getText(), splitHeader);
    assert.strictEqual(boundaryEditor.document.isDirty, false);
  });

  test("定義色ペアは両方有効な時だけ先頭一致行に適用する", async () => {
    host.dispose();
    host = new CharacterizationHost({
      jpx: {
        type: "row_background_fixture",
        name: "行背景試験",
        files: [
          {
            file_type: "rows",
            name: "行背景",
            finame_pattern: ".*",
            rows: [
              {
                name: "同名",
                condition: "^A",
                backgroundColor: { light: "#AaBbCc", dark: "#11223344" },
                fields: [{ name: "優先", length: 2, type: "C" }],
              },
              {
                name: "同名",
                condition: "^A",
                backgroundColor: { light: "#010203", dark: "#040506" },
                fields: [{ name: "後続", length: 1, type: "C" }],
              },
              {
                name: "項目なし",
                condition: "^B",
                backgroundColor: { light: "#abcdef", dark: "#12345678" },
                fields: [],
              },
              {
                name: "片方不正",
                condition: "^C",
                backgroundColor: { light: "#12345g", dark: "#123456" },
                fields: [],
              },
              {
                name: "省略",
                condition: "^D",
                fields: [
                  { name: "無色項目", length: 1, type: "C" },
                  { name: "無色交互項目", length: 1, type: "C" },
                ],
              },
              {
                name: "桁数不正",
                condition: "^E",
                backgroundColor: { light: "#123456", dark: "#12345" },
                fields: [],
              },
            ],
          },
        ],
      },
    });
    host.start();
    const editor = host.createEditor("colors.txt", [
      "A",
      "B",
      "C",
      "DD",
      "E",
      "",
      "   ",
      "Z",
    ]);
    host.setActiveEditor(editor);
    await host.chooseFileType("行背景試験/行背景");

    const expectedBackgrounds = [
      { line: 0, light: "#AaBbCc", dark: "#11223344" },
      { line: 1, light: "#abcdef", dark: "#12345678" },
    ];
    const backgrounds = () =>
      rowBackgroundRows(editor).sort((left, right) => left.line - right.line);
    assert.deepStrictEqual(backgrounds(), expectedBackgrounds);
    const hover = optionsForLine(editor, 0)[0].hoverMessage;
    assert.ok(hover);
    assert.ok(hover.value.includes("優先"));
    assert.deepStrictEqual(optionsForLine(editor, 1), []);
    host.setConfiguration("colors.txt", { boundaryStyle: "alternating" });
    await host.waitForAnalysis();
    host.setSelection(editor, 3, 0);
    const uncoloredCursor = cursorDecorationCall(editor);
    assert.ok(uncoloredCursor);
    assert.strictEqual(
      (uncoloredCursor.type.options as { border?: string }).border,
      undefined,
    );
    const uncoloredAlternating = fieldDecorationCalls(editor)
      .filter(
        ({ type }) =>
          decorationThemeColor(type) === "editor.rangeHighlightBackground",
      )
      .find(({ options }) =>
        options.some(({ range }) => range.start.line === 3),
      );
    assert.ok(uncoloredAlternating);
    assert.strictEqual(
      (uncoloredAlternating.type.options as { border?: string }).border,
      undefined,
    );
    const diagnostics = host.diagnosticsFor(editor);
    assert.ok(diagnostics);
    assert.deepStrictEqual(
      diagnostics.map(({ code }) => code),
      [
        "INVALID_LENGTH",
        "INVALID_LENGTH",
        "INVALID_LENGTH",
        "INVALID_LENGTH",
        "UNKNOWN_RECORD",
      ],
    );

    host.setConfiguration("colors.txt", { validationEnabled: false });
    await host.waitForAnalysis();
    assert.deepStrictEqual(host.diagnosticsFor(editor), []);
    assert.deepStrictEqual(backgrounds(), expectedBackgrounds);
  });

  test("総合振込の行背景は表示範囲、分割、編集、形式切替に追従する", async () => {
    const lines = Array.from({ length: 52 }, () => "X");
    lines[0] = `1${"0".repeat(119)}`;
    lines[1] = `2${"x".repeat(111)} `;
    lines[2] = `2${"x".repeat(111)}Y `;
    lines[50] = "8";
    lines[51] = "9";
    const uri = "file:///50200121.sougou_furikomi.dat";
    const editor = host.createEditor(
      "50200121.sougou_furikomi.dat",
      lines,
      uri,
    );
    host.setActiveEditor(editor);
    await host.chooseFileType(zenginGeneralTransfer);

    const expected = [
      { line: 0, light: "#5CA5EA40", dark: "#284B7140" },
      { line: 1, light: "#E8B05C40", dark: "#694F2740" },
      { line: 2, light: "#A887DD40", dark: "#46365E40" },
      { line: 50, light: "#64BC8040", dark: "#285B3D40" },
      { line: 51, light: "#96969640", dark: "#55555540" },
    ];
    const sortedBackgrounds = (target: FakeEditor) =>
      rowBackgroundRows(target).sort((left, right) => left.line - right.line);
    assert.deepStrictEqual(sortedBackgrounds(editor), expected);
    currentRowBackgroundCalls(editor).forEach((call) => {
      const options = call.type.options as {
        isWholeLine: boolean;
        light: { backgroundColor: string };
        dark: { backgroundColor: string };
      };
      assert.strictEqual(options.isWholeLine, true);
      assert.ok(options.light.backgroundColor.startsWith("#"));
      assert.ok(options.dark.backgroundColor.startsWith("#"));
    });
    assert.deepStrictEqual(
      rowBackgroundOptionsForLine(editor, 50).map(({ range }) => ({
        start: range.start.character,
        end: range.end.character,
      })),
      [{ start: 0, end: 1 }],
    );

    const backgroundCallsBeforeUpdate = rowBackgroundDecorationCalls(editor);
    host.setConfiguration(uri, { boundaryStyle: "alternating" });
    await host.waitForAnalysis();
    const updatedBackgroundCalls = rowBackgroundDecorationCalls(editor).slice(
      backgroundCallsBeforeUpdate.length,
    );
    assert.strictEqual(updatedBackgroundCalls.length, 5);
    assert.strictEqual(
      new Set(updatedBackgroundCalls.map(({ type }) => type)).size,
      updatedBackgroundCalls.length,
    );
    const cursorCall = cursorDecorationCall(editor);
    assert.ok(cursorCall);
    const cursorBorder = cursorCall.type.options as {
      border?: string;
      borderColor?: { id?: string };
    };
    assert.strictEqual(cursorBorder.border, "1px solid");
    assert.ok(cursorBorder.borderColor);
    assert.strictEqual(
      cursorBorder.borderColor.id,
      "editor.wordHighlightStrongBorder",
    );
    const alternatingCall = fieldDecorationCalls(editor)
      .filter(
        ({ type }) =>
          decorationThemeColor(type) === "editor.rangeHighlightBackground",
      )
      .filter(
        ({ type }) =>
          (type.options as { border?: string }).border === "1px dotted",
      )
      .find(({ options }) =>
        options.some(({ range }) => range.start.line === 0),
      );
    assert.ok(alternatingCall);
    const alternatingOnFirstLine = alternatingCall.options.filter(
      ({ range }) => range.start.line === 0,
    );
    assert.ok(
      alternatingOnFirstLine.some(
        ({ renderOptions }) => renderOptions === undefined,
      ),
    );

    const encodingCalls = host.encodeCallCount;
    host.setVisibleRanges(editor, [
      new FakeRange(new FakePosition(0, 0), new FakePosition(0, 0)),
    ]);
    const split = host.createEditor("50200121.sougou_furikomi.dat", lines, uri);
    host.setVisibleRanges(split, [
      new FakeRange(new FakePosition(51, 0), new FakePosition(51, 0)),
    ]);
    host.setVisibleEditors([editor, split]);
    assert.deepStrictEqual(
      sortedBackgrounds(editor).map(({ line }) => line),
      [0, 1, 2],
    );
    assert.deepStrictEqual(
      sortedBackgrounds(split).map(({ line }) => line),
      [50, 51],
    );
    const [editorBackground] = currentRowBackgroundCalls(editor);
    const [splitBackground] = currentRowBackgroundCalls(split);
    assert.notStrictEqual(editorBackground.type, splitBackground.type);
    assert.strictEqual(host.encodeCallCount, encodingCalls);

    await host.chooseFileType(zenginGeneralTransfer);
    assert.strictEqual(editorBackground.type.disposeCount, 0);
    assert.deepStrictEqual(
      sortedBackgrounds(editor).map(({ line }) => line),
      [0, 1, 2],
    );

    const updatedLines = [...lines];
    updatedLines[50] = "X";
    host.changeDocument(editor, updatedLines);
    await host.waitForPendingRender();
    assert.deepStrictEqual(
      sortedBackgrounds(editor).map(({ line }) => line),
      [0, 1, 2],
    );
    assert.deepStrictEqual(
      sortedBackgrounds(split).map(({ line }) => line),
      [51],
    );

    const editorTypes = currentRowBackgroundCalls(editor).map(
      ({ type }) => type,
    );
    const splitTypes = currentRowBackgroundCalls(split).map(({ type }) => type);
    await host.chooseFileType(zenginAccount);
    assert.ok(editorTypes.every((type) => type.disposeCount === 1));
    assert.ok(splitTypes.every((type) => type.disposeCount === 1));
    assert.ok(sortedBackgrounds(editor).some(({ line }) => line === 0));
    assert.ok(sortedBackgrounds(editor).every(({ line }) => line !== 50));
    assert.ok(sortedBackgrounds(split).some(({ line }) => line === 51));
    assert.ok(sortedBackgrounds(split).every(({ line }) => line !== 50));
  });

  test("NTTダイヤル形式の6種、BOM付きサンプル、請求番号、境界とN型を確認する", async () => {
    const definition = loadBuiltInDefinitions().find(
      ({ fileType }) => fileType === nttDialFileType,
    );
    assert.ok(definition);
    assert.deepStrictEqual(
      {
        name: definition.name,
        encoding: definition.encoding,
        lengthUnit: definition.lengthUnit,
      },
      {
        name: nttDialMeisai,
        encoding: "utf8bom",
        lengthUnit: "byte",
      },
    );
    assert.strictEqual(definition.rows.length, 6);
    assert.deepStrictEqual(
      definition.rows.map((row) =>
        row.fields?.reduce((total, field) => total + field.length, 0),
      ),
      [128, 128, 128, 128, 128, 128],
    );
    assert.strictEqual(
      definition.fileNamePattern.test("M1234567890_202609"),
      true,
    );
    assert.strictEqual(
      definition.fileNamePattern.test("M123456789012_202609"),
      true,
    );
    assert.strictEqual(
      definition.fileNamePattern.test("M12345678901_202609"),
      false,
    );
    assert.strictEqual(
      definition.fileNamePattern.test("M123456789_202609"),
      false,
    );
    assert.strictEqual(
      definition.fileNamePattern.test("M123456789012_202609.dat"),
      false,
    );

    const samplePath = path.resolve(
      __dirname,
      "../../sample/ntt/M000000000001_202609",
    );
    const sampleBytes = readFileSync(samplePath);
    assert.deepStrictEqual([...sampleBytes.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
    const sampleText = sampleBytes.toString("utf8").replace(/^\uFEFF/u, "");
    assert.strictEqual(sampleText.endsWith("\r\n"), true);
    assert.strictEqual(sampleText.replace(/\r\n/gu, "").includes("\n"), false);
    const sampleLines = sampleText.split("\r\n");
    assert.strictEqual(sampleLines.pop(), "");
    assert.strictEqual(sampleLines.length, 6);
    assert.deepStrictEqual(
      sampleLines.map((line) => Buffer.byteLength(line, "utf8")),
      [128, 128, 128, 128, 128, 128],
    );

    const openFile = async (fileName: string, lines: string[]) => {
      const editor = host.createEditor(fileName, lines);
      host.setActiveEditor(editor);
      await host.chooseFileType(nttDialMeisai);
      await host.waitForAnalysis();
      return editor;
    };
    const sampleEditor = await openFile("M000000000001_202609", sampleLines);
    assert.strictEqual(sampleEditor.document.encoding, "utf8bom");
    assert.strictEqual(sampleEditor.document.isDirty, false);
    assert.strictEqual(sampleEditor.document.getText(), sampleLines.join("\n"));
    assert.deepStrictEqual(host.diagnosticsFor(sampleEditor), []);
    assert.deepStrictEqual(
      sampleLines.map((_, index) => [
        ...new Set(rowNames(sampleEditor, index)),
      ]),
      [
        ["共通管理レコード"],
        ["電番管理レコード"],
        ["通話明細レコード"],
        ["電番合計レコード"],
        ["割引情報レコード"],
        ["終了レコード"],
      ],
    );
    assert.strictEqual(
      optionsForLine(sampleEditor, 0)[1].range.end.character,
      13,
    );
    assert.strictEqual(
      optionsForLine(sampleEditor, 0)[1].hoverMessage?.value,
      "**共通管理レコード / お客様番号 (項目 2)**  \n位置: 2 - 13 (12バイト)\nデータ型: C",
    );

    const tenDigitCustomer = "  1234567890";
    const tenDigitLines = sampleLines.map((line, index) =>
      index < 5
        ? `${line.slice(0, 1)}${tenDigitCustomer}${line.slice(13)}`
        : line,
    );
    const tenDigitEditor = await openFile("M1234567890_202609", tenDigitLines);
    assert.strictEqual(
      tenDigitEditor.document.lineAt(0).text.slice(1, 13),
      tenDigitCustomer,
    );
    assert.deepStrictEqual(host.diagnosticsFor(tenDigitEditor), []);

    const callRecord = sampleLines[2];
    assert.ok(callRecord);
    const assertIssue = async (
      fileName: string,
      line: string,
      code: string,
    ) => {
      const editor = await openFile(fileName, [line]);
      assert.deepStrictEqual(
        host.diagnosticsFor(editor)?.map((diagnostic) => diagnostic.code),
        [code],
      );
      assert.strictEqual(editor.document.getText(), line);
      assert.strictEqual(editor.document.isDirty, false);
    };
    await assertIssue(
      "M000000000001_unknown",
      `7${" ".repeat(127)}`,
      "UNKNOWN_RECORD",
    );
    await assertIssue(
      "M000000000001_short",
      callRecord.slice(0, -1),
      "INVALID_LENGTH",
    );
    await assertIssue("M000000000001_long", `${callRecord} `, "INVALID_LENGTH");
    await assertIssue(
      "M000000000001_invalid-n",
      `${callRecord.slice(0, 74)}X${callRecord.slice(75)}`,
      "INVALID_TYPE",
    );
    await assertIssue(
      "M000000000001_mixed-n",
      `${callRecord.slice(0, 74)}0000001 23${callRecord.slice(84)}`,
      "INVALID_TYPE",
    );
    const blankNumeric = `${callRecord.slice(0, 74)}${" ".repeat(10)}${callRecord.slice(84)}`;
    const blankNumericEditor = await openFile("M000000000001_blank-n", [
      blankNumeric,
    ]);
    assert.deepStrictEqual(host.diagnosticsFor(blankNumericEditor), []);
  });

  test("NTT専用線形式の8種9コード、会社別トレーラ、BOM、700バイト境界と診断を確認する", async () => {
    const definition = loadBuiltInDefinitions().find(
      ({ fileType }) => fileType === nttLeasedLineFileType,
    );
    assert.ok(definition);
    assert.deepStrictEqual(
      {
        name: definition.name,
        encoding: definition.encoding,
        lengthUnit: definition.lengthUnit,
      },
      {
        name: nttLeasedLineMeisai,
        encoding: "utf8bom",
        lengthUnit: "byte",
      },
    );
    assert.deepStrictEqual(
      definition.rows.map((row) => row.condition.source),
      ["^01", "^11", "^12", "^13", "^14", "^15", "^21", "^81", "^91"],
    );
    assert.deepStrictEqual(
      definition.rows.map((row) => row.fields?.length),
      [5, 9, 30, 18, 18, 18, 18, 8, 5],
    );
    const amountFields = [
      ["合計金額", 12, "N"],
      ["基本回線専用料", 12, "N"],
      ["分岐回線専用料", 12, "N"],
      ["分岐料", 12, "N"],
      ["多重アクセス減額料", 12, "N"],
      ["高額利用割引額", 12, "N"],
      ["機械専用料", 12, "N"],
      ["配線設備専用料", 12, "N"],
      ["回線終端装置専用料", 12, "N"],
      ["その他専用料", 12, "N"],
      ["日割額", 12, "N"],
      ["工事に関する費用", 12, "N"],
      ["加減算額", 12, "N"],
      ["消費税相当額", 12, "N"],
      ["延滞利息", 12, "N"],
    ] as const;
    const trailerFields = [
      ["レコード区分", 2, "C"],
      ...amountFields,
      ["回線数計", 7, "N"],
      ["予備", 511, "C"],
    ] as const;
    assert.deepStrictEqual(
      definition.rows.map((row) =>
        row.fields?.map(({ name, length, type }) => [name, length, type]),
      ),
      [
        [
          ["レコード区分", 2, "C"],
          ["お客様番号", 12, "C"],
          ["請求年月", 6, "C"],
          ["網識別コード", 1, "C"],
          ["予備", 679, "C"],
        ],
        [
          ["レコード区分", 2, "C"],
          ["計上事業所コード", 8, "C"],
          ["企業等コード", 7, "C"],
          ["付加コード", 5, "C"],
          ["会社識別コード", 1, "C"],
          ["作成年月日", 8, "C"],
          ["請求年月", 6, "C"],
          ["支払い期限", 8, "C"],
          ["予備", 655, "C"],
        ],
        [
          ["レコード区分", 2, "C"],
          ["回線ＩＤ", 9, "C"],
          ["地域区分コード", 2, "C"],
          ["会社識別コード", 1, "C"],
          ["申込内容", 33, "C"],
          ["開通年月日", 8, "C"],
          ["承諾年月日", 8, "C"],
          ["承諾番号", 11, "C"],
          ["回線名：上位事業所名", 75, "C"],
          ["回線名：下位事業所名", 75, "C"],
          ["回線名：分岐名", 75, "C"],
          ["回線名：分類名", 75, "C"],
          ["回線名：回線番号", 5, "C"],
          ["回線名：回線種類", 75, "C"],
          ["回線名：回線符号コード", 3, "C"],
          ["お客様管理番号", 75, "C"],
          ["合計金額", 12, "N"],
          ["基本回線料", 12, "N"],
          ["分岐回線料", 12, "N"],
          ["分岐料", 12, "N"],
          ["多重アクセス減額料", 12, "N"],
          ["高額利用割引額", 12, "N"],
          ["機械専用料", 12, "N"],
          ["配線設備専用料", 12, "N"],
          ["回線終端装置専用料", 12, "N"],
          ["その他専用料", 12, "N"],
          ["日割額", 12, "N"],
          ["工事に関する費用", 12, "N"],
          ["加減算額", 12, "N"],
          ["消費税相当額", 12, "N"],
        ],
        trailerFields,
        trailerFields,
        trailerFields,
        trailerFields,
        [
          ["レコード区分", 2, "C"],
          ["お客様番号", 12, "C"],
          ["金融機関コード", 7, "C"],
          ["口座区分", 1, "C"],
          ["口座番号", 7, "C"],
          ["請求金額", 11, "N"],
          ["請求件数", 5, "N"],
          ["予備", 655, "C"],
        ],
        [
          ["レコード区分", 2, "C"],
          ["お客様番号", 12, "C"],
          ["総合計請求額", 11, "N"],
          ["総合計請求件数", 5, "N"],
          ["予備", 670, "C"],
        ],
      ],
    );
    assert.deepStrictEqual(
      definition.rows.map((row) =>
        row.fields?.reduce((total, field) => total + field.length, 0),
      ),
      Array.from({ length: 9 }, () => 700),
    );
    assert.strictEqual(
      definition.fileNamePattern.test("S1234567890_202609"),
      true,
    );
    assert.strictEqual(
      definition.fileNamePattern.test("S123456789_202609"),
      false,
    );
    assert.strictEqual(
      definition.fileNamePattern.test("S12345678901_202609"),
      false,
    );
    assert.strictEqual(
      definition.fileNamePattern.test("S1234567890_202609.dat"),
      false,
    );

    const samplePath = path.resolve(
      __dirname,
      "../../sample/ntt/S0000000001_202609",
    );
    const sampleBytes = readFileSync(samplePath);
    assert.deepStrictEqual([...sampleBytes.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
    const sampleText = sampleBytes.toString("utf8").replace(/^\uFEFF/u, "");
    assert.strictEqual(sampleText.endsWith("\r\n"), true);
    assert.strictEqual(sampleText.replace(/\r\n/gu, "").includes("\n"), false);
    const sampleLines = sampleText.split("\r\n");
    assert.strictEqual(sampleLines.pop(), "");
    assert.strictEqual(sampleLines.length, 12);
    assert.deepStrictEqual(sampleLines, createLeasedLineSmokeLines());
    assert.deepStrictEqual(
      sampleLines.map((line) => Buffer.byteLength(line, "utf8")),
      Array.from({ length: 12 }, () => 700),
    );
    assert.deepStrictEqual(
      sampleLines.map((line) => line.slice(0, 2)),
      ["01", "11", "12", "13", "11", "12", "13", "14", "15", "21", "81", "91"],
    );
    const detailLines = sampleLines.filter((line) => line.startsWith("12"));
    assert.deepStrictEqual(
      detailLines.map((line) => leasedLineNumber(line, 532)),
      [13, 13],
    );
    const expectedDetailAmounts = [13, ...Array.from({ length: 12 }, () => 0)];
    assert.deepStrictEqual(
      detailLines.map((line) =>
        Array.from({ length: 13 }, (_, index) =>
          leasedLineNumber(line, 544 + index * 12),
        ),
      ),
      [expectedDetailAmounts, expectedDetailAmounts],
    );

    const officeDetails = ["1", "2"].map((companyCode) =>
      detailLines.filter((line) => line.slice(13, 14) === companyCode),
    );
    assert.deepStrictEqual(
      officeDetails.map((lines) => lines.length),
      [1, 1],
    );
    const officeTotals = sampleLines.filter((line) => line.startsWith("13"));
    assert.strictEqual(officeTotals.length, 2);
    officeTotals.forEach((line, index) => {
      const details = officeDetails[index];
      assert.ok(details);
      assertLeasedLineSummaryMatches(line, details);
    });

    const eastCompanyTotal = sampleLines.find((line) => line.startsWith("14"));
    const westCompanyTotal = sampleLines.find((line) => line.startsWith("15"));
    const endTotal = sampleLines.find((line) => line.startsWith("21"));
    const [eastDetails, westDetails] = officeDetails;
    assert.ok(eastCompanyTotal);
    assert.ok(westCompanyTotal);
    assert.ok(endTotal);
    assert.ok(eastDetails);
    assert.ok(westDetails);
    assertLeasedLineSummaryMatches(eastCompanyTotal, eastDetails);
    assertLeasedLineSummaryMatches(westCompanyTotal, westDetails);
    assertLeasedLineSummaryMatches(endTotal, detailLines);

    const detailTotal = detailLines.reduce(
      (total, line) => total + leasedLineNumber(line, 532),
      0,
    );
    const billingTotals = [
      ["81", 29, 40],
      ["91", 14, 25],
    ] as const;
    billingTotals.forEach(([recordType, totalOffset, countOffset]) => {
      const summary = sampleLines.find((line) => line.startsWith(recordType));
      assert.ok(summary);
      assert.strictEqual(
        leasedLineNumber(summary, totalOffset, 11),
        detailTotal,
      );
      assert.strictEqual(
        leasedLineNumber(summary, countOffset, 5),
        detailLines.length,
      );
    });

    const openFile = async (fileName: string, lines: string[]) => {
      const editor = host.createEditor(fileName, lines);
      host.setActiveEditor(editor);
      await host.chooseFileType(nttLeasedLineMeisai);
      await host.waitForAnalysis();
      return editor;
    };
    const sampleEditor = await openFile("S0000000001_202609", sampleLines);
    assert.strictEqual(sampleEditor.document.encoding, "utf8bom");
    assert.strictEqual(sampleEditor.document.isDirty, false);
    assert.strictEqual(sampleEditor.document.getText(), sampleLines.join("\n"));
    assert.deepStrictEqual(host.diagnosticsFor(sampleEditor), []);
    assert.deepStrictEqual(
      sampleLines.map((_, index) => [
        ...new Set(rowNames(sampleEditor, index)),
      ]),
      [
        ["管理レコード"],
        ["ヘッダレコード"],
        ["データレコード（専用線回線番号単位）"],
        ["トレーラレコード（計上事業所単位）"],
        ["ヘッダレコード"],
        ["データレコード（専用線回線番号単位）"],
        ["トレーラレコード（計上事業所単位）"],
        ["会社別トレーラレコード（NTT東日本）"],
        ["会社別トレーラレコード（NTT西日本）"],
        ["エンドレコード（専用線ID単位）"],
        ["請求単位レコード"],
        ["総合計レコード"],
      ],
    );
    assert.deepStrictEqual(
      [
        sampleLines[0]?.slice(2, 14),
        sampleLines[10]?.slice(2, 14),
        sampleLines[11]?.slice(2, 14),
      ],
      Array.from({ length: 3 }, () => "  0000000001"),
    );
    assert.deepStrictEqual(
      [sampleLines[2]?.slice(11, 13), sampleLines[5]?.slice(11, 13)],
      ["25", "25"],
    );
    assert.deepStrictEqual(
      [sampleLines[2]?.slice(13, 14), sampleLines[5]?.slice(13, 14)],
      ["1", "2"],
    );
    const application = optionsForLine(sampleEditor, 2).find((option) =>
      option.hoverMessage?.value.includes("申込内容"),
    );
    assert.ok(application);
    assert.deepStrictEqual(
      {
        start: application.range.start.character,
        end: application.range.end.character,
        hover: application.hoverMessage?.value,
      },
      {
        start: 14,
        end: 25,
        hover:
          "**データレコード（専用線回線番号単位） / 申込内容 (項目 5)**  \n位置: 15 - 47 (33バイト)\nデータ型: C",
      },
    );

    const assertIssue = async (
      fileName: string,
      line: string,
      code: string,
    ) => {
      const editor = await openFile(fileName, [line]);
      assert.deepStrictEqual(
        host.diagnosticsFor(editor)?.map((diagnostic) => diagnostic.code),
        [code],
      );
      assert.strictEqual(editor.document.getText(), line);
      assert.strictEqual(editor.document.isDirty, false);
    };
    const replaceNumericField = (line: string, replacement: string) => {
      const bytes = Buffer.from(line, "utf8");
      const value = Buffer.from(replacement, "ascii");
      return Buffer.concat([
        bytes.subarray(0, 532),
        value,
        bytes.subarray(532 + value.length),
      ]).toString("utf8");
    };
    await assertIssue(
      "S0000000001_unknown",
      `99${" ".repeat(698)}`,
      "UNKNOWN_RECORD",
    );
    const recordByType = new Map(
      sampleLines.map((line) => [line.slice(0, 2), line]),
    );
    for (const [recordType, line] of recordByType) {
      await assertIssue(
        `S0000000001_${recordType}_short`,
        line.slice(0, -1),
        "INVALID_LENGTH",
      );
      await assertIssue(
        `S0000000001_${recordType}_long`,
        `${line} `,
        "INVALID_LENGTH",
      );
    }
    const dataRecord = sampleLines[2];
    assert.ok(dataRecord);
    await assertIssue(
      "S0000000001_invalid-n",
      replaceNumericField(dataRecord, "X00000000001"),
      "INVALID_TYPE",
    );
    await assertIssue(
      "S0000000001_mixed-n",
      replaceNumericField(dataRecord, "00000001 001"),
      "INVALID_TYPE",
    );
    const blankNumeric = replaceNumericField(dataRecord, " ".repeat(12));
    const blankNumericEditor = await openFile("S0000000001_blank-n", [
      blankNumeric,
    ]);
    assert.deepStrictEqual(host.diagnosticsFor(blankNumericEditor), []);
  });

  test("NTT電話番号別形式の初回・継続、合計、UTF-8境界と診断を確認する", async () => {
    const definition = loadBuiltInDefinitions().find(
      ({ fileType }) => fileType === nttTelephoneFileType,
    );
    assert.ok(definition);
    assert.deepStrictEqual(
      {
        name: definition.name,
        encoding: definition.encoding,
        lengthUnit: definition.lengthUnit,
      },
      {
        name: nttTelephoneMeisai,
        encoding: "utf8bom",
        lengthUnit: "byte",
      },
    );
    assert.strictEqual(definition.rows.length, 6);
    assert.deepStrictEqual(
      definition.rows.map((row) => row.fields?.length),
      [5, 94, 89, 15, 86, 5],
    );
    assert.deepStrictEqual(
      definition.rows.map((row) =>
        row.fields?.reduce((total, field) => total + field.length, 0),
      ),
      [512, 512, 512, 512, 512, 512],
    );
    assert.strictEqual(
      definition.fileNamePattern.test("K1234567890_202609"),
      true,
    );
    assert.strictEqual(
      definition.fileNamePattern.test("K123456789012_202609"),
      true,
    );
    assert.strictEqual(
      definition.fileNamePattern.test("K12345678901_202609"),
      false,
    );
    assert.strictEqual(
      definition.fileNamePattern.test("K123456789_202609"),
      false,
    );
    assert.strictEqual(
      definition.fileNamePattern.test("K123456789012_202609.dat"),
      false,
    );

    const samplePath = path.resolve(
      __dirname,
      "../../sample/ntt/K000000000001_202609",
    );
    const sampleBytes = readFileSync(samplePath);
    assert.deepStrictEqual([...sampleBytes.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
    const sampleText = sampleBytes.toString("utf8").replace(/^\uFEFF/u, "");
    assert.strictEqual(sampleText.endsWith("\r\n"), true);
    assert.strictEqual(sampleText.replace(/\r\n/gu, "").includes("\n"), false);
    const sampleLines = sampleText.split("\r\n");
    assert.strictEqual(sampleLines.pop(), "");
    assert.strictEqual(sampleLines.length, 6);
    assert.deepStrictEqual(sampleLines, createTelephoneSmokeLines());
    assert.deepStrictEqual(
      sampleLines.map((line) => Buffer.byteLength(line, "utf8")),
      [512, 512, 512, 512, 512, 512],
    );
    const firstTelephoneRecord = sampleLines[1];
    const continuedTelephoneRecord = sampleLines[2];
    const firstTotalRecord = sampleLines[3];
    const continuedTotalRecord = sampleLines[4];
    const overallTotalRecord = sampleLines[5];
    assert.ok(firstTelephoneRecord);
    assert.ok(continuedTelephoneRecord);
    assert.ok(firstTotalRecord);
    assert.ok(continuedTotalRecord);
    assert.ok(overallTotalRecord);
    assert.strictEqual(
      firstTelephoneRecord.slice(0, 10),
      continuedTelephoneRecord.slice(0, 10),
    );
    assert.deepStrictEqual(
      [
        firstTelephoneRecord.slice(14, 18),
        continuedTelephoneRecord.slice(14, 18),
        firstTotalRecord.slice(14, 18),
        continuedTotalRecord.slice(14, 18),
      ],
      ["0102", "0202", "0102", "0202"],
    );
    assert.strictEqual(Number(firstTotalRecord.slice(63, 71)), 1);
    assert.strictEqual(Number(overallTotalRecord.slice(26, 34)), 1);
    assert.strictEqual(firstTelephoneRecord.slice(52, 63), "00000004567");
    assert.strictEqual(firstTotalRecord.slice(52, 63), "00000004567");
    const breakdownTotal = (line: string) =>
      Array.from({ length: 16 }, (_, index) =>
        Number(line.slice(70 + index * 20, 81 + index * 20)),
      ).reduce((total, amount) => total + amount, 0);
    assert.strictEqual(breakdownTotal(firstTelephoneRecord), 4567);
    assert.strictEqual(breakdownTotal(continuedTotalRecord), 4567);
    assert.strictEqual(continuedTotalRecord.slice(12, 18), "510202");

    const openFile = async (fileName: string, lines: string[]) => {
      const editor = host.createEditor(fileName, lines);
      host.setActiveEditor(editor);
      await host.chooseFileType(nttTelephoneMeisai);
      await host.waitForAnalysis();
      return editor;
    };
    const sampleEditor = await openFile("K000000000001_202609", sampleLines);
    assert.strictEqual(sampleEditor.document.encoding, "utf8bom");
    assert.strictEqual(sampleEditor.document.isDirty, false);
    assert.strictEqual(sampleEditor.document.getText(), sampleLines.join("\n"));
    assert.deepStrictEqual(host.diagnosticsFor(sampleEditor), []);
    assert.deepStrictEqual(
      sampleLines.map((_, index) => [
        ...new Set(rowNames(sampleEditor, index)),
      ]),
      [
        ["管理レコード"],
        ["電話番号別内訳レコード（初回）"],
        ["電話番号別内訳レコード（継続）"],
        ["お客様番号合計レコード（初回）"],
        ["お客様番号合計レコード（継続）"],
        ["総合計レコード"],
      ],
    );

    const signedAmount = optionsForLine(sampleEditor, 1).find((option) =>
      option.hoverMessage?.value.includes("内訳額（1）"),
    );
    assert.ok(signedAmount);
    assert.match(
      signedAmount.hoverMessage?.value ?? "",
      /データ型: 符号付き数値/u,
    );
    const accountName = optionsForLine(sampleEditor, 3).find((option) =>
      option.hoverMessage?.value.includes("口座名義"),
    );
    assert.ok(accountName);
    assert.deepStrictEqual(
      [
        accountName.range.start.character,
        accountName.range.end.character,
        accountName.hoverMessage?.value.includes("(120バイト)"),
      ],
      [85, 125, true],
    );
    const recipientName = optionsForLine(sampleEditor, 3).find((option) =>
      option.hoverMessage?.value.includes("氏名"),
    );
    assert.ok(recipientName);
    assert.deepStrictEqual(
      [
        recipientName.range.start.character,
        recipientName.range.end.character,
        recipientName.hoverMessage?.value.includes("(150バイト)"),
      ],
      [125, 175, true],
    );

    const continuedAmountOptions = optionsForLine(sampleEditor, 4);
    const firstContinuedAmount = continuedAmountOptions.find((option) =>
      option.hoverMessage?.value.includes("内訳額（1）"),
    );
    const lastContinuedAmount = continuedAmountOptions.find((option) =>
      option.hoverMessage?.value.includes("内訳額（16）"),
    );
    assert.ok(firstContinuedAmount);
    assert.ok(lastContinuedAmount);
    assert.deepStrictEqual(
      [
        firstContinuedAmount.range.start.character,
        firstContinuedAmount.range.end.character,
        firstContinuedAmount.hoverMessage?.value.includes(
          "データ型: 符号付き数値",
        ),
        continuedTotalRecord.slice(70, 81),
      ],
      [70, 81, true, "-0000000123"],
    );
    assert.deepStrictEqual(
      [
        lastContinuedAmount.range.start.character,
        lastContinuedAmount.range.end.character,
        lastContinuedAmount.hoverMessage?.value.includes(
          "データ型: 符号付き数値",
        ),
        continuedTotalRecord.slice(370, 381),
      ],
      [370, 381, true, "00000000000"],
    );

    const tenDigitCustomer = "  1234567890";
    const customerFieldOffsets = [0, 18, 18, 0, 0, 0] as const;
    const tenDigitLines = sampleLines.map((line, index) => {
      const offset = customerFieldOffsets[index]!;
      return `${line.slice(0, offset)}${tenDigitCustomer}${line.slice(offset + 12)}`;
    });
    assert.strictEqual(tenDigitLines.length, 6);
    assert.deepStrictEqual(
      tenDigitLines.map((line, index) => {
        const offset = customerFieldOffsets[index]!;
        return line.slice(offset, offset + 12);
      }),
      Array.from({ length: 6 }, () => tenDigitCustomer),
    );
    assert.deepStrictEqual(
      tenDigitLines.map((line) => Buffer.byteLength(line, "utf8")),
      [512, 512, 512, 512, 512, 512],
    );
    const tenDigitEditor = await openFile("K1234567890_202609", tenDigitLines);
    assert.deepStrictEqual(host.diagnosticsFor(tenDigitEditor), []);

    const assertIssue = async (
      fileName: string,
      line: string,
      code: string,
    ) => {
      const editor = await openFile(fileName, [line]);
      assert.deepStrictEqual(
        host.diagnosticsFor(editor)?.map((diagnostic) => diagnostic.code),
        [code],
      );
      assert.strictEqual(editor.document.getText(), line);
      assert.strictEqual(editor.document.isDirty, false);
    };
    const assertSelectedRow = async (
      fileName: string,
      line: string,
      expectedRow: string,
    ) => {
      const editor = await openFile(fileName, [line]);
      assert.deepStrictEqual(host.diagnosticsFor(editor), []);
      assert.deepStrictEqual([...new Set(rowNames(editor, 0))], [expectedRow]);
      assert.strictEqual(editor.document.getText(), line);
      assert.strictEqual(editor.document.isDirty, false);
    };
    const withRecordNumber = (line: string, number: string) =>
      `${line.slice(0, 14)}${number}${line.slice(16)}`;
    await assertSelectedRow(
      "K000000000001_11_02",
      withRecordNumber(continuedTelephoneRecord, "02"),
      "電話番号別内訳レコード（継続）",
    );
    await assertSelectedRow(
      "K000000000001_11_03",
      withRecordNumber(continuedTelephoneRecord, "03"),
      "電話番号別内訳レコード（継続）",
    );
    await assertSelectedRow(
      "K000000000001_11_99",
      withRecordNumber(continuedTelephoneRecord, "99"),
      "電話番号別内訳レコード（継続）",
    );
    await assertSelectedRow(
      "K000000000001_51_02",
      withRecordNumber(continuedTotalRecord, "02"),
      "お客様番号合計レコード（継続）",
    );
    await assertSelectedRow(
      "K000000000001_51_03",
      withRecordNumber(continuedTotalRecord, "03"),
      "お客様番号合計レコード（継続）",
    );
    await assertSelectedRow(
      "K000000000001_51_99",
      withRecordNumber(continuedTotalRecord, "99"),
      "お客様番号合計レコード（継続）",
    );
    const adminRecord = sampleLines[0];
    const firstDetail = sampleLines[1];
    assert.ok(adminRecord);
    assert.ok(firstDetail);
    await assertIssue(
      "K000000000001_unknown",
      `${adminRecord.slice(0, 12)}99${adminRecord.slice(14)}`,
      "UNKNOWN_RECORD",
    );
    await assertIssue(
      "K000000000001_11_00",
      withRecordNumber(continuedTelephoneRecord, "00"),
      "UNKNOWN_RECORD",
    );
    await assertIssue(
      "K000000000001_11_0A",
      withRecordNumber(continuedTelephoneRecord, "0A"),
      "UNKNOWN_RECORD",
    );
    await assertIssue(
      "K000000000001_51_00",
      withRecordNumber(continuedTotalRecord, "00"),
      "UNKNOWN_RECORD",
    );
    await assertIssue(
      "K000000000001_51_0A",
      withRecordNumber(continuedTotalRecord, "0A"),
      "UNKNOWN_RECORD",
    );
    await assertIssue(
      "K000000000001_short",
      adminRecord.slice(0, -1),
      "INVALID_LENGTH",
    );
    await assertIssue(
      "K000000000001_long",
      `${adminRecord} `,
      "INVALID_LENGTH",
    );
    await assertIssue(
      "K000000000001_invalid-n",
      `${firstDetail.slice(0, 52)}X${firstDetail.slice(53)}`,
      "INVALID_TYPE",
    );
    await assertIssue(
      "K000000000001_mixed-n",
      `${firstDetail.slice(0, 52)}00000045 67${firstDetail.slice(63)}`,
      "INVALID_TYPE",
    );
    const blankAmount = `${firstDetail.slice(0, 52)}${" ".repeat(11)}${firstDetail.slice(63)}`;
    const blankAmountEditor = await openFile("K000000000001_blank-n", [
      blankAmount,
    ]);
    assert.deepStrictEqual(host.diagnosticsFor(blankAmountEditor), []);

    const totalInitial = sampleLines[3];
    assert.ok(totalInitial);
    const invalidBoundaryLine = `${totalInitial.slice(0, 85)}${"A".repeat(119)}ｱ${totalInitial.slice(125, -2)}`;
    assert.strictEqual(Buffer.byteLength(invalidBoundaryLine, "utf8"), 512);
    const switchLines = [...sampleLines];
    switchLines[3] = invalidBoundaryLine;
    const switchEditor = host.createEditor(
      "K000000000001_format-switch",
      switchLines,
    );
    host.setActiveEditor(switchEditor);
    const originalText = switchEditor.document.getText();
    const requestStart = host.openTextDocumentRequests.length;
    let saveCount = 0;
    const saveListener = host.documentSaveEmitter.event(() => {
      saveCount += 1;
    });
    try {
      await host.chooseFileType(jpxFourPrices);
      await host.waitForAnalysis();
      assert.notStrictEqual(switchEditor.document.encoding, "utf8bom");
      assert.strictEqual(switchEditor.document.getText(), originalText);
      assert.strictEqual(switchEditor.document.isDirty, false);

      await host.chooseFileType(nttTelephoneMeisai);
      await host.waitForAnalysis();
      const selectionRequests =
        host.openTextDocumentRequests.slice(requestStart);
      assert.ok(
        selectionRequests.some(({ encoding }) => encoding !== "utf8bom"),
      );
      assert.ok(
        selectionRequests.some(({ encoding }) => encoding === "utf8bom"),
      );
      assert.strictEqual(switchEditor.document.encoding, "utf8bom");
      const boundaryDiagnostics = host.diagnosticsFor(switchEditor);
      assert.ok(boundaryDiagnostics && boundaryDiagnostics.length > 0);
      assert.deepStrictEqual(
        boundaryDiagnostics.map(({ code }) => code),
        [
          "INVALID_BYTE_BOUNDARY",
          "INVALID_BYTE_BOUNDARY",
          "INVALID_BYTE_BOUNDARY",
        ],
      );
      assert.deepStrictEqual(
        [...new Set(rowNames(switchEditor, 3))],
        ["お客様番号合計レコード（初回）"],
      );
      assert.deepStrictEqual(
        sortedRowBackgroundRows(switchEditor).filter(({ line }) => line === 3),
        [{ line: 3, light: "#64BC8040", dark: "#285B3D40" }],
      );
      assert.strictEqual(
        optionsForLine(switchEditor, 3).some((option) =>
          option.hoverMessage?.value.includes("口座名義"),
        ),
        false,
      );
      assert.strictEqual(switchEditor.document.getText(), originalText);
      assert.strictEqual(switchEditor.document.isDirty, false);
      assert.strictEqual(saveCount, 0);
    } finally {
      saveListener.dispose();
    }
  });

  test("NTTひかり電話形式の17内訳、初回・継続、UTF-8境界を確認する", async () => {
    const definition = loadBuiltInDefinitions().find(
      ({ fileType }) => fileType === nttHikariFileType,
    );
    assert.ok(definition);
    assert.deepStrictEqual(
      {
        name: definition.name,
        encoding: definition.encoding,
        lengthUnit: definition.lengthUnit,
      },
      {
        name: nttHikariMeisai,
        encoding: "utf8bom",
        lengthUnit: "byte",
      },
    );
    assert.deepStrictEqual(
      definition.rows.map((row) => row.fields?.length),
      [5, 81, 78, 15, 74, 5],
    );
    assert.deepStrictEqual(
      definition.rows.map((row) =>
        row.fields?.reduce((total, field) => total + field.length, 0),
      ),
      [512, 512, 512, 512, 512, 512],
    );
    assert.strictEqual(
      definition.fileNamePattern.test("N1234567890_202609"),
      true,
    );
    assert.strictEqual(
      definition.fileNamePattern.test("N12345678901_202609"),
      false,
    );
    assert.strictEqual(
      definition.fileNamePattern.test("K1234567890_202609"),
      false,
    );
    assert.strictEqual(
      definition.fileNamePattern.test("N1234567890_202609.dat"),
      false,
    );

    const samplePath = path.resolve(
      __dirname,
      "../../sample/ntt/N0000000001_202609",
    );
    const sampleBytes = readFileSync(samplePath);
    assert.deepStrictEqual([...sampleBytes.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
    const sampleText = sampleBytes.toString("utf8").replace(/^\uFEFF/u, "");
    assert.strictEqual(sampleText.endsWith("\r\n"), true);
    assert.strictEqual(sampleText.replace(/\r\n/gu, "").includes("\n"), false);
    const sampleLines = sampleText.split("\r\n");
    assert.strictEqual(sampleLines.pop(), "");
    assert.strictEqual(sampleLines.length, 6);
    assert.deepStrictEqual(sampleLines, createHikariSmokeLines());
    assert.deepStrictEqual(
      sampleLines.map((line) => Buffer.byteLength(line, "utf8")),
      [512, 512, 512, 512, 512, 512],
    );

    const managementRecord = sampleLines[0];
    const firstDetail = sampleLines[1];
    const continuedDetail = sampleLines[2];
    const firstTotal = sampleLines[3];
    const continuedTotal = sampleLines[4];
    const overallTotal = sampleLines[5];
    assert.ok(managementRecord);
    assert.ok(firstDetail);
    assert.ok(continuedDetail);
    assert.ok(firstTotal);
    assert.ok(continuedTotal);
    assert.ok(overallTotal);
    assert.strictEqual(managementRecord.slice(20, 21), "5");
    assert.strictEqual(firstDetail.slice(31, 33), "03");
    assert.strictEqual(firstDetail.slice(41, 52), "00000004567");
    assert.strictEqual(firstDetail.slice(52, 63), "00000004567");
    assert.strictEqual(firstTotal.slice(41, 52), "00000004567");
    assert.strictEqual(firstTotal.slice(52, 63), "00000004567");
    assert.strictEqual(Number(firstTotal.slice(63, 71)), 1);
    assert.strictEqual(Number(overallTotal.slice(26, 34)), 1);
    assert.strictEqual(firstDetail.slice(69, 80), "-0000000123");
    assert.strictEqual(firstDetail.slice(88, 99), "00000004690");
    assert.strictEqual(continuedTotal.slice(69, 80), "-0000000123");
    assert.strictEqual(continuedTotal.slice(373, 384), "00000000000");

    const openFile = async (fileName: string, lines: string[]) => {
      const editor = host.createEditor(fileName, lines);
      host.setActiveEditor(editor);
      await host.chooseFileType(nttHikariMeisai);
      await host.waitForAnalysis();
      return editor;
    };
    const sampleEditor = await openFile("N0000000001_202609", sampleLines);
    assert.strictEqual(sampleEditor.document.encoding, "utf8bom");
    assert.strictEqual(sampleEditor.document.isDirty, false);
    assert.strictEqual(sampleEditor.document.getText(), sampleLines.join("\n"));
    assert.deepStrictEqual(host.diagnosticsFor(sampleEditor), []);
    const customerNumber = "  0000000001";
    const customerFieldOffsets = [0, 18, 18, 0, 0, 0] as const;
    assert.deepStrictEqual(
      sampleLines.map((line, index) => {
        const offset = customerFieldOffsets[index]!;
        return line.slice(offset, offset + 12);
      }),
      Array.from({ length: 6 }, () => customerNumber),
    );
    assert.deepStrictEqual(
      sampleLines.map((_, index) => {
        const offset = customerFieldOffsets[index]!;
        const option = optionsForLine(sampleEditor, index).find((candidate) =>
          candidate.hoverMessage?.value.includes("お客様番号"),
        );
        assert.ok(option);
        return [
          option.range.start.character,
          option.range.end.character,
          option.hoverMessage?.value.includes(
            `位置: ${offset + 1} - ${offset + 12} (12バイト)`,
          ),
        ];
      }),
      customerFieldOffsets.map((offset) => [offset, offset + 12, true]),
    );
    assert.deepStrictEqual(
      sampleLines.map((_, index) => [
        ...new Set(rowNames(sampleEditor, index)),
      ]),
      [
        ["管理レコード"],
        ["電話番号別内訳レコード（初回）"],
        ["電話番号別内訳レコード（継続）"],
        ["お客様番号合計レコード（初回）"],
        ["お客様番号合計レコード（継続）"],
        ["総合計レコード"],
      ],
    );

    const firstOptions = optionsForLine(sampleEditor, 1);
    const firstAmount = firstOptions.find((option) =>
      option.hoverMessage?.value.includes("内訳額（1）"),
    );
    const seventeenthAmount = firstOptions.find((option) =>
      option.hoverMessage?.value.includes("内訳額（17）"),
    );
    assert.ok(firstAmount);
    assert.ok(seventeenthAmount);
    assert.deepStrictEqual(
      [
        firstAmount.range.start.character,
        firstAmount.range.end.character,
        firstAmount.hoverMessage?.value.includes("データ型: 符号付き数値"),
        seventeenthAmount.range.start.character,
        seventeenthAmount.range.end.character,
      ],
      [69, 80, true, 373, 384],
    );
    const firstTotalCurrentMonth = optionsForLine(sampleEditor, 3).find(
      (option) => option.hoverMessage?.value.includes("通話料・今月分"),
    );
    assert.ok(firstTotalCurrentMonth);
    assert.deepStrictEqual(
      [
        firstTotalCurrentMonth.range.start.character,
        firstTotalCurrentMonth.range.end.character,
        firstTotalCurrentMonth.hoverMessage?.value.includes(
          "位置: 42 - 52 (11バイト)",
        ),
        firstTotalCurrentMonth.hoverMessage?.value.includes("データ型: N"),
      ],
      [41, 52, true, true],
    );
    const accountName = optionsForLine(sampleEditor, 3).find((option) =>
      option.hoverMessage?.value.includes("口座名義"),
    );
    assert.ok(accountName);
    assert.deepStrictEqual(
      [
        accountName.range.start.character,
        accountName.range.end.character,
        accountName.hoverMessage?.value.includes("(120バイト)"),
      ],
      [85, 125, true],
    );

    const assertIssue = async (
      fileName: string,
      line: string,
      code: string,
    ) => {
      const editor = await openFile(fileName, [line]);
      assert.deepStrictEqual(
        host.diagnosticsFor(editor)?.map((diagnostic) => diagnostic.code),
        [code],
      );
      assert.strictEqual(editor.document.getText(), line);
      assert.strictEqual(editor.document.isDirty, false);
    };
    const assertSelectedRow = async (
      fileName: string,
      line: string,
      expectedRow: string,
    ) => {
      const editor = await openFile(fileName, [line]);
      assert.deepStrictEqual(host.diagnosticsFor(editor), []);
      assert.deepStrictEqual([...new Set(rowNames(editor, 0))], [expectedRow]);
      assert.strictEqual(editor.document.getText(), line);
      assert.strictEqual(editor.document.isDirty, false);
    };
    const withRecordNumber = (line: string, number: string) =>
      `${line.slice(0, 14)}${number}${line.slice(16)}`;
    await assertSelectedRow(
      "N0000000001_11_02",
      withRecordNumber(continuedDetail, "02"),
      "電話番号別内訳レコード（継続）",
    );
    await assertSelectedRow(
      "N0000000001_11_03",
      withRecordNumber(continuedDetail, "03"),
      "電話番号別内訳レコード（継続）",
    );
    await assertSelectedRow(
      "N0000000001_11_99",
      withRecordNumber(continuedDetail, "99"),
      "電話番号別内訳レコード（継続）",
    );
    await assertSelectedRow(
      "N0000000001_51_02",
      withRecordNumber(continuedTotal, "02"),
      "お客様番号合計レコード（継続）",
    );
    await assertSelectedRow(
      "N0000000001_51_03",
      withRecordNumber(continuedTotal, "03"),
      "お客様番号合計レコード（継続）",
    );
    await assertSelectedRow(
      "N0000000001_51_99",
      withRecordNumber(continuedTotal, "99"),
      "お客様番号合計レコード（継続）",
    );
    await assertIssue(
      "N0000000001_unknown",
      `${managementRecord.slice(0, 12)}99${managementRecord.slice(14)}`,
      "UNKNOWN_RECORD",
    );
    await assertIssue(
      "N0000000001_11_00",
      withRecordNumber(continuedDetail, "00"),
      "UNKNOWN_RECORD",
    );
    await assertIssue(
      "N0000000001_11_0A",
      withRecordNumber(continuedDetail, "0A"),
      "UNKNOWN_RECORD",
    );
    await assertIssue(
      "N0000000001_51_00",
      withRecordNumber(continuedTotal, "00"),
      "UNKNOWN_RECORD",
    );
    await assertIssue(
      "N0000000001_51_0A",
      withRecordNumber(continuedTotal, "0A"),
      "UNKNOWN_RECORD",
    );
    await assertIssue(
      "N0000000001_short",
      managementRecord.slice(0, -1),
      "INVALID_LENGTH",
    );
    await assertIssue(
      "N0000000001_long",
      `${managementRecord} `,
      "INVALID_LENGTH",
    );
    await assertIssue(
      "N0000000001_invalid-n",
      `${firstDetail.slice(0, 52)}X${firstDetail.slice(53)}`,
      "INVALID_TYPE",
    );
    await assertIssue(
      "N0000000001_51_invalid-n",
      `${firstTotal.slice(0, 41)}X${firstTotal.slice(42)}`,
      "INVALID_TYPE",
    );
    await assertIssue(
      "N0000000001_mixed-n",
      `${firstDetail.slice(0, 52)}00000045 67${firstDetail.slice(63)}`,
      "INVALID_TYPE",
    );
    const blankAmount = `${firstDetail.slice(0, 52)}${" ".repeat(11)}${firstDetail.slice(63)}`;
    const blankAmountEditor = await openFile("N0000000001_blank-n", [
      blankAmount,
    ]);
    assert.deepStrictEqual(host.diagnosticsFor(blankAmountEditor), []);

    const invalidBoundaryLine = `${firstTotal.slice(0, 85)}${"A".repeat(119)}ｱ${firstTotal.slice(125, -2)}`;
    assert.strictEqual(Buffer.byteLength(invalidBoundaryLine, "utf8"), 512);
    const switchedLines = [...sampleLines];
    switchedLines[3] = invalidBoundaryLine;
    const switchEditor = host.createEditor(
      "N0000000001_format-switch",
      switchedLines,
    );
    host.setActiveEditor(switchEditor);
    const originalText = switchEditor.document.getText();
    const requestStart = host.openTextDocumentRequests.length;
    let saveCount = 0;
    const saveListener = host.documentSaveEmitter.event(() => {
      saveCount += 1;
    });
    try {
      await host.chooseFileType(jpxFourPrices);
      await host.waitForAnalysis();
      assert.notStrictEqual(switchEditor.document.encoding, "utf8bom");
      assert.strictEqual(switchEditor.document.getText(), originalText);
      assert.strictEqual(switchEditor.document.isDirty, false);

      await host.chooseFileType(nttHikariMeisai);
      await host.waitForAnalysis();
      const selectionRequests =
        host.openTextDocumentRequests.slice(requestStart);
      assert.ok(
        selectionRequests.some(({ encoding }) => encoding !== "utf8bom"),
      );
      assert.ok(
        selectionRequests.some(({ encoding }) => encoding === "utf8bom"),
      );
      assert.strictEqual(switchEditor.document.encoding, "utf8bom");
      const boundaryDiagnostics = host.diagnosticsFor(switchEditor);
      assert.ok(boundaryDiagnostics && boundaryDiagnostics.length > 0);
      assert.ok(
        boundaryDiagnostics.every(
          ({ code }) => code === "INVALID_BYTE_BOUNDARY",
        ),
      );
      assert.deepStrictEqual(
        [...new Set(rowNames(switchEditor, 3))],
        ["お客様番号合計レコード（初回）"],
      );
      assert.deepStrictEqual(
        sortedRowBackgroundRows(switchEditor).filter(({ line }) => line === 3),
        [{ line: 3, light: "#64BC8040", dark: "#285B3D40" }],
      );
      assert.strictEqual(
        optionsForLine(switchEditor, 3).some((option) =>
          option.hoverMessage?.value.includes("口座名義"),
        ),
        false,
      );
      assert.strictEqual(switchEditor.document.getText(), originalText);
      assert.strictEqual(switchEditor.document.isDirty, false);
      assert.strictEqual(saveCount, 0);
    } finally {
      saveListener.dispose();
    }
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
      assert.deepStrictEqual(
        host.diagnosticsFor(editor),
        [],
        `${fileName} unexpectedly has diagnostics`,
      );
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
    await host.waitForPendingRender();
    assert.deepStrictEqual(host.diagnosticsFor(primary), []);
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
      "**レコード / レコード区分 (項目 1)**  \n位置: 1 - 1 (1バイト)\nデータ型: C",
    );
    assert.strictEqual(
      initialFields.at(-1)?.hoverMessage?.value,
      "**レコード / 予備 (項目 83)**  \n位置: 610 - 657 (48バイト)\nデータ型: C",
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
    await host.waitForAnalysis();
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
    await host.waitForAnalysis();
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
    await host.waitForAnalysis();
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
    await host.waitForAnalysis();
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
    await host.waitForAnalysis();
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
    assert.deepStrictEqual(sortedRowBackgroundRows(general), [
      { line: 0, light: "#E8B05C40", dark: "#694F2740" },
      { line: 1, light: "#A887DD40", dark: "#46365E40" },
    ]);

    const first = host.createEditor("50200003-first.txt", [header("5"), "2"]);
    host.setActiveEditor(first);
    await host.chooseFileType(zenginTransfer);
    const firstType = fieldDecorationCalls(first).at(-1)?.type;
    assert.strictEqual(
      hasRow(first, 1, "データ(通知預金・定期預金・積立定期預金)"),
      true,
    );
    assert.deepStrictEqual(sortedRowBackgroundRows(first), [
      { line: 0, light: "#5CA5EA40", dark: "#284B7140" },
      { line: 1, light: "#E8B05C40", dark: "#694F2740" },
    ]);

    const sameType = host.createEditor("50200003-second.txt", ["2"]);
    host.setActiveEditor(sameType);
    await host.chooseFileType(zenginTransfer);
    assert.deepStrictEqual(optionsForLine(sameType, 0), []);
    assert.deepStrictEqual(sortedRowBackgroundRows(sameType), []);
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
    assert.deepStrictEqual(sortedRowBackgroundRows(otherType), [
      { line: 0, light: "#5CA5EA40", dark: "#284B7140" },
      { line: 1, light: "#E8B05C40", dark: "#694F2740" },
    ]);
    const beforeSwitch = host.reporters[0].events.length;
    host.setActiveEditor(sameType);
    await host.waitForAnalysis();
    assert.deepStrictEqual(optionsForLine(sameType, 0), []);
    const sameTypeHeadHandle = fieldDecorationCalls(sameType).at(-1)?.type;
    assert.strictEqual(sameTypeHandleBeforeForeign?.disposeCount, 1);
    assert.strictEqual(host.reporters[0].events.length, beforeSwitch);

    host.setActiveEditor(first);
    await host.waitForAnalysis();
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
    assert.deepStrictEqual(sortedRowBackgroundRows(reset), [
      { line: 0, light: "#5CA5EA40", dark: "#284B7140" },
    ]);

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
    assert.deepStrictEqual(sortedRowBackgroundRows(update), [
      { line: 0, light: "#5CA5EA40", dark: "#284B7140" },
      { line: 1, light: "#E8B05C40", dark: "#694F2740" },
    ]);
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

    host.changeDocument(editor, [header("X"), "2"]);
    await host.waitForPendingRender();
    assert.deepStrictEqual(sortedRowBackgroundRows(editor), [
      { line: 0, light: "#5CA5EA40", dark: "#284B7140" },
    ]);
    assert.strictEqual(
      hasRow(editor, 1, "データ(普通預金・当座預金・貯蓄預金)"),
      false,
    );

    host.changeDocument(editor, [header("1"), "2"]);
    await host.waitForPendingRender();
    assert.deepStrictEqual(sortedRowBackgroundRows(editor), [
      { line: 0, light: "#5CA5EA40", dark: "#284B7140" },
      { line: 1, light: "#E8B05C40", dark: "#694F2740" },
    ]);

    host.changeDocument(editor, [header("1"), "2", "8", "9"]);
    await host.waitForPendingRender();
    assert.deepStrictEqual(sortedRowBackgroundRows(editor), [
      { line: 0, light: "#5CA5EA40", dark: "#284B7140" },
      { line: 1, light: "#E8B05C40", dark: "#694F2740" },
      { line: 2, light: "#64BC8040", dark: "#285B3D40" },
      { line: 3, light: "#96969640", dark: "#55555540" },
    ]);
    host.changeDocument(editor, [header("1"), "2"]);
    await host.waitForPendingRender();
    assert.deepStrictEqual(sortedRowBackgroundRows(editor), [
      { line: 0, light: "#5CA5EA40", dark: "#284B7140" },
      { line: 1, light: "#E8B05C40", dark: "#694F2740" },
    ]);

    const unselected = host.createEditor("unselected.txt", ["2"]);
    host.setActiveEditor(unselected);
    host.changeDocument(unselected, [header("5"), "2"]);
    await host.waitForPendingRender();
    assert.strictEqual(fieldDecorationCalls(unselected).length, 0);
  });

  test("1000行を10回編集しても、最後の通知から一度だけ描画する", async () => {
    const uri = "file:///large/50200003.txt";
    const primary = host.createEditor("50200003.txt", [header("1"), "2"], uri);
    const encodeBeforeSelection = host.encodeCallCount;
    const decodeBeforeSelection = host.decodeCallCount;
    host.setActiveEditor(primary);
    await host.chooseFileType(zenginTransfer);
    assert.strictEqual(host.encodeCallCount, encodeBeforeSelection + 1);
    assert.strictEqual(host.decodeCallCount, decodeBeforeSelection + 1);
    const split = host.createEditor("50200003.txt", [], uri);
    host.setVisibleEditors([primary, split]);
    assert.strictEqual(host.encodeCallCount, encodeBeforeSelection + 1);
    assert.strictEqual(host.decodeCallCount, decodeBeforeSelection + 1);

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
      await host.waitForAnalysis();
      assert.strictEqual(
        fieldDecorationCalls(primary).length,
        primaryCallsBefore + 1,
      );
      assert.strictEqual(
        fieldDecorationCalls(split).length,
        splitCallsBefore + 1,
      );
      assert.strictEqual(host.encodeCallCount, encodeBeforeSelection + 2);
      assert.strictEqual(host.decodeCallCount, decodeBeforeSelection + 2);
      assert.strictEqual(primary.document.lineCount, 1000);
      const endRange = [
        new FakeRange(new FakePosition(999, 0), new FakePosition(999, 0)),
      ];
      host.setVisibleRanges(primary, endRange);
      host.setVisibleRanges(split, endRange);
      assert.strictEqual(hasRow(primary, 999, "エンド"), true);
      assert.strictEqual(hasRow(split, 999, "エンド"), true);
    } finally {
      timers.restore();
    }
  });

  test("解析中の範囲変更では再解析せず、完了後に最新範囲を装飾する", async () => {
    const lines = [header("1"), ...Array<string>(100).fill("2"), "9"];
    const editor = host.createEditor("pending-visible-range.txt", lines);
    host.setVisibleRanges(editor, [
      new FakeRange(new FakePosition(1, 0), new FakePosition(1, 0)),
    ]);
    host.setActiveEditor(editor);
    const paused = pauseNextDecode(host);
    const encodeBefore = host.encodeCallCount;
    const decodeBefore = host.decodeCallCount;
    const selection = host.chooseFileType(zenginTransfer);
    await paused.started;

    const callsBeforeScroll = fieldDecorationCalls(editor).length;
    host.setVisibleRanges(editor, [
      new FakeRange(new FakePosition(80, 0), new FakePosition(80, 0)),
    ]);
    assert.strictEqual(fieldDecorationCalls(editor).length, callsBeforeScroll);
    assert.strictEqual(host.encodeCallCount, encodeBefore + 1);
    assert.strictEqual(host.decodeCallCount, decodeBefore + 1);

    paused.release();
    await selection;
    await host.waitForAnalysis();
    assert.deepStrictEqual(visibleFieldLineBounds(editor), {
      min: 60,
      max: 100,
    });
    assert.strictEqual(host.encodeCallCount, encodeBefore + 1);
    assert.strictEqual(host.decodeCallCount, decodeBefore + 1);
  });

  test("編集後のデバウンス中に範囲が変わっても失効結果を再適用しない", async () => {
    const lines = [header("1"), ...Array<string>(100).fill("2"), "9"];
    const editor = host.createEditor("debounced-visible-range.txt", lines);
    host.setVisibleRanges(editor, [
      new FakeRange(new FakePosition(1, 0), new FakePosition(1, 0)),
    ]);
    host.setActiveEditor(editor);
    await host.chooseFileType(zenginTransfer);
    await host.waitForAnalysis();

    const encodeBefore = host.encodeCallCount;
    const decodeBefore = host.decodeCallCount;
    const callsBeforeEdit = fieldDecorationCalls(editor).length;
    const timers = host.useFakeTimers();
    try {
      const editedLines = [...lines];
      editedLines[80] = `2${"x".repeat(10)}`;
      host.changeDocument(editor, editedLines);
      assert.strictEqual(timers.pendingCount, 1);

      host.setVisibleRanges(editor, [
        new FakeRange(new FakePosition(80, 0), new FakePosition(80, 0)),
      ]);
      assert.strictEqual(fieldDecorationCalls(editor).length, callsBeforeEdit);
      assert.strictEqual(host.encodeCallCount, encodeBefore);
      assert.strictEqual(host.decodeCallCount, decodeBefore);

      timers.advanceBy(99);
      assert.strictEqual(fieldDecorationCalls(editor).length, callsBeforeEdit);
      timers.advanceBy(1);
      await host.waitForAnalysis();
      assert.deepStrictEqual(visibleFieldLineBounds(editor), {
        min: 60,
        max: 100,
      });
      assert.strictEqual(host.encodeCallCount, encodeBefore + 1);
      assert.strictEqual(host.decodeCallCount, decodeBefore + 1);
    } finally {
      timers.restore();
    }
  });

  test("表示範囲だけを装飾し、スクロールと分割表示で全文解析を再利用する", async () => {
    const data = `2${"0".repeat(111)} ${"0".repeat(7)}`;
    const lines = [
      header("1"),
      ...Array<string>(1000).fill(data),
      "?",
      `8${"0".repeat(119)}`,
      `9${" ".repeat(119)}`,
    ];
    const uri = "file:///large/visible-ranges.txt";
    const primary = host.createEditor("visible-ranges.txt", lines, uri);
    host.setVisibleRanges(primary, [
      new FakeRange(new FakePosition(440, 0), new FakePosition(442, 0)),
    ]);
    host.setActiveEditor(primary);
    await host.chooseFileType(zenginGeneralTransfer);
    await host.waitForPendingRender();

    const options = () => fieldDecorationCalls(primary).at(-1)?.options ?? [];
    const visibleBackgroundLines = (editor: FakeEditor) =>
      sortedRowBackgroundRows(editor).map(({ line }) => line);
    const visibleLineBounds = (editor: FakeEditor) => {
      const fieldOptions = fieldDecorationCalls(editor).at(-1)?.options ?? [];
      return fieldOptions.length
        ? {
            min: Math.min(...fieldOptions.map(({ range }) => range.start.line)),
            max: Math.max(...fieldOptions.map(({ range }) => range.start.line)),
          }
        : undefined;
    };
    assert.deepStrictEqual(visibleLineBounds(primary), { min: 420, max: 462 });
    assert.deepStrictEqual(
      visibleBackgroundLines(primary),
      Array.from({ length: 43 }, (_, index) => 420 + index),
    );
    assert.ok(options().length <= 43 * 16);
    assert.ok(
      host
        .diagnosticsFor(primary)
        ?.some(({ range }) => range.start.line === 1001),
    );

    const encodeCount = host.encodeCallCount;
    const lineAtCount = primary.document.lineAtCallCount;
    const fieldCalls = fieldDecorationCalls(primary).length;
    host.setVisibleRanges(primary, [
      new FakeRange(new FakePosition(440, 0), new FakePosition(442, 0)),
    ]);
    assert.strictEqual(fieldDecorationCalls(primary).length, fieldCalls);
    assert.strictEqual(primary.document.lineAtCallCount, lineAtCount);

    host.setVisibleRanges(primary, [
      new FakeRange(new FakePosition(900, 0), new FakePosition(902, 0)),
    ]);
    assert.deepStrictEqual(visibleLineBounds(primary), { min: 880, max: 922 });
    assert.deepStrictEqual(
      visibleBackgroundLines(primary),
      Array.from({ length: 43 }, (_, index) => 880 + index),
    );
    assert.ok(options().length <= 43 * 16);
    assert.strictEqual(host.encodeCallCount, encodeCount);
    assert.strictEqual(primary.document.lineAtCallCount, lineAtCount);

    host.setVisibleRanges(primary, [
      new FakeRange(new FakePosition(100, 0), new FakePosition(102, 0)),
      new FakeRange(new FakePosition(300, 0), new FakePosition(302, 0)),
    ]);
    assert.deepStrictEqual(visibleLineBounds(primary), { min: 80, max: 322 });
    assert.deepStrictEqual(visibleBackgroundLines(primary), [
      ...Array.from({ length: 43 }, (_, index) => 80 + index),
      ...Array.from({ length: 43 }, (_, index) => 280 + index),
    ]);
    assert.ok(options().length <= 86 * 16);
    assert.strictEqual(
      new Set(
        options().map(
          ({ range }) =>
            `${range.start.line}:${range.start.character}:${range.end.character}`,
        ),
      ).size,
      options().length,
    );

    host.setVisibleRanges(primary, [
      new FakeRange(new FakePosition(100, 0), new FakePosition(110, 0)),
      new FakeRange(new FakePosition(105, 0), new FakePosition(115, 0)),
    ]);
    assert.deepStrictEqual(visibleLineBounds(primary), { min: 80, max: 135 });
    assert.deepStrictEqual(
      visibleBackgroundLines(primary),
      Array.from({ length: 56 }, (_, index) => 80 + index),
    );
    assert.ok(options().length <= 56 * 16);

    host.setVisibleRanges(primary, [
      new FakeRange(new FakePosition(0, 0), new FakePosition(0, 0)),
    ]);
    assert.deepStrictEqual(visibleLineBounds(primary), { min: 0, max: 20 });
    assert.deepStrictEqual(
      visibleBackgroundLines(primary),
      Array.from({ length: 21 }, (_, index) => index),
    );
    host.setVisibleRanges(primary, [
      new FakeRange(new FakePosition(1003, 0), new FakePosition(1003, 0)),
    ]);
    assert.deepStrictEqual(visibleLineBounds(primary), { min: 983, max: 1003 });
    assert.deepStrictEqual(visibleBackgroundLines(primary), [
      ...Array.from({ length: 18 }, (_, index) => 983 + index),
      1002,
      1003,
    ]);

    host.setVisibleRanges(primary, []);
    assert.deepStrictEqual(options(), []);
    assert.deepStrictEqual(visibleBackgroundLines(primary), []);

    const split = host.createEditor("visible-ranges.txt", [], uri);
    host.setVisibleRanges(split, [
      new FakeRange(new FakePosition(600, 0), new FakePosition(601, 0)),
    ]);
    host.setVisibleEditors([primary, split]);
    const splitOptions = () =>
      fieldDecorationCalls(split).at(-1)?.options ?? [];
    assert.ok(splitOptions().length > 0);
    assert.ok(splitOptions().every(({ range }) => range.start.line >= 580));
    assert.ok(splitOptions().every(({ range }) => range.start.line <= 621));
    assert.deepStrictEqual(
      visibleBackgroundLines(split),
      Array.from({ length: 42 }, (_, index) => 580 + index),
    );
    assert.strictEqual(host.encodeCallCount, encodeCount);

    host.setVisibleRanges(primary, [
      new FakeRange(new FakePosition(700, 0), new FakePosition(700, 0)),
    ]);
    assert.deepStrictEqual(visibleLineBounds(primary), { min: 680, max: 720 });
    assert.ok(splitOptions().every(({ range }) => range.start.line >= 580));

    assert.strictEqual(host.eventSubscriptionStats.visibleRanges.active, 1);
    host.dispose();
    assert.strictEqual(host.eventSubscriptionStats.visibleRanges.active, 0);
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
    reopened.document.encoding = "shiftjis";
    host.setVisibleEditors([reopened]);
    await host.waitForAnalysis();
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
    const originalBackgroundTypes = currentRowBackgroundCalls(editor).map(
      ({ type }) => type,
    );
    const timers = host.useFakeTimers();
    try {
      host.changeDocument(editor, [header("5"), "2"]);
      assert.strictEqual(timers.pendingCount, 1);
      assert.strictEqual(reporter.events.length, eventsBeforeEdit);

      const paused = pauseNextDecode(host);
      const reselection = host.chooseFileType(zenginTransfer);
      await paused.started;
      assert.strictEqual(timers.pendingCount, 0);
      assert.strictEqual(originalType?.disposeCount, 0);
      assert.strictEqual(
        fieldDecorationCalls(editor).length,
        callsBeforeEdit + 1,
      );
      assert.deepStrictEqual(fieldDecorationCalls(editor).at(-1)?.options, []);
      assert.strictEqual(
        fieldDecorationCalls(editor).at(-1)?.type,
        originalType,
      );

      const callsWhilePending = fieldDecorationCalls(editor).length;
      const encodesWhilePending = host.encodeCallCount;
      const decodesWhilePending = host.decodeCallCount;
      host.setVisibleRanges(editor, [
        new FakeRange(new FakePosition(1, 0), new FakePosition(1, 0)),
      ]);
      assert.strictEqual(
        fieldDecorationCalls(editor).length,
        callsWhilePending,
      );
      assert.strictEqual(host.encodeCallCount, encodesWhilePending);
      assert.strictEqual(host.decodeCallCount, decodesWhilePending);

      paused.release();
      await reselection;
      await host.waitForAnalysis();
      assert.strictEqual(
        fieldDecorationCalls(editor).length,
        callsBeforeEdit + 2,
      );
      assert.strictEqual(
        fieldDecorationCalls(editor).at(-1)?.type,
        originalType,
      );
      assert.deepStrictEqual(sortedRowBackgroundRows(editor), [
        { line: 0, light: "#5CA5EA40", dark: "#284B7140" },
        { line: 1, light: "#E8B05C40", dark: "#694F2740" },
      ]);
      assert.ok(
        originalBackgroundTypes.every((type) => type.disposeCount === 0),
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
    const originalBackgroundTypes = currentRowBackgroundCalls(editor).map(
      ({ type }) => type,
    );
    const timers = host.useFakeTimers();
    try {
      host.changeDocument(editor, [header("5"), "2"]);
      assert.strictEqual(timers.pendingCount, 1);
      assert.strictEqual(reporter.events.length, eventsBeforeEdit);

      await host.chooseFileType(clearType);
      assert.strictEqual(timers.pendingCount, 0);
      assert.strictEqual(originalType?.disposeCount, 1);
      assert.ok(
        originalBackgroundTypes.every((type) => type.disposeCount === 1),
      );
      assert.deepStrictEqual(sortedRowBackgroundRows(editor), []);
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
      host.setVisibleRanges(editor, [
        new FakeRange(new FakePosition(1, 0), new FakePosition(1, 0)),
      ]);
      assert.strictEqual(fieldDecorationCalls(editor).length, callsAfterClear);
      assert.deepStrictEqual(fieldDecorationCalls(editor).at(-1)?.options, []);
      const eventsAfterClear = reporter.events.length;
      timers.advanceBy(100);
      assert.strictEqual(fieldDecorationCalls(editor).length, callsAfterClear);
      assert.strictEqual(reporter.events.length, eventsAfterClear);
    } finally {
      timers.restore();
    }
  });

  test("文字コード変更中の範囲イベントで失効した装飾を復元しない", async () => {
    const lines = [header("1"), ...Array<string>(100).fill("2"), "9"];
    const editor = host.createEditor("encoding-visible-range.txt", lines);
    host.setVisibleRanges(editor, [
      new FakeRange(new FakePosition(1, 0), new FakePosition(1, 0)),
    ]);
    host.setActiveEditor(editor);
    await host.chooseFileType(zenginTransfer);
    await host.waitForAnalysis();

    const originalType = fieldDecorationCalls(editor).at(-1)?.type;
    const originalBackgroundTypes = currentRowBackgroundCalls(editor).map(
      ({ type }) => type,
    );
    const timers = host.useFakeTimers();
    try {
      const paused = pauseNextDecode(host);
      host.changeDocument(editor, [...lines]);
      timers.advanceBy(100);
      await paused.started;

      host.setDocumentEncoding(editor, "utf8");
      assert.strictEqual(timers.pendingCount, 0);
      assert.strictEqual(originalType?.disposeCount, 1);
      assert.ok(
        originalBackgroundTypes.every((type) => type.disposeCount === 1),
      );
      assert.deepStrictEqual(sortedRowBackgroundRows(editor), []);
      assert.deepStrictEqual(fieldDecorationCalls(editor).at(-1)?.options, []);
      const callsAfterEncodingChange = fieldDecorationCalls(editor).length;
      host.setVisibleRanges(editor, [
        new FakeRange(new FakePosition(80, 0), new FakePosition(80, 0)),
      ]);
      assert.strictEqual(
        fieldDecorationCalls(editor).length,
        callsAfterEncodingChange,
      );
      assert.deepStrictEqual(fieldDecorationCalls(editor).at(-1)?.options, []);

      paused.release();
      await host.waitForAnalysis();
      timers.advanceBy(100);
      assert.strictEqual(
        fieldDecorationCalls(editor).length,
        callsAfterEncodingChange,
      );
      assert.strictEqual(originalType?.disposeCount, 1);
      assert.deepStrictEqual(sortedRowBackgroundRows(editor), []);
    } finally {
      timers.restore();
    }
  });

  test("クローズ後の範囲イベントで古い解析と装飾ハンドルを復元しない", async () => {
    const lines = [header("1"), ...Array<string>(100).fill("2"), "9"];
    const editor = host.createEditor("closed-visible-range.txt", lines);
    host.setVisibleRanges(editor, [
      new FakeRange(new FakePosition(1, 0), new FakePosition(1, 0)),
    ]);
    host.setActiveEditor(editor);
    await host.chooseFileType(zenginTransfer);
    await host.waitForAnalysis();

    const originalType = fieldDecorationCalls(editor).at(-1)?.type;
    const originalBackgroundTypes = currentRowBackgroundCalls(editor).map(
      ({ type }) => type,
    );
    const timers = host.useFakeTimers();
    try {
      const paused = pauseNextDecode(host);
      host.changeDocument(editor, [...lines]);
      timers.advanceBy(100);
      await paused.started;

      host.closeDocument(editor);
      assert.strictEqual(originalType?.disposeCount, 1);
      assert.ok(
        originalBackgroundTypes.every((type) => type.disposeCount === 1),
      );
      assert.deepStrictEqual(sortedRowBackgroundRows(editor), []);
      assert.deepStrictEqual(fieldDecorationCalls(editor).at(-1)?.options, []);
      const callsAfterClose = fieldDecorationCalls(editor).length;
      host.setVisibleRanges(editor, [
        new FakeRange(new FakePosition(80, 0), new FakePosition(80, 0)),
      ]);
      assert.strictEqual(fieldDecorationCalls(editor).length, callsAfterClose);

      paused.release();
      await host.waitForAnalysis();
      timers.advanceBy(100);
      assert.strictEqual(fieldDecorationCalls(editor).length, callsAfterClose);
      assert.strictEqual(originalType?.disposeCount, 1);
      assert.deepStrictEqual(sortedRowBackgroundRows(editor), []);
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
    const originalBackgroundTypes = currentRowBackgroundCalls(editor).map(
      ({ type }) => type,
    );
    const timers = host.useFakeTimers();
    try {
      host.changeDocument(editor, [header("5"), "2"]);
      assert.strictEqual(timers.pendingCount, 1);
      assert.strictEqual(reporter.events.length, eventsBeforeEdit);

      host.setVisibleEditors([]);
      assert.strictEqual(timers.pendingCount, 0);
      assert.strictEqual(originalType?.disposeCount, 1);
      assert.ok(
        originalBackgroundTypes.every((type) => type.disposeCount === 1),
      );
      assert.deepStrictEqual(sortedRowBackgroundRows(editor), []);
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

      host.setVisibleEditors([editor]);
      await host.waitForAnalysis();
      assert.deepStrictEqual(sortedRowBackgroundRows(editor), [
        { line: 0, light: "#5CA5EA40", dark: "#284B7140" },
        { line: 1, light: "#E8B05C40", dark: "#694F2740" },
      ]);
      assert.ok(
        currentRowBackgroundCalls(editor)
          .filter(({ options }) => options.length > 0)
          .every(({ type }) => !originalBackgroundTypes.includes(type)),
      );
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
    const originalBackgroundTypes = currentRowBackgroundCalls(editor).map(
      ({ type }) => type,
    );
    const timers = host.useFakeTimers();
    try {
      host.changeDocument(editor, [header("5"), "2"]);
      assert.strictEqual(timers.pendingCount, 1);
      assert.strictEqual(reporter.events.length, eventsBeforeEdit);

      host.dispose();
      assert.strictEqual(timers.pendingCount, 0);
      assert.ok(
        originalBackgroundTypes.every((type) => type.disposeCount === 1),
      );
      assert.strictEqual(host.commandDisposalCount, 1);
      assert.deepStrictEqual(host.eventSubscriptionStats, {
        activeEditor: { registered: 0, disposed: 0, active: 0 },
        visibleEditors: { registered: 1, disposed: 1, active: 0 },
        editorSelections: { registered: 1, disposed: 1, active: 0 },
        visibleRanges: { registered: 1, disposed: 1, active: 0 },
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
    const originalBackgroundTypes = currentRowBackgroundCalls(editor).map(
      ({ type }) => type,
    );
    assert.strictEqual(optionsForLine(editor, 0).length, 1);

    const eventsBeforeClear = host.reporters[0].events.length;
    await host.chooseFileType(clearType);
    assert.strictEqual(originalType?.disposeCount, 1);
    assert.ok(originalBackgroundTypes.every((type) => type.disposeCount === 1));
    assert.deepStrictEqual(sortedRowBackgroundRows(editor), []);
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
