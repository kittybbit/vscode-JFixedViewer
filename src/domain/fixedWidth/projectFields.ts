export type FixedWidthRowRule = {
  name: string;
  condition: RegExp;
  modeRule?: RegExp;
  modeRulePosition?: number;
  mode?: RegExp;
  fields?: readonly FixedWidthFieldDefinition[];
};

export type FixedWidthFieldDefinition = {
  name?: string;
  length: number;
  type?: string;
};

export type FixedWidthDefinition = {
  fileType: string;
  name: string;
  fileNamePattern: RegExp;
  encoding?: string;
  lengthUnit?: FixedWidthLengthUnit;
  rows: FixedWidthRowRule[];
};

export type FixedWidthLengthUnit = "utf16" | "byte";

export type FixedWidthField = {
  name: string;
  fieldName?: string;
  fieldNumber: number;
  type?: string;
  start: number;
  end: number;
  width: number;
  lengthUnit: FixedWidthLengthUnit;
};

export type FixedWidthProjection = {
  rowName?: string;
  fields: FixedWidthField[];
  mode: string | undefined;
  lengthUnit: FixedWidthLengthUnit;
};

export type ProjectFieldsRequest = {
  lineText: string;
  rowRules: readonly FixedWidthRowRule[];
  currentMode: string | undefined;
  lengthUnit?: FixedWidthLengthUnit;
};

function matchesMode(
  row: FixedWidthRowRule,
  mode: string | undefined,
): boolean {
  return !row.mode || (!!mode && row.mode.test(mode));
}

function findApplicableRow(
  lineText: string,
  rowRules: readonly FixedWidthRowRule[],
  mode: string | undefined,
): FixedWidthRowRule | undefined {
  for (const row of rowRules) {
    if (row.condition.test(lineText) && matchesMode(row, mode)) {
      return row;
    }
  }
  return undefined;
}

function updateMode(
  row: FixedWidthRowRule,
  lineText: string,
  currentMode: string | undefined,
): string | undefined {
  if (!row.modeRule || row.modeRulePosition === undefined) {
    return currentMode;
  }
  const match = row.modeRule.exec(lineText);
  return match ? match[row.modeRulePosition] : undefined;
}

function fieldsForRow(
  row: FixedWidthRowRule,
  lengthUnit: FixedWidthLengthUnit,
): FixedWidthField[] {
  let start = 0;
  return (row.fields ?? []).map((definition, index) => {
    const width = definition.length;
    const field = {
      name: row.name,
      fieldName: definition.name,
      fieldNumber: index + 1,
      type: definition.type,
      start,
      end: start + width,
      width,
      lengthUnit,
    };
    start += width;
    return field;
  });
}

export function projectFields({
  lineText,
  rowRules,
  currentMode,
  lengthUnit = "utf16",
}: ProjectFieldsRequest): FixedWidthProjection {
  const row = findApplicableRow(lineText, rowRules, currentMode);
  if (!row) {
    return { fields: [], mode: currentMode, lengthUnit };
  }
  return {
    rowName: row.name,
    fields: fieldsForRow(row, lengthUnit),
    mode: updateMode(row, lineText, currentMode),
    lengthUnit,
  };
}
