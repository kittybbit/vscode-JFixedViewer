import * as vscode from "vscode";

const extensionId = "kittybbit.vscode-JFixedViewer";
const commandId = "vscode-JFixedViewer.FiletypePicker";

/** デスクトップ版と Web 版で共有する実ホストのスモークテスト入口。 */
export async function run(): Promise<void> {
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
