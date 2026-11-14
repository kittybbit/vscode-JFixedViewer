const decoderLabels: Readonly<Record<string, string>> = {
  utf8: "utf-8",
  utf8bom: "utf-8",
  utf16le: "utf-16le",
  utf16be: "utf-16be",
  shiftjis: "shift_jis",
};

const shiftJisSequences: Readonly<Record<string, readonly number[]>> = {
  あ: [0x82, 0xa0],
  ｱ: [0xb1],
};

export function encodeFakeText(
  text: string,
  encoding: string,
  replaceUnsupportedShiftJis: boolean,
): Uint8Array {
  if (encoding === "utf8" || encoding === "utf8bom") {
    return encodeUtf8(text, encoding === "utf8bom");
  }
  if (encoding === "utf16le" || encoding === "utf16be") {
    return encodeUtf16(text, encoding === "utf16le");
  }
  if (encoding === "shiftjis") {
    return encodeShiftJis(text, replaceUnsupportedShiftJis);
  }
  throw new Error("unsupported simulated encoding");
}

export function decodeFakeText(bytes: Uint8Array, encoding: string): string {
  const label = decoderLabels[encoding];
  if (!label) {
    throw new Error("unsupported simulated encoding");
  }
  return new TextDecoder(label).decode(bytes);
}

function encodeUtf8(text: string, withBom: boolean): Uint8Array {
  const bytes = new TextEncoder().encode(text);
  return withBom ? new Uint8Array([0xef, 0xbb, 0xbf, ...bytes]) : bytes;
}

function encodeUtf16(text: string, littleEndian: boolean): Uint8Array {
  const bytes = utf16CodeUnits(text, littleEndian);
  const bom = littleEndian ? [0xff, 0xfe] : [0xfe, 0xff];
  return new Uint8Array([...bom, ...bytes]);
}

function utf16CodeUnits(text: string, littleEndian: boolean): number[] {
  return Array.from({ length: text.length }, (_, index) =>
    encodeUtf16CodeUnit(text.charCodeAt(index), littleEndian),
  ).flat();
}

function encodeUtf16CodeUnit(unit: number, littleEndian: boolean): number[] {
  return littleEndian ? [unit & 0xff, unit >>> 8] : [unit >>> 8, unit & 0xff];
}

function encodeShiftJis(text: string, replaceUnsupported: boolean): Uint8Array {
  const bytes: number[] = [];
  for (const character of text) {
    bytes.push(...shiftJisCharacter(character, replaceUnsupported));
  }
  return new Uint8Array(bytes);
}

function shiftJisCharacter(
  character: string,
  replaceUnsupported: boolean,
): number[] {
  const known = shiftJisSequences[character];
  if (known) {
    return [...known];
  }
  const codePoint = character.codePointAt(0);
  if (codePoint !== undefined && codePoint < 0x80) {
    return [codePoint];
  }
  if (replaceUnsupported) {
    return [0x3f];
  }
  throw new Error("unsupported simulated Shift_JIS text");
}
