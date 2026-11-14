import * as assert from "assert";
import type {
  TextEncodingPort,
  TextEncodingResult,
} from "../application/fixedWidth/TextEncodingPort";
import { createFixedWidthDecoration } from "../application/fixedWidth/FixedWidthDecoration";
import { projectFields } from "../domain/fixedWidth/projectFields";
import { validateRecord } from "../domain/fixedWidth/validateRecord";
import { mapEncodedLineBoundaries } from "../infrastructure/encoding/encodedBoundaries";
import { encodeFakeText } from "./support/fakeTextEncoding";
import {
  byteDefinition,
  utf16CompatibilityDefinition,
} from "./support/encodingFixtures";

const byteFormatName = "試験/Shift_JIS";
const byteFormatType = "byte_test@zengin";
function byteMaps(lines: readonly string[]) {
  return mapEncodedLineBoundaries(
    encodeFakeText(`A${lines.join("\n")}`, "shiftjis", false),
    lines,
    "shiftjis",
  );
}
function utf16Bytes(text: string, littleEndian: boolean): Uint8Array {
  const bytes: number[] = littleEndian ? [0xff, 0xfe] : [0xfe, 0xff];
  bytes.push(
    ...Array.from({ length: text.length }, (_, index) =>
      utf16CodeUnitBytes(text.charCodeAt(index), littleEndian),
    ).flat(),
  );
  return new Uint8Array(bytes);
}
function utf16CodeUnitBytes(unit: number, littleEndian: boolean): number[] {
  return littleEndian ? [unit & 0xff, unit >>> 8] : [unit >>> 8, unit & 0xff];
}
function encodingResultPort(): TextEncodingPort & { calls: number } {
  return {
    calls: 0,
    async mapLines(lines): Promise<TextEncodingResult> {
      this.calls += 1;
      const mapped = byteMaps(lines);
      return mapped
        ? { ok: true, lines: mapped }
        : { ok: false, code: "ENCODING_MISMATCH" };
    },
  };
}

