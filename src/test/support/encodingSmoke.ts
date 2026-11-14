import * as vscode from "vscode";
import { VscodeTextEncodingAdapter } from "../../infrastructure/encoding/VscodeTextEncodingAdapter";
import { ensureDocumentEncoding } from "../../presentation/vscode/documentEncoding";

function verify(condition: boolean, errorMessage: string): void {
  if (!condition) {
    throw new Error(errorMessage);
  }
}

/** Desktop と Web で共有する VS Code 1.100 の文字コード API 確認。 */
export async function verifyTextEncodingApi(): Promise<void> {
  const document = await vscode.workspace.openTextDocument({
    language: "plaintext",
    content: "",
  });
  verify(
    typeof document.encoding === "string" && document.encoding.length > 0,
    "TextDocument.encoding が文字コードを返しません。",
  );

  const shiftJisText = "Aあ";
  const shiftJisBytes = await vscode.workspace.encode(shiftJisText, {
    encoding: "shiftjis",
  });
  verify(
    shiftJisBytes.length === 3 &&
      shiftJisBytes[0] === 0x41 &&
      shiftJisBytes[1] === 0x82 &&
      shiftJisBytes[2] === 0xa0,
    "VS Code の Shift_JIS エンコード結果が期待値と異なります。",
  );

  const decodedShiftJis = await vscode.workspace.decode(shiftJisBytes, {
    encoding: "shiftjis",
  });
  verify(
    decodedShiftJis === shiftJisText,
    "VS Code の Shift_JIS デコード結果が期待値と異なります。",
  );

  const unicodeText = "Aあ😀";
  const utf8Bytes = await vscode.workspace.encode(unicodeText, {
    encoding: "utf8",
  });
  verify(
    utf8Bytes.length === 8,
    "VS Code の UTF-8 エンコード結果が期待値と異なります。",
  );

  const decodedUtf8 = await vscode.workspace.decode(utf8Bytes, {
    encoding: "utf8",
  });
  verify(
    decodedUtf8 === unicodeText,
    "VS Code の UTF-8 デコード結果が期待値と異なります。",
  );

  const adapter = new VscodeTextEncodingAdapter();
  const codecCases = [
    ["utf8", "A\uFEFFあ😀\uFEFF", 14],
    ["utf8bom", "A\uFEFFあ😀\uFEFF", 14],
    ["utf16le", "A\uFEFFあ😀\uFEFF", 12],
    ["utf16be", "A\uFEFFあ😀\uFEFF", 12],
    ["shiftjis", "Aあ", 3],
  ] as const;
  for (const [encoding, text, expectedLength] of codecCases) {
    const mapped = await adapter.mapLines([text], encoding);
    verify(
      mapped.ok && mapped.lines[0]?.byteLength === expectedLength,
      `VS Code の ${encoding} 全量変換と境界確認が一致しません。`,
    );
  }

  await verifyReadOnlyProviderReload();
}

