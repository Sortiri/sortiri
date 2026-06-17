# Sortiri MCP + CLI setup (deprecated)

This document has been replaced by the open-source docs.

## Use these instead

- [MCP setup](mcp.md) — MCP server configuration and tools
- [Cursor setup](cursor.md) — Agent rules and starter prompt
- [Quickstart](quickstart.md) — 5-minute local setup
- [CLI reference](cli.md) — All commands

## Quick reference

```bash
npx sortiri init --yes
sortiri doctor
sortiri dev
```

MCP config:

```json
{
  "mcpServers": {
    "sortiri": {
      "command": "npx",
      "args": ["sortiri", "mcp"]
    }
  }
}
```

Local mode does not require Sortiri Cloud.
