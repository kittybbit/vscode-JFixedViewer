export type FixedWidthRowRule = {
  name: string;
  condition: RegExp;
  modeRule?: RegExp;
  modeRulePosition?: number;
  mode?: RegExp;
  columns: number[];
};

export type FixedWidthDefinition = {
  fileType: string;
  name: string;
  fileNamePattern: RegExp;
  rows: FixedWidthRowRule[];
};

export type FixedWidthField = {
  name: string;
  start: number;
  end: number;
  width: number;
};

export type FixedWidthProjection = {
  rowName?: string;
  fields: FixedWidthField[];
  mode: string | undefined;
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

function fieldsForRow(row: FixedWidthRowRule): FixedWidthField[] {
  let start = 0;
  return row.columns.map((width) => {
    const field = { name: row.name, start, end: start + width, width };
    start += width;
    return field;
  });
}

export function projectFields(
  lineText: string,
  rowRules: readonly FixedWidthRowRule[],
  currentMode: string | undefined,
): FixedWidthProjection {
  const row = findApplicableRow(lineText, rowRules, currentMode);
  if (!row) {
    return { fields: [], mode: currentMode };
  }
  return {
    rowName: row.name,
    fields: fieldsForRow(row),
    mode: updateMode(row, lineText, currentMode),
  };
}
