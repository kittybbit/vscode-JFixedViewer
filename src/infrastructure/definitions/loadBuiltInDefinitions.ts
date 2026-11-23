import clear from "../../resource/definitions/clear.json";
import docomo from "../../resource/definitions/docomo.json";
import jpx from "../../resource/definitions/jpx.json";
import ntt from "../../resource/definitions/ntt.json";
import zengin from "../../resource/definitions/zengin.json";
import type {
  FixedWidthBackgroundColor,
  FixedWidthDefinition,
  FixedWidthRowRule,
} from "../../domain/fixedWidth/projectFields";

type RawRow = {
  name: string;
  condition?: string;
  backgroundColor?: unknown;
  mode_rule?: string;
  mode_rule_position?: number;
  mode?: string;
  fields?: {
    name?: string;
    length: number;
    type?: string;
  }[];
  columns?: number[];
};

function parseBackgroundColor(
  value: unknown,
): FixedWidthBackgroundColor | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  const color = value as { light?: unknown; dark?: unknown };
  if (
    typeof color.light !== "string" ||
    typeof color.dark !== "string" ||
    !/^#[\da-fA-F]{6}(?:[\da-fA-F]{2})?$/u.test(color.light) ||
    !/^#[\da-fA-F]{6}(?:[\da-fA-F]{2})?$/u.test(color.dark)
  ) {
    return undefined;
  }
  return { light: color.light, dark: color.dark };
}

type RawFile = {
  file_type: string;
  name: string;
  finame_pattern: string;
  encoding?: string;
  length_unit?: "utf16" | "byte";
  rows: RawRow[];
};

type RawDefinition = {
  type: string;
  name: string;
  files: RawFile[];
};

function compileRows(rows: readonly RawRow[]): FixedWidthRowRule[] {
  return rows.map((row) => ({
    name: row.name,
    condition: new RegExp(row.condition ?? "^(?!s*$).+"),
    backgroundColor: parseBackgroundColor(row.backgroundColor),
    modeRule: row.mode_rule ? new RegExp(row.mode_rule) : undefined,
    modeRulePosition: row.mode_rule_position,
    mode: row.mode ? new RegExp(row.mode) : undefined,
    fields: row.fields ?? row.columns?.map((length) => ({ length })),
  }));
}

export function loadBuiltInDefinitions(): FixedWidthDefinition[] {
  const rawDefinitions = [clear, zengin, jpx, ntt, docomo] as RawDefinition[];
  return rawDefinitions.flatMap((definition) =>
    definition.files.map((file) => ({
      fileType: `${file.file_type}@${definition.type}`,
      name: `${definition.name}/${file.name}`,
      fileNamePattern: new RegExp(file.finame_pattern),
      encoding: file.encoding,
      lengthUnit: file.length_unit ?? "utf16",
      rows: compileRows(file.rows),
    })),
  );
}
