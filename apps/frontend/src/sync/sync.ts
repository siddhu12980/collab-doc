import { sortBy } from "lodash";

type Position = number[];

export function generateShortUUID(length: number = 10): string {
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
    const minLength = Math.min(this.position.length, other.position.length);

    for (let i = 0; i < minLength; i++) {
      if (this.position[i] !== other.position[i]) {
        return this.position[i] - other.position[i];
      }
    }

    if (this.position.length !== other.position.length) {
      return this.position.length - other.position.length;
    }

    const siteIdComparison = this.siteId.localeCompare(other.siteId);
    if (siteIdComparison !== 0) {
      return siteIdComparison;
    }

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

    const head = Math.floor(this.base / 2);
    const prevPos = prev ? [...prev] : [0];
    const nextPos = next ? [...next] : [this.base];

    const prevValue = prevPos[depth] ?? 0;
    const nextValue = nextPos[depth] ?? this.base;

    if (nextValue - prevValue > 1) {
      const newPos = prevPos.slice(0, depth);
      const midpoint =
        prevValue + Math.max(1, Math.floor((nextValue - prevValue) / 2));
      newPos[depth] = midpoint;
      return newPos;
    }

    if (depth >= prevPos.length) {
      return [...prevPos, head];
    }

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
    let start = 0;
    let end = this.characters.length;

    while (start < end) {
      const mid = Math.floor((start + end) / 2);
      const comparison = this.characters[mid].compareTo(characterInstance);
      
      if (comparison === 0) {
        if (this.characters[mid].siteId === characterInstance.siteId) {
          return this.characters[mid].clock < characterInstance.clock ? mid + 1 : mid;
        }
        return this.characters[mid].siteId < characterInstance.siteId ? mid + 1 : mid;
      }
      
      if (comparison < 0) {
        start = mid + 1;
      } else {
        end = mid;
      }
    }
    return start;
  }

  insert(value: string, index: number, properties?: CharacterProperties): Character {
    if (index < 0 || index > this.characters.length) {
      throw new Error("Invalid index");
    }

    if (index === 0 && this.characters.length === 0) {
      const position = [this.base / 2];
      const id = generateShortUUID(8);
      const char = new Character(id, value, position, this.siteId, this.clock++, false, properties);
      this.characters.push(char);
      return char;
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
    if (!char || !Array.isArray(char.position)) {
      throw new Error("Invalid character");
    }

    const characterInstance = this.ensureCharacterInstance(char);
    const index = this.findInsertIndex(characterInstance);

    if (index < this.characters.length) {
      const existing = this.characters[index];
      if (existing.siteId === characterInstance.siteId && 
          existing.clock === characterInstance.clock) {
        return -1;
      }
    }

    this.characters.splice(index, 0, characterInstance);
    this.clock = Math.max(this.clock, characterInstance.clock + 1);
    return index;
  }

  integrateFromDB(char: ICharacter): void {
    const characterInstance = this.ensureCharacterInstance(char);
    const index = this.findInsertIndex(characterInstance);
    this.characters.splice(index, 0, characterInstance);
    this.clock = Math.max(this.clock, characterInstance.clock + 1);
  }

  findCharacterByVisualIndex(index: number): Character | undefined {
    const visibleChars = this.characters
      .filter(char => !char.deleted)
      .sort((a, b) => a.compareTo(b));
    
    return visibleChars[index];
  }

  delete(visualIndex: number): Character | undefined {
    const targetChar = this.findCharacterByVisualIndex(visualIndex);
    if (!targetChar) return undefined;

    const actualChar = this.characters.find(
      char => 
        char.siteId === targetChar.siteId && 
        char.clock === targetChar.clock &&
        !char.deleted
    );

    if (actualChar) {
      actualChar.deleted = true;
      return actualChar;
    }

    return undefined;
  }

  toString(): string {
    return [...this.characters]
      .filter(char => !char.deleted)
      .sort((a, b) => {
        const posCompare = a.compareTo(b);
        if (posCompare !== 0) return posCompare;
        if (a.siteId !== b.siteId) return a.siteId < b.siteId ? -1 : 1;
        return a.clock - b.clock;
      })
      .map(char => char.value)
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

  getCharacters(): Character[] {
    return this.characters;
  }

  getID(): string {
    return this.siteId;
  }

  reset() {
    this.characters = [];
    this.clock = 0;
  }
}

export { Character, CRDT };
export type { ICharacter, CharacterProperties };
