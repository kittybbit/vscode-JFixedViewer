import * as vscode from "vscode";
import type {
  TextEncodingPort,
  TextEncodingResult,
} from "../../application/fixedWidth/TextEncodingPort";
import type { ByteOffsetMap } from "../../domain/fixedWidth/byteOffsets";
import { mapEncodedLineBoundaries } from "./encodedBoundaries";

const supportedEncodings = new Set([
  "utf8",
  "utf8bom",
  "utf16le",
  "utf16be",
  "shiftjis",
]);

/** VS Code の全量変換 API と標準 TextDecoder の境界を結ぶ。 */
export class VscodeTextEncodingAdapter implements TextEncodingPort {
  public async mapLines(
    lines: readonly string[],
    encoding: string,
  ): Promise<TextEncodingResult> {
    if (!supportedEncodings.has(encoding)) {
      return { ok: false, code: "UNSUPPORTED_ENCODING" };
    }
    return this.mapSupportedLines(lines, encoding);
  }

  private async mapSupportedLines(
    lines: readonly string[],
    encoding: string,
  ): Promise<TextEncodingResult> {
    try {
      const snapshot = `A${lines.join("\n")}`;
      const bytes = await vscode.workspace.encode(snapshot, { encoding });
      const decoded = await vscode.workspace.decode(bytes, { encoding });
      if (decoded !== snapshot) {
        return { ok: false, code: "ENCODING_MISMATCH" };
      }
      const lineOffsets = mapEncodedLineBoundaries(bytes, lines, encoding);
      return this.resultForBoundaries(lineOffsets);
    } catch {
      return { ok: false, code: "ENCODING_FAILED" };
    }
  }

  private resultForBoundaries(
    lines: readonly ByteOffsetMap[] | undefined,
  ): TextEncodingResult {
    return lines
      ? { ok: true, lines }
      : { ok: false, code: "ENCODING_MISMATCH" };
  }
}
