# Codex CLI bundled skills

Source: openai/codex `rust-v0.162.0-alpha.2` (commit `74e804deeb12`), matching the bundled `codex-cli 0.162.0-alpha.2`.

The sample skills built into the Codex CLI, each with its SKILL.md and reference files. They are read from the openai/codex source at the tag that matches the bundled CLI and checked byte for byte against the shipped executable.

## imagegen

### SKILL.md

Source: `codex-rs/skills/src/assets/samples/imagegen/SKILL.md`, SHA-256 `681ddb4ad6d06a2acc78a3535b583f8d0c1ea800ecda3d56370d3310fd2cd4ba`.

````text
---
name: "imagegen"
description: "Generate or edit raster images when the task benefits from AI-created bitmap visuals such as photos, illustrations, textures, sprites, mockups, or transparent-background cutouts. Use when Codex should create a brand-new image, transform an existing image, or derive visual variants from references, and the output should be a bitmap asset rather than repo-native code or vector. Do not use when the task is better handled by editing existing SVG/vector/code-native assets, extending an established icon or logo system, or building the visual directly in HTML/CSS/canvas."
---

# Image Generation Skill

Generates or edits images for the current project (for example website assets, game assets, UI mockups, product mockups, wireframes, logo design, photorealistic images, or infographics).

## Top-level modes and rules

This skill has exactly two top-level modes:

- **Default built-in tool mode (preferred):** built-in `image_gen` tool for image generation, editing, and transparent-image requests. Does not require `OPENAI_API_KEY`.
- **Fallback CLI mode:** `scripts/image_gen.py` CLI. Use when the user explicitly asks for or confirms the CLI/API/model path. Requires `OPENAI_API_KEY`.

Within CLI fallback, the CLI exposes three subcommands:

- `generate`
- `edit`
- `generate-batch`

Rules:
- Use the built-in `image_gen` tool by default for normal image generation and editing requests.
- Do not switch to CLI fallback for ordinary quality, size, or file-path control.
- For transparent images, ask built-in `image_gen` for a transparent background and preserve the generated alpha.
- Never silently switch from built-in `image_gen` or CLI `gpt-image-2` to CLI `gpt-image-1.5`; ask the user first unless they explicitly requested `gpt-image-1.5`.
- The word `batch` by itself does not mean CLI fallback. If the user asks for many assets or says to batch-generate assets without explicitly asking for CLI/API/model controls, stay on the built-in path and issue one built-in call per requested asset or variant.
- If the built-in tool fails or is unavailable, tell the user the CLI fallback exists and that it requires `OPENAI_API_KEY`. Proceed only if the user explicitly asks for that fallback.
- If the user explicitly asks for CLI mode, use the bundled `scripts/image_gen.py` workflow. Do not create one-off SDK runners.
- Never modify `scripts/image_gen.py`. If something is missing, ask the user before doing anything else.

Built-in save-path policy:
- In built-in tool mode, Codex saves generated images under `$CODEX_HOME/*` by default.
- Do not describe or rely on OS temp as the default built-in destination.
- Do not describe or rely on a destination-path argument (if any) on the built-in `image_gen` tool. If a specific location is needed, generate first and then move or copy the selected output from `$CODEX_HOME/generated_images/...`.
- Save-path precedence in built-in mode:
  1. If the user names a destination, move or copy the selected output there.
  2. If the image is meant for the current project, move or copy the final selected image into the workspace before finishing.
  3. If the image is only for preview or brainstorming, render it inline; the underlying file can remain at the default `$CODEX_HOME/*` path.
- Never leave a project-referenced asset only at the default `$CODEX_HOME/*` path.
- Do not overwrite an existing asset unless the user explicitly asked for replacement; otherwise create a sibling versioned filename such as `hero-v2.png` or `item-icon-edited.png`.

Shared prompt guidance for both modes lives in `references/prompting.md` and `references/sample-prompts.md`.

Fallback-only docs/resources for CLI mode:
- `references/cli.md`
- `references/image-api.md`
- `references/codex-network.md`
- `scripts/image_gen.py`

## When to use
- Generate a new image (concept art, product shot, cover, website hero)
- Generate a new image using one or more reference images for style, composition, or mood
- Edit an existing image (inpainting, lighting or weather transformations, background replacement, object removal, compositing, transparent background)
- Produce many assets or variants for one task

## When not to use
- Extending or matching an existing SVG/vector icon set, logo system, or illustration library inside the repo
- Creating simple shapes, diagrams, wireframes, or icons that are better produced directly in SVG, HTML/CSS, or canvas
- Making a small project-local asset edit when the source file already exists in an editable native format
- Any task where the user clearly wants deterministic code-native output instead of a generated bitmap

## Decision tree

Think about two separate questions:

1. **Intent:** is this a new image or an edit of an existing image?
2. **Execution strategy:** is this one asset or many assets/variants?

Intent:
- If the user wants to modify an existing image while preserving parts of it, treat the request as **edit**.
- If the user provides images only as references for style, composition, mood, or subject guidance, treat the request as **generate**.
- If the user provides no images, treat the request as **generate**.

Built-in edit semantics:
- Built-in edit mode is for images already visible in the conversation context, such as attached images or images generated earlier in the thread.
- If the user wants to edit a local image file with the built-in tool, first load it with built-in `view_image` tool so the image is visible in the conversation context, then proceed with the built-in edit flow.
- Do not promise arbitrary filesystem-path editing through the built-in tool.
- If a local file still needs direct file-path control, masks, or other explicit CLI-only parameters, use the explicit CLI fallback only when the user asks for it.
- For edits, preserve invariants aggressively and save non-destructively by default.

Execution strategy:
- In the built-in default path, produce many assets or variants by issuing one `image_gen` call per requested asset or variant.
- In the CLI fallback path, use the CLI `generate-batch` subcommand only when the user explicitly chose CLI mode and needs many prompts/assets.
- For many distinct assets, do not use `n` as a substitute for separate prompts. `n` is for variants of one prompt; distinct assets need distinct built-in calls or distinct CLI `generate-batch` jobs.

Assume the user wants a new image unless they clearly ask to change an existing one.

## Workflow
1. Decide the top-level mode: built-in by default, including transparent-output requests; fallback CLI only if explicitly requested or confirmed.
2. Decide the intent: `generate` or `edit`.
3. Decide whether the output is preview-only or meant to be consumed by the current project.
4. Decide the execution strategy: single asset vs repeated built-in calls vs CLI `generate-batch`.
5. Collect inputs up front: prompt(s), exact text (verbatim), constraints/avoid list, and any input images.
6. For every input image, label its role explicitly:
   - reference image
   - edit target
   - supporting insert/style/compositing input
7. If the edit target is only on the local filesystem and you are staying on the built-in path, inspect it with `view_image` first so the image is available in conversation context.
8. If the user asked for a photo, illustration, sprite, product image, banner, or other explicitly raster-style asset, use `image_gen` rather than substituting SVG/HTML/CSS placeholders. If the request is for an icon, logo, or UI graphic that should match existing repo-native SVG/vector/code assets, prefer editing those directly instead.
9. Augment the prompt based on specificity:
   - If the user's prompt is already specific and detailed, normalize it into a clear spec without adding creative requirements.
   - If the user's prompt is generic, add tasteful augmentation only when it materially improves output quality.
10. Use the built-in `image_gen` tool by default.
11. For transparent-output requests, ask built-in `image_gen` for a transparent background and preserve the generated alpha channel.
12. Inspect outputs and validate: subject, style, composition, text accuracy, and invariants/avoid items.
13. Iterate with a single targeted change, then re-check.
14. For preview-only work, render the image inline; the underlying file may remain at the default `$CODEX_HOME/generated_images/...` path.
15. For project-bound work, move or copy the selected artifact into the workspace and update any consuming code or references. Never leave a project-referenced asset only at the default `$CODEX_HOME/generated_images/...` path.
16. For batches or multi-asset requests, persist every requested deliverable final in the workspace unless the user explicitly asked to keep outputs preview-only. Discarded variants do not need to be kept unless requested.
17. If the user explicitly chooses or confirms the CLI fallback, then use the fallback-only docs for model, quality, size, `input_fidelity`, masks, output format, output paths, and network setup.
18. Always report the final saved path(s) for any workspace-bound asset(s), plus the final prompt or prompt set and whether the built-in tool or fallback CLI mode was used.

## Transparent image requests

Ask built-in `image_gen` for a genuinely transparent background and preserve its alpha.

## Prompt augmentation

Reformat user prompts into a structured, production-oriented spec. Make the user's goal clearer and more actionable, but do not blindly add detail.

Treat this as prompt-shaping guidance, not a closed schema. Use only the lines that help, and add a short extra labeled line when it materially improves clarity.

### Specificity policy

Use the user's prompt specificity to decide how much augmentation is appropriate:

- If the prompt is already specific and detailed, preserve that specificity and only normalize/structure it.
- If the prompt is generic, you may add tasteful augmentation when it will materially improve the result.

Allowed augmentations:
- composition or framing hints
- polish level or intended-use hints
- practical layout guidance
- reasonable scene concreteness that supports the stated request

Not allowed augmentations:
- extra characters or objects that are not implied by the request
- brand names, slogans, palettes, or narrative beats that are not implied
- arbitrary side-specific placement unless the surrounding layout supports it

## Use-case taxonomy (exact slugs)

Classify each request into one of these buckets and keep the slug consistent across prompts and references.

Generate:
- photorealistic-natural — candid/editorial lifestyle scenes with real texture and natural lighting.
- product-mockup — product/packaging shots, catalog imagery, merch concepts.
- ui-mockup — app/web interface mockups and wireframes; specify the desired fidelity.
- infographic-diagram — diagrams/infographics with structured layout and text.
- scientific-educational — classroom explainers, scientific diagrams, and learning visuals with required labels and accuracy constraints.
- ads-marketing — campaign concepts and ad creatives with audience, brand position, scene, and exact tagline/copy.
- productivity-visual — slide, chart, workflow, and data-heavy business visuals.
- logo-brand — logo/mark exploration, vector-friendly.
- illustration-story — comics, children’s book art, narrative scenes.
- stylized-concept — style-driven concept art, 3D/stylized renders.
- historical-scene — period-accurate/world-knowledge scenes.

Edit:
- text-localization — translate/replace in-image text, preserve layout.
- identity-preserve — try-on, person-in-scene; lock face/body/pose.
- precise-object-edit — remove/replace a specific element (including interior swaps).
- lighting-weather — time-of-day/season/atmosphere changes only.
- background-extraction — transparent background / clean cutout. Ask built-in `image_gen` for actual transparency.
- style-transfer — apply reference style while changing subject/scene.
- compositing — multi-image insert/merge with matched lighting/perspective.
- sketch-to-render — drawing/line art to photoreal render.

## Shared prompt schema

Use the following labeled spec as shared prompt scaffolding for both top-level modes:

```text
Use case: <taxonomy slug>
Asset type: <where the asset will be used>
Primary request: <user's main prompt>
Input images: <Image 1: role; Image 2: role> (optional)
Scene/backdrop: <environment>
Subject: <main subject>
Style/medium: <photo/illustration/3D/etc>
Composition/framing: <wide/close/top-down; placement>
Lighting/mood: <lighting + mood>
Color palette: <palette notes>
Materials/textures: <surface details>
Text (verbatim): "<exact text>"
Constraints: <must keep/must avoid>
Avoid: <negative constraints>
```

Notes:
- `Asset type` and `Input images` are prompt scaffolding, not dedicated CLI flags.
- `Scene/backdrop` refers to the visual setting. It is not the same as the fallback CLI `background` parameter, which controls output transparency behavior.
- Fallback-only execution notes such as `Quality:`, `Input fidelity:`, masks, output format, and output paths belong in the CLI path only. Do not treat them as built-in `image_gen` tool arguments.

Augmentation rules:
- Keep it short.
- Add only the details needed to improve the prompt materially.
- For edits, explicitly list invariants (`change only X; keep Y unchanged`).
- If any critical detail is missing and blocks success, ask a question; otherwise proceed.

## Examples

### Generation example (hero image)
```text
Use case: product-mockup
Asset type: landing page hero
Primary request: a minimal hero image of a ceramic coffee mug
Style/medium: clean product photography
Composition/framing: wide composition with usable negative space for page copy if needed
Lighting/mood: soft studio lighting
Constraints: no logos, no text, no watermark
```

### Edit example (invariants)
```text
Use case: precise-object-edit
Asset type: product photo background replacement
Primary request: replace only the background with a warm sunset gradient
Constraints: change only the background; keep the product and its edges unchanged; no text; no watermark
```

## Prompting best practices
- Structure prompt as scene/backdrop -> subject -> details -> constraints.
- Include intended use (ad, UI mock, infographic) to set the mode and polish level.
- Use camera/composition language for photorealism.
- Only use SVG/vector stand-ins when the user explicitly asked for vector output or a non-image placeholder.
- Quote exact text and specify typography + placement.
- For tricky words, spell them letter-by-letter and require verbatim rendering.
- For multi-image inputs, reference images by index and describe how they should be used.
- For edits, repeat invariants every iteration to reduce drift.
- Iterate with single-change follow-ups.
- If the prompt is generic, add only the extra detail that will materially help.
- If the prompt is already detailed, normalize it instead of expanding it.
- For CLI fallback only, see `references/cli.md` and `references/image-api.md` for model, `quality`, `input_fidelity`, masks, output format, and output-path guidance.
- For transparent images, ask built-in `image_gen` for actual transparency and preserve its alpha.

More principles shared by both modes: `references/prompting.md`.
Copy/paste specs shared by both modes: `references/sample-prompts.md`.

## Guidance by asset type
Asset-type templates (website assets, game assets, wireframes, logo) are consolidated in `references/sample-prompts.md`.

## gpt-image-2 guidance for CLI fallback

The fallback CLI defaults to `gpt-image-2`.

- Use `gpt-image-2` for new CLI/API workflows unless the user confirms a different model.
- CLI `gpt-image-2` does not support `background=transparent`; ask before using `gpt-image-1.5` unless the user explicitly requested that model.
- `gpt-image-2` always uses high fidelity for image inputs; do not set `input_fidelity` with this model.
- `gpt-image-2` supports `quality` values `low`, `medium`, `high`, and `auto`.
- Use `quality low` for fast drafts, thumbnails, and quick iterations. Use `medium`, `high`, or `auto` for final assets, dense text, diagrams, identity-sensitive edits, or high-resolution outputs.
- Square images are typically fastest to generate. Use `1024x1024` for fast square drafts.
- If the user asks for 4K-style output, use `3840x2160` for landscape or `2160x3840` for portrait.
- `gpt-image-2` size may be `auto` or `WIDTHxHEIGHT` if all constraints hold: max edge `<= 3840px`, both edges multiples of `16px`, long-to-short ratio `<= 3:1`, total pixels between `655,360` and `8,294,400`.

Popular `gpt-image-2` sizes:
- `1024x1024` square
- `1536x1024` landscape
- `1024x1536` portrait
- `2048x2048` 2K square
- `2048x1152` 2K landscape
- `3840x2160` 4K landscape
- `2160x3840` 4K portrait
- `auto`

## Fallback CLI mode only

### Temp and output conventions
These conventions apply only to the CLI fallback. They do not describe built-in `image_gen` output behavior.
- Use `tmp/imagegen/` for intermediate files (for example JSONL batches); delete them when done.
- Write final artifacts under `output/imagegen/`.
- Use `--out` or `--out-dir` to control output paths; keep filenames stable and descriptive.

### Dependencies
Prefer `uv` for dependency management in this repo.

Required Python package:
```bash
uv pip install openai
```

Optional for image inspection and downscaling:
```bash
uv pip install pillow
```

Portability note:
- If you are using the installed skill outside this repo, install dependencies into that environment with its package manager.
- In uv-managed environments, `uv pip install ...` remains the preferred path.

### Environment
- `OPENAI_API_KEY` must be set for live API calls.
- Do not ask the user for `OPENAI_API_KEY` when using the built-in `image_gen` tool.
- Never ask the user to paste the full key in chat. Ask them to set it locally and confirm when ready.

If the key is missing, give the user these steps:
1. Create an API key in the OpenAI platform UI: https://platform.openai.com/api-keys
2. Set `OPENAI_API_KEY` as an environment variable in their system.
3. Offer to guide them through setting the environment variable for their OS/shell if needed.

If installation is not possible in this environment, tell the user which dependency is missing and how to install it into their active environment.

### Script-mode notes
- CLI commands + examples: `references/cli.md`
- API parameter quick reference: `references/image-api.md`
- Network approvals / sandbox settings for CLI mode: `references/codex-network.md`

