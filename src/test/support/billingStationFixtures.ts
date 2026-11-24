import type { DecorationOption, FakeEditor } from "./fakeVscodeTypes";
import type { FixedWidthDefinition } from "../../domain/fixedWidth/projectFields";

export type BillingStationExpectedField = {
  name: string;
  length: number;
  type: "C" | "N";
};

export type BillingStationFixtureRow = {
  code: "01" | "11" | "12" | "21" | "81";
  name: string;
  color: { light: string; dark: string };
  fields: readonly BillingStationExpectedField[];
  line: string;
};

export type BillingStationFixtureValueOverrides = Partial<
  Record<BillingStationFixtureRow["code"], Readonly<Record<number, string>>>
>;

export type BillingStationRExpectedRow = {
  name: string;
  color: { light: string; dark: string };
  condition: string;
  fields: readonly BillingStationExpectedField[];
};

export type BillingStationRFixtureRow = BillingStationRExpectedRow & {
  line: string;
};

const managementColor = { light: "#5CA5EA40", dark: "#284B7140" };
const detailColor = { light: "#E8B05C40", dark: "#694F2740" };
const endColor = { light: "#96969640", dark: "#55555540" };

function field(
  name: string,
  length: number,
  type: "C" | "N" = "C",
): BillingStationExpectedField {
  return { name, length, type };
}

const moneyFields = (names: readonly string[]) =>
  names.map((name) => field(name, 12));

export const billingStationExpectedRows: readonly Omit<
  BillingStationFixtureRow,
  "line"
>[] = [
  {
    code: "01",
    name: "管理レコード",
    color: managementColor,
    fields: [
      field("レコード区分", 2, "N"),
      field("企業等コード", 7),
      field("付加コード", 5),
      field("会社識別コード", 1),
      field("予備１", 2),
      field("年月群", 7, "N"),
      field("媒体通番", 2, "N"),
      field("網識別", 1, "N"),
      field("媒体識別", 3),
      field("予備２", 480),
    ],
  },
  {
    code: "11",
    name: "ヘッダレコード",
    color: managementColor,
    fields: [
      field("レコード区分", 2, "N"),
      field("計上事業所コード", 8),
      field("企業等コード", 7),
      field("付加コード", 5),
      field("会社識別コード", 1),
      field("お客さま名１", 80),
      field("お客さま名２", 60),
      field("予備１", 16),
      field("作成年月日", 8, "N"),
      field("請求年月", 6, "N"),
      field("支払い期限", 8, "N"),
      field("社用コード", 28),
      field("予備２", 281),
    ],
  },
  {
    code: "12",
    name: "データレコード",
    color: detailColor,
    fields: [
      field("レコード区分", 2, "N"),
      field("回線ID", 9),
      field("地域区分コード", 2),
      field("会社識別コード", 1),
      field("契約識別子", 3),
      field("予備１", 3),
      field("申込内容", 14),
      field("開通年月日", 8),
      field("承諾年月日", 8),
      field("承諾番号", 11, "N"),
      field("回線名：上位事業所名", 50),
      field("回線名：下位事業所名", 50),
      field("回線名：分岐名", 40),
      field("回線名：分類名", 14),
      field("回線名：回線番号", 5, "N"),
      field("回線名：回線種類", 16),
      field("回線名：回線符号コード", 3, "N"),
      field("お客さま管理番号", 16),
      ...moneyFields([
        "合計金額",
        "基本回線料",
        "分岐回線料",
        "分岐料",
        "多重アクセス減額料",
        "長期利用割引額",
        "高額利用割引額",
        "予備２",
        "機械専用料",
        "配線設備専用料",
        "回線終端装置専用料",
        "その他専用料",
        "予備３",
        "工事に関する費用",
        "加減算額",
        "消費税相当額",
        "予備４",
        "予備５",
        "予備６",
        "予備７",
      ]),
      field("予備８", 15),
    ],
  },
  {
    code: "21",
    name: "エンドレコード",
    color: endColor,
    fields: [
      field("レコード区分", 2, "N"),
      ...moneyFields([
        "合計金額",
        "基本回線料",
        "分岐回線料",
        "分岐料",
        "多重アクセス減額料",
        "長期利用割引額",
        "高額利用割引額",
        "予備１",
        "機械専用料",
        "配線設備専用料",
        "回線終端装置専用料",
        "その他専用料",
        "予備２",
        "工事に関する費用",
        "加減算額",
        "消費税相当額",
        "延滞利息",
      ]),
      field("予備３", 7),
      field("予備４", 1),
      field("予備５", 7),
      field("回線数計", 7, "N"),
      field("予備６", 12),
      field("予備７", 12),
      field("予備８", 12),
      field("予備９", 12),
      field("予備１０", 234),
    ],
  },
  {
    code: "81",
    name: "請求単位レコード",
    color: endColor,
    fields: [
      field("レコード区分", 2, "N"),
      field("企業等コード", 7),
      field("付加コード", 5),
      field("予備１", 3),
      field("金融機関コード", 7, "N"),
      field("口座区分", 1, "N"),
      field("口座番号", 7, "N"),
      field("ご請求番号合計金額", 10),
      field("ご請求番号合計回線数", 5),
      field("予備２", 463),
    ],
  },
];

