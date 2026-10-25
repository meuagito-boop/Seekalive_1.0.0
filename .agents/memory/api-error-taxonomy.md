---
name: API error code taxonomy
description: Keep HTTP status codes separate from numeric domain codes and stable textual error keys.
---

Keep HTTP status values in the shared error registry as a separate transport catalog, with one unique entry per supported status. Reserve HTTP family 300 for future catalog expansion if more than 100 HTTP error entries are needed. JSON application errors use unique numeric codes starting at 1000, grouped by domain families such as 1000 general, 1100 authentication, 1200 accounts, and 1300 social; every response carries both that code and a stable textual key.

**Why:** The user explicitly reserved the 400 family for HTTP, permitted the 300 family for HTTP catalog overflow, and clarified that application error families may use 1000, 1100, 1200, and higher.

**How to apply:** Keep HTTP statuses and domain error codes as distinct fields and catalogs. Give every application error a unique 1000+ code and stable key; never reuse a numeric code for different error meanings.
