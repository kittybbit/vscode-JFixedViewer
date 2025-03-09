import * as vscode from "vscode";
import TelemetryReporter from "@vscode/extension-telemetry";
import { EventDispatcher } from "./events/EventDispatcher";

/**
 * Context of this extension.
 */
export class Extension {
  private static _reporter: TelemetryReporter;
  private static _eventDispatcher: EventDispatcher;
  private static _editorDecorations = new Map<
    vscode.TextEditor,
    vscode.TextEditorDecorationType
  >();

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
    Extension._editorDecorations.delete(editor);
  }

  public static clearDecoration(editor: vscode.TextEditor) {
    const decoration = Extension._editorDecorations.get(editor);
    if (decoration !== undefined) {
      decoration.dispose();
    }
  }

  public static setDecoration(
    editor: vscode.TextEditor,
    decoration: vscode.TextEditorDecorationType,
  ) {
    Extension._editorDecorations.set(editor, decoration);
  }
}
