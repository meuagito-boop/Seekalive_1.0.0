---
name: API error code taxonomy
description: Keep HTTP status codes separate from numeric domain codes and stable textual error keys.
---

Keep HTTP status values in the shared registry as transport metadata; a standard status may repeat across responses and is not the error identifier. The JSON `error.code` plus stable `key` uniquely identifies each application error, using 1000+ codes grouped by domain (1000 general, 1100 authentication, 1200 accounts, 1300 social). Reserve HTTP family 300 only for a future HTTP-specific catalog expansion if more than 100 entries are needed.

**Why:** The user requires distinct numbers for distinct error types, reserves family 400 for HTTP and allows family 300 for HTTP overflow, while application error families may use 1000, 1100, 1200, and higher.

**How to apply:** Keep the standard HTTP status separate from the response's error identifier. Verify `API_ERROR_CODES` has no duplicate values and never assign one application code to different error meanings.