async function verifyReadOnlyProviderReload(): Promise<void> {
  const scheme = `jfixedviewerencoding${Date.now()}`;
  const provider = new ReadOnlyMemoryProvider(
    new Uint8Array([0x41, 0x82, 0xa0]),
  );
  const registration = vscode.workspace.registerFileSystemProvider(
    scheme,
    provider,
    { isCaseSensitive: true },
  );
  const uri = vscode.Uri.parse(`${scheme}:/record.dat`);
  try {
    await vscode.workspace.openTextDocument(uri);
    const reloaded = await vscode.workspace.openTextDocument(uri, {
      encoding: "shiftjis",
    });
    verify(
      reloaded.uri.toString() === uri.toString(),
      "FileSystemProvider の再読込後に URI が変わりました。",
    );
    verify(
      reloaded.encoding === "shiftjis",
      "FileSystemProvider の再読込後に Shift_JIS が適用されません。",
    );
    verify(
      reloaded.getText() === "Aあ",
      "FileSystemProvider の Shift_JIS 内容が一致しません。",
    );
    verify(
      provider.readCount >= 2,
      "FileSystemProvider が再読込のたびに読み出されません。",
    );
    verify(
      provider.writeCount === 0,
      "FileSystemProvider の検証中に書き込みが発生しました。",
    );

    const editor = await vscode.window.showTextDocument(reloaded);
    const lastLine = reloaded.lineAt(reloaded.lineCount - 1);
    const edit = new vscode.WorkspaceEdit();
    edit.replace(
      reloaded.uri,
      new vscode.Range(new vscode.Position(0, 0), lastLine.range.end),
      "dirty",
    );
    verify(
      await vscode.workspace.applyEdit(edit),
      "未保存保護のスモーク編集を適用できません。",
    );
    verify(
      reloaded.isDirty && reloaded.getText() === "dirty",
      "スモーク文書に未保存編集が作成されません。",
    );
    const readsBeforeDirtyGuard = provider.readCount;
    const dirtyResult = await ensureDocumentEncoding(reloaded, "utf8");
    verify(
      !dirtyResult.ok && dirtyResult.code === "DIRTY_DOCUMENT",
      "製品の再読込ガードが未保存文書を拒否しません。",
    );
    verify(
      reloaded.getText() === "dirty" &&
        provider.readCount === readsBeforeDirtyGuard &&
        provider.writeCount === 0,
      "未保存保護が内容・読み込み・書き込みを変えました。",
    );

    await vscode.commands.executeCommand("workbench.action.files.revert");
    verify(
      !reloaded.isDirty && reloaded.getText() === "Aあ",
      "未保存保護のスモーク文書を元の内容へ戻せません。",
    );
    await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
    verify(
      editor.document.uri.toString() === uri.toString() &&
        provider.writeCount === 0,
      "未保存保護の後処理で別 URI または書き込みが発生しました。",
    );
  } finally {
    registration.dispose();
    provider.dispose();
  }

  await verifyProviderReadFailure();
}

async function verifyProviderReadFailure(): Promise<void> {
  const scheme = `jfixedviewerreadfailure${Date.now()}`;
  const bytes = new TextEncoder().encode("safe content");
  const provider = new ReadOnlyMemoryProvider(bytes, 2);
  const registration = vscode.workspace.registerFileSystemProvider(
    scheme,
    provider,
    { isCaseSensitive: true },
  );
  const uri = vscode.Uri.parse(`${scheme}:/record.dat`);
  try {
    const document = await vscode.workspace.openTextDocument(uri);
    const originalText = document.getText();
    const result = await ensureDocumentEncoding(document, "shiftjis");
    verify(
      !result.ok && result.code === "RELOAD_FAILED",
      "製品の再読込ガードが読込不能を安全な失敗として返しません。",
    );
    verify(
      document.getText() === originalText &&
        provider.readCount === 2 &&
        provider.writeCount === 0,
      "読込不能で元文書が変化するか書き込みが発生しました。",
    );
  } finally {
    registration.dispose();
    provider.dispose();
  }
}

class ReadOnlyMemoryProvider implements vscode.FileSystemProvider {
  private readonly changes = new vscode.EventEmitter<
    vscode.FileChangeEvent[]
  >();
  public readonly onDidChangeFile = this.changes.event;
  public readCount = 0;
  public writeCount = 0;

  public constructor(
    private readonly bytes: Uint8Array,
    private readonly failOnReadCount?: number,
  ) {}

  public watch(
    _uri: vscode.Uri,
    _options: { recursive: boolean; excludes: readonly string[] },
  ): vscode.Disposable {
    return { dispose: () => undefined };
  }

  public stat(uri: vscode.Uri): vscode.FileStat {
    if (uri.path !== "/record.dat") {
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
    if (uri.path !== "/record.dat") {
      throw vscode.FileSystemError.FileNotFound(uri);
    }
    this.readCount += 1;
    if (this.readCount === this.failOnReadCount) {
      throw new Error("simulated read failure");
    }
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
