export type DocomoFixtureField = {
  name: string;
  length: number;
  type: "C" | "N";
  value: string;
};

export type DocomoExpectedField = {
  fieldName: string;
  fieldNumber: number;
  start: number;
  end: number;
  width: number;
  type: "C" | "N";
  displayStart: number;
  displayEnd: number;
};

export type DocomoFixtureRow = {
  format: "M" | "F";
  fileType: "M@docomo" | "F@docomo";
  fileTypeName: string;
  fileName: string;
  rowName: string;
  fields: readonly DocomoFixtureField[];
  expectedFields: readonly DocomoExpectedField[];
  line: string;
};

export const docomoFormatSpecs = {
  M: {
    format: "M",
    fileType: "M@docomo",
    name: "NTTドコモ/ご利用内訳明細データ",
    rowWidth: 262,
    colors: {
      管理レコード: { light: "#5CA5EA40", dark: "#284B7140" },
      電話番号別内訳レコード: { light: "#E8B05C40", dark: "#694F2740" },
      "請求書作成番号レコード（初回）": {
        light: "#A887DD40",
        dark: "#46365E40",
      },
      "請求書作成番号レコード（継続）": {
        light: "#A887DD40",
        dark: "#46365E40",
      },
      合計レコード: { light: "#96969640", dark: "#55555540" },
    },
  },
  F: {
    format: "F",
    fileType: "F@docomo",
    name: "NTTドコモ/通話・通信・ドコモ光電話通信明細データ",
    rowWidth: 138,
    colors: {
      管理レコード: { light: "#5CA5EA40", dark: "#284B7140" },
      電話番号別通話明細レコード: {
        light: "#E8B05C40",
        dark: "#694F2740",
      },
      電話番号別合計レコード: { light: "#64BC8040", dark: "#285B3D40" },
      終了レコード: { light: "#96969640", dark: "#55555540" },
    },
  },
} as const;

type DocomoFieldOptions = {
  value?: string;
  type?: "C" | "N";
};

function field(
  name: string,
  length: number,
  valueOrOptions: string | DocomoFieldOptions = "",
): DocomoFixtureField {
  const options =
    typeof valueOrOptions === "string"
      ? { value: valueOrOptions, type: "C" as const }
      : { value: "", type: "C" as const, ...valueOrOptions };
  return { name, length, ...options };
}

function blank(length: number, name = "空白"): DocomoFixtureField {
  return field(name, length);
}

function shiftJisCharacterByteLength(character: string): number {
  const specialWidths: Readonly<Record<string, number>> = { あ: 2, ｱ: 1 };
  const knownWidth = specialWidths[character];
  if (knownWidth !== undefined) {
    return knownWidth;
  }
  if (/^[\x20-\x7E]$/u.test(character)) {
    return 1;
  }
  throw new Error(`合成 fixture に未対応の文字があります: ${character}`);
}

function shiftJisByteLength(value: string): number {
  return [...value].reduce(
    (length, character) => length + shiftJisCharacterByteLength(character),
    0,
  );
}

type ExpectedFieldPosition = {
  byteStart: number;
  displayStart: number;
};

function verifyFixtureFieldWidth(
  fixtureField: DocomoFixtureField,
  valueBytes: number,
): void {
  if (valueBytes > fixtureField.length) {
    throw new Error(`${fixtureField.name} の合成値が項目幅を超えています。`);
  }
}

function expectedFixtureField(
  fixtureField: DocomoFixtureField,
  index: number,
  position: ExpectedFieldPosition,
): DocomoExpectedField {
  const valueBytes = shiftJisByteLength(fixtureField.value);
  verifyFixtureFieldWidth(fixtureField, valueBytes);
  const displayLength =
    fixtureField.value.length + fixtureField.length - valueBytes;
  const expectedField = {
    fieldName: fixtureField.name,
    fieldNumber: index + 1,
    start: position.byteStart,
    end: position.byteStart + fixtureField.length,
    width: fixtureField.length,
    type: fixtureField.type,
    displayStart: position.displayStart,
    displayEnd: position.displayStart + displayLength,
  };
  position.byteStart += fixtureField.length;
  position.displayStart += displayLength;
  return expectedField;
}

function expectedFixtureFields(
  fields: readonly DocomoFixtureField[],
): DocomoExpectedField[] {
  const position = { byteStart: 0, displayStart: 0 };
  return fields.map((fixtureField, index) =>
    expectedFixtureField(fixtureField, index, position),
  );
}