function shiftJisByteWidth(character: string): number {
  return character === "あ" ? 2 : 1;
}

function shiftJisByteLength(value: string): number {
  return Array.from(value, shiftJisByteWidth).reduce(
    (total, width) => total + width,
    0,
  );
}

export function displayIndexAtShiftJisByte(
  line: string,
  targetByte: number,
): number {
  if (targetByte === 0) {
    return 0;
  }
  let byteOffset = 0;
  const index = Array.from(line).findIndex((character) => {
    byteOffset += shiftJisByteWidth(character);
    return byteOffset >= targetByte;
  });
  if (byteOffset !== targetByte) {
    throw new Error("fixture のバイト位置が範囲外か文字の途中にあります。");
  }
  return index < 0 ? line.length : index + 1;
}

export function fixtureValueAtByte(
  line: string,
  startByte: number,
  width: number,
): string {
  const start = displayIndexAtShiftJisByte(line, startByte);
  const end = displayIndexAtShiftJisByte(line, startByte + width);
  return line.slice(start, end);
}

export function billingStationIdentity(line: string, offset = 2): string {
  return line.slice(offset, offset + 12);
}

export function billingStationIdentityFromFileName(fileName: string): string {
  const match = /^U([0-9]{7})-([0-9]{5})-[0-9]{3}-[EWC]\.txt$/u.exec(fileName);
  return (match?.[1] ?? "") + (match?.[2] ?? "");
}

export function billingStationSummaryFacts(lines: readonly string[]) {
  const groupSummaries = lines.filter((line) => line.startsWith("21"));
  const invoiceSummary = lines.find((line) => line.startsWith("81")) ?? "";
  return {
    groupAmounts: groupSummaries.map((line) =>
      Number(line.slice(2, 14).trim()),
    ),
    groupCircuitCounts: groupSummaries.map((line) =>
      Number(line.slice(221, 228).trim()),
    ),
    invoiceTotal: Number(invoiceSummary.slice(32, 42).trim()),
    invoiceCircuitCount: Number(invoiceSummary.slice(42, 47).trim()),
  };
}

export function leasedLineNumber(
  line: string,
  byteOffset: number,
  byteLength = 12,
): number {
  return Number(
    Buffer.from(line, "utf8")
      .subarray(byteOffset, byteOffset + byteLength)
      .toString("ascii"),
  );
}

export function leasedLineSummaryMatches(
  summaryLine: string,
  detailLines: readonly string[],
): boolean {
  const detailTotal = detailLines.reduce(
    (total, line) => total + leasedLineNumber(line, 532),
    0,
  );
  const detailAmountOffsets = Array.from(
    { length: 13 },
    (_, index) => 544 + index * 12,
  );
  const expectedAmountTotals = detailAmountOffsets.map((offset) =>
    detailLines.reduce(
      (total, line) => total + leasedLineNumber(line, offset),
      0,
    ),
  );
  const summaryAmountOffsets = Array.from(
    { length: 14 },
    (_, index) => 14 + index * 12,
  );
  return (
    JSON.stringify({
      circuitTotal: leasedLineNumber(summaryLine, 2),
      amountTotals: summaryAmountOffsets.map((offset) =>
        leasedLineNumber(summaryLine, offset),
      ),
      detailCount: leasedLineNumber(summaryLine, 182, 7),
    }) ===
    JSON.stringify({
      circuitTotal: detailTotal,
      amountTotals: [...expectedAmountTotals, 0],
      detailCount: detailLines.length,
    })
  );
}

