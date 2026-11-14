import type { ByteOffsetMap } from "../../domain/fixedWidth/byteOffsets";

const decoderLabels = new Map<string, string>([
  ["utf8", "utf-8"],
  ["utf8bom", "utf-8"],
  ["utf16le", "utf-16le"],
  ["utf16be", "utf-16be"],
  ["shiftjis", "shift_jis"],
]);

const generatedBoms = new Map<string, readonly number[]>([
  ["utf8bom", [0xef, 0xbb, 0xbf]],
  ["utf16le", [0xff, 0xfe]],
  ["utf16be", [0xfe, 0xff]],
]);

type ProjectLineInput = {
  line: string;
  textStart: number;
  byteToUtf16: readonly (number | undefined)[];
  utf16ToByte: readonly (number | undefined)[];
};

type StreamingDecoder = ReturnType<typeof createDecoder>;
type DecodeState = {
  text: string;
  byteToUtf16: (number | undefined)[];
};

/**
 * エンコード済みの sentinel + 行スナップショットを一度だけ streaming decode し、
 * 実在する文字境界だけを各行のバイト位置へ射影する。
 */
export function mapEncodedLineBoundaries(
  bytes: Uint8Array,
  lines: readonly string[],
  encoding: string,
): readonly ByteOffsetMap[] | undefined {
  const label = decoderLabels.get(encoding);
  if (!label) {
    return undefined;
  }
  const payload = bytes.subarray(generatedBomLength(bytes, encoding));
  const expectedText = `A${lines.join("\n")}`;
  const byteToUtf16 = decodeByteBoundaries(payload, label, expectedText);
  if (!byteToUtf16) {
    return undefined;
  }
  const utf16ToByte = reverseBoundaries(byteToUtf16, expectedText.length);
  return projectLines(lines, byteToUtf16, utf16ToByte);
}

function generatedBomLength(bytes: Uint8Array, encoding: string): number {
  const bom = generatedBoms.get(encoding);
  if (!bom || !bomMatches(bytes, bom)) {
    return 0;
  }
  return bom.length;
}

function bomMatches(bytes: Uint8Array, bom: readonly number[]): boolean {
  return bom.every((byte, index) => bytes[index] === byte);
}

function decodeByteBoundaries(
  payload: Uint8Array,
  label: string,
  expectedText: string,
): (number | undefined)[] | undefined {
  const decoder = createDecoder(label);
  const byteToUtf16: (number | undefined)[] = new Array(
    payload.length + 1,
  ).fill(undefined);
  byteToUtf16[0] = 0;
  const decodedText = decodeStream(payload, decoder, byteToUtf16);
  if (decodedText !== expectedText) {
    return undefined;
  }
  byteToUtf16[payload.length] = decodedText.length;
  return byteToUtf16;
}

function createDecoder(label: string) {
  return new TextDecoder(label, { fatal: true, ignoreBOM: true });
}

function decodeStream(
  payload: Uint8Array,
  decoder: StreamingDecoder,
  byteToUtf16: (number | undefined)[],
): string {
  const state: DecodeState = { text: "", byteToUtf16 };
  for (let offset = 0; offset < payload.length; offset += 1) {
    const decoded = decodeNextByte(payload, offset, decoder);
    appendDecodedChunk(state, offset, decoded);
  }
  return state.text + decoder.decode();
}

function decodeNextByte(
  payload: Uint8Array,
  offset: number,
  decoder: StreamingDecoder,
): string {
  return decoder.decode(payload.subarray(offset, offset + 1), {
    stream: true,
  });
}

function appendDecodedChunk(
  state: DecodeState,
  offset: number,
  decoded: string,
): void {
  state.text += decoded;
  if (decoded.length > 0) {
    state.byteToUtf16[offset + 1] = state.text.length;
  }
}

function reverseBoundaries(
  byteToUtf16: readonly (number | undefined)[],
  textLength: number,
): (number | undefined)[] {
  const utf16ToByte: (number | undefined)[] = new Array(textLength + 1).fill(
    undefined,
  );
  for (let byteOffset = 0; byteOffset < byteToUtf16.length; byteOffset += 1) {
    const utf16Offset = byteToUtf16[byteOffset];
    if (utf16Offset !== undefined) {
      utf16ToByte[utf16Offset] = byteOffset;
    }
  }
  return utf16ToByte;
}

function projectLines(
  lines: readonly string[],
  byteToUtf16: readonly (number | undefined)[],
  utf16ToByte: readonly (number | undefined)[],
): readonly ByteOffsetMap[] | undefined {
  const result: ByteOffsetMap[] = [];
  let textStart = 1;
  for (const line of lines) {
    const mapped = projectLine({ line, textStart, byteToUtf16, utf16ToByte });
    if (!mapped) {
      return undefined;
    }
    result.push(mapped);
    textStart += line.length + 1;
  }
  return result;
}

function projectLine({
  line,
  textStart,
  byteToUtf16,
  utf16ToByte,
}: ProjectLineInput): ByteOffsetMap | undefined {
  const byteStart = utf16ToByte[textStart];
  const byteEnd = utf16ToByte[textStart + line.length];
  if (byteStart === undefined || byteEnd === undefined) {
    return undefined;
  }
  return {
    byteLength: byteEnd - byteStart,
    byteToUtf16: lineBoundaries({
      byteStart,
      byteEnd,
      textStart,
      byteToUtf16,
    }),
  };
}

function lineBoundaries({
  byteStart,
  byteEnd,
  textStart,
  byteToUtf16,
}: Omit<ProjectLineInput, "line" | "utf16ToByte"> & {
  byteStart: number;
  byteEnd: number;
}): (number | undefined)[] {
  const boundaries: (number | undefined)[] = new Array(
    byteEnd - byteStart + 1,
  ).fill(undefined);
  for (let byteOffset = byteStart; byteOffset <= byteEnd; byteOffset += 1) {
    const utf16Offset = byteToUtf16[byteOffset];
    if (utf16Offset !== undefined) {
      boundaries[byteOffset - byteStart] = utf16Offset - textStart;
    }
  }
  return boundaries;
}