function renderFixtureField(fixtureField: DocomoFixtureField): string {
  const valueBytes = shiftJisByteLength(fixtureField.value);
  verifyFixtureFieldWidth(fixtureField, valueBytes);
  return `${fixtureField.value}${" ".repeat(fixtureField.length - valueBytes)}`;
}

function renderFixtureLine(fields: readonly DocomoFixtureField[]): string {
  return fields.map(renderFixtureField).join("");
}

function verifyFixtureRecordLength(input: {
  format: "M" | "F";
  rowName: string;
  fields: readonly DocomoFixtureField[];
  line: string;
}): void {
  const expectedLength = docomoFormatSpecs[input.format].rowWidth;
  const actualFieldWidth = input.fields.reduce(
    (total, fixtureField) => total + fixtureField.length,
    0,
  );
  if (
    actualFieldWidth !== expectedLength ||
    shiftJisByteLength(input.line) !== expectedLength
  ) {
    throw new Error(
      `${input.format} ${input.rowName} fixture の行長が仕様と一致しません。`,
    );
  }
}

function makeFixtureRow(
  format: "M" | "F",
  rowName: string,
  fields: readonly DocomoFixtureField[],
): DocomoFixtureRow {
  const formatSpec = docomoFormatSpecs[format];
  const expectedFields = expectedFixtureFields(fields);
  const line = renderFixtureLine(fields);
  verifyFixtureRecordLength({ format, rowName, fields, line });
  return {
    format,
    fileType: formatSpec.fileType,
    fileTypeName: formatSpec.name,
    fileName: `202611_${format}_0123456789_01.cla`,
    rowName,
    fields,
    expectedFields,
    line,
  };
}

const mManagement = makeFixtureRow("M", "管理レコード", [
  blank(9),
  blank(3),
  field("データ種類", 2, "01"),
  blank(4),
  field("年月群", 7, "202611A"),
  field("媒体通番", 2, { value: "01", type: "N" }),
  field("センターコード", 3, { value: "701", type: "N" }),
  blank(9),
  field("発出元企業コード", 9, "000000001"),
  blank(214),
]);

function mBreakdownFields(recordNumber: string): DocomoFixtureField[] {
  return [
    field("電話番号", 14, "03-1234-5678"),
    field("分割区分", 1, "1"),
    field("データ種類", 2, "11"),
    field("レコードNo", 2, { value: recordNumber, type: "N" }),
    field("レコード数", 2, { value: "02", type: "N" }),
    field("一括請求サービス代表番号", 14, "03-1234-5678"),
    blank(5),
    field("未請求マーク", 1, "0"),
    blank(13),
    field("定額料開始", 4, { value: "1101", type: "N" }),
    field("定額料締切", 4, { value: "1130", type: "N" }),
    field("後払料開始", 4, { value: "1101", type: "N" }),
    field("後払料締切", 4, { value: "1130", type: "N" }),
    field("検針日前回", 4, { value: "1001", type: "N" }),
    field("検針日今回", 4, { value: "1101", type: "N" }),
    field("通話料前月分", 10, "0000000000"),
    field("通話料今月分", 10, "-000000123"),
    blank(5),
    field("ご利用内訳", 10, "ｱ"),
    blank(5),
    field("内訳コード1", 3, "001"),
    field("内訳額1", 10, "-000000123"),
    blank(3, "空白1"),
    field("内訳コード2", 3, "A02"),
    field("内訳額2", 10, " "),
    blank(3, "空白2"),
    field("内訳コード3", 3, "003"),
    field("内訳額3", 10, "+000000001"),
    blank(3, "空白3"),
    ...Array.from({ length: 6 }, (_, index) => {
      const number = index + 4;
      return [
        field(`内訳コード${number}`, 3),
        field(`内訳額${number}`, 10),
        blank(3, `空白${number}`),
      ];
    }).flat(),
  ];
}

const mBreakdown = makeFixtureRow(
  "M",
  "電話番号別内訳レコード",
  mBreakdownFields("01"),
);

