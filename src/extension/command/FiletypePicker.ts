import * as vscode from "vscode";
import { Extension } from "../Extension";
import { DefinitionHolder } from "../../definitions/DefinitionHolder";

export class FiletypePicker {
  public static register(
    context: vscode.ExtensionContext,
    dh: DefinitionHolder,
  ) {
    console.info("registered FiletypePicker");

    const options: Map<string, string> = new Map();
    dh.files.forEach((file) => {
      options.set(file.name, file.file_type);
    });
    context.subscriptions.push(
      vscode.commands.registerCommand(
        "vscode-JFixedViewer.FiletypePicker",
        () => {
          vscode.window
            .showQuickPick(Array.from(options.keys()))
            .then((selectedOption) => {
              const file_type = options.get(selectedOption ?? "");
              Extension.eventDispatcher.fire(file_type ?? "");
            });
        },
      ),
    );
  }
}
