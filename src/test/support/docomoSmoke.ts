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

/** Desktop と Web の実ホストで M/F の Shift_JIS 読込と描画を確認する。 */
export async function verifyDocomoBillingSmoke(): Promise<void> {
  await verifyDocomoFormatSmoke("M");
  await verifyDocomoFormatSmoke("F");
}

export async function verifyDocomoS1Characterization(
  input: DocomoCharacterizationInput,
): Promise<void> {
  const definitions = loadBuiltInDefinitions();
  const formats = Object.values(docomoFormatSpecs);
  input.assert.deepStrictEqual(
    definitions
      .filter(({ fileType }) => fileType.endsWith("@docomo"))
      .map(({ fileType }) => fileType),
    formats.map(({ fileType }) => fileType),
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

function verifyDocomoDefinition(
  input: DocomoCharacterizationInput,
  definitions: ReturnType<typeof loadBuiltInDefinitions>,
  format: (typeof docomoFormatSpecs)[keyof typeof docomoFormatSpecs],
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
  format: (typeof docomoFormatSpecs)[keyof typeof docomoFormatSpecs],
): Promise<void> {
  const fixtures = docomoFixtureRows.filter(
    (fixture) => fixture.fileType === format.fileType,
  );
  const firstFixture = fixtures[0];
  const assert: DocomoAssertions = input.assert;
  assert.ok(firstFixture);
  const editor = await openDocomoLines({
    host: input.host,
    name: format.name,
    fileName: firstFixture.fileName,
    lines: fixtures.map(({ line }) => line),
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
  format: (typeof docomoFormatSpecs)[keyof typeof docomoFormatSpecs];
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
  const lengthCases = Object.values(docomoFormatSpecs).flatMap((format) => {
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
  });
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

async function verifyDocomoFormatSmoke(format: "M" | "F"): Promise<void> {
  const { fixtures, firstFixture } = docomoFixturesFor(format);
  const lines = fixtures.map((fixture) => fixture.line);
  const content = `${lines.join("\r\n")}\r\n`;
  const bytes = await vscode.workspace.encode(content, {
    encoding: "shiftjis",
  });
  const scheme = `jfixedviewerdocomo${format.toLowerCase()}${Date.now()}`;
  const provider = createReadOnlyDocomoProvider(firstFixture.fileName, bytes);
  const registration = vscode.workspace.registerFileSystemProvider(
    scheme,
    provider.fileSystem,
    { isCaseSensitive: true },
  );
  const uri = vscode.Uri.parse(`${scheme}:/${firstFixture.fileName}`);
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
    verify(
      document.encoding === "shiftjis",
      `NTTドコモ ${format} 文書の encoding が Shift_JIS ではありません。`,
    );
    verify(
      document.eol === vscode.EndOfLine.CRLF,
      `NTTドコモ ${format} の CRLF が実ホストで認識されません。`,
    );
    verify(
      document.lineCount === fixtures.length + 1 &&
        document.lineAt(fixtures.length).text === "" &&
        fixtures.every(
          (fixture, index) => document.lineAt(index).text === fixture.line,
        ),
      `NTTドコモ ${format} の合成行・末尾 CRLF が Shift_JIS 再読込後に一致しません。`,
    );
    verify(
      document.getText() === content,
      `NTTドコモ ${format} の末尾 CRLF を含む文書内容が一致しません。`,
    );

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
      `NTTドコモ ${format} の行種別、項目範囲、文字表示境界または診断が期待値と一致しません。`,
    );

    editor = await vscode.window.showTextDocument(document, { preview: false });
    const request = session.beginSelection(document, firstFixture.fileType);
    verify(
      session.activateSelection(request),
      `NTTドコモ ${format} を実ホストのレンダーセッションへ適用できません。`,
    );
    verify(
      (await session.render(request)) === true,
      `NTTドコモ ${format} の実ホスト描画が完了しません。`,
    );
    verify(
      editorDecorations.has(editor) &&
        session.getSelectedFileType(uri.toString()) === firstFixture.fileType,
      `NTTドコモ ${format} の項目装飾が実ホストに適用されません。`,
    );
    verify(
      vscode.languages
        .getDiagnostics(document.uri)
        .filter((diagnostic) => diagnostic.source === "JFixedViewer").length ===
        0,
      `正常な NTTドコモ ${format} 合成レコードに診断が発生しました。`,
    );
    verify(
      !document.isDirty &&
        document.getText() === originalText &&
        provider.stats.readCount >= 2 &&
        provider.stats.writeCount === 0,
      `NTTドコモ ${format} の読込と描画で文書変更または書込みが発生しました。`,
    );
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

function docomoFixturesFor(format: "M" | "F"): {
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

function requireDocomoDefinition(fileType: string, format: "M" | "F"): void {
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
  format: "M" | "F",
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