const mInvoiceFirst = makeFixtureRow("M", "請求書作成番号レコード（初回）", [
  field("電話番号", 14, "03-1234-5678"),
  blank(1),
  field("データ種類", 2, "51"),
  field("レコードNo", 2, { value: "01", type: "N" }),
  field("レコード数", 2, { value: "02", type: "N" }),
  blank(30),
  field("定額料開始", 4, { value: "1101", type: "N" }),
  field("定額料締切", 4, { value: "1130", type: "N" }),
  field("後払料開始", 4, { value: "1101", type: "N" }),
  field("後払料締切", 4, { value: "1130", type: "N" }),
  field("検針日前回", 4, { value: "1001", type: "N" }),
  field("検針日今回", 4, { value: "1101", type: "N" }),
  field("ダイヤル通話料前月分", 10, "0000000000"),
  field("ダイヤル通話料今月分", 10, "+000000001"),
  blank(5),
  field("ご利用内訳合計", 10, "0000000123"),
  field("件数", 5, { value: "00002", type: "N" }),
  field("金融機関コード", 7, "1234567"),
  field("口座種別", 1, "1"),
  field("口座番号", 7, "1234567"),
  field("口座名義", 40, "ｱｱ"),
  blank(5),
  field("氏名", 40, "ああ"),
  blank(47),
]);

function mInvoiceContinuationFields(): DocomoFixtureField[] {
  return [
    field("電話番号", 14, "03-1234-5678"),
    blank(1),
    field("データ種類", 2, "51"),
    field("レコードNo", 2, { value: "02", type: "N" }),
    field("レコード数", 2, { value: "02", type: "N" }),
    blank(97),
    ...Array.from({ length: 9 }, (_, index) => {
      const number = index + 1;
      return [
        field(`内訳コード${number}`, 3, number === 1 ? "001" : ""),
        field(`内訳額${number}`, 10, number === 1 ? "+000000001" : ""),
        blank(3, `空白${number}`),
      ];
    }).flat(),
  ];
}

const mInvoiceContinuation = makeFixtureRow(
  "M",
  "請求書作成番号レコード（継続）",
  mInvoiceContinuationFields(),
);

const mTotal = makeFixtureRow("M", "合計レコード", [
  blank(9),
  blank(3),
  field("データ種類", 2, "91"),
  blank(4),
  field("ご利用内訳合計", 10, "0000000123"),
  field("件数", 5, { value: "00002", type: "N" }),
  blank(9),
  blank(220),
]);

const fManagement = makeFixtureRow("F", "管理レコード", [
  blank(9),
  blank(2),
  field("データ種類", 2, "01"),
  blank(1),
  field("年月群", 7, "202611A"),
  field("媒体通番", 2, { value: "01", type: "N" }),
  field("センターコード", 3, { value: "701", type: "N" }),
  blank(9),
  field("発出元企業コード", 9, "000000001"),
  blank(94),
]);

const fCallDetail = makeFixtureRow("F", "電話番号別通話明細レコード", [
  field("電話番号", 14, "03-1234-5678"),
  field("データ種類", 2, "11"),
  field("レコードNo", 6, { value: "000001", type: "N" }),
  field("通話年月日", 8, { value: "20261122", type: "N" }),
  field("通話開始時刻", 6, { value: "123456", type: "N" }),
  field("着信先電話番号", 26, "03-9876-5432"),
  field("通話先", 6, "ああ"),
  field("通話時間", 7, { value: "0001234", type: "N" }),
  field("通話料金", 11, "00000123456"),
  blank(6, "時間区分"),
  field("割引種別", 2, "O"),
  blank(10, "通話種類1"),
  blank(10, "通話種類2"),
  blank(10, "通話種類3"),
  field("分計先", 1, "J"),
  blank(13),
]);

const fTotal = makeFixtureRow("F", "電話番号別合計レコード", [
  field("電話番号", 14, "03-1234-5678"),
  field("データ種類", 2, "51"),
  field("レコード件数", 6, { value: "000001", type: "N" }),
  field("一括請求サービス代表番号", 14, "03-1234-5678"),
  field("利用期間（自）", 4, { value: "1101", type: "N" }),
  field("利用期間（至）", 4, { value: "1130", type: "N" }),
  blank(21),
  field("通話料合計", 11, "00000123456"),
  blank(62),
]);

const fEnd = makeFixtureRow("F", "終了レコード", [
  blank(9),
  blank(2),
  field("データ種類", 2, "91"),
  blank(1),
  field("継続区分", 1, "0"),
  blank(9),
  field("発出元企業コード", 9, "000000001"),
  blank(105),
]);

export const docomoFixtureRows: readonly DocomoFixtureRow[] = [
  mManagement,
  mBreakdown,
  mInvoiceFirst,
  mInvoiceContinuation,
  mTotal,
  fManagement,
  fCallDetail,
  fTotal,
  fEnd,
];
