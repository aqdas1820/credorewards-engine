import { readFileSync } from 'node:fs';

/**
 * Offline evaluator of every validation keyword currently used by the bundled
 * rule-catalog.v1.schema.json. No remote schemas, eval or network requests.
 *
 * This is NOT a general-purpose JSON Schema Draft 2020-12 implementation.
 * Unsupported keywords in the bundled schema cause an explicit error rather
 * than silently skipping validation. Run validateRuleCatalog separately for
 * Gregorian dates, distinct IDs and cross-revision business constraints.
 */
const schema = JSON.parse(readFileSync(
  new URL('../schemas/rule-catalog.v1.schema.json', import.meta.url), 'utf8'
));

const supported = new Set([
  '$schema', '$id', '$defs', '$ref', 'title', 'description',
  'type', 'additionalProperties', 'required', 'properties',
  'const', 'enum', 'minItems', 'items', 'minLength', 'pattern',
  'minimum', 'maximum', 'allOf', 'if', 'then'
]);

function checkSchemaKeywords(node, location = '#') {
  if (!node || typeof node !== 'object' || Array.isArray(node)) {
    throw new Error('Unsupported catalog schema form at ' + location);
  }
  for (const [key, value] of Object.entries(node)) {
    if (!supported.has(key)) {
      throw new Error('Unsupported JSON Schema keyword ' + key + ' at ' + location);
    }
    if (key === '$defs' || key === 'properties') {
      for (const [name, child] of Object.entries(value)) {
        checkSchemaKeywords(child, location + '/' + key + '/' + name);
      }
    }
    if (key === 'items' || key === 'if' || key === 'then') {
      checkSchemaKeywords(value, location + '/' + key);
    }
    if (key === 'allOf') {
      for (let index = 0; index < value.length; index++) {
        checkSchemaKeywords(value[index], location + '/allOf/' + index);
      }
    }
  }
}

checkSchemaKeywords(schema);

const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const escapePointer = segment => String(segment).replace(/~/g, '~0').replace(/\//g, '~1');
const typeMatches = (input, type) => {
  switch (type) {
    case 'object': return input !== null && typeof input === 'object' && !Array.isArray(input);
    case 'array': return Array.isArray(input);
    case 'integer': return typeof input === 'number' && Number.isInteger(input);
    case 'number': return typeof input === 'number' && Number.isFinite(input);
    case 'string': return typeof input === 'string';
    case 'boolean': return typeof input === 'boolean';
    case 'null': return input === null;
    default: throw new Error('Unsupported schema type: ' + type);
  }
};

function record(errors, instancePath, keyword, message) {
  errors.push({ instancePath, keyword, message });
}

function resolveRef(ref) {
  if (!/^#\/\$defs\/[^/]+$/.test(ref)) {
    throw new Error('Only bundled local $defs references are permitted: ' + ref);
  }
  const key = ref.slice('#/$defs/'.length).replace(/~1/g, '/').replace(/~0/g, '~');
  const node = schema.$defs[key];
  if (!node) throw new Error('Missing bundled schema definition: ' + ref);
  return node;
}

function validateNode(node, input, path, errors) {
  if (node.$ref) validateNode(resolveRef(node.$ref), input, path, errors);
  if (node.type && !typeMatches(input, node.type)) {
    record(errors, path, 'type', 'must be ' + node.type);
    return;
  }
  if (own(node, 'const') && !Object.is(input, node.const)) {
    record(errors, path, 'const', 'must equal ' + JSON.stringify(node.const));
  }
  if (node.enum && !node.enum.some(item => Object.is(item, input))) {
    record(errors, path, 'enum', 'must be one of ' + node.enum.join(', '));
  }
  if (typeof input === 'string') {
    if (node.minLength !== undefined &&
      Array.from(input).length < node.minLength) {
      record(errors, path, 'minLength', 'must have at least ' + node.minLength + ' characters');
    }
    if (node.pattern && !new RegExp(node.pattern, 'u').test(input)) {
      record(errors, path, 'pattern', 'does not match required pattern');
    }
  }
  if (typeof input === 'number') {
    if (node.minimum !== undefined && input < node.minimum) {
      record(errors, path, 'minimum', 'must be >= ' + node.minimum);
    }
    if (node.maximum !== undefined && input > node.maximum) {
      record(errors, path, 'maximum', 'must be <= ' + node.maximum);
    }
  }
  if (Array.isArray(input)) {
    if (node.minItems !== undefined && input.length < node.minItems) {
      record(errors, path, 'minItems', 'requires at least ' + node.minItems + ' items');
    }
    if (node.items) input.forEach((item, index) =>
      validateNode(node.items, item, path + '/' + index, errors));
  }
  if (input !== null && typeof input === 'object' && !Array.isArray(input)) {
    if (node.required) {
      for (const key of node.required) {
        if (!own(input, key)) {
          record(errors, path + '/' + escapePointer(key), 'required', 'missing required property');
        }
      }
    }
    if (node.properties) {
      for (const [key, child] of Object.entries(node.properties)) {
        if (own(input, key)) {
          validateNode(child, input[key], path + '/' + escapePointer(key), errors);
        }
      }
    }
    if (node.additionalProperties === false) {
      for (const key of Object.keys(input)) {
        if (!own(node.properties ?? {}, key)) {
          record(errors, path + '/' + escapePointer(key), 'additionalProperties', 'unexpected property');
        }
      }
    }
  }
  if (node.allOf) {
    for (const child of node.allOf) validateNode(child, input, path, errors);
  }
  if (node.if) {
    const probe = [];
    validateNode(node.if, input, path, probe);
    if (probe.length === 0 && node.then) {
      validateNode(node.then, input, path, errors);
    }
  }
}

/**
 * Validate unknown JSON against ALL constraints declared in the shipped v1
 * schema, including unknown keys and conditional reviewer/evidence rules.
 * A valid result does not imply that the source issuer terms were verified.
 */
export function validateCatalogJsonSchema(value) {
  const errors = [];
  validateNode(schema, value, '', errors);
  return { valid: errors.length === 0, errors };
}
