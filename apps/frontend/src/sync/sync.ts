import { sortBy } from "lodash";

type Position = number[];

export function generateShortUUID(length: number = 8): string {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const charactersLength = characters.length;

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charactersLength);
    result += characters.charAt(randomIndex);
  }

  return result;
}

interface ICharacter {
  id: string;
  value: string;
  position: Position;
  siteId: string;
  clock: number;
  deleted: boolean;
  properties?: CharacterProperties;
  compareTo(other: ICharacter): number;
}

 interface CharacterProperties {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  center?: boolean;
  left ?: boolean;
  right ?: boolean;
  strikethrough?: boolean;
  heading?: boolean;
  paragraph?: boolean;
  highlight?: boolean;
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

  compareTo(other: ICharacter): number {
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

    // If positions are identical, compare site IDs
    const siteIdComparison = this.siteId.localeCompare(other.siteId);
    if (siteIdComparison !== 0) {
      return siteIdComparison;
    }

    // If site IDs are identical, compare clocks
    return this.clock - other.clock;
  }
}

class CRDT {
  private characters: Character[] = [];
  private clock: number = 0;
  private readonly base: number = 32;
  private static instance: CRDT | null = null;

  private constructor(private siteId: string) {}

  static getInstance(siteId: string): CRDT {
    if (!CRDT.instance || CRDT.instance.siteId !== siteId) {
      CRDT.instance = new CRDT(siteId);
    }
    return CRDT.instance;
  }

  private generatePositionBetween(
    prev: Position | null,
    next: Position | null,
    depth: number = 0
  ): Position {
    // const MAX_DEPTH = 32;
    // if (depth >= MAX_DEPTH) {
    //   throw new Error("Maximum depth exceeded");
    // }

    // Initialize boundaries
    const head = Math.floor(this.base / 2);
    const prevPos = prev ? [...prev] : [0];
    const nextPos = next ? [...next] : [this.base];

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
    const newPos = [...prevPos];
    return this.generatePositionBetween(newPos, nextPos, depth + 1);
  }

  private ensureCharacterInstance(char: ICharacter): Character {
    if (char instanceof Character) {
      return char;
    }
    return new Character(
      char.id,
      char.value,
      char.position,
      char.siteId,
      char.clock,
      char.deleted,
      char.properties
    );
  }

  private findInsertIndex(char: ICharacter): number {
    const characterInstance = this.ensureCharacterInstance(char);
    let left = 0;
    let right = this.characters.length;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      const comparison = this.characters[mid].compareTo(characterInstance);

      if (comparison < 0) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    return left;
  }

  insert(
    value: string,
    index: number,
    properties?: CharacterProperties
  ): Character {
    if (index < 0 || index > this.characters.length) {
      throw new Error("Invalid index");
    }

    const prev = index > 0 ? this.characters[index - 1] : null;
    const next = index < this.characters.length ? this.characters[index] : null;

    const position = this.generatePositionBetween(
      prev?.position || null,
      next?.position || null
    );

    const id = generateShortUUID(8);
    const char = new Character(id, value, position, this.siteId, this.clock++, false, properties);
    const insertIndex = this.findInsertIndex(char);
    this.characters.splice(insertIndex, 0, char);

    return char;
  }

  integrate(char: ICharacter): number {
    if (!char || !Array.isArray(char.position) || !char.siteId) {
      throw new Error("Invalid character");
    }

    const characterInstance = this.ensureCharacterInstance(char);
    const index = this.findInsertIndex(characterInstance);

    if (index < this.characters.length) {
      const existingChar = this.characters[index];
      if (
        existingChar.siteId === characterInstance.siteId &&
        existingChar.clock === characterInstance.clock &&
        existingChar.id === characterInstance.id
      ) {
        return -1;
      }
    }

    this.characters.splice(index, 0, characterInstance);

    if (
      characterInstance.siteId === this.siteId &&
      characterInstance.clock >= this.clock
    ) {
      this.clock = characterInstance.clock + 1;
    }

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
    return sortBy([...this.characters], (char) => {
      const pos = char.position.join(",");
      return `${pos}-${char.siteId}-${char.clock}`;
    });
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
