import React, { useRef, useState } from "react";
import { CRDT, Character } from "../../sync/sync";

interface SyncEvent {
  type: "insert" | "delete";
  character: Character;
  sourceSiteId: string;
}

interface SelectionState {
  start: number;
  end: number;
}

const Test = () => {
  // Initialize CRDTs with unique site IDs
  const [crdt1] = useState(() => CRDT.getInstance("site1"));
  const [crdt2] = useState(() => CRDT.getInstance("site2"));

  const [text1, setText1] = useState("");

  const [text2, setText2] = useState("");

  const [networkDelay] = useState(1000); // Configurable network delay

  const textareaRef1 = useRef<HTMLTextAreaElement>(null);

  const textareaRef2 = useRef<HTMLTextAreaElement>(null);

  const lastSelectionRef1 = useRef<SelectionState>({ start: 0, end: 0 });

  const lastSelectionRef2 = useRef<SelectionState>({ start: 0, end: 0 });


  const findTextDiff = (oldStr: string, newStr: string) => {
    // If strings are equal, no changes
    if (oldStr === newStr) return null;

    let i = 0;
    const minLen = Math.min(oldStr.length, newStr.length);

    // Find the first different character
    while (i < minLen && oldStr[i] === newStr[i]) i++;

    // Handle insertions
    if (newStr.length > oldStr.length) {
      return {
        type: "insert" as const,
        index: i,
        chars: newStr[i],
      };
    }

    // Handle deletions
    if (newStr.length < oldStr.length) {
      return {
        type: "delete" as const,
        index: i,
      };
    }

    // If lengths are equal but strings are different,
    // handle as a deletion (the subsequent change will handle the insertion)
    return {
      type: "delete" as const,
      index: i,
    };
  };

  const handleTextChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
    crdt: CRDT,
    setText: React.Dispatch<React.SetStateAction<string>>,
    currentText: string
  ) => {

    const newText = e.target.value;

    // Early return if no actual change
    if (newText === currentText) return;

    const diff = findTextDiff(currentText, newText);
    if (!diff) return;

    // Handle the change locally first
    if (diff.type === "insert") {
      const char = crdt.insert(diff.chars, diff.index);
      // Update local state immediately
      setText(crdt.toString());
      // Then propagate to other site
      propagateEvent({
        type: "insert",
        character: char,
        sourceSiteId: crdt.getID(),
      });
    } else if (diff.type === "delete") {
      const char = crdt.delete(diff.index);
      if (char) {
        // Update local state immediately
        setText(crdt.toString());
        // Then propagate to other site
        propagateEvent({
          type: "delete",
          character: char,
          sourceSiteId: crdt.getID(),
        });
      }
    }
  };

  const propagateEvent = (event: SyncEvent) => {
    console.log(`Propagating event from ${event.sourceSiteId}:`, event);

    setTimeout(() => {

      const targetCRDT = event.sourceSiteId === crdt1.getID() ? crdt2 : crdt1;
      const setTargetText =
        event.sourceSiteId === crdt1.getID() ? setText2 : setText1;

      if (event.type === "insert") {
        const index = targetCRDT.integrate(event.character);
        // Only update text if integration was successful
        if (index !== -1) {
          setTargetText(targetCRDT.toString());
        }
      } else if (event.type === "delete") {
        const state = targetCRDT.getState();
        const index = state.findIndex(
          (char) =>
            char.clock === event.character.clock &&
            char.siteId === event.character.siteId
        );
        if (index !== -1) {
          targetCRDT.delete(index);
          setTargetText(targetCRDT.toString());
        }
      }
    }, networkDelay);
  };

  const createRandomInsert = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const index = Math.floor(Math.random() * (text1.length + 1));
    const char = chars[Math.floor(Math.random() * chars.length)];

    console.log(`Creating random insert: '${char}' at index ${index}`);

    const character = crdt1.insert(char, index);
    setText1(crdt1.toString());

    setTimeout(() => {
      propagateEvent({
        type: "insert",
        character: {
          ...character,
          properties: {
            bold: Math.random() > 0.5,
            italic: Math.random() > 0.5,
          },
        },
        sourceSiteId: crdt1.getID(),
      });
    }, 5000);
  };

  return (
    <div className="flex flex-col gap-8 p-4">
      <div className="w-full max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-2">
          <div className="font-bold">{crdt1.getID()}</div>
          <div className="text-sm text-gray-500">ID: {crdt1.getID()}</div>
        </div>
        <textarea
          ref={textareaRef1}
          value={text1}
          onChange={(e) => handleTextChange(e, crdt1, setText1, text1)}
          onSelect={(e) => {
            const target = e.target as HTMLTextAreaElement;
            lastSelectionRef1.current = {
              start: target.selectionStart,
              end: target.selectionEnd,
            };
          }}
          className="w-full h-64 p-4 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          placeholder="Start typing in Site 1..."
        />
        <button
          onClick={() => console.log("Site 1 State:", crdt1.getState())}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Log State
        </button>
      </div>

      <div className="w-full max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-2">
          <div className="font-bold">{crdt2.getID()}</div>
          <div className="text-sm text-gray-500">ID: {crdt2.getID()}</div>
        </div>
        <textarea
          ref={textareaRef2}
          value={text2}
          onChange={(e) => handleTextChange(e, crdt2, setText2, text2)}
          onSelect={(e) => {
            const target = e.target as HTMLTextAreaElement;
            lastSelectionRef2.current = {
              start: target.selectionStart,
              end: target.selectionEnd,
            };
          }}
          className="w-full h-64 p-4 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          placeholder="Start typing in Site 2..."
        />
        <button
          onClick={createRandomInsert}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Insert Random Character
        </button>
      </div>
    </div>
  );
};

export default Test;
