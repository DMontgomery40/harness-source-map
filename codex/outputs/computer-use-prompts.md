# Computer Use prompts and tool descriptions

Source: `ChatGPT.app` 26.1002.52244 (build 13536). Paths are relative to `ChatGPT.app/Contents/Resources`.

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService`, SHA-256 `89ec452b535a74fd5d27390f7c1b9cce25dc61c069d370f9bea1377d97c3d14b`.

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient`, SHA-256 `b94d6eebc275682326ca01e624d886d133c837fd7779d4cf1d6ce87e0c8c1c58`.

Prompts, tool descriptions, parameter descriptions and tool-result text compiled into the Computer Use programs that ship with the ChatGPT desktop app. The Messages, Computer History and Record & Replay plugins run the client program as their MCP servers. Each entry is the exact NUL-terminated string found at the listed offset, decoded as UTF-8. Text that appears in both programs lists both.

## Messages

### Find chats

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bf6b0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa22740; SHA-256 `8f2f86659ea31303eba4c3c4be9d3bcf61439f2ae0ecce72bbcbc8f03052bdd7`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool description.

```text
Find recent Messages chats by participant, chat name, date range, or unread status. When multiple participants are provided, every participant must belong to the chat. Returns each chat's unread_count and stable chat_guid for reuse with read_messages, search_messages, send_message, and count_message_activity. Within each response, each chats[].participants item references a participants[].local_ref.
```

### Read messages

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bf950; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa229e0; SHA-256 `a7f31eff495b005b668f2c1eabba4e8e245e3736dad3d726f784a875b6774243`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool description.

```text
Read messages from one exact chat, newest first. If the intended chat's chat_guid is already available, use it directly. This tool returns one page of messages at a time. When more messages are available, the response includes next_cursor; pass that value as cursor in the next read_messages call. Within each response, each messages[].chat references a chats[].local_ref, and each messages[].sender references a senders[].local_ref or is me (the current user) or unknown; do not reuse local_ref mappings across responses. Messages may include attachment metadata, but not attachment contents. Unread messages include is_unread: true.
```

### Search messages

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bfbd0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa22c60; SHA-256 `555e2f268cdd7f95750432ca7e5fda314d32315724b5ce0050374538f6189b5c`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool description.

```text
Search message-body text, newest first. Narrow large histories with chat_guids, participants, or ISO-8601 date filters. This tool returns one page of messages at a time. When more messages are available, the response includes next_cursor; pass that value as cursor in the next search_messages call. Each response's chats[] items include a stable chat_guid for reuse with read_messages and send_message. Within each response, each messages[].chat references a chats[].local_ref, and each messages[].sender references a senders[].local_ref or is me (the current user) or unknown; do not reuse local_ref mappings across responses. Messages may include attachment metadata, but not attachment contents. Unread messages include is_unread: true.
```

### Send a message

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bfff0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa23080; SHA-256 `8554e884cfd75fbe0569078039d938f0f6933350d432a348a3a1a52ad65deef6`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool description.

```text
Send text, local file attachments, or both. Provide exactly one of chat_guid or recipients. The user may edit the message before approving, indicated by user_edited. Reactions, edits, and unsends are unsupported; use the Computer Use plugin for those UI operations.
```

### Count message activity

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11c0210; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa232a0; SHA-256 `a91c0fca46bb56ad72b8dd3d050295333b210af978f01674030d84f85d70af7c`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool description.

```text
Count Messages activity over time, either overall or per chat. Returns total message counts split into sent and received, optionally grouped by calendar interval. When the request names specific chats or people, first resolve the intended chats with find_chats, then pass the returned chat_guid values as chat_guids. Set breakdown to overall for combined activity or chat for ranked per-chat activity. When more chats are available, the response includes next_cursor; pass that value as cursor in the next count_message_activity call with the original filter arguments. If from or to was originally omitted, continue omitting it. Every counts_by_bucket object contains total, sent, and received arrays aligned by index with buckets, including intervals with no activity.
```

### Read an image attachment

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11c07d0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa23860; SHA-256 `c9fd7a13b3bbe4d56072bf6a6580cfdb4beb564157d70b14ce4f2b8afb378cef`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool description.

```text
Read an image attachment returned by read_messages or search_messages. Returns the image, which may be resized or compressed to limit transfer size.
```

### Parameter: participants (find chats)

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bf850; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa228e0; SHA-256 `6c8b9322e3c122dc424a31cf8a1d337d60d4a740871d071cc2959c5e53a5406c`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
Names, phone numbers, or email addresses that must all participate in the chat. Names are resolved using macOS Contacts.
```

### Parameter: exact participants

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bb980; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1e7d0; SHA-256 `2399addbc24c2883790db951922304fdc0a3d20f8984ad6dd7b9c6eab0e7e07f`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
When true, requires participants and matches only chats containing exactly those participants. When false, chats may include additional participants.
```

### Parameter: chat name

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bba20; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1e870; SHA-256 `b092fca1f6ef1e96d6031cc3f95c97007b9ecda6089753e9a47ecede54b5be1a`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
Exact or partial chat name, such as a named group chat.
```

### Parameter: unread chats only

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bba60; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1e8b0; SHA-256 `8721f303679fd1f87d5620fab988ed1f0925f3c5debf6a6eec0f3668effef2c1`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
When true, return only chats with unread messages.
```

### Parameter: chat_guid

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bbe10; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1ec60; SHA-256 `88673e00211af4296adb9bdcef8921cf21297e72e37a0d8486cc99257d86e4cf`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
The stable chat_guid of an existing direct or group chat.
```

### Parameter: unread messages only

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bbad0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1e920; SHA-256 `2b43bbdb5954d0827855f106eda7df5464e3919e5f0d26f61d9c5a7b4342589d`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
When true, return only unread messages.
```

### Parameter: messages from

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bf8d0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa22960; SHA-256 `9985c2655c3341dd77c79142bbbb9f723a61817396085a265a76352839d6c372`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
Include messages at or after this ISO-8601 date-time.
```

### Parameter: read_messages cursor

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bbb00; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1e950; SHA-256 `933c3663354e63bb6c16b7a4568151df3b3dc91fc24098af705ae141181eed83`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
The next_cursor returned by the preceding read_messages response. Use it unchanged to read the next page, with the same chat_guid, from, to, and unread_only values.
```

### Parameter: search text

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bbbb0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1ea00; SHA-256 `7bb35445ac452af9ca95e89fc379a4fe3ce4b102c3cf42d05b76af111c33ffd8`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
Case-insensitive text to find in message bodies.
```

### Parameter: chat_guids (search)

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bfec0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa22f50; SHA-256 `68bac5caef849fef69f78121368fb6e799b4f216a86ae4fe7719f8f155ca186a`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
Optional stable chat_guid values for existing chats. When provided, searches only those chats.
```

### Parameter: participants (search)

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bff20; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa22fb0; SHA-256 `bbda8b0d15b32110ff682e058e4196b784a78f39b7d1374c16b2d2c788418b2e`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
Optional names, phone numbers, or email addresses that must all participate in matched chats. Names are resolved using macOS Contacts.
```

### Parameter: search_messages cursor

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bbbf0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1ea40; SHA-256 `3c034dc0f97368e086845f7e15825f83e0ec6497ef49e4d77aa4058d8d39edfe`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
The next_cursor returned by the preceding search_messages response. Use it unchanged to retrieve the next page, with the same text, chat_guids, participants, exact_participants, from, and to values.
```

