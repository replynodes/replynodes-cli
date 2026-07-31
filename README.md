# replynodes-cli

[![npm version](https://img.shields.io/npm/v/replynodes-cli.svg)](https://www.npmjs.com/package/replynodes-cli)
[![License: MIT](https://img.shields.io/npm/l/replynodes-cli.svg)](https://github.com/replynodes/replynodes-cli/blob/main/LICENSE)

Command-line interface for [Replynodes](https://replynodes.com) — schedule
posts, manage connected channels, upload media, and pull analytics from your
terminal or scripts. Thin wrapper around the [Replynodes public
API](https://app.replynodes.com/api/public/v1).

## Install

```bash
npm install -g replynodes-cli
```

Or run without installing:

```bash
npx replynodes-cli --help
```

## Get an API key

1. Log in to [app.replynodes.com](https://app.replynodes.com).
2. Go to **Settings → API Keys** and create a key.
3. Keep it secret — it grants full access to your Replynodes organization.

## Authenticate

Either set an environment variable:

```bash
export REPLYNODES_API_KEY="your-api-key-here"
```

or save it locally (stored at `~/.config/replynodes-cli/config.json`, mode `0600`):

```bash
replynodes login your-api-key-here
```

Self-hosted instance? Point at it with `REPLYNODES_API_URL` (default
`https://app.replynodes.com/api`), or `replynodes login <key> --api-url <url>`.

## Usage

```bash
replynodes status                        # check the API key is valid
replynodes integrations list             # list connected channels
replynodes groups                        # list customers/groups

# Post a draft to one channel
replynodes posts create \
  --integration <integrationId> \
  --content "Hello from the CLI" \
  --type draft

# Schedule a post
replynodes posts create \
  --integration <integrationId> \
  --content "Scheduled post" \
  --type schedule \
  --date 2026-08-01T12:00:00.000Z

replynodes posts list --start 2026-08-01 --end 2026-08-31
replynodes posts delete <postId>

replynodes upload file ./image.png
replynodes upload url https://example.com/image.png

replynodes analytics channel <integrationId> --date 30
replynodes notifications
```

Run `replynodes <command> --help` for full options on any command; run
`replynodes help` for the full command tree (`posts`, `integrations`,
`groups`, `notifications`, `status`, `upload`, `analytics`, `video`).

### Complex posts (multi-channel, per-provider settings, media)

The `--integration`/`--content` flags cover the common single-channel case.
For multi-channel posts, provider-specific settings (e.g. Facebook post type,
X thread splitting), or attaching uploaded media, pass a full request body
with `--json`:

```bash
replynodes posts create --json '{
  "type": "schedule",
  "date": "2026-08-01T12:00:00.000Z",
  "shortLink": false,
  "tags": [],
  "posts": [
    {
      "integration": { "id": "<integrationId>" },
      "value": [{ "content": "Hello", "image": [] }]
    }
  ]
}'
```

`--json` also accepts `@path/to/file.json` to read the body from a file.
The same `<json>` / `@file` convention works for `integrations trigger
--data`, `video generate --params`, and `video function --params`.

## Commands

| Command | Description |
| --- | --- |
| `posts list` | List posts in a date range |
| `posts create` | Create a post (draft / schedule / now / update) |
| `posts delete <id>` | Delete a post |
| `posts delete-group <group>` | Delete all posts in a group |
| `posts status <id>` | Change post status (draft / schedule) |
| `posts release-id <id>` | Set the provider release id |
| `posts missing <id>` | Get missing/incomplete content details |
| `posts find-slot <integrationId>` | Find the next free scheduling slot |
| `integrations list` | List connected channels |
| `integrations delete <id>` | Disconnect a channel |
| `integrations auth-url <identifier>` | Get an OAuth connect URL |
| `integrations settings <id>` | Get provider settings schema/rules/tools |
| `integrations trigger <id>` | Call a provider tool method |
| `groups` | List customers/groups |
| `notifications` | List notifications |
| `status` | Check the API key is connected |
| `upload file <path>` | Upload a local image/video |
| `upload url <url>` | Upload media from a public URL |
| `analytics channel <id>` | Channel analytics |
| `analytics post <id>` | Post analytics |
| `video generate` | Generate an AI video |
| `video function` | Call a video provider function |

Alternatively, use the [Replynodes public API](https://app.replynodes.com/api/public/v1)
directly with curl, or the [`@postiz/node`](https://www.npmjs.com/package/@postiz/node)
SDK for programmatic Node.js use.

## Related

If you're scripting content creation as well as publishing, see
[Awesome Social Media Skills](https://github.com/replynodes/awesome-social-media-skills) —
an open-source library of portable AI agent skills (research, writing,
repurposing, review) that pairs naturally with this CLI's `posts create`
and `upload` commands.
