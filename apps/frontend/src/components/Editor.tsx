import React, { useEffect, useRef, useState } from "react";
import { User, EditorState, EditorMessage } from "../types/editor";
import { getRandomColor } from "../utils/colors";
import { calculateCursorPosition } from "../utils/cursor";
import { WS_URL } from "../config/constants";


export default function Editor() {
  const [state, setState] = useState<EditorState>({
    content: "",
    users: [],
  });

  const containerRef = useRef<HTMLDivElement>(null);

  const [currentUser] = useState<User>({
    id: crypto.randomUUID(),
    name: `User-${Math.floor(Math.random() * 1000)}`,
    color: getRandomColor(),
    position: 0,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "join",
          user: currentUser,
        })
      );
    };

    ws.onmessage = (event) => {
      const message: EditorMessage = JSON.parse(event.data);

      switch (message.type) {
        case "content":
          setState((prev) => ({
            ...prev,
            content: message.content,
          }));
          break;
        case "cursor":
          setState((prev) => ({
            ...prev,
            users: prev.users.map((user) =>
              user.id === message.userId
                ? { ...user, position: message.position }
                : user
            ),
          }));
          break;
        case "join":
          setState((prev) => ({
            ...prev,
            users: [...prev.users, message.user],
          }));
          break;
        case "leave":
          setState((prev) => ({
            ...prev,
            users: prev.users.filter((user) => user.id !== message.userId),
          }));
          break;
      }
    };

    return () => {
      ws.close();
    };
  }, [currentUser]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setState((prev) => ({ ...prev, content: newContent }));

    wsRef.current?.send(
      JSON.stringify({
        type: "content",
        content: newContent,
        userId: currentUser.id,
      })
    );
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const position = e.currentTarget.selectionStart;
    wsRef.current?.send(
      JSON.stringify({
        type: "cursor",
        position,
        userId: currentUser.id,
      })
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">Connected Users:</h2>
          <div className="flex flex-wrap gap-2">
            {state.users.map((user) => (
              <span
                key={user.id}
                className="px-3 py-1 rounded-full text-sm"
                style={{ backgroundColor: user.color, color: "#fff" }}
              >
                {user.name}
              </span>
            ))}
          </div>
        </div>

        <div className="relative" ref={containerRef}>
          <textarea
            ref={textareaRef}
            value={state.content}
            onChange={handleChange}
            onSelect={handleSelect}
            className="w-full h-64 p-4 border rounded-lg font-mono resize-none"
            placeholder="Start typing..."
          />

          {state.users.map((user) => {
            const { top, left } = calculateCursorPosition(
              user.position,
              textareaRef.current,
              containerRef.current
            );
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
