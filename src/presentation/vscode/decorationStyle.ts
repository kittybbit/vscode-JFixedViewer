import * as vscode from "vscode";
import type {
  FixedWidthDecorationField,
  FixedWidthLine,
} from "../../application/fixedWidth/FixedWidthDecoration";

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

type FieldDecorationInput = Pick<
  FixedWidthDecorationField,
  "line" | "start" | "end" | "width" | "name"
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
  lines: readonly FixedWidthLine[],
  settings: BoundarySettings,
): FieldDecorations {
  const lineLengths = new Map(
    lines.map((line) => [line.line, line.text.length]),
  );
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
  const end = Math.min(field.end, lineLength);
  if (end <= field.start) {
    return undefined;
  }

  return new vscode.Range(
    new vscode.Position(field.line, field.start),
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
    range.end.character === field.end,
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
  const hover = new vscode.MarkdownString(
    `**${field.name}**  \n位置: ${field.start + 1} - ${field.end} (${field.width}桁)`,
  );
  hover.isTrusted = true;
  return hover;
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
