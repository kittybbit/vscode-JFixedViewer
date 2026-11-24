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
