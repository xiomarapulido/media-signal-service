import type {
  BooleanSearchNode,
  BooleanSearchSql,
  BooleanSearchValueNode,
} from "./boolean-search.types.js";

const SEARCHABLE_TEXT_SQL = `
  CONCAT_WS(
    ' ',
    headline,
    body,
    summary
  )
`;

export function buildBooleanSearchSql(
  expression: BooleanSearchNode,
  parameterOffset = 0,
): BooleanSearchSql {
  if (!Number.isInteger(parameterOffset) || parameterOffset < 0) {
    throw new Error("Parameter offset must be a non-negative integer.");
  }

  const values: string[] = [];
  const clause = compileNode(expression, values, parameterOffset);

  return {
    clause,
    values,
  };
}

function compileNode(
  node: BooleanSearchNode,
  values: string[],
  parameterOffset: number,
): string {
  switch (node.type) {
    case "TERM":
    case "PHRASE":
    case "WILDCARD":
      return compileValueNode(node, values, parameterOffset);

    case "AND": {
      const left = compileNode(node.left, values, parameterOffset);
      const right = compileNode(node.right, values, parameterOffset);

      return `(${left} AND ${right})`;
    }

    case "OR": {
      const left = compileNode(node.left, values, parameterOffset);
      const right = compileNode(node.right, values, parameterOffset);

      return `(${left} OR ${right})`;
    }

    case "AND_NOT": {
      const left = compileNode(node.left, values, parameterOffset);
      const right = compileNode(node.right, values, parameterOffset);

      return `(${left} AND NOT ${right})`;
    }
  }
}

function compileValueNode(
  node: BooleanSearchValueNode,
  values: string[],
  parameterOffset: number,
): string {
  const searchPattern = createSearchPattern(node);

  values.push(searchPattern);

  const parameterNumber = parameterOffset + values.length;

  return `(${SEARCHABLE_TEXT_SQL} ILIKE $${parameterNumber} ESCAPE '\\')`;
}

function createSearchPattern(node: BooleanSearchValueNode): string {
  const escapedValue = escapeLikePattern(node.value);

  if (node.type === "WILDCARD") {
    return `%${escapedValue.replaceAll("*", "%")}%`;
  }

  return `%${escapedValue}%`;
}

function escapeLikePattern(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("%", "\\%")
    .replaceAll("_", "\\_");
}