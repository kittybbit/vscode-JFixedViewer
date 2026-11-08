import * as assert from "assert";
import {
  CharacterizationHost,
  FakeEditor,
} from "./support/characterizationHost";

const commandId = "vscode-JFixedViewer.FiletypePicker";
const zenginAccount = "全銀協規定形式/振込入金通知(A)";
const zenginTransfer = "全銀協規定形式/入出金取引明細";
const zenginGeneralTransfer = "全銀協規定形式/総合振込";
const zenginLoanCalculation = "全銀協規定形式/借入金計算書";
const zenginForeignCurrency = "全銀協規定形式/外貨預金入出金取引明細";
const jpxFourPrices = "JPX/四本値(デリバティブ)";
const clearType = "なし/なし";

function header(mode: string): string {
  return `1${"0".repeat(61)}${mode}`;
}

function foreignCurrencyHeader(mode: string): string {
  return `1${"0".repeat(92)}${mode}`;
}

function optionsForLine(editor: FakeEditor, line: number) {
  const call = editor.decorationCalls.at(-1);
  return (
    call?.options.filter((option) => option.range.start.line === line) ?? []
  );
}

function rowNames(editor: FakeEditor, line: number): string[] {
  return optionsForLine(editor, line).map((option) => {
    const match = option.hoverMessage?.value.match(/^\*\*(.*?)\*\*/u);
    return match?.[1] ?? "";
  });
}

function hasRow(editor: FakeEditor, line: number, name: string): boolean {
  return rowNames(editor, line).includes(name);
}

