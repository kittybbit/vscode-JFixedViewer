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
const telephoneFileType = "telephone_2026@ntt";
const telephoneFileName = "K000000000001_202609";
const hikariFileType = "hikari_2026@ntt";
const hikariFileName = "N0000000001_202609";

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

/** Desktop と Web の実ホストで NTT 帳票の読込と描画を確認する。 */
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

  await verifyNttTelephoneSmoke();
  await verifyNttHikariSmoke();
}

function utf8Record(fields: readonly FieldValue[]): string {
  const line = fields
    .map(([width, value = "", alignment = "left"]) => {
      const valueWidth = new TextEncoder().encode(value).length;
      verify(
        valueWidth <= width,
        "NTT 電話番号別スモークの値が項目幅を超えています。",
      );
      const padding = " ".repeat(width - valueWidth);
      return alignment === "right"
        ? `${padding}${value}`
        : `${value}${padding}`;
    })
    .join("");
  verify(
    new TextEncoder().encode(line).length === 512,
    "NTT 電話番号別スモークのレコード幅が512バイトではありません。",
  );
  return line;
}

function telephoneDetailGroup(
  index: number,
  amount = "00000000000",
): FieldValue[] {
  return [
    [2, index === 1 ? "02" : "01"],
    [4, `3${String(index).padStart(3, "0")}`],
    [1, index % 2 === 0 ? "1" : "0"],
    [11, amount],
    [2, "11"],
  ];
}

export function createTelephoneSmokeLines(): string[] {
  const detailHead = (recordNumber: string): FieldValue[] => [
    [6, "079999"],
    [4, "8888"],
    [2, "  "],
    [2, "11"],
    [2, recordNumber],
    [2, "02"],
    [12, customerNumber],
  ];
  const detailAmounts = [
    "-0000000123",
    "00000004690",
    ...Array.from({ length: 14 }, () => "00000000000"),
  ];
  const details = (withAmounts = false) =>
    Array.from({ length: 16 }, (_, index) =>
      telephoneDetailGroup(
        index + 1,
        withAmounts ? (detailAmounts[index] ?? "00000000000") : undefined,
      ),
    ).flat();
  const totalHead = (recordNumber: string): FieldValue[] => [
    [12, customerNumber],
    [2, "51"],
    [2, recordNumber],
    [2, "02"],
  ];
  const accountName = "ﾐﾅﾄｶｲｼｬ".repeat(10).slice(0, 40);
  const recipientName = "ﾔﾏﾀﾛｳ".repeat(10).slice(0, 50);

  return [
    utf8Record([
      [12, customerNumber],
      [2, "01"],
      [6, billingMonth],
      [1, "1"],
      [491, ""],
    ]),
    utf8Record([
      ...detailHead("01"),
      [1, "0"],
      [2, "  "],
      [4, "0912"],
      [4, "0928"],
      [11, ""],
      [11, "00000004567"],
      ...details(true),
      [129, ""],
    ]),
    utf8Record([...detailHead("02"), [33, ""], ...details(), [129, ""]]),
    utf8Record([
      ...totalHead("01"),
      [15, ""],
      [4, "0912"],
      [4, "0928"],
      [11, ""],
      [11, "00000004567"],
      [8, "00000001"],
      [7, "0000000"],
      [7, "0000000"],
      [120, accountName],
      [150, recipientName],
      [157, ""],
    ]),
    utf8Record([...totalHead("02"), [45, ""], ...details(true), [129, ""]]),
    utf8Record([
      [12, customerNumber],
      [2, "91"],
      [12, "000000004567"],
      [8, "00000001"],
      [478, ""],
    ]),
  ];
}

function hikariBreakdownGroup(
  index: number,
  amount = "00000000000",
): FieldValue[] {
  return [
    [2, index === 1 ? "02" : "01"],
    [4, `3${String(index).padStart(3, "0")}`],
    [11, amount],
    [2, "11"],
  ];
}

const hikariZeroAmounts = Array.from({ length: 17 }, () => "00000000000");
const hikariSampleAmounts = [
  "-0000000123",
  "00000004690",
  ...hikariZeroAmounts.slice(2),
];

function hikariDetailGroups(amounts: string[]): FieldValue[] {
  return amounts.flatMap((amount, index) =>
    hikariBreakdownGroup(index + 1, amount),
  );
}

