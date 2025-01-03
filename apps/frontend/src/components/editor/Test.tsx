import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { WS_URL } from "../../config/constants";

import docApi from "../../services/mockApi";

import { debounce } from "lodash";
import { calculateCursorPosition } from "../../utils/cursor";

type DocumentType = {
  id: string;
  title: string;
  content: string;
  slug: string;
};

enum MessageType {
  JOIN = "join",
  SERVER = "server",
  ERROR = "error",
  RESPONSE = "response",
  LEAVE = "leave",
  UPDATE = "update",
  CURSOR_UPDATE = "cursorUpdate",
  SYNC_REQUEST = "syncRequest",
  SYNC_RESPONSE = "syncResponse",
}

const CURSOR_COLORS = [
  "red",
  "blue",
  "green",
  "yellow",
  "purple",
  "pink",
] as const;

type CursorColor = (typeof CURSOR_COLORS)[number];

interface ActiveUser {
  id: string;
  email?: string;
  username: string;
  cursor_position?: {
    anchor: number;
    head: number;
  };
  colorClass: CursorColor;
}

interface TextChange {
  operation: "add" | "delete";
  changeText: string;
  changeIndex: number;
}

const CursorIndicator: React.FC<{
  user: ActiveUser;
  containerRef: React.RefObject<HTMLDivElement>;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  sendCursor?(cursorPosition: { anchor: number; head: number }): void;
}> = ({ user, containerRef, textareaRef }) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    console.log("Cursor for user", user.username, user.cursor_position);
    if (user.cursor_position) {
      const coords = calculateCursorPosition(
        user.cursor_position.head,
        textareaRef.current,
        containerRef.current
      );
      setPosition({
        top: coords.top,
        left: coords.left,
      });
    }
  }, [user.cursor_position, textareaRef, containerRef]);

  return (
    <div
      key={user.id}
      className={`absolute  pointer-events-none transform  text-${user.colorClass} `}
      style={{
        left: `${position.left}px`,
        top: `${position.top}px`,
        color: user.colorClass,
        zIndex: 20,
      }}
    >
      <div className="relative">
        <span
          className={`absolute -top-5 whitespace-nowrap text-xs  
                         px-1.5 py-0.5 rounded   `}
        >
          {user.username}
        </span>
        <div
          className={` w-0.5  h-5 animate-pulse`}
          style={{ backgroundColor: user.colorClass }}
        />
      </div>
    </div>
  );
};

