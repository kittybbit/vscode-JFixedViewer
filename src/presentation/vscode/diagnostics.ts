import * as vscode from "vscode";
import type { FixedWidthIssue } from "../../application/fixedWidth/FixedWidthDecoration";

const settingName = "validationEnabled";
const defaultEnabled = true;

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

function diagnosticMessage(issue: FixedWidthIssue): string {
  if (issue.code === "INVALID_LENGTH") {
    return `レコード長が定義と一致しません（期待値: ${issue.expectedLength}文字、実際: ${issue.actualLength}文字）。`;
  }
  if (issue.code === "INVALID_TYPE") {
    const field = issue.fieldName ?? `項目 ${issue.fieldNumber}`;
    return `${field} は N 型の ASCII 数字または全 SP である必要があります。`;
  }
  return issue.code === "UNKNOWN_RECORD"
    ? "選択した形式のレコード定義に一致しません。"
    : "診断が1000件を超えたため、以降の問題を省略しました。";
}
