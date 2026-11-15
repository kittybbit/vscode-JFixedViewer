import * as vscode from "vscode";
import type { FixedWidthDecorationField } from "../../application/fixedWidth/FixedWidthDecoration";

export type BoundaryStyle = "line" | "alternating" | "marker";

export type BoundarySettings = {
  style: BoundaryStyle;
  color: string;
  width: number;
};

export type FieldDecorations = {
  options: vscode.DecorationOptions[];
  alternatingOptions: vscode.DecorationOptions[];
  alternatingBackground: string | vscode.ThemeColor;
  alternatingBackgroundKey: string;
};

export type VisibleLineRange = {
  start: number;
  end: number;
};

const visibleRangeContext = 20;

type FieldDecorationInput = Pick<
  FixedWidthDecorationField,
  | "line"
  | "start"
  | "end"
  | "width"
  | "name"
  | "fieldName"
  | "fieldNumber"
  | "type"
  | "displayStart"
  | "displayEnd"
  | "hasVisibleEnd"
  | "lengthUnit"
>;

type FieldDecorationContext = {
  field: FieldDecorationInput;
  lineLengths: ReadonlyMap<number, number>;
  columnByLine: Map<number, number>;
  settings: BoundarySettings;
};

type VisibleFieldDecoration = {
  field: FieldDecorationInput;
  range: vscode.Range;
  settings: BoundarySettings;
};

type FieldDecorationSet = {
  options: vscode.DecorationOptions[];
  alternatingOptions: vscode.DecorationOptions[];
};

const defaultSettings: BoundarySettings = {
  style: "line",
  color: "",
  width: 1,
};

export function readBoundarySettings(resource: vscode.Uri): BoundarySettings {
  const configuration = vscode.workspace.getConfiguration(
    "jfixedviewer",
    resource,
  );
  const style = configuration.get<string>("boundaryStyle");
  const color = configuration.get<string>("boundaryColor");
  const width = configuration.get<number>("boundaryWidth");
  return {
    style: isBoundaryStyle(style) ? style : defaultSettings.style,
    color: isValidColor(color) ? color : defaultSettings.color,
    width: isValidWidth(width) ? width : defaultSettings.width,
  };
}

export function createFieldDecorations(
  fields: readonly FieldDecorationInput[],
  settings: BoundarySettings,
  lineLengths: ReadonlyMap<number, number>,
): FieldDecorations {
  const columnByLine = new Map<number, number>();
  const options: vscode.DecorationOptions[] = [];
  const alternatingOptions: vscode.DecorationOptions[] = [];

  for (const field of fields) {
    const fieldDecorations = createFieldDecorationsForField({
      field,
      lineLengths,
      columnByLine,
      settings,
    });
    options.push(...fieldDecorations.options);
    alternatingOptions.push(...fieldDecorations.alternatingOptions);
  }

  return {
    options,
    alternatingOptions,
    alternatingBackground: settings.color
      ? `${settings.color}40`
      : new vscode.ThemeColor("editor.rangeHighlightBackground"),
    alternatingBackgroundKey:
      settings.color || "theme:editor.rangeHighlightBackground",
  };
}

export function normalizeVisibleRanges(
  ranges: readonly {
    start: { line: number };
    end: { line: number };
  }[],
  lineCount: number,
): VisibleLineRange[] {
  if (lineCount <= 0 || ranges.length === 0) {
    return [];
  }

  return mergeVisibleRanges(
    ranges
      .map(({ start, end }) => ({
        start: Math.max(
          0,
          Math.min(start.line, end.line) - visibleRangeContext,
        ),
        end: Math.min(
          lineCount - 1,
          Math.max(start.line, end.line) + visibleRangeContext,
        ),
      }))
      .sort((left, right) => left.start - right.start || left.end - right.end),
  );
}

