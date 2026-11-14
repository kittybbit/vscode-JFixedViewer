import * as assert from "assert";
import { CharacterizationHost } from "./support/characterizationHost";
import { byteDefinition } from "./support/encodingFixtures";

const byteFormatName = "試験/Shift_JIS";
function deferFirstEncoding(
  host: CharacterizationHost,
  firstResult?: Uint8Array,
): { started: Promise<void>; release: () => void } {
  let notifyStarted: (() => void) | undefined;
  let releaseGate: (() => void) | undefined;
  let calls = 0;
  const started = new Promise<void>((resolve) => {
    notifyStarted = resolve;
  });
  const gate = new Promise<void>((resolve) => {
    releaseGate = resolve;
  });
  host.encodeTextHook = async () => {
    calls += 1;
    if (calls !== 1) {
      return undefined;
    }
    notifyStarted?.();
    await gate;
    return firstResult;
  };
  return {
    started,
    release: () => releaseGate?.(),
  };
}

suite("文字コード解析ライフサイクル", () => {
  test("古いcodec失敗は編集・設定・保存後の最新診断を消さない", async () => {
    const host = new CharacterizationHost({ zengin: byteDefinition() });
    const deferred = deferFirstEncoding(host, new Uint8Array([0x41]));
    let selection: Promise<void> | undefined;
    try {
      host.start();
      const uri = "file:///stale-encoding.txt";
      const editor = host.createEditor("stale-encoding.txt", ["AあZ"], uri);
      editor.document.encoding = "shiftjis";
      host.setActiveEditor(editor);
      selection = host.chooseFileType(byteFormatName);
      await deferred.started;

      host.changeDocument(editor, ["Aあ"]);
      await host.waitForPendingRender();
      host.setConfiguration(uri, { boundaryStyle: "marker" });
      await host.waitForAnalysis();
      host.saveDocument(editor);
      await host.waitForPendingRender();

      const currentCodes = host.diagnosticsFor(editor)?.map(({ code }) => code);
      assert.ok(currentCodes?.includes("INVALID_BYTE_BOUNDARY"));
      assert.strictEqual(host.encodeCallCount, 4);
      assert.strictEqual(host.decodeCallCount, 3);
      const marker = editor.decorationCalls
        .filter(({ options }) =>
          options.some((option) => option.hoverMessage !== undefined),
        )
        .at(-1)
        ?.options.find((option) => option.range.start.character === 0)
        ?.renderOptions?.after as { contentText?: string } | undefined;
      assert.strictEqual(marker?.contentText, "│");

      deferred.release();
      await selection;
      assert.deepStrictEqual(
        host.diagnosticsFor(editor)?.map(({ code }) => code),
        currentCodes,
      );
      assert.strictEqual(
        host.windowMessages.some((message) =>
          message.includes("安全に確認できません"),
        ),
        false,
      );
    } finally {
      deferred.release();
      await selection;
      host.dispose();
    }
  });

  test("文字コード変更・非表示・close・dispose後に古い解析を適用しない", async () => {
    for (const invalidation of [
      "encoding",
      "hide",
      "close",
      "dispose",
    ] as const) {
      const host = new CharacterizationHost({ zengin: byteDefinition() });
      const deferred = deferFirstEncoding(host);
      let selection: Promise<void> | undefined;
      try {
        host.start();
        const editor = host.createEditor(`${invalidation}.txt`, ["AあZ"]);
        editor.document.encoding = "shiftjis";
        host.setActiveEditor(editor);
        selection = host.chooseFileType(byteFormatName);
        await deferred.started;

        if (invalidation === "encoding") {
          host.setDocumentEncoding(editor, "utf8");
        } else if (invalidation === "hide") {
          host.setVisibleEditors([]);
        } else if (invalidation === "close") {
          host.closeDocument(editor);
        } else {
          host.dispose();
        }

        deferred.release();
        await selection;
        assert.strictEqual(
          editor.decorationCalls.some(({ options }) =>
            options.some((option) => option.hoverMessage !== undefined),
          ),
          false,
          `${invalidation}後は古い項目表示を適用しない`,
        );
        assert.deepStrictEqual(host.diagnosticsFor(editor), undefined);
      } finally {
        deferred.release();
        await selection;
        host.dispose();
      }
    }
  });
});
