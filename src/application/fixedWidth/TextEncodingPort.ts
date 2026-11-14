import type { ByteOffsetMap } from "../../domain/fixedWidth/byteOffsets";

export type TextEncodingFailureCode =
  | "UNSUPPORTED_ENCODING"
  | "ENCODING_FAILED"
  | "ENCODING_MISMATCH";

export type TextEncodingResult =
  | { ok: true; lines: readonly ByteOffsetMap[] }
  | { ok: false; code: TextEncodingFailureCode };

/** VS Code や具体的なコーデックに依存しない、行位置投影用のポート。 */
export interface TextEncodingPort {
  mapLines(
    lines: readonly string[],
    encoding: string,
  ): Promise<TextEncodingResult>;
}