## Reference map
- `references/prompting.md`: shared prompting principles for both modes.
- `references/sample-prompts.md`: shared copy/paste prompt recipes for both modes.
- `references/cli.md`: fallback-only CLI usage via `scripts/image_gen.py`.
- `references/image-api.md`: fallback-only API/CLI parameter reference.
- `references/codex-network.md`: fallback-only network/sandbox troubleshooting for CLI mode.
- `scripts/image_gen.py`: fallback-only CLI implementation. Use only when the user explicitly chooses or confirms CLI mode.
````

### references/cli.md

Source: `codex-rs/skills/src/assets/samples/imagegen/references/cli.md`, SHA-256 `ecfc2e09261a0feb3482517a5fa0ff410cb7d1958e3cbd2ac6b61586f5b81405`.

````text
# CLI reference (`scripts/image_gen.py`)

This file is for the fallback CLI mode only. Read it when the user explicitly asks to use `scripts/image_gen.py` / CLI / API / model controls, or after the user explicitly confirms that a transparent-output request should use the `gpt-image-1.5` true-transparency fallback path.

`generate-batch` is a CLI subcommand in this fallback path. It is not a top-level mode of the skill.
The word `batch` in a user request is not CLI opt-in by itself.

## What this CLI does
- `generate`: generate a new image from a prompt
- `edit`: edit one or more existing images
- `generate-batch`: run many generation jobs from a JSONL file after the user explicitly chooses CLI/API/model controls

Real API calls require **network access** + `OPENAI_API_KEY`. `--dry-run` does not.

## Quick start (works from any repo)
Set a stable path to the skill CLI (default `CODEX_HOME` is `~/.codex`):

```
export CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
export IMAGE_GEN="$CODEX_HOME/skills/.system/imagegen/scripts/image_gen.py"
```

Install dependencies into that environment with its package manager. In uv-managed environments, `uv pip install ...` remains the preferred path.

## Quick start

Dry-run (no API call; no network required; does not require the `openai` package):

```bash
python "$IMAGE_GEN" generate \
  --prompt "Test" \
  --out output/imagegen/test.png \
  --dry-run
```

Notes:
- One-off dry-runs print the API payload and the computed output path(s).
- Repo-local finals should live under `output/imagegen/`.

Generate (requires `OPENAI_API_KEY` + network):

```bash
python "$IMAGE_GEN" generate \
  --prompt "A cozy alpine cabin at dawn" \
  --size 1024x1024 \
  --out output/imagegen/alpine-cabin.png
```

Edit:

```bash
python "$IMAGE_GEN" edit \
  --image input.png \
  --prompt "Replace only the background with a warm sunset" \
  --out output/imagegen/sunset-edit.png
```

## Guardrails
- Use the bundled CLI directly (`python "$IMAGE_GEN" ...`) after activating the correct environment.
- Do **not** create one-off runners (for example `gen_images.py`) unless the user explicitly asks for a custom wrapper.
- **Never modify** `scripts/image_gen.py`. If something is missing, ask the user before doing anything else.
- Do not silently downgrade from CLI `gpt-image-2` or built-in `image_gen` to CLI `gpt-image-1.5`; ask first unless the user explicitly requested `gpt-image-1.5`.

## Defaults
- Model: `gpt-image-2`
- Supported model family for this CLI: GPT Image models (`gpt-image-*`)
- Size: `auto`
- Quality: `medium`
- Output format: `png`
- Default one-off output path: `output/imagegen/output.png`
- Background: unspecified unless `--background` is set

## gpt-image-2 size and model guidance

`gpt-image-2` is the default model for new CLI fallback work.

- Use `--quality low` for fast drafts, thumbnails, and quick iterations.
- Use `--quality medium`, `--quality high`, or `--quality auto` for final assets, dense text, diagrams, identity-sensitive edits, and high-resolution outputs.
- Square images are typically fastest. Use `--size 1024x1024` for quick square drafts.
- If the user asks for 4K-style output, use `--size 3840x2160` for landscape or `--size 2160x3840` for portrait.
- Do not pass `--input-fidelity` with `gpt-image-2`; this model always uses high fidelity for image inputs.
- Do not use `--background transparent` with CLI `gpt-image-2`; ask before using `gpt-image-1.5` unless the user explicitly requested that model.

Popular `gpt-image-2` sizes:
- `1024x1024`
- `1536x1024`
- `1024x1536`
- `2048x2048`
- `2048x1152`
- `3840x2160`
- `2160x3840`
- `auto`

`gpt-image-2` size constraints:
- max edge `<= 3840px`
- both edges multiples of `16px`
- long edge to short edge ratio `<= 3:1`
- total pixels between `655,360` and `8,294,400`
- outputs above `2560x1440` total pixels are experimental

Fast draft:

```bash
python "$IMAGE_GEN" generate \
  --prompt "A product thumbnail of a matte ceramic mug on a stone surface" \
  --quality low \
  --size 1024x1024 \
  --out output/imagegen/mug-draft.png
```

Final 2K landscape:

```bash
python "$IMAGE_GEN" generate \
  --prompt "A polished landing-page hero image of a matte ceramic mug on a stone surface" \
  --quality high \
  --size 2048x1152 \
  --out output/imagegen/mug-hero.png
```

4K landscape:

```bash
python "$IMAGE_GEN" generate \
  --prompt "A detailed architectural visualization at golden hour" \
  --size 3840x2160 \
  --quality high \
  --out output/imagegen/architecture-4k.png
```

True transparent fallback request:

Ask for confirmation before using this command unless the user explicitly requested `gpt-image-1.5`.

```bash
python "$IMAGE_GEN" generate \
  --model gpt-image-1.5 \
  --prompt "A clean product cutout on a transparent background" \
  --background transparent \
  --output-format png \
  --out output/imagegen/product-cutout.png
```

Explain that CLI `gpt-image-2` does not support `background=transparent`, so transparent CLI output requires the confirmed `gpt-image-1.5` fallback.

## Quality, input fidelity, and masks (CLI fallback only)
These are explicit CLI controls. They are not built-in `image_gen` tool arguments.

- `--quality` works for `generate`, `edit`, and `generate-batch`: `low|medium|high|auto`
- `--input-fidelity` is **edit-only** and validated as `low|high`; it is not supported for `gpt-image-2`
- `--mask` is **edit-only**

Example:

```bash
python "$IMAGE_GEN" edit \
  --model gpt-image-1.5 \
  --image input.png \
  --prompt "Change only the background" \
  --quality high \
  --input-fidelity high \
  --out output/imagegen/background-edit.png
```

Mask notes:
- For multi-image edits, pass repeated `--image` flags. Their order is meaningful, so describe each image by index and role in the prompt.
- The CLI accepts a single `--mask`.
- Image and mask must be the same size and format and each under 50MB.
- Masks must include an alpha channel.
- If multiple input images are provided, the mask applies to the first image.
- Masking is prompt-guided; do not promise exact pixel-perfect mask boundaries.
- Use a PNG mask when possible; the script treats mask handling as best-effort and does not perform full preflight validation beyond file checks/warnings.
- In the edit prompt, repeat invariants (`change only the background; keep the subject unchanged`) to reduce drift.

## Output handling
- Use `tmp/imagegen/` for temporary JSONL inputs or scratch files.
- Use `output/imagegen/` for final outputs.
- Reruns fail if a target file already exists unless you pass `--force`.
- `--out-dir` changes one-off naming to `image_1.<ext>`, `image_2.<ext>`, and so on.
- Downscaled copies use the default suffix `-web` unless you override it.

## Common recipes

Generate with augmentation fields:

```bash
python "$IMAGE_GEN" generate \
  --prompt "A minimal hero image of a ceramic coffee mug" \
  --use-case "product-mockup" \
  --style "clean product photography" \
  --composition "wide product shot with usable negative space for page copy" \
  --constraints "no logos, no text" \
  --out output/imagegen/mug-hero.png
```

Generate + also write a downscaled copy for fast web loading:

```bash
python "$IMAGE_GEN" generate \
  --prompt "A cozy alpine cabin at dawn" \
  --size 1024x1024 \
  --downscale-max-dim 1024 \
  --out output/imagegen/alpine-cabin.png
```

Generate multiple prompts concurrently (async batch):

```bash
mkdir -p tmp/imagegen output/imagegen/batch
cat > tmp/imagegen/prompts.jsonl << 'EOF'
{"prompt":"Cavernous hangar interior with a compact shuttle parked near the center","use_case":"stylized-concept","composition":"wide-angle, low-angle","lighting":"volumetric light rays through drifting fog","constraints":"no logos or trademarks; no watermark","size":"1536x1024"}
{"prompt":"Gray wolf in profile in a snowy forest","use_case":"photorealistic-natural","composition":"eye-level","constraints":"no logos or trademarks; no watermark","size":"1024x1024"}
EOF

python "$IMAGE_GEN" generate-batch \
  --input tmp/imagegen/prompts.jsonl \
  --out-dir output/imagegen/batch \
  --concurrency 5

rm -f tmp/imagegen/prompts.jsonl
```

Notes:
- `generate-batch` requires `--out-dir`.
- generate-batch requires --out-dir.
- Use `--concurrency` to control parallelism (default `5`).
- Per-job overrides are supported in JSONL (for example `size`, `quality`, `background`, `output_format`, `output_compression`, `moderation`, `n`, `model`, `out`, and prompt-augmentation fields).
- `--n` generates multiple variants for a single prompt; `generate-batch` is for many different prompts.
- In batch mode, per-job `out` is treated as a filename under `--out-dir`.
- For many requested deliverable assets, provide one prompt/job per distinct asset and use semantic filenames when possible.

## CLI notes
- Supported sizes depend on the model. `gpt-image-2` supports flexible constrained sizes; older GPT Image models support `1024x1024`, `1536x1024`, `1024x1536`, or `auto`.
- True transparent CLI outputs require `output_format` to be `png` or `webp` and are not supported by `gpt-image-2`.
- `--prompt-file`, `--output-compression`, `--moderation`, `--max-attempts`, `--fail-fast`, `--force`, and `--no-augment` are supported.
- This CLI is intended for GPT Image models. Do not assume older non-GPT image-model behavior applies here.

## See also
- API parameter quick reference for fallback CLI mode: `references/image-api.md`
- Prompt examples shared across both top-level modes: `references/sample-prompts.md`
- Network/sandbox notes for fallback CLI mode: `references/codex-network.md`
- Built-in-first transparent image workflow: `SKILL.md`
````

### references/codex-network.md

Source: `codex-rs/skills/src/assets/samples/imagegen/references/codex-network.md`, SHA-256 `c88298ca4481f6116a16fa7987434fc977f8b311c1bbc0c3d862ffd0c5981148`.

````text
# Codex network approvals / sandbox notes

This file is for the fallback CLI mode only. Read it when the user explicitly asks to use `scripts/image_gen.py` / CLI / API / model controls, or after the user explicitly confirms that a transparent-output request should use the `gpt-image-1.5` true-transparency fallback path.

This guidance is intentionally isolated from `SKILL.md` because it can vary by environment and may become stale. Prefer the defaults in your environment when in doubt.

## Why am I asked to approve image generation calls?
The fallback CLI uses the OpenAI Image API, so it needs outbound network access. In many Codex setups, network access is disabled by default and/or the approval policy requires confirmation before networked commands run.

## Important note about approvals vs network
- `--ask-for-approval never` suppresses approval prompts.
- It does **not** by itself enable network access.
- In `workspace-write`, network access still depends on your Codex configuration (for example `[sandbox_workspace_write] network_access = true`).

## How do I reduce repeated approval prompts?
If you trust the repo and want fewer prompts, use a configuration or profile that both:
- enables network for the sandbox mode you plan to use
- sets an approval policy that matches your risk tolerance

Example `~/.codex/config.toml` pattern:

```toml
approval_policy = "on-request"
sandbox_mode = "workspace-write"

[sandbox_workspace_write]
network_access = true
```

If you want quieter automation after network is enabled, you can choose a stricter approval policy, but do that intentionally and with care.

## Safety note
Enabling network and reducing approvals lowers friction, but increases risk if you run untrusted code or work in an untrusted repository.
````

### references/image-api.md

Source: `codex-rs/skills/src/assets/samples/imagegen/references/image-api.md`, SHA-256 `dc975d7af8a4888967251a0276014b4a71ea30455294944b762256373ce3e569`.

```text
# Image API quick reference

This file is for the fallback CLI mode only. Use it when the user explicitly asks to use `scripts/image_gen.py` / CLI / API / model controls, or after the user explicitly confirms that a transparent-output request should use the `gpt-image-1.5` true-transparency fallback path.

These parameters describe the Image API and bundled CLI fallback surface. Do not assume they are normal arguments on the built-in `image_gen` tool.

## Scope
- This fallback CLI is intended for GPT Image models (`gpt-image-2`, `gpt-image-1.5`, `gpt-image-1`, and `gpt-image-1-mini`).
- The built-in `image_gen` tool and the fallback CLI do not expose the same controls.

## Model summary

| Model | Quality | Input fidelity | Resolutions | Recommended use |
| --- | --- | --- | --- | --- |
| `gpt-image-2` | `low`, `medium`, `high`, `auto` | Always high fidelity for image inputs; do not set `input_fidelity` | `auto` or flexible sizes that satisfy the constraints below | Default for new CLI/API workflows: high-quality generation and editing, text-heavy images, photorealism, compositing, identity-sensitive edits, and workflows where fewer retries matter |
| `gpt-image-1.5` | `low`, `medium`, `high`, `auto` | `low`, `high` | `1024x1024`, `1024x1536`, `1536x1024`, `auto` | True transparent-background fallback and backward-compatible workflows |
| `gpt-image-1` | `low`, `medium`, `high`, `auto` | `low`, `high` | `1024x1024`, `1024x1536`, `1536x1024`, `auto` | Legacy compatibility |
| `gpt-image-1-mini` | `low`, `medium`, `high`, `auto` | `low`, `high` | `1024x1024`, `1024x1536`, `1536x1024`, `auto` | Cost-sensitive draft batches and lower-stakes previews |

## gpt-image-2 sizes

`gpt-image-2` accepts `auto` or any `WIDTHxHEIGHT` size that satisfies all constraints:

- Maximum edge length must be less than or equal to `3840px`.
- Both edges must be multiples of `16px`.
- Long edge to short edge ratio must not exceed `3:1`.
- Total pixels must be at least `655,360` and no more than `8,294,400`.

Popular sizes:

| Label | Size | Notes |
| --- | --- | --- |
| Square | `1024x1024` | Typical fast default |
| Landscape | `1536x1024` | Standard landscape |
| Portrait | `1024x1536` | Standard portrait |
| 2K square | `2048x2048` | Larger square output |
| 2K landscape | `2048x1152` | Widescreen output |
| 4K landscape | `3840x2160` | Widescreen 4K output |
| 4K portrait | `2160x3840` | Vertical 4K output |
| Auto | `auto` | Default size |

Square images are typically fastest to generate. For 4K-style output, use `3840x2160` or `2160x3840`.

## Endpoints
- Generate: `POST /v1/images/generations` (`client.images.generate(...)`)
- Edit: `POST /v1/images/edits` (`client.images.edit(...)`)

## Core parameters for GPT Image models
- `prompt`: text prompt
- `model`: image model
- `n`: number of images (1-10)
- `size`: `auto` by default for `gpt-image-2`; flexible `WIDTHxHEIGHT` sizes are allowed only for `gpt-image-2`; older GPT Image models use `1024x1024`, `1536x1024`, `1024x1536`, or `auto`
- `quality`: `low`, `medium`, `high`, or `auto`
- `background`: output transparency behavior (`transparent`, `opaque`, or `auto`) for generated output; this is not the same thing as the prompt's visual scene/backdrop
- `output_format`: `png` (default), `jpeg`, `webp`
- `output_compression`: 0-100 (jpeg/webp only)
- `moderation`: `auto` (default) or `low`

## Edit-specific parameters
- `image`: one or more input images. For GPT Image models, you can provide up to 16 images.
- `mask`: optional mask image
- `input_fidelity`: `low` or `high` only for models that support it; do not set this for `gpt-image-2`

Model-specific note for `input_fidelity`:
- `gpt-image-2` always uses high fidelity for image inputs and does not support setting `input_fidelity`.
- `gpt-image-1` and `gpt-image-1-mini` preserve all input images, but the first image gets richer textures and finer details.
- `gpt-image-1.5` preserves the first 5 input images with higher fidelity.

## Transparent backgrounds

`gpt-image-2` does not currently support the Image API `background=transparent` parameter. In explicit CLI/API fallback mode, keep `gpt-image-2` when a flat chroma-key background plus local alpha extraction with `python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py"` is acceptable.

