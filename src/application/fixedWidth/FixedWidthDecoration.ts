import {
  projectByteRange,
  type ByteOffsetMap,
} from "../../domain/fixedWidth/byteOffsets";
import {
  projectFields,
  type FixedWidthDefinition,
  type FixedWidthLengthUnit,
  type FixedWidthProjection,
} from "../../domain/fixedWidth/projectFields";
import {
  validateRecord,
  type RecordIssue,
} from "../../domain/fixedWidth/validateRecord";
import type {
  TextEncodingFailureCode,
  TextEncodingPort,
  TextEncodingResult,
} from "./TextEncodingPort";

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
  /** 定義上の論理位置。byte 定義ではバイト位置。 */
  start: number;
  end: number;
  width: number;
  /** VS Code に渡す UTF-16 表示位置。 */
  displayStart: number;
  displayEnd: number;
  /** 定義上の終端が snapshot 内にある場合だけ境界を描く。 */
  hasVisibleEnd: boolean;
  lengthUnit: FixedWidthLengthUnit;
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
  failure?: TextEncodingFailureCode;
};

export type FixedWidthAnalysisRequest = {
  fileType: string;
  lines: Iterable<FixedWidthLine>;
  validationEnabled: boolean;
  currentEncoding?: string;
};

export type FixedWidthDecorationRequest = Omit<
  FixedWidthAnalysisRequest,
  "validationEnabled"
>;

type FixedWidthAnalysisState = {
  validationEnabled: boolean;
  mode: string | undefined;
  fields: FixedWidthDecorationField[];
  issues: FixedWidthIssue[];
  truncatedLine: FixedWidthLine | undefined;
};

type ByteMapRequest = {
  definition: FixedWidthDefinition;
  lines: readonly FixedWidthLine[];
  currentEncoding: string | undefined;
};

type ByteMapResult =
  | { ok: true; maps: readonly ByteOffsetMap[] | undefined }
  | { ok: false; code: TextEncodingFailureCode };

type AnalyzeLinesRequest = {
  definition: FixedWidthDefinition;
  lines: readonly FixedWidthLine[];
  validationEnabled: boolean;
  byteMaps: readonly ByteOffsetMap[] | undefined;
};

type ProjectLineRequest = {
  definition: FixedWidthDefinition;
  line: FixedWidthLine;
  mode: string | undefined;
  lengthUnit: FixedWidthLengthUnit;
  byteOffsets: ByteOffsetMap | undefined;
};

type ProjectedLine = {
  fields: FixedWidthDecorationField[];
  mode: string | undefined;
  projection: FixedWidthProjection;
};

type ValidationLineRequest = {
  line: FixedWidthLine;
  projection: FixedWidthProjection;
  byteOffsets: ByteOffsetMap | undefined;
  state: FixedWidthAnalysisState;
};

type LineIssueRequest = {
  line: FixedWidthLine;
  projection: FixedWidthProjection;
  byteOffsets: ByteOffsetMap | undefined;
  issues: FixedWidthIssue[];
};

const maximumIssues = 1000;

export interface FixedWidthDecorationPort {
  readonly choices: FixedWidthChoice[];
  fileTypeForName(name: string | undefined): string | undefined;
  encodingForFileType(fileType: string): string | undefined;
  decorate(
    request: FixedWidthDecorationRequest,
  ): Promise<FixedWidthDecorationField[]>;
  analyze(request: FixedWidthAnalysisRequest): Promise<FixedWidthAnalysis>;
}

class FixedWidthDecoration implements FixedWidthDecorationPort {
  private readonly definitionsByType: Map<string, FixedWidthDefinition>;
  public readonly choices: FixedWidthChoice[];

