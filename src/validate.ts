/**
 * Lightweight JSON Schema validator for tool arguments.
 *
 * Catches common mistakes (missing required fields, wrong types, unknown params)
 * before making the network round-trip. The remote server does full jsonschema
 * validation as a second layer.
 *
 * Inlined from @toolforest/mcp-router to avoid cross-package dependency.
 */

/**
 * Validate args against a JSON Schema. Returns null if valid, or an error message.
 */
export function validateArgs(
  args: Record<string, unknown>,
  schema: Record<string, unknown>,
): string | null {
  const properties = schema.properties as Record<string, Record<string, unknown>> | undefined;
  const required = schema.required as string[] | undefined;

  // Check required fields
  if (required) {
    for (const field of required) {
      if (!(field in args) || args[field] === undefined) {
        return `Missing required parameter: '${field}'`;
      }
    }
  }

  // Check types and constraints of provided fields
  if (properties) {
    for (const [key, value] of Object.entries(args)) {
      const propSchema = properties[key];
      if (!propSchema) {
        if (schema.additionalProperties === false) {
          return `Unknown parameter: '${key}'`;
        }
        continue;
      }

      const expectedType = propSchema.type as string | string[] | undefined;
      if (expectedType && value !== null) {
        const typeErr = checkType(value, expectedType);
        if (typeErr) return `Parameter '${key}': ${typeErr}`;
      }

      // Enum constraint
      const enumValues = propSchema.enum as unknown[] | undefined;
      if (enumValues && !enumValues.includes(value)) {
        return `Parameter '${key}': must be one of: ${enumValues.map(String).join(', ')}`;
      }
    }
  }

  return null;
}

function checkType(value: unknown, expectedType: string | string[]): string | null {
  const types = Array.isArray(expectedType) ? expectedType : [expectedType];

  for (const t of types) {
    switch (t) {
      case 'string':
        if (typeof value === 'string') return null;
        break;
      case 'number':
      case 'integer':
        if (typeof value === 'number') return null;
        break;
      case 'boolean':
        if (typeof value === 'boolean') return null;
        break;
      case 'array':
        if (Array.isArray(value)) return null;
        break;
      case 'object':
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) return null;
        break;
      case 'null':
        if (value === null) return null;
        break;
      default:
        return null; // Unknown type keyword — pass through
    }
  }

  const got = Array.isArray(value) ? 'array' : typeof value;
  return `expected ${types.join(' | ')}, got ${got}`;
}
