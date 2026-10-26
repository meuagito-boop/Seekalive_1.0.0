# Evidence extract: Google AIP-158, Pagination

- Source URL: https://google.aip.dev/158
- Title: AIP-158: Pagination
- Publisher: Google API Improvement Proposals
- Publication date: Not stated on page; living guidance.
- Access date: 2026-10-26 (UTC)
- Evidence method: Retrieved the official page directly with curl; extracted relevant text from the returned HTML.

## Relevant text (AIP-158)

> Page tokens provided by APIs must be opaque (but URL-safe) strings, and must not be user-parseable. This is because if users are able to deconstruct these, they will do so. This effectively makes the implementation details of your API's pagination become part of the API surface, and it becomes impossible to update those details without breaking users.

> Warning: Base-64 encoding an otherwise-transparent page token is not a sufficient obfuscation mechanism.

> Page tokens must be limited to providing an indication of where to continue the pagination process only. They must not provide any form of authorization to the underlying resources, and authorization must be performed on the request as with any other regardless of the presence of a page token.

AIP-158 also specifies that request parameters other than the page-size parameter should match the request that produced the page token. The token may be expired after a reasonable time where applicable.

## Scope note

This is authoritative Google API design guidance, not a universal protocol requirement for all APIs. It does not prescribe a maximum token length or require that tokens be signed.