export default function Test() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<DocumentType | null>(null);
  const [myUser, setMyUser] = useState<ActiveUser | null>(null);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [canEdit, setCanEdit] = useState(true);
  const [content, setContent] = useState("");
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const reconnectAttempts = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;

  const initializeSession = useCallback(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData || !id) {
      setError("Missing authentication data");
      return null;
    }

    try {
      const parsedUser = JSON.parse(userData);
      const colorClass =
        CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];

      setMyUser({
        id: parsedUser.id,
        email: parsedUser.email,
        username: parsedUser.username,
        colorClass: colorClass,
      });

      return { token, documentId: id };
    } catch (error) {
      setError("Invalid user data");
      return null;
    }
  }, [id]);

  const handleContentChange = useCallback(
    debounce(
      (currentValue: string, prevValue: string, cursorPosition: number) => {
        if (!socket || socket.readyState !== WebSocket.OPEN) return;

        const change = calculateTextChange(
          prevValue,
          currentValue,
          cursorPosition
        );
        if (!change) return;

        console.log("Sending update", change);
        socket.send(
          JSON.stringify({
            type: MessageType.UPDATE,
            data: {
              ...change,
              cursor_position: {
                anchor: textareaRef.current?.selectionStart || 0,
                head: textareaRef.current?.selectionEnd || 0,
              },
            },
          })
        );
      },
      50
    ),
    [socket]
  );

  const calculateTextChange = (
    prevText: string,
    newText: string,
    cursorPos: number
  ): TextChange | null => {
    if (prevText === newText) return null;

    const operation = newText.length > prevText.length ? "add" : "delete";
    let changeIndex = 0;
    let changeText = "";

    if (operation === "add") {
      changeIndex = Math.max(0, cursorPos - (newText.length - prevText.length));
      changeText = newText.slice(changeIndex, cursorPos);
    } else {
      changeIndex = cursorPos;
      changeText = prevText.slice(
        cursorPos,
        cursorPos + (prevText.length - newText.length)
      );
    }

    return { operation, changeText, changeIndex };
  };

  const handleCursorUpdate = useCallback(
    debounce((e: React.SyntheticEvent<HTMLTextAreaElement>) => {
      if (!socket || !myUser || socket.readyState !== WebSocket.OPEN) return;

      const target = e.target as HTMLTextAreaElement;
      const cursorPosition = {
        anchor: target.selectionStart || 0,
        head: target.selectionEnd || 0,
      };

      // Update local state immediately
      setActiveUsers((prev) =>
        prev.map((user) =>
          user.id === myUser.id
            ? { ...user, cursor_position: cursorPosition }
            : user
        )
      );

      // Send update to server
      socket.send(
        JSON.stringify({
          type: MessageType.CURSOR_UPDATE,
          data: { cursor_position: cursorPosition },
        })
      );
    }, 16), // Using requestAnimationFrame timing
    [socket, myUser, activeUsers, setActiveUsers]
  );

  const handleIncomingMessage = useCallback(
    (message: any) => {
      const { type, data } = message;

      console.log("Incoming message", message);

      switch (type) {
        case MessageType.JOIN:
          console.log("Join message received", data);

          setActiveUsers((prev) => {
            const existingUser = prev.find((u) => u.id === data.userId);
            if (existingUser) return prev;

            return [
              ...prev,
              {
                id: data.userId,
                username: data.username,
                colorClass:
                  CURSOR_COLORS[
                    Math.floor(Math.random() * CURSOR_COLORS.length)
                  ],
              },
            ];
          });

          setCanEdit(true);
          break;

        case MessageType.SERVER:
          console.log("Server message received", data);

          if (data.type === MessageType.JOIN) {
            setActiveUsers((prev) => {
              const existingUser = prev.find((u) => u.id === data.userId);
              if (existingUser) return prev;

              return [
                ...prev,
                {
                  id: data.userId,
                  username: data.username,
                  colorClass: CURSOR_COLORS[Math.floor(Math.random() * 6)],
                },
              ];
            });
          }

          break;

        case MessageType.UPDATE:
          if (textareaRef.current) {
            const { operation, changeText, changeIndex } = data.data;
            const currentValue = textareaRef.current.value;

            const newContent =
              operation === "add"
                ? currentValue.slice(0, changeIndex) +
                  changeText +
                  currentValue.slice(changeIndex)
                : currentValue.slice(0, changeIndex) +
                  currentValue.slice(changeIndex + changeText.length || 0);

            setContent(newContent);
          }
          break;

        case MessageType.CURSOR_UPDATE:
          console.log("Cursor update Received", data);
          setActiveUsers((prev) =>
            prev.map((user) =>
              user.id === data.userId
                ? { ...user, cursor_position: data.cursor_position }
                : user
            )
          );
          break;

        case MessageType.LEAVE:
          setActiveUsers((prev) =>
            prev.filter((user) => user.id !== data.userId)
          );
          break;

        case MessageType.ERROR:
          setError(data.message);
          break;
      }
    },
    [id]
  );

  useEffect(() => {
    const session = initializeSession();
    if (!session) return;

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
      ws.send(
        JSON.stringify({
          type: MessageType.JOIN,
          data: {
            token: session.token,
            sheetId: session.documentId,
          },
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleIncomingMessage(message);
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setCanEdit(false);

      if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts.current += 1;
        setTimeout(initializeSession, 2000 * reconnectAttempts.current);
      } else {
        setError("Connection lost. Please refresh the page.");
      }
    };

    setSocket(ws);
    return () => ws.close();
  }, [initializeSession, handleIncomingMessage]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 gap-6">
      
      {/* Header */}
      <header className="bg-gray-800 shadow-lg p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-white truncate">
              {doc?.title || "Loading..."}
            </h1>

            <button
              onClick={async () => {
                console.log("Saving document", activeUsers);
              }}
              className="bg-blue-500 text-white px-4 py-2 rounded-md"
            >
              Save
            </button>

            {isSyncing && (
              <span className="text-yellow-400 text-sm animate-pulse">
                Syncing...
              </span>
            )}
          </div>

          <div className="flex items-center space-x-6">
            <span className="text-sm text-gray-400">{doc?.slug || id}</span>
            <div className="flex items-center space-x-2">
              {activeUsers.map((user) => (
                <div
                  key={user.id}
                  className={`px-3 py-1 rounded-full text-sm 
                  
                    ${user.id === myUser?.id ? "bg-gray-500" : "bg-gray-600"} 

                   text-${user.colorClass}`}
                  style={{ color: user.colorClass }}
                >
                  {user.username}
                </div>
              ))}
            </div>
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            />
          </div>
        </div>
      </header>

      {/* Error Message */}
      {error && (
        <div className="w-[80%] mx-auto  bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{error}</span>
          <button
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setError(null)}
          >
            <span className="text-red-500 hover:text-red-700">X</span>
          </button>
        </div>
      )}

      {/* Editor */}
      <div className="w-[80%] mx-auto  bg-gray-800 rounded-lg shadow-lg p-2 relative">
        <div
          className="relative min-h-[16rem] bg-gray-900 rounded-lg"
          ref={containerRef}
        >
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              handleContentChange(
                e.target.value,
                content,
                e.target.selectionStart || 0
              );
            }}
            onSelect={handleCursorUpdate}
            className={`w-full h-full min-h-[16rem] p-4 bg-transparent text-gray-100 
              font-mono resize-none outline-none border border-gray-700 rounded-lg
              ${!canEdit && " opacity-50"}`}
            placeholder="Start typing..."
            spellCheck={false}
            disabled={!canEdit}
          />

          {activeUsers.map(
            (user) =>
              user.cursor_position && (
                <CursorIndicator
                  key={user.id}
                  user={user}
                  containerRef={containerRef}
                  textareaRef={textareaRef}
                />
              )
          )}
        </div>
      </div>
    </div>
  );
}
