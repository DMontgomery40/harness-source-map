# OpenCode CLI commands and flags

Every command, subcommand, option and positional argument the opencode CLI declares in its yargs command modules (68 commands, 99 options and arguments), with the help text it shows. Default commands are named after the module that declares them.

## opencode

### opencode [project]

start opencode tui

Source: [`opencode/src/cli/cmd/tui.ts:73`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/tui.ts#L73)

### opencode --agent

agent to use. Type: `string`.

Source: [`opencode/src/cli/cmd/tui.ts:104`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/tui.ts#L104)

### opencode --auto

auto-approve permissions that are not explicitly denied (dangerous!). Type: `boolean`.

Source: [`opencode/src/cli/cmd/tui.ts:108`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/tui.ts#L108)

### opencode --continue

continue the last session. Alias: `[`. Type: `boolean`.

Source: [`opencode/src/cli/cmd/tui.ts:86`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/tui.ts#L86)

### opencode --dangerously-skip-permissions

Option --dangerously-skip-permissions of opencode . Type: `boolean`.

Source: [`opencode/src/cli/cmd/tui.ts:118`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/tui.ts#L118)

### opencode --demo

Option --demo of opencode . Type: `boolean`.

Source: [`opencode/src/cli/cmd/tui.ts:140`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/tui.ts#L140)

### opencode --fork

fork the session when continuing (use with --continue or --session). Type: `boolean`.

Source: [`opencode/src/cli/cmd/tui.ts:96`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/tui.ts#L96)

### opencode --mini

start the minimal interactive interface. Type: `boolean`.

Source: [`opencode/src/cli/cmd/tui.ts:123`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/tui.ts#L123)

### opencode --model

model to use in the format of provider/model. Alias: `[`. Type: `string`.

Source: [`opencode/src/cli/cmd/tui.ts:81`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/tui.ts#L81)

### opencode --no-replay

disable mini session history replay on resume and after resize. Type: `boolean`.

Source: [`opencode/src/cli/cmd/tui.ts:132`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/tui.ts#L132)

### opencode --prompt

prompt to use. Type: `string`.

Source: [`opencode/src/cli/cmd/tui.ts:100`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/tui.ts#L100)

### opencode --replay

Option --replay of opencode . Type: `boolean`.

Source: [`opencode/src/cli/cmd/tui.ts:128`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/tui.ts#L128)

### opencode --replay-limit

cap visible mini replay to the newest N messages. Type: `number`.

Source: [`opencode/src/cli/cmd/tui.ts:136`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/tui.ts#L136)

### opencode --session

session id to continue. Alias: `[`. Type: `string`.

Source: [`opencode/src/cli/cmd/tui.ts:91`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/tui.ts#L91)

### opencode --yolo

Option --yolo of opencode . Type: `boolean`.

Source: [`opencode/src/cli/cmd/tui.ts:113`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/tui.ts#L113)

### opencode <project>

path to start opencode in. Type: `string`.

Source: [`opencode/src/cli/cmd/tui.ts:77`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/tui.ts#L77)

## opencode acp

### opencode acp

start ACP (Agent Client Protocol) server

Source: [`opencode/src/cli/cmd/acp.ts:10`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/acp.ts#L10)

### opencode acp --cwd

working directory. Type: `string`.

Source: [`opencode/src/cli/cmd/acp.ts:13`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/acp.ts#L13)

## opencode agent

### opencode agent

manage agents

Source: [`opencode/src/cli/cmd/agent.ts:255`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/agent.ts#L255)

## opencode agent create

### opencode agent create

create a new agent

Source: [`opencode/src/cli/cmd/agent.ts:34`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/agent.ts#L34)

### opencode agent create --description

what the agent should do. Type: `string`.

Source: [`opencode/src/cli/cmd/agent.ts:42`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/agent.ts#L42)

### opencode agent create --mode

agent mode. Type: `string`.

Source: [`opencode/src/cli/cmd/agent.ts:46`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/agent.ts#L46)

### opencode agent create --model

model to use in the format of provider/model. Alias: `[`. Type: `string`.

Source: [`opencode/src/cli/cmd/agent.ts:56`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/agent.ts#L56)

### opencode agent create --path

directory path to generate the agent file. Type: `string`.

Source: [`opencode/src/cli/cmd/agent.ts:38`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/agent.ts#L38)

### opencode agent create --permissions

comma-separated list of permissions to allow (default: all). Available: "${AVAILABLE_PERMISSIONS.join(", ")}". Alias: `[`. Type: `string`.

Source: [`opencode/src/cli/cmd/agent.ts:51`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/agent.ts#L51)

## opencode agent list

### opencode agent list

list all available agents

Source: [`opencode/src/cli/cmd/agent.ts:235`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/agent.ts#L235)

## opencode attach

### opencode attach <url>

attach to a running opencode server

Source: [`opencode/src/cli/cmd/attach.ts:8`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/attach.ts#L8), [`opencode/src/cli/cmd/attach.ts:12`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/attach.ts#L12)

### opencode attach --continue

continue the last session. Alias: `[`. Type: `boolean`.

Source: [`opencode/src/cli/cmd/attach.ts:21`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/attach.ts#L21)

### opencode attach --dir

directory to run in. Type: `string`.

Source: [`opencode/src/cli/cmd/attach.ts:17`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/attach.ts#L17)

### opencode attach --fork

fork the session when continuing (use with --continue or --session). Type: `boolean`.

Source: [`opencode/src/cli/cmd/attach.ts:31`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/attach.ts#L31)

### opencode attach --mini

start the minimal interactive interface. Type: `boolean`.

Source: [`opencode/src/cli/cmd/attach.ts:45`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/attach.ts#L45)

### opencode attach --no-replay

disable mini session history replay on resume and after resize. Type: `boolean`.

Source: [`opencode/src/cli/cmd/attach.ts:54`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/attach.ts#L54)

### opencode attach --password

basic auth password (defaults to OPENCODE_SERVER_PASSWORD). Alias: `[`. Type: `string`.

Source: [`opencode/src/cli/cmd/attach.ts:35`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/attach.ts#L35)

### opencode attach --replay

Option --replay of opencode attach. Type: `boolean`.

Source: [`opencode/src/cli/cmd/attach.ts:50`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/attach.ts#L50)

### opencode attach --replay-limit

cap visible mini replay to the newest N messages. Type: `number`.

Source: [`opencode/src/cli/cmd/attach.ts:58`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/attach.ts#L58)

### opencode attach --session

session id to continue. Alias: `[`. Type: `string`.

Source: [`opencode/src/cli/cmd/attach.ts:26`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/attach.ts#L26)

### opencode attach --username

basic auth username (defaults to OPENCODE_SERVER_USERNAME or 'opencode'). Alias: `[`. Type: `string`.

Source: [`opencode/src/cli/cmd/attach.ts:40`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/attach.ts#L40)

## opencode console

### opencode console

log in to console

Source: [`opencode/src/cli/cmd/account.ts:238`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/account.ts#L238)

## opencode db

### opencode db

database tools

Source: [`opencode/src/cli/cmd/db.ts:55`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/db.ts#L55)

### opencode db [query]

open an interactive sqlite3 shell or run a query

Source: [`opencode/src/cli/cmd/db.ts:9`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/db.ts#L9)

### opencode db --format

Output format. Type: `string`.

Source: [`opencode/src/cli/cmd/db.ts:18`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/db.ts#L18)

### opencode db <query>

SQL query to execute. Type: `string`.

Source: [`opencode/src/cli/cmd/db.ts:14`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/db.ts#L14)

## opencode db path

### opencode db path

print the database path

Source: [`opencode/src/cli/cmd/db.ts:46`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/db.ts#L46)

## opencode debug

### opencode debug

debugging and troubleshooting tools

Source: [`opencode/src/cli/cmd/debug/index.ts:20`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/index.ts#L20)

## opencode debug agent

### opencode debug agent <name>

show agent configuration details

Source: [`opencode/src/cli/cmd/debug/agent.ts:5`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/agent.ts#L5), [`opencode/src/cli/cmd/debug/agent.ts:9`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/agent.ts#L9)

### opencode debug agent --params

Tool params as JSON or a JS object literal. Type: `string`.

Source: [`opencode/src/cli/cmd/debug/agent.ts:18`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/agent.ts#L18)

### opencode debug agent --tool

Tool id to execute. Type: `string`.

Source: [`opencode/src/cli/cmd/debug/agent.ts:14`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/agent.ts#L14)

## opencode debug config

### opencode debug config

show resolved configuration

Source: [`opencode/src/cli/cmd/debug/config.ts:7`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/config.ts#L7)

## opencode debug diagnostics

### opencode debug diagnostics <file>

get diagnostics for a file

Source: [`opencode/src/cli/cmd/debug/lsp.ts:16`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/lsp.ts#L16), [`opencode/src/cli/cmd/debug/lsp.ts:18`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/lsp.ts#L18)

## opencode debug diff

### opencode debug diff <hash>

show diff for a snapshot hash

Source: [`opencode/src/cli/cmd/debug/snapshot.ts:38`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/snapshot.ts#L38), [`opencode/src/cli/cmd/debug/snapshot.ts:41`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/snapshot.ts#L41)

## opencode debug document-symbols

### opencode debug document-symbols <uri>

get symbols from a document

Source: [`opencode/src/cli/cmd/debug/lsp.ts:42`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/lsp.ts#L42), [`opencode/src/cli/cmd/debug/lsp.ts:44`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/lsp.ts#L44)

## opencode debug file

### opencode debug file

file system debugging utilities

Source: [`opencode/src/cli/cmd/debug/file.ts:68`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/file.ts#L68)

## opencode debug files

### opencode debug files

list files using ripgrep

Source: [`opencode/src/cli/cmd/debug/ripgrep.ts:16`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/ripgrep.ts#L16)

### opencode debug files --glob

Glob pattern to match files. Type: `string`.

Source: [`opencode/src/cli/cmd/debug/ripgrep.ts:24`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/ripgrep.ts#L24)

### opencode debug files --limit

Limit number of results. Type: `number`.

Source: [`opencode/src/cli/cmd/debug/ripgrep.ts:28`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/ripgrep.ts#L28)

### opencode debug files --query

Filter files by query. Type: `string`.

Source: [`opencode/src/cli/cmd/debug/ripgrep.ts:20`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/ripgrep.ts#L20)

## opencode debug info

### opencode debug info

show debug information

Source: [`opencode/src/cli/cmd/debug/index.ts:50`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/index.ts#L50)

## opencode debug list

### opencode debug list <path>

list files in a directory

Source: [`opencode/src/cli/cmd/debug/file.ts:53`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/file.ts#L53), [`opencode/src/cli/cmd/debug/file.ts:56`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/file.ts#L56)

## opencode debug lsp

### opencode debug lsp

LSP debugging utilities

Source: [`opencode/src/cli/cmd/debug/lsp.ts:8`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/lsp.ts#L8)

## opencode debug patch

### opencode debug patch <hash>

show patch for a snapshot hash

Source: [`opencode/src/cli/cmd/debug/snapshot.ts:23`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/snapshot.ts#L23), [`opencode/src/cli/cmd/debug/snapshot.ts:26`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/snapshot.ts#L26)

## opencode debug paths

### opencode debug paths

show global paths (data, config, cache, state)

Source: [`opencode/src/cli/cmd/debug/index.ts:80`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/index.ts#L80)

## opencode debug read

### opencode debug read <path>

read file contents as JSON

Source: [`opencode/src/cli/cmd/debug/file.ts:32`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/file.ts#L32), [`opencode/src/cli/cmd/debug/file.ts:35`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/file.ts#L35)

## opencode debug rg

### opencode debug rg

ripgrep debugging utilities

Source: [`opencode/src/cli/cmd/debug/ripgrep.ts:9`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/ripgrep.ts#L9)

## opencode debug scrap

### opencode debug scrap

list all known projects

Source: [`opencode/src/cli/cmd/debug/scrap.ts:5`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/scrap.ts#L5)

## opencode debug search

### opencode debug search <pattern>

search file contents using ripgrep

Source: [`opencode/src/cli/cmd/debug/ripgrep.ts:48`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/ripgrep.ts#L48), [`opencode/src/cli/cmd/debug/ripgrep.ts:52`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/ripgrep.ts#L52)

### opencode debug search <query>

search files by query

Source: [`opencode/src/cli/cmd/debug/file.ts:17`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/file.ts#L17), [`opencode/src/cli/cmd/debug/file.ts:20`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/file.ts#L20)

### opencode debug search --glob

File glob patterns. Type: `array`.

Source: [`opencode/src/cli/cmd/debug/ripgrep.ts:57`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/ripgrep.ts#L57)

### opencode debug search --limit

Limit number of results. Type: `number`.

Source: [`opencode/src/cli/cmd/debug/ripgrep.ts:61`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/ripgrep.ts#L61)

## opencode debug skill

### opencode debug skill

list all available skills

Source: [`opencode/src/cli/cmd/debug/skill.ts:7`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/skill.ts#L7)

## opencode debug snapshot

### opencode debug snapshot

snapshot debugging utilities

Source: [`opencode/src/cli/cmd/debug/snapshot.ts:7`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/snapshot.ts#L7)

## opencode debug startup

### opencode debug startup

print startup timing

Source: [`opencode/src/cli/cmd/debug/startup.ts:5`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/startup.ts#L5)

## opencode debug symbols

### opencode debug symbols <query>

search workspace symbols

Source: [`opencode/src/cli/cmd/debug/lsp.ts:31`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/lsp.ts#L31), [`opencode/src/cli/cmd/debug/lsp.ts:33`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/lsp.ts#L33)

## opencode debug track

### opencode debug track

track current snapshot state

Source: [`opencode/src/cli/cmd/debug/snapshot.ts:14`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/snapshot.ts#L14)

## opencode debug v2

### opencode debug v2

debug v2 catalog and built-in plugins

Source: [`opencode/src/cli/cmd/debug/v2.ts:10`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/v2.ts#L10)

## opencode debug wait

### opencode debug wait

wait indefinitely (for debugging)

Source: [`opencode/src/cli/cmd/debug/index.ts:42`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/debug/index.ts#L42)

## opencode export

### opencode export [sessionID]

export session data as JSON

Source: [`opencode/src/cli/cmd/export.ts:223`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/export.ts#L223)

### opencode export --sanitize

redact sensitive transcript and file data. Type: `boolean`.

Source: [`opencode/src/cli/cmd/export.ts:231`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/export.ts#L231)

### opencode export <sessionID>

session id to export. Type: `string`.

Source: [`opencode/src/cli/cmd/export.ts:227`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/export.ts#L227)

## opencode generate

### opencode generate

CLI command generate.

Source: [`opencode/src/cli/cmd/generate.ts:6`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/generate.ts#L6)

## opencode github

### opencode github

manage GitHub agent

Source: [`opencode/src/cli/cmd/github.ts:38`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/github.ts#L38)

## opencode github install

### opencode github install

install the GitHub agent

Source: [`opencode/src/cli/cmd/github.ts:8`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/github.ts#L8)

## opencode github run

### opencode github run

run the GitHub agent

Source: [`opencode/src/cli/cmd/github.ts:18`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/github.ts#L18)

### opencode github run --event

GitHub mock event to run the agent for. Type: `string`.

Source: [`opencode/src/cli/cmd/github.ts:22`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/github.ts#L22)

### opencode github run --token

GitHub personal access token (github_pat_********). Type: `string`.

Source: [`opencode/src/cli/cmd/github.ts:26`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/github.ts#L26)

## opencode import

### opencode import <file>

import session data from JSON file or URL

Source: [`opencode/src/cli/cmd/import.ts:95`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/import.ts#L95), [`opencode/src/cli/cmd/import.ts:98`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/import.ts#L98)

## opencode login

### opencode login [url]

server URL

Source: [`opencode/src/cli/cmd/account.ts:178`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/account.ts#L178)

### opencode login <url>

server URL. Type: `string`.

Source: [`opencode/src/cli/cmd/account.ts:182`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/account.ts#L182)

## opencode logout

### opencode logout [email]

account email to log out from

Source: [`opencode/src/cli/cmd/account.ts:193`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/account.ts#L193)

### opencode logout <email>

account email to log out from. Type: `string`.

Source: [`opencode/src/cli/cmd/account.ts:197`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/account.ts#L197)

## opencode mcp

### opencode mcp

manage MCP (Model Context Protocol) servers

Source: [`opencode/src/cli/cmd/mcp.ts:96`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/mcp.ts#L96)

## opencode mcp add

### opencode mcp add [name]

add an MCP server

Source: [`opencode/src/cli/cmd/mcp.ts:430`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/mcp.ts#L430)

### opencode mcp add --env

environment variable for a local MCP server (KEY=VALUE). Type: `string`.

Source: [`opencode/src/cli/cmd/mcp.ts:442`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/mcp.ts#L442)

### opencode mcp add --header

HTTP header for a remote MCP server (KEY=VALUE). Type: `string`.

Source: [`opencode/src/cli/cmd/mcp.ts:447`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/mcp.ts#L447)

### opencode mcp add --url

URL for a remote MCP server. Type: `string`.

Source: [`opencode/src/cli/cmd/mcp.ts:438`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/mcp.ts#L438)

### opencode mcp add <name>

name of the MCP server. Type: `string`.

Source: [`opencode/src/cli/cmd/mcp.ts:434`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/mcp.ts#L434)

## opencode mcp auth

### opencode mcp auth [name]

authenticate with an OAuth-enabled MCP server

Source: [`opencode/src/cli/cmd/mcp.ts:171`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/mcp.ts#L171)

### opencode mcp auth <name>

name of the MCP server. Type: `string`.

Source: [`opencode/src/cli/cmd/mcp.ts:175`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/mcp.ts#L175)

## opencode mcp debug

### opencode mcp debug <name>

debug OAuth connection for an MCP server

Source: [`opencode/src/cli/cmd/mcp.ts:660`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/mcp.ts#L660), [`opencode/src/cli/cmd/mcp.ts:663`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/mcp.ts#L663)

## opencode mcp list

### opencode mcp list

list MCP servers and their status

Source: [`opencode/src/cli/cmd/mcp.ts:110`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/mcp.ts#L110), [`opencode/src/cli/cmd/mcp.ts:307`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/mcp.ts#L307)

## opencode mcp logout

### opencode mcp logout [name]

remove OAuth credentials for an MCP server

Source: [`opencode/src/cli/cmd/mcp.ts:337`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/mcp.ts#L337)

### opencode mcp logout <name>

name of the MCP server. Type: `string`.

Source: [`opencode/src/cli/cmd/mcp.ts:340`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/mcp.ts#L340)

## opencode models

### opencode models [provider]

list all available models

Source: [`opencode/src/cli/cmd/models.ts:9`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/models.ts#L9)

### opencode models --refresh

refresh the models cache from models.dev. Type: `boolean`.

Source: [`opencode/src/cli/cmd/models.ts:22`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/models.ts#L22)

### opencode models --verbose

use more verbose model output (includes metadata like costs). Type: `boolean`.

Source: [`opencode/src/cli/cmd/models.ts:18`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/models.ts#L18)

### opencode models <provider>

provider ID to filter models by. Type: `string`.

Source: [`opencode/src/cli/cmd/models.ts:13`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/models.ts#L13)

## opencode open

### opencode open

CLI command open.

Source: [`opencode/src/cli/cmd/account.ts:228`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/account.ts#L228)

## opencode orgs

### opencode orgs

CLI command orgs.

Source: [`opencode/src/cli/cmd/account.ts:218`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/account.ts#L218)

## opencode plugin

### opencode plugin <module>

install plugin and update config

Source: [`opencode/src/cli/cmd/plug.ts:179`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/plug.ts#L179), [`opencode/src/cli/cmd/plug.ts:184`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/plug.ts#L184)

### opencode plugin --force

replace existing plugin version. Alias: `[`. Type: `boolean`.

Source: [`opencode/src/cli/cmd/plug.ts:194`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/plug.ts#L194)

### opencode plugin --global

install in global config. Alias: `[`. Type: `boolean`.

Source: [`opencode/src/cli/cmd/plug.ts:188`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/plug.ts#L188)

## opencode pr

### opencode pr <number>

fetch and checkout a GitHub PR branch, then run opencode

Source: [`opencode/src/cli/cmd/pr.ts:9`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/pr.ts#L9), [`opencode/src/cli/cmd/pr.ts:12`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/pr.ts#L12)

## opencode providers

### opencode providers

manage AI providers and credentials

Source: [`opencode/src/cli/cmd/providers.ts:240`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/providers.ts#L240)

## opencode providers list

### opencode providers list

list providers and credentials

Source: [`opencode/src/cli/cmd/providers.ts:249`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/providers.ts#L249)

## opencode providers login

### opencode providers login [url]

log in to a provider

Source: [`opencode/src/cli/cmd/providers.ts:300`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/providers.ts#L300)

### opencode providers login --method

login method label (skips method selection). Alias: `[`. Type: `string`.

Source: [`opencode/src/cli/cmd/providers.ts:315`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/providers.ts#L315)

### opencode providers login --provider

provider id or name to log in to (skips provider selection). Alias: `[`. Type: `string`.

Source: [`opencode/src/cli/cmd/providers.ts:310`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/providers.ts#L310)

### opencode providers login <url>

opencode auth provider. Type: `string`.

Source: [`opencode/src/cli/cmd/providers.ts:306`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/providers.ts#L306)

## opencode providers logout

### opencode providers logout [provider]

log out from a configured provider

Source: [`opencode/src/cli/cmd/providers.ts:492`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/providers.ts#L492)

### opencode providers logout <provider>

provider id or name to log out from. Type: `string`.

Source: [`opencode/src/cli/cmd/providers.ts:495`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/providers.ts#L495)

## opencode run

### opencode run [message..]

run opencode with a message

Source: [`opencode/src/cli/cmd/run.ts:127`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/run.ts#L127)

### opencode run --agent

agent to use. Type: `string`.

Source: [`opencode/src/cli/cmd/run.ts:170`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/run.ts#L170)

### opencode run --attach

attach to a running opencode server (e.g., http://localhost:4096). Type: `string`.

Source: [`opencode/src/cli/cmd/run.ts:190`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/run.ts#L190)

### opencode run --auto

auto-approve permissions that are not explicitly denied (dangerous!). Type: `boolean`.

Source: [`opencode/src/cli/cmd/run.ts:242`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/run.ts#L242)

### opencode run --command

the command to run, use message for args. Type: `string`.

Source: [`opencode/src/cli/cmd/run.ts:143`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/run.ts#L143)

### opencode run --continue

continue the last session. Alias: `[`. Type: `boolean`.

Source: [`opencode/src/cli/cmd/run.ts:147`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/run.ts#L147)

### opencode run --dangerously-skip-permissions

Option --dangerously-skip-permissions of opencode run. Type: `boolean`.

Source: [`opencode/src/cli/cmd/run.ts:252`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/run.ts#L252)

### opencode run --demo

enable direct interactive demo slash commands; pass one as the message to run it immediately. Type: `boolean`.

Source: [`opencode/src/cli/cmd/run.ts:257`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/run.ts#L257)

### opencode run --dir

directory to run in, path on remote server if attaching. Type: `string`.

Source: [`opencode/src/cli/cmd/run.ts:204`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/run.ts#L204)

### opencode run --file

file(s) to attach to message. Alias: `[`. Type: `string`.

Source: [`opencode/src/cli/cmd/run.ts:180`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/run.ts#L180)

### opencode run --fork

fork the session before continuing (requires --continue or --session). Type: `boolean`.

Source: [`opencode/src/cli/cmd/run.ts:157`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/run.ts#L157)

### opencode run --format

format: default (formatted) or json (raw JSON events). Type: `string`.

Source: [`opencode/src/cli/cmd/run.ts:174`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/run.ts#L174)

### opencode run --interactive

run in direct interactive split-footer mode. Alias: `[`. Type: `boolean`.

Source: [`opencode/src/cli/cmd/run.ts:236`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/run.ts#L236)

### opencode run --mini

Option --mini of opencode run. Type: `boolean`.

Source: [`opencode/src/cli/cmd/run.ts:220`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/run.ts#L220)

### opencode run --model

model to use in the format of provider/model. Alias: `[`. Type: `string`.

Source: [`opencode/src/cli/cmd/run.ts:165`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/run.ts#L165)

### opencode run --password

basic auth password (defaults to OPENCODE_SERVER_PASSWORD). Alias: `[`. Type: `string`.

Source: [`opencode/src/cli/cmd/run.ts:194`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/run.ts#L194)

### opencode run --port

port for the local server (defaults to random port if no value provided). Type: `number`.

Source: [`opencode/src/cli/cmd/run.ts:208`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/run.ts#L208)

### opencode run --replay

replay interactive session history on resume and after resize (use --no-replay to disable). Type: `boolean`.

Source: [`opencode/src/cli/cmd/run.ts:225`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/run.ts#L225)

### opencode run --replay-limit

cap visible interactive replay to the newest N messages. Type: `number`.

Source: [`opencode/src/cli/cmd/run.ts:231`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/run.ts#L231)

### opencode run --session

session id to continue. Alias: `[`. Type: `string`.

Source: [`opencode/src/cli/cmd/run.ts:152`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/run.ts#L152)

### opencode run --share

share the session. Type: `boolean`.

Source: [`opencode/src/cli/cmd/run.ts:161`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/run.ts#L161)

### opencode run --thinking

show thinking blocks. Type: `boolean`.

Source: [`opencode/src/cli/cmd/run.ts:216`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/run.ts#L216)

### opencode run --title

title for the session (uses truncated prompt if no value provided). Type: `string`.

Source: [`opencode/src/cli/cmd/run.ts:186`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/run.ts#L186)

### opencode run --username

basic auth username (defaults to OPENCODE_SERVER_USERNAME or 'opencode'). Alias: `[`. Type: `string`.

Source: [`opencode/src/cli/cmd/run.ts:199`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/run.ts#L199)

### opencode run --variant

model variant (provider-specific reasoning effort, e.g., high, max, minimal). Type: `string`.

Source: [`opencode/src/cli/cmd/run.ts:212`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/run.ts#L212)

### opencode run --yolo

Option --yolo of opencode run. Type: `boolean`.

Source: [`opencode/src/cli/cmd/run.ts:247`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/run.ts#L247)

### opencode run <message>

message to send. Type: `string`.

Source: [`opencode/src/cli/cmd/run.ts:137`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/run.ts#L137)

## opencode serve

### opencode serve

starts a headless opencode server

Source: [`opencode/src/cli/cmd/serve.ts:7`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/serve.ts#L7)

## opencode session

### opencode session

manage sessions

Source: [`opencode/src/cli/cmd/session.ts:45`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/session.ts#L45)

## opencode session delete

### opencode session delete <sessionID>

delete a session

Source: [`opencode/src/cli/cmd/session.ts:52`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/session.ts#L52), [`opencode/src/cli/cmd/session.ts:55`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/session.ts#L55)

## opencode session list

### opencode session list

list sessions

Source: [`opencode/src/cli/cmd/session.ts:71`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/session.ts#L71)

### opencode session list --format

output format. Type: `string`.

Source: [`opencode/src/cli/cmd/session.ts:80`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/session.ts#L80)

### opencode session list --max-count

limit to N most recent sessions. Alias: `n`. Type: `number`.

Source: [`opencode/src/cli/cmd/session.ts:75`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/session.ts#L75)

## opencode stats

### opencode stats

show token usage and cost statistics

Source: [`opencode/src/cli/cmd/stats.ts:50`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/stats.ts#L50)

### opencode stats --days

show stats for the last N days (default: all time). Type: `number`.

Source: [`opencode/src/cli/cmd/stats.ts:54`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/stats.ts#L54)

### opencode stats --models

show model statistics (default: hidden). Pass a number to show top N, otherwise shows all

Source: [`opencode/src/cli/cmd/stats.ts:62`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/stats.ts#L62)

### opencode stats --project

filter by project (default: all projects, empty string: current project). Type: `string`.

Source: [`opencode/src/cli/cmd/stats.ts:65`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/stats.ts#L65)

### opencode stats --tools

number of tools to show (default: all). Type: `number`.

Source: [`opencode/src/cli/cmd/stats.ts:58`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/stats.ts#L58)

## opencode switch

### opencode switch

CLI command switch.

Source: [`opencode/src/cli/cmd/account.ts:208`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/account.ts#L208)

## opencode uninstall

### opencode uninstall

uninstall opencode and remove all related files

Source: [`opencode/src/cli/cmd/uninstall.ts:26`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/uninstall.ts#L26)

### opencode uninstall --dry-run

show what would be removed without removing. Type: `boolean`.

Source: [`opencode/src/cli/cmd/uninstall.ts:42`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/uninstall.ts#L42)

### opencode uninstall --force

skip confirmation prompts. Alias: `f`. Type: `boolean`.

Source: [`opencode/src/cli/cmd/uninstall.ts:47`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/uninstall.ts#L47)

### opencode uninstall --keep-config

keep configuration files. Alias: `c`. Type: `boolean`.

Source: [`opencode/src/cli/cmd/uninstall.ts:30`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/uninstall.ts#L30)

### opencode uninstall --keep-data

keep session data and snapshots. Alias: `d`. Type: `boolean`.

Source: [`opencode/src/cli/cmd/uninstall.ts:36`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/uninstall.ts#L36)

## opencode upgrade

### opencode upgrade [target]

upgrade opencode to the latest or a specific version

Source: [`opencode/src/cli/cmd/upgrade.ts:8`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/upgrade.ts#L8)

### opencode upgrade --method

installation method to use. Alias: `m`. Type: `string`.

Source: [`opencode/src/cli/cmd/upgrade.ts:16`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/upgrade.ts#L16)

### opencode upgrade <target>

version to upgrade to, for ex '0.1.48' or 'v0.1.48'. Type: `string`.

Source: [`opencode/src/cli/cmd/upgrade.ts:12`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/upgrade.ts#L12)

## opencode web

### opencode web

start opencode server and open web interface

Source: [`opencode/src/cli/cmd/web.ts:32`](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/web.ts#L32)
