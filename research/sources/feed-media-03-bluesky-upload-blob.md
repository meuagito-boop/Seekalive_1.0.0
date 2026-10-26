# Bluesky AT Protocol lexicon: com.atproto.repo.uploadBlob

Canonical URL: https://raw.githubusercontent.com/bluesky-social/atproto/main/lexicons/com/atproto/repo/uploadBlob.json  
Accessed: 2026-10-26  

```json
{
  "lexicon": 1,
  "id": "com.atproto.repo.uploadBlob",
  "defs": {
    "main": {
      "type": "procedure",
      "description": "Upload a new blob, to be referenced from a repository record. The blob will be deleted if it is not referenced within a time window (eg, minutes). Blob restrictions (mimetype, size, etc) are enforced when the reference is created. Requires auth, implemented by PDS.",
      "input": {
        "encoding": "*/*"
      },
      "output": {
        "encoding": "application/json",
        "schema": {
          "type": "object",
          "required": ["blob"],
          "properties": {
            "blob": { "type": "blob" }
          }
        }
      }
    }
  }
}

```
