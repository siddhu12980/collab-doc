export enum MESSAGE_TYPE {
    JOIN = "join",
    SERVER = "server",
    ERROR = "error",
    RESPONSE = "response",
    LEAVE = "leave",
    UPDATE = "update",
    CURSOR_UPDATE = "cursorUpdate",
  }
  export enum Display_Cursor_Color {
    RED = "red",
    GREEN = "green",
    YELLOW = "yellow",
    PURPLE = "purple",
    ORANGE = "orange",
    PINK = "pink",
    WHITE = "white",
  }
  
  export interface ACtiveUser {
    id: string;
    email?: string;
    username: string;
    cursor_position?: {
      anchor?: number;
      head?: number;
    };
    displaycolor?: Display_Cursor_Color;
  }