### Parameter: recipients

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11c0100; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa23190; SHA-256 `e3c555573f60a0ac6d763b1eddd0aee9c2c1553ecaff0cd03d969a4855ab0f3f`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
One or more names, phone numbers, or email addresses. One recipient targets a direct chat; multiple recipients target an existing chat with exactly those participants or a new group chat.
```

### Parameter: message text

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bbe50; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1eca0; SHA-256 `3cb4b8f54d7c2a4876f726bfaa47b0b3b606d5dfe2fcb3ddbd7ca416e0fb32ef`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
Optional plain-text message to send.
```

### Parameter: attachments

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11c01c0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa23250; SHA-256 `7e20a07b216ab8f75d968eea8c6704d4f5eac33c31537ba420d2ae9c268c1ef7`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
Optional absolute paths to local files to attach. Directories are unsupported.
```

### Parameter: activity from

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11c0520; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa235b0; SHA-256 `707d9d050bb5720c46ed74d43acc6334410f39f23bf46190a692d8c37bdbf430`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
Include activity at or after this ISO-8601 date-time. Omit to begin at the oldest matching activity.
```

### Parameter: activity to

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11c0590; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa23620; SHA-256 `f91e62a762b7eb2bbe111bafa83acc89e7e2cbab3b70ec64904a86eafc2ab794`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
Include activity before this ISO-8601 date-time. Omit to end at the first request's current time.
```

### Parameter: interval

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11c0600; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa23690; SHA-256 `6de6ccfd7d3f1281a4f62a2ce77fcc4b13fec14bf69f9d3afb8bcc4475d08c97`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
Calendar interval for buckets. total returns one bucket for a nonempty range; weeks begin Monday.
```

### Parameter: time zone

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bb860; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1e6b0; SHA-256 `81b3008d32dc85bfb3a94038aa103c6a556d623d497d326cd105dfffd695dad7`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
Time zone used for calendar bucket boundaries.
```

### Parameter: chat type

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11c0670; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa23700; SHA-256 `cbb34773646e96fe628254de7597042d324a3809c07aaa4c51dc7e1889361e95`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
Optional chat type filter. Omit to include both direct and group chats.
```

### Parameter: chat_guids (count)

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11c06c0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa23750; SHA-256 `dfd7738540274dc6c2d0e5a576824970124bb232efdaf80420b1e9dee184996a`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
Optional stable chat_guid values for existing chats. When provided, counts only those chats.
```

### Parameter: breakdown

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11c0720; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa237b0; SHA-256 `5081cb31fc081cbd3b16fe8a89e09cff87cb1c79357abc0561eb53dca6ac3aa4`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
Return combined overall activity or ranked, paginated per-chat activity.
```

### Parameter: rank by

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11c0770; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa23800; SHA-256 `2ae299e8cd507c0911cccf1a67d12f958804dfb12ba6e9ccd76454531249bc7a`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
For chat breakdowns, rank chats by total, sent, or received message count; defaults to total.
```

### Parameter: chats per page

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bbe80; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1ecd0; SHA-256 `be9097a1beb185ca97f7dfcce83d9af7eb6eb55664f05932d5c77511ac746574`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
For chat breakdowns, sets the maximum number of chats per page; defaults to 20.
```

### Parameter: count_message_activity cursor

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bbed0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1ed20; SHA-256 `3bbd3266b45650f488317ea610c96624b00e637732c6914b818942098105fd1e`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
The next_cursor returned by the preceding count_message_activity response. Use it unchanged to retrieve the next chat page, with the same from, to, interval, chat_type, chat_guids, breakdown, and rank_by values.
```

### Parameter: attachment id

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bbfb0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1ee00; SHA-256 `33237cb62f62f057051b532a13648a5523b580ed8e069fc8fb08ff176584ad2d`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
The id from an attachment object returned by read_messages or search_messages.
```

### Output: more chats available

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bb7a0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1e5f0; SHA-256 `4de93b5980abbf9b4f68e75aa8562e73a124efdbc744f3e03a753b28ea640bb1`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: output field description.

```text
Whether additional matching chats exist beyond those returned.
```

### Output: sent messages

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bb7e0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1e630; SHA-256 `fe42e42c811a347b71f1007e61ccdf5f5684adbde173ccc4f94df8c018c55c97`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: output field description.

```text
Messages sent by the current user.
```

### Output: received messages

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bb810; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1e660; SHA-256 `92d368ee23c5bd9ae763535422e1dc7a6f31ff84434b1aed464f8d89a7fe7584`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: output field description.

```text
Messages received by the current user.
```

### Output: chat_guid

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bbaa0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1e8f0; SHA-256 `9fcf23fda61986b26ea441fda93862873c84028aede97753f5a63ae91383656b`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: output field description.

```text
The stable chat_guid of the chat.
```

### Output: chat count

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bb890; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1e6e0; SHA-256 `15e3199120847742d595694975f97b5250eba9e455069bd0dd4c2c2dd70e3196`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: output field description.

```text
Exact number of chats with counted activity in the complete filtered range, not only this page.
```

### Output: next ranked page

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bb930; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1e780; SHA-256 `c08c5002f084b4e89a956ca998d4231152a265e7ee5ec5adfd0d8bf3e2e6a454`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: output field description.

```text
Opaque continuation for the next ranked chat page. Omitted on the final page.
```

### Output: permission_filtered

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bbcc0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1eb10; SHA-256 `6255c2ae62d24698e4c484f6decb070b33554ce99c88c9eddd7a8cf9b72ef0ab`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: output field description.

```text
Present and true only when read permissions caused messages to be omitted from this page; absent otherwise. The page may contain fewer messages than the requested limit, including none, and still have a next_cursor.
```

### Output: permission note

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bbda0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1ebf0; SHA-256 `dc008d00363e512a763fcd87bee37a27cb524116dfbdfe709aa5bb46bb106d6d`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: output field description.

```text
Present only when permission_filtered is true. Explains why messages were omitted from this page.
```

### Output: ranked page

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11c0870; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa23900; SHA-256 `198fc4bf1c1d25504d6caf917c289757e2ec46473d554d365002f6d972e162af`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: output field description.

```text
The current ranked page of matching chats.
```

### Output: participants

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11c08a0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa23930; SHA-256 `051b91c3ba20a4c143293b2a3446428d95eb0076326efa04251aae406f5fbbcd`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: output field description.

```text
Participants referenced by chats in this page only.
```

### Output: total counts

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11c0930; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa239c0; SHA-256 `f887b9f84936c04495dced9eb070728d7d5558a13afcbffb887442478102e91f`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: output field description.

```text
Total message counts aligned by index with the top-level buckets array.
```

### Output: sent counts

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11c0980; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa23a10; SHA-256 `d266ed01338571f9ec98a229698da9ac390e047168d79848e2feacc99d989d9a`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: output field description.

```text
Sent message counts aligned by index with the top-level buckets array.
```

### Output: received counts

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11c09d0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa23a60; SHA-256 `f58095cf252173210f8be82e26902670af36d71a181ff8ef1cca7db387abeb46`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: output field description.

```text
Received message counts aligned by index with the top-level buckets array.
```

### Output: resolved range

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11c0a20; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa23ab0; SHA-256 `16b33799bd4f2a512d24b501c7ae9a86358521b2a2da30bc9da4e1a63fb1553c`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: output field description.

```text
The resolved complete half-open range. Omitted request bounds resolve to the oldest matching activity and the first page's request-start time, then remain frozen across continuation pages.
```

### Output: interval

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11c0ae0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa23b70; SHA-256 `354a9f6e68e11fcda000d7832e39a78f1338ce19f8c04c73e5dac30b142db9bd`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: output field description.

```text
Calendar interval used for the shared buckets array.
```

### Output: buckets

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11c0b40; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa23bd0; SHA-256 `09ae50bcf531dc4f78e14a7b2c62f62e9529e798cfd6b013197bf521783c0a67`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: output field description.

