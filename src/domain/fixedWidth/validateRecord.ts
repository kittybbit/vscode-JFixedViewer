import type { FixedWidthProjection } from "./projectFields";

export type RecordIssue = {
  code: "INVALID_LENGTH" | "INVALID_TYPE" | "UNKNOWN_RECORD";
  start: number;
  end: number;
  fieldName?: string;
  fieldNumber?: number;
  expectedLength?: number;
  actualLength?: number;
};

/** 1レコードを既存の行射影と照合し、UTF-16文字位置で問題を返す。 */
export function validateRecord(
  lineText: string,
  projection: FixedWidthProjection,
): RecordIssue[] {
  const unmatchedIssue = unknownRecordIssue(lineText, projection);
  if (unmatchedIssue) {
    return [unmatchedIssue];
  }

  const expectedLength = projection.fields.at(-1)?.end ?? 0;
  const lengthIssue = recordLengthIssue(lineText, expectedLength);
  const fieldIssues = numericFieldIssues(lineText, projection);
  return lengthIssue ? [lengthIssue, ...fieldIssues] : fieldIssues;
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

function numericFieldIssues(
  lineText: string,
  projection: FixedWidthProjection,
): RecordIssue[] {
  const issues: RecordIssue[] = [];
  for (const field of projection.fields) {
    const issue = invalidNumericFieldIssue(lineText, field);
    if (issue) {
      issues.push(issue);
    }
  }
  return issues;
}

function invalidNumericFieldIssue(
  lineText: string,
  field: FixedWidthProjection["fields"][number],
): RecordIssue | undefined {
  if (field.type !== "N" || field.end > lineText.length) {
    return undefined;
  }

  const value = lineText.slice(field.start, field.end);
  if (/^[0-9]+$/u.test(value) || /^ +$/u.test(value)) {
    return undefined;
  }
  return {
    code: "INVALID_TYPE",
    start: field.start,
    end: field.end,
    fieldName: field.fieldName,
    fieldNumber: field.fieldNumber,
  };
}
