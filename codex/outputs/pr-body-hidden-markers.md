# Hidden markers in pull request bodies

GitHub can store HTML comments in a pull request description. They do not appear in the rendered description, but they remain in the raw Markdown body returned by the API or shown when editing the description. They are not secret metadata. [GitHub's Markdown documentation](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#hiding-content-with-comments) describes this behavior; the [pull request API](https://docs.github.com/en/rest/pulls/pulls#get-a-pull-request) distinguishes raw and rendered bodies.

## Observed Copyberry marker

The raw body of [openai/codex PR #34819](https://github.com/openai/codex/pull/34819), which introduced git attribution across Codex entry points, ends with this HTML comment shape:

```text
<!-- copyberry-projection-id: <64 lowercase hexadecimal characters> -->
```

The PR was merged by `copyberry[bot]` from a branch named `copyberry/codex-internal-to-codex-oss/...`. That context suggests the value identifies a Copyberry synchronization projection. The exact meaning of the value and the system's use of it are not established by the public PR or CLI source. This is an observed marker in an OpenAI PR, not a universal Codex/ChatGPT marker.

The [compiled CLI instruction](/codex/codex-cli-prompts/#git-attribution) says to preserve existing hidden markers when editing a PR body. It does not define a marker format or direct the agent to create this Copyberry marker. The prompt inventory records the instruction; this page records a concrete marker found in a PR body.

To inspect the raw body yourself, run `gh api repos/openai/codex/pulls/34819 --jq .body` and look at its final line.
