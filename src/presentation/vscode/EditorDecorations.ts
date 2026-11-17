import * as vscode from "vscode";
import type { FixedWidthDecorationField } from "../../application/fixedWidth/FixedWidthDecoration";
import {
  createCursorFieldDecoration,
  createFieldDecorations,
  findCursorField,
  normalizeVisibleRanges,
  type BoundarySettings,
  type VisibleLineRange,
} from "./decorationStyle";

type EditorDecoration = {
  fileType: string;
  decorationType: vscode.TextEditorDecorationType;
  cursorDecorationType?: vscode.TextEditorDecorationType;
  fieldsByLine: ReadonlyMap<number, readonly FixedWidthDecorationField[]>;
  alternatingDecorationType?: vscode.TextEditorDecorationType;
  alternatingBackgroundKey?: string;
  lastUpdate?: EditorDecorationUpdate;
  lastVisibleRangeKey?: string;
  lastCursorPosition?: string;
  lastCursorFieldsByLine?: ReadonlyMap<
    number,
    readonly FixedWidthDecorationField[]
  >;
};

export type EditorDecorationUpdate = {
  fileType: string;
  fieldsByLine: ReadonlyMap<number, readonly FixedWidthDecorationField[]>;
  lineLengths: ReadonlyMap<number, number>;
  hasFieldMetadata: boolean;
  settings: BoundarySettings;
};

export type VisibleEditorDecorationPlan =
  | { kind: "skip" }
  | { kind: "cached"; update: EditorDecorationUpdate }
  | { kind: "render"; start: () => void };

export class EditorDecorations implements vscode.Disposable {
  private readonly byEditor = new Map<vscode.TextEditor, EditorDecoration>();

  public has(editor: vscode.TextEditor): boolean {
    return this.byEditor.has(editor);
  }

  public apply(
    editor: vscode.TextEditor,
    update: EditorDecorationUpdate,
  ): void {
    const current = this.getOrCreate(editor, update.fileType);
    this.prepareCursor(editor, current, update);
    const ranges = this.visibleRanges(editor);
    const rangeKey = this.visibleRangeKey(ranges);
    if (this.hasAppliedVisibleRange(current, update, rangeKey)) {
      return;
    }

    const decorations = this.createVisibleDecorations(update, ranges);
    editor.setDecorations(current.decorationType, decorations.options);
    this.updateAlternating(editor, current, decorations);
    current.lastUpdate = update;
    current.lastVisibleRangeKey = rangeKey;
  }

  private prepareCursor(
    editor: vscode.TextEditor,
    current: EditorDecoration,
    update: EditorDecorationUpdate,
  ): void {
    current.fieldsByLine = update.fieldsByLine;
    this.ensureCursorDecoration(current, update.hasFieldMetadata);
    this.updateCursorField(editor, current);
  }

  private visibleRanges(editor: vscode.TextEditor): VisibleLineRange[] {
    return normalizeVisibleRanges(
      editor.visibleRanges,
      editor.document.lineCount,
    );
  }

  private visibleRangeKey(ranges: readonly VisibleLineRange[]): string {
    return ranges.map(({ start, end }) => `${start}:${end}`).join(",");
  }

  private hasAppliedVisibleRange(
    current: EditorDecoration,
    update: EditorDecorationUpdate,
    rangeKey: string,
  ): boolean {
    return (
      current.lastUpdate === update && current.lastVisibleRangeKey === rangeKey
    );
  }

  private createVisibleDecorations(
    update: EditorDecorationUpdate,
    ranges: readonly VisibleLineRange[],
  ): ReturnType<typeof createFieldDecorations> {
    const fields = visibleFieldsForRanges(update.fieldsByLine, ranges);
    return createFieldDecorations(fields, update.settings, update.lineLengths);
  }

  public updateCursor(editor: vscode.TextEditor): void {
    const current = this.byEditor.get(editor);
    if (current) {
      this.updateCursorField(editor, current);
    }
  }

  public clearHidden(editors: readonly vscode.TextEditor[]): void {
    const visible = new Set(editors);
    for (const editor of this.byEditor.keys()) {
      if (!visible.has(editor)) {
        this.clearEditor(editor);
      }
    }
  }

  public clearDocument(uri: string): void {
    for (const [editor] of this.byEditor) {
      if (editor.document.uri.toString() === uri) {
        this.clearEditor(editor);
      }
    }
  }

  public clearSelection(uri: string, preserveTypes: boolean): void {
    for (const [editor, current] of this.byEditor) {
      if (editor.document.uri.toString() === uri) {
        this.clearSelectionForEditor(editor, current, preserveTypes);
      }
    }
  }

  public reconcileVisibleEditors(
    editors: readonly vscode.TextEditor[],
    planForEditor: (
      editor: vscode.TextEditor,
      renderAlreadyStarted: boolean,
    ) => VisibleEditorDecorationPlan,
  ): void {
    const renderingUris = new Set<string>();
    for (const editor of editors) {
      if (this.has(editor)) {
        continue;
      }
      const uri = editor.document.uri.toString();
      const plan = planForEditor(editor, renderingUris.has(uri));
      this.applyVisibleEditorPlan(editor, plan, renderingUris);
    }
  }

