// export function calculateCursorPosition(
//   position: number,
//   textarea: HTMLTextAreaElement | null,
//   container: HTMLDivElement | null
// ): { top: number; left: number } {
//   if (!textarea || !container) {
//     return { top: 0, left: 0 };
//   }

//   const text = textarea.value.substring(0, position);

//   const mirror = document.createElement("div");
//   mirror.style.cssText = getComputedStyle(textarea).cssText;
//   mirror.style.height = "auto";
//   mirror.style.position = "absolute";
//   mirror.style.visibility = "hidden";
//   mirror.style.whiteSpace = "pre-wrap";
//   mirror.style.overflow = "hidden";

//   mirror.style.width = textarea.offsetWidth + "px";

//   const textBeforeCursor = document.createElement("span");
//   textBeforeCursor.textContent = text;
//   mirror.appendChild(textBeforeCursor);

//   document.body.appendChild(mirror);

//   // Get cursor coordinates
//   const textRect = textBeforeCursor.getBoundingClientRect();
//   const textareaRect = textarea.getBoundingClientRect();
//   const containerRect = container.getBoundingClientRect();

//   console.log("Text rect", textRect.height, textRect.width , mirror.scrollTop);

//   const top =
//     textRect.height -
//     mirror.scrollTop +
//     parseInt(getComputedStyle(textarea).paddingTop || "0");
//   const left =
//     (text.length - text.lastIndexOf("\n") - 1) *
//       parseInt(getComputedStyle(textarea).fontSize || "16") *
//       0.6 +
//     parseInt(getComputedStyle(textarea).paddingLeft || "0");

//   // Clean up
//   document.body.removeChild(mirror);

//   return {
//     top: Math.min(top, textarea.offsetHeight - 20),
//     left: Math.min(left, textarea.offsetWidth - 20),
//   };
// }

export function calculateCursorPosition(
  position: number,
  textarea: HTMLTextAreaElement | null,
  container: HTMLDivElement | null
): { top: number; left: number } {
  if (!textarea || !container) {
    return { top: 0, left: 0 };
  }

  // Create a mirror element matching the textarea
  const mirror = document.createElement("div");
  const computedStyle = getComputedStyle(textarea);
  
  mirror.style.cssText = `
    position: absolute;
    visibility: hidden;
    height: auto;
    min-height: ${textarea.offsetHeight}px;
    width: ${textarea.offsetWidth}px;
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow: hidden;
    padding: ${computedStyle.padding};
    border: ${computedStyle.border};
    font-family: ${computedStyle.fontFamily};
    font-size: ${computedStyle.fontSize};
    font-weight: ${computedStyle.fontWeight};
    line-height: ${computedStyle.lineHeight};
  `;

  // Create measurement elements
  const textContent = textarea.value.substring(0, position);
  const lines = textContent.split('\n');
  const currentLine = lines[lines.length - 1];
  
  // Create span for text before cursor
  const textSpan = document.createElement("span");
  textSpan.textContent = textContent;
  mirror.appendChild(textSpan);
  
  // Append mirror to the same container as textarea for consistent styling
  container.appendChild(mirror);

  // Calculate positions
  const containerRect = container.getBoundingClientRect();
  const textareaRect = textarea.getBoundingClientRect();
  const spanRect = textSpan.getBoundingClientRect();

  const lineHeight = parseFloat(computedStyle.lineHeight || 
                              computedStyle.fontSize);
                              
  // Calculate top position based on number of lines
  const top = Math.min(
    spanRect.height - mirror.scrollTop,
    textarea.offsetHeight - lineHeight
  );

  // Calculate left position based on current line length
  const charWidth = parseFloat(computedStyle.fontSize) * 0.6;
  const left = Math.min(
    (currentLine.length * charWidth) + 
    parseFloat(computedStyle.paddingLeft || '0'),
    textarea.offsetWidth - charWidth
  );

  // Clean up
  container.removeChild(mirror);

  return { 
    top: Math.max(
      parseFloat(computedStyle.paddingTop || '0'),
      Math.min(top, textarea.offsetHeight - lineHeight)
    ),
    left: Math.max(0, left)
  };
}