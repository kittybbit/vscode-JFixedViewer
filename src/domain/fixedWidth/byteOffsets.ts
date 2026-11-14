/** 行内のバイト境界と UTF-16 表示境界の対応。内容やコーデックは持たない。 */
export type ByteOffsetMap = {
  byteLength: number;
  /** 文字の途中は undefined。先頭と末尾を含む実在境界だけを保持する。 */
  byteToUtf16: readonly (number | undefined)[];
};

export type ByteRangeProjection = {
  start: number;
  end: number;
  startIsBoundary: boolean;
  endIsBoundary: boolean;
};

/** 文字途中の端点を、その文字全体を含む有効な UTF-16 範囲へ広げる。 */
export function projectByteRange(
  offsets: ByteOffsetMap,
  start: number,
  end: number,
): ByteRangeProjection {
  const boundedStart = Math.max(0, Math.min(start, offsets.byteLength));
  const boundedEnd = Math.max(boundedStart, Math.min(end, offsets.byteLength));
  return {
    start: floorBoundary(offsets, boundedStart),
    end: ceilBoundary(offsets, boundedEnd),
    startIsBoundary:
      start <= offsets.byteLength &&
      offsets.byteToUtf16[boundedStart] !== undefined,
    endIsBoundary:
      end > offsets.byteLength || offsets.byteToUtf16[boundedEnd] !== undefined,
  };
}

function floorBoundary(offsets: ByteOffsetMap, offset: number): number {
  for (let index = offset; index >= 0; index -= 1) {
    const mapped = offsets.byteToUtf16[index];
    if (mapped !== undefined) {
      return mapped;
    }
  }
  return 0;
}

function ceilBoundary(offsets: ByteOffsetMap, offset: number): number {
  for (let index = offset; index <= offsets.byteLength; index += 1) {
    const mapped = offsets.byteToUtf16[index];
    if (mapped !== undefined) {
      return mapped;
    }
  }
  return offsets.byteToUtf16[offsets.byteLength] ?? 0;
}
