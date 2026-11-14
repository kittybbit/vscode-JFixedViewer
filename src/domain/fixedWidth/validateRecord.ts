import type { FixedWidthField, FixedWidthProjection } from "./projectFields";
import { projectByteRange, type ByteOffsetMap } from "./byteOffsets";

type RecordIssueDetails = {
  fieldName?: string;
  fieldNumber?: number;
  expectedLength?: number;
  actualLength?: number;
  lengthUnit?: "utf16" | "byte";
};

type RecordIssueRange = {
  start: number;
  end: number;
};

export type RecordIssue =
  | (RecordIssueRange & RecordIssueDetails & { code: "INVALID_LENGTH" })
  | (RecordIssueRange & RecordIssueDetails & { code: "INVALID_TYPE" })
  | (RecordIssueRange & RecordIssueDetails & { code: "UNKNOWN_RECORD" })
  | (RecordIssueRange & RecordIssueDetails & { code: "INVALID_BYTE_BOUNDARY" });

type RecordValidationInput = {
  lineText: string;
  projection: FixedWidthProjection;
  byteOffsets: ByteOffsetMap | undefined;
};

type ByteLengthInput = {
  lineText: string;
  expectedLength: number;
  actualLength: number;
  offsets: ByteOffsetMap | undefined;
};

type NumericValidationInput = {
  lineText: string;
  projection: FixedWidthProjection;
  byteOffsets: ByteOffsetMap | undefined;
  boundaryIssues: readonly RecordIssue[];
};

type NumericFieldInput = NumericValidationInput & {
  field: FixedWidthField;
};

type NumericValueInput = {
  value: string;
  start: number;
  end: number;
  field: FixedWidthField;
};

/** 1レコードを行射影と照合し、問題範囲は常に UTF-16 表示位置で返す。 */
export function validateRecord(
  lineText: string,
  projection: FixedWidthProjection,
  byteOffsets?: ByteOffsetMap,
): RecordIssue[] {
  const unmatchedIssue = unknownRecordIssue(lineText, projection);
  if (unmatchedIssue) {
    return [unmatchedIssue];
  }
  return collectRecordIssues({ lineText, projection, byteOffsets });
}

function collectRecordIssues(input: RecordValidationInput): RecordIssue[] {
  const expectedLength = input.projection.fields.at(-1)?.end ?? 0;
  const isByte = input.projection.lengthUnit === "byte";
  const actualLength = isByte
    ? (input.byteOffsets?.byteLength ?? 0)
    : input.lineText.length;
  const lengthIssue = isByte
    ? recordByteLengthIssue({
        lineText: input.lineText,
        expectedLength,
        actualLength,
        offsets: input.byteOffsets,
      })
    : recordLengthIssue(input.lineText, expectedLength);
  const boundaryIssues = isByte
    ? invalidByteBoundaryIssues(input.projection, input.byteOffsets)
    : [];
  const fieldIssues = numericFieldIssues({
    ...input,
    boundaryIssues,
  });
  return [
    ...(lengthIssue ? [lengthIssue] : []),
    ...boundaryIssues,
    ...fieldIssues,
  ];
}

function unknownRecordIssue(
  lineText: string,
  projection: FixedWidthProjection,
): RecordIssue | undefined {
  if (projection.rowName !== undefined) {
    return undefined;
  }
  return {
    code: "UNKNOWN_RECORD",
    start: 0,
    end: lineText.length,
  };
}

function recordLengthIssue(
  lineText: string,
  expectedLength: number,
): RecordIssue | undefined {
  if (lineText.length === expectedLength) {
    return undefined;
  }
  const start =
    lineText.length < expectedLength
      ? Math.max(0, lineText.length - 1)
      : expectedLength;
  return {
    code: "INVALID_LENGTH",
    start,
    end: lineText.length,
    expectedLength,
    actualLength: lineText.length,
  };
}

