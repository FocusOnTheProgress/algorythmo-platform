# MCP Setup — Algorythmo Brain (Day-1 stdio)

This guide is for the founder (Day-1 dogfooding). Client PME configuration is M3.5+.

## What this is

The Algorythmo Brain exposes a Model Context Protocol (MCP) server via stdio transport.
Cursor and Claude Code spawn a `gbrain serve --stdio` subprocess per session.
The subprocess stays alive for the session duration and exits when the client disconnects.

## Step 1 — Generate an MCP token in the Brain panel

1. Go to **Brain** in the Algorythmo OS sidebar.
2. Open **Config** (top-right of Brain panel).
3. Click **Generate MCP token**.
4. Select scope (default: `read:truth` for read-only Brain queries; use `write:capture` to let Cursor write back into the Brain).

The UI will display a terminal command — copy it.

## Step 2 — Configure Cursor (or Claude Code)

### Cursor

Open or create `~/.cursor/mcp.json` and add:

```json
{
  "mcpServers": {
    "algorythmo-brain": {
      "command": "gbrain",
      "args": ["serve", "--stdio", "--auth-file", "~/.algorythmo/mcp/token-<your-session-id>"]
    }
  }
}
```

Replace the `--auth-file` path with the exact path shown in the panel after generating the token.

### Claude Code

In your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "algorythmo-brain": {
      "command": "gbrain",
      "args": ["serve", "--stdio", "--auth-file", "~/.algorythmo/mcp/token-<your-session-id>"]
    }
  }
}
```

## Token security rules

- The token file lives at `~/.algorythmo/mcp/token-<session-id>` with mode **0600** (owner read/write only).
- **Never commit this file** to git. Add `~/.algorythmo/` to your global `.gitignore`.
- The raw token is never echoed to your terminal, never logged, and never in CLI arguments. It is only in the file.
- Tokens expire after **8 hours of inactivity** (TTL slides on each Brain call).

## Revoking sessions

To invalidate all active MCP sessions immediately:

1. Go to **Brain** > **Config** > **Revoke all sessions**.

Or via the API:

```
DELETE /algorythmo/api/v1/accounts/<account_id>/brain/mcp_sessions
```

Sessions remain valid in the Redis cache for up to 5 minutes after revocation.
For Day-1 dogfooding this window is acceptable.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `mcp/auth_expired` error in Cursor | Token TTL elapsed (8h idle) | Generate a new token in Brain Config |
| `mcp/auth_unavailable` error | Redis or DB down | Check infra health; retry when recovered |
| `gbrain: command not found` | GBrain not in PATH | Follow GBrain install guide; check SHA pin |
| Token file not found | Wrong path in mcp.json | Re-copy command from Brain Config panel |

## Architecture note (M3.5)

Day-1 uses stdio transport — each Cursor session spawns its own `gbrain serve --stdio` subprocess.
M3.5 will upgrade to HTTP+OAuth (daemon per account via `GBRAIN_DATABASE_URL`) for Manu agent connections.
The token file approach will be replaced by OAuth Dynamic Client Registration (RFC 7591).
