# ChatGPT conversation prompts

Source: `app.asar` of the Codex/ChatGPT desktop app 26.930.31730 (build 12947), SHA-256 `87a934de9a00a04d2e534693db87756321ca4f3413f6caa55d3a0d32a5543836`.

Text the app adds to ChatGPT conversations: the regenerate-with-feedback instruction, the sponsored-ad system message, the onboarding kickoff, image-edit and flight-search requests, and the tool results of the ChatGPT-to-Codex handoff.

ChatGPT's own system prompt is not in the app; the servers add it. The phrase "You are ChatGPT" occurs in none of the app's scripts.

Each entry says whether its text is exact (one literal in the bundle) or assembled (literal pieces joined as the app joins them). Entries with a message id or translator note are formatjs messages: the text shown is the English source (`defaultMessage`), and the app sends the model whatever the user's language translates it to.

## Conversation turns

### Regenerate with feedback

Source: `webview/assets/chatgpt-conversation-turn-content-5d0b191cc345.js`, offset 296073, SHA-256 `d68556b8a8cac27620e6c3fca92aa36debd19bd595957d8b899ebf69130d4a9d`.

Exact text from the bundle.

```text
The user provided feedback on a previous completion. Use it to generate a new completion. The output should be a standalone response that reflects the feedback without acknowledging it. Do not mention, suggest, or imply that this is a revision, improvement, or result of feedback. Respond in the same language as the original completion, even if the feedback is in another language. Only switch if the feedback explicitly asks you to translate the completion. Here is the feedback:
```

### Ask ChatGPT about a sponsored ad

Source: `webview/assets/placement-715d7f997424.js`, offset 148323, SHA-256 `c7e19e498d3e8673989a66249519934b5927e2af1230f7a8e7cb800caf29b37b`.

Exact text from the bundle. Default of the `ask_chatgpt_system_message` remote config value; the server can replace it. The app fills `{LABEL}` and `{DATA}` from the ad.

```text
The user is referring to a sponsored ad: {LABEL}
{DATA}
```

### Conversational onboarding kickoff

Source: `webview/assets/chatgpt-onboarding-content-ca56df77e4dd.js`, offset 4036, SHA-256 `478e1a7542e5e0f0e8f37e331c80e7a5dc37898bcaa893f32715f9eb0f6ba8a5`.

Exact text from the bundle. Message id `chatgpt.new-onboarding.conversational-onboarding.bootstrap.kickoff-prompt`.

Translator note: Hidden user message sent programmatically to start a new user's conversational onboarding conversation. It instructs ChatGPT to write the first assistant reply and is not shown in the conversation UI.

```text
Write the first assistant message for this onboarding conversation.
```

## Images

### Image edit: remove background

Source: `webview/assets/image-side-panel-53196d0209a2.js`, offset 85773, SHA-256 `17f4b84bda66d7c716c663463a0dc387d84ba141234aea966c78aff5c8c3b4e1`.

Exact text from the bundle. Message id `imageSidePanel.removeBackgroundPrompt`.

Translator note: Prompt submitted immediately when the user selects Remove BG in the image panel. Instructs the image model to preserve all foreground subjects and make the background transparent. Appears in conversation history.

```text
Remove the background from this image. Keep all foreground subjects unchanged and fully intact, with clean, smooth edges. Make the background transparent.
```

### Image edit: remove selection

Source: `webview/assets/image-side-panel-53196d0209a2.js`, offset 80664, SHA-256 `22ea809d5b22ec49b853bca396b882fe6032344f0e09409737019ff9eb5cc10f`.

Exact text from the bundle. Message id `imageSidePanel.removeSelectionPrompt`.

Translator note: Instruction sent to ChatGPT with an inpainting selection when the user submits the image editor's Remove tool.

```text
Remove the selected area from this image
```

### Image questionnaire: attached image

Source: `webview/assets/app-primary-5fc751535eb1.js`, offset 132270, SHA-256 `c53ee0d7026b93f6b79ca8e0a347c30b9327e75d5c93492e0911efe0ba9d46ad`.

Exact text from the bundle. Message id `chatgpt.imagegenInput.uploadedImageAnswer`.

