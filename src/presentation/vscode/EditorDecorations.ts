import * as vscode from "vscode";
import type {
  FixedWidthDecorationField,
  FixedWidthDecorationRowBackground,
} from "../../application/fixedWidth/FixedWidthDecoration";
import {
  createCursorFieldDecoration,
  createFieldDecorations,
  findCursorField,
  normalizeVisibleRanges,
  type BoundarySettings,
  type VisibleLineRange,
} from "./decorationStyle";

type RowBackgroundColor = FixedWidthDecorationRowBackground["backgroundColor"];

type VisibleRowBackground = {
  color: RowBackgroundColor;
  options: vscode.DecorationOptions[];
};

type EditorDecoration = {
  fileType: string;
  decorationType: vscode.TextEditorDecorationType;
  cursorDecorationType?: vscode.TextEditorDecorationType;
  cursorBackgroundBorderType?: vscode.TextEditorDecorationType;
  fieldsByLine: ReadonlyMap<number, readonly FixedWidthDecorationField[]>;
  rowBackgroundsByLine: ReadonlyMap<number, RowBackgroundColor>;
  rowBackgroundDecorationTypes: Map<string, vscode.TextEditorDecorationType>;
  alternatingDecorationType?: vscode.TextEditorDecorationType;
  alternatingBackgroundBorderType?: vscode.TextEditorDecorationType;
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
  rowBackgroundsByLine: ReadonlyMap<number, RowBackgroundColor>;
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
    this.updateRowBackgrounds(
      editor,
      current.rowBackgroundDecorationTypes,
      visibleRowBackgrounds(update, ranges),
    );
    current.lastUpdate = update;
    current.lastVisibleRangeKey = rangeKey;
  }

  private prepareCursor(
    editor: vscode.TextEditor,
    current: EditorDecoration,
    update: EditorDecorationUpdate,
  ): void {
    current.fieldsByLine = update.fieldsByLine;
    current.rowBackgroundsByLine = update.rowBackgroundsByLine;
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

  private updateRowBackgrounds(
    editor: vscode.TextEditor,
    types: Map<string, vscode.TextEditorDecorationType>,
    backgrounds: ReadonlyMap<string, VisibleRowBackground>,
  ): void {
    for (const [key, { color }] of backgrounds) {
      if (!types.has(key)) {
        types.set(
          key,
          vscode.window.createTextEditorDecorationType({
            isWholeLine: true,
            light: { backgroundColor: color.light },
            dark: { backgroundColor: color.dark },
          }),
        );
      }
    }
    types.forEach((type, key) => {
      editor.setDecorations(type, backgrounds.get(key)?.options ?? []);
    });
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
    current.rowBackgroundsByLine = new Map();
    delete current.lastUpdate;
    delete current.lastVisibleRangeKey;
    delete current.lastCursorPosition;
    delete current.lastCursorFieldsByLine;
    decorationTypes(current).forEach((type) => editor.setDecorations(type, []));
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
      rowBackgroundsByLine: new Map(),
      rowBackgroundDecorationTypes: new Map(),
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
    const selection = cursorFieldDecoration(
      current.fieldsByLine,
      position,
      lineLength,
    );
    const bordered = this.cursorBorderForSelection(current, selection);
    if (bordered) {
      editor.setDecorations(decorationType, []);
      editor.setDecorations(bordered.type, [bordered.selection]);
      return;
    }
    setDecorations(editor, current.cursorBackgroundBorderType, []);
    editor.setDecorations(
      decorationType,
      [selection].filter((option) => option !== undefined),
    );
  }

  private cursorBorderForSelection(
    current: EditorDecoration,
    selection: vscode.DecorationOptions | undefined,
  ):
    | {
        type: vscode.TextEditorDecorationType;
        selection: vscode.DecorationOptions;
      }
    | undefined {
    if (
      !selection ||
      !current.rowBackgroundsByLine.has(selection.range.start.line)
    ) {
      return;
    }
    current.cursorBackgroundBorderType ??=
      vscode.window.createTextEditorDecorationType({
        isWholeLine: false,
        backgroundColor: new vscode.ThemeColor(
          "editor.wordHighlightStrongBackground",
        ),
        border: "1px solid",
        borderColor: new vscode.ThemeColor("editor.wordHighlightStrongBorder"),
      });
    return { type: current.cursorBackgroundBorderType, selection };
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
    const options = decorations.alternatingOptions;
    if (options.length === 0) {
      this.clearAlternating(editor, current);
      return;
    }
    if (
      current.alternatingBackgroundKey !== decorations.alternatingBackgroundKey
    ) {
      this.clearAlternating(editor, current);
      current.alternatingBackgroundKey = decorations.alternatingBackgroundKey;
    }

    const hasRowBackground = (option: vscode.DecorationOptions) =>
      current.rowBackgroundsByLine.has(option.range.start.line);
    const background = {
      isWholeLine: false,
      backgroundColor: decorations.alternatingBackground,
    };
    current.alternatingDecorationType = applyAlternatingHighlight(
      editor,
      current.alternatingDecorationType,
      {
        options: options.filter((option) => !hasRowBackground(option)),
        style: background,
      },
    );
    current.alternatingBackgroundBorderType = applyAlternatingHighlight(
      editor,
      current.alternatingBackgroundBorderType,
      {
        options: options.filter(hasRowBackground),
        style: {
          ...background,
          border: "1px dotted",
          borderColor: new vscode.ThemeColor("editor.rangeHighlightBorder"),
        },
      },
    );
  }

  private clearAlternating(
    editor: vscode.TextEditor,
    current: EditorDecoration,
  ): void {
    const types = [
      current.alternatingDecorationType,
      current.alternatingBackgroundBorderType,
    ].filter((type) => type !== undefined);
    types.forEach((type) => {
      editor.setDecorations(type, []);
      type.dispose();
    });
    delete current.alternatingDecorationType;
    delete current.alternatingBackgroundBorderType;
    delete current.alternatingBackgroundKey;
  }

  private clearEditor(editor: vscode.TextEditor): void {
    const current = this.byEditor.get(editor);
    if (!current) {
      return;
    }
    decorationTypes(current).forEach((type) => {
      editor.setDecorations(type, []);
      type.dispose();
    });
    this.byEditor.delete(editor);
  }

  public dispose(): void {
    this.byEditor.forEach((current) => {
      decorationTypes(current).forEach((type) => type.dispose());
    });
    this.byEditor.clear();
  }
}

