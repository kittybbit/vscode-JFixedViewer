import {
  projectFields,
  type FixedWidthDefinition,
} from "../../domain/fixedWidth/projectFields";

export type FixedWidthLine = {
  line: number;
  text: string;
  isEmptyOrWhitespace: boolean;
};

export type FixedWidthDecorationField = {
  line: number;
  name: string;
  fieldName?: string;
  fieldNumber: number;
  type?: string;
  start: number;
  end: number;
  width: number;
};

export type FixedWidthChoice = {
  name: string;
  fileType: string;
};

export interface FixedWidthDecorationPort {
  readonly choices: FixedWidthChoice[];
  fileTypeForName(name: string | undefined): string | undefined;
  decorate(
    fileType: string,
    lines: Iterable<FixedWidthLine>,
  ): FixedWidthDecorationField[];
}

class FixedWidthDecoration implements FixedWidthDecorationPort {
  private readonly definitionsByType: Map<string, FixedWidthDefinition>;
  public readonly choices: FixedWidthChoice[];

  public constructor(definitions: readonly FixedWidthDefinition[]) {
    this.definitionsByType = new Map(
      definitions.map((definition) => [definition.fileType, definition]),
    );
    this.choices = definitions.map(({ name, fileType }) => ({
      name,
      fileType,
    }));
  }

  public fileTypeForName(name: string | undefined): string | undefined {
    return this.choices.find((choice) => choice.name === name)?.fileType;
  }

  public decorate(
    fileType: string,
    lines: Iterable<FixedWidthLine>,
  ): FixedWidthDecorationField[] {
    const definition = this.definitionsByType.get(fileType);
    if (!definition) {
      return [];
    }

    let mode: string | undefined;
    const fields: FixedWidthDecorationField[] = [];
    for (const line of lines) {
      const projection = this.projectLine(definition, line, mode);
      mode = projection.mode;
      fields.push(...projection.fields);
    }
    return fields;
  }

  private projectLine(
    definition: FixedWidthDefinition,
    line: FixedWidthLine,
    mode: string | undefined,
  ): { fields: FixedWidthDecorationField[]; mode: string | undefined } {
    if (line.isEmptyOrWhitespace) {
      return { fields: [], mode };
    }
    const projection = projectFields(line.text, definition.rows, mode);
    return {
      fields: projection.fields.map((field) => ({ line: line.line, ...field })),
      mode: projection.mode,
    };
  }
}

export function createFixedWidthDecoration(
  definitions: readonly FixedWidthDefinition[],
): FixedWidthDecoration {
  return new FixedWidthDecoration(definitions);
}