Translator note: Answer text sent to ChatGPT from an image-generation questionnaire after the user selects a reference photo. fileName is the selected photo's filename. Keep this instruction concise.

```text
Use the attached image: {fileName}
```

### Image questionnaire: attached file

Source: `webview/assets/app-primary-5fc751535eb1.js`, offset 132597, SHA-256 `b1cf3aa3d19a0e9bc2a14bb1be3307ce4e9c3f4d9cbebeb3ca02d4afadb4338e`.

Exact text from the bundle. Message id `chatgpt.imagegenInput.uploadedFileAnswer`.

Translator note: Answer text sent to ChatGPT from an image-generation questionnaire after the user attaches a document. fileName is the selected document's filename. Keep this instruction concise.

```text
Use the attached file: {fileName}
```

### Image questionnaire: skipped

Source: `webview/assets/app-primary-5fc751535eb1.js`, offset 133627, SHA-256 `0aecb48b055f5557b2b3bd925696c2e08cbbd470cc25c36eca6ca92c97599bde`.

Exact text from the bundle. Message id `chatgpt.imagegenInput.questionsSkipped`.

Translator note: User message sent when someone closes the image-generation questionnaire without answering any questions. It asks ChatGPT to continue without additional preferences. Keep this short and neutral.

```text
Questions skipped
```

## Flights

### Flight search adjustment

Source: `webview/assets/form-a3501a7ac9bb.js`, offset 10152, SHA-256 `304dd9653993e7dbac4e4752eadf721ce072fb1046e352aa110f065522812a65`.

Exact text from the bundle. Message id `flightSearch.submission.adjustment`.

Translator note: Complete message sent when a user types a flight-search amendment. The current itinerary is context, not a confirmed search. tripType selects one_way or round_trip; origin and destination are user-entered places; departureDate and returnDate are ISO dates. hasOrigin, hasDestination, hasDeparture, and hasReturn select yes when the detail is present, otherwise a missing-value label. partySize counts adults. cabinClass selects the airline seating class. connections is -1 for unrestricted stops, zero for nonstop, or the maximum stops in each direction. changes is the user's amendment, which overrides conflicting details. Preserve the instruction to clarify missing facts before searching.

```text
Please update my flight search. Current details: {tripType, select, round_trip {Round trip} other {One way}}; from {hasOrigin, select, yes {{origin}} other {Not specified}} to {hasDestination, select, yes {{destination}} other {Not specified}}; departure {hasDeparture, select, yes {{departureDate}} other {Not specified}}; return {tripType, select, one_way {No return flight} other {{hasReturn, select, yes {{returnDate}} other {Not specified}}}}; adults {partySize}; {cabinClass, select, premium_economy {Premium economy} business {Business} first {First} other {Economy}}; {connections, plural, =-1 {Any number of stops} =0 {Nonstop only} one {At most # stop in each direction} other {At most # stops in each direction}}.
My changes: {changes}
Apply these changes in place of any conflicting details, and ask for anything still needed before searching.
```

## ChatGPT to Codex handoff

### Handoff accepted: tool result

Source: `webview/assets/app-initial-576fc7ca620e.js`, offset 1757495, SHA-256 `aee7f45d27687e0a56d9ca178489bf3fa02a04b3fbafc4a13e22b80454a018e5`.

Assembled from literal pieces in the bundle, joined as the app joins them; `<…>` marks a value filled in at run time. Default of the ChatGPT-to-Codex handoff config (dynamic config 2668276729); the server can replace it.

```text
User chose to hand off:
- You can confirm that the new chat has been created but do not link to it until the user asks you to
- You can't make any more changes to the new chat! If user wants changes, they need to go the new chat and make changes themselves.
- If the user says they can't find the chat, link them using this markdown exactly: [here](<…>)
```

### Handoff declined: tool result

Source: `webview/assets/app-initial-576fc7ca620e.js`, offset 1757888, SHA-256 `c29d1c24d0b5f05634b1da23959a495fc825ec4324c3a5a7c53da5dfd94bd6f3`.

Exact text from the bundle. Default of the ChatGPT-to-Codex handoff config (dynamic config 2668276729); the server can replace it.

```text
The user chose not to hand off.
```