  private applyVisibleEditorPlan(
    editor: vscode.TextEditor,
    plan: VisibleEditorDecorationPlan,
    renderingUris: Set<string>,
  ): void {
    if (plan.kind === "cached") {
      this.apply(editor, plan.update);
      return;
    }
    if (plan.kind !== "render") {
      return;
    }
    renderingUris.add(editor.document.uri.toString());
    plan.start();
  }

  private clearSelectionForEditor(
    editor: vscode.TextEditor,
    current: EditorDecoration,
    preserveTypes: boolean,
  ): void {
    if (!preserveTypes) {
      this.clearEditor(editor);
      return;
    }
    this.clearRetainedDecorations(editor, current);
  }

  private clearRetainedDecorations(
    editor: vscode.TextEditor,
    current: EditorDecoration,
  ): void {
    current.fieldsByLine = new Map();
    delete current.lastUpdate;
    delete current.lastVisibleRangeKey;
    delete current.lastCursorPosition;
    delete current.lastCursorFieldsByLine;
    editor.setDecorations(current.decorationType, []);
    if (current.cursorDecorationType) {
      editor.setDecorations(current.cursorDecorationType, []);
    }
    if (current.alternatingDecorationType) {
      editor.setDecorations(current.alternatingDecorationType, []);
    }
  }

  private getOrCreate(
    editor: vscode.TextEditor,
    fileType: string,
  ): EditorDecoration {
    const current = this.byEditor.get(editor);
    if (current?.fileType === fileType) {
      return current;
    }
    if (current) {
      this.clearEditor(editor);
    }
    const created: EditorDecoration = {
      fileType,
      decorationType: vscode.window.createTextEditorDecorationType({
        isWholeLine: false,
      }),
      fieldsByLine: new Map(),
    };
    this.byEditor.set(editor, created);
    return created;
  }

  private ensureCursorDecoration(
    current: EditorDecoration,
    hasFieldMetadata: boolean,
  ): void {
    if (!hasFieldMetadata || current.cursorDecorationType) {
      return;
    }
    current.cursorDecorationType = vscode.window.createTextEditorDecorationType(
      {
        isWholeLine: false,
        backgroundColor: new vscode.ThemeColor(
          "editor.wordHighlightStrongBackground",
        ),
      },
    );
  }

  private updateCursorField(
    editor: vscode.TextEditor,
    current: EditorDecoration,
  ): void {
    const decorationType = current.cursorDecorationType;
    if (!decorationType) {
      return;
    }
    const position = editor.selection.active;
    const positionKey = `${position.line}:${position.character}`;
    if (this.isCurrentCursorField(current, positionKey)) {
      return;
    }
    current.lastCursorPosition = positionKey;
    current.lastCursorFieldsByLine = current.fieldsByLine;
    const lineLength = editor.document.lineAt(position.line).text.length;
    const field = findCursorField(current.fieldsByLine, position, lineLength);
    const selection = field
      ? createCursorFieldDecoration(field, lineLength)
      : undefined;
    editor.setDecorations(decorationType, selection ? [selection] : []);
  }

  private isCurrentCursorField(
    current: EditorDecoration,
    positionKey: string,
  ): boolean {
    return (
      current.lastCursorPosition === positionKey &&
      current.lastCursorFieldsByLine === current.fieldsByLine
    );
  }

  private updateAlternating(
    editor: vscode.TextEditor,
    current: EditorDecoration,
    decorations: ReturnType<typeof createFieldDecorations>,
  ): void {
    if (decorations.alternatingOptions.length === 0) {
      this.clearAlternating(editor, current);
      return;
    }
    if (
      current.alternatingBackgroundKey !== decorations.alternatingBackgroundKey
    ) {
      this.clearAlternating(editor, current);
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

  private clearAlternating(
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

  private clearEditor(editor: vscode.TextEditor): void {
    const current = this.byEditor.get(editor);
    if (!current) {
      return;
    }
    this.clearAlternating(editor, current);
    if (current.cursorDecorationType) {
      editor.setDecorations(current.cursorDecorationType, []);
      current.cursorDecorationType.dispose();
    }
    editor.setDecorations(current.decorationType, []);
    current.decorationType.dispose();
    this.byEditor.delete(editor);
  }

  public dispose(): void {
    for (const current of this.byEditor.values()) {
      current.alternatingDecorationType?.dispose();
      current.cursorDecorationType?.dispose();
      current.decorationType.dispose();
    }
    this.byEditor.clear();
  }
}

function visibleFieldsForRanges(
  fieldsByLine: ReadonlyMap<number, readonly FixedWidthDecorationField[]>,
  ranges: readonly VisibleLineRange[],
): FixedWidthDecorationField[] {
  const fields: FixedWidthDecorationField[] = [];
  for (const range of ranges) {
    for (let line = range.start; line <= range.end; line += 1) {
      fields.push(...(fieldsByLine.get(line) ?? []));
    }
  }
  return fields;
}