export function createHikariSmokeLines(): string[] {
  const customerNumber = "  0000000001";
  const telephoneNumber = "0799998888";
  const detailHead = (recordNumber: string): FieldValue[] => [
    [10, telephoneNumber],
    [2, "  "],
    [2, "11"],
    [2, recordNumber],
    [2, "02"],
    [12, customerNumber],
  ];
  const totalHead = (recordNumber: string): FieldValue[] => [
    [12, customerNumber],
    [2, "51"],
    [2, recordNumber],
    [2, "02"],
  ];
  const accountName = "ﾐﾅﾄｶｲｼｬ".repeat(10).slice(0, 40);
  const recipientName = "ﾔﾏﾀﾛｳ".repeat(10).slice(0, 50);

  return [
    utf8Record([
      [12, customerNumber],
      [2, "01"],
      [6, billingMonth],
      [1, "5"],
      [491, ""],
    ]),
    utf8Record([
      ...detailHead("01"),
      [1, "0"],
      [2, "03"],
      [4, "0912"],
      [4, "0928"],
      [11, "00000004567"],
      [11, "00000004567"],
      ...hikariDetailGroups(hikariSampleAmounts),
      [126, ""],
    ]),
    utf8Record([
      ...detailHead("02"),
      [1, ""],
      [2, "03"],
      [30, ""],
      ...hikariDetailGroups(hikariZeroAmounts),
      [126, ""],
    ]),
    utf8Record([
      ...totalHead("01"),
      [15, ""],
      [4, "0912"],
      [4, "0928"],
      [11, "00000004567"],
      [11, "00000004567"],
      [8, "00000001"],
      [7, "0000000"],
      [7, "0000000"],
      [120, accountName],
      [150, recipientName],
      [157, ""],
    ]),
    utf8Record([
      ...totalHead("02"),
      [45, ""],
      ...hikariDetailGroups(hikariSampleAmounts),
      [126, ""],
    ]),
    utf8Record([
      [12, customerNumber],
      [2, "91"],
      [12, "000000004567"],
      [8, "00000001"],
      [478, ""],
    ]),
  ];
}

