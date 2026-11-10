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

  const configuration = vscode.workspace.getConfiguration("jfixedviewer");
  const defaults = {
    boundaryStyle: configuration.get("boundaryStyle"),
    boundaryColor: configuration.get("boundaryColor"),
    boundaryWidth: configuration.get("boundaryWidth"),
  };
  if (
    defaults.boundaryStyle !== "line" ||
    defaults.boundaryColor !== "" ||
    defaults.boundaryWidth !== 1
  ) {
    throw new Error(
      `固定長の境界表示設定が既定値と一致しません: ${JSON.stringify(defaults)}`,
    );
  }
}
