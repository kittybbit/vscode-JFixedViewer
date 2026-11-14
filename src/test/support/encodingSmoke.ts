import * as vscode from "vscode";

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
}