```text
Shared ordered half-open intervals aligned by index with every array in counts_by_bucket.
```

### Output: aggregate

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11c0ba0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa23c30; SHA-256 `88a1abd1ffc86e08af638d7364c29d23f19b62b960c1087803817c43ca57a0da`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: output field description.

```text
Complete aggregate across every matching chat in the filtered range.
```

### Result: send approval canceled

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11c1290; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa24320; SHA-256 `e80b930e07d19085b414803c182da141ffae93085583b38fa3313c8404d3d279`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool result text.

```text
Message was not sent because the send approval was canceled.
```

### Result: send not approved

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11c12d0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa24360; SHA-256 `10a65c9c18dc5e743f051773c980cee4d5dfcbb0eece6f48a5a4d76ea9d39392`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool result text.

```text
Message was not sent because the send was not approved. If the task's current approval_policy is confirmed to be never, explain, without naming the internal policy value, that the task's approval settings may have blocked the send confirmation, and suggest switching the task to Ask for approval or Approve for me before retrying. Otherwise, only report that the send was not approved; do not suggest changing approval settings.
```

### Result: read approval canceled

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11c16a0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa24730; SHA-256 `03ba4c66e12e5c76b61e241cf7403b70ae7b44efaa1dbdd7a7ab4372373c780f`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool result text.

```text
Content was not returned because the read approval was canceled. Do not ask the user to approve access or retry. Do not fall back to Computer Use or other tools to access the withheld content unless the user explicitly requests that alternative.
```

### Result: read not approved

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11c17a0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa24830; SHA-256 `02e18b60f5fe0ed6df629693e750a3596934da5be297cf446a6d5345cfc529af`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool result text.

```text
Read access was not approved. No content was returned. If the task's current approval_policy is confirmed to be never, explain, without naming the internal policy value, that the task's approval settings may have blocked the read confirmation, and suggest switching the task to Ask for approval or Approve for me before retrying. Otherwise, do not suggest changing approval settings or ask the user to approve access or retry. Do not fall back to Computer Use or other tools to access the withheld content unless the user explicitly requests that alternative.
```

### Result: chat blocked by Never allow

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11c19d0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa24a60; SHA-256 `36a3c141cf8e219226c9371bceff23fe7b81065b7a6f1cdd2cde62df00818b69`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool result text.

```text
Read access to this chat is blocked by the “Never allow” setting. No content was returned. Do not fall back to Computer Use or other tools to access the withheld content unless the user explicitly requests that alternative.
```

### Result: some not approved, some blocked

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11c0e10; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa23ea0; SHA-256 `fbb3e18a3861ed0635cf320e233b3727dccf93f19b4c0ca5611286bc9b098d2b`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. It is a fragment that the program joins with other text at run time. Kind: tool result text.

```text
read access was not approved for some chats and was blocked by “Never allow” settings for others. If the task's current approval_policy is confirmed to be never, explain, without naming the internal policy value, that the task's approval settings may have blocked the read confirmation, and suggest switching the task to Ask for approval or Approve for me before retrying. Otherwise, do not suggest changing approval settings or ask the user to approve access or retry. Do not fall back to Computer Use or other tools to access the withheld content unless the user explicitly requests that alternative.
```

### Result: blocked by Never allow (lowercase)

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11c0ce0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa23d70; SHA-256 `6a920d028f313b1f06e0afaaa8bc9abdf6243ca27bbd868fc889d816b506a42c`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. It is a fragment that the program joins with other text at run time. Kind: tool result text.

```text
read access was blocked by “Never allow” settings. Do not fall back to Computer Use or other tools to access the withheld content unless the user explicitly requests that alternative.
```

### Result: one destination

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11c1510; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa245a0; SHA-256 `6a5f50f5d9d686adb926109dee7b474694ba45195b21794d88d1156c8cb7585e`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. It is a fragment that the program joins with other text at run time. Kind: tool result text.

```text
provide exactly one of chat_guid or recipients
```

### Result: cursor from another tool

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11d29c0; SHA-256 `8c964b79958a42c9dbd955f14fc477ac2791b3e4eff5ea992bbf39b0287a3b09`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. It is a fragment that the program joins with other text at run time. Kind: tool result text. The string begins or ends with whitespace, which the block cannot show exactly; the JSON file has the exact text.

```text
cursor was created by a different Messages tool; use next_cursor returned by 
```

### Result: send not verified

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bd730; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa20680; SHA-256 `c72784f632843f19cb285e956efc28b11cfda0803b5f7916bce117fbc2f2cbcc`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool result text.

```text
Messages could not verify whether the send completed. Sending again could duplicate the message.
```

### Result: send plan consumed

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bd7a0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa206f0; SHA-256 `e988adbfcf26eed4f1996864979566ba7cb9a8e0e33f3455414cd90de960a7bb`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool result text.

```text
Messages send plan was already consumed. Delivery may already have occurred.
```

### Result: rate limited

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bd2d0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa20220; SHA-256 `c4fa51c2a445abc3673e5fcd64abc5587ec1c8fcf2fa2480a1ca2def20b0f994`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. It is a fragment that the program joins with other text at run time. Kind: tool result text. The string begins or ends with whitespace, which the block cannot show exactly; the JSON file has the exact text.

```text
Messages sending is temporarily rate limited. Try again in 
```

### Messages returned an invalid read response. No content was returned…

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11c1bc0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa24c50; SHA-256 `5c2415a5a9bfe7aeeb52f4214ddaa67017f07665cc511d1fd2e7523bfd7d44c1`.

Exact: the whole NUL-terminated string at that offset, found by the vocabulary sweep and not yet reviewed.

```text
Messages returned an invalid read response. No content was returned. Do not ask the user to approve access or retry. Do not fall back to Computer Use or other tools to access the withheld content unless the user explicitly requests that alternative.
```

## Computer History

### Pause

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bcdf0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1fd40; SHA-256 `7732050e729d2a1ce112ef9e459d21487fcb23ce9a183b58dec0b80b2977908e`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool description.

```text
Temporarily pause Computer History without disabling it.
```

### Resume

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bce50; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1fda0; SHA-256 `4dbf6d2e7ce5f1a28630b451cdd0aeb26c9e69a47151a4aa3928d36e152d921e`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool description.

```text
Resume a paused Computer History recorder.
```

### Status

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bcea0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1fdf0; SHA-256 `b9b4e56af63ece42d2f30e8ec345162ff837d94f6d73963dc6b61dfa89c0e358`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool description.

```text
Get Computer History status and paths to recent activity files.
```

### Get settings

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bcf00; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1fe50; SHA-256 `64a5010cbbe7c2f5d363bb638564ddf9a7659796a767edab8b400d51a65b294a`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool description.

```text
Get all Computer History settings. Call this immediately before updating settings so unchanged fields can be preserved.
```

### Update settings

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bcfb0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1ff00; SHA-256 `1cc3e627f188e9e329e9d96145153fae750aba183b9ebef4a8d64967827e4b7d`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool description.

```text
Replace all Computer History settings. Preserve every setting the user did not ask to change by first calling computer_history_get_settings.
```

### Parameter: URL rule domain

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bae60; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1dbe0; SHA-256 `97960b80174c02cb1caca00270ce05145d78fd3fe046b97577c95578bbdc92a6`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
Required only for URL rules. Use a domain without a scheme or path.
```

### Parameter: app rule

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bae40; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1dbc0; SHA-256 `6e173b1aaff823bc43e365fe0e05e7b3cc057d483afb29d2ab224a7b4f101292`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
Required only for app rules.
```

### Result: Computer History stopped

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x1191e10; SHA-256 `75633b645a7363dfcc4bc9dfd6a7c19d96484e5244ca172b45209161bc0b0b1a`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool result text.

