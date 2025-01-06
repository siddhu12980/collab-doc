import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { WS_URL } from "../../config/constants";
import docAPi from "../../services/mockApi";

import { Document } from "../../types/auth";
import { calculateCursorPosition } from "../../utils/cursor";
import { CRDT } from "../../sync/sync";

enum MESSAGE_TYPE {
  JOIN = "join",
  SERVER = "server",
  ERROR = "error",
  RESPONSE = "response",
  LEAVE = "leave",
  UPDATE = "update",
  CURSOR_UPDATE = "cursorUpdate",
}
enum Display_Cursor_Color {
  RED = "red",
  GREEN = "green",
  YELLOW = "yellow",
  PURPLE = "purple",
  ORANGE = "orange",
  PINK = "pink",
  WHITE = "white",
}

interface ACtiveUser {
  id: string;
  email?: string;
  username: string;
  cursor_position?: {
    anchor?: number;
    head?: number;
  };
  displaycolor?: Display_Cursor_Color;
}

export default function DocumentEditor() {
  const { id } = useParams<{ id: string }>();

  const [token, setToken] = useState<string | null>(null);

  const [doc, setDoc] = useState<Document | null>(null);

  const [myUser, setMyUser] = useState<ACtiveUser | null>(null);

  const [activeUsers, setActiveUsers] = useState<ACtiveUser[]>([]);

  const [canEdit, setCanEdit] = useState(false);

  const [content, setContent] = useState("");

  const [socket, setSocket] = useState<WebSocket | null>(null);

  const [isConnected, setIsConnected] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const [crdt, setCrdt] = useState<CRDT | null>(null);

  async function getDocData(documentId: string) {
    try {
      const docData = await docAPi.getDoc(documentId);
      if (!docData) {
        console.error("No document found");
        return;
      }
      setDoc(docData);
      setContent(docData.content);
    } catch (error) {
      console.error("Error fetching document:", error);
    }
  }

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    console.log("Selection:", target.selectionStart, target.selectionEnd);

    setActiveUsers((prev) =>
      prev.map((user) =>
        user.id === myUser?.id
          ? {
              ...user,
              cursor_position: {
                anchor: target.selectionStart,
                head: target.selectionEnd,
              },
            }
          : user
      )
    );

    if (socket) {
      socket.send(
        JSON.stringify({
          type: MESSAGE_TYPE.CURSOR_UPDATE,
          data: {
            cursor_position: {
              anchor: target.selectionStart,
              head: target.selectionEnd,
            },
          },
        })
      );
    }
  };

  useEffect(() => {
    const initializeUserSession = () => {
      const token = localStorage.getItem("token");
      const authData = localStorage.getItem("user");

      if (!token || !authData || !id) {
        console.error("Missing required session data");
        return false;
      }

      try {
        const parsedAuthData = JSON.parse(authData);
        if (
          !parsedAuthData?.id ||
          !parsedAuthData?.email ||
          !parsedAuthData?.username
        ) {
          console.error("Invalid user data");
          return false;
        }

        setMyUser({
          id: parsedAuthData.id,
          email: parsedAuthData.email,
          username: parsedAuthData.username,
        });

        const crdt = CRDT.getInstance(parsedAuthData.id);
        setCrdt(crdt);

        return { token, parsedAuthData, documentId: id };
      } catch (error) {
        console.error("Error parsing auth data:", error);
        return false;
      }
    };

    const sessionData = initializeUserSession();

    if (!sessionData || !sessionData.parsedAuthData) {
      console.error("Failed to initialize user session");
      return;
    }

    console.log("Session data:", sessionData);
    console.log("crdt:", crdt);

    if (sessionData) {
      getDocData(sessionData.documentId);
      initializeWebSocket(sessionData.token, sessionData.documentId);
      setToken(sessionData.token);
    }
  }, [id]);

  useEffect(() => {
    console.log("Running Second effect:", crdt);
    if (!token || !id) {
      return;
    }

    if (!crdt) {
      console.error("CRDT not initialized");
      return;
    }

    const c = CRDT.getInstance(myUser?.id!);

    setCrdt(c);

    initializeWebSocket(token, id);
  }, [token]);

  const initializeWebSocket = (token: string, documentId: string) => {
    if (!token || !crdt) {
      console.error("Missing required data for WebSocket initialization");
      return;
    }
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      setIsConnected(true);
      ws.send(
        JSON.stringify({
          type: MESSAGE_TYPE.JOIN,
          data: {
            token: token,
            sheetId: documentId,
          },
        })
      );
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("WebSocket message in frontend :", data);
      handleWebSocketMessage(data);
    };

    ws.onclose = () => {
      setIsConnected(false);
      setCanEdit(false);
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  };

  const handleContentUpdate = (datas: any) => {
    const data = datas.data;

    console.log("Content update:", data);

    console.log("CRDT:", crdt);

    if (!crdt) {
      console.error("CRDT not initialized");
      return;
    }

    if (!textareaRef.current) {
      console.error("Textarea not initialized");
      return;
    }

    if (data.type === "insert") {
      const index = crdt.integrate(data.character);
  

      console.log("Character added at index successfully:", index);
      if (index == -1) {
        console.error("Char Adding Failed");
        return;
      }

      setContent(crdt.toString());
    } else if (data.type === "delete") {
      const state = crdt.getState();

      const index = state.findIndex(
        (char) =>
          char.clock === data.character.clock &&
          char.siteId === data.character.siteId
      );

      if (index !== -1) {
        crdt.delete(index);
      }

      setContent(crdt.toString());
    }
  };

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

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!crdt) {
      console.error("CRDT not initialized");
      return;
    }

    const newText = e.target.value;

    if (newText === content) return;

    const diff = findTextDiff(content, newText);

    if (!diff) return;

    if (diff.type === "insert") {
      const char = crdt.insert(diff.chars, diff.index);
      setContent(crdt.toString());

      const message = JSON.stringify({
        type: MESSAGE_TYPE.UPDATE,
        userId: myUser?.id,
        sheetId: id,
        data: {
          type: "insert",
          character: char,
          sourceSiteId: crdt.getID(),
        },
      });

      if (socket) {
        socket.send(message);
      }
    } else if (diff.type === "delete") {
      const char = crdt.delete(diff.index);

      if (char) {
        setContent(crdt.toString());

        const message = JSON.stringify({
          type: MESSAGE_TYPE.UPDATE,
          userId: myUser?.id,
          sheetId: id,
          data: {
            type: "delete",
            character: char,
            sourceSiteId: crdt.getID(),
          },
        });

        if (socket) {
          socket.send(message);
        }
      }
    }
  };

  const handleWebSocketMessage = (data: any) => {
    const { type, data: messageData } = data;

    switch (type) {
      case MESSAGE_TYPE.JOIN:
        handleJoin(messageData);
        setCanEdit(true);
        break;

      case MESSAGE_TYPE.LEAVE:
        handleUserLeave(messageData.userId);
        break;

      case MESSAGE_TYPE.SERVER:
        if (messageData.type === MESSAGE_TYPE.JOIN) {
          handleJoin(messageData);
        }
        console.log("Server message:", messageData);
        break;

      case MESSAGE_TYPE.ERROR:
        console.error("WebSocket error:", messageData);
        break;

      case MESSAGE_TYPE.UPDATE:
        handleContentUpdate(messageData);
        break;

      case MESSAGE_TYPE.CURSOR_UPDATE:
        setActiveUsers((prev) =>
          prev.map((user) =>
            user.id === messageData.userId
              ? {
                  ...user,
                  cursor_position: messageData.cursor_position,
                }
              : user
          )
        );
        break;

      default:
        console.log("Unhandled message type:", type);
    }
  };

  const handleJoin = (data: {
    userId: string;
    username: string;
    sheetId: string;
  }) => {
    setActiveUsers((prevUsers) => {
      const userExists = prevUsers.some((u) => u.id === data.userId);
      if (!userExists) {
        return [
          ...prevUsers,
          {
            id: data.userId,
            username: data.username,
            displaycolor:
              Object.values(Display_Cursor_Color)[
                Math.floor(
                  Math.random() * Object.values(Display_Cursor_Color).length
                )
              ],
          },
        ];
      }
      return prevUsers;
    });
  };

  const handleUserLeave = (userId: string) => {
    setActiveUsers((prevUsers) =>
      prevUsers.filter((user) => user.id !== userId)
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 gap-8">
      <header className="bg-gray-800 shadow-lg p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1
            onClick={() => {
              console.log("Clicked", crdt?.getState());
            }}
            className="text-2xl font-bold text-white truncate"
          >
            {doc?.title || "Loading..."}
          </h1>

          <div className="flex items-center space-x-6">
            <span className="text-sm text-gray-400">{doc?.slug}</span>

            <div className="flex items-center space-x-2">
              {activeUsers.map((user) => (
                <div
                  key={user.id}
                  className={`px-3 py-1 rounded-full text-sm ${
                    user.id === myUser?.id
                      ? "bg-green-600 text-white"
                      : "bg-gray-700 text-gray-200"
                  }`}
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

      <div
        className={` w-[80%] mx-auto bg-gray-800 rounded-lg shadow-lg p-2  relative    ${
          canEdit ? "cursor-text" : "cursor-not-allowed disabled:opacity-50"
        }          `}
      >
        <div
          className="relative min-h-[16rem] bg-white dark:bg-gray-900 rounded-lg"
          ref={containerRef}
        >
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleTextChange}
            onSelect={handleSelect}
            className="w-full h-full min-h-[16rem] p-4 bg-transparent text-gray-900 
               dark:text-gray-100 font-mono resize-none outline-none border 
               border-gray-200 dark:border-gray-700 rounded-lg"
            placeholder="Start typing..."
            spellCheck="false"
          />
          {activeUsers.map((user) => {
            const { top, left } = calculateCursorPosition(
              user.cursor_position?.head!,
              textareaRef.current,
              containerRef.current
            );
            return (
              <div
                key={user.id}
                className="absolute pointer-events-none transform"
                style={{
                  left: `${left}px`,
                  top: `${top}px`,
                  color: user.displaycolor,
                  zIndex: 20,
                }}
              >
                <div className="relative">
                  <span
                    className="absolute -top-5 whitespace-nowrap text-xs bg-gray-800 
                         px-1.5 py-0.5 rounded"
                  >
                    {user.username}
                  </span>
                  <div
                    className="w-0.5 h-5 animate-pulse"
                    style={{ backgroundColor: user.displaycolor }}
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