function lineFor(
  row: Omit<BillingStationFixtureRow, "line">,
  values: Readonly<Record<number, string>>,
  rightAligned: readonly number[] = [],
): string {
  const right = new Set(rightAligned);
  const line = row.fields
    .map((definition, index) => {
      const value = values[index] ?? "";
      const padding = Math.max(
        0,
        definition.length - shiftJisByteLength(value),
      );
      const spaces = " ".repeat(padding);
      return right.has(index) ? spaces + value : value + spaces;
    })
    .join("");
  if (shiftJisByteLength(line) !== 510) {
    throw new Error(row.name + " の fixture が510バイトではありません。");
  }
  return line;
}

/** 本番 JSON とは独立した項目表から、境界と値検証用の行を作る。 */
export function createBillingStationFixtureRows(
  addCode = "00001",
  valueOverrides: BillingStationFixtureValueOverrides = {},
): BillingStationFixtureRow[] {
  const rows = billingStationExpectedRows;
  const valuesByCode: Record<
    BillingStationFixtureRow["code"],
    Readonly<Record<number, string>>
  > = {
    "01": {
      0: "01",
      1: "0000001",
      2: addCode,
      3: "3",
      5: "2026111",
      6: "01",
      7: "3",
      8: "CD ",
    },
    "11": {
      0: "11",
      1: "01020304",
      2: "0000001",
      3: addCode,
      4: "3",
      5: "ああ",
      8: "20261124",
      9: "202611",
      10: "20261231",
      11: "INV0001",
    },
    "12": {
      0: "12",
      1: "000000001",
      2: "01",
      3: "3",
      4: "001",
      6: "ああ",
      7: "20261101",
      8: "20261101",
      10: "あ",
      11: "あ",
      13: "ああ",
      14: "00001",
      15: "ああ",
      16: "001",
      17: "CUSTOMER-000001",
      18: "-123",
      19: "10000",
      24: "-12",
      25: "0",
      30: "0",
      33: "-1",
      34: "0",
      35: "0",
      36: "0",
      37: "0",
    },
    "21": {
      0: "21",
      1: "-123",
      2: "10000",
      7: "-12",
      8: "0",
      13: "0",
      16: "-1",
      21: "0000001",
      22: "0",
      23: "0",
      24: "0",
      25: "0",
    },
    "81": {
      0: "81",
      1: "0000001",
      2: addCode,
      4: "0001234",
      5: "1",
      6: "1234567",
      7: "-123",
      8: "00001",
    },
  };
  const rightAlignedByCode: Record<string, readonly number[]> = {
    "12": Array.from({ length: 20 }, (_, index) => index + 18),
    "21": [
      ...Array.from({ length: 18 }, (_, index) => index + 1),
      22,
      23,
      24,
      25,
    ],
    "81": [7],
  };
  return rows.map((row) => ({
    ...row,
    line: lineFor(
      row,
      { ...valuesByCode[row.code], ...valueOverrides[row.code] },
      rightAlignedByCode[row.code],
    ),
  }));
}

const billingStationRManagementColor = {
  light: "#5CA5EA40",
  dark: "#284B7140",
};
const billingStationRDetailColor = {
  light: "#E8B05C40",
  dark: "#694F2740",
};
const billingStationREndColor = { light: "#96969640", dark: "#55555540" };
const fullWidthDigits = "０１２３４５６７８９";

function fullWidthNumber(value: number): string {
  return String(value).replace(/[0-9]/gu, (digit) =>
    fullWidthDigits.charAt(Number(digit)),
  );
}

function billingStationRBreakdownFields(): BillingStationExpectedField[] {
  return Array.from({ length: 17 }, (_, index) => {
    const suffix = fullWidthNumber(index + 1);
    return [
      field("利用内訳コード" + suffix, 2, "N"),
      field("請求内訳コード" + suffix, 4),
      field("内訳金額" + suffix, 10),
      field("残回数" + suffix, 3),
      field("税区分" + suffix, 2),
    ];
  }).flat();
}

