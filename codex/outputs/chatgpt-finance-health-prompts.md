# ChatGPT finance and health prompts

Source: `app.asar` of the Codex/ChatGPT desktop app 26.1002.52244 (build 13536), SHA-256 `40efd7acdf03a24817fcd7f35684fc2173b154df06774243cb4ab227e36fa915`.

Messages the app sends for ChatGPT's personal finance features (manual accounts and newly connected accounts) and the hidden context message for a selected Health record.

ChatGPT's own system prompt is not in the app; the servers add it. The phrase "You are ChatGPT" occurs in none of the app's scripts.

Each entry says whether its text is exact (one literal in the bundle) or assembled (literal pieces joined as the app joins them). Entries with a message id or translator note are formatjs messages: the text shown is the English source (`defaultMessage`), and the app sends the model whatever the user's language translates it to.

## Manual accounts

### Manual account: cash

Source: `webview/assets/CompilerIntrinsics-a07e71512781.js`, offset 369301, SHA-256 `7cb7157a5301cd54123329cb032e188baf09d56ad47975796c707863683faa65`.

Exact text from the bundle.

Translator note: User message automatically sent to ChatGPT when a user selects the Cash manual-account category. Ask one short question at a time for the account name, checking or savings subtype, and current balance; the institution is optional and currency is needed only if unclear. Save a separate account as a financial memory only after the user answers. Preserve the first-person request.

```text
Help me track a cash account manually. Ask one short question at a time for its name, checking or savings type, current balance, and currency if unclear. An institution is optional. After I answer, save it as a financial memory for a separate account.
```

### Manual account: investment

Source: `webview/assets/CompilerIntrinsics-a07e71512781.js`, offset 370646, SHA-256 `b42809a0fe8a3af18c79f3974c6dc63189ba47b28f6b4cbb36b34b6f979abf08`.

Exact text from the bundle.

Translator note: User message automatically sent to ChatGPT when a user selects the Investments manual-account category. Ask one short question at a time for the account name, investment account subtype, and total balance; ask for currency only if unclear. After the user answers, save a separate investment account as a financial memory, not as an individual holding or generic asset. Preserve the first-person request.

```text
Help me track an investment account manually. Ask one short question at a time for its name, type, total balance, and currency if unclear. After I answer, save it as a financial memory for a separate investment account, not a holding or generic asset.
```

### Manual account: real estate

Source: `webview/assets/CompilerIntrinsics-a07e71512781.js`, offset 373066, SHA-256 `e0156866c1361713b955796f64a150829a7a9dd14c665413adb1aa2f7953e58a`.

Exact text from the bundle.

Translator note: User message automatically sent to ChatGPT when a user selects the Real estate manual-account category. Ask one short question at a time for the property name, property type, and estimated value; ask for currency only if unclear. Save a financial memory only after the user answers. Preserve the first-person request.

```text
Help me track real estate manually. Ask one short question at a time for the property name, type, estimated value, and currency if unclear. After I answer, save it as a financial memory.
```

### Manual account: vehicle

Source: `webview/assets/CompilerIntrinsics-a07e71512781.js`, offset 373607, SHA-256 `ccfb5eb8226036a30bd7d2a1c67837d295c5e207dc4d3bb91e4d47d3e3bbcff3`.

Exact text from the bundle.

Translator note: User message automatically sent to ChatGPT when a user selects the Vehicle manual-account category. Ask one short question at a time for the vehicle name, vehicle type, and estimated value; ask for currency only if unclear. Save a financial memory only after the user answers. Preserve the first-person request.

```text
Help me track a vehicle manually. Ask one short question at a time for its name, type, estimated value, and currency if unclear. After I answer, save it as a financial memory.
```

### Manual account: asset

Source: `webview/assets/CompilerIntrinsics-a07e71512781.js`, offset 371912, SHA-256 `152e2eb2657d3453def2f2b98822b07a9280d20a4d7d2843b0069a650e05f662`.