Use CLI `gpt-image-1.5` with `background=transparent` and a transparent-capable output format such as `png` or `webp` only after the user explicitly confirms that fallback, unless they already requested `gpt-image-1.5`, `scripts/image_gen.py`, or CLI fallback. If the user asks for true/native transparency, the subject is too complex for clean chroma-key removal, or local background removal fails validation, explain the tradeoff and ask before switching.

## Output
- `data[]` list with `b64_json` per image
- The bundled `scripts/image_gen.py` CLI decodes `b64_json` and writes output files for you.

## Limits and notes
- Input images and masks must be under 50MB.
- Use the edits endpoint when the user requests changes to an existing image.
- Masking is prompt-guided; exact shapes are not guaranteed.
- Large sizes and high quality increase latency and cost.
- Use `quality=low` for fast drafts, thumbnails, and quick iterations. Use `medium` or `high` for final assets, dense text, diagrams, identity-sensitive edits, or high-resolution outputs.
- High `input_fidelity` can materially increase input token usage on models that support it.
- If a request fails because a specific option is unsupported by the selected GPT Image model, retry manually without that option only when the option is not required by the user. If true transparent CLI output is required, ask before switching to `gpt-image-1.5` instead of dropping `background=transparent`, unless the user already explicitly chose that fallback.

## Important boundary
- `quality`, `input_fidelity`, explicit masks, `background`, `output_format`, and related parameters are fallback-only execution controls.
- Do not assume they are built-in `image_gen` tool arguments.
```

### references/prompting.md

Source: `codex-rs/skills/src/assets/samples/imagegen/references/prompting.md`, SHA-256 `b210b051c775860267080941eba968212bf0ac7fce581d75c5dcc217d8293f8b`.

```text
# Prompting best practices

These prompting principles are shared by both top-level modes of the skill:
- built-in `image_gen` tool (default)
- explicit `scripts/image_gen.py` CLI fallback

This file is about prompt structure, specificity, and iteration. Fallback-only execution controls such as `quality`, `input_fidelity`, masks, output format, and output paths live in the fallback docs.