export const billingStationRExpectedRows: readonly BillingStationRExpectedRow[] =
  [
    {
      name: "管理レコード",
      color: billingStationRManagementColor,
      condition: "^.{11}01",
      fields: [
        field("会社コード", 5),
        field("予備１", 6),
        field("データ種類", 2),
        field("予備２", 4),
        field("請求期別・年", 4),
        field("請求期別・月", 2),
        field("請求期別・群", 1),
        field("媒体通番", 2, "N"),
        field("網種別", 1),
        field("媒体識別", 3),
        field("請求回数", 1),
        field("詳細群", 1),
        field("予備３", 480),
      ],
    },
    {
      name: "ＯＣＮ番号別内訳レコード（初回）",
      color: billingStationRDetailColor,
      condition: "^.{11}11(?:01)",
      fields: [
        field("ＯＣＮ番号", 10),
        field("定期分割区分", 1, "N"),
        field("データ種類", 2, "N"),
        field("レコードＮＯ", 2, "N"),
        field("レコード数", 2, "N"),
        field("ご請求番号", 10),
        field("部課別コード", 6, "N"),
        field("減算不能区分", 1, "N"),
        field("ＯＣＮサービス種別", 2),
        field("分割番号", 2),
        field("予備１", 9),
        field("ご利用期間基本料等初日", 4, "N"),
        field("ご利用期間基本料等末日", 4, "N"),
        field("ＯＣＮ通信料等初日", 4, "N"),
        field("ＯＣＮ通信料等末日", 4, "N"),
        field("検針日前回", 4, "N"),
        field("検針日今回", 4, "N"),
        field("予備２", 10),
        field("ＯＣＮ通信料・今月分", 10, "N"),
        field("予備３", 35),
        field("ご請求金額", 10, "C"),
        field("予備４", 5),
        ...billingStationRBreakdownFields(),
        field("予備５", 14),
      ],
    },
    {
      name: "ＯＣＮ番号別内訳レコード（継続）",
      color: billingStationRDetailColor,
      condition: "^.{11}11(?:0[2-9]|[1-9][0-9])",
      fields: [
        field("ＯＣＮ番号", 10),
        field("定期分割区分", 1, "N"),
        field("データ種類", 2, "N"),
        field("レコードＮＯ", 2, "N"),
        field("レコード数", 2, "N"),
        field("ご請求番号", 10),
        field("部課別コード", 6, "N"),
        field("予備１", 1),
        field("ＯＣＮサービス種別", 2),
        field("分割番号", 2),
        field("予備２", 103),
        ...billingStationRBreakdownFields(),
        field("予備３", 14),
      ],
    },
    {
      name: "請求書作成番号合計レコード（初回）",
      color: billingStationREndColor,
      condition: "^.{11}51(?:01)",
      fields: [
        field("ご請求番号", 10),
        field("予備１", 1),
        field("データ種類", 2, "N"),
        field("レコードＮＯ", 2, "N"),
        field("レコード数", 2, "N"),
        field("分割番号", 2),
        field("予備２", 8),
        field("部課別コード", 6, "N"),
        field("予備３", 14),
        field("ご利用期間基本料等初日", 4, "N"),
        field("ご利用期間基本料等末日", 4, "N"),
        field("ＯＣＮ通信料等初日", 4, "N"),
        field("ＯＣＮ通信料等末日", 4, "N"),
        field("検針日前回", 4, "N"),
        field("検針日今回", 4, "N"),
        field("予備４", 10),
        field("ＯＣＮ通信料・今月分", 10, "N"),
        field("予備５", 35),
        field("請求額合計金額", 10, "N"),
        field("請求件数", 8, "N"),
        field("金融機関コード", 7),
        field("口座番号", 8),
        field("口座名義", 40),
        field("予備６", 5),
        field("送付先名", 40),
        field("予備７", 268),
      ],
    },
    {
      name: "請求書作成番号合計レコード（継続）",
      color: billingStationREndColor,
      condition: "^.{11}51(?:0[2-9]|[1-9][0-9])",
      fields: [
        field("ご請求番号", 10),
        field("予備１", 1),
        field("データ種類", 2, "N"),
        field("レコードＮＯ", 2, "N"),
        field("レコード数", 2, "N"),
        field("分割番号", 2),
        field("予備２", 8),
        field("部課別コード", 6, "N"),
        field("予備３", 108),
        ...billingStationRBreakdownFields(),
        field("予備４", 14),
      ],
    },
    {
      name: "会社合計レコード",
      color: billingStationREndColor,
      condition: "^.{11}91",
      fields: [
        field("会社コード", 5, "N"),
        field("予備１", 6),
        field("データ種類", 2, "N"),
        field("予備２", 4),
        field("会社合計請求額", 12, "N"),
        field("会社合計請求件数", 8, "N"),
        field("予備３", 475),
      ],
    },
  ];

