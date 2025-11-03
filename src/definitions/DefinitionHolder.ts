import { FilePattern, RowDefinition } from "./types";
import clear from "./clear.json";
import zengin from "./zengin.json";
import jpx from "./jpx.json";

type RawRow = {
  name: string;
  condition?: string;
  mode_rule?: string;
  mode_rule_position?: number;
  mode?: string;
  columns: number[];
};

type FileStructure = {
  file_type: string;
  name: string;
  finame_pattern: string;
  rows: RawRow[];
};

type Definition = {
  type: string;
  name: string;
  files: FileStructure[];
};

export class DefinitionHolder {
  private _files: FilePattern[] = [];
  private _rowDefinitionsByFile: Map<string, RowDefinition[]> = new Map();

  public static init(): DefinitionHolder {
    console.info("initialized DefinitionHolder.");
    const dh = new DefinitionHolder();
    return dh;
  }

  /** constructor */
  private constructor() {
    this.loadDefinitions();
  }

  /** Load definitions */
  private loadDefinitions() {
    // clear.json
    this.convert(clear);
    // zengin.json
    this.convert(zengin);
    // jpx.json
    this.convert(jpx);
  }

  private convert(definition: Definition) {
    (definition as Definition).files.forEach((file) => {
      const key = `${file.file_type}@${definition.type}`;
      this._files.push({
        finame_pattern: new RegExp(file.finame_pattern),
        file_type: key,
        name: `${definition.name}/${file.name}`,
      });
      this._rowDefinitionsByFile.set(
        key,
        file.rows.map((row) => {
          const r: RowDefinition = {
            name: row.name,
            condition: new RegExp(row.condition ?? "^(?!s*$).+"),
            mode_rule: row.mode_rule ? new RegExp(row.mode_rule) : undefined,
            mode_rule_position: row.mode_rule_position,
            mode: row.mode ? new RegExp(row.mode) : undefined,
            columns: row.columns,
          };
          console.log(
            `name: ${definition.name}/${file.name}:${r.name},column length: ${r.columns.reduce((acc, val) => acc + val, 0)}`,
          );
          return r;
        }),
      );
    });
  }

  get files(): FilePattern[] {
    return this._files;
  }

  get rowDefinitionsByFile(): Map<string, RowDefinition[]> {
    return this._rowDefinitionsByFile;
  }
}
