import { sortBy } from "lodash";

type Position = number[];

interface ICharacter {
  id: string;
  value: string;
  position: Position;
  siteId: string;
  clock: number;
  deleted: boolean;
  properties?: CharacterProperties;
}

interface CharacterProperties {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
}

class Character implements ICharacter {
  constructor(
    public id: string,
    public value: string,
    public position: Position,
    public siteId: string,
    public clock: number,
    public deleted: boolean = false,
    public properties: CharacterProperties = {}
  ) {}

  compareTo?(other: Character): number {
    // Compare positions element by element
    const minLength = Math.min(this.position.length, other.position.length);

    for (let i = 0; i < minLength; i++) {
      if (this.position[i] !== other.position[i]) {
        return this.position[i] - other.position[i];
      }
    }

    // If positions are equal up to the minimum length, shorter arrays come first
    if (this.position.length !== other.position.length) {
      return this.position.length - other.position.length;
    }

    // If positions are identical, use site ID as tiebreaker
    return this.siteId.localeCompare(other.siteId);
  }
}

class CRDT {
  private characters: Character[] = [];
  private clock: number = 0;
  private readonly base: number = 32;
  private static instance: CRDT | null = null;

  private constructor(private siteId: string) {}

  static getInstance(siteId: string): CRDT {
    CRDT.instance = new CRDT(siteId);
    return CRDT.instance;
  }

  private generatePositionBetween(
    prev: Position | null,
    next: Position | null,
    depth: number = 0
  ): Position {
    const MAX_DEPTH = 32;
    if (depth >= MAX_DEPTH) {
      throw new Error("Maximum depth exceeded");
    }

    // Initialize boundaries
    const head = Math.floor(this.base / 2);
    const prevPos = prev || [0];
    const nextPos = next || [this.base];

    // Get values at current depth
    const prevValue = prevPos[depth] ?? 0;
    const nextValue = nextPos[depth] ?? this.base;

    // If there's enough space between values
    if (nextValue - prevValue > 1) {
      // Create new position by copying previous position up to current depth
      const newPos = prevPos.slice(0, depth);
      // Calculate midpoint, ensuring it's different from boundaries
      const midpoint =
        prevValue + Math.max(1, Math.floor((nextValue - prevValue) / 2));
      newPos[depth] = midpoint;
      return newPos;
    }

    // If we're at the end of prev position, extend it
    if (depth >= prevPos.length) {
      return [...prevPos, head];
    }

    // No space at current depth, go deeper
    const newPos = [...prevPos.slice(0, depth + 1)];
    newPos[depth] = prevValue;
    return this.generatePositionBetween(prevPos, nextPos, depth + 1);
  }

  insert(value: string, index: number): Character {
    if (index < 0 || index > this.characters.length) {
      throw new Error("Invalid index");
    }

    const prev = index > 0 ? this.characters[index - 1] : null;
    const next = index < this.characters.length ? this.characters[index] : null;

    // Generate position between prev and next
    const position = this.generatePositionBetween(
      prev?.position || null,
      next?.position || null
    );

    // Create new character with unique identifier
    const char = new Character(
      `${this.siteId}:${this.clock}`,
      value,
      position,
      this.siteId,
      this.clock++
    );

    // Insert into local array and maintain order
    const insertIndex = this.findInsertIndex(char);
    this.characters.splice(insertIndex, 0, char);

    return char;
  }

  private findInsertIndex(char: Character): number {
    let left = 0;
    let right = this.characters.length;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);

      if (!this.characters[mid].compareTo) {
        throw Error("IDK the error ");
      }

      const comparison = this.characters[mid].compareTo(char);

      if (comparison < 0) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    return left;
  }

  integrate(char: Character): number {
    if (!char || !Array.isArray(char.position) || !char.siteId) {
      throw new Error("Invalid character");
    }

    // Find the correct position using binary search
    const index = this.findInsertIndex(char);

    // Check if character already exists
    const existingChar = this.characters[index];
    if (
      existingChar &&
      existingChar.siteId === char.siteId &&
      existingChar.clock === char.clock
    ) {
      return -1; // Character already exists
    }

    // Insert the character
    this.characters.splice(index, 0, char);
    return index;
  }

  delete(index: number): Character | undefined {
    if (index < 0 || index >= this.characters.length) {
      return undefined;
    }

    const char = this.characters[index];
    if (!char.deleted) {
      char.deleted = true;
      return char;
    }
    return undefined;
  }

  toString(): string {
    return this.characters
      .filter((char) => !char.deleted)
      .map((char) => char.value)
      .join("");
  }

  getState(): Character[] {
    return sortBy([...this.characters], (char) => char.position);
  }

  getClock(): number {
    return this.clock;
  }

  getID(): string {
    return this.siteId;
  }
}

export { Character, CRDT };
export type { ICharacter, CharacterProperties };
