import * as vscode from "vscode";
import { createFixedWidthDecoration } from "../../application/fixedWidth/FixedWidthDecoration";
import { loadBuiltInDefinitions } from "../../infrastructure/definitions/loadBuiltInDefinitions";
import { VscodeTextEncodingAdapter } from "../../infrastructure/encoding/VscodeTextEncodingAdapter";
import { DocumentRenderSession } from "../../presentation/vscode/DocumentRenderSession";
import { EditorDecorations } from "../../presentation/vscode/EditorDecorations";
import { ensureDocumentEncoding } from "../../presentation/vscode/documentEncoding";
import type { FixedWidthDefinition } from "../../domain/fixedWidth/projectFields";
import { encodeFakeText } from "./fakeTextEncoding";
import {
  billingStationExpectedRows,
  billingStationRExpectedRows,
  createBillingStationFixtureRows,
  createBillingStationRFixtureRows,
  type BillingStationRExpectedRow,
} from "./billingStationFixtures";

function verify(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

type BillingStationSmokeFieldProbe = {
  line: number;
  fieldName: string;
  position: {
    start: number;
    end: number;
    displayStart: number;
    displayEnd: number;
    width: number;
    lengthUnit: "byte";
  };
};

type BillingStationSmokeExpectedRow = Pick<
  BillingStationRExpectedRow,
  "name" | "fields" | "condition"
>;

type BillingStationSmokePlan = {
  fileType: string;
  fileName: string;
  label: string;
  lines: string[];
  expectedRows: readonly BillingStationSmokeExpectedRow[];
  probes: readonly BillingStationSmokeFieldProbe[];
};

/** Desktop と Web の実ホストで Shift_JIS・CRLF の表示と非変更を確認する。 */
export async function verifyBillingStationSmoke(): Promise<void> {
  await verifyBillingStationHostSmoke({
    fileType: "leased_line@billingStation",
    fileName: "U0000001-00001-001-C.txt",
    label: "専用線料金内訳書",
    lines: createBillingStationFixtureRows().map(({ line }) => line),
    expectedRows: billingStationExpectedRows.map((row) => ({
      name: row.name,
      fields: row.fields,
      condition: "^" + row.code,
    })),
    probes: [
      {
        line: 2,
        fieldName: "回線ID",
        position: {
          start: 2,
          end: 11,
          displayStart: 2,
          displayEnd: 11,
          width: 9,
          lengthUnit: "byte",
        },
      },
      {
        line: 4,
        fieldName: "ご請求番号合計回線数",
        position: {
          start: 42,
          end: 47,
          displayStart: 42,
          displayEnd: 47,
          width: 5,
          lengthUnit: "byte",
        },
      },
    ],
  });
  await verifyBillingStationHostSmoke({
    fileType: "statement_r@billingStation",
    fileName: "N00000",
    label: "番号別明細内訳書（R始まり）",
    lines: createBillingStationRFixtureRows().map(({ line }) => line),
    expectedRows: billingStationRExpectedRows,
    probes: [
      {
        line: 1,
        fieldName: "ＯＣＮ番号",
        position: {
          start: 0,
          end: 10,
          displayStart: 0,
          displayEnd: 10,
          width: 10,
          lengthUnit: "byte",
        },
      },
      {
        line: 1,
        fieldName: "内訳金額２",
        position: {
          start: 168,
          end: 178,
          displayStart: 168,
          displayEnd: 178,
          width: 10,
          lengthUnit: "byte",
        },
      },
    ],
  });
}

async function verifyBillingStationHostSmoke(
  plan: BillingStationSmokePlan,
): Promise<void> {
  const bytes = encodeFakeText(
    plan.lines.join("\r\n") + "\r\n",
    "shiftjis",
    false,
  );
  const scheme = "jfixedviewerbillingstation" + Date.now();
  const provider = new ReadOnlyBillingStationProvider(plan.fileName, bytes);
  const registration = vscode.workspace.registerFileSystemProvider(
    scheme,
    provider,
    { isCaseSensitive: true },
  );
  const uri = vscode.Uri.parse(scheme + ":/" + plan.fileName);
  const definitions = loadBuiltInDefinitions();
  verifyBillingStationDefinitionPresent(definitions, plan.fileType, plan.label);

  const editorDecorations = new EditorDecorations();
  const decoration = createFixedWidthDecoration(
    definitions,
    new VscodeTextEncodingAdapter(),
  );
  const session = new DocumentRenderSession(decoration, editorDecorations);
  let editor: vscode.TextEditor | undefined;
  try {
    const opened = await vscode.workspace.openTextDocument(uri);
    const encodingResult = await ensureDocumentEncoding(opened, "shiftjis");
    if (!encodingResult.ok) {
      throw new Error(
        "VS Code が" + plan.label + "を Shift_JIS で再読込できません。",
      );
    }
    const document = encodingResult.document;
    const originalText = document.getText();
    verify(
      document.encoding === "shiftjis",
      plan.label + "の文書 encoding が shiftjis ではありません。",
    );
    verify(
      document.eol === vscode.EndOfLine.CRLF,
      plan.label + "の CRLF が実ホストで認識されません。",
    );
    verify(
      plan.lines.every((line, index) => document.lineAt(index).text === line),
      "Shift_JIS と CRLF を除いた" + plan.label + "レコードが一致しません。",
    );

    const analysis = await decoration.analyze({
      fileType: plan.fileType,
      lines: plan.lines.map((text, line) => ({
        line,
        text,
        isEmptyOrWhitespace: /^\s*$/u.test(text),
      })),
      validationEnabled: true,
      currentEncoding: document.encoding,
    });
    const matchedRows = plan.lines.map((line) =>
      plan.expectedRows.find(({ condition }) =>
        new RegExp(condition, "u").test(line),
      ),
    );
    const expectedFieldCount = matchedRows.reduce(
      (total, row) => total + (row?.fields.length ?? 0),
      0,
    );
    verify(
      matchedRows.every((row) => row !== undefined) &&
        analysis.failure === undefined &&
        analysis.issues.length === 0 &&
        analysis.fields.length === expectedFieldCount,
      plan.label +
        "の全レコードに文字コードまたは検証の問題があります: " +
        JSON.stringify({
          failure: analysis.failure,
          issues: analysis.issues,
          actualFieldCount: analysis.fields.length,
          expectedFieldCount,
        }),
    );
    for (const probe of plan.probes) {
      const field = analysis.fields.find(
        (candidate) =>
          candidate.line === probe.line &&
          candidate.fieldName === probe.fieldName,
      );
      verify(
        JSON.stringify({
          start: field?.start,
          end: field?.end,
          displayStart: field?.displayStart,
          displayEnd: field?.displayEnd,
          width: field?.width,
          lengthUnit: field?.lengthUnit,
        }) === JSON.stringify(probe.position),
        plan.label + "の" + probe.fieldName + "が実バイト位置と一致しません。",
      );
    }

    editor = await vscode.window.showTextDocument(document, {
      preview: false,
    });
    const request = session.beginSelection(document, plan.fileType);
    verify(
      session.activateSelection(request),
      plan.label + "を実ホストのレンダーセッションへ適用できません。",
    );
    verify(
      (await session.render(request)) === true,
      plan.label + "の実ホスト描画が完了しません。",
    );
    verify(
      editorDecorations.has(editor) &&
        session.getSelectedFileType(uri.toString()) === plan.fileType,
      plan.label + "の項目装飾が実ホストに適用されません。",
    );
    verify(
      vscode.languages
        .getDiagnostics(document.uri)
        .filter((diagnostic) => diagnostic.source === "JFixedViewer").length ===
        0,
      "正常な" + plan.label + "に診断が発生しました。",
    );
    verify(
      !document.isDirty &&
        document.getText() === originalText &&
        provider.readCount >= 1 &&
        provider.writeCount === 0,
      plan.label + "の読込と描画で文書変更または書込みが発生しました。",
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

function verifyBillingStationDefinitionPresent(
  definitions: readonly FixedWidthDefinition[],
  fileType: string,
  label: string,
): void {
  verify(
    definitions.some((definition) => definition.fileType === fileType),
    label + "が実ローダーに登録されていません。",
  );
}

class ReadOnlyBillingStationProvider implements vscode.FileSystemProvider {
  private readonly changes = new vscode.EventEmitter<
    vscode.FileChangeEvent[]
  >();
  public readonly onDidChangeFile = this.changes.event;
  public readCount = 0;
  public writeCount = 0;

  public constructor(
    private readonly fileName: string,
    private readonly bytes: Uint8Array,
  ) {}

  public watch(
    _uri: vscode.Uri,
    _options: { recursive: boolean; excludes: readonly string[] },
  ): vscode.Disposable {
    return { dispose: () => undefined };
  }

  public stat(uri: vscode.Uri): vscode.FileStat {
    if (uri.path !== "/" + this.fileName) {
      throw vscode.FileSystemError.FileNotFound(uri);
    }
    return {
      type: vscode.FileType.File,
      ctime: 0,
      mtime: 0,
      size: this.bytes.length,
    };
  }

  public readDirectory(_uri: vscode.Uri): [string, vscode.FileType][] {
    return [];
  }

  public createDirectory(_uri: vscode.Uri): void {
    throw vscode.FileSystemError.NoPermissions();
  }

  public readFile(uri: vscode.Uri): Uint8Array {
    if (uri.path !== "/" + this.fileName) {
      throw vscode.FileSystemError.FileNotFound(uri);
    }
    this.readCount += 1;
    return this.bytes.slice();
  }

  public writeFile(
    uri: vscode.Uri,
    _content: Uint8Array,
    _options: { create: boolean; overwrite: boolean },
  ): void {
    this.writeCount += 1;
    throw vscode.FileSystemError.NoPermissions(uri);
  }

  public delete(_uri: vscode.Uri, _options: { recursive: boolean }): void {
    throw vscode.FileSystemError.NoPermissions();
  }

  public rename(
    _oldUri: vscode.Uri,
    _newUri: vscode.Uri,
    _options: { overwrite: boolean },
  ): void {
    throw vscode.FileSystemError.NoPermissions();
  }

  public dispose(): void {
    this.changes.dispose();
  }
}