```text
Computer History is stopped. Enable Computer History in Codex Settings first.
```

## Recording and event stream

### Start recording

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bf0b0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa22140; SHA-256 `c6b77416cf6a616e411476b62ff529344d22fbea30264054ed93e443bbad9078`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool description.

```text
Start recording the user's actions for up to 30 minutes. If a recording is already active, return that active session instead of starting another one.
```

### Recording status

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bf170; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa22200; SHA-256 `c809eb3115beffb693161db5773e42b382a7699fd5bbcdfd212a5a5f10a83f19`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool description.

```text
Get the current or most recent Record & Replay recording status including paths to metadata and events during the recording.
```

### Stop recording

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bf210; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa222a0; SHA-256 `d1e8a40c8bb7524ae410a3fc367e01d7e3b8e0565bb647fb78fdb2888c5e7229`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool description.

```text
Stop the active event stream recording if one is running and return status including paths to metadata and events during the recording.
```

### Event stream prototype system prompt

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11907c0; SHA-256 `cf8a8af4966cd755a6f97e4c8e81f7825e75ddefed26f90eff68190e7410b2c0`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: system prompt.

```text
You are evaluating a local Sky event stream prototype. Use the event stream file path supplied by the user as the primary source of truth. Keep responses concise and avoid taking actions unless the user prompt explicitly asks you to produce an artifact.
```

### Activity summary template

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x118d2c0; SHA-256 `8dca48fc14e87ee833461e3c2859ab03d2213d367e4e606754163148f75b2860`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: prompt template.

```text
Read the Sky event stream JSONL file at:

`{{EVENT_STREAM_PATH}}`

Describe concisely what the user appears to be doing, focussing on the intent/goal of their actions. Separate this into two sections, Summary and Goals, in your response.

Use only the event stream as evidence. Prefer concrete app/window/control names and recent user actions over speculation. If the stream is too sparse or ambiguous, say that directly and name the missing signal.
```

### Next actions template

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x118d4d0; SHA-256 `0ac919a9d65417c77ce7838723a14f6dbdb18104c48f30c6e4fd6d7f6163e7aa`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: prompt template.

```text
Read the Sky event stream JSONL file at:

`{{EVENT_STREAM_PATH}}`

Suggest up to 3 next actions in a JSON format that Codex could help the user with, including actions that could plausibly use Computer Use.

Only suggest actions that are directly supported by recent events in the stream. Avoid generic productivity advice. If there is no clearly useful suggestion, return "No useful suggestions.”. It’s better to provide fewer or no suggestions than irrelevant, unhelpful, or non-actionable ones. For each suggestion, include:

- `title`: short imperative
- `why`: the event-stream evidence
- `prompt`: a user-ready Codex prompt
```

### Memory file template

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x118d770; SHA-256 `80c343a777c002da41eabb8defea279ed57351eee0fb82011d64fe49cf88d2ee`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: prompt template.

````text
Read the Sky event stream JSONL file at:

`{{EVENT_STREAM_PATH}}`

Create a Computer History-style Markdown memory file at:

`{{EVENT_STREAM_DIRECTORY}}/memory.md`

Base it on the recent user activity in the event stream.

Use this structure:

```md
# Memory

## Summary

One concise paragraph describing what the user was working on.

## Evidence

- Concrete event-stream observations with app/window/control names where available.

## Useful Future Context

- Durable facts or preferences that would help Codex continue this work later.

## Open Questions

- Ambiguities or missing context that should not be over-inferred.
```

Keep the memory factual and compact. Do not include credentials, private tokens, or raw event JSON. If the event stream is too sparse for a useful memory, return a short Markdown file saying so.

After writing the file, reply only with the path you wrote and a one-sentence summary of what it contains.
````

### Skysight segment directory note

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x1191830; SHA-256 `9c0cbf2a2030c534248e7d75c74609eacf9683c2dbce28fd1d89680a7961a9ad`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. It is a fragment that the program joins with other text at run time. Kind: prompt text.

````text
`

Skysight saves local event stream segments from the user in the following directory structure. The event JSONL files for this summary window are listed in `BEGIN UNTRUSTED OBSERVED INPUT`.

```
# Raw event stream segments (ephemeral; not persisted)
````

### Skysight segment tree and input header

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x1191930; SHA-256 `0336253962ce78dc8cf9de3e52d8301cccff0b8a629fd5ff61200f1f51006821`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. It is a fragment that the program joins with other text at run time. Kind: prompt text. The string begins or ends with whitespace, which the block cannot show exactly; the JSON file has the exact text.

````text
/segments/
 └── <segment_timestamp>/
     ├── events.jsonl - append-only activity events captured during the segment
     └── metadata.json - segment timestamps and event counts
```

Here is the untrusted observed input context which you must use for this summary window:

````

### Segments in this window

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x1191ae0; SHA-256 `72f191d6d0095710ca81a9eca976c1815241cb4991de5e86d22ab9c05e734058`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. It is a fragment that the program joins with other text at run time. Kind: prompt text. The string begins or ends with whitespace, which the block cannot show exactly; the JSON file has the exact text.

```text
Event stream segments from this 10-minute window:
- 
```

### Larger arc note

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x1191780; SHA-256 `85c69a4f66cd0f721153318d11703c3d7550a5b2387334915296c2d1021a2065`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. It is a fragment that the program joins with other text at run time. Kind: prompt text. The string begins or ends with whitespace, which the block cannot show exactly; the JSON file has the exact text.

```text


Focus on the larger arc of work across the full window.
```

## Record & Replay

### Replay plan template

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x118db60; SHA-256 `778f5c343f90797fc52099c007a281584f15b2dd0b515f8f3ae181c6a03bd3de`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: prompt template.

```text
Read the Sky event stream JSONL file at:

`{{EVENT_STREAM_PATH}}`

Draft a concise replay plan based on the recording. Select the best available Codex integration for each step: prefer an available connector or dedicated tool for stable semantic operations, and use Computer Use for unsupported UI interactions or visually dependent verification.

Include:
- Preconditions: apps, windows, files, or web pages that must be open.
- Replay steps: the smallest reliable sequence, identifying the connector, dedicated tool, or Computer Use action used for each step.
- Verification: how Codex could tell the replay succeeded.
- Ambiguities: missing details that should not be guessed.

Keep it practical and directly grounded in the event stream. Do not include raw JSON.
```

### Skill draft template

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x118dea0; SHA-256 `b7d7a61b935484923948097693bf3a0b34dda683089156012677c5ce250b7307`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: prompt template.

````text
Read the Sky event stream JSONL file at:

`{{EVENT_STREAM_PATH}}`

Create a Markdown Codex skill draft at:

`{{EVENT_STREAM_DIRECTORY}}/record-and-replay-skill.md`

The skill should teach Codex how to accomplish the recorded workflow. Treat the recording as evidence of the user's goal, not a requirement to reproduce each UI action. Prefer an available connector or dedicated tool for stable semantic operations, and use Computer Use for unsupported UI interactions, visually dependent verification, or when manipulating the interface is itself the task. The skill may combine connectors and Computer Use.

Use this structure:

```md
# Skill: Replay Recorded Workflow

## Summary

One concise paragraph describing the workflow.

## Preconditions

Apps, windows, files, accounts, or pages that need to be available.

## Replay Steps

Numbered steps naming the connector, dedicated tool, or Computer Use action to use. For Computer Use steps, prefer semantic UI targets, app/window names, expected visible text, and verification checks over coordinates.

## Verification

How Codex should confirm the replay completed correctly.

## Ambiguities

