export enum BooleanTokenType {
  Term = "TERM",
  Phrase = "PHRASE",
  Wildcard = "WILDCARD",
  LeftParen = "LEFT_PAREN",
  RightParen = "RIGHT_PAREN",
  And = "AND",
  Or = "OR",
  AndNot = "AND_NOT",
}

export interface BooleanSearchToken {
  type: BooleanTokenType;
  value: string;
  position: number;
}

export type BooleanSearchNode =
  | BooleanSearchValueNode
  | BooleanSearchBinaryNode;

export interface BooleanSearchValueNode {
  type: "TERM" | "PHRASE" | "WILDCARD";
  value: string;
}

export interface BooleanSearchBinaryNode {
  type: "AND" | "OR" | "AND_NOT";
  left: BooleanSearchNode;
  right: BooleanSearchNode;
}

export class BooleanSearchTokenizerError extends Error {
  constructor(
    message: string,
    public readonly position: number,
  ) {
    super(message);
    this.name = "BooleanSearchTokenizerError";
  }
}

export class BooleanSearchParserError extends Error {
  constructor(
    message: string,
    public readonly position: number,
  ) {
    super(message);
    this.name = "BooleanSearchParserError";
  }
}

export interface BooleanSearchSql {
  clause: string;
  values: string[];
}