import * as vscode from "vscode";
import type {
  FixedWidthDecorationField,
  FixedWidthDecorationPort,
  FixedWidthLine,
} from "../../application/fixedWidth/FixedWidthDecoration";
import type { TelemetryPort } from "../../application/telemetry/TelemetryPort";
import {
  createFieldDecorations,
  createCursorFieldDecoration,
  findCursorField,
  groupFieldsByLine,
  readBoundarySettings,
} from "./decorationStyle";

const commandId = "vscode-JFixedViewer.FiletypePicker";
const renderDelay = 100;

type EditorDecoration = {
  fileType: string;
  decorationType: vscode.TextEditorDecorationType;
  cursorDecorationType?: vscode.TextEditorDecorationType;
  fieldsByLine: ReadonlyMap<number, readonly FixedWidthDecorationField[]>;
  alternatingDecorationType?: vscode.TextEditorDecorationType;
  alternatingBackgroundKey?: string;
};

type PendingRender = {
  document: vscode.TextDocument;
  timeout: ReturnType<typeof setTimeout>;
};

type EditorDecorationUpdate = {
  fileType: string;
  decorations: ReturnType<typeof createFieldDecorations>;
  fieldsByLine: ReadonlyMap<number, readonly FixedWidthDecorationField[]>;
  hasFieldMetadata: boolean;
};

export class FixedWidthPresentation implements vscode.Disposable {
  private readonly subscriptions: vscode.Disposable[] = [];
  private readonly fileTypeByDocument = new Map<string, string>();
  private readonly decorationByEditor = new Map<
    vscode.TextEditor,
    EditorDecoration
  >();
  private readonly pendingRenderByDocument = new Map<string, PendingRender>();
  private disposed = false;

  public constructor(
    private readonly decoration: FixedWidthDecorationPort,
    private readonly telemetry: TelemetryPort,
  ) {}

  public start(): void {
    try {
      this.registerCommand();
      this.listenToVisibleEditors();
      this.listenToEditorSelections();
      this.listenToDocumentChanges();
      this.listenToConfigurationChanges();
    } catch (error) {
      this.rethrowStartupFailure(error);
    }
  }

  private registerCommand(): void {
    const command = vscode.commands.registerCommand(commandId, () => {
      void this.selectFileType();
    });
    this.subscriptions.push(command);
  }

  private async selectFileType(): Promise<void> {
    const selectedName = await vscode.window.showQuickPick(
      this.decoration.choices.map((choice) => choice.name),
    );
    if (this.disposed) {
      return;
    }

    const fileType = this.decoration.fileTypeForName(selectedName);
    const editor = vscode.window.activeTextEditor;
    if (fileType !== undefined && editor) {
      this.applySelection(editor.document, fileType);
    }
    this.telemetry.decorationSelected(fileType ?? "");
  }

  private listenToVisibleEditors(): void {
    this.subscriptions.push(
      vscode.window.onDidChangeVisibleTextEditors((editors) =>
        this.updateVisibleEditors(editors),
      ),
    );
    this.updateVisibleEditors(vscode.window.visibleTextEditors);
  }

