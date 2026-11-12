import * as vscode from "vscode";
import {
  readValidationEnabled,
  toDiagnostics,
} from "../presentation/vscode/diagnostics";

const extensionId = "kittybbit.vscode-JFixedViewer";
const commandId = "vscode-JFixedViewer.FiletypePicker";

/** デスクトップ版と Web 版で共有する実ホストのスモークテスト入口。 */
export async function run(): Promise<void> {
  await verifyExtensionCommand();
  verifyDefaultSettings();
  const diagnostics = verifyDiagnosticConversion();
  await verifyDiagnosticCollection(diagnostics);
}

async function verifyExtensionCommand(): Promise<void> {
  const extension = vscode.extensions.getExtension(extensionId);
  if (!extension) {
    throw new Error(`拡張機能 ${extensionId} が読み込まれていません。`);
  }

  await extension.activate();
  const commands = await vscode.commands.getCommands(true);
  if (!commands.includes(commandId)) {
    throw new Error(`拡張機能が ${commandId} を登録していません。`);
  }
}

function verifyDefaultSettings(): void {
  const configuration = vscode.workspace.getConfiguration("jfixedviewer");
  const defaults = [
    configuration.get("boundaryStyle") === "line",
    configuration.get("boundaryColor") === "",
    configuration.get("boundaryWidth") === 1,
    configuration.get("validationEnabled") === true,
  ];
  if (!defaults.every(Boolean)) {
    throw new Error("固定長の境界表示設定が既定値と一致しません。");
  }

  if (!readValidationEnabled(vscode.Uri.parse("untitled:jfixedviewer-smoke"))) {
    throw new Error("固定長検証の既定値が有効ではありません。");
  }
}

function verifyDiagnosticConversion(): vscode.Diagnostic[] {
  const converted = toDiagnostics([
    {
      code: "INVALID_LENGTH",
      line: 1,
      start: 1,
      end: 2,
      expectedLength: 4,
      actualLength: 2,
    },
    {
      code: "VALIDATION_LIMIT",
      line: 0,
      start: 0,
      end: 0,
    },
  ]);
  const expectedProperties = [
    converted.length === 2,
    converted[0]?.source === "JFixedViewer",
    converted[0]?.code === "INVALID_LENGTH",
    converted[0]?.severity === vscode.DiagnosticSeverity.Error,
    converted[0]?.range.start.line === 1,
    converted[0]?.range.start.character === 1,
    converted[0]?.range.end.line === 1,
    converted[0]?.range.end.character === 2,
    converted[1]?.code === "VALIDATION_LIMIT",
    converted[1]?.severity === vscode.DiagnosticSeverity.Information,
    converted[1]?.range.start.line === 0,
    converted[1]?.range.start.character === 0,
    converted[1]?.range.end.line === 0,
    converted[1]?.range.end.character === 0,
  ];
  if (!expectedProperties.every(Boolean)) {
    throw new Error("固定長検証の診断変換が期待値と一致しません。");
  }
  return converted;
}

async function verifyDiagnosticCollection(
  diagnostics: vscode.Diagnostic[],
): Promise<void> {
  const collection =
    vscode.languages.createDiagnosticCollection("jfixedviewer-smoke");
  const uri = vscode.Uri.parse("untitled:jfixedviewer-diagnostics-smoke");
  try {
    collection.set(uri, diagnostics);
    const storedCount = collection.get(uri)?.length;
    const globallyRegistered = vscode.languages
      .getDiagnostics(uri)
      .includes(diagnostics[0]);
    if (storedCount !== 2 || !globallyRegistered) {
      throw new Error("VS Code が固定長検証の診断を保持していません。");
    }

    await waitForDiagnosticDeletion(uri, collection);
    const remainingCount = collection.get(uri)?.length ?? 0;
    const stillRegistered = vscode.languages
      .getDiagnostics(uri)
      .includes(diagnostics[0]);
    if (remainingCount > 0 || stillRegistered) {
      throw new Error("VS Code が固定長検証の診断を削除していません。");
    }
  } finally {
    collection.dispose();
  }
}

function waitForDiagnosticDeletion(
  uri: vscode.Uri,
  collection: vscode.DiagnosticCollection,
): Promise<void> {
  return new Promise<void>((resolve) => {
    const subscription = vscode.languages.onDidChangeDiagnostics((event) => {
      if (
        event.uris.some(
          (changedUri) => changedUri.toString() === uri.toString(),
        )
      ) {
        subscription.dispose();
        resolve();
      }
    });
    collection.delete(uri);
  });
}