function recordByteLengthIssue({
  lineText,
  expectedLength,
  actualLength,
  offsets,
}: ByteLengthInput): RecordIssue | undefined {
  if (actualLength === expectedLength) {
    return undefined;
  }
  if (!offsets) {
    return {
      code: "INVALID_LENGTH",
      start: 0,
      end: lineText.length,
      expectedLength,
      actualLength,
      lengthUnit: "byte",
    };
  }
  return {
    code: "INVALID_LENGTH",
    start: recordByteLengthStart(actualLength, expectedLength, offsets),
    end: lineText.length,
    expectedLength,
    actualLength,
    lengthUnit: "byte",
  };
}

function recordByteLengthStart(
  actualLength: number,
  expectedLength: number,
  offsets: ByteOffsetMap,
): number {
  const byteOffset =
    actualLength < expectedLength
      ? Math.max(0, actualLength - 1)
      : expectedLength;
  return projectByteRange(offsets, byteOffset, byteOffset).start;
}

function invalidByteBoundaryIssues(
  projection: FixedWidthProjection,
  offsets: ByteOffsetMap | undefined,
): RecordIssue[] {
  if (!offsets) {
    return [];
  }
  const issues: RecordIssue[] = [];
  for (const field of projection.fields) {
    const issue = invalidByteBoundaryIssue(field, offsets);
    if (issue) {
      issues.push(issue);
    }
  }
  return issues;
}

function invalidByteBoundaryIssue(
  field: FixedWidthField,
  offsets: ByteOffsetMap,
): RecordIssue | undefined {
  const invalidOffsets = [field.start, field.end].filter((byteOffset) =>
    isInvalidByteBoundary(byteOffset, offsets),
  );
  if (invalidOffsets.length === 0) {
    return undefined;
  }
  const ranges = invalidOffsets.map((byteOffset) =>
    projectByteRange(offsets, byteOffset, byteOffset),
  );
  return {
    code: "INVALID_BYTE_BOUNDARY",
    start: Math.min(...ranges.map(({ start }) => start)),
    end: Math.max(...ranges.map(({ end }) => end)),
    fieldName: field.fieldName,
    fieldNumber: field.fieldNumber,
    lengthUnit: "byte",
  };
}

function isInvalidByteBoundary(
  byteOffset: number,
  offsets: ByteOffsetMap,
): boolean {
  return (
    byteOffset < offsets.byteLength &&
    offsets.byteToUtf16[byteOffset] === undefined
  );
}

function numericFieldIssues(input: NumericValidationInput): RecordIssue[] {
  const issues: RecordIssue[] = [];
  for (const field of input.projection.fields) {
    const issue = invalidNumericFieldIssue({ ...input, field });
    if (issue) {
      issues.push(issue);
    }
  }
  return issues;
}

function invalidNumericFieldIssue(
  input: NumericFieldInput,
): RecordIssue | undefined {
  if (input.field.type !== "N") {
    return undefined;
  }
  const value =
    input.field.lengthUnit === "byte"
      ? numericByteValue(input)
      : numericUtf16Value(input);
  return value
    ? invalidNumericValue({ ...value, field: input.field })
    : undefined;
}

function numericByteValue(
  input: NumericFieldInput,
): Omit<NumericValueInput, "field"> | undefined {
  const offsets = input.byteOffsets;
  const field = input.field;
  if (
    !offsets ||
    field.end > offsets.byteLength ||
    input.boundaryIssues.some(
      (issue) => issue.fieldNumber === field.fieldNumber,
    )
  ) {
    return undefined;
  }
  const start = offsets.byteToUtf16[field.start];
  const end = offsets.byteToUtf16[field.end];
  if (start === undefined || end === undefined) {
    return undefined;
  }
  return { value: input.lineText.slice(start, end), start, end };
}

function numericUtf16Value(
  input: NumericFieldInput,
): Omit<NumericValueInput, "field"> | undefined {
  const { field, lineText } = input;
  if (field.end > lineText.length) {
    return undefined;
  }
  return {
    value: lineText.slice(field.start, field.end),
    start: field.start,
    end: field.end,
  };
}

function invalidNumericValue({
  value,
  start,
  end,
  field,
}: NumericValueInput): RecordIssue | undefined {
  if (/^[0-9]+$/u.test(value) || /^ +$/u.test(value)) {
    return undefined;
  }
  return {
    code: "INVALID_TYPE",
    start,
    end,
    fieldName: field.fieldName,
    fieldNumber: field.fieldNumber,
  };
}
