export interface User {
  id: string;
  name: string;
  color: string;
  position: number;
}

export interface EditorState {
  content: string;
  users: User[];
}

export type EditorMessage = 
  | { type: 'content'; content: string; userId: string }
  | { type: 'cursor'; position: number; userId: string }
  | { type: 'join'; user: User }
  | { type: 'leave'; userId: string };