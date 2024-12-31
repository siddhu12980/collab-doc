import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { EditorContent, Editor ,useEditor} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { WS_URL } from "../../config/constants";
import docAPi from "../../services/mockApi";

import { Document } from "../../types/auth";

enum MESSAGE_TYPE {
  JOIN = "join",
  SERVER = "server",
  ERROR = "error",
  RESPONSE = "response",
  LEAVE = "leave",
  UPDATE = "update",
}

interface ACtiveUser {
  id: string;
  email?: string;
  username: string;
}

export default function DocumentEditor() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<Document | null>(null);
  const [myUser, setMyUser] = useState<ACtiveUser | null>(null);
  const [activeUsers, setActiveUsers] = useState<ACtiveUser[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [content, setContent] = useState("");
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const extensions = [StarterKit];

  const editor = useEditor({
    onTransaction: (d) => {
      const data = JSON.stringify(d.transaction);
      // const res = parseEditorJSON(data);
      console.log(data);
    },

    extensions,
    content,
  });

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

        return { token, parsedAuthData, documentId: id };
      } catch (error) {
        console.error("Error parsing auth data:", error);
        return false;
      }
    };

    const sessionData = initializeUserSession();
    if (sessionData) {
      getDocData(sessionData.documentId);
      initializeWebSocket(sessionData.token, sessionData.documentId);
    }
  }, [id]);

  const initializeWebSocket = (token: string, documentId: string) => {
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

  // Handle WebSocket messages
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
        break;

      case MESSAGE_TYPE.ERROR:
        console.error("WebSocket error:", messageData);
        break;

      case MESSAGE_TYPE.UPDATE:
        handleContentUpdate(messageData);
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
        return [...prevUsers, { id: data.userId, username: data.username }];
      }
      return prevUsers;
    });
  };

  const handleUserLeave = (userId: string) => {
    setActiveUsers((prevUsers) =>
      prevUsers.filter((user) => user.id !== userId)
    );
  };

  const handleContentUpdate = (data: { content: string }) => {
    if (data.content !== content) {
      setContent(data.content);
    }
  };

  // // Handle text changes
  // const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  //   const newContent = e.target.value;
  //   setContent(newContent);

  //   const updatedContent = e.target.value;

  //   const selectionStart = e.target.selectionStart;

  //   const lines = updatedContent.slice(0, selectionStart).split("\n");
  //   const lineNumber = lines.length; // Line number starts from 1
  //   const colNumber = lines[lines.length - 1].length + 1; // Column number starts from 1

  //   console.log("Updated Content:", updatedContent);
  //   console.log("Line Number:", lineNumber);
  //   console.log("Column Number:", colNumber);

  //   if (socket?.readyState === WebSocket.OPEN) {
  //     console.log("Sending update to server", newContent);
  //     socket.send(
  //       JSON.stringify({
  //         type: MESSAGE_TYPE.UPDATE,
  //         data: {
  //           content: newContent,
  //         },
  //       })
  //     );
  //   }
  // };

  if (!editor) {
    return <div>Loading </div>;
  }



  return (
    <div className="flex flex-col min-h-screen bg-gray-900">
      <header className="bg-gray-800 shadow-lg p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white truncate">
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

      <main className="flex-1 p-4">
        <div className="max-w-4xl mx-auto h-full">
          {/*          
          <textarea
            value={content}
            onChange={handleChange}
            disabled={!canEdit}
            className={`w-full h-[calc(100vh-12rem)] p-4 rounded-lg resize-none 
              ${
                canEdit
                  ? "bg-gray-800 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  : "bg-gray-700 text-gray-400 cursor-not-allowed"
              }`}
            placeholder={canEdit ? "Start typing..." : "Connecting..."}
          /> */}

          <EditorContent editor={editor} />
        </div>
      </main>
    </div>
  );
}
