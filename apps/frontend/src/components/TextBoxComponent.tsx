import {
  BubbleMenu,
  EditorContent,
  FloatingMenu,
  useEditor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import React from "react";

const TextBoxComponent: React.FC = () => {
  const editor = useEditor({
    extensions: [StarterKit],

    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none",
      },
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="relative  min-h-[200px] w-full max-w-screen-lg mx-auto p-4">
      <EditorContent
        editor={editor}
        className="min-h-[200px] w-full border rounded-lg p-4"
      />
      {editor && (
        <>
          <FloatingMenu
            editor={editor}
            className="bg-white shadow-lg rounded-lg p-2"
          >
            This is the floating menu
          </FloatingMenu>
          <BubbleMenu
            editor={editor}
            className="bg-white shadow-lg rounded-lg p-2"
          >
            This is the bubble menu
          </BubbleMenu>
        </>
      )}
    </div>
  );
};

export default TextBoxComponent;
