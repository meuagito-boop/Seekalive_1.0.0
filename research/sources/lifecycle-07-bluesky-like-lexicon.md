# AT Protocol app.bsky.feed.like Lexicon

- Canonical URL: https://raw.githubusercontent.com/bluesky-social/atproto/57c85d5ea03583dae3ae8d1f51106210dcad315b/packages/api/lexicons/app/bsky/feed/like.json
- Accessed: 2026-10-26
- Publication date: not specified in the source; commit 57c85d5ea03583dae3ae8d1f51106210dcad315b.

```json
{
  "lexicon": 1,
  "id": "app.bsky.feed.like",
  "defs": {
    "main": {
      "type": "record",
      "description": "Record declaring a 'like' of a piece of subject content.",
      "key": "tid",
      "record": {
        "type": "object",
        "required": ["subject", "createdAt"],
        "properties": {
          "subject": { "type": "ref", "ref": "com.atproto.repo.strongRef" },
          "createdAt": { "type": "string", "format": "datetime" },
          "via": { "type": "ref", "ref": "com.atproto.repo.strongRef" }
        }
      }
    }
  }
}

```
