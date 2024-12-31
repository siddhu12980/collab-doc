import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useState } from "react";

const extensions = [StarterKit];

const content = "<p>Hello World!</p>";

const TextBoxComponent = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);

  const editor = useEditor({
    onTransaction: (d) => {
      const data = JSON.stringify(d.transaction);
      // const res = parseEditorJSON(data);
      console.log(data);
    },

    extensions,
    content,
  });

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8081");

    ws.onopen = () => {
      console.log("Connected to the WS Server");

      ws.send(
        JSON.stringify({
          type: "join",
          data: {
            token: "123dsads",
            sheetId: "456",
          },
        })
      );

      setSocket(ws);
    };

    ws.onmessage = (message) => {
      console.log(message.data);
    };

    ws.onclose = () => {
      console.log("Disconnected from the WS Server");
    };

    return () => {
      ws.close();
      setSocket(null);
    };
  }, []);

  function sendContent(editor: Editor | null) {
    if (!socket) {
      return;
    }

    socket.send(
      JSON.stringify({
        type: "content",
        data: {
          content: editor?.getHTML() || "",
        },
      })
    );
  }

  if (!editor) {
    return <div>Loading </div>;
  }

  editor.on("update", () => {
    console.log("Editor content updated", editor.getJSON());
    sendContent(editor);
  });

  return (
    <>
      {/* <MenuBar editor={editor} /> */}
      <div className="editor-container w-full h-screen  border-2 border-gray-200 overflow-scroll">
        <EditorContent editor={editor} />
      </div>
    </>
  );
};

export default TextBoxComponent;
