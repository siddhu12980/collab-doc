import jwt from "jsonwebtoken";

export const exampleTheme = {
  ltr: "ltr",
  rtl: "rtl",
  paragraph: "editor-paragraph",
  quote: "editor-quote",
  heading: {
    h1: "editor-heading-h1",
    h2: "editor-heading-h2",
    h3: "editor-heading-h3",
    h4: "editor-heading-h4",
    h5: "editor-heading-h5",
    h6: "editor-heading-h6",
  },
  list: {
    nested: {
      listitem: "editor-nested-listitem",
    },
    ol: "editor-list-ol",
    ul: "editor-list-ul",
    listitem: "editor-listItem",
    listitemChecked: "editor-listItemChecked",
    listitemUnchecked: "editor-listItemUnchecked",
  },
  hashtag: "editor-hashtag",
  image: "editor-image",
  link: "editor-link",
  text: {
    bold: "editor-textBold",
    code: "editor-textCode",
    italic: "editor-textItalic",
    strikethrough: "editor-textStrikethrough",
    subscript: "editor-textSubscript",
    superscript: "editor-textSuperscript",
    underline: "editor-textUnderline",
    underlineStrikethrough: "editor-textUnderlineStrikethrough",
  },
  code: "editor-code",
  codeHighlight: {
    atrule: "editor-tokenAttr",
    attr: "editor-tokenAttr",
    boolean: "editor-tokenProperty",
    builtin: "editor-tokenSelector",
    cdata: "editor-tokenComment",
    char: "editor-tokenSelector",
    class: "editor-tokenFunction",
    "class-name": "editor-tokenFunction",
    comment: "editor-tokenComment",
    constant: "editor-tokenProperty",
    deleted: "editor-tokenProperty",
    doctype: "editor-tokenComment",
    entity: "editor-tokenOperator",
    function: "editor-tokenFunction",
    important: "editor-tokenVariable",
    inserted: "editor-tokenSelector",
    keyword: "editor-tokenAttr",
    namespace: "editor-tokenVariable",
    number: "editor-tokenProperty",
    operator: "editor-tokenOperator",
    prolog: "editor-tokenComment",
    property: "editor-tokenProperty",
    punctuation: "editor-tokenPunctuation",
    regex: "editor-tokenVariable",
    selector: "editor-tokenSelector",
    string: "editor-tokenSelector",
    symbol: "editor-tokenProperty",
    tag: "editor-tokenProperty",
    url: "editor-tokenOperator",
    variable: "editor-tokenVariable",
  },
};

export function parseEditorJSON(input: string): string {
  try {
    const data = JSON.parse(input);

    const readable = {
      document: parseDoc(data.doc),
      steps: data.steps.map(parseStep),
      documents: data.docs.map(parseDoc),
      mapping: parseMapping(data.mapping),
      selection: parseSelection(data.curSelection),
      currentSelectionFor: data.curSelectionFor,
      updatedCount: data.updated,
      metadata: data.meta,
      timestamp: new Date(data.time).toLocaleString(),
      storedMarks: data.storedMarks || "None",
    };

    return JSON.stringify(readable, null, 2);
  } catch (error: any) {
    return `Invalid JSON: ${error.message}`;
  }
}

function parseDoc(doc: any): string {
  return doc.content
    .map((item: any) => {
      if (item.type === "paragraph") {
        return item.content.map((content: any) => content.text || "").join("");
      }
      return "";
    })
    .join("\n");
}

function parseStep(step: any): any {
  return {
    type: step.stepType,
    from: step.from,
    to: step.to,
    sliceContent:
      step.slice?.content?.map((content: any) => content.text || "").join("") ||
      "None",
  };
}

function parseMapping(mapping: any): any {
  return {
    ranges: mapping.maps.map((map: any) => ({
      ranges: map.ranges,
      inverted: map.inverted,
    })),
    from: mapping.from,
    to: mapping.to,
  };
}

function parseSelection(selection: any): any {
  return {
    type: selection.type,
    anchor: selection.anchor,
    head: selection.head,
  };
}

export function decodeJWT(token: string): any {
  try {
    const decoded = jwt.decode(token) as any;

    if (!decoded) {
      return null;
    }

    console.log("Decoded JWT", decoded);

    return {
      username: decoded.username,
      email: decoded.email,
      userId: decoded.id,
    };
  } catch (error: any) {
    return null;
  }
}

interface TextChange {
  operation: "add" | "delete";
  changeText: string;
  changeIndex: number;
}

export const calculateTextChange = (
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



export function generateShortUUID(length: number = 8): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = characters.length;
    
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charactersLength);
        result += characters.charAt(randomIndex);
    }

    return result;
}