suite("文字コードとバイト境界", () => {
  test("UTF-8・UTF-8 BOM・UTF-16 LE/BE は生成 BOM を除き内容 U+FEFF を数える", () => {
    const line = "\uFEFFあ😀\uFEFF";
    const sentinel = `A${line}`;
    const utf8 = new TextEncoder().encode(sentinel);
    const utf8Bom = new Uint8Array([
      0xef,
      0xbb,
      0xbf,
      ...new TextEncoder().encode(sentinel),
    ]);
    const fixtures = [
      ["utf8", utf8, 13],
      ["utf8bom", utf8Bom, 13],
      ["utf16le", utf16Bytes(sentinel, true), 10],
      ["utf16be", utf16Bytes(sentinel, false), 10],
    ] as const;

    for (const [encoding, bytes, expectedLength] of fixtures) {
      const mapped = mapEncodedLineBoundaries(bytes, [line], encoding);
      assert.ok(mapped, `${encoding} should round-trip`);
      assert.strictEqual(mapped[0]?.byteLength, expectedLength);
      assert.strictEqual(mapped[0]?.byteToUtf16[0], 0);
      assert.strictEqual(mapped[0]?.byteToUtf16[expectedLength], line.length);
      if (encoding === "utf16le" || encoding === "utf16be") {
        assert.strictEqual(mapped[0]?.byteToUtf16[2], 1);
        assert.strictEqual(mapped[0]?.byteToUtf16[4], 2);
        assert.strictEqual(mapped[0]?.byteToUtf16[6], undefined);
        assert.strictEqual(mapped[0]?.byteToUtf16[8], 4);
      }
    }
  });

  test("複数行は LF 区切りで個別に境界化し、TextDecoderの不一致と例外を止める", () => {
    const lines = ["1あ", "2😀", "\uFEFF"];
    const bytes = new TextEncoder().encode(`A${lines.join("\n")}`);
    const mapped = mapEncodedLineBoundaries(bytes, lines, "utf8");
    assert.deepStrictEqual(
      mapped?.map(({ byteLength }) => byteLength),
      [4, 5, 3],
    );
    assert.deepStrictEqual(
      mapped?.map(({ byteToUtf16, byteLength }) => [
        byteToUtf16[0],
        byteToUtf16[byteLength],
      ]),
      [
        [0, 2],
        [0, 3],
        [0, 1],
      ],
    );
    assert.strictEqual(
      mapEncodedLineBoundaries(new Uint8Array([0x41, 0x42]), ["Z"], "shiftjis"),
      undefined,
    );
    assert.throws(() =>
      mapEncodedLineBoundaries(
        new Uint8Array([0x41, 0x82]),
        ["あ"],
        "shiftjis",
      ),
    );
  });

  test("Shift_JIS の全角文字と UTF-8 の補助文字は途中を境界にしない", () => {
    const shiftJis = mapEncodedLineBoundaries(
      new Uint8Array([0x41, 0x41, 0x82, 0xa0, 0x5a]),
      ["AあZ"],
      "shiftjis",
    );
    assert.ok(shiftJis);
    assert.strictEqual(shiftJis[0]?.byteLength, 4);
    assert.strictEqual(shiftJis[0]?.byteToUtf16[1], 1);
    assert.strictEqual(shiftJis[0]?.byteToUtf16[2], undefined);
    assert.strictEqual(shiftJis[0]?.byteToUtf16[3], 2);
    assert.strictEqual(shiftJis[0]?.byteToUtf16[4], 3);

    const utf8Bytes = new TextEncoder().encode("AA😀Z");
    const utf8 = mapEncodedLineBoundaries(utf8Bytes, ["A😀Z"], "utf8");
    assert.ok(utf8);
    assert.strictEqual(utf8[0]?.byteLength, 6);
    assert.strictEqual(utf8[0]?.byteToUtf16[1], 1);
    assert.strictEqual(utf8[0]?.byteToUtf16[2], undefined);
    assert.strictEqual(utf8[0]?.byteToUtf16[4], undefined);
    assert.strictEqual(utf8[0]?.byteToUtf16[5], 3);
  });

  test("byte 解析は論理位置と UTF-16 表示位置を分け、途中境界を描画しない", async () => {
    const port = encodingResultPort();
    const decoration = createFixedWidthDecoration(
      [
        {
          fileType: byteFormatType,
          name: byteFormatName,
          fileNamePattern: /.*/u,
          encoding: "shiftjis",
          lengthUnit: "byte",
          rows: [
            {
              name: "レコード",
              condition: /^A/u,
              fields: [
                { name: "ASCII", length: 1, type: "C" },
                { name: "不正境界の前半", length: 1, type: "C" },
                { name: "不正境界の後半", length: 1, type: "C" },
                { name: "末尾", length: 1, type: "C" },
              ],
            },
          ],
        },
      ],
      port,
    );
    const analysis = await decoration.analyze({
      fileType: byteFormatType,
      lines: [{ line: 0, text: "AあZ", isEmptyOrWhitespace: false }],
      validationEnabled: true,
      currentEncoding: "shiftjis",
    });

    assert.strictEqual(port.calls, 1);
    assert.deepStrictEqual(
      analysis.fields.map(({ start, end, displayStart, displayEnd }) => ({
        start,
        end,
        displayStart,
        displayEnd,
      })),
      [
        { start: 0, end: 1, displayStart: 0, displayEnd: 1 },
        { start: 3, end: 4, displayStart: 2, displayEnd: 3 },
      ],
    );
    assert.deepStrictEqual(
      analysis.issues.map(({ code, start, end }) => ({ code, start, end })),
      [
        { code: "INVALID_BYTE_BOUNDARY", start: 1, end: 2 },
        { code: "INVALID_BYTE_BOUNDARY", start: 1, end: 2 },
      ],
    );

    const unvalidated = await decoration.analyze({
      fileType: byteFormatType,
      lines: [{ line: 0, text: "AあZ", isEmptyOrWhitespace: false }],
      validationEnabled: false,
      currentEncoding: "shiftjis",
    });
    assert.deepStrictEqual(unvalidated.issues, []);
    assert.strictEqual(unvalidated.fields.length, 2);
  });

  test("byte の N 型診断は論理byte幅をUTF-16表示位置へ変換する", () => {
    const projection = projectFields({
      lineText: "あ",
      rowRules: [
        {
          name: "レコード",
          condition: /^/u,
          fields: [{ name: "数値", length: 2, type: "N" }],
        },
      ],
      currentMode: undefined,
      lengthUnit: "byte",
    });

    assert.deepStrictEqual(
      validateRecord("あ", projection, {
        byteLength: 2,
        byteToUtf16: [0, undefined, 1],
      }),
      [
        {
          code: "INVALID_TYPE",
          start: 0,
          end: 1,
          fieldName: "数値",
          fieldNumber: 1,
        },
      ],
    );
  });
});
