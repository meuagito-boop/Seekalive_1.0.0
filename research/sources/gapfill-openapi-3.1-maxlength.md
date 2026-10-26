# Evidence extract: OpenAPI Specification 3.1.1, Schema Object

- Source URL: https://spec.openapis.org/oas/v3.1.1.html#schema-object
- Title: OpenAPI Specification v3.1.1, section 4.8.24 Schema Object
- Publisher: OpenAPI Initiative
- Publication date/version: OpenAPI 3.1.1 (versioned specification; page identifies 3.1.1).
- Access date: 2026-10-26 (UTC)
- Evidence method: Retrieved the official specification directly with curl; extracted the relevant Schema Object text from the returned HTML.

## Relevant text

The Schema Object section says the Schema Object is a superset of JSON Schema Draft 2020-12. OAS 3.1 Schema Objects therefore use the JSON Schema validation vocabulary, including `maxLength`.

The corresponding JSON Schema Draft 2020-12 validation specification defines a string's length as its number of characters (per RFC 8259) and says a string is valid against `maxLength` only if its length is less than or equal to the specified value.

- JSON Schema validation source URL: https://json-schema.org/draft/2020-12/json-schema-validation#name-maxlength
- JSON Schema title: JSON Schema Validation: A Vocabulary for Structural Validation of JSON (Draft 2020-12), section 6.3.1 `maxLength`.

## Scope note

`maxLength` is a normative schema constraint for clients and validators that honor the OpenAPI document. It is not merely a descriptive suggestion. The page's value is a character count, not a byte count.
