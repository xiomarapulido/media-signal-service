import {
  BooleanSearchParserError,
  BooleanTokenType,
  type BooleanSearchBinaryNode,
  type BooleanSearchNode,
  type BooleanSearchToken,
  type BooleanSearchValueNode,
} from "./boolean-search.types.js";

/**
 * Converts Boolean search tokens into an expression tree.
 *
 * Operator precedence:
 * 1. Parentheses
 * 2. AND and AND NOT
 * 3. OR
 */
export function parseBooleanSearch(
  tokens: BooleanSearchToken[],
): BooleanSearchNode {
  if (tokens.length === 0) {
    throw new BooleanSearchParserError(
      "Search query cannot be empty.",
      0,
    );
  }

  const parser = new BooleanSearchParser(tokens);
  return parser.parse();
}

class BooleanSearchParser {
  private position = 0;

  constructor(private readonly tokens: BooleanSearchToken[]) {}

  parse(): BooleanSearchNode {
    const expression = this.parseOrExpression();
    const remainingToken = this.currentToken();

    if (remainingToken !== undefined) {
      if (remainingToken.type === BooleanTokenType.RightParen) {
        throw new BooleanSearchParserError(
          "Unexpected closing parenthesis.",
          remainingToken.position,
        );
      }

      throw new BooleanSearchParserError(
        `Unexpected token "${remainingToken.value}".`,
        remainingToken.position,
      );
    }

    return expression;
  }

  /**
   * Parses OR expressions after higher-precedence operators have
   * already been processed.
   */
  private parseOrExpression(): BooleanSearchNode {
    let left = this.parseAndExpression();

    while (this.match(BooleanTokenType.Or)) {
      const operator = this.previousToken();
      const right = this.parseAndExpression();

      left = this.createBinaryNode(operator, left, right);
    }

    return left;
  }

  /**
   * Parses AND and AND NOT expressions.
   *
   * Both operators currently have the same precedence and are evaluated
   * from left to right.
   */
  private parseAndExpression(): BooleanSearchNode {
    let left = this.parsePrimaryExpression();

    while (
      this.check(BooleanTokenType.And) ||
      this.check(BooleanTokenType.AndNot)
    ) {
      const operator = this.advance();
      const right = this.parsePrimaryExpression();

      left = this.createBinaryNode(operator, left, right);
    }

    return left;
  }

  /**
   * Parses search values and nested parenthesized expressions.
   */
  private parsePrimaryExpression(): BooleanSearchNode {
    const token = this.currentToken();

    if (token === undefined) {
      const previous = this.previousToken();

      throw new BooleanSearchParserError(
        "Expected a search term.",
        previous?.position ?? 0,
      );
    }

    if (token.type === BooleanTokenType.LeftParen) {
      const openingParenthesis = this.advance();

      if (this.check(BooleanTokenType.RightParen)) {
        const closingParenthesis = this.currentToken();

        throw new BooleanSearchParserError(
          "Parentheses cannot be empty.",
          closingParenthesis?.position ?? openingParenthesis.position,
        );
      }

      const expression = this.parseOrExpression();
      const closingParenthesis = this.currentToken();

      if (
        closingParenthesis === undefined ||
        closingParenthesis.type !== BooleanTokenType.RightParen
      ) {
        throw new BooleanSearchParserError(
          "Missing closing parenthesis.",
          openingParenthesis.position,
        );
      }

      this.advance();
      return expression;
    }

    if (token.type === BooleanTokenType.RightParen) {
      throw new BooleanSearchParserError(
        "Unexpected closing parenthesis.",
        token.position,
      );
    }

    if (this.isOperator(token)) {
      throw new BooleanSearchParserError(
        `Unexpected operator "${token.value}".`,
        token.position,
      );
    }

    this.advance();
    return this.createValueNode(token);
  }

  private createValueNode(
    token: BooleanSearchToken,
  ): BooleanSearchValueNode {
    switch (token.type) {
      case BooleanTokenType.Term:
        return {
          type: "TERM",
          value: token.value,
        };

      case BooleanTokenType.Phrase:
        return {
          type: "PHRASE",
          value: token.value,
        };

      case BooleanTokenType.Wildcard:
        return {
          type: "WILDCARD",
          value: token.value,
        };

      default:
        throw new BooleanSearchParserError(
          `Expected a search term but received "${token.value}".`,
          token.position,
        );
    }
  }

  private createBinaryNode(
    operator: BooleanSearchToken | undefined,
    left: BooleanSearchNode,
    right: BooleanSearchNode,
  ): BooleanSearchBinaryNode {
    if (operator === undefined) {
      throw new BooleanSearchParserError(
        "Expected a Boolean operator.",
        0,
      );
    }

    switch (operator.type) {
      case BooleanTokenType.And:
        return {
          type: "AND",
          left,
          right,
        };

      case BooleanTokenType.Or:
        return {
          type: "OR",
          left,
          right,
        };

      case BooleanTokenType.AndNot:
        return {
          type: "AND_NOT",
          left,
          right,
        };

      default:
        throw new BooleanSearchParserError(
          `Invalid Boolean operator "${operator.value}".`,
          operator.position,
        );
    }
  }

  private match(type: BooleanTokenType): boolean {
    if (!this.check(type)) {
      return false;
    }

    this.advance();
    return true;
  }

  private check(type: BooleanTokenType): boolean {
    return this.currentToken()?.type === type;
  }

  private advance(): BooleanSearchToken {
    const token = this.currentToken();

    if (token === undefined) {
      const previous = this.previousToken();

      throw new BooleanSearchParserError(
        "Unexpected end of search query.",
        previous?.position ?? 0,
      );
    }

    this.position++;
    return token;
  }

  private currentToken(): BooleanSearchToken | undefined {
    return this.tokens[this.position];
  }

  private previousToken(): BooleanSearchToken | undefined {
    return this.tokens[this.position - 1];
  }

  private isOperator(token: BooleanSearchToken): boolean {
    return (
      token.type === BooleanTokenType.And ||
      token.type === BooleanTokenType.Or ||
      token.type === BooleanTokenType.AndNot
    );
  }
}