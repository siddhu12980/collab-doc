import { Extension } from "@tiptap/core";
import { Decoration, DecorationSet } from "prosemirror-view";

export const Cursors = Extension.create({
  name: "cursors",

  addOptions() {
    return {
      selections: [],
    };
  },

  addProseMirrorPlugins() {
    return [
      {
        props: {
          decorations: (state) => {
            const { selections } = this.options;
            const decorations = selections.map((selection: any) => {
              const decors = [];
              const { from, to, clientID, color, name } = selection;

              // Cursor Widget
              const cursorElement = document.createElement("span");
              cursorElement.className = `cursor client-${clientID}`;
              cursorElement.style.borderLeft = `2px solid ${color}`;
              cursorElement.setAttribute("data-name", name);

              decors.push(Decoration.widget(to, cursorElement));

              // Inline Selection Decoration
              if (from !== to) {
                decors.push(
                  Decoration.inline(from, to, {
                    class: `selection client-${clientID}`,
                    style: `background-color: ${color}33;`, // Transparent background
                  })
                );
              }

              return decors;
            });

            return DecorationSet.create(state.doc, decorations.flat());
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      updateCursors:
        (selections: any) =>
        ({ tr, dispatch }: { tr: any; dispatch: any }) => {
          if (dispatch) {
            this.options.selections = selections;
            dispatch(tr.setMeta("addToHistory", false));
          }
          return true;
        },
    };
  },
});
