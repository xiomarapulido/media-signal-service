import {
  BooleanSearchTokenizerError,
  BooleanTokenType,
  type BooleanSearchToken,
} from "./boolean-search.types.js";

const WHITESPACE_PATTERN = /\s/;

interface TokenReadResult {
  token: BooleanSearchToken;
  nextPosition: number;
}

/**
 * Converts a Boolean search query into a flat list of tokens.
 *
 * Expression validation, operator precedence, and parsing are intentionally
 * left for later stages.
 */
export function tokenizeBooleanSearch(
  query: string,
): BooleanSearchToken[] {
  const tokens: BooleanSearchToken[] = [];
  let position = 0;

  while (position < query.length) {
    const character = query[position];

    if (character === undefined) {
      break;
    }

    if (WHITESPACE_PATTERN.test(character)) {
      position++;
      continue;
    }

    if (character === "(") {
      tokens.push({
        type: BooleanTokenType.LeftParen,
        value: character,
        position,
      });

      position++;
      continue;
    }

    if (character === ")") {
      tokens.push({
        type: BooleanTokenType.RightParen,
        value: character,
        position,
      });

      position++;
      continue;
    }

    if (character === '"') {
      const result = readPhrase(query, position);

      tokens.push(result.token);
      position = result.nextPosition;
      continue;
    }

    const result = readWord(query, position);

    tokens.push(result.token);
    position = result.nextPosition;
  }

  return combineAndNotOperators(tokens);
}

/**
 * Reads a quoted phrase and supports escaped quotes and backslashes.
 */
function readPhrase(
  query: string,
  startPosition: number,
): TokenReadResult {
  let position = startPosition + 1;
  let value = "";

  while (position < query.length) {
    const character = query[position];

    if (character === undefined) {
      break;
    }

    if (character === "\\") {
      const nextCharacter = query[position + 1];

      if (nextCharacter === '"' || nextCharacter === "\\") {
        value += nextCharacter;
        position += 2;
        continue;
      }

      value += character;
      position++;
      continue;
    }

    if (character === '"') {
      return {
        token: {
          type: BooleanTokenType.Phrase,
          value,
          position: startPosition,
        },
        nextPosition: position + 1,
      };
    }

    value += character;
    position++;
  }

  throw new BooleanSearchTokenizerError(
    "Unterminated quoted phrase.",
    startPosition,
  );
}

/**
 * Reads a word until whitespace, a parenthesis, or a quote is found.
 */
function readWord(
  query: string,
  startPosition: number,
): TokenReadResult {
  let position = startPosition;

  while (position < query.length) {
    const character = query[position];

    if (character === undefined) {
      break;
    }

    if (
      WHITESPACE_PATTERN.test(character) ||
      character === "(" ||
      character === ")" ||
      character === '"'
    ) {
      break;
    }

    position++;
  }

  const value = query.slice(startPosition, position);

  return {
    token: {
      type: getWordTokenType(value),
      value,
      position: startPosition,
    },
    nextPosition: position,
  };
}

/**
 * Boolean operators are case-sensitive.
 *
 * Lowercase words such as "and", "or", and "not" remain regular terms.
 */
function getWordTokenType(value: string): BooleanTokenType {
  if (value === "AND") {
    return BooleanTokenType.And;
  }

  if (value === "OR") {
    return BooleanTokenType.Or;
  }

  if (value.includes("*")) {
    return BooleanTokenType.Wildcard;
  }

  return BooleanTokenType.Term;
}

/**
 * Combines consecutive uppercase AND and NOT tokens into one AND NOT token.
 *
 * NOT by itself remains a regular search term.
 */
function combineAndNotOperators(
  tokens: BooleanSearchToken[],
): BooleanSearchToken[] {
  const combinedTokens: BooleanSearchToken[] = [];
  let index = 0;

  while (index < tokens.length) {
    const currentToken = tokens[index];

    if (currentToken === undefined) {
      break;
    }

    const nextToken = tokens[index + 1];

    if (
      currentToken.type === BooleanTokenType.And &&
      nextToken?.type === BooleanTokenType.Term &&
      nextToken.value === "NOT"
    ) {
      combinedTokens.push({
        type: BooleanTokenType.AndNot,
        value: "AND NOT",
        position: currentToken.position,
      });

      index += 2;
      continue;
    }

    combinedTokens.push(currentToken);
    index++;
  }

  return combinedTokens;
}