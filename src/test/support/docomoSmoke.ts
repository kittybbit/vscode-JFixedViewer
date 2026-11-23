import * as vscode from "vscode";
import { createFixedWidthDecoration } from "../../application/fixedWidth/FixedWidthDecoration";
import { loadBuiltInDefinitions } from "../../infrastructure/definitions/loadBuiltInDefinitions";
import { VscodeTextEncodingAdapter } from "../../infrastructure/encoding/VscodeTextEncodingAdapter";
import { DocumentRenderSession } from "../../presentation/vscode/DocumentRenderSession";
import { EditorDecorations } from "../../presentation/vscode/EditorDecorations";
import { ensureDocumentEncoding } from "../../presentation/vscode/documentEncoding";
import type { CharacterizationHost } from "./characterizationHost";
import {
  docomoFixtureRows,
  docomoFormatSpecs,
  type DocomoFormat,
  type DocomoFormatSpec,
  type DocomoFixtureRow,
} from "./docomoFixtures";
import type { DecorationOption, FakeEditor } from "./fakeVscodeTypes";

export type DocomoAssertions = {
  deepStrictEqual(actual: unknown, expected: unknown, message?: string): void;
  ok(value: unknown, message?: string): asserts value;
  strictEqual(actual: unknown, expected: unknown, message?: string): void;
};

type DocomoCharacterizationHost = Pick<
  CharacterizationHost,
  | "chooseFileType"
  | "createEditor"
  | "diagnosticsFor"
  | "setActiveEditor"
  | "waitForAnalysis"
>;

export type DocomoCharacterizationInput = {
  assert: DocomoAssertions;
  host: DocomoCharacterizationHost;
  optionsForLine(editor: FakeEditor, line: number): DecorationOption[];
  rowNames(editor: FakeEditor, line: number): string[];
};