function mergeVisibleRanges(
  expanded: readonly VisibleLineRange[],
): VisibleLineRange[] {
  const merged: VisibleLineRange[] = [];
  for (const range of expanded) {
    const previous = merged.at(-1);
    if (shouldMergeVisibleRange(previous, range)) {
      previous.end = Math.max(previous.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
}

function shouldMergeVisibleRange(
  previous: VisibleLineRange | undefined,
  next: VisibleLineRange,
): previous is VisibleLineRange {
  return previous !== undefined && next.start <= previous.end + 1;
}

export function createCursorFieldDecoration(
  field: FieldDecorationInput,
  lineLength: number,
): vscode.DecorationOptions | undefined {
  const range = createVisibleRange(field, lineLength);
  return range ? { range } : undefined;
}

export function groupFieldsByLine(
  fields: readonly FixedWidthDecorationField[],
): ReadonlyMap<number, readonly FixedWidthDecorationField[]> {
  const fieldsByLine = new Map<number, FixedWidthDecorationField[]>();
  for (const field of fields) {
    const fieldsForLine = fieldsByLine.get(field.line) ?? [];
    fieldsForLine.push(field);
    fieldsByLine.set(field.line, fieldsForLine);
  }
  return fieldsByLine;
}

export function findCursorField(
  fieldsByLine: ReadonlyMap<number, readonly FixedWidthDecorationField[]>,
  position: { line: number; character: number },
  lineLength: number,
): FixedWidthDecorationField | undefined {
  if (position.character >= lineLength) {
    return undefined;
  }

  return fieldsByLine
    .get(position.line)
    ?.find(
      (candidate) =>
        candidate.fieldName !== undefined &&
        candidate.displayStart <= position.character &&
        position.character < candidate.displayEnd,
    );
}

function createFieldDecorationsForField(
  context: FieldDecorationContext,
): FieldDecorationSet {
  const { field, lineLengths, columnByLine, settings } = context;
  const lineLength = lineLengths.get(field.line) ?? 0;
  const range = createVisibleRange(field, lineLength);
  if (!range) {
    return { options: [], alternatingOptions: [] };
  }

  const ordinal = columnByLine.get(field.line) ?? 0;
  columnByLine.set(field.line, ordinal + 1);
  return {
    options: [
      createFieldDecoration({
        field,
        range,
        settings,
      }),
    ],
    alternatingOptions:
      settings.style === "alternating" && ordinal % 2 === 1 ? [{ range }] : [],
  };
}

function createVisibleRange(
  field: FieldDecorationInput,
  lineLength: number,
): vscode.Range | undefined {
  const end = Math.min(field.displayEnd, lineLength);
  if (end <= field.displayStart) {
    return undefined;
  }

  return new vscode.Range(
    new vscode.Position(field.line, field.displayStart),
    new vscode.Position(field.line, end),
  );
}

function createFieldDecoration(
  context: VisibleFieldDecoration,
): vscode.DecorationOptions {
  const { field, range, settings } = context;
  const decoration: vscode.DecorationOptions = {
    range,
    hoverMessage: createHoverMessage(field),
  };
  const renderOptions = createBoundaryRenderOptions(
    settings,
    field.hasVisibleEnd,
  );
  return renderOptions ? { ...decoration, renderOptions } : decoration;
}

function createBoundaryRenderOptions(
  settings: BoundarySettings,
  hasVisibleEnd: boolean,
): vscode.DecorationInstanceRenderOptions | undefined {
  if (settings.style === "alternating" || !hasVisibleEnd) {
    return undefined;
  }

  const color = settings.color || new vscode.ThemeColor("editor.foreground");
  if (settings.style === "marker") {
    return { after: { contentText: "│", color } };
  }

  return {
    after: {
      contentText: "",
      backgroundColor: color,
      width: `${settings.width}px`,
      height: "1em",
    },
  };
}

function createHoverMessage(
  field: FieldDecorationInput,
): vscode.MarkdownString {
  const hover = new vscode.MarkdownString();
  if (field.fieldName) {
    hover.appendMarkdown("**");
    hover.appendText(
      `${field.name} / ${field.fieldName} (項目 ${field.fieldNumber})`,
    );
    hover.appendMarkdown("**  \n位置: ");
    hover.appendText(fieldPosition(field));
    hover.appendMarkdown("\nデータ型: ");
    hover.appendText(field.type ?? "不明");
  } else {
    hover.appendMarkdown("**");
    hover.appendText(field.name);
    hover.appendMarkdown("**  \n位置: ");
    hover.appendText(fieldPosition(field));
    hover.isTrusted = true;
  }
  return hover;
}

function fieldPosition(field: FieldDecorationInput): string {
  const unit = field.lengthUnit === "byte" ? "バイト" : "桁";
  return `${field.start + 1} - ${field.end} (${field.width}${unit})`;
}

function isBoundaryStyle(value: unknown): value is BoundaryStyle {
  return value === "line" || value === "alternating" || value === "marker";
}

function isValidColor(value: unknown): value is string {
  return (
    typeof value === "string" &&
    (value === "" || /^#[0-9a-f]{6}$/iu.test(value))
  );
}

function isValidWidth(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 4
  );
}
