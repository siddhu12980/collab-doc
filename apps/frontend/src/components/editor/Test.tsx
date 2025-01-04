import React, { useEffect, useRef, useState } from "react";
import { CRDT, Character } from "../../sync/sync";
import { set } from "lodash";

interface SyncEvent {
  type: "insert" | "delete";
  character: Character;
  sourceSiteId: string;
}

const Test = () => {
  const [crdt1] = useState(
    () => new CRDT(`site-${Math.random().toString(36).slice(2, 8)}`)
  );
  const [crdt2] = useState(
    () => new CRDT(`site-${Math.random().toString(36).slice(2, 8)}`)
  );

  const [text1, setText1] = useState("");
  const [text2, setText2] = useState("");

  const textareaRef1 = useRef<HTMLTextAreaElement>(null);
  const textareaRef2 = useRef<HTMLTextAreaElement>(null);

  const lastSelectionRef1 = useRef<{ start: number; end: number }>({
    start: 0,
    end: 0,
  });
  const lastSelectionRef2 = useRef<{ start: number; end: number }>({
    start: 0,
    end: 0,
  });

  const propagateEvent = (event: SyncEvent) => {
    console.log(`Event from ${event.sourceSiteId}:`, event);

    setTimeout(() => {
      if (event.sourceSiteId === crdt1.getID()) {
        if (event.type === "insert") {
          crdt2.integrate(event.character);
          setText2(crdt2.toString());
        } else {
          const state = crdt2.getState();
          const index = state.findIndex(
            (char) =>
              char.clock === event.character.clock &&
              char.siteId === event.character.siteId
          );
          if (index !== -1) {
            crdt2.delete(index);
            setText2(crdt2.toString());
          }
        }
      } else {
        // Event from site 2, apply to site 1
        if (event.type === "insert") {
          crdt1.integrate(event.character);
          setText1(crdt1.toString());
        } else {
          const state = crdt1.getState();
          const index = state.findIndex(
            (char) =>
              char.clock === event.character.clock &&
              char.siteId === event.character.siteId
          );
          if (index !== -1) {
            crdt1.delete(index);
            setText1(crdt1.toString());
          }
        }
      }
    }, 1000); // 100ms simulated network delay
  };

  const handleChange1 = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    const diff = findDiff(text1, newText);

    if (diff.type === "insert") {
      const char = crdt1.insert(diff.chars, diff.index);
      setText1(crdt1.toString());

      // Propagate insert event
      propagateEvent({
        type: "insert",
        character: char,
        sourceSiteId: crdt1.getID(),
      });
    } else if (diff.type === "delete") {
      const char = crdt1.delete(diff.index);
      setText1(crdt1.toString());

      if (char) {
        // Propagate delete event
        propagateEvent({
          type: "delete",
          character: char,
          sourceSiteId: crdt1.getID(),
        });
      }
    }
  };

  const handleChange2 = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    const diff = findDiff(text2, newText);

    console.log("Diff:", diff);

    if (diff.type === "insert") {
      const char = crdt2.insert(diff.chars, diff.index);
      setText2(crdt2.toString());

      // Propagate insert event
      propagateEvent({
        type: "insert",
        character: char,
        sourceSiteId: crdt2.getID(),
      });
    } else if (diff.type === "delete") {
      const char = crdt2.delete(diff.index);
      setText2(crdt2.toString());

      if (char) {
        // Propagate delete event
        propagateEvent({
          type: "delete",
          character: char,
          sourceSiteId: crdt2.getID(),
        });
      }
    }
  };

  // Test function for random insertions
  const createDummyInsertEvent = () => {
    const chars = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
    const index = Math.floor(text1.length / 2);
    const insertingChar = chars[Math.floor(Math.random() * chars.length)];

    console.log("Creating dummy insert:", insertingChar, "at", index);

    const char = crdt1.insert(insertingChar, index);
    setText1(crdt1.toString());

    const id = `${crdt1.getID()}-${crdt1.getClock()}`;

    const charcter = new Character(
      id,
      insertingChar,
      char.position,
      char.siteId,
      char.clock
    );

    charcter.property.bold = true;

    setTimeout(() => {
      // Propagate insert event
      propagateEvent({
        type: "insert",
        character: charcter,
        sourceSiteId: crdt1.getID(),
      });
    }, 3000);
  };

  return (
    <div className="flex flex-col gap-8 p-4">
      <div className="w-full max-w-2xl mx-auto">
        <div className="font-bold mb-2">Site 1</div>
        <textarea
          ref={textareaRef1}
          value={text1}
          onChange={handleChange1}
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
        <div className="mt-2 text-sm text-gray-500">
          Site ID: {crdt1.getID()}
        </div>
        <button
          onClick={() => {
            console.log("Site 1 CRDT State:", crdt1.getState());
          }}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg"
        >
          Log Site 1 State
        </button>
      </div>

      <div className="w-full max-w-2xl mx-auto">
        <div className="font-bold mb-2">Site 2</div>
        <textarea
          ref={textareaRef2}
          value={text2}
          onChange={handleChange2}
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
        <div className="mt-2 text-sm text-gray-500">
          Site ID: {crdt2.getID()}
        </div>
        <button
          onClick={() => {
            console.log("Site 2 CRDT State:", crdt2.getState());

            createDummyInsertEvent();
          }}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg"
        >
          Create Random Insert
        </button>
      </div>
    </div>
  );
};

const findDiff = (oldStr: string, newStr: string) => {
  let i = 0;
  const maxLen = Math.min(oldStr.length, newStr.length);

  while (i < maxLen && oldStr[i] === newStr[i]) i++;

  if (newStr.length > oldStr.length) {
    return {
      type: "insert" as const,
      index: i,
      chars: newStr[i],
    };
  } else {
    return {
      type: "delete" as const,
      index: i,
    };
  }
};

export default Test;
