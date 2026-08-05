// core/SchemaValidator.js
// IMMUTABLE CORE — pure-function JSON-schema-ish validator. No external dep.
// Why: the Resolver uses this to REJECT alien components at boot. If you can't validate, you can't guard.

export class SchemaValidator {
  /**
   * Validate a value against a schema.
   * @param {*} value
   * @param {Object} schema
   * @returns {{ ok: boolean, errors: string[] }}
   */
  static validate(value, schema) {
    const errors = [];
    SchemaValidator._validate(value, schema, '', errors);
    return { ok: errors.length === 0, errors };
  }

  static _validate(value, schema, path, errors) {
    if (schema.type) {
      if (!SchemaValidator._checkType(value, schema.type)) {
        errors.push(`${path || '<root>'}: expected ${schema.type}, got ${SchemaValidator._typeof(value)}`);
        return;
      }
    }

    if (schema.enum && !schema.enum.includes(value)) {
      errors.push(`${path || '<root>'}: value "${value}" not in enum [${schema.enum.join(', ')}]`);
    }

    if (schema.pattern && typeof value === 'string' && !new RegExp(schema.pattern).test(value)) {
      errors.push(`${path || '<root>'}: string "${value}" does not match pattern ${schema.pattern}`);
    }

    if (typeof value === 'string') {
      if (schema.minLength != null && value.length < schema.minLength) errors.push(`${path}: minLength ${schema.minLength} violated (got ${value.length})`);
      if (schema.maxLength != null && value.length > schema.maxLength) errors.push(`${path}: maxLength ${schema.maxLength} violated (got ${value.length})`);
    }

    if (typeof value === 'number') {
      if (schema.minimum != null && value < schema.minimum) errors.push(`${path}: minimum ${schema.minimum} violated (got ${value})`);
      if (schema.maximum != null && value > schema.maximum) errors.push(`${path}: maximum ${schema.maximum} violated (got ${value})`);
    }

    if (Array.isArray(value) && schema.minItems != null && value.length < schema.minItems) {
      errors.push(`${path}: minItems ${schema.minItems} violated (got ${value.length})`);
    }

    if (schema.type === 'object' && value != null) {
      for (const field of schema.required || []) {
        if (!(field in value)) errors.push(`${path}: missing required field "${field}"`);
      }
      if (schema.properties) {
        for (const [key, subSchema] of Object.entries(schema.properties)) {
          if (key in value) SchemaValidator._validate(value[key], subSchema, path ? `${path}.${key}` : key, errors);
        }
      }
      if (schema.additionalProperties === false) {
        const known = new Set([...(schema.required || []), ...Object.keys(schema.properties || {})]);
        for (const key of Object.keys(value)) {
          if (!known.has(key)) errors.push(`${path}: additional property "${key}" not allowed`);
        }
      }
    }

    if (schema.type === 'array' && Array.isArray(value) && schema.items) {
      value.forEach((item, i) => SchemaValidator._validate(item, schema.items, `${path}[${i}]`, errors));
    }
  }

  static _checkType(value, type) {
    if (Array.isArray(type)) return type.some(t => SchemaValidator._checkType(value, t));
    switch (type) {
      case 'string':  return typeof value === 'string';
      case 'number':  return typeof value === 'number' && !isNaN(value);
      case 'integer': return typeof value === 'number' && Number.isInteger(value);
      case 'boolean': return typeof value === 'boolean';
      case 'object':  return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'array':   return Array.isArray(value);
      case 'null':    return value === null;
      default:        return true;
    }
  }

  static _typeof(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }
}
