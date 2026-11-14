import * as vscode from "vscode";

export type DocumentEncodingFailureCode =
  | "DIRTY_DOCUMENT"
  | "UNTITLED_DOCUMENT"
  | "CLOSED_DOCUMENT"
  | "RELOAD_FAILED"
  | "ENCODING_MISMATCH";

export type DocumentEncodingResult =
  | { ok: true; document: vscode.TextDocument }
  | { ok: false; code: DocumentEncodingFailureCode };

/** 指定文字コードで同じ URI を再読込し、未保存内容や失敗を安全に扱う。 */
export async function ensureDocumentEncoding(
  document: vscode.TextDocument,
  encoding: string,
): Promise<DocumentEncodingResult> {
  const preflight = preflightResult(document, encoding);
  if (preflight) {
    return preflight;
  }
  try {
    const reloaded = await vscode.workspace.openTextDocument(document.uri, {
      encoding,
    });
    return verifyReloadedDocument(document, reloaded, encoding);
  } catch {
    return { ok: false, code: "RELOAD_FAILED" };
  }
}

function preflightResult(
  document: vscode.TextDocument,
  encoding: string,
): DocumentEncodingResult | undefined {
  if (document.encoding === encoding) {
    return { ok: true, document };
  }
  const failureCode = preflightFailureCode(document);
  return failureCode ? { ok: false, code: failureCode } : undefined;
}

function preflightFailureCode(
  document: vscode.TextDocument,
): DocumentEncodingFailureCode | undefined {
  const checks = [
    { failed: document.isDirty, code: "DIRTY_DOCUMENT" as const },
    {
      failed: document.uri.scheme === "untitled",
      code: "UNTITLED_DOCUMENT" as const,
    },
    {
      failed: !vscode.workspace.textDocuments.some((open) => open === document),
      code: "CLOSED_DOCUMENT" as const,
    },
  ];
  return checks.find(({ failed }) => failed)?.code;
}

function verifyReloadedDocument(
  original: vscode.TextDocument,
  reloaded: vscode.TextDocument,
  encoding: string,
): DocumentEncodingResult {
  if (reloaded.uri.toString() !== original.uri.toString()) {
    return { ok: false, code: "RELOAD_FAILED" };
  }
  if (reloaded.encoding !== encoding) {
    return { ok: false, code: "ENCODING_MISMATCH" };
  }
  return { ok: true, document: reloaded };
}
