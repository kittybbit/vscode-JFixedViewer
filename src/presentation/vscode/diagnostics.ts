import * as vscode from "vscode";
import type { FixedWidthIssue } from "../../application/fixedWidth/FixedWidthDecoration";

const settingName = "validationEnabled";
const defaultEnabled = true;
type IssueCode = FixedWidthIssue["code"];
type IssueByCode = {
  [Code in IssueCode]: Extract<FixedWidthIssue, { code: Code }>;
};
type MessageFormatterMap = {
  [Code in IssueCode]: (issue: IssueByCode[Code]) => string;
};

const messageFormatters: MessageFormatterMap = {
  INVALID_LENGTH: invalidLengthMessage,
  INVALID_BYTE_BOUNDARY: invalidByteBoundaryMessage,
  INVALID_TYPE: invalidTypeMessage,
  UNKNOWN_RECORD: () => "選択した形式のレコード定義に一致しません。",
  VALIDATION_LIMIT: () =>
    "診断が1000件を超えたため、以降の問題を省略しました。",
};

export function readValidationEnabled(resource: vscode.Uri): boolean {
  const configured = vscode.workspace
    .getConfiguration("jfixedviewer", resource)
    .get<unknown>(settingName);
  return typeof configured === "boolean" ? configured : defaultEnabled;
}

export function toDiagnostics(
  issues: readonly FixedWidthIssue[],
): vscode.Diagnostic[] {
  return issues.map((issue) => {
    const range = new vscode.Range(
      new vscode.Position(issue.line, issue.start),
      new vscode.Position(issue.line, issue.end),
    );
    const isLimit = issue.code === "VALIDATION_LIMIT";
    const diagnostic = new vscode.Diagnostic(
      range,
      diagnosticMessage(issue),
      isLimit
        ? vscode.DiagnosticSeverity.Information
        : vscode.DiagnosticSeverity.Error,
    );
    diagnostic.source = "JFixedViewer";
    diagnostic.code = issue.code;
    return diagnostic;
  });
}

export class DocumentDiagnostics implements vscode.Disposable {
  private readonly collection =
    vscode.languages.createDiagnosticCollection("jfixedviewer");

  public set(
    document: vscode.TextDocument,
    issues: readonly FixedWidthIssue[],
  ): void {
    this.collection.set(document.uri, toDiagnostics(issues));
  }

  public deleteUri(uri: string): void {
    this.collection.delete(vscode.Uri.parse(uri));
  }

  public clearHidden(
    selectedUris: Iterable<string>,
    editors: readonly vscode.TextEditor[],
  ): void {
    const visibleUris = new Set(
      editors.map((editor) => editor.document.uri.toString()),
    );
    for (const uri of selectedUris) {
      if (!visibleUris.has(uri)) {
        this.deleteUri(uri);
      }
    }
  }

  public dispose(): void {
    this.collection.dispose();
  }
}

function diagnosticMessage(issue: FixedWidthIssue): string {
  return formatIssue(issue);
}

function formatIssue<Code extends IssueCode>(issue: IssueByCode[Code]): string {
  return messageFormatters[issue.code](issue);
}

function invalidLengthMessage(issue: IssueByCode["INVALID_LENGTH"]): string {
  const unit = issue.lengthUnit === "byte" ? "バイト" : "文字";
  return `レコード長が定義と一致しません（期待値: ${issue.expectedLength}${unit}、実際: ${issue.actualLength}${unit}）。`;
}

function invalidByteBoundaryMessage(
  issue: IssueByCode["INVALID_BYTE_BOUNDARY"],
): string {
  const field = issue.fieldName ?? `項目 ${issue.fieldNumber}`;
  return `${field} の境界が文字の途中にあります（バイト位置）。`;
}

function invalidTypeMessage(issue: IssueByCode["INVALID_TYPE"]): string {
  const field = issue.fieldName ?? `項目 ${issue.fieldNumber}`;
  return `${field} は N 型の ASCII 数字または全 SP である必要があります。`;
}
