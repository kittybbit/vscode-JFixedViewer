// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { Extension } from "./extension/Extension";
import { FiletypePicker } from "./extension/command/FiletypePicker";
import { DefinitionHolder } from "./definitions/DefinitionHolder";
import { TextDecoratorFactory } from "./extension/editor/TextDecoratorFactory";
import { changeActiveTextEditorHandler } from "./extension/events/ChangeActiveTextEditorHandler";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  console.info('"vscode-JFixedViewer" is now active.');
  const extension = Extension.init(context);
  const dh = DefinitionHolder.init();
  FiletypePicker.register(context, extension, dh);
  TextDecoratorFactory.init(extension, dh);
  vscode.window.onDidChangeActiveTextEditor(
    changeActiveTextEditorHandler(extension),
    null,
    context.subscriptions,
  );
}

// This method is called when your extension is deactivated
export function deactivate() {
  console.info('"vscode-JFixedVewer" is deactive.');
}
