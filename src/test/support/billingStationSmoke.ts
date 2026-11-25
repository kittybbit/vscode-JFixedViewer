import * as vscode from "vscode";
import { createFixedWidthDecoration } from "../../application/fixedWidth/FixedWidthDecoration";
import { loadBuiltInDefinitions } from "../../infrastructure/definitions/loadBuiltInDefinitions";
import { VscodeTextEncodingAdapter } from "../../infrastructure/encoding/VscodeTextEncodingAdapter";
import { DocumentRenderSession } from "../../presentation/vscode/DocumentRenderSession";
import { EditorDecorations } from "../../presentation/vscode/EditorDecorations";
import { ensureDocumentEncoding } from "../../presentation/vscode/documentEncoding";
import { encodeFakeText } from "./fakeTextEncoding";
import {
  billingStationExpectedRows,
  createBillingStationFixtureRows,
} from "./billingStationFixtures";

const fileType = "leased_line@billingStation";
const fileName = "U0000001-00001-001-C.txt";

function verify(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

/** Desktop と Web の実ホストで Shift_JIS・CRLF の表示と非変更を確認する。 */
export async function verifyBillingStationSmoke(): Promise<void> {
  const lines = createBillingStationFixtureRows().map(({ line }) => line);
  const bytes = encodeFakeText(lines.join("\r\n") + "\r\n", "shiftjis", false);
  const scheme = "jfixedviewerbillingstation" + Date.now();
  const provider = new ReadOnlyBillingStationProvider(fileName, bytes);
  const registration = vscode.workspace.registerFileSystemProvider(
    scheme,
    provider,
    { isCaseSensitive: true },
  );
  const uri = vscode.Uri.parse(scheme + ":/" + fileName);
  const definitions = loadBuiltInDefinitions();
  const definition = definitions.find(
    ({ fileType: candidate }) => candidate === fileType,
  );
  if (!definition) {
    throw new Error("専用線料金内訳書が実ローダーに登録されていません。");
  }

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
        "VS Code が専用線料金内訳書を Shift_JIS で再読込できません。",
      );
    }
    const document = encodingResult.document;
    const originalText = document.getText();
    verify(
      document.encoding === "shiftjis",
      "専用線料金内訳書の文書 encoding が shiftjis ではありません。",
    );
    verify(
      document.eol === vscode.EndOfLine.CRLF,
      "専用線料金内訳書の CRLF が実ホストで認識されません。",
    );
    verify(
      lines.every((line, index) => document.lineAt(index).text === line),
      "Shift_JIS と CRLF を除いた専用線レコードが一致しません。",
    );

    const analysis = await decoration.analyze({
      fileType,
      lines: lines.map((text, line) => ({
        line,
        text,
        isEmptyOrWhitespace: /^\s*$/u.test(text),
      })),
      validationEnabled: true,
      currentEncoding: document.encoding,
    });
    const lineId = analysis.fields.find(
      (field) => field.line === 2 && field.fieldName === "回線ID",
    );
    const billingCircuitCount = analysis.fields.find(
      (field) => field.line === 4 && field.fieldName === "ご請求番号合計回線数",
    );
    const expectedFieldCount = billingStationExpectedRows.reduce(
      (total, row) => total + row.fields.length,
      0,
    );
    verify(
      analysis.failure === undefined &&
        analysis.issues.length === 0 &&
        analysis.fields.length === expectedFieldCount,
      "専用線料金内訳書の5レコードに文字コードまたは検証の問題があります: " +
        JSON.stringify({
          failure: analysis.failure,
          issues: analysis.issues,
          actualFieldCount: analysis.fields.length,
          expectedFieldCount,
        }),
    );
    verify(
      JSON.stringify({
        start: lineId?.start,
        end: lineId?.end,
        displayStart: lineId?.displayStart,
        displayEnd: lineId?.displayEnd,
        lengthUnit: lineId?.lengthUnit,
      }) ===
        JSON.stringify({
          start: 2,
          end: 11,
          displayStart: 2,
          displayEnd: 11,
          lengthUnit: "byte",
        }),
      "データレコードの回線ID位置が実バイト位置と一致しません。",
    );
    verify(
      billingCircuitCount?.start === 42 &&
        billingCircuitCount.end === 47 &&
        billingCircuitCount.width === 5,
      "請求単位レコードの回線数位置が43〜47バイトではありません。",
    );

    editor = await vscode.window.showTextDocument(document, {
      preview: false,
    });
    const request = session.beginSelection(document, fileType);
    verify(
      session.activateSelection(request),
      "専用線料金内訳書を実ホストのレンダーセッションへ適用できません。",
    );
    const rendered = await session.render(request);
    verify(rendered === true, "専用線料金内訳書の実ホスト描画が完了しません。");
    verify(
      editorDecorations.has(editor) &&
        session.getSelectedFileType(uri.toString()) === fileType,
      "専用線料金内訳書の項目装飾が実ホストに適用されません。",
    );
    verify(
      vscode.languages
        .getDiagnostics(document.uri)
        .filter((diagnostic) => diagnostic.source === "JFixedViewer").length ===
        0,
      "正常な専用線料金内訳書に診断が発生しました。",
    );
    verify(
      !document.isDirty &&
        document.getText() === originalText &&
        provider.readCount >= 1 &&
        provider.writeCount === 0,
      "専用線料金内訳書の読込と描画で文書変更または書込みが発生しました。",
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
