import * as vscode from "vscode";
import type { FixedWidthDecorationPort } from "../../application/fixedWidth/FixedWidthDecoration";
import type { TelemetryPort } from "../../application/telemetry/TelemetryPort";
import { DocumentRenderSession } from "./DocumentRenderSession";
import { EditorDecorations } from "./EditorDecorations";
import { FileTypeSelection } from "./FileTypeSelection";

export class FixedWidthPresentation implements vscode.Disposable {
  private readonly subscriptions: vscode.Disposable[] = [];
  private readonly editorDecorations: EditorDecorations;
  private readonly renderSession: DocumentRenderSession;
  private readonly fileTypeSelection: FileTypeSelection;
  private disposed = false;

  public constructor(
    decoration: FixedWidthDecorationPort,
    telemetry: TelemetryPort,
  ) {
    this.editorDecorations = new EditorDecorations();
    this.renderSession = new DocumentRenderSession(
      decoration,
      this.editorDecorations,
    );
    this.fileTypeSelection = new FileTypeSelection(
      decoration,
      telemetry,
      this.renderSession,
    );
  }

  public start(): void {
    try {
      this.subscriptions.push(this.fileTypeSelection.registerCommand());
      this.listenToVisibleEditors();
      this.listenToEditorSelections();
      this.listenToDocumentChanges();
      this.listenToConfigurationChanges();
    } catch (error) {
      this.rethrowStartupFailure(error);
    }
  }

  private listenToVisibleEditors(): void {
    this.subscriptions.push(
      vscode.window.onDidChangeVisibleTextEditors((editors) =>
        this.renderSession.updateVisibleEditors(editors),
      ),
    );
    this.renderSession.updateVisibleEditors(vscode.window.visibleTextEditors);
  }

  private listenToEditorSelections(): void {
    this.subscriptions.push(
      vscode.window.onDidChangeTextEditorSelection(({ textEditor }) =>
        this.editorDecorations.updateCursor(textEditor),
      ),
    );
  }

  private listenToDocumentChanges(): void {
    this.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument((event) =>
        this.renderSession.handleTextDocumentChange(
          event.document,
          event.contentChanges.length > 0,
        ),
      ),
    );
    this.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument((document) =>
        this.renderSession.scheduleRender(document),
      ),
    );
    this.subscriptions.push(
      vscode.workspace.onDidCloseTextDocument((document) => {
        this.fileTypeSelection.invalidateUri(document.uri.toString());
        this.renderSession.closeDocument(document);
      }),
    );
  }

  private listenToConfigurationChanges(): void {
    this.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((event) =>
        this.renderSession.updateConfiguredDocuments(event),
      ),
    );
  }

  private rethrowStartupFailure(error: unknown): never {
    try {
      this.dispose();
    } catch (disposeError) {
      throw new AggregateError(
        [error, disposeError],
        "プレゼンテーションの起動と破棄に失敗しました。",
      );
    }
    throw error;
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    for (const subscription of this.subscriptions.reverse()) {
      subscription.dispose();
    }
    this.subscriptions.length = 0;
    this.fileTypeSelection.dispose();
    this.renderSession.dispose();
    this.editorDecorations.dispose();
  }
}