Missing context or choices that need user confirmation before replay.
```

Keep the skill factual, compact, and grounded in the event stream. Do not include credentials, private tokens, or raw event JSON. Avoid generic browser, shell, AppleScript, or manual instructions unless the event stream makes them necessary. If the recording is too sparse for a useful replay skill, write a short draft saying so.

After writing the file, reply only with the path you wrote and a one-sentence summary.
````

## Computer Use

### List apps

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11be7b0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa21810; SHA-256 `7c53a956abfac7d0f42677b37e39746b0976c90baa34de73c2e47fe679d61587`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool description.

```text
List the apps on this computer. Returns the set of apps that are currently running, as well as any that have been used in the last 14 days, including details on usage frequency
```

### Get app state

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11be870; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa218d0; SHA-256 `31d28c66ae60d0529c1c935de6edfce510ffe83e62b471a277b301c90fe2783b`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool description.

```text
Start an app use session if needed, then get the state of the app's key window and return a screenshot and accessibility tree. This must be called once per assistant turn before interacting with the app
```

### Click

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11be940; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa219a0; SHA-256 `847943d2a86edf92028f2268eb03a6901aa1aea030950282384654c56254c2dc`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool description.

```text
Click an element by index or pixel coordinates from screenshot
```

### Secondary action

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11be9b0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa21a10; SHA-256 `b034408a6f12df49b62e3bc66997cb182a95d2674e0984e31851cba0b031cde7`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool description.

```text
Invoke a secondary accessibility action exposed by an element
```

### Set value

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11be9f0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa21a50; SHA-256 `45acd14da979379c7478830f3d721ea2ead2984f10f6390f3f7cd00ee0ee7435`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool description.

```text
Set the value of a settable accessibility element
```

### Select text

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bea30; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa21a90; SHA-256 `724883e03cdcceea66cbb2453c366c9d61a2a4d4e3ed1fe2f29652b5cf6eb180`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool description.

```text
Select text inside a text element, or place the text cursor before or after it. Provide text exactly as it appears in the accessibility tree, including any Markdown formatting. If the text is not unique, provide surrounding prefix or suffix text to disambiguate it.
```

### Scroll

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11beba0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa21c00; SHA-256 `359e62398557e7616297e98153cdda29e9dc2243ff77ea858c921534b4c84cea`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool description.

```text
Scroll an element in a direction by a number of pages
```

### Drag

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bebe0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa21c40; SHA-256 `035dc7587d7708dbcd3fe0e9c9d353d25b9614e21092b2b286854b1db39b5a29`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool description.

```text
Drag from one point to another using pixel coordinates
```

### Press key

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bec20; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa21c80; SHA-256 `24378bf43f6a586b9e4b73a97e129251aaa28649f4ded8879275629492434336`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool description.

```text
Press a key or key-combination on the keyboard, including modifier and navigation keys.
  - This supports xdotool's `key` syntax.
  - Examples: "a", "Return", "Tab", "super+c", "Up", "KP_0" (for the numpad 0 key).
```

### Type text

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bed00; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa21d60; SHA-256 `15f83a1e81224fd0e061bdbbbcc13745397b8992ba3c8e1bebc8606d65aac7c1`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool description.

```text
Type literal text using keyboard input
```

### Parameter: app

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bb280; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1e0d0; SHA-256 `ba785e34745dfe4beabed9e412763d0a92eda948b6cfa31ea5cd1228936c42fb`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
App name, full app path, or unambiguous bundle identifier
```

### Parameter: app (short form)

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bb3b0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1e200; SHA-256 `7db7170bdb23e519ef80cba3c4dcbcac9d8a49bfa906ae777ff2328247e80d84`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
App name or bundle identifier
```

### Parameter: element index

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bb2c0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1e110; SHA-256 `658386fef28323a37a070cbc8e2ea766da3defd88a76b6f6586e7deea7f5bf9f`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
Element index to click
```

### Parameter: x

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bb2e0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1e130; SHA-256 `b12a44c408a32e328c38ce9856d6577027a75669fa72eed063f2e76ed1b9cb00`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
X coordinate in screenshot pixel coordinates
```

### Parameter: y

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bb310; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1e160; SHA-256 `baea6d1d87ddbbaa3fcc2cf3f6a59f235305eca042e4e438b9bf4f4716d3c140`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
Y coordinate in screenshot pixel coordinates
```

### Parameter: click count

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bb340; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1e190; SHA-256 `5a2fee6a4ce66c7cc80651aecf6882e7e09893cfd927865874578eb1f683f245`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
Number of clicks. Defaults to 1
```

### Parameter: mouse button

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11be980; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa219e0; SHA-256 `6e516212a2575ba7ba7936c05d08a1cebaaf6f572baf6f0b7d144c964247e2c1`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
Mouse button to click. Defaults to left.
```

### Parameter: element

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bb360; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1e1b0; SHA-256 `c46353d60986dccb0f8dd3dc831e5ab3a242cb7a739eba2ef8c4eb5189306fbe`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
Element identifier
```

### Parameter: action

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bb380; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1e1d0; SHA-256 `bf9f5ab3f1e0d1bac9b17db4620fc5081dbe3022b38bacb169b416cbce9a2444`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
Secondary accessibility action name
```

### Parameter: text element

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bb3d0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1e220; SHA-256 `0d78455785b42c0e40195824c0d09b96e0c7689e009c9426c9756595af8c3dc3`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
Text element identifier
```

### Parameter: target text

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bb3f0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1e240; SHA-256 `c2f51507c56d80327114978cdd02be60f3e78d33b680f07a8d195c3024aeb258`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
Target text as shown in the accessibility tree
```

### Parameter: text before

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bb420; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1e270; SHA-256 `f0235416fe961d249c46197b5a5ba384a86f4bf49f31c0d19c3ab4556e684a63`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
Optional text immediately before the target, used to disambiguate repeated matches
```

### Parameter: text after

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bb480; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1e2d0; SHA-256 `db2d0b1d760ca69ed8a019b1ca75dea45252add6f063074b7624c9d96bf2f305`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
Optional text immediately after the target, used to disambiguate repeated matches
```

### Parameter: selection mode

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11beb40; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa21ba0; SHA-256 `8bfff0443a8b1588634e2e6d8afe90596a103acbedf79c52b38f72e3702f412f`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
Whether to select the text or place the cursor before or after it. Defaults to text.
```

### Parameter: scroll direction

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bb4e0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1e330; SHA-256 `ca5b89e3f5549efb7812fa6d10cf3a85b356869bc39fd7557704bc53a74cdde0`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
Scroll direction: up, down, left, or right
```