suite("固定長表示の現行挙動", () => {
  let host: CharacterizationHost;

  setup(() => {
    host = new CharacterizationHost();
    host.start();
  });

  teardown(() => {
    host.dispose();
  });

  test("組み込みの全銀と JPX の定義、空白行、不一致行、ホバー、UTF-16 範囲を保つ", async () => {
    const zengin = host.createEditor("50200001-a.txt", [
      "1😀",
      "   ",
      "不一致の行",
      "2😀",
      "8",
      "9",
    ]);
    host.setActiveEditor(zengin);
    await host.chooseFileType(zenginAccount);

    const decorationStyle = host.decorationTypes[0].options as {
      after: {
        contentText: string;
        borderColor: { id: string };
        border: string;
      };
      isWholeLine: boolean;
    };
    assert.strictEqual(decorationStyle.after.contentText, "");
    assert.strictEqual(
      decorationStyle.after.borderColor.id,
      "editor.selectionBackground",
    );
    assert.strictEqual(decorationStyle.after.border, "0.1em solid");
    assert.strictEqual(decorationStyle.isWholeLine, false);

    assert.strictEqual(host.registeredCommands.has(commandId), true);
    assert.deepStrictEqual(rowNames(zengin, 0).slice(0, 1), ["ヘッダー"]);
    assert.deepStrictEqual(rowNames(zengin, 3).slice(0, 1), ["データ"]);
    assert.deepStrictEqual(rowNames(zengin, 4).slice(0, 1), ["トレーラ"]);
    assert.deepStrictEqual(rowNames(zengin, 5).slice(0, 1), ["エンド"]);
    assert.deepStrictEqual(optionsForLine(zengin, 1), []);
    assert.deepStrictEqual(optionsForLine(zengin, 2), []);

    const dataFields = optionsForLine(zengin, 3);
    assert.deepStrictEqual(
      {
        start: dataFields[1].range.start.character,
        end: dataFields[1].range.end.character,
      },
      { start: 1, end: 7 },
    );
    assert.strictEqual(zengin.document.lineAt(3).text.length, 3);
    assert.strictEqual(
      dataFields[1].hoverMessage?.value,
      "**データ**  \n位置: 2 - 7 (6桁)",
    );
    assert.strictEqual(dataFields[1].hoverMessage?.isTrusted, true);
    assert.strictEqual(dataFields.at(-1)?.range.end.character, 200);

    const jpx = host.createEditor("jpx.txt", ["2😀"]);
    host.setActiveEditor(jpx);
    await host.chooseFileType(jpxFourPrices);
    assert.strictEqual(hasRow(jpx, 0, "レコード"), true);
    assert.strictEqual(
      optionsForLine(jpx, 0)[1].hoverMessage?.value,
      "**レコード**  \n位置: 2 - 4 (3桁)",
    );

    const loan = host.createEditor("50200231-loan.txt", ["230"]);
    host.setActiveEditor(loan);
    await host.chooseFileType(zenginLoanCalculation);
    assert.strictEqual(hasRow(loan, 0, "データ(商業手形割引〔内訳〕)"), true);
    assert.strictEqual(hasRow(loan, 0, "データ(商業手形割引〔合計〕)"), false);
  });

  test("先に一致する行を選び、モードを共有し、不一致時にリセットする", async () => {
    const normal = `2${"x".repeat(112)} `;
    const edi = `2${"x".repeat(112)}Y`;
    const general = host.createEditor("50200121-general.txt", [normal, edi]);
    host.setActiveEditor(general);
    await host.chooseFileType(zenginGeneralTransfer);
    assert.strictEqual(hasRow(general, 0, "データ"), true);
    assert.strictEqual(hasRow(general, 0, "データ(EDI)"), false);
    assert.strictEqual(hasRow(general, 1, "データ(EDI)"), true);
    assert.strictEqual(hasRow(general, 1, "データ"), false);

    const first = host.createEditor("50200003-first.txt", [header("5"), "2"]);
    host.setActiveEditor(first);
    await host.chooseFileType(zenginTransfer);
    const firstType = first.decorationCalls.at(-1)?.type;
    assert.strictEqual(
      hasRow(first, 1, "データ(通知預金・定期預金・積立定期預金)"),
      true,
    );

    const sameType = host.createEditor("50200003-second.txt", ["2"]);
    host.setActiveEditor(sameType);
    await host.chooseFileType(zenginTransfer);
    assert.strictEqual(
      hasRow(sameType, 0, "データ(通知預金・定期預金・積立定期預金)"),
      true,
    );
    const sameTypeHandleBeforeForeign = sameType.decorationCalls.at(-1)?.type;

    const otherType = host.createEditor("50200009-foreign.txt", [
      foreignCurrencyHeader("1"),
      "201",
    ]);
    host.setActiveEditor(otherType);
    await host.chooseFileType(zenginForeignCurrency);
    assert.strictEqual(
      hasRow(
        otherType,
        1,
        "データ(本体情報(1)：普通預金･当座預金･貯蓄預金の場合)",
      ),
      true,
    );
    const beforeSwitch = host.reporters[0].events.length;
    host.setActiveEditor(sameType);
    assert.strictEqual(
      hasRow(sameType, 0, "データ(通知預金・定期預金・積立定期預金)"),
      true,
    );
    const sameTypeHeadHandle = sameType.decorationCalls.at(-1)?.type;
    assert.strictEqual(sameTypeHandleBeforeForeign?.disposeCount, 1);
    assert.strictEqual(host.reporters[0].events.length, beforeSwitch);

    host.setActiveEditor(first);
    assert.strictEqual(sameTypeHeadHandle?.disposeCount, 1);
    assert.strictEqual(firstType?.disposeCount, 0);
    assert.strictEqual(first.decorationCalls.length, 2);
    assert.strictEqual(
      hasRow(first, 1, "データ(通知預金・定期預金・積立定期預金)"),
      true,
    );
    assert.strictEqual(host.reporters[0].events.length, beforeSwitch);

    const badHeader = `1${"0".repeat(61)}X`;
    const reset = host.createEditor("50200003-reset.txt", [badHeader, "2"]);
    host.setActiveEditor(reset);
    await host.chooseFileType(zenginTransfer);
    assert.strictEqual(hasRow(reset, 0, "ヘッダー"), true);
    assert.deepStrictEqual(optionsForLine(reset, 1), []);

    const update = host.createEditor("50200003-updated.txt", [
      header("1"),
      "2",
    ]);
    host.setActiveEditor(update);
    await host.chooseFileType(zenginTransfer);
    assert.strictEqual(
      hasRow(update, 1, "データ(普通預金・当座預金・貯蓄預金)"),
      true,
    );
  });

  test("エディターがない選択、キャンセル、テレメトリの順序と安全な値を保つ", async () => {
    await host.chooseFileType(zenginAccount);
    const reporter = host.reporters[0];
    assert.strictEqual(reporter.connectionString, "sdd-characterization-dummy");
    assert.deepStrictEqual(
      reporter.events.map((event) => event.name),
      ["ext.activate", "ext.decorate"],
    );
    assert.deepStrictEqual(reporter.events[0].properties, {
      development: "false",
    });
    assert.deepStrictEqual(reporter.events[1].properties, {
      file_type: "furikomi_nyuukin_tuuchi_a@zengin",
      development: "false",
    });
    assert.strictEqual(host.decorationTypes.length, 0);

    const editor = host.createEditor("50200001.txt", ["2"]);
    host.setActiveEditor(editor);
    await host.chooseFileType(zenginAccount);
    const originalType = editor.decorationCalls.at(-1)?.type;
    const callCount = editor.decorationCalls.length;
    const eventsBeforeCancel = reporter.events.length;
    await host.chooseFileType(undefined);
    assert.strictEqual(editor.decorationCalls.length, callCount);
    assert.strictEqual(originalType?.disposeCount, 0);
    assert.strictEqual(reporter.events.length, eventsBeforeCancel + 1);
    assert.deepStrictEqual(reporter.events.at(-1), {
      name: "ext.decorate",
      properties: { file_type: "", development: "false" },
    });

    const replacementEditor = host.createEditor("50200001.txt", ["2"]);
    const eventsBeforeSwitch = reporter.events.length;
    host.setActiveEditor(replacementEditor);
    assert.strictEqual(originalType?.disposeCount, 1);
    assert.strictEqual(replacementEditor.decorationCalls.length, 1);
    assert.strictEqual(reporter.events.length, eventsBeforeSwitch);
  });

  test("空形式で装飾を解除し、同じ文書の再適用と破棄を保つ", async () => {
    const editor = host.createEditor("50200001.txt", ["2"]);
    host.setActiveEditor(editor);
    await host.chooseFileType(zenginAccount);
    const originalType = editor.decorationCalls.at(-1)?.type;
    assert.strictEqual(optionsForLine(editor, 0).length, 13);

    const eventsBeforeClear = host.reporters[0].events.length;
    await host.chooseFileType(clearType);
    assert.strictEqual(originalType?.disposeCount, 1);
    assert.deepStrictEqual(editor.decorationCalls.at(-1)?.options, []);
    assert.strictEqual(host.reporters[0].events.length, eventsBeforeClear + 1);
    assert.deepStrictEqual(host.reporters[0].events.at(-1), {
      name: "ext.decorate",
      properties: { file_type: "clear@clear", development: "false" },
    });

    const clearedType = editor.decorationCalls.at(-1)?.type;
    const reporter = host.reporters[0];
    const eventsBeforeSwitch = reporter.events.length;
    const replacementEditor = host.createEditor("50200001.txt", ["2"]);
    host.setActiveEditor(replacementEditor);
    assert.strictEqual(clearedType?.disposeCount, 1);
    assert.strictEqual(replacementEditor.decorationCalls.length, 1);
    assert.deepStrictEqual(replacementEditor.decorationCalls[0].options, []);
    assert.strictEqual(reporter.events.length, eventsBeforeSwitch);
    const replacementType = replacementEditor.decorationCalls[0].type;

    host.dispose();
    assert.strictEqual(clearedType?.disposeCount, 1);
    assert.strictEqual(replacementType.disposeCount, 1);
    assert.strictEqual(reporter.events.at(-1)?.name, "ext.deactivate");
    assert.deepStrictEqual(reporter.events.at(-1)?.properties, {
      development: "false",
    });
    assert.strictEqual(reporter.disposeCount, 1);
  });
});