  private listenToDocumentChanges(): void {
    this.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.contentChanges.length > 0) {
          this.scheduleRender(event.document);
        }
      }),
    );
    this.subscriptions.push(
      vscode.workspace.onDidCloseTextDocument((document) =>
        this.cancelPendingRender(document),
      ),
    );
  }

  private listenToEditorSelections(): void {
    this.subscriptions.push(
      vscode.window.onDidChangeTextEditorSelection((event) => {
        const current = this.decorationByEditor.get(event.textEditor);
        if (current) {
          this.updateCursorFieldDecoration(event.textEditor, current);
        }
      }),
    );
  }

  private listenToConfigurationChanges(): void {
    this.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((event) => {
        this.updateConfiguredDocuments(event);
      }),
    );
  }

  private updateConfiguredDocuments(
    event: vscode.ConfigurationChangeEvent,
  ): void {
    const visibleDocumentsByUri = new Map(
      vscode.window.visibleTextEditors.map(({ document }) => [
        document.uri.toString(),
        document,
      ]),
    );
    for (const [uri, document] of visibleDocumentsByUri) {
      this.updateConfiguredDocument(event, uri, document);
    }
  }

  private updateConfiguredDocument(
    event: vscode.ConfigurationChangeEvent,
    uri: string,
    document: vscode.TextDocument,
  ): void {
    const fileType = this.fileTypeByDocument.get(uri);
    if (fileType === undefined) {
      return;
    }
    if (!event.affectsConfiguration("jfixedviewer", document.uri)) {
      return;
    }

    this.cancelPendingRender(document);
    this.decorateDocument(document, fileType);
  }

  private updateVisibleEditors(editors: readonly vscode.TextEditor[]): void {
    if (this.disposed) {
      return;
    }

    this.clearHiddenEditorDecorations(editors);
    this.cancelRendersForHiddenDocuments(editors);
    this.decorateNewlyVisibleEditors(editors);
  }

  private clearHiddenEditorDecorations(
    editors: readonly vscode.TextEditor[],
  ): void {
    const visibleEditors = new Set(editors);
    for (const editor of this.decorationByEditor.keys()) {
      if (!visibleEditors.has(editor)) {
        this.clearEditor(editor);
      }
    }
  }

  private cancelRendersForHiddenDocuments(
    editors: readonly vscode.TextEditor[],
  ): void {
    const visibleDocumentUris = new Set(
      editors.map((editor) => editor.document.uri.toString()),
    );
    for (const [uri, pending] of this.pendingRenderByDocument) {
      if (!visibleDocumentUris.has(uri)) {
        this.cancelPendingRender(pending.document);
      }
    }
  }

  private decorateNewlyVisibleEditors(
    editors: readonly vscode.TextEditor[],
  ): void {
    for (const editor of editors) {
      const fileType = this.fileTypeByDocument.get(
        editor.document.uri.toString(),
      );
      if (fileType !== undefined && !this.decorationByEditor.has(editor)) {
        this.decorateDocument(editor.document, fileType);
      }
    }
  }

  private applySelection(
    document: vscode.TextDocument,
    fileType: string,
  ): void {
    const uri = document.uri.toString();
    this.cancelPendingRender(document);
    if (fileType === "clear@clear") {
      this.fileTypeByDocument.delete(uri);
      this.clearDocumentDecorations(uri);
      return;
    }

    this.fileTypeByDocument.set(uri, fileType);
    this.decorateDocument(document, fileType);
  }

  private decorateDocument(
    document: vscode.TextDocument,
    fileType: string,
  ): void {
    const lines = [...this.documentLines(document)];
    const settings = readBoundarySettings(document.uri);
    const fields = this.decoration.decorate(fileType, lines);
    const decorations = createFieldDecorations(fields, lines, settings);
    const fieldsByLine = groupFieldsByLine(fields);
    const update: EditorDecorationUpdate = {
      fileType,
      decorations,
      fieldsByLine,
      hasFieldMetadata: fields.some((field) => field.fieldName !== undefined),
    };

    const uri = document.uri.toString();
    for (const editor of vscode.window.visibleTextEditors) {
      if (editor.document.uri.toString() === uri) {
        this.setEditorDecorations(editor, update);
      }
    }
  }

  private setEditorDecorations(
    editor: vscode.TextEditor,
    update: EditorDecorationUpdate,
  ): void {
    const current = this.getOrCreateEditorDecoration(editor, update.fileType);
    current.fieldsByLine = update.fieldsByLine;
    this.ensureCursorDecoration(current, update.hasFieldMetadata);
    this.updateCursorFieldDecoration(editor, current);
    editor.setDecorations(current.decorationType, update.decorations.options);
    this.updateAlternatingDecoration(editor, current, update.decorations);
  }

  private getOrCreateEditorDecoration(
    editor: vscode.TextEditor,
    fileType: string,
  ): EditorDecoration {
    const current = this.decorationByEditor.get(editor);
    if (current?.fileType === fileType) {
      return current;
    }
    if (current) {
      this.clearEditor(editor);
    }
    const created = this.createEditorDecoration(fileType);
    this.decorationByEditor.set(editor, created);
    return created;
  }

  private createEditorDecoration(fileType: string): EditorDecoration {
    return {
      fileType,
      decorationType: vscode.window.createTextEditorDecorationType({
        isWholeLine: false,
      }),
      fieldsByLine: new Map(),
    };
  }

  private ensureCursorDecoration(
    current: EditorDecoration,
    hasFieldMetadata: boolean,
  ): void {
    if (hasFieldMetadata && !current.cursorDecorationType) {
      current.cursorDecorationType =
        vscode.window.createTextEditorDecorationType({
          isWholeLine: false,
          backgroundColor: new vscode.ThemeColor(
            "editor.wordHighlightStrongBackground",
          ),
        });
    }
  }

  private updateCursorFieldDecoration(
    editor: vscode.TextEditor,
    current: EditorDecoration,
  ): void {
    const decorationType = current.cursorDecorationType;
    if (!decorationType) {
      return;
    }

    const position = editor.selection.active;
    const lineLength = editor.document.lineAt(position.line).text.length;
    const field = findCursorField(current.fieldsByLine, position, lineLength);
    const selection = field
      ? createCursorFieldDecoration(field, lineLength)
      : undefined;
    editor.setDecorations(decorationType, selection ? [selection] : []);
  }

  private updateAlternatingDecoration(
    editor: vscode.TextEditor,
    current: EditorDecoration,
    decorations: ReturnType<typeof createFieldDecorations>,
  ): void {
    if (decorations.alternatingOptions.length === 0) {
      this.clearAlternatingDecoration(editor, current);
      return;
    }

    if (
      current.alternatingBackgroundKey !== decorations.alternatingBackgroundKey
    ) {
      this.clearAlternatingDecoration(editor, current);
      current.alternatingDecorationType =
        vscode.window.createTextEditorDecorationType({
          isWholeLine: false,
          backgroundColor: decorations.alternatingBackground,
        });
      current.alternatingBackgroundKey = decorations.alternatingBackgroundKey;
    }
    const decorationType = current.alternatingDecorationType;
    if (decorationType) {
      editor.setDecorations(decorationType, decorations.alternatingOptions);
    }
  }

  private clearAlternatingDecoration(
    editor: vscode.TextEditor,
    current: EditorDecoration,
  ): void {
    if (!current.alternatingDecorationType) {
      return;
    }
    editor.setDecorations(current.alternatingDecorationType, []);
    current.alternatingDecorationType.dispose();
    delete current.alternatingDecorationType;
    delete current.alternatingBackgroundKey;
  }

  private scheduleRender(document: vscode.TextDocument): void {
    const uri = document.uri.toString();
    if (!this.hasVisibleSelection(uri)) {
      return;
    }

    this.cancelPendingRender(document);
    const timeout = setTimeout(
      () => this.renderPendingDocument(uri, document),
      renderDelay,
    );
    this.pendingRenderByDocument.set(uri, { document, timeout });
  }

  private hasVisibleSelection(uri: string): boolean {
    return (
      !this.disposed &&
      this.fileTypeByDocument.has(uri) &&
      vscode.window.visibleTextEditors.some(
        (editor) => editor.document.uri.toString() === uri,
      )
    );
  }

  private renderPendingDocument(
    uri: string,
    document: vscode.TextDocument,
  ): void {
    const pending = this.pendingRenderByDocument.get(uri);
    if (pending?.document !== document) {
      return;
    }
    this.pendingRenderByDocument.delete(uri);
    if (this.disposed || !this.isDocumentOpen(document)) {
      return;
    }
    const fileType = this.fileTypeByDocument.get(uri);
    if (fileType !== undefined) {
      this.decorateDocument(document, fileType);
    }
  }

  private cancelPendingRender(document: vscode.TextDocument): void {
    const uri = document.uri.toString();
    const pending = this.pendingRenderByDocument.get(uri);
    if (pending?.document === document) {
      clearTimeout(pending.timeout);
      this.pendingRenderByDocument.delete(uri);
    }
  }

  private isDocumentOpen(document: vscode.TextDocument): boolean {
    return vscode.workspace.textDocuments.includes(document);
  }

  private clearDocumentDecorations(uri: string): void {
    for (const [editor] of this.decorationByEditor) {
      if (editor.document.uri.toString() === uri) {
        this.clearEditor(editor);
      }
    }
  }

  private clearEditor(editor: vscode.TextEditor): void {
    const current = this.decorationByEditor.get(editor);
    if (!current) {
      return;
    }
    this.clearAlternatingDecoration(editor, current);
    if (current.cursorDecorationType) {
      editor.setDecorations(current.cursorDecorationType, []);
      current.cursorDecorationType.dispose();
    }
    editor.setDecorations(current.decorationType, []);
    current.decorationType.dispose();
    this.decorationByEditor.delete(editor);
  }

  private *documentLines(
    document: vscode.TextDocument,
  ): Generator<FixedWidthLine> {
    for (let index = 0; index < document.lineCount; index += 1) {
      const line = document.lineAt(index);
      yield {
        line: index,
        text: line.text,
        isEmptyOrWhitespace: line.isEmptyOrWhitespace,
      };
    }
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
    for (const pending of this.pendingRenderByDocument.values()) {
      clearTimeout(pending.timeout);
    }
    this.pendingRenderByDocument.clear();
    for (const current of this.decorationByEditor.values()) {
      current.alternatingDecorationType?.dispose();
      current.cursorDecorationType?.dispose();
      current.decorationType.dispose();
    }
    this.decorationByEditor.clear();
    this.fileTypeByDocument.clear();
  }
}
