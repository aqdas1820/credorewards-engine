/** JSON Pointer into the catalog input. */
export interface CatalogSchemaIssue {
  instancePath: string;
  keyword: string;
  message: string;
}

/**
 * Checks all constraints used by the packaged v1 JSON Schema authoring
 * contract. Not an arbitrary Draft 2020-12 schema engine or issuer proof.
 */
export declare function validateCatalogJsonSchema(
  value: unknown
): { valid: boolean; errors: CatalogSchemaIssue[] };
