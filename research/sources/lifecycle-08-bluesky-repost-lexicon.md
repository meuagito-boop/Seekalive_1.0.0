# AT Protocol app.bsky.feed.repost Lexicon

- Canonical URL: https://raw.githubusercontent.com/bluesky-social/atproto/57c85d5ea03583dae3ae8d1f51106210dcad315b/packages/api/lexicons/app/bsky/feed/repost.json
- Accessed: 2026-10-26
- Publication date: not specified in the source; commit 57c85d5ea03583dae3ae8d1f51106210dcad315b.

```json
{
  "lexicon": 1,
  "id": "app.bsky.feed.repost",
  "defs": {
    "main": {
      "description": "Record representing a 'repost' of an existing Bluesky post.",
      "type": "record",
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
