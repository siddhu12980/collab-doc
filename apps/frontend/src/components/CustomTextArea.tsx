import React, { useEffect, useRef, useState } from "react";
import { User } from "../types/user";
import { calculateCursorPosition } from "../utils/cursor";

const currentUser: User = {
  id: "1",
  name: "You",
  color: "#2563eb",
  position: 0,
};

const secondUser: User = {
  id: "2",
  name: "Alice",
  color: "#dc2626",
  position: 0,
};

export default function CustomTextArea() {
  const [text, setText] = useState("");
  const [users, setUsers] = useState<User[]>([currentUser, secondUser]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    setUsers((prev) =>
      prev.map((user) =>
        user.id === currentUser.id
          ? { ...user, position: target.selectionStart }
          : user
      )
    );
  };

  useEffect(() => {
    const positions = [0, 5, 10, 15, 20, 25];
    let currentIndex = 0;

    const interval = setInterval(() => {
      setUsers((prev) =>
        prev.map((user) =>
          user.id === secondUser.id
            ? { ...user, position: positions[currentIndex] }
            : user
        )
      );
      currentIndex = (currentIndex + 1) % positions.length;
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // return (
  //   <div className="w-full max-w-2xl">
  //     <div className="bg-white rounded-lg shadow-md p-4">
  //       <div ref={containerRef} className="relative">

  //         <textarea
  //           ref={textareaRef}
  //           value={text}
  //           onChange={handleChange}
  //           onSelect={handleSelect}
  //           className="w-full h-48 p-3 border rounded font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
  //           placeholder="Start typing..."
  //         />

  //         {users.map(user => (
  //           <Cursor
  //             key={user.id}
  //             user={user}
  //             textareaRef={textareaRef}
  //             containerRef={containerRef}
  //           />
  //         ))}
  //       </div>
  //     </div>
  //   </div>
  // );

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">Connected Users:</h2>

          <div className="flex flex-wrap gap-2">
            {users.map((user) => (
              <span
                key={user.id}
                className="px-3 py-1 rounded-full text-sm"
                style={{ backgroundColor: user.color, color: "#fff" }}
              >
                {user.name}
              </span>
            ))}
          </div>

          <button
            onClick={() => {
              console.log("COntainer ref is", containerRef.current);
              console.log("Text area ref is", textareaRef.current);

              //cursor position

              const cursorPosition = textareaRef.current!.selectionStart;

              console.log(
                "Cursor position",
                textareaRef.current?.offsetHeight,
                textareaRef.current?.offsetWidth
              );
            }}
          >
            Set Text
          </button>
        </div>

        <div className="relative" ref={containerRef}>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onSelect={handleSelect}
            className="w-full h-64 p-4 border rounded-lg font-mono resize-none"
            placeholder="Start typing..."
          />

          {users.map((user) => {
            const { top, left } = calculateCursorPosition(
              user.position,
              textareaRef.current,
              containerRef.current
            );

            console.log("Top is", top, left);

            return (
              <div
                key={user.id}
                className="absolute pointer-events-none"
                style={{
                  left: `${left}px`,
                  top: `${top}px`,
                  color: user.color,
                }}
              >
                <div className="relative">
                  <span className="absolute -top-5 whitespace-nowrap text-xs">
                    {user.name}
                  </span>
                  <div
                    className="w-0.5 h-5 animate-pulse"
                    style={{ backgroundColor: user.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