### Parameter: pages

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bb510; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1e360; SHA-256 `c1aa3e6333effe9b8b4686b4bc66ab2a1898474c8fc450a65c274cd741453d43`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
Number of pages to scroll. Fractional values are supported. Defaults to 1
```

### Parameter: key

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bb5e0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1e430; SHA-256 `f55a3f93f977b1da4dc4828024914ba00926d98090fbc27fdbdc1330f9e2e1bf`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: parameter description.

```text
Key or key combination to press
```

### Result: action completed

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11be640; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa216a0; SHA-256 `efd447bd465fd617d5d0a59fb715486c9bddd07d36a02e63a616daa5d6bd9d88`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. It is a fragment that the program joins with other text at run time. Kind: tool result text.

```text
)
Action completed. Call `get_app_state` to fetch the updated UI state.
```

### Result: re-query state (second part)

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x1192410; SHA-256 `96ae72a377714bf30f8bf262b40ac0993b6c9275d27ec4011ba866ce3cd7d92b`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. It is a fragment that the program joins with other text at run time. Kind: tool result text.

```text
'. Re-query the latest state with `get_app_state` before sending more actions.
```

### Result: turn ended

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bd3f0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa20340; SHA-256 `a65eacc91eb6aa05facd27fd240b1b760b8f3215ca4d212c232e6ca0d7edcae3`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool result text.

```text
Computer Use is unavailable because the current turn ended. It will work again after the next user message.
```

### Result: version mismatch

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bd4d0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa20420; SHA-256 `b2654c1dd0eb88ecf673ee905b19d9dbafb6852cef25fcbe522e3ac47b432793`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool result text.

```text
The Computer Use server and client have a version mismatch. To use Computer Use, ask the user to relaunch their ChatGPT app so that the client will be updated to the latest version.
```

### Result: URL not allowed

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bd910; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa20860; SHA-256 `242e024fca65ff61c00b159a085181611d37479641bba10564e058928e4a7268`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool result text.

```text
This session has been stopped because Computer Use is not allowed on the current browser URL. Stop your work and send a final message noting why the session has been ended. Note that Computer Use is not allowed on this URL even if the user navigates to it themselves.
```

### Result: stopped by the user

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bda20; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa20970; SHA-256 `1683dd80135240ffe22967f9eb3935abb07fb70a0fdbf9699aee48d0b8f34cf8`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool result text.

```text
This application session has been explicitly stopped by the user for this turn. Stop your work and send a final message noting they stopped the session and you're ready to continue if they want you to. Computer Use can be used again in the next assistant turn.
```

### Result: permissions pending

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bdc30; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa20b80; SHA-256 `2a1f9dfb1837ebfc78f2461d296f83dae8c045f58ad27bff369f0e41780fd4b8`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool result text.

```text
Computer Use permissions are still pending. The user has not finished granting Accessibility and Screen Recording permissions in the ChatGPT Computer Use window. Call this tool again, as the user is almost done finishing granting permissions. Do not end your turn yet, just call this tool again.
```

### Result: runtime app missing

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bddf0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa20d60; SHA-256 `252024d06239ffa2a5fddd70ec26620e1ebd013cf8b2640ad9c0b181b00efa1b`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool result text.

```text
Computer Use could not start because its runtime app is missing. Try again, and if it fails after 2 more tries, suggest that the user relaunch ChatGPT.
```

### Result: not active (first part)

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bdb30; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa20a80; SHA-256 `3422236e901eb5cbbabb3e0cdec3cb4b293a9db22e5b7c16721d97ff01bc676b`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. It is a fragment that the program joins with other text at run time. Kind: tool result text.

```text
Computer Use is not active for '
```

### Result: not active (second part)

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bdb60; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa20ab0; SHA-256 `d66821c9df87e4968f45e74b1cc9a7591447f10e312cc100ed68088781fee8c1`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. It is a fragment that the program joins with other text at run time. Kind: tool result text.

```text
'. You first must call `get_app_state` to get the latest state before doing other Computer Use actions. If `get_app_state` is not available in your environment, use `tool_search` to surface it.
```

### Result: Mac locked (accessibility text)

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bd670; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa205c0; SHA-256 `e18cd144daad6f904a2ec30bdd593f31f9d3c899ffb9efb7cfb00b5822f4ed0f`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool result text.

```text
The Mac is locked. Unlock it before reading accessibility text.
```

### Result: automatic unlock failed

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11927c0; SHA-256 `dc46c0e2945d096b30187acfedafbb86f72917aac9ec59800ce716411c490642`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool result text.

```text
The Mac is locked and automatic unlock could not unlock it. Ask the user to unlock the Mac manually before continuing.
```

### Result: automatic unlock paused

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x1192840; SHA-256 `6c0a4fb439e9c8f92422b1cfac5556115f9516a197d6ff108cbcb08d5489e42f`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool result text.

```text
The Mac is locked and automatic unlock is paused because physical input was detected. Ask the user to unlock the Mac manually before continuing.
```

### Result: request not tied to a ChatGPT thread

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11928e0; SHA-256 `43aec4f1e775b741a898c900a4afc0e86fa202c4ef05d78adf791e445f9ba17e`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool result text.

```text
The Mac is locked and this Computer Use request cannot be associated with a ChatGPT thread. Ask the user to unlock the Mac manually before continuing.
```

### Result: paste conflict

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x118f830; SHA-256 `64b92b7d9d89735a0663e97e9197cf6813b45bfbde3450f1f791e14a7a993be9`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool result text.

```text
The user may have conflicted with your paste operation. Check the app's state to ensure the user's content did not paste instead of your intended content before continuing.
```

### Result: element ID no longer valid

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x1195d10; SHA-256 `327cc9754b6fbbbe35fefba00f17e12ec005b1b8754241c97b2c297412fadff3`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool result text.

```text
The element ID is no longer valid. Try to get the on-screen content again and see if that resolves the issue.
```

### Result: refetch could not finish

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x1195d80; SHA-256 `3ac203b2ee8ee3a424e8363d754f0c7712edd3c62e1bffb7a79c52f0a66e9f73`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool result text.

```text
The element was invalidated, and an attempt was made to refetch it, but the refetch couldn't be finished because multiple elements were found that match the criteria. Try to get the on-screen content again and see if that resolves the issue.
```

### Result: refetch could not start

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x1195e80; SHA-256 `b3382217502b761e14ac54a5b7d0af8a4789cb7e9dac66a14821f025b30c546b`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: tool result text.

```text
The element was invalidated, and an attempt was made to refetch it, but the refetch couldn't be started because multiple elements were found that match the criteria. Try to get the on-screen content again and see if that resolves the issue.
```

### App state header

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11be570; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa215d0; SHA-256 `c46637a1acf56c09acccee967f740aa2857785c122d24d0b584d28eeff5005b4`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. It is a fragment that the program joins with other text at run time. Kind: prompt text. The string begins or ends with whitespace, which the block cannot show exactly; the JSON file has the exact text.

```text
Computer Use state (CUA App Version: 
```

### App instructions opening tag

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11be5a0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa21600; SHA-256 `939c2b39a4761adf8d841ed2951594bd36f420ea518fb0f9dc3964a24575effa`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. It is a fragment that the program joins with other text at run time. Kind: prompt text. The string begins or ends with whitespace, which the block cannot show exactly; the JSON file has the exact text.

```text

<app_specific_instructions>
```

### App instructions closing tag

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11be5c0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa21620; SHA-256 `e7e765a9616506c06d03e6fbd913d0560091ddfc5225d9e513bbf7bb1312904c`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. It is a fragment that the program joins with other text at run time. Kind: prompt text. The string begins or ends with whitespace, which the block cannot show exactly; the JSON file has the exact text.

```text

</app_specific_instructions>
```

### Accessibility tree diff header

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11961d0; SHA-256 `67efbc75796b86395b56020f7ba27656b5a9a87f38b424f86a3c71659a2a76d6`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. It is a fragment that the program joins with other text at run time. Kind: prompt text.

```text
The following is a diff from the previous accessibility tree
```

### Accessibility tree cumulative diff header

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11962f0; SHA-256 `a8964e73c52ee0da899a6c5798f6189455307b783cce84792645fd242ddc296b`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. It is a fragment that the program joins with other text at run time. Kind: prompt text.

```text
The following is a cumulative diff from the initial accessibility tree
```

### No accessibility tree change

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x1196340; SHA-256 `b6c22022f346f368d5b2967bf6376beca87bcbba1dc171fc3a8ee2502111dd0c`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. It is a fragment that the program joins with other text at run time. Kind: prompt text. The string begins or ends with whitespace, which the block cannot show exactly; the JSON file has the exact text.

```text
There has been no change in the accessibility tree for 
```

### Browser Computer Use guidance

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x118ec40; SHA-256 `9aa74eff22fac8bfa3f1247dcf36ba484da1bd2945f08a63564a356bc543728d`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: prompt text.

```text
## Browser Computer Use

When navigating to a new website or starting a separate web task, prefer opening a new tab instead of reusing the current tab; reuse the current tab only when the user explicitly asks to continue there or when the current page is clearly the right place to continue the existing workflow.
```

### Selected-content note

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11a32c0; SHA-256 `894cb7be8dd3f3320b672465a225cc449b72dd58fdc03da1ee71fb2ccb4f2cff`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: prompt text.

```text
Note: Pay special attention to the content selected by the user. If the user asks a question or refers to the content they are looking at on-screen, they might be referring to the selected content (but they might be referring to something else that's visible, too).
```

### Selected-content note (appended form)

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11a33d0; SHA-256 `e6ce6ce93917f8bdeaeec90f16279053361c4dcb326755a03aaeedcc9c702015`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. It is a fragment that the program joins with other text at run time. Kind: prompt text. The string begins or ends with whitespace, which the block cannot show exactly; the JSON file has the exact text.

```text


Note: Pay special attention to the content selected by the user. If the user asks a question or refers to the content they are looking at on-screen, they might be referring to the selected content (but they might be referring to something else that's visible, too).
```

### Spotify links note

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x1196080; SHA-256 `a3dcd3bc277bb5ca4d6c9655537df2cfb1ad6ffa8863147c40c96c4f885ba151`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. It is a fragment that the program joins with other text at run time. Kind: prompt text. The string begins or ends with whitespace, which the block cannot show exactly; the JSON file has the exact text.

```text


Note: In order to be usable, Spotify app links must be rewritten as regular links (e.g. use open.spotify.com instead of xpui.app.spotify.com). Only use Spotify links that are written verbatim in the UI above. Note that IDs are only valid with their associated type (e.g. you cannot change an "album" URL to a "track" URL).
```

### read access was not approved. If the task's current approval_policy…

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11c1070; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa24100; SHA-256 `4f360125046d74df771c3a8587dfe9fceb5177929cdb3eeb5bea56a8fb0372c5`.

Exact: the whole NUL-terminated string at that offset, found by the vocabulary sweep and not yet reviewed.

```text
read access was not approved. If the task's current approval_policy is confirmed to be never, explain, without naming the internal policy value, that the task's approval settings may have blocked the read confirmation, and suggest switching the task to Ask for approval or Approve for me before retrying. Otherwise, do not suggest changing approval settings or ask the user to approve access or retry. Do not fall back to Computer Use or other tools to access the withheld content unless the user explicitly requests that alternative.
```

### The read approval response was invalid. No content was returned. Do…

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11c1ac0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa24b50; SHA-256 `1bc01f8576af0f7f3d81d2a4dc8b1d8f4d49851fbb1e81fed70c7e20b99ef1e1`.

Exact: the whole NUL-terminated string at that offset, found by the vocabulary sweep and not yet reviewed.

```text
The read approval response was invalid. No content was returned. Do not ask the user to approve access or retry. Do not fall back to Computer Use or other tools to access the withheld content unless the user explicitly requests that alternative.
```

## Calendar

### Stores Calendars Items Participants Locations

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x1180a10; SHA-256 `c7db7962a749881f1df676ac43526776567d7e107128998befa4fa2065632ac1`.

Exact: the whole NUL-terminated string at that offset, found by the vocabulary sweep and not yet reviewed.

```text
Stores Calendars Items Participants Locations
```

### ChatGPT uses Calendar to read and manage your events.

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x118a480; SHA-256 `b1c98177f59bd8b6e11a46f921cf5c1f5da53392d83a374dae73e8c33d624a5c`.

Exact: the whole NUL-terminated string at that offset, found by the vocabulary sweep and not yet reviewed.

```text
ChatGPT uses Calendar to read and manage your events.
```

### If omitted, uses the user's default calendar.

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bab30; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1d8b0; SHA-256 `3b951b0caad7d238ecfd9c215aa6f77ae07320a77c768880f9bd320092cc02b1`.

Exact: the whole NUL-terminated string at that offset, found by the vocabulary sweep and not yet reviewed.

```text
If omitted, uses the user's default calendar.
```

### End of the requested range as an ISO-8601 date-time. Must not prece…

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11baba0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1d920; SHA-256 `920d006364cadca984b979aabc1211af7d76c024e5fef4188546a94534fb883d`.

Exact: the whole NUL-terminated string at that offset, found by the vocabulary sweep and not yet reviewed.

```text
End of the requested range as an ISO-8601 date-time. Must not precede start_date or be more than 31 calendar days later. Equal dates query that day in the Mac's local timezone.
```

### The next_cursor returned by the preceding list_events response. Use…

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bac60; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1d9e0; SHA-256 `299923f78b0059ce30f92acb0c12add01e59c5d3c70abee39f5a49a118accf65`.

Exact: the whole NUL-terminated string at that offset, found by the vocabulary sweep and not yet reviewed.

```text
The next_cursor returned by the preceding list_events response. Use it unchanged to retrieve the next page, with the same start_date, end_date, and calendar_ids values.
```

### Tools for working with calendars and events in the macOS Calendar app.

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bc220; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1f070; SHA-256 `e1899eb2a81bdfb49aa580100e916dbd4435f581d02a56fe56939dae34b6fbbc`.

Exact: the whole NUL-terminated string at that offset, found by the vocabulary sweep and not yet reviewed.

```text
Tools for working with calendars and events in the macOS Calendar app.
```

### List calendars. Returns each calendar's id for reuse with list_even…

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bc320; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1f170; SHA-256 `18c166484e25cfd23bc19ae429439d799f32056ab0b86464b5b9b59a7566f912`.

Exact: the whole NUL-terminated string at that offset, found by the vocabulary sweep and not yet reviewed.

```text
List calendars. Returns each calendar's id for reuse with list_events, create_event, and update_event.
```

### List events in a date range, optionally filtered by calendar. This…

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bc3b0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1f200; SHA-256 `ea9dcb3ef0174a0adb9ebe8ca0d8ece641e03286015a8a4ebb7da3262732196d`.

Exact: the whole NUL-terminated string at that offset, found by the vocabulary sweep and not yet reviewed.

```text
List events in a date range, optionally filtered by calendar. This tool returns one page of events at a time. When more events are available, the response includes next_cursor; pass that value as cursor in the next list_events call. Returns each event's id for reuse with get_event, update_event, and delete_event. Within each response, each events[].calendar references a calendars[].local_ref, and each events[].attendees item references an attendees[].local_ref; do not reuse local_ref mappings across responses. Notes are omitted; use get_event to retrieve them.
```

### Optional calendar IDs. When nonempty, returns only events from thos…

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bc5f0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1f440; SHA-256 `61f30e3e1253d898d64d4d926c587b562f68f4bd7de74f64d149826e4b7a7936`.

Exact: the whole NUL-terminated string at that offset, found by the vocabulary sweep and not yet reviewed.

```text
Optional calendar IDs. When nonempty, returns only events from those calendars.
```

### Create an event. Unless the user requests a specific calendar, omit…

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bc720; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1f570; SHA-256 `8e3d45baa737f713100856f47620ac9be4e79cc8ab1d05803aa798b952cf516e`.

Exact: the whole NUL-terminated string at that offset, found by the vocabulary sweep and not yet reviewed.

```text
Create an event. Unless the user requests a specific calendar, omit calendar_id to use their default calendar. Returns the created event. Including attendees may send invitations.
```

### Event end as an ISO-8601 date-time. If omitted or earlier than star…

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bc9e0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1f830; SHA-256 `6e8b7420169f5f159b8c185ec27a9f4625ffad7d66e7c94c789d3da284da2ef3`.

Exact: the whole NUL-terminated string at that offset, found by the vocabulary sweep and not yet reviewed.

```text
Event end as an ISO-8601 date-time. If omitted or earlier than start_date, uses the Calendar app's default event duration.
```

### Calendar permissions are not granted

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bd270; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa201c0; SHA-256 `dbd9679220295c2a6cc53cdaebdd876e9506dde7ca631cbb85f376701e47b189`.

Exact: the whole NUL-terminated string at that offset, found by the vocabulary sweep and not yet reviewed.

```text
Calendar permissions are not granted
```

### calendar ON calendar.id = item.calendar_id

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11ccca0; SHA-256 `a7778ade53cf5353613bf1aee37192a90f7c187665de68187a5b2f6ab918d7ae`.

Exact: the whole NUL-terminated string at that offset, found by the vocabulary sweep and not yet reviewed. The string begins or ends with whitespace, which the block cannot show exactly; the JSON file has the exact text.

```text
 calendar ON calendar.id = item.calendar_id
LEFT JOIN 
```

### store ON store.id = calendar.store_id

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11ccce0; SHA-256 `a3ba0190313ccae75886f18a9b27fe61b46fa8e63add1df632e1f90d068044ee`.

Exact: the whole NUL-terminated string at that offset, found by the vocabulary sweep and not yet reviewed. The string begins or ends with whitespace, which the block cannot show exactly; the JSON file has the exact text.

```text
 store ON store.id = calendar.store_id
WHERE item.unique_id = 
```

### Can't edit event as the calendar the event belongs to (

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11ccdf0; SHA-256 `07a6dbb600633837c1c5b8c28287e8e96314101c2436acf280edf4d42f564b15`.

Exact: the whole NUL-terminated string at that offset, found by the vocabulary sweep and not yet reviewed.

```text
Can't edit event as the calendar the event belongs to (
```

### events match this request. No partial results were returned. Try a…

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11cd280; SHA-256 `d26a1a90300213cd8748f5a0dc798ae50afa8c8d2cdd8af6decfbf395110c5d7`.

Exact: the whole NUL-terminated string at that offset, found by the vocabulary sweep and not yet reviewed. The string begins or ends with whitespace, which the block cannot show exactly; the JSON file has the exact text.

```text
 events match this request. No partial results were returned. Try a shorter date range or fewer calendars.
```

### No default calendar is available

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11cd2f0; SHA-256 `d1998a09b5faf9115221857e327e56269b26f76b7d86274fceac83ffd3d68070`.

Exact: the whole NUL-terminated string at that offset, found by the vocabulary sweep and not yet reviewed.

```text
No default calendar is available
```

### Could not determine the calendar day for the requested date.

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11cd380; SHA-256 `d649758ec0628ba74509f2a50c2c7b5409e7a5a2620be0b109517476b2b76669`.

Exact: the whole NUL-terminated string at that offset, found by the vocabulary sweep and not yet reviewed.

```text
Could not determine the calendar day for the requested date.
```

## In the code, not shipped: Calendar

- The Calendar placeholder tool description is not in this build.
- No folder under `plugins/openai-bundled/plugins` has "calendar" in its name.
- Inference: it would use macOS Calendar access, going by the permission type names below.
- Inference: it looks gated by a remote feature flag, going by the Statsig configuration error below.

### Subcommand help

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bd070; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1ffc0; SHA-256 `67c32cea516cd56ed66318792b46803383baf3b535640bec4e42dbe812e06575`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: command-line help.

```text
Runs the Calendar client as an MCP server
```

### Statsig configuration error

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x11bd0a0; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1fff0; SHA-256 `72849f3002c05738f101a552a98ea4f9756bf22e404d8528556432cb16754d7e`.

Exact: the whole NUL-terminated string at that offset, decoded as UTF-8. Kind: error text.

```text
Failed to configure Calendar MCP Statsig
```

### CalendarMCPServer

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x115ba50 (a string on its own), 0x11bc289, 0x1667ed1; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa1f0d9, 0xa478a0 (a string on its own), 0xddbd95; SHA-256 `b5c3e64e75e2fc1337c8f66557e1ec0f8e24ff8bb19a8994433514e1c14b8d6a`.

Exact: these bytes occur at the listed offsets. Only the name is shown, not the metadata bytes around it.

```text
CalendarMCPServer
```

### CalendarMCPCommand

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x115c280 (a string on its own); `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa480d0 (a string on its own); SHA-256 `c23a42e65f8ccc94130d19c8996c9da5f1a26df77434a704fae490ae8cacfcd7`.

Exact: these bytes occur at the listed offsets. Only the name is shown, not the metadata bytes around it.

```text
CalendarMCPCommand
```

### CalendarCommand

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x115c1e0 (a string on its own); `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa48030 (a string on its own); SHA-256 `981d9a19764e736514e8171af32aa6656ec24ea4689605f6bec422e746106c33`.

Exact: these bytes occur at the listed offsets. Only the name is shown, not the metadata bytes around it.

```text
CalendarCommand
```

### CalendarPermission

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x117b810 (a string on its own); SHA-256 `34ff9c389d157d6dddd67d53ea3101a1744510d1f60b8dfe74617316acd0f441`.

Exact: these bytes occur at the listed offsets. Only the name is shown, not the metadata bytes around it.

```text
CalendarPermission
```

### CalendarAppleEventsPermission

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x117b300 (a string on its own), 0x16ddf3a; SHA-256 `94e90411a6bfc5a0eb1e8900002db9eccb189ceac9ecdd9ce2d18d46004fb2c3`.

Exact: these bytes occur at the listed offsets. Only the name is shown, not the metadata bytes around it.

```text
CalendarAppleEventsPermission
```

### CalendarOperationCoordinator

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x10bb7d0 (a string on its own), 0x118f003, 0x153d3a9; SHA-256 `ec7f22c340e11c4ef7cb86c01c369da24528079e5f6aa348b6b7317f01c0380a`.

Exact: these bytes occur at the listed offsets. Only the name is shown, not the metadata bytes around it.

```text
CalendarOperationCoordinator
```

### CodexCalendarMcpServerLaunched

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x112ea13, 0x11ad60d; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xa3961d, 0xaaf293; SHA-256 `9b673a1ae0640f10d1dd2f74cb4dbb8d36a5741c753315c609dc71505cf7cf12`.

Exact: these bytes occur at the listed offsets. Only the name is shown, not the metadata bytes around it.

```text
CodexCalendarMcpServerLaunched
```

### CODEX_CONVERSATIONAL_ONBOARDING_ACCESS_TYPE_CALENDAR_APP

Source: `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` at 0x112aa7a; `cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` at 0xaab2fa; SHA-256 `916e2a2a4c7ba8cbc8a5050e636458c7a142ea08d6657036e409d178efef52d0`.

Exact: these bytes occur at the listed offsets. Only the name is shown, not the metadata bytes around it.

```text
CODEX_CONVERSATIONAL_ONBOARDING_ACCESS_TYPE_CALENDAR_APP
```

## Not found in this build

### messages-result-denied-tail

Source: not found in this build (not in either binary).

```text
read access was not approved. Do not ask
```

### calendar-placeholder

Source: not found in this build (not in either binary).

```text
Placeholder for the planned Calendar plugin.
```

### calendar-symbol-ComputerUseIPCCalendarPlaceholderRequest

Source: not found in this build (not in either binary).

```text
ComputerUseIPCCalendarPlaceholderRequest
```

### calendar-symbol-ComputerUseIPCCalendarPlaceholderResponse

Source: not found in this build (not in either binary).

```text
ComputerUseIPCCalendarPlaceholderResponse
```

### calendar-symbol-not_implemented

Source: not found in this build (not in either binary).

```text
not_implemented
```
