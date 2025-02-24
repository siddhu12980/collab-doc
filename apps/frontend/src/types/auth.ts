import { Character } from "../sync/sync";

export interface User {
  id: string;
  email: string;
  username: string;
  createdAt?: string;
  password: null;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface Document {
  id: string;
  title: string;
  code: string;
  createdAt: string;
  ownerId: string;
  characters: Character[];
  version: number;
}

export interface UpdateDocument {
  id: string;
  title?: string;
  content?: string;
  lastUpdateID?: string | null;
}

export interface Document {
  id: string;
  title: string;
  slug: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  userId: string;
  user?: User;
  events?: Event[];
  lastUpdateID?: string | null;
}