type BillingStationRBreakdown = {
  companyCode: string;
  invoiceCode: string;
  amount: string;
  taxCode: string;
  remaining?: string;
};

type BillingStationRLineOptions = {
  breakdownStart: number;
  breakdown?: readonly BillingStationRBreakdown[];
};

function billingStationRLine(
  row: BillingStationRExpectedRow,
  values: Readonly<Record<number, string>>,
  options: BillingStationRLineOptions,
): string {
  const valueByField = { ...values };
  (options.breakdown ?? []).forEach((item, index) => {
    const start = options.breakdownStart + index * 5;
    valueByField[start] = item.companyCode;
    valueByField[start + 1] = item.invoiceCode;
    valueByField[start + 2] = item.amount;
    valueByField[start + 3] = item.remaining ?? "";
    valueByField[start + 4] = item.taxCode;
  });
  const line = row.fields
    .map((definition, index) => {
      const value = valueByField[index] ?? "";
      const valueLength = shiftJisByteLength(value);
      if (valueLength > definition.length) {
        throw new Error(row.name + " の fixture 値が項目長を超えています。");
      }
      return value + " ".repeat(definition.length - valueLength);
    })
    .join("");
  if (shiftJisByteLength(line) !== 512) {
    throw new Error(row.name + " の fixture が512バイトではありません。");
  }
  return line;
}

function billingStationRGroup(index: number): BillingStationRBreakdown {
  const amountByIndex: Readonly<Record<number, string>> = {
    0: "0000000108",
    1: "-000010000",
    2: "0000010000",
  };
  return {
    companyCode: "00",
    invoiceCode: "a00" + index.toString(36).toUpperCase(),
    amount: amountByIndex[index] ?? "0000000001",
    remaining: "",
    taxCode: index === 0 ? "0A" : "01",
  };
}

function billingStationRExpectedRowAt(
  index: number,
): BillingStationRExpectedRow {
  const row = billingStationRExpectedRows[index];
  if (!row) {
    throw new Error("R始まり明細の期待行が不足しています。");
  }
  return row;
}

function billingStationRFixture(
  row: BillingStationRExpectedRow,
  values: Readonly<Record<number, string>>,
  options: BillingStationRLineOptions,
): BillingStationRFixtureRow {
  return { ...row, line: billingStationRLine(row, values, options) };
}

