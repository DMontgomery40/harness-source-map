# ChatGPT GPT builder prompts

Source: `app.asar` of the Codex/ChatGPT desktop app 26.1002.52244 (build 13536), SHA-256 `40efd7acdf03a24817fcd7f35684fc2173b154df06774243cb4ab227e36fa915`.

Hidden system messages the app adds to the GPT builder conversation (Create a GPT) to tell the builder model the GPT's current fields, direct edits and uploaded files.

ChatGPT's own system prompt is not in the app; the servers add it. The phrase "You are ChatGPT" occurs in none of the app's scripts.

Each entry says whether its text is exact (one literal in the bundle) or assembled (literal pieces joined as the app joins them). Entries with a message id or translator note are formatjs messages: the text shown is the English source (`defaultMessage`), and the app sends the model whatever the user's language translates it to.

## Current GPT fields

### Current fields: no profile picture

Source: `webview/assets/page-dce2648deab8.js`, function `xn(gpt)`, offset 3146, SHA-256 `50c9d93a3cdd14049e52e97bb0ccbd5b297352a37d64cebde5e62509e520d561`.

Assembled by running the app's builder function with placeholder arguments such as `<NAME>`. Sent as a hidden system message in the GPT builder conversation. Branch for a GPT with no profile picture.

```text
This is the GPT's current set of fields:

{
  "name": "<NAME>",
  "description": "<DESCRIPTION>",
  "context": "<INSTRUCTIONS>",
  "prompt_starters": [
    "<PROMPT_STARTER>"
  ],
  "abilities": [
    "<ABILITY>"
  ],
  "file_ids": [
    "<FILE_ID>"
  ]
}

This GPT does not have a profile picture. You must generate a profile picture when you next update your behavior.
```

### Current fields: with profile picture

Source: `webview/assets/page-dce2648deab8.js`, function `xn(gpt)`, offset 3146, SHA-256 `fa04926be840d1670593e01cd2f11d495bf42905ba4b5cba3d1310a0db190043`.

Assembled by running the app's builder function with placeholder arguments such as `<NAME>`. Sent as a hidden system message in the GPT builder conversation. Branch for a GPT with a profile picture.

```text
This is the GPT's current set of fields:

{
  "name": "<NAME>",
  "description": "<DESCRIPTION>",
  "context": "<INSTRUCTIONS>",
  "prompt_starters": [
    "<PROMPT_STARTER>"
  ],
  "abilities": [
    "<ABILITY>"
  ],
  "file_ids": [
    "<FILE_ID>"
  ]
}

The GPT has a profile picture.
```

## Builder updates

### Settings changed directly

Source: `webview/assets/page-dce2648deab8.js`, offset 3813, SHA-256 `ea7dce415e54fedafd65dae250ebf5f69c582f95090f34695d878ffe2fd0573c`.

Assembled from literal pieces in the bundle, joined as the app joins them; `<…>` marks a value filled in at run time. Sent as a hidden system message in the GPT builder conversation. The leading <…> is the current-fields text above.

```text
<…>

The user changed these settings directly. Treat these fields, abilities, and files as the current GPT configuration. Do not call update_behavior yet; incorporate these changes in your next update_behavior call. Files absent from file_ids are no longer available to the GPT.
```

### Files uploaded to the GPT

Source: `webview/assets/page-dce2648deab8.js`, offset 25193, SHA-256 `a6a36541e762f65f11901f66a3f39b1475aa412558f9b950ecc2cfa72fe71335`.

Assembled from literal pieces in the bundle, joined as the app joins them; `<…>` marks a value filled in at run time. Sent as a hidden system message in the GPT builder conversation.

```text
The user uploaded these files to the GPT: <…>. Incorporate them in your next update_behavior call.
```