function cursorFieldDecoration(
  fieldsByLine: EditorDecoration["fieldsByLine"],
  position: vscode.Position,
  lineLength: number,
): vscode.DecorationOptions | undefined {
  const field = findCursorField(fieldsByLine, position, lineLength);
  return field ? createCursorFieldDecoration(field, lineLength) : undefined;
}

function applyAlternatingHighlight(
  editor: vscode.TextEditor,
  type: vscode.TextEditorDecorationType | undefined,
  highlight: {
    options: vscode.DecorationOptions[];
    style: vscode.DecorationRenderOptions;
  },
): vscode.TextEditorDecorationType | undefined {
  if (!type && highlight.options.length > 0) {
    type = vscode.window.createTextEditorDecorationType(highlight.style);
  }
  setDecorations(editor, type, highlight.options);
  return type;
}

function setDecorations(
  editor: vscode.TextEditor,
  type: vscode.TextEditorDecorationType | undefined,
  options: vscode.DecorationOptions[],
): void {
  if (type) {
    editor.setDecorations(type, options);
  }
}

function decorationTypes(
  current: EditorDecoration,
): vscode.TextEditorDecorationType[] {
  return [
    current.decorationType,
    current.cursorDecorationType,
    current.cursorBackgroundBorderType,
    current.alternatingDecorationType,
    current.alternatingBackgroundBorderType,
    ...current.rowBackgroundDecorationTypes.values(),
  ].filter((type) => type !== undefined);
}

function visibleRowBackgrounds(
  update: EditorDecorationUpdate,
  ranges: readonly VisibleLineRange[],
): Map<string, VisibleRowBackground> {
  const backgrounds = new Map<string, VisibleRowBackground>();
  forEachVisibleLine(ranges, (line) => {
    const color = update.rowBackgroundsByLine.get(line);
    if (!color) {
      return;
    }
    const key = `${color.light}\u0000${color.dark}`;
    const background = backgrounds.get(key) ?? { color, options: [] };
    const lineLength = update.lineLengths.get(line) ?? 0;
    background.options.push({
      range: new vscode.Range(
        new vscode.Position(line, 0),
        new vscode.Position(line, lineLength),
      ),
    });
    backgrounds.set(key, background);
  });
  return backgrounds;
}

function visibleFieldsForRanges(
  fieldsByLine: ReadonlyMap<number, readonly FixedWidthDecorationField[]>,
  ranges: readonly VisibleLineRange[],
): FixedWidthDecorationField[] {
  const fields: FixedWidthDecorationField[] = [];
  forEachVisibleLine(ranges, (line) =>
    fields.push(...(fieldsByLine.get(line) ?? [])),
  );
  return fields;
}

function forEachVisibleLine(
  ranges: readonly VisibleLineRange[],
  visit: (line: number) => void,
): void {
  for (const range of ranges) {
    for (let line = range.start; line <= range.end; line += 1) {
      visit(line);
    }
  }
}
