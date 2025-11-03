import { TextEditor } from "vscode";
import { Extension } from "../Extension";

export const changeActiveTextEditorHandler =
  (extension: Extension) => (editor: TextEditor | undefined) => {
    if (editor === undefined) {
      return;
    }
    extension.getTextDecorator(editor)?.decorate();
  };