/** 公式表の例、17組境界、負の金額、未使用組を含む ASCII 行を作る。 */
export function createBillingStationRFixtureRows(): BillingStationRFixtureRow[] {
  const groups = Array.from({ length: 17 }, (_, index) =>
    billingStationRGroup(index),
  );
  const continuationGroup = billingStationRGroup(17);
  return [
    billingStationRFixture(
      billingStationRExpectedRowAt(0),
      {
        0: "00000",
        2: "01",
        4: "2026",
        5: "11",
        6: "3",
        7: "01",
        9: "B/S",
        10: "0",
        11: "V",
      },
      { breakdownStart: 0 },
    ),
    billingStationRFixture(
      billingStationRExpectedRowAt(1),
      {
        0: "5012345678",
        1: "0",
        2: "11",
        3: "01",
        4: "02",
        5: "R001234567",
        6: "000000",
        7: "0",
        9: "00",
        11: "1201",
        12: "1231",
        13: "0000",
        14: "0000",
        15: "0000",
        16: "0000",
        17: "0000000000",
        18: "0000000123",
        20: "0000000123",
      },
      { breakdownStart: 22, breakdown: groups },
    ),
    billingStationRFixture(
      billingStationRExpectedRowAt(2),
      {
        0: "5012345678",
        1: "0",
        2: "11",
        3: "02",
        4: "02",
        5: "R001234567",
        6: "000000",
        9: "00",
      },
      { breakdownStart: 11, breakdown: [continuationGroup] },
    ),
    billingStationRFixture(
      billingStationRExpectedRowAt(3),
      {
        0: "R001234567",
        2: "51",
        3: "01",
        4: "03",
        5: "00",
        7: "000000",
        9: "1201",
        10: "1231",
        11: "0000",
        12: "0000",
        13: "0000",
        14: "0000",
        15: "0000000000",
        16: "0000000123",
        18: "0000000123",
        19: "00000001",
      },
      { breakdownStart: 0 },
    ),
    billingStationRFixture(
      billingStationRExpectedRowAt(4),
      {
        0: "R001234567",
        2: "51",
        3: "02",
        4: "03",
        5: "00",
        7: "000000",
      },
      { breakdownStart: 9, breakdown: groups },
    ),
    billingStationRFixture(
      billingStationRExpectedRowAt(4),
      {
        0: "R001234567",
        2: "51",
        3: "03",
        4: "03",
        5: "00",
        7: "000000",
      },
      { breakdownStart: 9, breakdown: [continuationGroup] },
    ),
    billingStationRFixture(
      billingStationRExpectedRowAt(5),
      {
        0: "00000",
        2: "91",
        4: "000000000123",
        5: "00000001",
      },
      { breakdownStart: 0 },
    ),
  ];
}

type BillingStationRCharacterizationHost = {
  createEditor(fileName: string, lines: string[], uri?: string): FakeEditor;
  setActiveEditor(editor: FakeEditor | undefined): void;
  chooseFileType(label: string | undefined): Promise<void>;
  waitForAnalysis(): Promise<void>;
  diagnosticsFor(
    editor: FakeEditor,
  ):
    | readonly { code: string | number | undefined; message: string }[]
    | undefined;
};

type BillingStationRCharacterizationHelpers = {
  optionsForLine: (
    editor: FakeEditor,
    line: number,
  ) => readonly DecorationOption[];
  rowNames: (editor: FakeEditor, line: number) => string[];
};

const billingStationRFormatName =
  "NTTドコモビジネス ビリングステーション/番号別明細内訳書（R始まり）";

type BillingStationRAssertions = {
  ok(value: unknown, message?: string): void;
  strictEqual(actual: unknown, expected: unknown, message?: string): void;
  deepStrictEqual(actual: unknown, expected: unknown, message?: string): void;
};

/** 形式定義、実サンプル、境界条件と描画結果を characterization host で確認する。 */
export async function verifyBillingStationRCharacterization(input: {
  host: BillingStationRCharacterizationHost;
  helpers: BillingStationRCharacterizationHelpers;
  definition: FixedWidthDefinition;
  sampleText: string;
  assertions: BillingStationRAssertions;
}): Promise<void> {
  const lines = billingStationRSampleLines(input);
  await verifyBillingStationRPresentation({ ...input, lines });
  await verifyBillingStationRInvalidRows({ ...input, lines });
  await verifyBillingStationRLastRecordNumbers({ ...input, lines });
  await verifyBillingStationRAlternateOcn({ ...input, lines });
}