async function verifyNttTelephoneSmoke(): Promise<void> {
  const lines = createTelephoneSmokeLines();
  const bytes = createUtf8BomBytes(lines);
  const scheme = `jfixedviewerntttelephone${Date.now()}`;
  const provider = new ReadOnlyNttProvider(telephoneFileName, bytes);
  const registration = vscode.workspace.registerFileSystemProvider(
    scheme,
    provider,
    { isCaseSensitive: true },
  );
  const uri = vscode.Uri.parse(`${scheme}:/${telephoneFileName}`);
  const definition = loadBuiltInDefinitions().find(
    ({ fileType: candidate }) => candidate === telephoneFileType,
  );
  if (!definition) {
    throw new Error("NTT 電話番号別形式が実ローダーに登録されていません。");
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
        "VS Code が NTT 電話番号別形式を UTF-8 BOM で再読込できません。",
      );
    }
    const document = encodingResult.document;
    const originalText = document.getText();
    verify(
      document.encoding === "utf8bom",
      "NTT 電話番号別形式の文書 encoding が utf8bom ではありません。",
    );
    verify(
      document.eol === vscode.EndOfLine.CRLF,
      "NTT 電話番号別形式の CRLF が実ホストで認識されません。",
    );
    verify(
      lines.every((line, index) => document.lineAt(index).text === line),
      "BOM と CRLF を除いた NTT 電話番号別レコード内容が一致しません。",
    );

    const analysis = await decoration.analyze({
      fileType: telephoneFileType,
      lines: lines.map((text, line) => ({
        line,
        text,
        isEmptyOrWhitespace: /^\s*$/u.test(text),
      })),
      validationEnabled: true,
      currentEncoding: document.encoding,
    });
    const accountName = analysis.fields.find(
      (field) => field.line === 3 && field.fieldName === "口座名義",
    );
    verify(
      analysis.failure === undefined &&
        analysis.issues.length === 0 &&
        analysis.fields.length === 294,
      "NTT 電話番号別スモークの6レコードに文字コードまたは検証の問題があります。",
    );
    verify(
      accountName?.start === 85 && accountName.end === 205,
      "日本語を含むNTT項目のUTF-8バイト範囲が一致しません。",
    );
    verify(
      accountName?.displayStart === 85 &&
        accountName.displayEnd === 125 &&
        accountName.lengthUnit === "byte",
      "日本語を含むNTT項目の表示位置が一致しません。",
    );
    const recipientName = analysis.fields.find(
      (field) => field.line === 3 && field.fieldName === "氏名",
    );
    const firstContinuedAmount = analysis.fields.find(
      (field) => field.line === 4 && field.fieldName === "内訳額（1）",
    );
    const lastContinuedAmount = analysis.fields.find(
      (field) => field.line === 4 && field.fieldName === "内訳額（16）",
    );
    verify(
      JSON.stringify([
        [
          accountName?.start,
          accountName?.end,
          accountName?.displayStart,
          accountName?.displayEnd,
          accountName?.type,
          accountName?.lengthUnit,
        ],
        [
          recipientName?.start,
          recipientName?.end,
          recipientName?.displayStart,
          recipientName?.displayEnd,
          recipientName?.type,
          recipientName?.lengthUnit,
        ],
        [
          firstContinuedAmount?.start,
          firstContinuedAmount?.end,
          firstContinuedAmount?.displayStart,
          firstContinuedAmount?.displayEnd,
          firstContinuedAmount?.type,
          firstContinuedAmount?.lengthUnit,
          lines[4]?.slice(70, 81),
        ],
        [
          lastContinuedAmount?.start,
          lastContinuedAmount?.end,
          lastContinuedAmount?.displayStart,
          lastContinuedAmount?.displayEnd,
          lastContinuedAmount?.type,
          lastContinuedAmount?.lengthUnit,
          lines[4]?.slice(370, 381),
        ],
      ]) ===
        JSON.stringify([
          [85, 205, 85, 125, "C", "byte"],
          [205, 355, 125, 175, "C", "byte"],
          [70, 81, 70, 81, "符号付き数値", "byte", "-0000000123"],
          [370, 381, 370, 381, "符号付き数値", "byte", "00000000000"],
        ]),
      "NTT帳票の半角カナ欄と合計継続内訳の位置・型・値が一致しません。",
    );

    editor = await vscode.window.showTextDocument(document, {
      preview: false,
    });
    const request = session.beginSelection(document, telephoneFileType);
    verify(
      session.activateSelection(request),
      "NTT 電話番号別形式を実ホストのレンダーセッションへ適用できません。",
    );
    const rendered = await session.render(request);
    verify(
      rendered === true,
      "NTT 電話番号別形式の実ホスト描画が完了しません。",
    );
    verify(
      editorDecorations.has(editor) &&
        session.getSelectedFileType(uri.toString()) === telephoneFileType,
      "NTT 電話番号別形式の項目装飾が実ホストに適用されません。",
    );
    verify(
      vscode.languages
        .getDiagnostics(document.uri)
        .filter((diagnostic) => diagnostic.source === "JFixedViewer").length ===
        0,
      "正常な NTT 電話番号別レコードに診断が発生しました。",
    );
    verify(
      !document.isDirty &&
        document.getText() === originalText &&
        provider.readCount >= 1 &&
        provider.writeCount === 0,
      "NTT 電話番号別レコードの読込と描画で文書変更または書込みが発生しました。",
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

async function verifyNttHikariSmoke(): Promise<void> {
  const lines = createHikariSmokeLines();
  const bytes = createUtf8BomBytes(lines);
  const scheme = `jfixedviewerntthikari${Date.now()}`;
  const provider = new ReadOnlyNttProvider(hikariFileName, bytes);
  const registration = vscode.workspace.registerFileSystemProvider(
    scheme,
    provider,
    { isCaseSensitive: true },
  );
  const uri = vscode.Uri.parse(`${scheme}:/${hikariFileName}`);
  const definition = loadBuiltInDefinitions().find(
    ({ fileType }) => fileType === hikariFileType,
  );
  if (!definition) {
    throw new Error("NTT ひかり電話形式が実ローダーに登録されていません。");
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
        "VS Code が NTT ひかり電話形式を UTF-8 BOM で再読込できません。",
      );
    }
    const document = encodingResult.document;
    const originalText = document.getText();
    verify(
      document.encoding === "utf8bom",
      "NTT ひかり電話形式の文書 encoding が utf8bom ではありません。",
    );
    verify(
      document.eol === vscode.EndOfLine.CRLF,
      "NTT ひかり電話形式の CRLF が実ホストで認識されません。",
    );
    verify(
      lines.every((line, index) => document.lineAt(index).text === line),
      "BOM と CRLF を除いた NTT ひかり電話レコード内容が一致しません。",
    );

    const analysis = await decoration.analyze({
      fileType: hikariFileType,
      lines: lines.map((text, line) => ({
        line,
        text,
        isEmptyOrWhitespace: /^\s*$/u.test(text),
      })),
      validationEnabled: true,
      currentEncoding: document.encoding,
    });
    const accountName = analysis.fields.find(
      (field) => field.line === 3 && field.fieldName === "口座名義",
    );
    const customerNumbers = analysis.fields.filter(
      (field) => field.fieldName === "お客様番号",
    );
    const firstTotalCurrentMonth = analysis.fields.find(
      (field) => field.line === 3 && field.fieldName === "通話料・今月分",
    );
    const firstAmount = analysis.fields.find(
      (field) => field.line === 1 && field.fieldName === "内訳額（1）",
    );
    const lastAmount = analysis.fields.find(
      (field) => field.line === 4 && field.fieldName === "内訳額（17）",
    );
    verify(
      analysis.failure === undefined,
      "NTT ひかり電話スモークの6レコードを解析できません。",
    );
    verify(
      analysis.issues.length === 0,
      "NTT ひかり電話スモークの6レコードに検証上の問題があります。",
    );
    verify(
      analysis.fields.length === 258,
      "NTT ひかり電話スモークの6レコードに項目数の問題があります。",
    );
    verify(
      JSON.stringify(
        customerNumbers.map((field) => [
          field.line,
          field.start,
          field.end,
          lines[field.line]?.slice(field.start, field.end),
        ]),
      ) ===
        JSON.stringify(
          [
            [0, 0],
            [1, 18],
            [2, 18],
            [3, 0],
            [4, 0],
            [5, 0],
          ].map(([line, start]) => [
            line,
            start,
            Number(start) + 12,
            "  0000000001",
          ]),
        ),
      "NTT ひかり電話の全6行でお客様番号の位置・幅・値が一致しません。",
    );
    verify(
      JSON.stringify([
        firstTotalCurrentMonth?.start,
        firstTotalCurrentMonth?.end,
        firstTotalCurrentMonth?.type,
        lines[3]?.slice(41, 52),
      ]) === JSON.stringify([41, 52, "N", "00000004567"]),
      "NTT ひかり電話の51初回の通話料・今月分の位置・幅・型・値が一致しません。",
    );
    verify(
      accountName?.start === 85,
      "NTT ひかり電話の半角カナ欄の開始位置が一致しません。",
    );
    verify(
      accountName?.end === 205,
      "NTT ひかり電話の半角カナ欄の終了位置が一致しません。",
    );
    verify(
      accountName?.displayStart === 85,
      "NTT ひかり電話の半角カナ欄の表示開始位置が一致しません。",
    );
    verify(
      accountName?.displayEnd === 125,
      "NTT ひかり電話の半角カナ欄の表示終了位置が一致しません。",
    );
    verify(
      accountName?.lengthUnit === "byte",
      "NTT ひかり電話の半角カナ欄の UTF-8 バイト単位が一致しません。",
    );
    verify(
      JSON.stringify([
        firstAmount?.start,
        firstAmount?.end,
        firstAmount?.type,
        lines[1]?.slice(69, 80),
        lastAmount?.start,
        lastAmount?.end,
        lastAmount?.type,
        lines[4]?.slice(373, 384),
      ]) ===
        JSON.stringify([
          69,
          80,
          "符号付き数値",
          "-0000000123",
          373,
          384,
          "符号付き数値",
          "00000000000",
        ]),
      "NTT ひかり電話の内訳1と17の位置・型・値が一致しません。",
    );

    editor = await vscode.window.showTextDocument(document, {
      preview: false,
    });
    const request = session.beginSelection(document, hikariFileType);
    verify(
      session.activateSelection(request),
      "NTT ひかり電話形式を実ホストのレンダーセッションへ適用できません。",
    );
    const rendered = await session.render(request);
    verify(rendered === true, "NTT ひかり電話の実ホスト描画が完了しません。");
    verify(
      editorDecorations.has(editor) &&
        session.getSelectedFileType(uri.toString()) === hikariFileType,
      "NTT ひかり電話の項目装飾が実ホストに適用されません。",
    );
    verify(
      vscode.languages
        .getDiagnostics(document.uri)
        .filter((diagnostic) => diagnostic.source === "JFixedViewer").length ===
        0,
      "正常な NTT ひかり電話レコードに診断が発生しました。",
    );
    verify(
      !document.isDirty &&
        document.getText() === originalText &&
        provider.readCount >= 1 &&
        provider.writeCount === 0,
      "NTT ひかり電話レコードの読込と描画で文書変更または書込みが発生しました。",
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
