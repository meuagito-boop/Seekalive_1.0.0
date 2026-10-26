# AT Protocol com.atproto.repo.deleteRecord Lexicon

- Canonical URL: https://raw.githubusercontent.com/bluesky-social/atproto/57c85d5ea03583dae3ae8d1f51106210dcad315b/lexicons/com/atproto/repo/deleteRecord.json
- Accessed: 2026-10-26
- Publication date: not specified in the source; commit 57c85d5ea03583dae3ae8d1f51106210dcad315b.

```json
{
  "lexicon": 1,
  "id": "com.atproto.repo.deleteRecord",
  "defs": {
    "main": {
      "type": "procedure",
      "description": "Delete a repository record, or ensure it doesn't exist. Requires auth, implemented by PDS.",
      "input": {
        "encoding": "application/json",
        "schema": {
          "type": "object",
          "required": ["repo", "collection", "rkey"],
          "properties": {
            "repo": {
              "type": "string",
              "format": "at-identifier",
              "description": "The handle or DID of the repo (aka, current account)."
            },
            "collection": {
              "type": "string",
              "format": "nsid",
              "description": "The NSID of the record collection."
            },
            "rkey": {
              "type": "string",
              "format": "record-key",
              "description": "The Record Key."
            },
            "swapRecord": {
              "type": "string",
              "format": "cid",
              "description": "Compare and swap with the previous record by CID."
            },
            "swapCommit": {
              "type": "string",
              "format": "cid",
              "description": "Compare and swap with the previous commit by CID."
            }
          }
        }
      },
      "output": {
        "encoding": "application/json",
        "schema": {
          "type": "object",
          "properties": {
            "commit": {
              "type": "ref",
              "ref": "com.atproto.repo.defs#commitMeta"
            }
          }
        }
      },
      "errors": [{ "name": "InvalidSwap" }]
    }
  }
}

```