function billingStationRSampleLines(input: {
  definition: FixedWidthDefinition;
  sampleText: string;
  assertions: BillingStationRAssertions;
}): string[] {
  const { definition, assertions } = input;
  assertions.strictEqual(definition.name, billingStationRFormatName);
  assertions.strictEqual(definition.encoding, "shiftjis");
  assertions.strictEqual(definition.lengthUnit, "byte");
  assertions.strictEqual(definition.fileNamePattern.test("N00000"), true);
  assertions.strictEqual(definition.fileNamePattern.test("N00001"), false);
  assertions.deepStrictEqual(
    definition.rows.map(({ name, backgroundColor, condition, fields }) => ({
      name,
      color: backgroundColor,
      condition: condition.source,
      fields: (fields ?? []).map(({ name: fieldName, length, type }) => ({
        name: fieldName,
        length,
        type,
      })),
    })),
    billingStationRExpectedRows,
  );
  assertions.deepStrictEqual(
    billingStationRExpectedRows.map(({ fields }) =>
      fields.reduce((total, field) => total + field.length, 0),
    ),
    Array(6).fill(512),
  );

  const sampleLines = input.sampleText.split("\r\n");
  assertions.strictEqual(sampleLines.pop(), "");
  assertions.ok(sampleLines.every((line) => /^[\x20-\x7e]*$/u.test(line)));
  assertions.deepStrictEqual(
    sampleLines.map((line) => Buffer.byteLength(line, "latin1")),
    sampleLines.map(() => 512),
  );
  assertions.deepStrictEqual(
    sampleLines,
    createBillingStationRFixtureRows().map(({ line }) => line),
  );

  const recordData = sampleLines.map((line) => ({
    kind: line.slice(11, 13),
    number: line.slice(13, 15),
  }));
  assertions.deepStrictEqual(recordData, [
    { kind: "01", number: "  " },
    { kind: "11", number: "01" },
    { kind: "11", number: "02" },
    { kind: "51", number: "01" },
    { kind: "51", number: "02" },
    { kind: "51", number: "03" },
    { kind: "91", number: "  " },
  ]);
  assertions.deepStrictEqual(
    sampleLines.slice(3, 6).map((line) => line.slice(15, 17)),
    ["03", "03", "03"],
  );
  assertions.strictEqual(
    requiredBillingStationRLine(sampleLines, 1).slice(0, 10),
    "5012345678",
  );
  assertions.strictEqual(
    requiredBillingStationRLine(sampleLines, 1).slice(17, 27),
    "R001234567",
  );
  assertions.strictEqual(
    requiredBillingStationRLine(sampleLines, 1).slice(168, 178),
    "-000010000",
  );
  assertions.strictEqual(
    requiredBillingStationRLine(sampleLines, 1).slice(160, 162),
    "0A",
  );
  assertions.strictEqual(
    requiredBillingStationRLine(sampleLines, 1).slice(143, 147),
    "a000",
  );
  assertions.strictEqual(
    requiredBillingStationRLine(sampleLines, 2).slice(162, 498),
    " ".repeat(16 * 21),
  );
  assertions.strictEqual(
    billingStationRGroupCount(sampleLines.slice(1, 3)),
    18,
  );
  assertions.strictEqual(
    billingStationRGroupCount(sampleLines.slice(4, 6)),
    18,
  );
  return sampleLines;
}

function requiredBillingStationRLine(
  lines: readonly string[],
  index: number,
): string {
  const line = lines[index];
  if (line === undefined) {
    throw new Error("R始まり明細のサンプル行が不足しています。");
  }
  return line;
}

function billingStationRGroupCount(lines: readonly string[]): number {
  return lines.reduce(
    (total, line) =>
      total +
      Array.from({ length: 17 }, (_, index) =>
        line.slice(141 + index * 21, 143 + index * 21).trim(),
      ).filter(Boolean).length,
    0,
  );
}

async function selectBillingStationREditor(input: {
  host: BillingStationRCharacterizationHost;
  fileName: string;
  lines: string[];
}): Promise<FakeEditor> {
  const editor = input.host.createEditor(
    input.fileName,
    input.lines,
    "billingStation://" + input.fileName,
  );
  input.host.setActiveEditor(editor);
  await input.host.chooseFileType(billingStationRFormatName);
  await input.host.waitForAnalysis();
  return editor;
}

async function verifyBillingStationRPresentation(input: {
  host: BillingStationRCharacterizationHost;
  helpers: BillingStationRCharacterizationHelpers;
  lines: string[];
  assertions: BillingStationRAssertions;
}): Promise<void> {
  const editor = await selectBillingStationREditor({
    host: input.host,
    fileName: "N00000",
    lines: input.lines,
  });
  input.assertions.deepStrictEqual(input.host.diagnosticsFor(editor) ?? [], []);
  input.lines.forEach((line, index) => {
    const expectedRow = billingStationRExpectedRows.find(({ condition }) =>
      new RegExp(condition, "u").test(line),
    );
    if (!expectedRow) {
      throw new Error("R始まり明細に対応する期待行がありません。");
    }
    input.assertions.deepStrictEqual(
      [...new Set(input.helpers.rowNames(editor, index))],
      [expectedRow.name],
    );
    input.assertions.strictEqual(
      input.helpers.optionsForLine(editor, index).length,
      expectedRow.fields.length,
    );
  });
  input.assertions.ok(
    input.helpers
      .optionsForLine(editor, 1)[0]
      ?.hoverMessage?.value.includes("位置: 1 - 10 (10バイト)"),
  );
  input.assertions.ok(
    input.helpers
      .optionsForLine(editor, 1)[29]
      ?.hoverMessage?.value.includes("位置: 169 - 178 (10バイト)"),
  );
  input.assertions.deepStrictEqual(
    editor.document.getText(),
    input.lines.join("\n"),
  );
  input.assertions.strictEqual(editor.document.isDirty, false);
}