  public constructor(
    definitions: readonly FixedWidthDefinition[],
    private readonly textEncoding?: TextEncodingPort,
  ) {
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

  public encodingForFileType(fileType: string): string | undefined {
    return this.definitionsByType.get(fileType)?.encoding;
  }

  public async decorate(
    request: FixedWidthDecorationRequest,
  ): Promise<FixedWidthDecorationField[]> {
    return (await this.analyze({ ...request, validationEnabled: false }))
      .fields;
  }

  public async analyze(
    request: FixedWidthAnalysisRequest,
  ): Promise<FixedWidthAnalysis> {
    const definition = this.definitionsByType.get(request.fileType);
    if (!definition) {
      return emptyAnalysis();
    }
    const lines = [...request.lines];
    const result = await this.byteMapsFor({
      definition,
      lines,
      currentEncoding: request.currentEncoding,
    });
    if (!result.ok) {
      return emptyAnalysis(result.code);
    }
    return this.analyzeLines({
      definition,
      lines,
      validationEnabled: request.validationEnabled,
      byteMaps: result.maps,
    });
  }

  private async byteMapsFor(request: ByteMapRequest): Promise<ByteMapResult> {
    if ((request.definition.lengthUnit ?? "utf16") !== "byte") {
      return { ok: true, maps: undefined };
    }
    const encoding = request.definition.encoding ?? request.currentEncoding;
    if (!encoding || !this.textEncoding) {
      return { ok: false, code: "UNSUPPORTED_ENCODING" };
    }
    return this.mapByteSnapshot(request.lines, encoding);
  }

  private async mapByteSnapshot(
    lines: readonly FixedWidthLine[],
    encoding: string,
  ): Promise<ByteMapResult> {
    try {
      const encoded = await this.textEncoding!.mapLines(
        lines.map(({ text }) => text),
        encoding,
      );
      return classifyEncodingResult(encoded, lines.length);
    } catch {
      return { ok: false, code: "ENCODING_FAILED" };
    }
  }

  private analyzeLines(request: AnalyzeLinesRequest): FixedWidthAnalysis {
    const state: FixedWidthAnalysisState = {
      validationEnabled: request.validationEnabled,
      mode: undefined,
      fields: [],
      issues: [],
      truncatedLine: undefined,
    };
    const lengthUnit = request.definition.lengthUnit ?? "utf16";
    for (const [index, line] of request.lines.entries()) {
      const projected = this.projectLine({
        definition: request.definition,
        line,
        mode: state.mode,
        lengthUnit,
        byteOffsets: request.byteMaps?.[index],
      });
      state.mode = projected.mode;
      state.fields.push(...projected.fields);
      this.appendValidation({
        line,
        projection: projected.projection,
        byteOffsets: request.byteMaps?.[index],
        state,
      });
    }
    return { fields: state.fields, issues: addLimitIssue(state) };
  }

  private projectLine(request: ProjectLineRequest): ProjectedLine {
    const projection = request.line.isEmptyOrWhitespace
      ? emptyProjection(request.mode, request.lengthUnit)
      : projectFields({
          lineText: request.line.text,
          rowRules: request.definition.rows,
          currentMode: request.mode,
          lengthUnit: request.lengthUnit,
        });
    const fields =
      request.lengthUnit === "byte"
        ? projectByteFields(request, projection)
        : projectUtf16Fields(request, projection);
    return { fields, mode: projection.mode, projection };
  }

  private appendValidation(request: ValidationLineRequest): void {
    if (!shouldValidateLine(request)) {
      return;
    }
    if (appendLineIssues(request, maximumIssues)) {
      request.state.truncatedLine = request.line;
    }
  }
}

function emptyAnalysis(failure?: TextEncodingFailureCode): FixedWidthAnalysis {
  return { fields: [], issues: [], failure };
}

function classifyEncodingResult(
  encoded: TextEncodingResult,
  lineCount: number,
): ByteMapResult {
  if (!encoded.ok) {
    return { ok: false, code: encoded.code };
  }
  if (encoded.lines.length !== lineCount) {
    return { ok: false, code: "ENCODING_MISMATCH" };
  }
  return { ok: true, maps: encoded.lines };
}

function emptyProjection(
  mode: string | undefined,
  lengthUnit: FixedWidthLengthUnit,
): FixedWidthProjection {
  return { fields: [], mode, lengthUnit };
}

function projectByteFields(
  request: ProjectLineRequest,
  projection: FixedWidthProjection,
): FixedWidthDecorationField[] {
  return projection.fields.flatMap((field) => projectByteField(request, field));
}

function projectByteField(
  request: ProjectLineRequest,
  field: FixedWidthProjection["fields"][number],
): FixedWidthDecorationField[] {
  const offsets = request.byteOffsets;
  if (!offsets || field.start >= offsets.byteLength) {
    return [];
  }
  const range = projectByteRange(offsets, field.start, field.end);
  if (!range.startIsBoundary || !range.endIsBoundary) {
    return [];
  }
  return [
    {
      line: request.line.line,
      ...field,
      displayStart: range.start,
      displayEnd: range.end,
      hasVisibleEnd: field.end <= offsets.byteLength && range.endIsBoundary,
    },
  ];
}

function projectUtf16Fields(
  request: ProjectLineRequest,
  projection: FixedWidthProjection,
): FixedWidthDecorationField[] {
  return projection.fields.map((field) => ({
    line: request.line.line,
    ...field,
    displayStart: field.start,
    displayEnd: Math.min(field.end, request.line.text.length),
    hasVisibleEnd: field.end <= request.line.text.length,
  }));
}

function shouldValidateLine(request: ValidationLineRequest): boolean {
  return (
    request.state.validationEnabled &&
    request.state.truncatedLine === undefined &&
    !request.line.isEmptyOrWhitespace
  );
}

function appendLineIssues(
  request: ValidationLineRequest,
  maximum: number,
): boolean {
  for (const issue of validateRecord(
    request.line.text,
    request.projection,
    request.byteOffsets,
  )) {
    if (request.state.issues.length >= maximum) {
      return true;
    }
    request.state.issues.push({ line: request.line.line, ...issue });
  }
  return false;
}

function addLimitIssue(state: FixedWidthAnalysisState): FixedWidthIssue[] {
  if (!state.truncatedLine) {
    return state.issues;
  }
  state.issues.push({ code: "VALIDATION_LIMIT", line: 0, start: 0, end: 0 });
  return state.issues;
}

export function createFixedWidthDecoration(
  definitions: readonly FixedWidthDefinition[],
  textEncoding?: TextEncodingPort,
): FixedWidthDecoration {
  return new FixedWidthDecoration(definitions, textEncoding);
}
