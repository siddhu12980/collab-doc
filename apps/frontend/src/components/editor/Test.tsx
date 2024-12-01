import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import StarterKit from "@tiptap/starter-kit";
import { WS_URL } from "../../config/constants";
import docAPi from "../../services/mockApi";

import { Document } from "../../types/auth";
import { useEditor, EditorContent } from "@tiptap/react";
import { TextSelection, Transaction } from "prosemirror-state";

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
  BLUE = "blue",
  GREEN = "green",
  YELLOW = "yellow",
  PURPLE = "purple",
  ORANGE = "orange",
  PINK = "pink",
  GRAY = "gray",
  BLACK = "black",
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
  //randomly select display color
  displaycolor?: Display_Cursor_Color;
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
  const [txnExample, setTxnExample] = useState<Transaction[] | null>(null);

  const extensions = [StarterKit];

  async function getDocData(documentId: string) {
    console.log("Fetching document data...", canEdit, socket, extensions);
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
        // handleContentUpdate(messageData);
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

  const editor = useEditor({
    extensions: [StarterKit],

    content: doc?.content || "Hello",

    onUpdate({ editor, transaction }) {
      const cursor = editor.state.selection.toJSON();

      const cursorLine = editor.state.selection.content().toJSON();

      console.log("cursorLine:", cursorLine);

      console.log("Cursor position", cursor);

      //   const res = editor.state.selection.toJSON();

      //   console.log("res:", res);
    },

    onTransaction({ editor, transaction }) {
      console.log("Transaction:", transaction.steps);

      //push transaction to the state

      setTxnExample((prevTxn) => {
        {
          if (!prevTxn) {
            return [transaction];
          } else {
            return [...prevTxn, transaction];
          }
        }
      });
    },
  });

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
                  onClick={() => {
                    setTimeout(() => {
                      if (!txnExample) return;
                    }, 2000);
                  }}
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
        <div className="max-w-4xl mx-auto bg-gray-800 rounded-lg shadow-lg p-4 relative">
          {editor && (
            <>
              <EditorContent editor={editor} className="prose max-w-none" />
            </>
          )}

          <style>{`
            /* Remove default outline */
            .ProseMirror {
              min-height: 200px;
              outline: none !important;
              background-color: #1f2937; /* bg-gray-800 */
              color: white; /* White text */
            }

            /* Style the editor content */
            .ProseMirror p {
              margin: 1em 0;
            }

            /* Style headings */
            .ProseMirror h1 {
              font-size: 2em;
              font-weight: bold;
              margin: 1em 0;
            }

            .ProseMirror h2 {
              font-size: 1.5em;
              font-weight: bold;
              margin: 1em 0;
            }

            /* Style lists */
            .ProseMirror ul,
            .ProseMirror ol {
              padding-left: 2em;
              margin: 1em 0;
            }

            /* Style links */
            .ProseMirror a {
              color: #3b82f6; /* Same as before */
              text-decoration: underline;
            }

            /* Custom styling for focused state */
            .ProseMirror:focus {
              box-shadow: none; /* Remove focus border shadow */
              border-radius: 4px;
            }

            /* Style code blocks */
            .ProseMirror pre {
              background-color: #374151; /* Darker gray for code blocks */
              padding: 1em;
              border-radius: 4px;
              margin: 1em 0;
              color: #e5e7eb; /* Light gray text */
            }

            /* Style inline code */
            .ProseMirror code {
              background-color: #374151; /* Darker gray for inline code */
              padding: 0.2em 0.4em;
              border-radius: 4px;
              color: #e5e7eb; /* Light gray text */
            }

            /* Style blockquotes */
            .ProseMirror blockquote {
              border-left: 4px solid #4b5563; /* Gray border */
              padding-left: 1em;
              margin: 1em 0;
              color: #d1d5db; /* Light gray text */
            }
          `}</style>
        </div>
      </main>
    </div>
  );
}
