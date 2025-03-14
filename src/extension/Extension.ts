import * as vscode from "vscode";
import TelemetryReporter from "@vscode/extension-telemetry";
import { EventDispatcher } from "./events/EventDispatcher";
import { TextDecorator } from "./editor/TextDecorator";

type Decoration = {
  textDecorator: TextDecorator;
  decorationType: vscode.TextEditorDecorationType;
};
/**
 * Context of this extension.
 */
export class Extension {
  private static _reporter: TelemetryReporter;
  private static _eventDispatcher: EventDispatcher;
  private static _editorDecorations = new Map<string, Decoration>();

  public static init(context: vscode.ExtensionContext) {
    new Extension();
    context.subscriptions.push(Extension._reporter);
  }

  private constructor() {
    console.log("initializing extension context.");
    Extension._reporter = new TelemetryReporter(CONNECTION_STRING);
    console.log(`connection string: ${CONNECTION_STRING}`);
    Extension._eventDispatcher = new EventDispatcher();
  }

  static get reporter(): TelemetryReporter {
    return Extension._reporter;
  }

  static get eventDispatcher(): EventDispatcher {
    return Extension._eventDispatcher;
  }

  public static clearEditor(editor: vscode.TextEditor) {
    Extension.clearDecoration(editor);
    Extension._editorDecorations.delete(editor.document.fileName);
  }

  private static clearDecoration(editor: vscode.TextEditor) {
    const decoration = Extension._editorDecorations.get(
      editor.document.fileName,
    );
    if (decoration !== undefined) {
      console.log(`clearing decoration: ${editor.document.fileName}`);
      decoration.decorationType.dispose();
    }
  }

  public static storeDecoration(
    editor: vscode.TextEditor,
    decoration: Decoration,
  ) {
    Extension._editorDecorations.set(editor.document.fileName, decoration);
  }

  public static getTextDecorator(editor: vscode.TextEditor) {
    return Extension._editorDecorations.get(editor.document.fileName)
      ?.textDecorator;
  }
}