## Contents
- [Structure](#structure)
- [Specificity policy](#specificity-policy)
- [Allowed and disallowed augmentation](#allowed-and-disallowed-augmentation)
- [Composition and layout](#composition-and-layout)
- [Constraints and invariants](#constraints-and-invariants)
- [Text in images](#text-in-images)
- [Input images and references](#input-images-and-references)
- [Iterate deliberately](#iterate-deliberately)
- [Transparent images](#transparent-images)
- [Fallback-only execution controls](#fallback-only-execution-controls)
- [Use-case tips](#use-case-tips)
- [Where to find copy/paste recipes](#where-to-find-copypaste-recipes)

## Structure
- Use a consistent order: scene/backdrop -> subject -> key details -> constraints -> output intent.
- Include intended use (ad, UI mock, infographic) to set the level of polish.
- For complex requests, use short labeled lines instead of one long paragraph.

## Specificity policy
- If the user prompt is already specific and detailed, normalize it into a clean spec without adding creative requirements.
- If the prompt is generic, you may add tasteful detail when it materially improves the output.
- Treat examples in `sample-prompts.md` as fully-authored recipes, not as the default amount of augmentation to add to every request.
- For photorealism, include `photorealistic` directly when that is the goal, plus concrete real-world texture such as pores, wrinkles, fabric wear, material grain, or imperfect everyday detail.

## Allowed and disallowed augmentation

Allowed augmentation for generic prompts:
- composition and framing cues
- intended-use or polish-level hints
- practical layout guidance
- reasonable scene concreteness that supports the request

Do not add:
- extra characters, props, or objects that are not implied
- brand palettes, slogans, or story beats that are not implied
- arbitrary side-specific placement unless the surrounding layout supports it

## Composition and layout
- Specify framing and viewpoint (close-up, wide, top-down) and placement only when it materially helps.
- Call out negative space if the asset clearly needs room for UI or copy.
- Avoid making left/right layout decisions unless the user or surrounding layout supports them.
- For people, describe body framing, scale, gaze, and object interactions when they matter (`full body visible`, `looking down at the book`, `hands naturally gripping the handlebars`).

## Constraints and invariants
- State what must not change (`keep background unchanged`).
- For edits, say `change only X; keep Y unchanged` and repeat invariants on every iteration to reduce drift.

## Text in images
- Put literal text in quotes or ALL CAPS and specify typography (font style, size, color, placement).
- Spell uncommon words letter-by-letter if accuracy matters.
- For in-image copy, require verbatim rendering and no extra characters.
- In CLI fallback mode, use `medium` or `high` quality for small text, dense infographics, data-heavy slides, multi-font layouts, legends, axes, and footnotes.

## Input images and references
- Do not assume that every provided image is an edit target.
- Label each image by index and role (`Image 1: edit target`, `Image 2: style reference`).
- If the user provides images for style, composition, or mood guidance and does not ask to modify them, treat the request as generation with references.
- If the user asks to preserve an existing image while changing specific parts, treat the request as an edit.
- For compositing, describe how the images interact (`place the subject from Image 2 into Image 1`).

## Iterate deliberately
- Start with a clean base prompt, then make small single-change edits.
- Re-specify critical constraints when you iterate.
- Prefer one targeted follow-up at a time over rewriting the whole prompt.

## Transparent images
- Ask built-in `image_gen` for a genuinely transparent background and preserve its alpha.

## Fallback-only execution controls
- `quality`, `input_fidelity`, explicit masks, output format, and output paths are fallback-only execution controls.
- Do not assume they are built-in `image_gen` tool arguments.
- If the user explicitly chooses CLI fallback, see `references/cli.md` and `references/image-api.md` for those controls.
- In CLI fallback mode, `gpt-image-2` is the default. It supports `quality=low|medium|high|auto`; use `low` for fast drafts and thumbnails, and move to `medium`, `high`, or `auto` for final assets.
- `gpt-image-2` always uses high fidelity for image inputs, so do not set `input_fidelity` with that model.
- CLI `gpt-image-2` does not support `background=transparent`; ask before using `gpt-image-1.5` unless the user explicitly requested that model.
- If the user asks for 4K-style output with `gpt-image-2`, use `3840x2160` for landscape or `2160x3840` for portrait.

## Use-case tips
Generate:
- photorealistic-natural: Prompt as if a real photo is captured in the moment; use photography language (lens, lighting, framing); call for real texture; avoid over-stylized polish unless requested.
- product-mockup: Describe the product/packaging and materials; ensure clean silhouette and label clarity; if in-image text is needed, require verbatim rendering and specify typography.
- ui-mockup: Describe the target fidelity first (shippable mockup or low-fi wireframe), then focus on layout, hierarchy, and practical UI elements; avoid concept-art language.
- infographic-diagram: Define the audience and layout flow; label parts explicitly; require verbatim text; prefer higher quality in CLI mode for dense labels.
- logo-brand: Keep it simple and scalable; ask for a strong silhouette and balanced negative space; avoid decorative flourishes unless requested.
- ads-marketing: Write like a creative brief; include brand positioning, audience, desired vibe, scene, and exact tagline if text must appear.
- productivity-visual: Name the exact artifact (slide, chart, workflow diagram), define the canvas and hierarchy, provide real labels/data, and ask for readable typography and polished spacing.
- scientific-educational: Define audience, lesson objective, required labels, scientific constraints, arrows, and scan-friendly whitespace.
- illustration-story: Define panels or scene beats; keep each action concrete.
- stylized-concept: Specify style cues, material finish, and rendering approach (3D, painterly, clay) without inventing new story elements.
- historical-scene: State the location/date and required period accuracy; constrain clothing, props, and environment to match the era.

Edit:
- text-localization: Change only the text; preserve layout, typography, spacing, and hierarchy; no extra words or reflow unless needed.
- identity-preserve: Lock identity (face, body, pose, hair, expression); change only the specified elements; match lighting and shadows.
- precise-object-edit: Specify exactly what to remove/replace; preserve surrounding texture and lighting; keep everything else unchanged.
- lighting-weather: Change only environmental conditions (light, shadows, atmosphere, precipitation); keep geometry, framing, and subject identity.
- background-extraction: Request a clean cutout on a genuinely transparent background; preserve fine edges and label text; no halos or restyling.
- style-transfer: Specify style cues to preserve (palette, texture, brushwork) and what must change; add `no extra elements` to prevent drift.
- compositing: Reference inputs by index; specify what moves where; match lighting, perspective, and scale; keep the base framing unchanged.
- sketch-to-render: Preserve layout, proportions, and perspective; choose materials and lighting that support the supplied sketch without adding new elements.

## Where to find copy/paste recipes
For copy/paste prompt specs (examples only), see `references/sample-prompts.md`. This file focuses on principles, specificity, and iteration patterns.
```

### references/sample-prompts.md

Source: `codex-rs/skills/src/assets/samples/imagegen/references/sample-prompts.md`, SHA-256 `70474177d151855b175c6133de2aae1d90b7f146b0dab50ec830972c47d72183`.

````text
# Sample prompts (copy/paste)

These prompt recipes are shared across both top-level modes of the skill:
- built-in `image_gen` tool (default)
- `scripts/image_gen.py` CLI fallback for explicit or user-confirmed CLI/API/model requests

Use these as starting points. They are intentionally complete prompt recipes, not the default amount of augmentation to add to every user request.

When adapting a user's prompt:
- keep user-provided requirements
- only add detail according to the specificity policy in `SKILL.md`
- do not treat every example below as permission to invent extra story elements

The labeled lines are prompt scaffolding, not a closed schema. `Asset type` and `Input images` are prompt-only scaffolding; the CLI does not expose them as dedicated flags.

Execution details such as explicit CLI flags, `quality`, `input_fidelity`, masks, output formats, and local output paths depend on mode. Use built-in `image_gen` by default, request transparent backgrounds directly, and preserve the generated alpha; apply CLI-specific controls only when the user chooses or confirms that fallback.

CLI model notes:
- `gpt-image-2` is the fallback CLI default for new workflows.
- `gpt-image-2` supports `quality` values `low`, `medium`, `high`, and `auto`.
- For 4K-style `gpt-image-2` output, use `3840x2160` or `2160x3840`.
- CLI `gpt-image-2` does not support `background=transparent`; ask before using `gpt-image-1.5` unless the user explicitly requested that model.
- Do not set `input_fidelity` with `gpt-image-2`; image inputs already use high fidelity.

For prompting principles (structure, specificity, invariants, iteration), see `references/prompting.md`.

## Generate

### photorealistic-natural
```
Use case: photorealistic-natural
Primary request: candid photo of an elderly sailor on a small fishing boat adjusting a net
Scene/backdrop: coastal water with soft haze
Subject: weathered skin with wrinkles and sun texture
Style/medium: photorealistic candid photo
Composition/framing: medium close-up, eye-level
Lighting/mood: soft coastal daylight, shallow depth of field, subtle film grain
Materials/textures: real skin texture, worn fabric, salt-worn wood
Constraints: natural color balance; no heavy retouching; no glamorization; no watermark
Avoid: studio polish; staged look
```

### product-mockup
```
Use case: product-mockup
Primary request: premium product photo of a matte black shampoo bottle with a minimal label
Scene/backdrop: clean studio gradient from light gray to white
Subject: single bottle centered with subtle reflection
Style/medium: premium product photography
Composition/framing: centered, slight three-quarter angle, generous padding
Lighting/mood: softbox lighting, clean highlights, controlled shadows
Materials/textures: matte plastic, crisp label printing
Constraints: no logos or trademarks; no watermark
```

### ui-mockup
```
Use case: ui-mockup
Primary request: mobile app home screen for a local farmers market with vendors and daily specials
Asset type: mobile app screen
Style/medium: realistic product UI, not concept art
Composition/framing: clean vertical mobile layout with clear hierarchy
Constraints: practical layout, clear typography, no logos or trademarks, no watermark
```

### infographic-diagram
```
Use case: infographic-diagram
Primary request: detailed infographic of an automatic coffee machine flow
Scene/backdrop: clean, light neutral background
Subject: bean hopper -> grinder -> brew group -> boiler -> water tank -> drip tray
Style/medium: clean vector-like infographic with clear callouts and arrows
Composition/framing: vertical poster layout, top-to-bottom flow
Text (verbatim): "Bean Hopper", "Grinder", "Brew Group", "Boiler", "Water Tank", "Drip Tray"
Constraints: clear labels, strong contrast, no logos or trademarks, no watermark
```

### scientific-educational
```
Use case: scientific-educational
Primary request: biology diagram titled "Cellular Respiration at a Glance" for high school students
Scene/backdrop: clean white classroom handout background
Subject: glucose turns into energy inside a cell; include glycolysis, Krebs cycle, and electron transport chain
Style/medium: flat scientific diagram with consistent icons, arrows, and readable labels
Composition/framing: landscape slide-style layout with clear hierarchy and generous whitespace
Text (verbatim): "Cellular Respiration at a Glance", "Glucose", "Pyruvate", "ATP", "NADH", "FADH2", "CO2", "O2", "H2O"
Constraints: scientifically plausible; avoid tiny text; no extra decoration; no watermark
```

### logo-brand
```
Use case: logo-brand
Primary request: original logo for "Field & Flour", a local bakery
Style/medium: vector logo mark; flat colors; minimal
Composition/framing: single centered logo on a plain background with generous padding
Constraints: strong silhouette, balanced negative space; original design only; no gradients unless essential; no trademarks; no watermark
```

### illustration-story
```
Use case: illustration-story
Primary request: 4-panel comic about a pet left alone at home
Scene/backdrop: cozy living room across panels
Subject: pet reacting to the owner leaving, then relaxing, then returning to a composed pose
Style/medium: comic illustration with clear panels
Composition/framing: 4 equal-sized vertical panels, readable actions per panel
Constraints: no text; no logos or trademarks; no watermark
```

### stylized-concept
```
Use case: stylized-concept
Primary request: cavernous hangar interior with tall support beams and drifting fog
Scene/backdrop: industrial hangar interior, deep scale, light haze
Subject: compact shuttle parked near the center
Style/medium: cinematic concept art, industrial realism
Composition/framing: wide-angle, low-angle
Lighting/mood: volumetric light rays cutting through fog
Constraints: no logos or trademarks; no watermark
```

### ads-marketing
```
Use case: ads-marketing
Primary request: campaign image for a streetwear brand called Thread
Subject: group of friends hanging out together in a stylish urban setting
Style/medium: polished youth streetwear campaign photography
Composition/framing: vertical ad layout with natural poses and integrated headline space
Lighting/mood: contemporary, energetic, tasteful
Text (verbatim): "Yours to Create."
Constraints: render the tagline exactly once; clean legible typography; no extra text; no watermarks; no unrelated logos
```

### productivity-visual
```
Use case: productivity-visual
Primary request: one pitch-deck slide titled "Market Opportunity"
Asset type: fundraising slide image
Style/medium: clean modern deck slide, white background, crisp sans-serif typography
Subject: TAM/SAM/SOM concentric-circle diagram plus a small growth bar chart from 2021 to 2026
Composition/framing: 16:9 landscape slide, clear data hierarchy, polished spacing
Text (verbatim): "Market Opportunity", "TAM: $42B", "SAM: $8.7B", "SOM: $340M", "AGI Research, 2024", "Internal analysis"
Constraints: readable labels, no clip art, no stock photography, no decorative clutter, no watermark
```

### historical-scene
```
Use case: historical-scene
Primary request: outdoor crowd scene in Bethel, New York on August 16, 1969
Scene/backdrop: open field with period-appropriate staging
Subject: crowd in period-accurate clothing, authentic environment
Style/medium: photorealistic photo
Composition/framing: wide shot, eye-level
Constraints: period-accurate details; no modern objects; no logos or trademarks; no watermark
```

## Asset type templates (taxonomy-aligned)

### Website assets template
```
Use case: <photorealistic-natural|stylized-concept|product-mockup|infographic-diagram|ui-mockup>
Asset type: <hero image / section illustration / blog header>
Primary request: <short description>
Scene/backdrop: <environment or abstract backdrop>
Subject: <main subject>
Style/medium: <photo/illustration/3D>
Composition/framing: <wide/centered; note usable negative space only if needed>
Lighting/mood: <soft/bright/neutral>
Color palette: <brand colors or neutral>
Constraints: <no text; no logos; no watermark; leave room for UI if needed>
```

### Website assets example: minimal hero background
```
Use case: stylized-concept
Asset type: landing page hero background
Primary request: minimal abstract background with a soft gradient and subtle texture
Style/medium: matte illustration / soft-rendered abstract background
Composition/framing: wide composition with usable negative space for page copy
Lighting/mood: gentle studio glow
Color palette: restrained neutral palette
Constraints: no text; no logos; no watermark
```

### Website assets example: feature section illustration
```
Use case: stylized-concept
Asset type: feature section illustration
Primary request: simple abstract shapes suggesting connection and flow
Scene/backdrop: subtle light-gray backdrop with faint texture
Style/medium: flat illustration; soft shadows; restrained contrast
Composition/framing: centered cluster; open margins for UI
Color palette: muted neutral palette
Constraints: no text; no logos; no watermark
```

### Website assets example: blog header image
```
Use case: photorealistic-natural
Asset type: blog header image
Primary request: overhead desk scene with notebook, pen, and coffee cup
Scene/backdrop: warm wooden tabletop
Style/medium: photorealistic photo
Composition/framing: wide crop with clean room for page copy
Lighting/mood: soft morning light
Constraints: no text; no logos; no watermark
```

### Game assets template
```
Use case: stylized-concept
Asset type: <game environment concept art / game character concept / game UI icon / tileable game texture>
Primary request: <biome/scene/character/icon/material>
Scene/backdrop: <location + set dressing> (if applicable)
Subject: <main focal element(s)>
Style/medium: <realistic/stylized>; <concept art / character render / UI icon / texture>
Composition/framing: <wide/establishing/top-down>; <camera angle>; <focal point placement>
Lighting/mood: <time of day>; <mood>; <volumetric/fog/etc>
Constraints: no logos or trademarks; no watermark
```

### Game assets example: environment concept art
```
Use case: stylized-concept
Asset type: game environment concept art
Primary request: cavernous hangar interior with tall support beams and drifting fog
Scene/backdrop: industrial hangar interior, deep scale, light haze
Subject: compact shuttle parked near the center
Style/medium: cinematic concept art, industrial realism
Composition/framing: wide-angle, low-angle
Lighting/mood: volumetric light rays cutting through fog
Constraints: no logos or trademarks; no watermark
```

### Game assets example: character concept
```
Use case: stylized-concept
Asset type: game character concept
Primary request: desert scout character with layered travel gear
Subject: long coat, satchel, practical travel clothing
Style/medium: character render; stylized realism
Composition/framing: neutral hero pose on a simple backdrop
Constraints: no logos or trademarks; no watermark
```

### Game assets example: UI icon
```
Use case: stylized-concept
Asset type: game UI icon
Primary request: round shield icon with a subtle rune pattern
Style/medium: painted game UI icon
Composition/framing: centered icon; generous padding; clear silhouette
Constraints: no text; no background scene elements; no logos or trademarks; no watermark
```

### Game assets example: tileable texture
```
Use case: stylized-concept
Asset type: tileable game texture
Primary request: worn sandstone blocks
Style/medium: seamless tileable texture; PBR-ish look
Scene/backdrop: neutral lighting reference only
Constraints: seamless edges; no obvious focal elements; no text; no logos or trademarks; no watermark
```

### Wireframe template
```
Use case: ui-mockup
Asset type: website wireframe
Primary request: <page or flow to sketch>
Style/medium: low-fi grayscale wireframe
Composition/framing: <landscape or portrait to match expected device>
Subject: <sections in order; grid/columns; key labels>
Constraints: no color; no logos; no real photos; no watermark
```

### Wireframe example: homepage (desktop)
```
Use case: ui-mockup
Asset type: website wireframe
Primary request: SaaS homepage layout with clear hierarchy
Style/medium: low-fi grayscale wireframe
Subject: top nav; hero with headline and CTA; three feature cards; testimonial strip; pricing preview; footer
Composition/framing: landscape desktop layout
Constraints: label major blocks; no color; no logos; no real photos; no watermark
```

### Wireframe example: pricing page
```
Use case: ui-mockup
Asset type: website wireframe
Primary request: pricing page layout with comparison table
Style/medium: low-fi grayscale wireframe
Subject: header; plan toggle; 3 pricing cards; comparison table; FAQ accordion; footer
Composition/framing: desktop or tablet layout
Constraints: label key areas; no color; no logos; no real photos; no watermark
```

### Wireframe example: mobile onboarding flow
```
Use case: ui-mockup
Asset type: mobile onboarding wireframe
Primary request: three-screen mobile onboarding flow
Style/medium: low-fi grayscale wireframe
Subject: screen 1 headline and CTA; screen 2 feature bullets; screen 3 form fields and CTA
Composition/framing: portrait mobile layout
Constraints: label screens and blocks; no color; no logos; no real photos; no watermark
```

### Logo template
```
Use case: logo-brand
Asset type: logo concept
Primary request: <brand idea or symbol concept>
Style/medium: vector logo mark; flat colors; minimal
Composition/framing: centered mark; clear silhouette; generous margin
Color palette: <1-2 colors; high contrast>
Text (verbatim): "<exact name>" (only if needed)
Constraints: no gradients; no mockups; no 3D; no watermark
```

### Logo example: abstract symbol mark
```
Use case: logo-brand
Asset type: logo concept
Primary request: geometric leaf symbol suggesting sustainability and growth
Style/medium: vector logo mark; flat colors; minimal
Composition/framing: centered mark; clear silhouette
Color palette: deep green and off-white
Constraints: no text unless requested; no gradients; no mockups; no 3D; no watermark
```

### Logo example: monogram mark
```
Use case: logo-brand
Asset type: logo concept
Primary request: interlocking monogram of the letters "AV"
Style/medium: vector logo mark; flat colors; minimal
Composition/framing: centered mark; balanced spacing
Color palette: black on white
Constraints: no gradients; no mockups; no 3D; no watermark
```

### Logo example: wordmark
```
Use case: logo-brand
Asset type: logo concept
Primary request: clean wordmark for a modern studio
Style/medium: vector wordmark; flat colors; minimal
Text (verbatim): "Studio North"
Composition/framing: centered text; even letter spacing
Constraints: no gradients; no mockups; no 3D; no watermark
```

## Edit

### text-localization
```
Use case: text-localization
Input images: Image 1: original infographic
Primary request: replace "Bean Hopper", "Grinder", "Brew Group", "Boiler", "Water Tank", and "Drip Tray" with "Tolva", "Molino", "Grupo de infusión", "Caldera", "Depósito de agua", and "Bandeja de goteo"
Constraints: change only the text; preserve layout, typography, spacing, and hierarchy; no extra words; do not alter logos or imagery
```

### identity-preserve
```
Use case: identity-preserve
Input images: Image 1: person photo; Image 2..N: clothing references
Primary request: replace only the clothing with the provided garments
Constraints: preserve face, body shape, pose, hair, expression, and identity; match lighting and shadows; keep the background unchanged; no accessories or text
```

### precise-object-edit
```
Use case: precise-object-edit
Input images: Image 1: room photo
Primary request: replace only the white chairs with wooden chairs
Constraints: preserve camera angle, room lighting, floor shadows, and surrounding objects; keep all other aspects unchanged
```

### lighting-weather
```
Use case: lighting-weather
Input images: Image 1: original photo
Primary request: make it look like a winter evening with gentle snowfall
Constraints: preserve subject identity, geometry, camera angle, and composition; change only lighting, atmosphere, and weather
```

### style-transfer
```
Use case: style-transfer
Input images: Image 1: style reference
Primary request: apply Image 1's visual style to a man riding a motorcycle on a plain white backdrop
Constraints: preserve palette, texture, and brushwork; no extra elements
```

### compositing
```
Use case: compositing
Input images: Image 1: base scene; Image 2: subject to insert
Primary request: place the subject from Image 2 next to the person in Image 1
Constraints: match lighting, perspective, and scale; keep the base framing unchanged; no extra elements
```

### character consistency workflow
```
Use case: identity-preserve
Input images: Image 1: previous character anchor illustration
Primary request: continue the story with the same character in a new scene and action
Scene/backdrop: snowy forest after a winter storm
Subject: same young forest hero gently helping a frightened squirrel out of a fallen tree
Style/medium: same children's book watercolor illustration style as Image 1
Constraints: do not redesign the character; preserve facial features, proportions, outfit, color palette, and personality; no text; no watermark
```

### sketch-to-render
```
Use case: sketch-to-render
Input images: Image 1: drawing
Primary request: turn the drawing into a photorealistic image
Constraints: preserve layout, proportions, and perspective; choose realistic materials and lighting; do not add new elements or text
```
````

## openai-docs

### SKILL.md

Source: `codex-rs/skills/src/assets/samples/openai-docs/SKILL.md`, SHA-256 `aa6829e21df2223167c85d2e49b6337a7345c84c1033f1ec10182c7882b36d45`.

```text
---
name: "openai-docs"
description: "Use for Codex models/pricing, scheduled tasks, skills, settings, setup, troubleshooting, customization, automations, and self-knowledge—including 'you,' 'your,' 'this app,' or 'this coding agent' when they refer to Codex—and for OpenAI APIs/products and ChatGPT Work. Also use for model choice/migration, prompting, SDKs, Responses, Realtime, agents, evals, and Chat/Work/Codex comparisons. Do not use for generic app/software tasks that merely mention Codex."
metadata:
  short-description: "Codex models/pricing, scheduled tasks, skills, settings, setup, troubleshooting, and self-knowledge; OpenAI APIs and ChatGPT Work. 'You'/'this app' means Codex only."
---

# OpenAI Docs

Provide current, cited OpenAI product, API, model, and Codex guidance. Read zero or one primary reference.

**First substantive action:** Search the user's exact requested official OpenAI documentation topic and any explicitly named model using a concise, topic-specific query of 2-6 essential terms. When an already-available direct official documentation search and page-retrieval capability is present, use it first: search, then fetch or open the matching official page before general web search. Otherwise, immediately use official-domain web search, then actually open or fetch the relevant official page. Complete this source order before reading a reference, inspecting local or repository files, running a Codex manual or model resolver, drafting a plan, or answering from memory. Use the actual fetched page, not a search snippet or an unopened link. If one official search or page does not establish the answer, search another appropriate official domain and actually open or fetch the result. Preserve the exact requested model; never substitute a newer model.

**Only exception:** An explicitly requested, genuinely broad, cross-topic Codex setup, orientation, or system-map synthesis may use the manual first when shell execution and an allowed temporary cache are available. A specific Codex feature, setting, command, error, model, or requested citation remains docs-first. Mixed Chat/Work/Codex comparisons are official documentation questions, not manual-first Codex requests.

For generic software tasks, answer the software task directly. OpenAI implementation, debugging, SDK, API, prompting, agent, and eval requests are not generic.

For a straightforward factual or citation-only request, follow the source order and do not read a route reference. This includes straightforward API facts, ChatGPT Work or mixed Chat/Work/Codex comparisons, model tiers, aliases, Pro mode, reasoning settings, factual migration baselines, and narrow Codex facts. Prioritize `learn.chatgpt.com` for ChatGPT Work.

## Choose one primary route

Use the first matching route, and read its reference only when the requested task needs that specialized workflow:

- **Explicitly requested local documentation integration:** Read [integration guidance](references/mcp-diagnostics.md) only when the user explicitly requests that local integration.
- **Model migration, upgrades, or model-specific prompting:** Read [model-migration.md](references/model-migration.md) for actual migration planning, implementation, dynamic target resolution, or prompt changes. Preserve an explicitly requested target.
- **Model selection and comparisons:** Read [model-selection.md](references/model-selection.md) only when nuanced current, latest, default, cost, latency, quality, or modality tradeoffs need more guidance. Do not run a migration resolver for selection alone.
- **Product, API, ChatGPT Work, and mixed Chat/Work/Codex documentation:** Read [official-docs.md](references/official-docs.md) only when fetched official pages leave source selection, API schemas, or the requested implementation unresolved. This route is not manual-first.
- **Explicitly broad Codex setup, orientation, or cross-topic synthesis:** Read [codex-self-knowledge.md](references/codex-self-knowledge.md) when the eligible Codex manual or deeper Codex procedures are needed.

Read at most one primary reference. Do not open every route, bundled model guide, or helper script. Read a supporting reference or run a helper only when the chosen workflow demonstrably needs it.

## Source and execution boundaries

- Search, open, fetch, and cite only `developers.openai.com`, `platform.openai.com`, and `learn.chatgpt.com`. Cite the page that supports the claim. State uncertainty when official sources do not establish pricing, availability, account access, limits, or behavior.
- Preserve an explicitly requested model for selection, migration, and prompting. Resolve an unspecified latest or current migration target only after searching and fetching current official guidance.
- Use `references/latest-model.md` only as a disclosed fallback after current official model guidance does not answer the question. Read `references/upgrading-to-gpt-6-astra.md` only for an actual, requested GPT-6 migration; read `references/prompting-guide.md` only for requested prompting work.
- Before building, running, editing, debugging, or testing an API-backed app or tool, use `openai-platform-api-key` first when available. Documentation, conceptual examples, model selection, and read-only guidance do not require an API key.
- Say "OpenAI Docs" or "official OpenAI documentation" in user-facing answers. Keep exact official citations and examples concise.
```

### references/codex-self-knowledge.md

Source: `codex-rs/skills/src/assets/samples/openai-docs/references/codex-self-knowledge.md`, SHA-256 `8c8fb00e6e5cb1977924f5164684a6095427fa828bbc765225f17d9aeb79a912`.

````text
# Codex self-knowledge

Use this manual-first route only for genuinely broad Codex setup, orientation, customization, troubleshooting, local-state guidance, or system-map synthesis across skills, plugins, MCP, hooks, `AGENTS.md`, automations, and product surfaces. Mixed Chat/Work/Codex comparisons belong to `official-docs.md` instead.

Narrow Codex documentation questions require official documentation search first, then an actual page open or fetch using an available documentation or official-domain web capability. This includes a single feature such as Codex Goals, a specific setting, documented behavior, exact error, or requested page citation. Search and fetch the exact official topic before inspecting local files or bundled references. Do not fetch the manual, read bundled references, inspect local configuration or caches, or turn a targeted documentation lookup into broad product synthesis. Current or latest model questions follow the model-selection route.

## Start with the manual

Reuse a manual path and outline path already established in the same thread when both remain usable and current. Refresh before relying on a path fetched more than about a day ago, obtained from another thread or uncertain source, or missing likely-current information.

Otherwise, run the bundled manual helper first. Skip it without probing only when policy explicitly makes the session read-only, shell execution unavailable, or every allowed temporary cache location unavailable. Workspace-only write access is not enough: the helper needs an allowed writable temp cache. A guessed sandbox restriction is not evidence that the helper is unavailable.

Resolve `<skill-dir>` to the actual installed skill directory, then run:

```bash
node <skill-dir>/scripts/fetch-codex-manual.mjs
```

The helper automatically chooses the first usable cache location in this order:

1. `$TMPDIR/openai-docs-cache`
2. `%TEMP%\openai-docs-cache`
3. `%TMP%\openai-docs-cache`
4. `/private/tmp/openai-docs-cache`
5. `/tmp/openai-docs-cache`

Use an explicit override only when the allowed cache must be selected manually:

```bash
node <skill-dir>/scripts/fetch-codex-manual.mjs --cache-dir <cache-dir>
```

On Windows, `%TEMP%` and `%TMP%` are discovered automatically; `$env:TEMP\openai-docs-cache` is a typical PowerShell override. The helper handles configured HTTP(S) proxies and falls back to `curl` when needed. Do not require a POSIX-only environment prefix or an unnecessary cache override.

The helper verifies the current source and returns a manual path, outline path, freshness status, and heading outline. Use that outline to locate relevant headings and line ranges, then read or search only the returned manual and outline paths. Do not inspect unrelated repositories, caches, source trees, or local state to establish a public Codex product claim.

For follow-up questions in the same thread, reuse those fresh paths instead of fetching again. If asked whether the manual is current enough to rely on now, rerun the helper when an allowed temp cache is available and answer from its reported status and returned paths.

## Fill only genuine documentation gaps

If the manual answers a claim, stop retrieving sources for that claim. Its official source pages and known anchors are sufficient citation support. Continue the user's broader task when the documentation lookup was only one dependency.

If the helper was legitimately skipped, actually fails, or the fresh manual lacks a material or likely-current claim, use the narrowest official follow-up. Search the exact topic using an available documentation or approved-domain web capability, then actually open or fetch a clearly relevant official result. A page-specific citation can justify the same narrow follow-up.

For an undocumented Codex term, mode, acronym, or exact error, first check adjacent manual terminology. Map it to the closest documented concept when possible. If the exact term is material or likely current, perform one targeted official search-and-fetch; if it remains undocumented, say so. Do not expand into internal knowledge bases, private source trees, guessed roadmap details, or account-specific workarounds.

If official documentation conflicts with a callable capability verified in the current session, explicitly state the conflict and prefer that verified behavior for this environment. Otherwise, resolve unsupported claims with bounded uncertainty or route the user to support, an administrator, or product feedback.

## Choose the smallest matching Codex surface

- Prompt or thread context: one-off task constraints.
- Repository `AGENTS.md`: durable team conventions, commands, and verification expectations; nested files apply more specifically within their subtree.
- Project `.codex/config.toml`: settings for a trusted repository, including sandbox, MCP, hooks, model, and reasoning defaults.
- Global config or global guidance: personal defaults across repositories.
- Skill: a reusable workflow, optionally with focused references or scripts.
- Plugin: an installable bundle of skills, tools, commands, MCP configuration, hooks, apps, assets, or related metadata.
- MCP server or app connector: authorized live external data and actions. Use an authenticated connector, not web search or memory, for private Google Docs, Calendar, Slack, GitHub, Notion, or similar workspace data.
- Automation: scheduled checks, reminders, monitors, or follow-ups; use an existing-thread heartbeat when continuity matters.
- Hook: mechanical enforcement around lifecycle events, tool calls, commands, or edits.

Split requests that combine one-off, durable, repository-scoped, and recurring behavior instead of forcing them onto a single surface. For example, "always do this, but only for this PR" belongs in the current prompt or thread unless the user explicitly wants persistence or enforcement.

For a surface recommendation, state what to use, why it fits, what to avoid, and the manual or official documentation supporting the answer.

For product surfaces, distinguish terminal-first CLI work, editor-attached IDE work, desktop planning or review, hosted cloud execution, in-app browser testing, the user's existing Chrome session, and desktop Computer Use. Keep `config.toml` defaults, `requirements.toml` constraints, and managed or administrator policy separate. An API key does not establish ChatGPT, Codex cloud, connector, or account access.

For plugin or app failures, check the installed bundle, enabled state, connector authorization, MCP setup, restart or new-thread expectations, and workspace policy before inferring a cause. Route billing, entitlements, undocumented rollout labels, and unsupported access paths to the appropriate support or administrative owner.

Memory can provide user preferences or context, but explicit prompt instructions win and memory is not a source for current external facts. Sandbox or network denials require narrowly scoped escalation with a clear justification; destructive commands, writes outside the workspace, and broad access changes require explicit approval.

When a page-specific citation helps, useful official anchors include `concepts/customization#agents-guidance`, `concepts/customization#skills`, `plugins/build#plugin-structure`, `concepts/customization#mcp`, `config-advanced#hooks`, `app/automations#thread-automations`, and `config-reference#configtoml`.
````

### references/latest-model.md

Source: `codex-rs/skills/src/assets/samples/openai-docs/references/latest-model.md`, SHA-256 `bdf241d505eb071b1c7b0b732f842b701348cf6eab95d1c36fd97edac64dd158`.

```text
# Latest model fallback

This is a compact, non-authoritative fallback, not a source for current availability, prices, aliases, or defaults. First search for and fetch current official model guidance at `https://developers.openai.com/api/docs/guides/latest-model` and the relevant official model page. The fetched official documentation wins if this snapshot has drifted. Disclose any use of this fallback.

## Model roles

| Model ID | Documented workload to verify against the current model page |
| --- | --- |
| `gpt-6` | GPT-6 family alias; verify its currently documented routing and availability. |
| `gpt-6-astra` | Quality-first flagship, reasoning, and difficult coding work. |
| `gpt-5.6-terra` | Balanced quality, latency, and cost. |
| `gpt-5.6-luna` | Primary choice for faster or cheaper workloads. |

Use `https://developers.openai.com/api/docs/guides/latest-model/gpt-6-astra.md#migration-quickstart` for an actual GPT-6 migration and `https://developers.openai.com/api/docs/guides/latest-model/gpt-6-astra.md#prompting-best-practices` for requested GPT-6 prompting. Open and read the relevant page before recommending a request shape, reasoning setting, endpoint, tool behavior, or migration.

## Explicitly requested existing models

| Model ID | Boundary |
| --- | --- |
| `gpt-4.1` | Preserve only when the user explicitly requests this model or existing migration target; search and fetch its own current official guide. |
| `gpt-5.4` | Preserve only when the user explicitly requests this model or existing migration target; search and fetch its own current official guide. |

Do not promote a legacy model as the current default, substitute it into an unrelated task, or replace an explicitly requested legacy target with GPT-6 Astra. Recommend a specialized image, audio, realtime, coding, moderation, or embedding model only after verifying the requested modality against current official documentation.

Verify GPT-6 Pro against current official Responses and model documentation before describing model IDs, reasoning modes, request parameters, or account availability; do not invent a separate `gpt-6-pro` model slug.
```

### references/mcp-diagnostics.md

Source: `codex-rs/skills/src/assets/samples/openai-docs/references/mcp-diagnostics.md`, SHA-256 `49bbd2f73df7bbd7f86c80425dea4da2d301c22046080399a36bfc0ca49509e9`.

````text
# Local documentation MCP setup and diagnostics

Use this route only when the user explicitly asks to configure or troubleshoot the official OpenAI documentation MCP server in a supported **local Codex client**. A missing documentation tool during an ordinary documentation request is not a setup request: answer with the root skill's official-domain web fallback without installation, sandbox escalation, configuration changes, or restart.

## Verify the supported local setup

1. Search and fetch current official Codex MCP setup documentation when those tools are callable. Otherwise, search and fetch the relevant official OpenAI documentation directly.
2. Confirm the documented endpoint is `https://developers.openai.com/mcp` and verify the supported command or configuration against that current documentation before recommending it.
3. When the current documentation supports it, the local Codex CLI setup is:

   ```sh
   codex mcp add openaiDeveloperDocs --url https://developers.openai.com/mcp
   ```

   The equivalent documented configuration is:

   ```toml
   [mcp_servers.openaiDeveloperDocs]
   url = "https://developers.openai.com/mcp"
   ```

4. Check the supported local client's MCP listing or configuration, its enabled state, relevant workspace/admin policy, and any documented authentication requirement. Verify success from the actual command result, configuration, or a callable documentation-tool search/fetch; never claim installation or access without evidence.
5. Recommend a local-client restart or new local session only when current official documentation or observed client behavior requires it. Clearly identify which local client must refresh.

A skill dependency declaration, configured server, or local-client setup does not make a tool callable in an already running session. In particular, editing a hosted container's local configuration cannot install a tool into the host or model's current tool inventory. Never claim a local command installed the server into a current hosted session.

Only perform a local installation or configuration change when the user explicitly authorizes that change. Never request sandbox escalation, edit hosted configuration, install a dependency, or ask the user to restart a hosted session merely to answer an ordinary documentation question.
````

### references/model-migration.md

Source: `codex-rs/skills/src/assets/samples/openai-docs/references/model-migration.md`, SHA-256 `bef46671036c8e483b7f65df931171217d55a8d26098851c2f89784db8edca2f`.

````text
# Model migration and prompting

Use this route for model upgrades, migration planning, model-specific prompting, or latest/current/default prompting guidance. First search current official OpenAI documentation for the exact requested topic and model, then open or fetch the relevant official page using an available documentation or official-domain web capability. Do not run a resolver, open bundled references, or rely on a guide URL before completing that official search and actual page fetch.

## Choose the target before loading more context

- **Explicit model target:** Preserve the user's exact requested target, including an explicitly requested GPT-5.5 or GPT-5.6 migration. Do not run the latest-model resolver and do not substitute a newer model. Search for and fetch current guidance for that exact model. A GPT-5.6 migration must not load GPT-6 guidance or references.
- **Unspecified, latest, current, or default target:** Search for and fetch `https://developers.openai.com/api/docs/guides/latest-model` first. Use the corresponding `latest-model.md` metadata only when dynamic migration resolution is needed, then run the platform-specific resolver below and preserve its returned model and exact guide URLs.
- **Latest/current/default prompting:** Follow the dynamic-target route, then use the returned prompting guide. Do not run the resolver for explicitly named-model prompting.
- **Pure model selection:** Use `references/model-selection.md` instead. Do not run the resolver.

For POSIX shells, invoke the resolver through `sh`, without assuming an executable bit:

```sh
sh <skill-dir>/scripts/resolve-latest-model-info
```

On Windows, use the CommonJS entry point with Node.js 18 or newer:

```text
node <skill-dir>\scripts\resolve-latest-model-info.cjs
```

If the Windows Node runtime is unavailable and `load_workspace_dependencies` is callable, use its returned runtime and retry once. Do not execute the extensionless POSIX wrapper directly on Windows.

Do not suppress or redirect resolver stdout. Success requires JSON with nonempty `model`, `migrationGuideUrl`, and `promptingGuideUrl` fields. If the command fails or any required field is missing, retry the platform-specific command once, then fall back to current official documentation and finally disclosed bundled references.

## Retrieve only the guidance this request needs

Treat returned guide URLs as opaque: fetch those exact URLs without deriving, substituting, or appending a model query. Use an available official documentation or first-party-domain capability to open and read the relevant official page. Retry the exact guide URL when its response contains only a title or no substantive body.

- Fetch `migrationGuideUrl` for a requested migration or upgrade plan.
- Fetch `promptingGuideUrl` only when the user asks for prompting guidance or the migration requires a prompt change. Extract only `## Prompting best practices` through the next H2 heading.
- For explicitly named-model prompting, fetch that model's official prompting guidance and extract only `## Prompting best practices` through the next H2 heading. Do not load a migration reference or run the resolver.
- For an actual GPT-6 migration or implementation plan, fetch `https://developers.openai.com/api/docs/guides/latest-model/gpt-6-astra.md#migration-quickstart`. For specifically requested GPT-6 prompting, fetch `https://developers.openai.com/api/docs/guides/latest-model/gpt-6-astra.md#prompting-best-practices`. Read `references/upgrading-to-gpt-6-astra.md` only when fetched official guidance does not resolve needed compatibility gates, scoped code changes, tier-aware routing, validation, or other migration-specific judgment. Never load it for documentation-only questions about model tiers, the family alias, Pro mode, reasoning effort, or current guidance when the fetched official documentation already answers them.
- Read `references/prompting-guide.md` only when prompting guidance or prompt changes are actually needed and current official guidance is unavailable.
- Read `references/upgrade-guide.md` only when current official migration guidance is unavailable. Disclose when a bundled fallback was used.

## Keep implementation changes scoped

Change active model defaults and directly related prompt surfaces only when the user requested that work. Update registries, model pickers, capability metadata, routing, pricing, or tests only when they are in scope and current official documentation verifies the relevant values.

Preserve each workload's cost, latency, quality, reasoning, tool, endpoint, and output-contract role. Do not collapse a tiered router into one flagship model, replace intentionally pinned fallbacks, or rewrite historical examples, fixtures, eval baselines, provider comparisons, or unrelated SDK and authentication configuration.

If a safe migration requires an endpoint change, request-schema change, tool-handler change, or other implementation outside the requested scope, report the exact compatibility blocker and smallest follow-up instead of silently changing behavior.
````

### references/model-selection.md

Source: `codex-rs/skills/src/assets/samples/openai-docs/references/model-selection.md`, SHA-256 `ba2d164abbca30435a460a0bc3a7d82398dce2bdf092705c98ba55b3f3af38a8`.

```text
# Model selection

Use this route for model recommendations, comparisons, and latest/current/default choices when the user is not requesting a migration or prompting guidance.

1. Search current official OpenAI documentation for the exact requested workload and any explicitly named model; then open or fetch the relevant official page. For current or latest family guidance, use `https://developers.openai.com/api/docs/guides/latest-model`.
2. Use any available official documentation or first-party-domain search. Read the actual source; do not make a recommendation from a search snippet, guessed default, or bundled snapshot.
3. Match the documented model to the user's requested modality, quality, latency, cost, context, and workload. Distinguish flagship, balanced, high-throughput, coding, audio, image, or other specialized roles only when the fetched current documentation supports the distinction.
4. Preserve an explicitly requested model or existing target. Cite the current official page and state uncertainty about availability, pricing, limits, or account access.

Pure model selection does not require migration metadata. **Do not run the resolver.**

Read `references/latest-model.md` only when fetched current official sources cannot answer the question. Disclose that bundled fallback guidance was used and may be outdated.
```

### references/official-docs.md

Source: `codex-rs/skills/src/assets/samples/openai-docs/references/official-docs.md`, SHA-256 `7962f2dce55089b93bde4115bb89fd42f20993c1597a2b13edd4956f463875b9`.

```text
# Official documentation, API references, and ChatGPT Work

Use this route for OpenAI product or API documentation, examples, citations, ChatGPT Work, learning content, mixed Chat/Work/Codex comparisons, and narrow Codex product documentation. Follow the root skill's official-source order and credential boundary.

An explicit OpenAI documentation question stays documentation-first even when embedded in a broader repository, Promptfoo, agent-evaluation, `PLANS.md`, frontend, tool-use, image, Realtime API, SDK installation, or streaming-debugging task. Search the exact requested official documentation and open or fetch its relevant page before inspecting local files, drafting a plan, running evals, reading bundled references, or invoking the Codex manual. Then use the fetched official source to complete the requested work.

## Find the smallest useful source

1. Search the exact topic with a specific, title-like query containing 2-6 essential terms. Prefer an already-available direct official documentation search and page-retrieval capability; search, then fetch or open the best page or section. Otherwise, immediately use official-domain web search and actually open or fetch the result.
2. If the results are noisy, narrow the query. When a plausible official documentation URL is available, open or fetch the page instead of relying on search snippets. Use an already available documentation index only when there is no clear search query.
3. For API schemas, required fields, parameters, or endpoint shapes, use an already available OpenAPI or specification capability when it directly resolves the question. Otherwise verify the shape against the fetched official API guide or reference.
4. Cite the exact official page supporting each consequential claim. Keep examples minimal, paraphrase instead of quoting at length, and state when official sources do not establish a capability, parameter, price, or availability.

Preserve an explicitly requested model in the search and answer. Search the requested topic directly for model-specific frontend and tool-use prompting, image input or generation, Realtime voice or translation, official Agents SDK installation, Responses streaming errors, and Codex Goals. A specific Codex feature, error, setting, or requested citation is a narrow documentation lookup, not the broad manual-first exception. Current or latest model recommendations follow the model-selection route and the same official search-and-fetch order.

## ChatGPT Work and mixed surfaces

Treat a comparison between Chat, Work, and Codex as ChatGPT Work documentation, not broad Codex self-knowledge. Search `learn.chatgpt.com` and open or fetch the relevant official page. Useful starting pages are:

- `https://learn.chatgpt.com/docs/use-chatgpt`
- `https://learn.chatgpt.com/docs/get-started-with-work`

If someone simply asks an API question from ChatGPT Work, answer the API question from the relevant API guide. Being in Work does not make it a question about the Work product.

Separate documented user-facing purposes from unsupported claims about underlying models, hard capability boundaries, file or context inheritance, exact UI labels, account entitlements, and rollout availability. When those details cannot be verified, cite the closest allowed official source and state the uncertainty.
```

### references/prompting-guide.md

Source: `codex-rs/skills/src/assets/samples/openai-docs/references/prompting-guide.md`, SHA-256 `548d4ca73a34cd4b0041ef05a899592e8c50772b8f3a76c579ec941e403e19f6`.

````text
## Retrieve the live GPT-6 prompting guidance

Use already-callable official documentation search and fetch, or immediately use official-domain web search and fetch, to retrieve the live GPT-6 prompting guidance from:

https://developers.openai.com/api/docs/guides/latest-model/gpt-6-astra.md#prompting-best-practices

Read only the `## Prompting best practices` section, stopping at the next H2 heading. The URL anchor points to the section visually, but a documentation fetch may return the full page, so explicitly extract only that section.

Treat the live section as the canonical model-specific prompting guidance. Use the local copy below only when live guidance is unavailable. Keep it identical to the page's `## Prompting best practices` section when refreshing this reference.

## Prompting best practices

GPT-6 Astra is more intelligent and capable than prior models like GPT-5.6 Sol, and also exhibits behavior patterns that can be optimized through prompting the model for your use case.

### GPT-6 Astra behavior

- [Initiative and follow-through](#initiative-and-follow-through) – The model is designed to be a more effective collaborator and is thus more likely to ask the user a question when additional input could materially change the result. This can cause it to stop when the user may expect it to make reasonable assumptions and persist.
- [Instruction following](#instruction-following) – GPT-6 Astra is stronger at general instruction following than our previous models, giving you greater control over its behavior. It can be more sensitive to instructions contained in skills and other files, such as `AGENTS.md`. We **strongly recommend** auditing skills and other files accessible to your model for instructions that could influence its behavior.
- [Personality and writing style](#personality-and-writing-style) – The model tends toward detailed, formatted responses and may use recurring phrases across sessions. Specify the writing style and structure your application needs.
- [Subagent delegation](#subagent-delegation) – The model may delegate less often than desired for your workflow. Specify when and how much it should use subagents for parallel work.
- [Testing and verification](#testing-and-verification) – For coding tasks, the model tends to be thorough in testing before considering a task complete. For smaller tasks, this can result in broader tests than the task requires.

### Initiative and follow-through

GPT-6 Astra is generally better than GPT-5.6 Sol and earlier models at staying coherent during long tasks. It is also more likely to ask for clarification where earlier models would make assumptions.

To encourage more autonomous work, start with this prompt:

```text
You should infer the user's intent and task scope from the instructions and prior conversation context. Your job is to bias towards action and carry the user's intended task to completion.

When the user expresses intent to perform new work or fix an existing issue, persist until the user's intended goal is complete. Progress autonomously towards the user's goal (e.g. creating isolated worktrees / checkouts if needed, resolving merge conflicts, read-only actions, creating draft PRs etc.) unless they are clearly destructive or irreversible.
```

When the user’s intent is unclear, the model is more likely to ask the user for clarification to proceed. Prompt the model to follow through if the user’s prompt implies authorization:

```text
When the user's prompt indicates a request for action, such as "can you...", "I want to...", "help me..." and similar expressions, treat these as instructions to do the work and take action. Do not stop at acknowledging capability (e.g. "Yes…"), proposing a plan, or offering to continue. Do not settle for a partial or "helpful enough" solution that does not fully satisfy the user's task to save time, effort or tokens. If a task requires sustained work, complete all the necessary work until the intended outcome is fulfilled.
```

Prompt the model to ask for approval only after preparing a concrete, reviewable result. This avoids blocking the task before the model has done the work it can, and often leads to quicker task completion.

```text
Before asking the user clarifying questions, you should complete the work that is already authorized from context and necessary to make the proposed action concrete and reviewable. The user should be approving a concrete, reviewable result. For example, before deploying a change, writing to an external application, merging a PR or publishing a site, do all the required work first so that user approval is the final step. You don't need user permission for reversible tasks, read-only actions, reviews or fixes, or anything for which authorization is provided earlier in the session or strongly implied from the task instruction.

Do not introduce unsolicited warnings, disclaimers, approval flows, or safety/compliance checklists due to hypothetical risk.
```

The model also likes to ask non-blocking questions as it’s working by default, so adjust these prompts to match the level of autonomy your application needs.

### Instruction following

GPT-6 Astra is better able to follow longer instructions, but can also be more sensitive to information in context. For example, unclear or conflicting guidance in a skill file may cause the model to pause and block work early. Make the priority of user instructions and skills explicit.

```text
The user's instructions take precedence over guidelines provided in a skill. If explicit user instructions conflict with a skill's instructions, prioritize the user's instructions.
```

Asking the model to identify the skill and instruction that caused it to pause or change direction can also be effective in providing transparency into model behavior.

```text
If a skill causes you to ask for permission or confirmation, pause, leave requested work unfinished, or diverge from the user's intent, name and link to the exact SKILL.md file you read, quote the relevant instruction, and briefly explain how it applies. Distinguish explicit skill requirements from your interpretation of guidelines.
```

Use this prompt to find silent and conflicting guidance when your application loads many skills and instruction files such as `AGENTS.md`.

### Personality and writing style

GPT-6 Astra tends to use lists, tables and Markdown to make responses scannable. If your application needs prose with less formatting, specify that preference.

```text
Default to using clear, concise paragraphs, each developing one main idea. Use lists only when the information is genuinely parallel, sequential, or easier to compare, and avoid nested lists unless the hierarchy cannot be expressed clearly in prose. Use plain, simple language: familiar words, concrete examples, and precise verbs. Prefer active voice and direct statements.

Make sure to state the main point clearly and early, then develop it with the explanation and detail the reader needs. Let each sentence build on what came before. Develop the points that matter and provide enough support to be useful.
```

For technical communication, the following prompt helps strike a balance between using clear, coherent language while remaining domain appropriate:

```text
Use plain language over jargon, and reference technical details only to the degree that it helps illustrate an idea or your work to the user. Communicate complex concepts in a clear and cohesive manner, and calibrate your writing to the level of background knowledge assumed from the user's prompt and context.
```

To reduce jargon and stock phrases in writing, start with this prompt:

```text
Avoid using slop words or phrases like "Bottom Line:" in conclusions, "delve," "foster," "leverage," "it's worth noting," "importantly," "Question? Answer." or "This isn't about X. It's about Y.", "genuinely" or hyphenated compound descriptions and adjectives. Do not use concluding summary statements such as "In short:..", "The simplest mental model is:...".

State the intended action directly. Avoid adding what you won't do, what will remain unchanged, or how you'll separate or categorize results. Do not use contrastive framing such as "X, not Y" or "X—not Y" that introduces an unprompted alternative that the user didn't ask about. Avoid invented compound labels like "exact-head checks" and "editorial-row layouts", vague qualifiers, and canned transitions; use plain verbs and prepositions to state the actual relationship directly.
```

### Subagent delegation

GPT-6 Astra is trained to be able to divide and delegate work to subagents that work in parallel. If you are implementing a multi-agent system in your harness, use the following prompt to tune how much GPT-6 Astra should delegate work:

```text
If at any point you can parallelize work by delegating tasks to another agent (no matter if you are the root or subagent), you should do so using collaboration tools if it could save time or improve quality.
```

Messages between agents may contain grammar or spacing errors. Use this prompt to make inter-agent messages easier to read:

```text
Messages that you send to other agents and your final answer may be read by a human, so ensure they are legible. Always put proper spaces between words and/or numbers.
```

The model tends to respond well to prompting for how and when it should delegate work to subagents, so tune this behavior to fit with your harness and multi-agent implementation.

### Testing and verification

For coding tasks, calibrate how much testing and verification a change requires. This can help avoid unnecessary tests or repeated checks for small changes.

```text
Do not write tests for reversible, low-impact changes that mirror the implementation. If you do choose to verify your work with tests, make sure that the tests are meaningful and necessary to verify implementation.

Run tests appropriate to the change and complete required checks. Once those pass, broaden or repeat testing only when new changes, failures, or unresolved concerns justify it; otherwise, continue toward completing the task.
```
````

### references/upgrade-guide.md

Source: `codex-rs/skills/src/assets/samples/openai-docs/references/upgrade-guide.md`, SHA-256 `ecac89155f910f064fd306e89c74585cabdb2142aba4f2acc0cead092ae1d1a5`.

```text
# Model upgrade guidance

Use this file only as a bundled routing fallback when the live migration guide cannot be fetched.

For latest, current, default, or unspecified-model upgrades:

1. Run `scripts/resolve-latest-model-info`.
2. Fetch the returned `migrationGuideUrl` and `promptingGuideUrl` exactly.
3. Treat the live guides as canonical.
4. If remote retrieval fails, disclose that bundled fallback guidance is being used.

For an explicit GPT-6 Astra migration:

1. Preserve the user's explicit target; do not run the latest-model resolver.
2. Fetch the live GPT-6 model guidance:

   https://developers.openai.com/api/docs/guides/latest-model/gpt-6-astra.md

3. Read `references/upgrading-to-gpt-6-astra.md` for skill-specific migration judgment.
4. Read `references/prompting-guide.md` only when prompt changes are needed.

For another explicit model target, preserve that target and fetch its current official guidance. Do not reuse GPT-6-specific defaults, API shapes, or compatibility rules for a different model.
```

### references/upgrading-to-gpt-6-astra.md

Source: `codex-rs/skills/src/assets/samples/openai-docs/references/upgrading-to-gpt-6-astra.md`, SHA-256 `62ef6d22684662a019d203834fe1205a07e4ca4c65dddcbabe1bb51efe1aa840`.

````text
# Upgrading to GPT-6 Astra

Use this guide when the user asks to migrate an existing OpenAI API integration, repository, prompt stack, agent, model router, or model picker to GPT-6 Astra.

The default explicit target is `gpt-6-astra`. Verify the `gpt-6` family alias's currently documented routing and availability before using it. Do not treat every old model usage as an Astra candidate: retain Terra for balanced work and Luna as the primary faster or cheaper model.

Before changing code, retrieve the current live GPT-6 model guidance using already-callable official documentation search and fetch, or immediately use official-domain web search and fetch:

https://developers.openai.com/api/docs/guides/latest-model/gpt-6-astra.md

For prompt changes, also read only the `## Prompting best practices` section from:

https://developers.openai.com/api/docs/guides/latest-model/gpt-6-astra.md#prompting-best-practices

Treat live docs as canonical for current model IDs, parameters, limits, pricing, and feature availability. The skill-specific workflow below covers repository inspection, scope preservation, and validation. The fallback after it includes all non-prompting guidance, including access notices, examples, caveats, and `## Migration quickstart`; the full prompting section is in `references/prompting-guide.md`. When refreshing, preserve all guide content unless it is specific to the website rather than useful to the skill, and record any omission. Remove website metadata and component markup while retaining their readable content. Resolve site-relative links against `https://developers.openai.com` and section-only links against the canonical model-guide URL above.

## Core principle

Do not perform a blind model-string replacement.

First preserve the behavior, latency class, cost class, reasoning level, endpoint contract, tool semantics, cache behavior, and output contract of each usage site. Then make the smallest safe migration. Adopt new GPT-6 capabilities only when they solve a measured problem or the user explicitly asks for them.

A model upgrade alone does not authorize adding reasoning fields, changing request schemas, or rewriting tests. Set a supported reasoning effort explicitly to preserve the source model's effective behavior; verify omitted defaults rather than guessing.

## Migration posture

Classify every usage site before editing:

1. `simple Astra migration`
   - One flagship model usage.
   - Same endpoint and request shape can remain.
   - Reasoning effort is explicit or its old effective value is known.
   - No cache, vision, file, tool, or parser behavior needs implementation changes.
2. `tier-aware family migration`
   - The repository exposes multiple model roles, model choices, fallbacks, routers, pricing data, or capability metadata.
   - Map each role to Astra, Terra, or Luna instead of replacing everything with Astra.
3. `compatibility migration`
   - The safe move requires parameter, endpoint, cache, state, tool-loop, or multimodal-detail changes.
   - Make these changes only when implementation work is inside the user's requested scope. Otherwise report the exact blocker and smallest follow-up.
4. `prompt migration`
   - The API shape can remain, but representative traces show a prompt-specific regression.
   - Make a surgical prompt edit tied to that failure; do not rewrite a working prompt stack wholesale.
   - When the task is to update prompting guidance, edit the directly tied prompt surface only. Do not modify runtime request code, model schemas, or tests unless the prompt change requires it.
5. `optional feature adoption`
   - Pro mode, persisted reasoning, explicit caching, Programmatic Tool Calling, or multi-agent behavior is being added deliberately.
   - Keep this separate from the baseline migration so its effect can be measured.
6. `leave unchanged`
   - Historical examples, documentation about old models, snapshots, fixtures, eval baselines, comparison code, intentionally pinned fallbacks, unsupported providers, or ambiguous usages.

When intent is unclear, prefer leaving a usage unchanged and list it for confirmation over silently changing its role.

## Inventory before editing

Search for more than literal model IDs. Inventory:

- model strings, aliases, environment variables, CLI flags, config defaults, and deployment settings;
- SDK calls to Responses, Chat Completions, Batch, or provider adapters;
- reasoning settings, token budgets, sampling settings, and latency timeouts;
- function tools, hosted tools, structured outputs, response parsers, and replay logic;
- system, developer, user, and tool-description prompts tied to each usage;
- routers, fallbacks, model allowlists, enums, regexes, validation schemas, and capability maps;
- model picker UI, display labels, descriptions, context limits, pricing metadata, and provider catalogs;
- prompt-cache keys, retention options, stable-prefix construction, and cache metrics;
- image, PDF, file, OCR, and computer-use inputs;
- tests, fixtures, snapshots, evals, analytics labels, billing tables, and docs.

When changing a default model, search every active default surface: runtime config, environment/config files, setup docs, tests, CLI defaults, and deployment examples. Update them together.

For each usage site, record:

- source model and why it appears to be used;
- endpoint and SDK/client surface;
- prompt surface;
- effective reasoning effort, including defaults;
- latency, cost, context, and quality role;
- tools, structured outputs, caching, state replay, and multimodal inputs;
- downstream parsers or user-visible contracts;
- migration class and validation plan.

## Choose the target model by role

Use this as a starting map, then validate against the repository's workload:

| Existing role | Starting target | Reason |
| --- | --- | --- |
| GPT-5.6 Sol or an earlier flagship | `gpt-6-astra` | Astra is the flagship-equivalent tier. |
| Balanced quality, latency, and cost | `gpt-5.6-terra` | Terra is the balanced option. |
| Faster or cheaper work, classification, extraction, routing, high-volume, or strict-latency route | `gpt-5.6-luna` | Luna is the primary speed and cost option. |
| GPT-4.1 or GPT-4o latency-sensitive flow | Start with Luna; evaluate Terra or Astra if quality requires it | A flagship replacement can change latency and cost materially. |
| Reasoning-heavy or hardest quality-first flow | Start with Astra at the old effective effort | Preserve the reasoning contract before tuning. |
| Router, fallback, or model picker | Add the family by role | Do not collapse a multi-model design into Astra. |
| Third-party or provider-specific model | Leave unchanged unless the user explicitly requests provider migration | Model-name similarity is not a safe mapping. |

Important limits to check in live docs:

- Each model's context window and maximum output.
- Long-context pricing thresholds for each route.
- Token pricing for GPT-6.

Do not invent prices, limits, or capability flags. Fetch them from current docs before updating a registry or UI.

For model pickers and registries, preserve existing model entries by default. Add GPT-6 Astra and retain the existing Terra and Luna options unless the user explicitly asks to replace or remove them. Do not invent pricing, context limits, capabilities, or metadata unless confirmed from canonical docs.

If using the `gpt-6` alias, record the returned `response.model` during validation. Do not assume an alias and an explicit Astra slug appear identically in dashboards, rate-limit configuration, analytics, or billing metadata.

## Structured outputs, parsers, and tool contracts

Keep output contracts explicit:

- preserve JSON schemas, required fields, enums, refusal handling, and parser expectations;
- preserve tool names, parameter schemas, call IDs, and retry behavior;
- keep citations, evidence fields, or native artifacts when downstream consumers require them;
- validate that the final answer still satisfies the contract, not merely that a tool call succeeded.

Do not fix a failing migration by weakening a schema, deleting required behavior, removing routes, dropping tools, or changing business logic unless the user explicitly asked for that product change.

## Prompt migration judgment

After the model and API baseline is working, run representative traces before editing prompts. Change prompts only for measured failures. Read `references/prompting-guide.md` for the exact canonical prompting section when prompt changes are needed.

## Upgrade workflow

1. Fetch current live GPT-6 docs. Fetch the Prompting Best Practices section only when prompt changes are needed.
2. Inventory every usage site and its adjacent prompt, config, registry, parser, and test surfaces.
3. Classify each usage by role and migration class.
4. Choose Astra, Terra, or Luna by the existing workload's role.
5. Preserve the old effective reasoning effort explicitly when supported; follow the canonical migration guidance for unsupported settings.
6. Run the compatibility gates:
   - endpoint and SDK support;
   - Chat Completions plus function tools;
   - cache topology and cache fields;
   - context length and long-context cost;
   - image, PDF, and file detail;
   - structured outputs and parsers;
   - Responses state replay and tool continuation;
   - mixed-model routing and unsupported new fields.
7. Apply the smallest safe model, config, registry, and prompt changes.
8. Do not add optional Pro, persisted reasoning, PTC, explicit caching, async tools, or multi-agent behavior unless needed and measurable.
9. Run existing tests and representative evals.
10. Report changed, unchanged, blocked, and confirmation-needed sites separately.

## Validation matrix

Prefer a controlled comparison:

1. old model + old prompt + old settings;
2. GPT-6 target + same prompt + preserved effective reasoning;
3. GPT-6 target + same prompt + one lower supported effort;
4. GPT-6 target + the smallest prompt or API fix required by a measured failure;
5. optional feature treatment, isolated from the baseline.

Measure what matters for the workflow:

- task success and user-visible quality;
- structured-output validity and parser success;
- tool choice, tool arguments, retries, loop count, and completion rate;
- TTFT, end-to-end latency, timeout rate, and concurrency behavior;
- input, output, reasoning, cached, and cache-write tokens;
- total cost per successful task;
- long-context, compaction, and replay behavior;
- image/PDF token use and visual/OCR accuracy;
- completeness, preserved behavior, citations, and validation evidence.

For model routers and pickers, test at least one representative workload for each role. Verify that the cheapest or fastest tier is not accidentally used for quality-critical work and that Astra is not accidentally used for every workload.

## Required final report

Return:

- `Current usage inventory`: each model site, endpoint, role, prompt surface, and old effective reasoning.
- `Target mapping`: Astra, Terra, Luna, unchanged, or confirmation-needed, with the reason.
- `Changes made`: model strings, reasoning settings, prompts, registries, metadata, tests, and API-shape changes.
- `Compatibility checks`: Chat Completions/tools, caching, state replay, multimodal detail, context/cost, schemas, and mixed-model routing.
- `Prompt changes`: each surgical edit and the failure mode it addresses.
- `Validation`: commands, evals, traces, before/after measurements, and remaining gaps.
- `Unchanged sites`: historical, pinned, ambiguous, or intentionally role-specific usages.
- `Blockers and open questions`: exact issue, why it is unsafe to guess, and the smallest next step.

Never say the migration is complete merely because model strings changed. It is complete only when the affected behavior and contracts have been validated or the remaining gaps are stated explicitly.

## Introduction

GPT-6 Astra is our most intelligent model yet, with state-of-the-art performance in computer use, browsing, software engineering, science, and professional work. It excels at carrying out multistep workflows across code, browsers, and professional software. In <a href="https://openai.com/index/gpt-6-astra/" target="_blank" rel="noopener noreferrer">several evaluations</a>, Astra achieves stronger results while using substantially fewer output tokens—delivering a lower estimated API cost per task than earlier models despite its higher per-token pricing.

GPT-6 Astra is also our most aligned model yet. It excels at exercising care, respecting task boundaries, and communicating transparently. When instructions leave room for interpretation, it uses the context it has to fill in routine gaps and asks focused questions when the answer could change the outcome. It incorporates new requirements, changes course when asked, and answers side questions without losing track of the broader task.

To build with Astra, set `model` to `gpt-6-astra` in a [Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses) request.

## What's new

- **Async tool calling:** GPT-6 Astra can continue reasoning, call other tools, or answer independent parts of a request while your application runs a tool. Set `async: true` on a function or custom tool and return its result when ready using the original `call_id`. Your application still executes the tool and manages pending work. See [Async tool calling](https://developers.openai.com/api/docs/guides/async-tool-calling) for basic usage and a developer-defined wait-tool pattern.
- **Mid-turn steering:** Send additional user instructions while GPT-6 Astra is working, such as a correction or a change in requirements. Over a WebSocket connection, the Responses API preserves completed work and includes the update in a continuation. See [Mid-turn steering](https://developers.openai.com/api/docs/guides/steering) for the event flow and tool-result handling.
- **Change reasoning mid-conversation while preserving cache:** Add a `configuration_update` input item to increase reasoning effort for difficult work or reduce it for routine follow-ups without rewriting the original prompt prefix. The updated reasoning effort applies until another `configuration_update` input item overrides it. See [Change reasoning mid-conversation](https://developers.openai.com/api/docs/guides/reasoning#change-reasoning-mid-conversation) for examples and compatibility.
- **Misalignment monitoring:** As part of our <a href="https://openai.com/index/path-to-astra/" target="_blank" rel="noopener noreferrer">strengthened safeguards</a> for GPT-6 Astra, our systems asynchronously monitor for misalignment and trigger alerts when necessary. See [Misalignment monitoring](https://developers.openai.com/api/docs/guides/safety-checks/misalignment-monitoring) for more information.
- **Limitations:** GPT-6 Astra does not support the `none` reasoning effort. [Fast mode](https://developers.openai.com/api/docs/guides/fast-mode) is unavailable for GPT-6 Astra with EU data residency.

GPT-6 Astra also supports the existing API capabilities available with GPT-5.6, including [computer use](https://developers.openai.com/api/docs/guides/tools-computer-use), [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [streaming](https://developers.openai.com/api/docs/guides/streaming-responses), [Programmatic Tool Calling](https://developers.openai.com/api/docs/guides/tools-programmatic-tool-calling), [multi-agent orchestration](https://developers.openai.com/api/docs/guides/responses-multi-agent), [prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching), [persisted reasoning](https://developers.openai.com/api/docs/guides/reasoning#preserve-reasoning-across-calls), [compaction](https://developers.openai.com/api/docs/guides/compaction), and [pro mode](https://developers.openai.com/api/docs/guides/reasoning#reasoning-mode).

## Migration quickstart

### Migrate with Codex

Codex can apply the recommended changes in this guide with the <a href="https://github.com/openai/skills/tree/main/skills/.curated/openai-docs" target="_blank" rel="noopener noreferrer">OpenAI Docs skill</a>.

```text
$openai-docs migrate this project to GPT-6 Astra
```

To use this skill in other coding agents, download it from the <a href="https://github.com/openai/skills/tree/main/skills/.curated/openai-docs" target="_blank" rel="noopener noreferrer">OpenAI skills repository</a>.

### Update API and model parameters

Set `model` to `gpt-6-astra`, then check the following:

- **Reasoning effort:** If you currently use `none` or `minimal`, start with `low` and compare results. Otherwise, preserve your current effective [reasoning effort](https://developers.openai.com/api/docs/guides/reasoning#reasoning-effort). Use `reasoning.effort` in Responses or `reasoning_effort` in Chat Completions.
- **Tool calling:** Use the [Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses#migrating-from-chat-completions). GPT-6 Astra supports Chat Completions, but tool calling requires Responses.
- **Unsupported parameters:** Remove `temperature`, `top_p`, and `top_logprobs`. For Chat Completions, also remove `logprobs`. For Responses, remove `message.output_text.logprobs` from `include`.
- **Fast mode:** For EU data residency, use Standard processing. GPT-6 Astra does not support `service_tier: "fast"` or `service_tier: "priority"` with EU data residency. Fast mode for GPT-6 Astra does not include a latency SLA. See [Fast mode compatibility](https://developers.openai.com/api/docs/guides/fast-mode#is-fast-mode-compatible-with-data-residency-zero-data-retention-and-a-baa).
- **Changing reasoning effort:** If your application changes effort between responses, use `configuration_update` items in standard, single-agent requests. Keep request-level `reasoning.effort` unchanged to preserve the prompt prefix for caching. Check the [compatibility limits](https://developers.openai.com/api/docs/guides/reasoning#change-reasoning-mid-conversation) before adopting this feature.
- **Prompt caching:** When migrating from GPT-5.5 or earlier, replace `prompt_cache_retention` with `prompt_cache_options.ttl` set to `"30m"`. Review the [prompt caching changes](https://developers.openai.com/api/docs/guides/prompt-caching#summary-of-model-differences), including cache boundaries and cache-write billing.
- **Unnecessary approval pauses:** If you run into issues where the model keeps asking for approval before proceeding, use the [initiative and follow-through guidance](https://developers.openai.com/api/docs/guides/latest-model/gpt-6-astra.md#initiative-and-follow-through) to prompt for more autonomous execution. See the rest of [Prompting best practices](https://developers.openai.com/api/docs/guides/latest-model/gpt-6-astra.md#prompting-best-practices) for guidance on instruction following, writing style, subagent delegation, and testing.
````

## review-agent

### SKILL.md

Source: `codex-rs/skills/src/assets/samples/review-agent/SKILL.md`, SHA-256 `07079efd0dc76f05fade424e5dfb048dce1de2df7626e1a4f56292a4f3f92228`.

```text
---
name: review-agent
description: Perform a read-only, defect-first review of a specified code change and return every actionable finding. Use when another agent delegates review of uncommitted changes, a base-branch diff, a commit, or custom review instructions.
---

# Review Agent

Inspect the requested target directly and return every finding that the author would likely fix.
Do not modify files, create commits, push branches, post review comments, or delegate the review
to another agent.

## Review the change

1. Read the applicable `AGENTS.md` instructions.
2. Inspect the complete diff for the requested target and enough surrounding code to understand
   each changed path.
3. Identify concrete regressions introduced by the change. Continue through the whole diff after
   finding the first issue.
4. Check the relevant tests and call sites to confirm that each finding is real and actionable.

For a base-branch review, compare the changes that would actually merge rather than diffing
directly against the branch tip. Resolve the comparison ref to the branch's upstream when that
upstream exists and is ahead of the local branch; otherwise use the local branch. Run
`git merge-base HEAD <comparison-ref>`, then inspect `git diff <merge-base-sha>`. If the local
branch cannot be resolved, try its configured upstream explicitly before reporting that the target
is unavailable.

Flag an issue only when all of these are true:

- It affects correctness, security, performance, or maintainability in a meaningful way.
- It is discrete and actionable.
- It was introduced by the reviewed change.
- The affected scenario or call path can be demonstrated from the code.
- The author would probably fix it if they knew about it.

Do not flag speculative concerns, pre-existing problems, intentional behavior changes, or style
nits that do not obscure the code.

## Write the result

Present findings first, ordered by severity. Use one entry per issue in this form:

`[P1] Imperative finding title — path/to/file.rs:line`

Follow the title with one short paragraph explaining the affected scenario and why the behavior is
wrong. Keep the cited range as small as possible and make sure it overlaps the reviewed diff.

Use these priorities:

- `P0`: universal release blocker or critical failure.
- `P1`: urgent defect that should be fixed next.
- `P2`: ordinary defect that should be fixed.
- `P3`: low-impact issue that is still worth fixing.

If there are no qualifying findings, say `No findings.` Do not invent a finding to fill the result.
After the findings, add a brief overall assessment and mention any material test gaps or residual
risks.
```

## skill-creator

### SKILL.md

Source: `codex-rs/skills/src/assets/samples/skill-creator/SKILL.md`, SHA-256 `6656e54755638e8efcf275a472b9672eaa8a9a1b9e59dc210e275b03b59e1e66`.

````text
---
name: skill-creator
description: Create or update a Codex skill with appropriately scoped instructions and any needed supporting resources.
metadata:
  short-description: Create or update a skill
---

# Skill Creator

Create skills that give Codex useful, non-obvious guidance without constraining unrelated work.

## Core Principles

**Assume Codex is already capable.** Include only information that changes its decisions or improves its work. Remove generic advice, repeated instructions, speculative edge cases, and examples that do not materially clarify the task.

**Preserve user intent and scope.** A skill should support the requested task, not replace the user's chosen product, expand the assignment, modify unrelated configuration, or imply permission for additional external actions. Do not turn a particular example, past failure, or personal preference into a universal requirement.

Approval to complete a task does not expand its scope or execution permissions. For retrying or externally mutating workflows, define a stopping condition proportional to the risk.

**Match specificity to the risk.** Give the model room to choose an appropriate approach when multiple approaches are reasonable. Use detailed steps, deterministic scripts, or absolute language only when correctness, safety, permissions, or a genuinely fragile workflow requires them.

For open-ended work, describe the outcome and relevant decision criteria. For workflows with a preferred shape, offer useful examples or configurable scripts. Reserve fixed sequences and narrow parameters for operations where deviation would cause a concrete problem. Preserve non-obvious operational invariants, distinguish actual requirements from optional recommendations or local conventions, and avoid restating policies already enforced elsewhere.

**Keep discovery cheap and precise.** Skill names and descriptions are available before a skill is loaded. Describe the actual capability and when it applies, adding exclusions only when they prevent likely misrouting. Avoid exhaustive capability lists and catchalls that attract unrelated requests.

Keep skills self-contained; refer to another skill or tool only when the requested workflow genuinely requires it and it is available in the target environment. Specialized review, hardening, or audit workflows should apply when requested or genuinely needed, not merely because ordinary work touches the same subject.

**Disclose detail progressively.** Keep shared purpose, essential constraints, and useful routing in `SKILL.md`. Put substantial mode-specific guidance, schemas, examples, or procedures in supporting references and read only the references relevant to the current task. A simple self-contained skill does not need a router or extra files.

## Anatomy of a Skill

Every skill is a folder containing a required `SKILL.md` file and any optional resources its actual workflow needs:

```text
skill-name/
|-- SKILL.md                 Required skill instructions
|   |-- YAML frontmatter     Required name and description
|   `-- Markdown body        Instructions loaded when the skill is used
|-- agents/                  Optional UI metadata and invocation policy
|   `-- openai.yaml
|-- scripts/                 Optional executable helpers
|-- references/              Optional documentation loaded as needed
`-- assets/                  Optional files used in generated output
```

Choose the structure that fits the actual task. Some skills are short and self-contained; others route among operating modes or delegate complex mechanics to scripts. Avoid creating directories, placeholders, examples, or ancillary documentation without a clear use.

### SKILL.md

The YAML frontmatter identifies the skill and determines when it should be considered. Include the required `name` and `description`, and preserve supported optional fields such as existing `metadata` when appropriate.

The Markdown body is loaded only when the skill is used. Put the purpose, essential workflow, real constraints, and useful links there. Keep detailed procedures and examples in supporting references when they are relevant only to particular modes.

Skill information is disclosed in three stages:

1. **Name and description:** Available during skill selection, so keep them concise and discriminating.
2. **SKILL.md body:** Loaded when the skill applies, so keep its instructions relevant to that task.
3. **Supporting resources:** Read or execute only when the current task actually needs them.

The entrypoint should be as short as the task permits while retaining important constraints. A large upper bound is not a target: move conditional detail into references when doing so improves clarity or context use, rather than waiting for the file to become unwieldy.

### Scripts

Use `scripts/` for executable code when the same logic would otherwise be rewritten repeatedly or deterministic execution materially improves reliability.

- **Example:** `scripts/rotate_pdf.py` for a PDF operation that would otherwise require recreating the same code.
- **Useful for:** Repeated transformations, reliable API operations, data processing, and other concrete automation.
- **Validation:** Run new or changed scripts to verify their behavior. Scripts can usually be executed without loading their full implementation into context, although an agent may need to inspect them when patching or adapting them.

### References

Use `references/` for documentation that is needed only in particular contexts.

- **Examples:** `references/schema.md` for database tables, `references/policies.md` for domain rules, `references/api_docs.md` for an API, or separate writing guides for different deliverables.
- **Useful for:** Schemas, API documentation, company policies, format-specific procedures, detailed workflows, and substantial examples.
- **Routing:** Link each reference from `SKILL.md` or another relevant resource and explain when it should be read. Keep information in one place instead of duplicating it across the entrypoint and references.

Keep references focused on maintained, task-specific information that changes the agent's decisions. Avoid copied manuals, exhaustive catalogs, and generic tutorials already available from authoritative sources. Before removing existing resources, inspect their callers and purpose.

For large references, include useful search terms or a short contents section when that makes the needed material easier to find.

### Assets

Use `assets/` for files that belong in generated output rather than in the model's instructions.

- **Examples:** `assets/logo.png`, `assets/slides.pptx`, `assets/font.ttf`, or `assets/frontend-template/`.
- **Useful for:** Templates, images, fonts, icons, boilerplate projects, and other files copied or adapted into the result.
- **Context:** Do not load assets as instructions unless the task requires inspecting them.

### UI Metadata and Invocation Policy

`agents/openai.yaml` can provide UI-facing metadata such as `display_name`, `short_description`, and `default_prompt`, along with invocation policy. When creating or updating those settings, read [references/openai_yaml.md](references/openai_yaml.md) and keep the values consistent with the skill.

Automatic skill selection is allowed by default. Change that default only when the user explicitly requests an explicit-only skill:

```yaml
policy:
  allow_implicit_invocation: false
```

This keeps the skill available when explicitly invoked as `$skill-name` without adding it to the model context automatically. Preserve unrelated existing UI, policy, and dependency fields when updating `agents/openai.yaml`.

The initializer creates this file automatically. For new or interface-only metadata, generate it with:

```bash
scripts/generate_openai_yaml.py <path/to/skill-folder> --interface key=value
```

The generator replaces the entire file. If an existing file contains `policy` or `dependencies`, update only the intended fields in place instead of regenerating it.

Include optional interface fields only when the user provides or requests them.

### What Not to Include

Include files that directly support the skill's work. Avoid adding a `README.md`, installation guide, changelog, duplicated quick reference, or other auxiliary documentation unless a specific task or packaging requirement calls for it.

## Progressive Disclosure in Practice

For a skill with multiple substantial modes, keep the shared guidance and mode-selection criteria in `SKILL.md`. Link each supporting reference where its use becomes relevant. Do not load every reference by default, duplicate reference content in the entrypoint, or add a routing layer when there is nothing meaningful to route.

For example, a deployment skill can keep provider selection in `SKILL.md` and separate provider details:

```text
cloud-deploy/
|-- SKILL.md
`-- references/
    |-- aws.md
    |-- gcp.md
    `-- azure.md
```

When the user chooses AWS, read `references/aws.md`; do not also load the GCP and Azure guides. The same pattern can separate business domains, deliverable types, or other genuinely distinct operating modes.

A short skill can instead route to details only when an advanced operation needs them:

```markdown
## Documents

Handle ordinary edits directly.

- For tracked changes, read [references/redlining.md](references/redlining.md).
- For document internals, read [references/ooxml.md](references/ooxml.md).
```

These examples illustrate options, not a required structure. Choose the organization that makes the skill easier to use without loading irrelevant material.

## Create or Update a Skill

Adapt the work to the request. Creating a complex new skill may involve understanding realistic use cases, choosing supporting resources, initializing files, writing instructions, and validating the result. A narrow update to an existing skill may require only a focused edit and validation.

Ask clarifying questions only when the missing information matters and cannot be reasonably inferred. Respect a user-specified location; otherwise create discoverable skills in `$CODEX_HOME/skills`, or `~/.codex/skills` when `CODEX_HOME` is unset.

Keep automatic skill selection enabled unless the user explicitly requests an explicit-only skill. When the intended invocation mode is genuinely unclear and matters to the requested workflow, ask whether the user wants normal automatic discovery or explicit-only invocation; otherwise preserve the default. Do not infer explicit-only invocation from sensitive operations or required approvals: keep the skill discoverable and require authorization immediately before the actual mutation. Preserve an existing skill's invocation policy unless the user asks to change it.

For a new or substantially revised skill, consider the actual requests it should handle and which reusable resources would improve those tasks:

- A repeated PDF transformation may justify a `scripts/rotate_pdf.py` helper.
- An application-building workflow may benefit from an `assets/frontend-template/` starter.
- A data-analysis skill may need a `references/schema.md` guide to avoid rediscovering table relationships.

Create those resources only when their concrete benefit justifies them. If the user has already explained the task clearly, proceed without requesting additional examples.

### Naming

- Use lowercase letters, digits, and hyphens.
- Keep names under 64 characters and prefer short action-oriented names.
- Namespace by tool or domain when doing so improves discovery.
- Name the skill folder after the skill.

### Initialize a New Skill

For a new skill, use the bundled initializer when it helps create the required files consistently:

```bash
scripts/init_skill.py <skill-name> --path <output-directory> [--resources scripts,references,assets] [--examples]
```

For example:

```bash
scripts/init_skill.py my-skill --path "${CODEX_HOME:-$HOME/.codex}/skills"
scripts/init_skill.py my-skill --path "${CODEX_HOME:-$HOME/.codex}/skills" --resources references
```

Request only the resource directories the skill needs. Use `--examples` only when concrete placeholders would help, and replace or remove them before finishing. Do not initialize an existing skill again.

The initializer creates the skill directory, a concise `SKILL.md` starter, and `agents/openai.yaml`. It creates resource directories and example files only when requested. Pass generated UI values as `--interface key=value` when needed.

### Write the Instructions

The frontmatter `description` should briefly explain what the skill does and when it applies. Include a meaningful boundary when similar requests should not activate the skill.

For example:

```yaml
description: Create or edit Word documents when formatting, tracked changes, or comments require document-specific handling.
```

Put detailed workflows, tool choices, examples, and operating modes in the body or relevant references rather than listing them all in the description. Preserve supported optional frontmatter, such as existing `metadata`, when appropriate.

Write only the instructions needed for another Codex instance to perform the task well. State the desired outcome, non-obvious context, real constraints, and relevant references or tools. Preserve the user's explicit choices and existing authorization boundaries. Avoid prescribing a fixed structure, process, or number of steps when the task does not require one.

### Validate and Iterate

Validate the completed skill with:

```bash
scripts/quick_validate.py <path/to/skill-folder>
```

The validator checks frontmatter, naming, and unfinished scaffold placeholders; it does not prove that the skill makes good decisions. Also check that descriptions remain discriminating, instructions preserve user intent, references are discoverable, and any added scripts actually work.

When testing is warranted, verify observable behavior or meaningful invariants. Avoid tests that merely match generated wording, headings, or regex patterns.

Improve the skill based on real usage or demonstrated failures. Prefer a narrow correction to accumulating universal rules for every observed example.

## Independent Forward-Testing

Use an independent subagent pass when a skill is sufficiently complex or risky that realistic behavioral validation would add meaningful confidence, and when delegation is available and authorized. Ordinary creation or small edits do not automatically require subagents.

Give the evaluating agent a realistic user request, the skill, and the minimum raw artifacts needed to perform the task. Do not provide the intended answer, suspected bug, proposed fix, or prior conclusions unless the evaluation genuinely requires them.

For example:

```text
Use $skill-name at /path/to/skill-name to complete this realistic request.
```

Keep the evaluation scoped to permitted resources and side effects. Use an isolated temporary workspace for generated artifacts so they do not enter the working tree or contaminate later evaluations. Ask for approval when the proposed evaluation would require additional authorization, affect a live production system, or impose substantial time or cost. Review the actual outcome and artifacts, then make only changes supported by the observed behavior.
````

### license.txt

Source: `codex-rs/skills/src/assets/samples/skill-creator/license.txt`, SHA-256 `cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30`.

```text

                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.

      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.

      "Source" form shall mean the preferred form for making modifications,
      including but not limited to software source code, documentation
      source, and configuration files.

      "Object" form shall mean any form resulting from mechanical
      transformation or translation of a Source form, including but
      not limited to compiled object code, generated documentation,
      and conversions to other media types.

      "Work" shall mean the work of authorship, whether in Source or
      Object form, made available under the License, as indicated by a
      copyright notice that is included in or attached to the work
      (an example is provided in the Appendix below).

      "Derivative Works" shall mean any work, whether in Source or Object
      form, that is based on (or derived from) the Work and for which the
      editorial revisions, annotations, elaborations, or other modifications
      represent, as a whole, an original work of authorship. For the purposes
      of this License, Derivative Works shall not include works that remain
      separable from, or merely link (or bind by name) to the interfaces of,
      the Work and Derivative Works thereof.

      "Contribution" shall mean any work of authorship, including
      the original version of the Work and any modifications or additions
      to that Work or Derivative Works thereof, that is intentionally
      submitted to Licensor for inclusion in the Work by the copyright owner
      or by an individual or Legal Entity authorized to submit on behalf of
      the copyright owner. For the purposes of this definition, "submitted"
      means any form of electronic, verbal, or written communication sent
      to the Licensor or its representatives, including but not limited to
      communication on electronic mailing lists, source code control systems,
      and issue tracking systems that are managed by, or on behalf of, the
      Licensor for the purpose of discussing and improving the Work, but
      excluding communication that is conspicuously marked or otherwise
      designated in writing by the copyright owner as "Not a Contribution."

      "Contributor" shall mean Licensor and any individual or Legal Entity
      on behalf of whom a Contribution has been received by Licensor and
      subsequently incorporated within the Work.

   2. Grant of Copyright License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      copyright license to reproduce, prepare Derivative Works of,
      publicly display, publicly perform, sublicense, and distribute the
      Work and such Derivative Works in Source or Object form.

   3. Grant of Patent License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      (except as stated in this section) patent license to make, have made,
      use, offer to sell, sell, import, and otherwise transfer the Work,
      where such license applies only to those patent claims licensable
      by such Contributor that are necessarily infringed by their
      Contribution(s) alone or by combination of their Contribution(s)
      with the Work to which such Contribution(s) was submitted. If You
      institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the Work
      or a Contribution incorporated within the Work constitutes direct
      or contributory patent infringement, then any patent licenses
      granted to You under this License for that Work shall terminate
      as of the date such litigation is filed.

   4. Redistribution. You may reproduce and distribute copies of the
      Work or Derivative Works thereof in any medium, with or without
      modifications, and in Source or Object form, provided that You
      meet the following conditions:

      (a) You must give any other recipients of the Work or
          Derivative Works a copy of this License; and

      (b) You must cause any modified files to carry prominent notices
          stating that You changed the files; and

      (c) You must retain, in the Source form of any Derivative Works
          that You distribute, all copyright, patent, trademark, and
          attribution notices from the Source form of the Work,
          excluding those notices that do not pertain to any part of
          the Derivative Works; and

      (d) If the Work includes a "NOTICE" text file as part of its
          distribution, then any Derivative Works that You distribute must
          include a readable copy of the attribution notices contained
          within such NOTICE file, excluding those notices that do not
          pertain to any part of the Derivative Works, in at least one
          of the following places: within a NOTICE text file distributed
          as part of the Derivative Works; within the Source form or
          documentation, if provided along with the Derivative Works; or,
          within a display generated by the Derivative Works, if and
          wherever such third-party notices normally appear. The contents
          of the NOTICE file are for informational purposes only and
          do not modify the License. You may add Your own attribution
          notices within Derivative Works that You distribute, alongside
          or as an addendum to the NOTICE text from the Work, provided
          that such additional attribution notices cannot be construed
          as modifying the License.

      You may add Your own copyright statement to Your modifications and
      may provide additional or different license terms and conditions
      for use, reproduction, or distribution of Your modifications, or
      for any such Derivative Works as a whole, provided Your use,
      reproduction, and distribution of the Work otherwise complies with
      the conditions stated in this License.

   5. Submission of Contributions. Unless You explicitly state otherwise,
      any Contribution intentionally submitted for inclusion in the Work
      by You to the Licensor shall be under the terms and conditions of
      this License, without any additional terms or conditions.
      Notwithstanding the above, nothing herein shall supersede or modify
      the terms of any separate license agreement you may have executed
      with Licensor regarding such Contributions.

   6. Trademarks. This License does not grant permission to use the trade
      names, trademarks, service marks, or product names of the Licensor,
      except as required for reasonable and customary use in describing the
      origin of the Work and reproducing the content of the NOTICE file.

   7. Disclaimer of Warranty. Unless required by applicable law or
      agreed to in writing, Licensor provides the Work (and each
      Contributor provides its Contributions) on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
      implied, including, without limitation, any warranties or conditions
      of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
      PARTICULAR PURPOSE. You are solely responsible for determining the
      appropriateness of using or redistributing the Work and assume any
      risks associated with Your exercise of permissions under this License.

   8. Limitation of Liability. In no event and under no legal theory,
      whether in tort (including negligence), contract, or otherwise,
      unless required by applicable law (such as deliberate and grossly
      negligent acts) or agreed to in writing, shall any Contributor be
      liable to You for damages, including any direct, indirect, special,
      incidental, or consequential damages of any character arising as a
      result of this License or out of the use or inability to use the
      Work (including but not limited to damages for loss of goodwill,
      work stoppage, computer failure or malfunction, or any and all
      other commercial damages or losses), even if such Contributor
      has been advised of the possibility of such damages.

   9. Accepting Warranty or Additional Liability. While redistributing
      the Work or Derivative Works thereof, You may choose to offer,
      and charge a fee for, acceptance of support, warranty, indemnity,
      or other liability obligations and/or rights consistent with this
      License. However, in accepting such obligations, You may act only
      on Your own behalf and on Your sole responsibility, not on behalf
      of any other Contributor, and only if You agree to indemnify,
      defend, and hold each Contributor harmless for any liability
      incurred by, or claims asserted against, such Contributor by reason
      of your accepting any such warranty or additional liability.

   END OF TERMS AND CONDITIONS

   APPENDIX: How to apply the Apache License to your work.

      To apply the Apache License to your work, attach the following
      boilerplate notice, with the fields enclosed by brackets "[]"
      replaced with your own identifying information. (Don't include
      the brackets!)  The text should be enclosed in the appropriate
      comment syntax for the file format. We also recommend that a
      file or class name and description of purpose be included on the
      same "printed page" as the copyright notice for easier
      identification within third-party archives.

   Copyright [yyyy] [name of copyright owner]

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
```

### references/openai_yaml.md

Source: `codex-rs/skills/src/assets/samples/skill-creator/references/openai_yaml.md`, SHA-256 `ffac39318e408108141d40f820968e59f70434a891694f9bf1d25be8237b150c`.

````text
# openai.yaml fields (full example + descriptions)

`agents/openai.yaml` is an extended, product-specific config intended for the machine/harness to read, not the agent. Other product-specific config can also live in the `agents/` folder.

## Full example

```yaml
interface:
  display_name: "Optional user-facing name"
  short_description: "Optional user-facing description"
  icon_small: "./assets/small-400px.png"
  icon_large: "./assets/large-logo.svg"
  brand_color: "#3B82F6"
  default_prompt: "Optional surrounding prompt to use the skill with"

dependencies:
  tools:
    - type: "mcp"
      value: "github"
      description: "GitHub MCP server"
      transport: "streamable_http"
      url: "https://api.githubcopilot.com/mcp/"

policy:
  allow_implicit_invocation: true
```

## Field descriptions and constraints

Top-level constraints:

- Quote all string values.
- Keep keys unquoted.
- For `interface.default_prompt`: generate a helpful, short (typically 1 sentence) example starting prompt based on the skill. It must explicitly mention the skill as `$skill-name` (e.g., "Use $skill-name-here to draft a concise weekly status update.").

- `interface.display_name`: Human-facing title shown in UI skill lists and chips.
- `interface.short_description`: Human-facing short UI blurb (25–64 chars) for quick scanning.
- `interface.icon_small`: Path to a small icon asset (relative to skill dir). Default to `./assets/` and place icons in the skill's `assets/` folder.
- `interface.icon_large`: Path to a larger logo asset (relative to skill dir). Default to `./assets/` and place icons in the skill's `assets/` folder.
- `interface.brand_color`: Hex color used for UI accents (e.g., badges).
- `interface.default_prompt`: Default prompt snippet inserted when invoking the skill.
- `dependencies.tools[].type`: Dependency category. Only `mcp` is supported for now.
- `dependencies.tools[].value`: Identifier of the tool or dependency.
- `dependencies.tools[].description`: Human-readable explanation of the dependency.
- `dependencies.tools[].transport`: Connection type when `type` is `mcp`.
- `dependencies.tools[].url`: MCP server URL when `type` is `mcp`.
- `policy.allow_implicit_invocation`: When false, the skill is not injected into
  the model context by default, but can still be invoked explicitly via `$skill`.
  Defaults to true.
````

## skill-installer

### SKILL.md

Source: `codex-rs/skills/src/assets/samples/skill-installer/SKILL.md`, SHA-256 `d68b77e5bbb34dedab89d134da52855f140fc4b4299b80104f534e3b9e98f8ee`.

```text
---
name: skill-installer
description: Install Codex skills into $CODEX_HOME/skills from a curated list or a GitHub repo path. Use when a user asks to list installable skills, install a curated skill, or install a skill from another repo (including private repos).
metadata:
  short-description: Install curated skills from openai/skills or other repos
---

# Skill Installer

Helps install skills. By default these are from https://github.com/openai/skills/tree/main/skills/.curated, but users can also provide other locations. Experimental skills live in https://github.com/openai/skills/tree/main/skills/.experimental and can be installed the same way.

Use the helper scripts based on the task:
- List skills when the user asks what is available, or if the user uses this skill without specifying what to do. Default listing is `.curated`, but you can pass `--path skills/.experimental` when they ask about experimental skills.
- Install from the curated list when the user provides a skill name.
- Install from another repo when the user provides a GitHub repo/path (including private repos).

Install skills with the helper scripts.

## Communication

When listing skills, output approximately as follows, depending on the context of the user's request. If they ask about experimental skills, list from `.experimental` instead of `.curated` and label the source accordingly:
"""
Skills from {repo}:
1. skill-1
2. skill-2 (already installed)
3. ...
Which ones would you like installed?
"""

After installing a skill, tell the user it will be available on their next turn.

## Scripts

All of these scripts use network, so when running in the sandbox, request escalation when running them.

- `scripts/list-skills.py` (prints skills list with installed annotations)
- `scripts/list-skills.py --format json`
- Example (experimental list): `scripts/list-skills.py --path skills/.experimental`
- `scripts/install-skill-from-github.py --repo <owner>/<repo> --path <path/to/skill> [<path/to/skill> ...]`
- `scripts/install-skill-from-github.py --url https://github.com/<owner>/<repo>/tree/<ref>/<path>`
- Example (experimental skill): `scripts/install-skill-from-github.py --repo openai/skills --path skills/.experimental/<skill-name>`

## Behavior and Options

- Defaults to direct download for public GitHub repos.
- If download fails with auth/permission errors, falls back to git sparse checkout.
- Aborts if the destination skill directory already exists.
- Installs into `$CODEX_HOME/skills/<skill-name>` (defaults to `~/.codex/skills`).
- Multiple `--path` values install multiple skills in one run, each named from the path basename unless `--name` is supplied.
- Options: `--ref <ref>` (default `main`), `--dest <path>`, `--method auto|download|git`.

## Notes

- Curated listing is fetched from `https://github.com/openai/skills/tree/main/skills/.curated` via the GitHub API. If it is unavailable, explain the error and exit.
- Private GitHub repos can be accessed via existing git credentials or optional `GITHUB_TOKEN`/`GH_TOKEN` for download.
- Git fallback tries HTTPS first, then SSH.
- The skills at https://github.com/openai/skills/tree/main/skills/.system are preinstalled, so no need to help users install those. If they ask, just explain this. If they insist, you can download and overwrite.
- Installed annotations come from `$CODEX_HOME/skills`.
```
