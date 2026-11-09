import clear from "../../resource/definitions/clear.json";
import jpx from "../../resource/definitions/jpx.json";
import zengin from "../../resource/definitions/zengin.json";
import type {
  FixedWidthDefinition,
  FixedWidthRowRule,
} from "../../domain/fixedWidth/projectFields";

type RawRow = {
  name: string;
  condition?: string;
  mode_rule?: string;
  mode_rule_position?: number;
  mode?: string;
  columns: number[];
};

type RawFile = {
  file_type: string;
  name: string;
  finame_pattern: string;
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
    modeRule: row.mode_rule ? new RegExp(row.mode_rule) : undefined,
    modeRulePosition: row.mode_rule_position,
    mode: row.mode ? new RegExp(row.mode) : undefined,
    columns: row.columns,
  }));
}

export function loadBuiltInDefinitions(): FixedWidthDefinition[] {
  const rawDefinitions = [clear, zengin, jpx] as RawDefinition[];
  return rawDefinitions.flatMap((definition) =>
    definition.files.map((file) => ({
      fileType: `${file.file_type}@${definition.type}`,
      name: `${definition.name}/${file.name}`,
      fileNamePattern: new RegExp(file.finame_pattern),
      rows: compileRows(file.rows),
    })),
  );
}
