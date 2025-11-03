import * as vscode from "vscode";
import TelemetryReporter from "@vscode/extension-telemetry";
import { EventDispatcher } from "./events/EventDispatcher";
import { TextDecorator } from "./editor/TextDecorator";
import { Telemetry } from "./Constants";

/**
 * Context of this extension.
 */
export class Extension implements vscode.Disposable {
  private _reporter: TelemetryReporter;
  private _eventDispatcher: EventDispatcher;
  private _editorDecorator = new Map<string, TextDecorator>();

  public static init(context: vscode.ExtensionContext): Extension {
    const extension = new Extension();
    context.subscriptions.push(extension);
    return extension;
  }

  private constructor() {
    console.log("initializing extension context.");
    this._reporter = new TelemetryReporter(CONNECTION_STRING);
    console.log(`connection string: ${CONNECTION_STRING}`);
    this._reporter.sendTelemetryEvent(Telemetry.ExtensionActivate, {
      development: String(DEVELOPMENT),
    });
    this._eventDispatcher = new EventDispatcher();
  }

  dispose() {
    this._editorDecorator.forEach((v) => {
      v.dispose();
    });
    this._reporter.sendTelemetryEvent(Telemetry.ExtensionDeactivate, {
      development: String(DEVELOPMENT),
    });
    this._reporter.dispose();
  }

  get reporter(): TelemetryReporter {
    return this._reporter;
  }

  get eventDispatcher(): EventDispatcher {
    return this._eventDispatcher;
  }

  public clearEditor(editor: vscode.TextEditor) {
    this.clearDecoration(editor);
    this._editorDecorator.delete(editor.document.fileName);
  }

  private clearDecoration(editor: vscode.TextEditor) {
    const decoration = this._editorDecorator.get(editor.document.fileName);
    if (decoration !== undefined) {
      console.log(`clearing decoration: ${editor.document.fileName}`);
      decoration.dispose();
    }
  }

  public storeTextDecorator(
    editor: vscode.TextEditor,
    decorator: TextDecorator,
  ) {
    this._editorDecorator.set(editor.document.fileName, decorator);
  }

  public getTextDecorator(editor: vscode.TextEditor) {
    return this._editorDecorator.get(editor.document.fileName);
  }
}
