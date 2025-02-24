import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { WS_URL } from "../../config/constants";
import docAPi from "../../services/mockApi";

import { Document } from "../../types/auth";
import { calculateCursorPosition } from "../../utils/cursor";
import {  Character, CRDT } from "../../sync/sync";
import { ACtiveUser, MESSAGE_TYPE, Display_Cursor_Color } from "./model";


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

  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  const navigate = useNavigate();


  console.log("token", token);

  
  async function getDocData(documentId: string) {
    try {
      const docData = await docAPi.getDoc(documentId);
      if (!docData) {
        console.error("No document found");
        return;
      }
      setDoc(docData);

      if (docData.characters && crdt) {
        crdt.reset();
        
        // Sort characters by position and clock before integrating
        const sortedChars = [...docData.characters].sort((a, b) => {
          const posA = a.position.join(',');
          const posB = b.position.join(',');
          if (posA !== posB) return posA.localeCompare(posB);
          if (a.siteId !== b.siteId) return a.siteId.localeCompare(b.siteId);
          return a.clock - b.clock;
        });

        for (const char of sortedChars) {
          crdt.integrateFromDB(char);
        }

        setContent(crdt.toString());
      }
    } catch (error) {
      console.error("Error fetching document:", error);
    }
  }

  const saveToDatabase = async () => {
    if (!doc || !crdt) return;

    try {
      const characters = crdt.getState().map(char => new Character(
        char.id,
        char.value,
        char.position,
        char.siteId,
        char.clock,
        char.deleted,
        char.properties
      ));

      const currentContent = crdt.toString();
      const result = await docAPi.updateDoc(
        doc.id, 
        doc.title, 
        currentContent, 
        characters,
        doc.version + 1, 
        crdt.getID()
      );

      if (result) {
        setDoc(prev => prev ? { ...prev, version: prev.version + 1 } : null);
      }
    } catch (error) {
      console.error("Error saving document:", error);
    }
  };

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
        return;
      }

      try {
        const parsedAuthData = JSON.parse(authData);
        if (!parsedAuthData?.id || !parsedAuthData?.email || !parsedAuthData?.username) {
          console.error("Invalid user data");
          return;
        }

        setMyUser({
          id: parsedAuthData.id,
          email: parsedAuthData.email,
          username: parsedAuthData.username,
        });

        const newCrdt = CRDT.getInstance(parsedAuthData.id);
        setCrdt(newCrdt);
        setToken(token);
      } catch (error) {
        console.error("Error parsing auth data:", error);
      }
    };

    initializeUserSession();
  }, [id]);

  useEffect(() => {
    if (!token || !id || !crdt) return;
    
    console.log("Initializing WebSocket with token and CRDT ready");
    initializeWebSocket(token, id);

    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [token, id, crdt]);

  // New useEffect for document data
  useEffect(() => {
    if (!id || !crdt) return;
    
    console.log("Fetching doc data with CRDT:", crdt);
    getDocData(id);
  }, [id, crdt]);

  const initializeWebSocket = (token: string, documentId: string) => {
    console.log("Initializing WebSocket with token:", token, "and documentId:", documentId);

    if (!token) {
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
    if (!crdt || !textareaRef.current) return;

    // Ensure we're not processing our own updates
    if (data.sourceSiteId === crdt.getID()) return;

    if (data.type === "insert") {
      const index = crdt.integrate(data.character);
      if (index !== -1) {
        const currentCursor = textareaRef.current.selectionStart;
        setContent(crdt.toString());
        textareaRef.current.selectionStart = currentCursor;
        textareaRef.current.selectionEnd = currentCursor;
      }
    } else if (data.type === "delete") {
      // Find the character by siteId and clock
      const charToDelete = crdt.getState().find(
        char => 
          char.siteId === data.character.siteId && 
          char.clock === data.character.clock &&
          !char.deleted
      );

      if (charToDelete) {
        charToDelete.deleted = true;
        const currentCursor = textareaRef.current.selectionStart;
        setContent(crdt.toString());
        textareaRef.current.selectionStart = currentCursor;
        textareaRef.current.selectionEnd = currentCursor;
      }
    }
  };

  const findTextDiff = (oldStr: string, newStr: string) => {
    if (oldStr === newStr) return null;

    let i = 0;
    const minLen = Math.min(oldStr.length, newStr.length);

    // Find the first different character
    while (i < minLen && oldStr[i] === newStr[i]) i++;

    // Handle insertions
    if (newStr.length > oldStr.length) {
      const char = newStr[i];
      // Special handling for newline character
      if (char === '\n') {
        return {
          type: "insert" as const,
          index: i,
          chars: '\n'
        };
      }
      return {
        type: "insert" as const,
        index: i,
        chars: char
      };
    }

    // Handle deletions
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
        const newContent = crdt.toString();
        setContent(newContent);

        const message = JSON.stringify({
          type: MESSAGE_TYPE.UPDATE,
          userId: myUser?.id,
          sheetId: id,
          data: {
            type: "delete",
            character: char,
            sourceSiteId: crdt.getID(),
            index: diff.index,
          },
        });

        if (socket) {
          socket.send(message);
        }
      }
    }

    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    setSaveTimeout(setTimeout(saveToDatabase, 1000));
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

  useEffect(() => {
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [saveTimeout]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const adjustHeight = () => {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    };

    // Adjust on content change
    adjustHeight();

    // Add event listener for manual input
    textarea.addEventListener('input', adjustHeight);

    return () => {
      textarea.removeEventListener('input', adjustHeight);
    };
  }, [content]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 gap-8">
      <header className="bg-gray-800 shadow-lg p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center  cursor-pointer   ">
          <h1
            onClick={() => {
              navigate(`/`);
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
        className={`w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex-grow ${
          canEdit ? "cursor-text" : "cursor-not-allowed disabled:opacity-50"
        }`}
      >
        <div
          className="relative w-full bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden"
          ref={containerRef}
        >
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleTextChange}
            onSelect={handleSelect}
            className="w-full p-4 sm:p-6 bg-transparent text-base sm:text-lg 
              dark:text-gray-100 font-mono outline-none border-none
              rounded-lg whitespace-pre-wrap overflow-hidden
              leading-relaxed resize-none"
            style={{ 
              height: 'auto',
              minHeight: '16rem',
              maxHeight: '80vh'
            }}
            placeholder="Start typing..."
            spellCheck="false"
          />

          <div className="absolute inset-0 pointer-events-none">
            {activeUsers.map((user) => {
              const { top, left } = calculateCursorPosition(
                user.cursor_position?.head!,
                textareaRef.current,
                containerRef.current
              );
              return (
                <div
                  key={user.id}
                  className="absolute transform"
                  style={{
                    left: `${left}px`,
                    top: `${top}px`,
                    color: user.displaycolor,
                    zIndex: 20,
                  }}
                >
                  <div className="relative">
                    <span className="absolute -top-5 whitespace-nowrap text-xs bg-gray-800 
                      px-1.5 py-0.5 rounded">
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
    </div>
  );
}