async function verifyBillingStationRInvalidRows(input: {
  host: BillingStationRCharacterizationHost;
  lines: string[];
  assertions: BillingStationRAssertions;
}): Promise<void> {
  const firstOcnLine = requiredBillingStationRLine(input.lines, 1);
  const firstManagerLine = requiredBillingStationRLine(input.lines, 0);
  const invalidLines: {
    fileName: string;
    line: string;
    code: string;
    fieldName?: string;
  }[] = [
    {
      fileName: "reserved-record-number.txt",
      line: firstOcnLine.slice(0, 13) + "00" + firstOcnLine.slice(15),
      code: "UNKNOWN_RECORD",
    },
    {
      fileName: "unknown-record-kind.txt",
      line: firstManagerLine.slice(0, 11) + "92" + firstManagerLine.slice(13),
      code: "UNKNOWN_RECORD",
    },
    {
      fileName: "invalid-company-code.txt",
      line: firstOcnLine.slice(0, 141) + "0A" + firstOcnLine.slice(143),
      code: "INVALID_TYPE",
      fieldName: "利用内訳コード１",
    },
  ];
  for (const invalid of invalidLines) {
    const editor = await selectBillingStationREditor({
      host: input.host,
      fileName: invalid.fileName,
      lines: [invalid.line],
    });
    const diagnostics = input.host.diagnosticsFor(editor) ?? [];
    input.assertions.deepStrictEqual(
      diagnostics.map(({ code }) => code),
      [invalid.code],
    );
    if (invalid.fieldName) {
      input.assertions.ok(diagnostics[0]?.message.includes(invalid.fieldName));
    }
    input.assertions.strictEqual(editor.document.getText(), invalid.line);
    input.assertions.strictEqual(editor.document.isDirty, false);
  }
}

async function verifyBillingStationRLastRecordNumbers(input: {
  host: BillingStationRCharacterizationHost;
  helpers: BillingStationRCharacterizationHelpers;
  lines: string[];
  assertions: BillingStationRAssertions;
}): Promise<void> {
  const lastRecordLines = [
    { lineIndex: 2, expectedRow: billingStationRExpectedRowAt(2) },
    { lineIndex: 4, expectedRow: billingStationRExpectedRowAt(4) },
  ];
  for (const [index, item] of lastRecordLines.entries()) {
    const source = requiredBillingStationRLine(input.lines, item.lineIndex);
    const line = source.slice(0, 13) + "99" + "99" + source.slice(17);
    const editor = await selectBillingStationREditor({
      host: input.host,
      fileName: "last-record-number-" + index + ".txt",
      lines: [line],
    });
    input.assertions.deepStrictEqual(
      input.host.diagnosticsFor(editor) ?? [],
      [],
    );
    input.assertions.deepStrictEqual(
      [...new Set(input.helpers.rowNames(editor, 0))],
      [item.expectedRow.name],
    );
  }
}

async function verifyBillingStationRAlternateOcn(input: {
  host: BillingStationRCharacterizationHost;
  lines: string[];
  assertions: BillingStationRAssertions;
}): Promise<void> {
  const firstOcnLine = requiredBillingStationRLine(input.lines, 1);
  const line = "N123456789" + firstOcnLine.slice(10);
  const editor = await selectBillingStationREditor({
    host: input.host,
    fileName: "alternate-ocn.txt",
    lines: [line],
  });
  input.assertions.deepStrictEqual(input.host.diagnosticsFor(editor) ?? [], []);
}