function verify(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

/** Desktop と Web の実ホストで全形式の Shift_JIS 読込と描画を確認する。 */
export async function verifyDocomoBillingSmoke(): Promise<void> {
  await Object.keys(docomoFormatSpecs).reduce<Promise<void>>(
    async (previous, format) => {
      await previous;
      await verifyDocomoFormatSmoke(format as DocomoFormat);
    },
    Promise.resolve(),
  );
}

export async function verifyDocomoS1Characterization(
  input: DocomoCharacterizationInput,
): Promise<void> {
  const definitions = loadBuiltInDefinitions();
  const formats = [docomoFormatSpecs.M, docomoFormatSpecs.F];
  input.assert.deepStrictEqual(
    definitions
      .filter(({ fileType }) => fileType.endsWith("@docomo"))
      .map(({ fileType }) => fileType),
    Object.values(docomoFormatSpecs).map(({ fileType }) => fileType),
  );
  await formats.reduce<Promise<void>>(async (previous, format) => {
    await previous;
    verifyDocomoDefinition(input, definitions, format);
    await verifyDocomoRenderedRows(input, format);
  }, Promise.resolve());
  await verifyDocomoIdentifierCollisions(input);
  await verifyDocomoInvalidRecordCases(input);
  await verifyDocomoLineLengthAndBoundaryCases(input);
}

export async function verifyDocomoS2Characterization(
  input: DocomoCharacterizationInput,
): Promise<void> {
  const definitions = loadBuiltInDefinitions();
  const formats = [
    docomoFormatSpecs.A,
    docomoFormatSpecs.W,
    docomoFormatSpecs.J,
    docomoFormatSpecs.G,
    docomoFormatSpecs.E,
  ];
  input.assert.deepStrictEqual(
    definitions
      .filter(({ fileType }) => fileType.endsWith("@docomo"))
      .map(({ fileType }) => fileType),
    Object.values(docomoFormatSpecs).map(({ fileType }) => fileType),
  );
  await formats.reduce<Promise<void>>(async (previous, format) => {
    await previous;
    verifyDocomoDefinition(input, definitions, format);
    await verifyDocomoRenderedRows(input, format);
  }, Promise.resolve());
  await verifyDocomoS2IdentifierCollisions(input, formats);
  await verifyDocomoS2InvalidRecordCases(input, formats);
  await verifyDocomoS2AcceptedValueCases(input, formats);
  await verifyDocomoS2LineLengthAndBoundaryCases(input, formats);
}

async function verifyDocomoS2IdentifierCollisions(
  input: DocomoCharacterizationInput,
  formats: readonly DocomoFormatSpec[],
): Promise<void> {
  const cases = formats
    .filter(({ format }) => format !== "E")
    .flatMap((format) => {
      const fixture = findDocomoDetailFixture(format);
      const start = 11;
      return ["01", "91"].map((code) => ({ format, fixture, start, code }));
    });
  await cases.reduce<Promise<void>>(
    (previous, collision) =>
      previous.then(async () => {
        const line = replaceLine({
          line: collision.fixture.line,
          start: collision.start,
          end: collision.start + 2,
          replacement: collision.code,
        });
        const editor = await openDocomoLines({
          host: input.host,
          name: collision.format.name,
          fileName: `docomo-${collision.format.format}-phone-${collision.code}.cla`,
          lines: [line],
        });
        input.assert.deepStrictEqual(
          [...new Set(input.rowNames(editor, 0))],
          [collision.fixture.rowName],
          collision.format.format + " の識別位置が01/91でも明細を分類します。",
        );
        input.assert.deepStrictEqual(
          input.host.diagnosticsFor(editor) ?? [],
          [],
          collision.format.format + " の通常文字列に診断がありません。",
        );
      }),
    Promise.resolve(),
  );
}

async function verifyDocomoS2InvalidRecordCases(
  input: DocomoCharacterizationInput,
  formats: readonly DocomoFormatSpec[],
): Promise<void> {
  const cases = formats.flatMap((format) => {
    const fixture = findDocomoDetailFixture(format);
    const typeStart = fixtureFieldStart(fixture, "データ種類");
    const recordNumber = fixture.fields.find(
      ({ name }) => name === "レコードNo",
    );
    if (!recordNumber) {
      throw new Error(
        `${format.format} の明細にレコードNo fixture がありません。`,
      );
    }
    const recordNumberStart = fixtureFieldStart(fixture, "レコードNo");
    return [
      createIssueCase({
        format,
        suffix: "invalid-n",
        line: replaceLine({
          line: fixture.line,
          start: recordNumberStart,
          end: recordNumberStart + recordNumber.length,
          replacement: "X00001",
        }),
        expectedCode: "INVALID_TYPE",
      }),
      createIssueCase({
        format,
        suffix: "unknown-code",
        line: replaceLine({
          line: fixture.line,
          start: typeStart,
          end: typeStart + 2,
          replacement: "99",
        }),
        expectedCode: "UNKNOWN_RECORD",
      }),
    ];
  });
  await cases.reduce<Promise<void>>(
    (previous, issueCase) =>
      previous.then(() => verifyDocomoIssueCase(input, issueCase)),
    Promise.resolve(),
  );
}

async function verifyDocomoS2AcceptedValueCases(
  input: DocomoCharacterizationInput,
  formats: readonly DocomoFormatSpec[],
): Promise<void> {
  await verifyDocomoS2SignedFeeCases(input, formats);
  await verifyDocomoS2BlankNumberCases(input, formats);
}

async function verifyDocomoS2SignedFeeCases(
  input: DocomoCharacterizationInput,
  formats: readonly DocomoFormatSpec[],
): Promise<void> {
  const signedFeeCases = formats.map((format) => {
    const fixture = findDocomoDetailFixture(format);
    const fieldName = format.format === "W" ? "通信料金" : "通信料";
    const expected = requireDocomoExpectedField({
      fixture,
      fieldName,
      format: format.format,
      type: "C",
    });
    return {
      format,
      suffix: "signed-fee",
      line: replaceLine({
        line: fixture.line,
        start: expected.displayStart,
        end: expected.displayEnd,
        replacement: `-${"0".repeat(expected.width - 1)}`,
      }),
      expectedCodes: [],
    };
  });
  await signedFeeCases.reduce(
    (previous, lengthCase) =>
      previous.then(() => verifyDocomoLengthCase(input, lengthCase)),
    Promise.resolve(),
  );
}

async function verifyDocomoS2BlankNumberCases(
  input: DocomoCharacterizationInput,
  formats: readonly DocomoFormatSpec[],
): Promise<void> {
  const blankNumberCases = formats.map((format) => {
    const fixture = findDocomoDetailFixture(format);
    const expected = requireDocomoExpectedField({
      fixture,
      fieldName: "レコードNo",
      format: format.format,
      type: "N",
    });
    return {
      format,
      suffix: "blank-n",
      line: replaceLine({
        line: fixture.line,
        start: expected.displayStart,
        end: expected.displayEnd,
        replacement: " ".repeat(expected.width),
      }),
      expectedCodes: [],
    };
  });
  await blankNumberCases.reduce(
    (previous, lengthCase) =>
      previous.then(() => verifyDocomoLengthCase(input, lengthCase)),
    Promise.resolve(),
  );
}

async function verifyDocomoS2LineLengthAndBoundaryCases(
  input: DocomoCharacterizationInput,
  formats: readonly DocomoFormatSpec[],
): Promise<void> {
  const lengthCases = formats.flatMap((format) => {
    const fixture = findDocomoDetailFixture(format);
    return [
      {
        format,
        suffix: "short",
        line: fixture.line.slice(0, -1),
        expectedCodes: ["INVALID_LENGTH"],
      },
      {
        format,
        suffix: "long",
        line: `${fixture.line} `,
        expectedCodes: ["INVALID_LENGTH"],
      },
      { format, suffix: "blank", line: "", expectedCodes: [] },
    ];
  });
  await lengthCases.reduce<Promise<void>>(
    (previous, lengthCase) =>
      previous.then(() => verifyDocomoLengthCase(input, lengthCase)),
    Promise.resolve(),
  );
  const eDetail = findDocomoDetailFixture(docomoFormatSpecs.E);
  const boundary = fixtureFieldStart(eDetail, "通信年月日");
  await verifyDocomoLengthCase(input, {
    format: docomoFormatSpecs.E,
    suffix: "split-boundary",
    line: replaceLine({
      line: eDetail.line,
      start: boundary - 1,
      end: boundary + 1,
      replacement: "あ",
    }),
    expectedCodes: ["INVALID_BYTE_BOUNDARY", "INVALID_BYTE_BOUNDARY"],
  });
}

function findDocomoDetailFixture(format: DocomoFormatSpec): DocomoFixtureRow {
  const fixture = docomoFixtureRows.find(
    (candidate) =>
      candidate.fileType === format.fileType &&
      candidate.fields.some(
        ({ name, value }) => name === "データ種類" && value === "11",
      ),
  );
  if (!fixture) {
    throw new Error(`${format.format} の明細 fixture がありません。`);
  }
  return { ...fixture, line: fixture.line.replaceAll("－", "あ") };
}

function requireDocomoExpectedField(input: {
  fixture: DocomoFixtureRow;
  fieldName: string;
  format: string;
  type: "C" | "N";
}): DocomoFixtureRow["expectedFields"][number] {
  const expected = input.fixture.expectedFields.find(
    ({ fieldName }) => fieldName === input.fieldName,
  );
  if (!expected || expected.type !== input.type) {
    throw new Error(
      `${input.format} の${input.fieldName} fixture が期待型 ${input.type} ではありません。`,
    );
  }
  return expected;
}

function fixtureFieldStart(
  fixture: DocomoFixtureRow,
  fieldName: string,
): number {
  let start = 0;
  for (const fixtureField of fixture.fields) {
    if (fixtureField.name === fieldName) {
      return start;
    }
    start += fixtureField.length;
  }
  throw new Error(
    `${fixture.format} ${fixture.rowName} に ${fieldName} がありません。`,
  );
}

function verifyDocomoDefinition(
  input: DocomoCharacterizationInput,
  definitions: ReturnType<typeof loadBuiltInDefinitions>,
  format: DocomoFormatSpec,
): void {
  const fixtures = docomoFixtureRows.filter(
    (fixture) => fixture.fileType === format.fileType,
  );
  const definition = definitions.find(
    (candidate) => candidate.fileType === format.fileType,
  );
  input.assert.ok(definition);
  input.assert.deepStrictEqual(
    {
      name: definition.name,
      encoding: definition.encoding,
      lengthUnit: definition.lengthUnit,
    },
    { name: format.name, encoding: "shiftjis", lengthUnit: "byte" },
  );
  input.assert.strictEqual(definition.rows.length, fixtures.length);
  input.assert.strictEqual(
    definition.fileNamePattern.test(
      `202611_${format.format}_0123456789_01.cla`,
    ),
    true,
  );
  input.assert.strictEqual(
    definition.fileNamePattern.test(
      `202611_${format.format}_0123456789_01.cla.txt`,
    ),
    false,
  );
  fixtures.forEach((fixture) =>
    verifyDocomoDefinitionRow({
      input,
      rows: definition.rows,
      format,
      fixture,
    }),
  );
}

function verifyDocomoDefinitionRow(args: {
  input: DocomoCharacterizationInput;
  rows: ReturnType<typeof loadBuiltInDefinitions>[number]["rows"];
  format: (typeof docomoFormatSpecs)[keyof typeof docomoFormatSpecs];
  fixture: DocomoFixtureRow;
}): void {
  const { input, rows, format, fixture } = args;
  const assert: DocomoAssertions = input.assert;
  const row = rows.find((candidate) => candidate.name === fixture.rowName);
  assert.ok(row, fixture.rowName);
  input.assert.deepStrictEqual(
    row.fields?.map(({ name, length, type }) => ({ name, length, type })),
    fixture.fields.map(({ name, length, type }) => ({ name, length, type })),
    `${format.format} ${fixture.rowName} の項目定義`,
  );
  input.assert.strictEqual(
    row.fields?.reduce((total, field) => total + field.length, 0),
    format.rowWidth,
    `${format.format} ${fixture.rowName} のレコード幅`,
  );
  input.assert.deepStrictEqual(
    row.backgroundColor,
    format.colors[fixture.rowName as keyof typeof format.colors],
  );
}

async function verifyDocomoRenderedRows(
  input: DocomoCharacterizationInput,
  format: DocomoFormatSpec,
): Promise<void> {
  const fixtures = docomoFixtureRows.filter(
    (fixture) => fixture.fileType === format.fileType,
  );
  const firstFixture = fixtures[0];
  const assert: DocomoAssertions = input.assert;
  assert.ok(firstFixture);
  const lines = fixtures.map((fixture) => fixture.line.replaceAll("－", "あ"));
  const editor = await openDocomoLines({
    host: input.host,
    name: format.name,
    fileName: firstFixture.fileName,
    lines,
  });
  input.assert.strictEqual(editor.document.encoding, "shiftjis");
  input.assert.strictEqual(editor.document.isDirty, false);
  input.assert.deepStrictEqual(input.host.diagnosticsFor(editor) ?? [], []);
  fixtures.forEach((fixture, line) =>
    verifyDocomoRenderedFixture({ input, format, editor, fixture, line }),
  );
}

function verifyDocomoRenderedFixture(args: {
  input: DocomoCharacterizationInput;
  format: DocomoFormatSpec;
  editor: FakeEditor;
  fixture: DocomoFixtureRow;
  line: number;
}): void {
  const { input, format, editor, fixture, line } = args;
  const assert: DocomoAssertions = input.assert;
  const options = input.optionsForLine(editor, line);
  input.assert.deepStrictEqual(
    [...new Set(input.rowNames(editor, line))],
    [fixture.rowName],
    `${format.format} ${fixture.rowName} の識別`,
  );
  input.assert.strictEqual(options.length, fixture.expectedFields.length);
  input.assert.deepStrictEqual(
    options.map(({ range }) => [range.start.character, range.end.character]),
    fixture.expectedFields.map((field) => [
      field.displayStart,
      field.displayEnd,
    ]),
    `${format.format} ${fixture.rowName} の文字範囲`,
  );
  options.forEach((option, index) => {
    const expected = fixture.expectedFields[index];
    assert.ok(expected);
    input.assert.strictEqual(
      option.hoverMessage?.value,
      [
        `**${fixture.rowName} / ${expected.fieldName} (項目 ${expected.fieldNumber})**  `,
        `位置: ${expected.start + 1} - ${expected.end} (${expected.width}バイト)`,
        `データ型: ${expected.type}`,
      ].join("\n"),
    );
  });
}

async function verifyDocomoIdentifierCollisions(
  input: DocomoCharacterizationInput,
): Promise<void> {
  const collisionRows = [
    {
      format: docomoFormatSpecs.M,
      rowName: "電話番号別内訳レコード",
      makeLine: (line: string, code: string) =>
        `${" ".repeat(12)}${code}${line.slice(14)}`,
    },
    {
      format: docomoFormatSpecs.F,
      rowName: "電話番号別通話明細レコード",
      makeLine: (line: string, code: string) =>
        `${" ".repeat(11)}${code} ${line.slice(14)}`,
    },
  ];
  const collisionCases = collisionRows.flatMap((collisionRow) =>
    ["01", "91"].map((code) => ({ collisionRow, code })),
  );
  await collisionCases.reduce<Promise<void>>(
    (previous, collisionCase) =>
      previous.then(() =>
        verifyDocomoIdentifierCollision(input, collisionCase),
      ),
    Promise.resolve(),
  );
}

async function verifyDocomoIdentifierCollision(
  input: DocomoCharacterizationInput,
  collisionCase: {
    collisionRow: {
      format: (typeof docomoFormatSpecs)[keyof typeof docomoFormatSpecs];
      rowName: string;
      makeLine(line: string, code: string): string;
    };
    code: string;
  },
): Promise<void> {
  const { collisionRow, code } = collisionCase;
  const fixture = findDocomoFixture(
    collisionRow.format.fileType,
    collisionRow.rowName,
  );
  const line = collisionRow.makeLine(fixture.line, code);
  const editor = await openDocomoLines({
    host: input.host,
    name: collisionRow.format.name,
    fileName: `docomo-${collisionRow.format.format}-phone-${code}.cla`,
    lines: [line],
  });
  input.assert.strictEqual(input.rowNames(editor, 0)[0], collisionRow.rowName);
  input.assert.deepStrictEqual(input.host.diagnosticsFor(editor) ?? [], []);
}

async function verifyDocomoInvalidRecordCases(
  input: DocomoCharacterizationInput,
): Promise<void> {
  const mBreakdown = findDocomoFixture(
    docomoFormatSpecs.M.fileType,
    "電話番号別内訳レコード",
  );
  const mInvoiceFirst = findDocomoFixture(
    docomoFormatSpecs.M.fileType,
    "請求書作成番号レコード（初回）",
  );
  const fCallDetail = findDocomoFixture(
    docomoFormatSpecs.F.fileType,
    "電話番号別通話明細レコード",
  );
  const cases = [
    createIssueCase({
      format: docomoFormatSpecs.M,
      suffix: "invalid-n",
      line: replaceLine({
        line: mBreakdown.line,
        start: 17,
        end: 19,
        replacement: "A1",
      }),
      expectedCode: "INVALID_TYPE",
    }),
    createIssueCase({
      format: docomoFormatSpecs.F,
      suffix: "invalid-n",
      line: replaceLine({
        line: fCallDetail.line,
        start: 16,
        end: 22,
        replacement: "X00001",
      }),
      expectedCode: "INVALID_TYPE",
    }),
    createIssueCase({
      format: docomoFormatSpecs.M,
      suffix: "unknown-code",
      line: replaceLine({
        line: mBreakdown.line,
        start: 15,
        end: 17,
        replacement: "99",
      }),
      expectedCode: "UNKNOWN_RECORD",
    }),
    createIssueCase({
      format: docomoFormatSpecs.F,
      suffix: "unknown-code",
      line: replaceLine({
        line: fCallDetail.line,
        start: 14,
        end: 16,
        replacement: "99",
      }),
      expectedCode: "UNKNOWN_RECORD",
    }),
    createIssueCase({
      format: docomoFormatSpecs.M,
      suffix: "unknown-sequence",
      line: replaceLine({
        line: mInvoiceFirst.line,
        start: 17,
        end: 19,
        replacement: "00",
      }),
      expectedCode: "UNKNOWN_RECORD",
    }),
    createIssueCase({
      format: docomoFormatSpecs.M,
      suffix: "non-numeric-sequence",
      line: replaceLine({
        line: mInvoiceFirst.line,
        start: 17,
        end: 19,
        replacement: "A1",
      }),
      expectedCode: "UNKNOWN_RECORD",
    }),
    createIssueCase({
      format: docomoFormatSpecs.M,
      suffix: "short-sequence",
      line: mInvoiceFirst.line.slice(0, 18),
      expectedCode: "UNKNOWN_RECORD",
    }),
    createIssueCase({
      format: docomoFormatSpecs.M,
      suffix: "multibyte-prefix",
      line: `あ${" ".repeat(12)}${mBreakdown.line.slice(14)}`,
      expectedCode: "UNKNOWN_RECORD",
    }),
  ];
  await cases.reduce<Promise<void>>(
    (previous, issueCase) =>
      previous.then(() => verifyDocomoIssueCase(input, issueCase)),
    Promise.resolve(),
  );
}

function createIssueCase(input: {
  format: (typeof docomoFormatSpecs)[keyof typeof docomoFormatSpecs];
  suffix: string;
  line: string;
  expectedCode: string;
}): typeof input {
  return input;
}

async function verifyDocomoIssueCase(
  input: DocomoCharacterizationInput,
  issueCase: ReturnType<typeof createIssueCase>,
): Promise<void> {
  const editor = await openDocomoLines({
    host: input.host,
    name: issueCase.format.name,
    fileName: `docomo-${issueCase.format.format}-${issueCase.suffix}.cla`,
    lines: [issueCase.line],
  });
  input.assert.deepStrictEqual(
    input.host.diagnosticsFor(editor)?.map((diagnostic) => diagnostic.code),
    [issueCase.expectedCode],
  );
  input.assert.strictEqual(editor.document.getText(), issueCase.line);
  input.assert.strictEqual(editor.document.isDirty, false);
}

async function verifyDocomoLineLengthAndBoundaryCases(
  input: DocomoCharacterizationInput,
): Promise<void> {
  const lengthCases = [docomoFormatSpecs.M, docomoFormatSpecs.F].flatMap(
    (format) => {
      const rowName =
        format.format === "M"
          ? "電話番号別内訳レコード"
          : "電話番号別通話明細レコード";
      const fixture = findDocomoFixture(format.fileType, rowName);
      return [
        {
          format,
          suffix: "short",
          line: fixture.line.slice(0, -1),
          expectedCodes: ["INVALID_LENGTH"],
        },
        {
          format,
          suffix: "long",
          line: `${fixture.line} `,
          expectedCodes: ["INVALID_LENGTH"],
        },
        { format, suffix: "blank", line: "", expectedCodes: [] },
      ];
    },
  );
  await lengthCases.reduce<Promise<void>>(
    (previous, lengthCase) =>
      previous.then(() => verifyDocomoLengthCase(input, lengthCase)),
    Promise.resolve(),
  );

  const mBreakdown = findDocomoFixture(
    docomoFormatSpecs.M.fileType,
    "電話番号別内訳レコード",
  );
  await verifyDocomoLengthCase(input, {
    format: docomoFormatSpecs.M,
    suffix: "split-boundary",
    line: `${mBreakdown.line.slice(0, 20)}あ${mBreakdown.line.slice(22)}`,
    expectedCodes: ["INVALID_BYTE_BOUNDARY", "INVALID_BYTE_BOUNDARY"],
  });
}

async function verifyDocomoLengthCase(
  input: DocomoCharacterizationInput,
  lengthCase: {
    format: (typeof docomoFormatSpecs)[keyof typeof docomoFormatSpecs];
    suffix: string;
    line: string;
    expectedCodes: string[];
  },
): Promise<void> {
  const editor = await openDocomoLines({
    host: input.host,
    name: lengthCase.format.name,
    fileName: `docomo-${lengthCase.format.format}-${lengthCase.suffix}.cla`,
    lines: [lengthCase.line],
  });
  input.assert.deepStrictEqual(
    (input.host.diagnosticsFor(editor) ?? []).map(({ code }) => code),
    lengthCase.expectedCodes,
    `${lengthCase.format.format} の${lengthCase.suffix}行`,
  );
  input.assert.strictEqual(editor.document.getText(), lengthCase.line);
  input.assert.strictEqual(editor.document.isDirty, false);
}

function findDocomoFixture(
  fileType: string,
  rowName: string,
): DocomoFixtureRow {
  const fixture = docomoFixtureRows.find(
    (candidate) =>
      candidate.fileType === fileType && candidate.rowName === rowName,
  );
  if (!fixture) {
    throw new Error(`ドコモの ${rowName} fixture がありません。`);
  }
  return fixture;
}

function replaceLine(input: {
  line: string;
  start: number;
  end: number;
  replacement: string;
}): string {
  return (
    input.line.slice(0, input.start) +
    input.replacement +
    input.line.slice(input.end)
  );
}

async function openDocomoLines(input: {
  host: DocomoCharacterizationHost;
  name: string;
  fileName: string;
  lines: string[];
}): Promise<FakeEditor> {
  const editor = input.host.createEditor(
    input.fileName,
    input.lines,
    `docomo:${input.fileName}`,
  );
  input.host.setActiveEditor(editor);
  await input.host.chooseFileType(input.name);
  await input.host.waitForAnalysis();
  return editor;
}

async function verifyDocomoFormatSmoke(format: DocomoFormat): Promise<void> {
  const { fixtures, firstFixture } = docomoFixturesFor(format);
  const lines = fixtures.map((fixture) => fixture.line);
  const content = lines.join("\r\n") + "\r\n";
  const bytes = await vscode.workspace.encode(content, {
    encoding: "shiftjis",
  });
  await verifyDocomoEncodedFullWidthMinus(format, fixtures);
  const scheme = "jfixedviewerdocomo" + format.toLowerCase() + Date.now();
  const provider = createReadOnlyDocomoProvider(firstFixture.fileName, bytes);
  const registration = vscode.workspace.registerFileSystemProvider(
    scheme,
    provider.fileSystem,
    { isCaseSensitive: true },
  );
  const uri = vscode.Uri.parse(scheme + ":/" + firstFixture.fileName);
  requireDocomoDefinition(firstFixture.fileType, format);

  const editorDecorations = new EditorDecorations();
  const decoration = createFixedWidthDecoration(
    loadBuiltInDefinitions(),
    new VscodeTextEncodingAdapter(),
  );
  const session = new DocumentRenderSession(decoration, editorDecorations);
  let editor: vscode.TextEditor | undefined;
  try {
    const opened = await vscode.workspace.openTextDocument(uri);
    const document = await reloadDocomoDocument(opened, format);
    const originalText = document.getText();
    verifyDocomoDocumentContent({ document, fixtures, format, content });
    await verifyDocomoFormatAnalysis({
      decoration,
      document,
      firstFixture,
      fixtures,
      format,
      lines,
    });
    editor = await verifyDocomoFormatRendering({
      document,
      editorDecorations,
      firstFixture,
      format,
      session,
      uri,
    });
    verifyDocomoDocumentReadOnly({ document, originalText, provider, format });
  } finally {
    session.dispose();
    editorDecorations.dispose();
    if (editor) {
      await vscode.commands.executeCommand(
        "workbench.action.closeActiveEditor",
      );
    }
    registration.dispose();
    provider.dispose();
  }
}

function docomoFullWidthMinus(format: DocomoFormat):
  | {
      fieldName: string;
      width: number;
    }
  | undefined {
  const specs: Partial<
    Record<DocomoFormat, { fieldName: string; width: number }>
  > = {
    G: { fieldName: "接続会社（国名）", width: 30 },
    E: { fieldName: "区分", width: 16 },
  };
  return specs[format];
}

async function verifyDocomoEncodedFullWidthMinus(
  format: DocomoFormat,
  fixtures: readonly DocomoFixtureRow[],
): Promise<void> {
  const marker = docomoFullWidthMinus(format);
  if (!marker) {
    return;
  }
  const markerLine = fixtures.findIndex((fixture) =>
    fixture.fields.some(
      ({ name, value }) => name === marker.fieldName && value.includes("－"),
    ),
  );
  const encodedMinus = await vscode.workspace.encode("－", {
    encoding: "shiftjis",
  });
  verify(
    markerLine >= 0 &&
      encodedMinus.length === 2 &&
      encodedMinus[0] === 0x81 &&
      encodedMinus[1] === 0x7c,
    "NTTドコモ " + format + " の U+FF0D が CP932 の 81 7C になりません。",
  );
}

function verifyDocomoDocumentContent(input: {
  document: vscode.TextDocument;
  fixtures: readonly DocomoFixtureRow[];
  format: DocomoFormat;
  content: string;
}): void {
  const { document, fixtures, format, content } = input;
  verify(
    document.encoding === "shiftjis",
    "NTTドコモ " + format + " 文書の encoding が Shift_JIS ではありません。",
  );
  verify(
    document.eol === vscode.EndOfLine.CRLF,
    "NTTドコモ " + format + " の CRLF が実ホストで認識されません。",
  );
  verify(
    document.lineCount === fixtures.length + 1 &&
      document.lineAt(fixtures.length).text === "",
    "NTTドコモ " + format + " の末尾 CRLF を再読込後に保持できません。",
  );
  verify(
    fixtures.every(
      (fixture, index) => document.lineAt(index).text === fixture.line,
    ),
    "NTTドコモ " + format + " の合成行が Shift_JIS 再読込後に一致しません。",
  );
  const marker = docomoFullWidthMinus(format);
  if (marker) {
    const markerLine = fixtures.findIndex((fixture) =>
      fixture.fields.some(
        ({ name, value }) => name === marker.fieldName && value.includes("－"),
      ),
    );
    const markerFixture = fixtures[markerLine];
    verify(
      markerLine >= 0 &&
        document.lineAt(markerLine).text.includes("－") &&
        markerFixture?.expectedFields.some(
          ({ fieldName, width }) =>
            fieldName === marker.fieldName && width === marker.width,
        ),
      "NTTドコモ " + format + " の U+FF0D が2バイト幅の項目で復号されません。",
    );
  }
  verify(
    document.getText() === content,
    "NTTドコモ " + format + " の末尾 CRLF を含む文書内容が一致しません。",
  );
}

async function verifyDocomoFormatAnalysis(input: {
  decoration: ReturnType<typeof createFixedWidthDecoration>;
  document: vscode.TextDocument;
  firstFixture: DocomoFixtureRow;
  fixtures: readonly DocomoFixtureRow[];
  format: DocomoFormat;
  lines: readonly string[];
}): Promise<void> {
  const { decoration, document, firstFixture, fixtures, format, lines } = input;
  const analysis = await decoration.analyze({
    fileType: firstFixture.fileType,
    lines: lines.map((text, line) => ({
      line,
      text,
      isEmptyOrWhitespace: /^\s*$/u.test(text),
    })),
    validationEnabled: true,
    currentEncoding: document.encoding,
  });
  const expectedFields = fixtures.flatMap((fixture, line) =>
    fixture.expectedFields.map((field) => ({
      line,
      name: fixture.rowName,
      fieldName: field.fieldName,
      fieldNumber: field.fieldNumber,
      start: field.start,
      end: field.end,
      width: field.width,
      type: field.type,
      displayStart: field.displayStart,
      displayEnd: field.displayEnd,
      lengthUnit: "byte",
    })),
  );
  const actualFields = analysis.fields.map((field) => ({
    line: field.line,
    name: field.name,
    fieldName: field.fieldName,
    fieldNumber: field.fieldNumber,
    start: field.start,
    end: field.end,
    width: field.width,
    type: field.type,
    displayStart: field.displayStart,
    displayEnd: field.displayEnd,
    lengthUnit: field.lengthUnit,
  }));
  verify(
    analysis.failure === undefined &&
      analysis.issues.length === 0 &&
      JSON.stringify(actualFields) === JSON.stringify(expectedFields),
    "NTTドコモ " + format + " の項目範囲、表示境界または診断が一致しません。",
  );
}

async function verifyDocomoFormatRendering(input: {
  document: vscode.TextDocument;
  editorDecorations: EditorDecorations;
  firstFixture: DocomoFixtureRow;
  format: DocomoFormat;
  session: DocumentRenderSession;
  uri: vscode.Uri;
}): Promise<vscode.TextEditor> {
  const { document, editorDecorations, firstFixture, format, session, uri } =
    input;
  const editor = await vscode.window.showTextDocument(document, {
    preview: false,
  });
  const request = session.beginSelection(document, firstFixture.fileType);
  verify(
    session.activateSelection(request),
    "NTTドコモ " + format + " を実ホストのレンダーセッションへ適用できません。",
  );
  verify(
    (await session.render(request)) === true,
    "NTTドコモ " + format + " の実ホスト描画が完了しません。",
  );
  verify(
    editorDecorations.has(editor) &&
      session.getSelectedFileType(uri.toString()) === firstFixture.fileType,
    "NTTドコモ " + format + " の項目装飾が実ホストに適用されません。",
  );
  verify(
    vscode.languages
      .getDiagnostics(document.uri)
      .filter((diagnostic) => diagnostic.source === "JFixedViewer").length ===
      0,
    "正常な NTTドコモ " + format + " 合成レコードに診断が発生しました。",
  );
  return editor;
}

function verifyDocomoDocumentReadOnly(input: {
  document: vscode.TextDocument;
  originalText: string;
  provider: ReturnType<typeof createReadOnlyDocomoProvider>;
  format: DocomoFormat;
}): void {
  const { document, originalText, provider, format } = input;
  verify(
    !document.isDirty &&
      document.getText() === originalText &&
      provider.stats.readCount >= 2 &&
      provider.stats.writeCount === 0,
    "NTTドコモ " +
      format +
      " の読込と描画で文書変更または書込みが発生しました。",
  );
}

function docomoFixturesFor(format: DocomoFormat): {
  fixtures: DocomoFixtureRow[];
  firstFixture: DocomoFixtureRow;
} {
  const fixtures = docomoFixtureRows.filter(
    (fixture) => fixture.format === format,
  );
  const firstFixture = fixtures[0];
  if (!firstFixture) {
    throw new Error(`${format} のドコモ合成 fixture がありません。`);
  }
  return { fixtures, firstFixture };
}

function requireDocomoDefinition(fileType: string, format: DocomoFormat): void {
  if (
    !loadBuiltInDefinitions().some(
      (definition) => definition.fileType === fileType,
    )
  ) {
    throw new Error(`NTTドコモ ${format} 形式が実ローダーにありません。`);
  }
}

async function reloadDocomoDocument(
  document: vscode.TextDocument,
  format: DocomoFormat,
): Promise<vscode.TextDocument> {
  const result = await ensureDocumentEncoding(document, "shiftjis");
  if (!result.ok) {
    throw new Error(
      `VS Code が NTTドコモ ${format} を Shift_JIS で再読込できません。`,
    );
  }
  return result.document;
}

function createReadOnlyDocomoProvider(
  fileName: string,
  bytes: Uint8Array,
): {
  fileSystem: vscode.FileSystemProvider;
  stats: { readonly readCount: number; readonly writeCount: number };
  dispose(): void;
} {
  const changes = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
  let readCount = 0;
  let writeCount = 0;
  const fileBytes = (uri: vscode.Uri): Uint8Array => {
    if (uri.path !== `/${fileName}`) {
      throw vscode.FileSystemError.FileNotFound(uri);
    }
    return bytes;
  };
  const denyAccess = (uri?: vscode.Uri): never => {
    throw vscode.FileSystemError.NoPermissions(uri);
  };
  const fileSystem: vscode.FileSystemProvider = {
    onDidChangeFile: changes.event,
    watch: () => ({ dispose: () => undefined }),
    stat: (uri) => ({
      type: vscode.FileType.File,
      ctime: 0,
      mtime: 0,
      size: fileBytes(uri).length,
    }),
    readDirectory: () => [],
    createDirectory: () => denyAccess(),
    readFile: (uri) => {
      readCount += 1;
      return fileBytes(uri).slice();
    },
    writeFile: (uri) => {
      writeCount += 1;
      denyAccess(uri);
    },
    delete: () => denyAccess(),
    rename: () => denyAccess(),
  };
  return {
    fileSystem,
    stats: {
      get readCount() {
        return readCount;
      },
      get writeCount() {
        return writeCount;
      },
    },
    dispose: () => changes.dispose(),
  };
}