Exact text from the bundle.

Translator note: User message automatically sent to ChatGPT when a user selects the Other assets manual-account category. Ask one short question at a time for the asset name, asset type, and estimated value; ask for currency only if unclear. Save a financial memory only after the user answers. Preserve the first-person request.

```text
Help me track an asset manually. Ask one short question at a time for its name, type, estimated value, and currency if unclear. After I answer, save it as a financial memory.
```

### Manual account: loan

Source: `webview/assets/CompilerIntrinsics-a07e71512781.js`, offset 371338, SHA-256 `14c02b21c767a10bc43dafd4c6139c78244ea261e98331e84a379327c276a2cb`.

Exact text from the bundle.

Translator note: User message automatically sent to ChatGPT when a user selects the Loans manual-account category. Ask one short question at a time for the loan name, loan type, and positive amount owed; the lender is optional and currency is needed only if unclear. Save a financial memory only after the user answers. Preserve the first-person request.

```text
Help me track a loan manually. Ask one short question at a time for its name, type, positive amount owed, and currency if unclear. A lender is optional. After I answer, save it as a financial memory.
```

### Manual account: debt

Source: `webview/assets/CompilerIntrinsics-a07e71512781.js`, offset 372436, SHA-256 `12aa6a70f14eee9841ebc559cf01b7e597877abb2333c27313a0da06f01ff3a7`.

Exact text from the bundle.

Translator note: User message automatically sent to ChatGPT when a user selects the Other debt manual-account category. Ask one short question at a time for the debt name, credit-card or other debt subtype, and positive amount owed; the creditor is optional and currency is needed only if unclear. Save a financial memory only after the user answers. Preserve the first-person request.

```text
Help me track a debt manually. Ask one short question at a time for its name, whether it is a credit card, positive amount owed, and currency if unclear. A creditor is optional. After I answer, save it as a financial memory.
```

### Manual account: insurance

Source: `webview/assets/CompilerIntrinsics-a07e71512781.js`, offset 369969, SHA-256 `fff9d6741b4b0d706f73c90a9e930686a707c0bcd7862876757191fe70051576`.

Exact text from the bundle.

Translator note: User message automatically sent to ChatGPT when a user selects the Insurance manual-account category. First confirm the policy has actual cash or surrender value, not merely a death benefit, then ask one short question at a time for its name and cash value; ask for currency only if unclear. Save a financial memory only after the user answers. Preserve the first-person request.

```text
Help me track an insurance policy manually. First ask if it has an actual cash or surrender value, not just a death benefit. Then ask one short question at a time for its name, value, and currency if unclear. Only after I answer, save it as a financial memory.
```

## Connected accounts

### Newly connected accounts

Source: `webview/assets/home-beacon-d2f696606dcb.js`, offset 4357, SHA-256 `6a3fd68e58b9b5b9ccb6657e2574659cadf80fec23af48a63d7fe4ed5d39b0f8`.

Exact text from the bundle. Message id `personalFinance.homeBeacon.onboardingPrompt`. The same text ships at 2 places in the bundle; the first is shown.

Translator note: User message submitted after connecting bank accounts from a Finance homepage banner or modal, asking ChatGPT to explain how the connected accounts can be used

```text
What can I do with my newly connected accounts once they finish syncing?
```

## Health

### Selected Health record

Source: `webview/assets/page-5230a99948b8.js`, offset 21834, SHA-256 `66363e44c91093868d6bde0d5761dfdbaf5c9b75b9d709f682cb832955843179`.

Assembled from literal pieces in the bundle, joined as the app joins them; `<…>` marks a value filled in at run time. Sent as a hidden tool-role message (author `olympic.context`); <…> is the Health-generated link as JSON.

```text
The user is asking about the currently selected Health record. Call open_medical_resource with this Health-generated link: <…>. Use the returned record and any related historical measurements to answer the user's question.
```
