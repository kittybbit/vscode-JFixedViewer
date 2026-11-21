import * as vscode from "vscode";
import { createFixedWidthDecoration } from "../../application/fixedWidth/FixedWidthDecoration";
import { loadBuiltInDefinitions } from "../../infrastructure/definitions/loadBuiltInDefinitions";
import { VscodeTextEncodingAdapter } from "../../infrastructure/encoding/VscodeTextEncodingAdapter";
import { DocumentRenderSession } from "../../presentation/vscode/DocumentRenderSession";
import { EditorDecorations } from "../../presentation/vscode/EditorDecorations";
import { ensureDocumentEncoding } from "../../presentation/vscode/documentEncoding";

const fileType = "dial_meisai_2026@ntt";
const fileName = "M000000000001_202609";
const customerNumber = "000000000001";
const telephoneNumber = "00-0000-0000";
const billingMonth = "202609";

type FieldValue = readonly [number, string, ("left" | "right")?];

function verify(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function record(fields: readonly FieldValue[]): string {
  const line = fields
    .map(([width, value = "", alignment = "left"]) => {
      verify(value.length <= width, "NTT スモークの値が項目幅を超えています。");
      return alignment === "right"
        ? value.padStart(width, " ")
        : value.padEnd(width, " ");
    })
    .join("");
  verify(
    new TextEncoder().encode(line).length === 128,
    "NTT スモークのレコード幅が128バイトではありません。",
  );
  return line;
}

function createSmokeLines(): string[] {
  return [
    record([
      [1, "1"],
      [12, customerNumber],
      [8, "20260901"],
      [6, billingMonth],
      [2, "01"],
      [99, ""],
    ]),
    record([
      [1, "2"],
      [12, customerNumber],
      [13, telephoneNumber],
      [2, "02"],
      [7, "0000001"],
      [8, "20260901"],
      [8, "20260930"],
      [11, "0120-000000"],
      [1, "1"],
      [2, "01"],
      [6, billingMonth],
      [57, ""],
    ]),
    record([
      [1, "3"],
      [12, customerNumber],
      [13, telephoneNumber],
      [2, "02"],
      [13, telephoneNumber],
      [4, "0901"],
      [6, "101530"],
      [13, "00-1111-2222", "right"],
      [2, "  "],
      [8, "00000010"],
      [10, "0000000123"],
      [2, "00"],
      [3, "000"],
      [3, "000"],
      [1, "0"],
      [3, "000"],
      [2, "01"],
      [6, billingMonth],
      [24, ""],
    ]),
    record([
      [1, "4"],
      [12, customerNumber],
      [13, telephoneNumber],
      [2, "02"],
      [2, "01"],
      [9, "000000012"],
      [9, "000000000"],
      [9, "000000012"],
      [10, "0000000010"],
      [2, "01"],
      [6, billingMonth],
      [53, ""],
    ]),
    record([
      [1, "5"],
      [12, customerNumber],
      [13, telephoneNumber],
      [2, "02"],
      [2, "01"],
      [10, "0000000005"],
      [2, "01"],
      [6, billingMonth],
      [80, ""],
    ]),
    record([
      [1, "6"],
      [2, "01"],
      [9, "000000006"],
      [6, billingMonth],
      [110, ""],
    ]),
  ];
}

function createUtf8BomBytes(lines: readonly string[]): Uint8Array {
  const payload = new TextEncoder().encode(`${lines.join("\r\n")}\r\n`);
  const bytes = new Uint8Array(payload.length + 3);
  bytes.set([0xef, 0xbb, 0xbf], 0);
  bytes.set(payload, 3);
  return bytes;
}

/** Desktop と Web の実ホストで NTT ダイヤル形式の読込と描画を確認する。 */
export async function verifyNttDialSmoke(): Promise<void> {
  const lines = createSmokeLines();
  const bytes = createUtf8BomBytes(lines);
  const scheme = `jfixedviewernttdial${Date.now()}`;
  const provider = new ReadOnlyNttProvider(fileName, bytes);
  const registration = vscode.workspace.registerFileSystemProvider(
    scheme,
    provider,
    { isCaseSensitive: true },
  );
  const uri = vscode.Uri.parse(`${scheme}:/${fileName}`);
  const definition = loadBuiltInDefinitions().find(
    ({ fileType: candidate }) => candidate === fileType,
  );
  if (!definition) {
    throw new Error("NTT ダイヤル形式が実ローダーに登録されていません。");
  }

  const editorDecorations = new EditorDecorations();
  const decoration = createFixedWidthDecoration(
    loadBuiltInDefinitions(),
    new VscodeTextEncodingAdapter(),
  );
  const session = new DocumentRenderSession(decoration, editorDecorations);
  let editor: vscode.TextEditor | undefined;
  try {
    const opened = await vscode.workspace.openTextDocument(uri);
    const encodingResult = await ensureDocumentEncoding(opened, "utf8bom");
    if (!encodingResult.ok) {
      throw new Error(
        "VS Code が NTT ダイヤル形式を UTF-8 BOM で再読込できません。",
      );
    }
    const document = encodingResult.document;
    const originalText = document.getText();
    verify(
      document.encoding === "utf8bom",
      "NTT ダイヤル形式の文書 encoding が utf8bom ではありません。",
    );
    verify(
      document.eol === vscode.EndOfLine.CRLF,
      "NTT ダイヤルの CRLF が実ホストで認識されません。",
    );
    verify(
      lines.every((line, index) => document.lineAt(index).text === line),
      "BOM と CRLF を除いた NTT レコード内容が一致しません。",
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
    const customerField = analysis.fields.find(
      (field) => field.line === 0 && field.fieldName === "お客様番号",
    );
    verify(
      analysis.failure === undefined &&
        analysis.issues.length === 0 &&
        analysis.fields.length === 63,
      "NTT スモークの6レコードに文字コードまたは検証の問題があります。",
    );
    verify(
      customerField?.start === 1 && customerField?.end === 13,
      "UTF-8 BOM を除いた先頭レコードのバイト位置が一致しません。",
    );
    verify(
      customerField?.displayStart === 1 &&
        customerField?.displayEnd === 13 &&
        customerField?.lengthUnit === "byte",
      "UTF-8 BOM を除いた先頭レコードの表示位置が一致しません。",
    );

    editor = await vscode.window.showTextDocument(document, {
      preview: false,
    });
    const request = session.beginSelection(document, fileType);
    verify(
      session.activateSelection(request),
      "NTT ダイヤル形式を実ホストのレンダーセッションへ適用できません。",
    );
    const rendered = await session.render(request);
    verify(rendered === true, "NTT ダイヤルの実ホスト描画が完了しません。");
    verify(
      editorDecorations.has(editor) &&
        session.getSelectedFileType(uri.toString()) === fileType,
      "NTT ダイヤルの項目装飾が実ホストに適用されません。",
    );
    verify(
      vscode.languages
        .getDiagnostics(document.uri)
        .filter((diagnostic) => diagnostic.source === "JFixedViewer").length ===
        0,
      "正常な NTT ダイヤルレコードに診断が発生しました。",
    );
    verify(
      !document.isDirty &&
        document.getText() === originalText &&
        provider.readCount >= 1 &&
        provider.writeCount === 0,
      "NTT ダイヤルの読込と描画で文書変更または書込みが発生しました。",
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

class ReadOnlyNttProvider implements vscode.FileSystemProvider {
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
    if (uri.path !== `/${this.fileName}`) {
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
    if (uri.path !== `/${this.fileName}`) {
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
