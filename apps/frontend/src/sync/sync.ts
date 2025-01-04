import { sortBy } from "lodash";

type Position = number[];

interface ICharacter {
  id: string;
  value: string;
  position: Position;
  siteId: string;
  clock: number;
  deleted: boolean;
  property: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    color?: string;
  };
}

class Character implements ICharacter {
  constructor(
    public id: string,
    public value: string,
    public position: Position,
    public siteId: string,
    public clock: number,
    public deleted: boolean = false,
    public property: {
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
      color?: string;
    } = {} // Default to an empty object for simplicity
  ) {}

  compareTo(other: Character): number {
    console.log(this.position, other.position);

    // Compare positions first
    for (
      let i = 0;
      i < Math.min(this.position.length, other.position.length);
      i++
    ) {
      if (this.position[i] < other.position[i]) return -1;
      if (this.position[i] > other.position[i]) return 1;
    }

    // If positions are equal, shorter array comes first
    if (this.position.length < other.position.length) return -1;
    if (this.position.length > other.position.length) return 1;

    // If positions are identical, compare site IDs
    if (this.siteId < other.siteId) return -1;
    if (this.siteId > other.siteId) return 1;

    return 0;
  }
}

interface ICRDT {
  insert(value: string, index: number): Character;
  delete(index: number): Character | undefined;
  integrate(char: Character): number;
  toString(): string;
}

class CRDT implements ICRDT {
  private characters: Character[] = [];
  private clock: number = 0;
  private readonly base: number = 32;

  constructor(private siteId: string) {}

  getID(): string {
    return this.siteId;
  }

  //   private generatePositionBetween(
  //     prev: Character | null,
  //     next: Character | null
  //   ): Position {
  //     if (!prev && !next) {
  //       return [Math.floor(this.base / 2)];
  //     }

  //     if (!prev) {
  //       const newPos = next
  //         ? new Array(next.position.length)
  //             .fill(0)
  //             .map((_, i) => Math.floor(next.position[i] / 2))
  //         : [Math.floor(this.base / 2)];
  //       return newPos;
  //     }

  //     if (!next) {
  //       // Use the last value of prev.
  //       const last = prev.position[prev.position.length - 1];
  //       return [...prev.position!, last + 1]; // Increment the last value without adding extra levels.
  //     }

  //     const minLength = Math.min(prev.position.length, next.position.length);

  //     for (let i = 0; i < minLength; i++) {
  //       const difference = next.position[i] - prev.position[i];
  //       if (difference > 1) {
  //         const newPos = [...prev.position];
  //         newPos[i] = prev.position[i] + Math.floor(difference / 2);
  //         return newPos;
  //       }
  //     }

  //     return [...prev.position, Math.floor(this.base / 2)];
  //   }

  generatePositionBetween(
    prev: Position | null,
    next: Position | null,
    maxDepth: number = 2
  ): Position {
    const prevPosition = prev || [];
    const nextPosition = next || [];

    const newPosition: Position = [];

    for (let depth = 0; depth < maxDepth; depth++) {
      const prevValue = prevPosition[depth] ?? 0; // Default to 0 if depth not defined
      const nextValue = nextPosition[depth] ?? this.base; // Default to `base` if no `next`

      if (nextValue - prevValue > 1) {
        // Enough space to create a midpoint
        const midpoint = Math.floor((prevValue + nextValue) / 2);
        newPosition.push(midpoint);
        return newPosition;
      } else {
        // No space; reuse current values and go deeper
        newPosition.push(prevValue);
      }
    }

    // If we exhausted `maxDepth`, fall back to appending a fractional value
    newPosition.push(this.base / 2);
    return newPosition;
  }

  insert(value: string, index: number): Character {
    const prev = index > 0 ? this.characters[index - 1] : null; //0 -> a ,
    const next = index < this.characters.length ? this.characters[index] : null;

    const position = this.generatePositionBetween(prev, next);
    console.log("Position", position); // [16, 16]

    const id = `${this.siteId}-${this.clock}`;

    const char = new Character(id, value, position, this.siteId, this.clock++);

    this.characters.splice(index, 0, char);
    return char;
  }

  delete(index: number): Character | undefined {
    const char = this.characters[index];

    if (!char) {
      return undefined;
    }

    if (char.deleted) return undefined;

    char.deleted = true;

    return char;
  }

  //   integrate(char: Character): number {
  //     let index = 0;
  //     while (
  //       index < this.characters.length &&
  //       this.characters[index].compareTo(char) < 0
  //     ) {
  //       index++;
  //     }

  //     this.characters.splice(index, 0, char);
  //     return index;
  //   }

  integrate(char: Character): number {
    if (!char || !char.position || !char.siteId) {
      throw new Error("Invalid character");
    }

    let low = 0;
    let high = this.characters.length;

    // Binary search for insertion point
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (this.characters[mid].compareTo(char) < 0) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }

    this.characters.splice(low, 0, char);
    return low;
  }

  toString(): string {
    return this.characters
      .map((char) => {
        if (char.deleted) return "";
        return char.value;
      })
      .join("");
  }

  getState(): Character[] {
    const sorted_characters = sortBy(this.characters, (char) => char.position);

    return [...sorted_characters];
  }

  getClock(): number {
    return this.clock;
  }
}

export type { ICharacter, ICRDT };
export { Character, CRDT };

// need to create singleton
