import * as vscode from "vscode";
import { activateExtension } from "./bootstrap/activateExtension";

export function activate(context: vscode.ExtensionContext): void {
  console.info('"vscode-JFixedViewer" is now active.');
  activateExtension(context);
}

export function deactivate(): void {
  console.info('"vscode-JFixedVewer" is deactive.');
}
