import * as vscode from "vscode";
import { createFixedWidthDecoration } from "../../application/fixedWidth/FixedWidthDecoration";
import { loadBuiltInDefinitions } from "../../infrastructure/definitions/loadBuiltInDefinitions";
import { DocumentRenderSession } from "../../presentation/vscode/DocumentRenderSession";
import { EditorDecorations } from "../../presentation/vscode/EditorDecorations";

/** 実ホストの表示範囲変更が各エディターの描画更新へ届くことを確認する。 */
export async function verifyVisibleRangeRendering(): Promise<void> {
  const editors = await openSmokeEditors();
  const rendering = createSmokeRendering();
  try {
    await renderSmokeSelection(rendering.session, editors.document);
    await verifySmokeVisibleRanges(editors.primary, editors.split);
  } finally {
    rendering.dispose();
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  }
}

async function openSmokeEditors(): Promise<{
  document: vscode.TextDocument;
  primary: vscode.TextEditor;
  split: vscode.TextEditor;
}> {
  const document = await vscode.workspace.openTextDocument({
    language: "plaintext",
    content: createSmokeContent(),
  });
  const primary = await vscode.window.showTextDocument(document, {
    viewColumn: vscode.ViewColumn.One,
    preview: false,
  });
  const split = await vscode.window.showTextDocument(document, {
    viewColumn: vscode.ViewColumn.Two,
    preserveFocus: true,
    preview: false,
  });
  return { document, primary, split };
}

function createSmokeRendering(): {
  session: DocumentRenderSession;
  dispose: () => void;
} {
  const definitions = loadBuiltInDefinitions().map((definition) =>
    definition.fileType === "sougou_furikomi@zengin"
      ? { ...definition, encoding: undefined, lengthUnit: "utf16" as const }
      : definition,
  );
  const editorDecorations = new EditorDecorations();
  const session = new DocumentRenderSession(
    createFixedWidthDecoration(definitions),
    editorDecorations,
  );
  const visibleRangeListener = vscode.window.onDidChangeTextEditorVisibleRanges(
    ({ textEditor }) => session.updateVisibleEditor(textEditor),
  );
  session.updateVisibleEditors(vscode.window.visibleTextEditors);
  return {
    session,
    dispose: () => {
      visibleRangeListener.dispose();
      session.dispose();
      editorDecorations.dispose();
    },
  };
}

async function renderSmokeSelection(
  session: DocumentRenderSession,
  document: vscode.TextDocument,
): Promise<void> {
  const request = session.beginSelection(document, "sougou_furikomi@zengin");
  if (!session.activateSelection(request)) {
    throw new Error("表示範囲スモークで形式選択を開始できません。");
  }
  if (!(await session.render(request))) {
    throw new Error("表示範囲スモークの初回解析に失敗しました。");
  }
}

async function verifySmokeVisibleRanges(
  primary: vscode.TextEditor,
  split: vscode.TextEditor,
): Promise<void> {
  await revealAndWait(primary, 400);
  await revealAndWait(split, 200);
  await revealAndWait(primary, 800);
  if (
    !vscode.window.visibleTextEditors.includes(primary) ||
    !vscode.window.visibleTextEditors.includes(split) ||
    !primary.visibleRanges.some((range) => containsLine(range, 800)) ||
    !split.visibleRanges.some((range) => containsLine(range, 200))
  ) {
    throw new Error("分割エディターの表示範囲が更新されませんでした。");
  }
}

async function revealAndWait(
  editor: vscode.TextEditor,
  line: number,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      subscription.dispose();
      reject(new Error(`行 ${line + 1} の表示範囲変更を受信できません。`));
    }, 5000);
    const subscription = vscode.window.onDidChangeTextEditorVisibleRanges(
      (event) => {
        if (
          event.textEditor !== editor ||
          !editor.visibleRanges.some((range) => containsLine(range, line))
        ) {
          return;
        }
        clearTimeout(timeout);
        subscription.dispose();
        resolve();
      },
    );
    editor.revealRange(
      new vscode.Range(line, 0, line, 0),
      vscode.TextEditorRevealType.AtTop,
    );
  });
}

function containsLine(range: vscode.Range, line: number): boolean {
  return range.start.line <= line && range.end.line >= line;
}

function createSmokeContent(): string {
  const header = `1${"0".repeat(119)}`;
  const data = `2${"0".repeat(111)} ${"0".repeat(7)}`;
  const rows = [header, ...Array<string>(900).fill(data), "?"];
  rows.push(`8${"0".repeat(119)}`, `9${" ".repeat(119)}`);
  return rows.join("\n");
}
