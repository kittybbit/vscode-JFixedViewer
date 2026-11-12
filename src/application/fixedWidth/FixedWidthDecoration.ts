import {
  projectFields,
  type FixedWidthDefinition,
} from "../../domain/fixedWidth/projectFields";
import {
  validateRecord,
  type RecordIssue,
} from "../../domain/fixedWidth/validateRecord";

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

export type FixedWidthIssue =
  | (RecordIssue & { line: number })
  | {
      code: "VALIDATION_LIMIT";
      line: number;
      start: number;
      end: number;
    };

export type FixedWidthAnalysis = {
  fields: FixedWidthDecorationField[];
  issues: FixedWidthIssue[];
};

type FixedWidthAnalysisState = {
  validationEnabled: boolean;
  mode: string | undefined;
  fields: FixedWidthDecorationField[];
  issues: FixedWidthIssue[];
  truncatedLine: FixedWidthLine | undefined;
};

const maximumIssues = 1000;

export interface FixedWidthDecorationPort {
  readonly choices: FixedWidthChoice[];
  fileTypeForName(name: string | undefined): string | undefined;
  decorate(
    fileType: string,
    lines: Iterable<FixedWidthLine>,
  ): FixedWidthDecorationField[];
  analyze(
    fileType: string,
    lines: Iterable<FixedWidthLine>,
    validationEnabled: boolean,
  ): FixedWidthAnalysis;
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
    return this.analyze(fileType, lines, false).fields;
  }

  public analyze(
    fileType: string,
    lines: Iterable<FixedWidthLine>,
    validationEnabled: boolean,
  ): FixedWidthAnalysis {
    const definition = this.definitionsByType.get(fileType);
    return definition
      ? this.analyzeLines(definition, lines, validationEnabled)
      : { fields: [], issues: [] };
  }

  private analyzeLines(
    definition: FixedWidthDefinition,
    lines: Iterable<FixedWidthLine>,
    validationEnabled: boolean,
  ): FixedWidthAnalysis {
    const state: FixedWidthAnalysisState = {
      validationEnabled,
      mode: undefined,
      fields: [],
      issues: [],
      truncatedLine: undefined,
    };
    for (const line of lines) {
      const projection = this.projectLine(definition, line, state.mode);
      state.mode = projection.mode;
      state.fields.push(...projection.fields);
      this.appendValidationForLine(line, projection.projection, state);
    }
    return {
      fields: state.fields,
      issues: this.addLimitIssue(state.issues, state.truncatedLine),
    };
  }

  private shouldValidateLine(
    validationEnabled: boolean,
    truncatedLine: FixedWidthLine | undefined,
    line: FixedWidthLine,
  ): boolean {
    return (
      validationEnabled &&
      truncatedLine === undefined &&
      !line.isEmptyOrWhitespace
    );
  }

  private appendValidationForLine(
    line: FixedWidthLine,
    projection: ReturnType<typeof projectFields>,
    state: FixedWidthAnalysisState,
  ): void {
    if (
      !this.shouldValidateLine(
        state.validationEnabled,
        state.truncatedLine,
        line,
      )
    ) {
      return;
    }
    state.truncatedLine = this.appendLineIssues(line, projection, state.issues)
      ? line
      : state.truncatedLine;
  }

  private appendLineIssues(
    line: FixedWidthLine,
    projection: ReturnType<typeof projectFields>,
    issues: FixedWidthIssue[],
  ): boolean {
    for (const issue of validateRecord(line.text, projection)) {
      if (issues.length >= maximumIssues) {
        return true;
      }
      issues.push({ line: line.line, ...issue });
    }
    return false;
  }

  private addLimitIssue(
    issues: FixedWidthIssue[],
    truncatedLine: FixedWidthLine | undefined,
  ): FixedWidthIssue[] {
    if (!truncatedLine) {
      return issues;
    }
    issues.push({
      code: "VALIDATION_LIMIT",
      line: 0,
      start: 0,
      end: 0,
    });
    return issues;
  }

  private projectLine(
    definition: FixedWidthDefinition,
    line: FixedWidthLine,
    mode: string | undefined,
  ): {
    fields: FixedWidthDecorationField[];
    mode: string | undefined;
    projection: ReturnType<typeof projectFields>;
  } {
    if (line.isEmptyOrWhitespace) {
      return {
        fields: [],
        mode,
        projection: { fields: [], mode },
      };
    }
    const projection = projectFields(line.text, definition.rows, mode);
    return {
      fields: projection.fields.map((field) => ({ line: line.line, ...field })),
      mode: projection.mode,
      projection,
    };
  }
}

export function createFixedWidthDecoration(
  definitions: readonly FixedWidthDefinition[],
): FixedWidthDecoration {
  return new FixedWidthDecoration(definitions);
}
