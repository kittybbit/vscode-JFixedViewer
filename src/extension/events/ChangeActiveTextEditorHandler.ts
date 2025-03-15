import { TextEditor } from "vscode";
import { Extension } from "../Extension";

export const changeActiveTextEditorHandler = (
  editor: TextEditor | undefined,
) => {
  if (editor === undefined) {
    return;
  }
  Extension.getTextDecorator(editor)?.decorate();
};
