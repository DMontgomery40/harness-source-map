# T3 Code MCP parameter schemas

Release v0.1.6-nightly.20261031.3956, commit `d92c437baa19409f99416a44f748f148f4317c65`. Pinned public source evidence, not observed model delivery. Runtime settings and tool capabilities control activation. Templates retain upstream substitutions; no local values or private sessions are inputs.

## TrimmedString (baseSchemas.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/baseSchemas.ts:14–23](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/baseSchemas.ts#L14-L23) · SHA-256 `27a020b928fade0440348e15aa4e7b44cae8e537d57d235f014bace6de38382a`

```typescript
export const TrimmedString = Schema.String.pipe(
  Schema.decodeTo(
    Schema.String,
    SchemaTransformation.transformEffect({
      decode: (value) => Effect.succeed(trim(value)),
      encode: (value) => Effect.succeed(trim(value)),
    }),
  ),
);
// `make` and encode see untrimmed values; `isNonEmpty` would accept whitespace that encodes to an invalid empty string.
```

## TrimmedNonEmptyString (baseSchemas.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/baseSchemas.ts:29–30](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/baseSchemas.ts#L29-L30) · SHA-256 `857c255676d03a5d4c1e56a6e4c1887367077962dede2a2bb3f777bedc3c3334`

```typescript
export const TrimmedNonEmptyString = TrimmedString.check(isNonBlank);

```

## PROVIDER_SEND_TURN_SUPPORTED_IMAGE_MIME_TYPES (chatAttachment.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/chatAttachment.ts:18–23](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/chatAttachment.ts#L18-L23) · SHA-256 `949db264b547ca4fd3601eb9d371bf8621f8bb17026f2c3fe6b485f6f59c040b`

```typescript
export const PROVIDER_SEND_TURN_SUPPORTED_IMAGE_MIME_TYPES = [
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
```

## NonNegativeInt (baseSchemas.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/baseSchemas.ts:31–31](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/baseSchemas.ts#L31-L31) · SHA-256 `04a08014f9d9268c0dde4115e053b07efe082da1b4c852ea5c683b73c4cb4aa6`

```typescript
export const NonNegativeInt = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0));
```

## PROVIDER_SEND_TURN_MAX_IMAGE_BYTES (chatAttachment.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/chatAttachment.ts:15–15](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/chatAttachment.ts#L15-L15) · SHA-256 `65e0da4fffab30b993d2c62bfeaf8982c28301cf17e777591b0815c42911b9db`

```typescript
export const PROVIDER_SEND_TURN_MAX_IMAGE_BYTES = 10 * 1024 * 1024;
```

## ImageAttachmentCreateUploadUrlInput (assets.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/assets.ts:90–99](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/assets.ts#L90-L99) · SHA-256 `1f35c1b072741933f38b3dbbdcf354997e2e6ea89520e7cb8e78c8210d47d657`

```typescript
const ImageAttachmentCreateUploadUrlInput = Schema.Struct({
  type: Schema.optionalKey(Schema.Literal("image")),
  name: TrimmedNonEmptyString.check(Schema.isMaxLength(255)),
  mimeType: Schema.Literals(PROVIDER_SEND_TURN_SUPPORTED_IMAGE_MIME_TYPES),
  sizeBytes: NonNegativeInt.check(
    Schema.isGreaterThanOrEqualTo(1),
    Schema.isLessThanOrEqualTo(PROVIDER_SEND_TURN_MAX_IMAGE_BYTES),
  ),
});

```

## PROVIDER_SEND_TURN_MAX_FILE_BYTES (chatAttachment.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/chatAttachment.ts:17–17](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/chatAttachment.ts#L17-L17) · SHA-256 `7b336472e9a7228bff608f943906ed19274392fd2fa6412d5aca931532b89fe6`

```typescript
export const PROVIDER_SEND_TURN_MAX_FILE_BYTES = 50 * 1024 * 1024;
```

## FileAttachmentCreateUploadUrlInput (assets.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/assets.ts:100–109](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/assets.ts#L100-L109) · SHA-256 `4511e09b5d158e7391a0b55a157ff2002ed5fe4f7d5f56e2799d490482c8c223`

```typescript
const FileAttachmentCreateUploadUrlInput = Schema.Struct({
  type: Schema.Literal("file"),
  name: TrimmedNonEmptyString.check(Schema.isMaxLength(255)),
  mimeType: TrimmedNonEmptyString.check(Schema.isMaxLength(100)),
  sizeBytes: NonNegativeInt.check(
    Schema.isGreaterThanOrEqualTo(1),
    Schema.isLessThanOrEqualTo(PROVIDER_SEND_TURN_MAX_FILE_BYTES),
  ),
});

```

## AttachmentCreateUploadUrlInput (assets.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/assets.ts:110–113](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/assets.ts#L110-L113) · SHA-256 `f735470e2471a0a31c19eb7aed1aadc7f524ac37d0d3bff28e47903f8d9e20eb`

```typescript
export const AttachmentCreateUploadUrlInput = Schema.Union([
  ImageAttachmentCreateUploadUrlInput,
  FileAttachmentCreateUploadUrlInput,
]);
```

## AttachmentDeleteInput (assets.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/assets.ts:123–125](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/assets.ts#L123-L125) · SHA-256 `10f163bd78bdc020bbedf12540fbcdc841e02892ad3ffbe0dd21b6b8ae01fac8`

```typescript
export const AttachmentDeleteInput = Schema.Struct({
  attachmentId: TrimmedNonEmptyString.check(Schema.isMaxLength(256)),
});
```

## ThreadId (baseSchemas.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/baseSchemas.ts:250–250](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/baseSchemas.ts#L250-L250) · SHA-256 `0433a4dc744a1c3e0fd926488610c88b67459680a10c8e6f4a9acdaaa7f8ecca`

```typescript
export const ThreadId = makeEntityId("ThreadId");
```

## CHAT_ATTACHMENT_ID_MAX_CHARS (chatAttachment.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/chatAttachment.ts:32–33](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/chatAttachment.ts#L32-L33) · SHA-256 `9757be766b5b394619d7399c78cf5720192b070bb0a2a8332f25b5da3de29372`

```typescript
const CHAT_ATTACHMENT_ID_MAX_CHARS = 128;

```

## ChatAttachmentId (chatAttachment.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/chatAttachment.ts:34–37](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/chatAttachment.ts#L34-L37) · SHA-256 `621f1f26c3a4cf46ff29c514d47791666c1b8863ecfb9ba3b561f9479d8544c6`

```typescript
export const ChatAttachmentId = TrimmedNonEmptyString.check(
  Schema.isMaxLength(CHAT_ATTACHMENT_ID_MAX_CHARS),
  Schema.isPattern(/^[a-z0-9_-]+$/i),
);
```

## IsoDateTime (baseSchemas.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/baseSchemas.ts:45–45](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/baseSchemas.ts#L45-L45) · SHA-256 `6fc58c43db789df4b248bd8044e3729748b04f70569ae082d7a75049253ad204`

```typescript
export const IsoDateTime = Schema.String;
```

## SNAP_SHOT_ACCESSIBLE_TEXT_MAX_CHARS (chatAttachment.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/chatAttachment.ts:40–40](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/chatAttachment.ts#L40-L40) · SHA-256 `18699c1e8ec573731f3cd09f4935d64b0904c64a2a5025793c7fb2abb871ed38`

```typescript
export const SNAP_SHOT_ACCESSIBLE_TEXT_MAX_CHARS = 32_000;
```

## PositiveInt (baseSchemas.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/baseSchemas.ts:32–32](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/baseSchemas.ts#L32-L32) · SHA-256 `4cb3d4a5d22965a9fd473090cb79745b9ee90271e866cf2f05f8a9f018a538ee`

```typescript
export const PositiveInt = Schema.Int.check(Schema.isGreaterThanOrEqualTo(1));
```

## SnapShotAccessibilityBounds (chatAttachment.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/chatAttachment.ts:44–50](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/chatAttachment.ts#L44-L50) · SHA-256 `8e4a598c44bcc786035f1d135cb439e835fce76a31530a8b098f8ed870ad7439`

```typescript
const SnapShotAccessibilityBounds = Schema.Struct({
  x: NonNegativeInt,
  y: NonNegativeInt,
  width: PositiveInt,
  height: PositiveInt,
});

```

## SnapShotAccessibilityState (chatAttachment.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/chatAttachment.ts:51–62](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/chatAttachment.ts#L51-L62) · SHA-256 `1bdc8da8c423b7a60533427b27dceb6ad5da02b46b2efd7630a693334c30daa4`

```typescript
const SnapShotAccessibilityState = Schema.Struct({
  active: Schema.optional(Schema.Boolean),
  busy: Schema.optional(Schema.Boolean),
  checked: Schema.optional(Schema.Literals(["on", "off", "mixed"])),
  editable: Schema.optional(Schema.Boolean),
  enabled: Schema.optional(Schema.Boolean),
  expanded: Schema.optional(Schema.Boolean),
  focused: Schema.optional(Schema.Boolean),
  selected: Schema.optional(Schema.Boolean),
  visible: Schema.optional(Schema.Boolean),
});

```

## SnapShotAccessibilityNode (chatAttachment.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/chatAttachment.ts:63–73](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/chatAttachment.ts#L63-L73) · SHA-256 `13bc6a8891d9e6c8f08fb0af400ae40d6ef48aa2866690c9bb2803e5ef0ccc36`

```typescript
export interface SnapShotAccessibilityNode {
  readonly role: string;
  readonly name?: string;
  readonly value?: string;
  readonly description?: string;
  readonly bounds: typeof SnapShotAccessibilityBounds.Type | null;
  readonly state?: typeof SnapShotAccessibilityState.Type;
  readonly actions?: Array<string>;
  readonly children: Array<SnapShotAccessibilityNode>;
}

```

## SnapShotAccessibilityWire (chatAttachment.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/chatAttachment.ts:93–107](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/chatAttachment.ts#L93-L107) · SHA-256 `e116e1384741df31b427c27b7047a12954b0afb986cf7a2fe459443dc09d14c4`

```typescript
const SnapShotAccessibilityWire = Schema.Union([
  Schema.Struct({
    format: Schema.Literal("flat-text"),
    text: TrimmedNonEmptyString.check(Schema.isMaxLength(SNAP_SHOT_ACCESSIBLE_TEXT_MAX_CHARS)),
    truncated: Schema.Boolean,
  }),
  Schema.Struct({
    format: Schema.Literal("element-tree"),
    coordinateSpace: Schema.Literal("captured-image"),
    imageSize: Schema.Struct({ width: PositiveInt, height: PositiveInt }),
    truncated: Schema.Boolean,
    root: SnapShotAccessibilityNode,
  }),
]);

```

## SNAP_SHOT_ACCESSIBILITY_MAX_NODES (chatAttachment.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/chatAttachment.ts:41–41](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/chatAttachment.ts#L41-L41) · SHA-256 `5c55b739ab9dc2b02c98732df30159a8f6faa3dfb79e1f6bc65313e40d847da1`

```typescript
export const SNAP_SHOT_ACCESSIBILITY_MAX_NODES = 10_000;
```

## SNAP_SHOT_ACCESSIBILITY_MAX_SERIALIZED_CHARS (chatAttachment.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/chatAttachment.ts:42–43](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/chatAttachment.ts#L42-L43) · SHA-256 `d1af9a628eaec3837a01e3cac4eb7d6bd44a48c7a469e96a1b767c4e565fa88a`

```typescript
export const SNAP_SHOT_ACCESSIBILITY_MAX_SERIALIZED_CHARS = 32_000;

```

## SnapShotAccessibility (chatAttachment.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/chatAttachment.ts:108–126](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/chatAttachment.ts#L108-L126) · SHA-256 `6e188c9f6ebde6918b563e24a537632877d645b2e0205802c7621061c6f9a3f9`

```typescript
export const SnapShotAccessibility = SnapShotAccessibilityWire.check(
  Schema.makeFilter((accessibility: typeof SnapShotAccessibilityWire.Type) => {
    if (accessibility.format === "flat-text") return undefined;
    let nodes = 0;
    const stack = [accessibility.root];
    while (stack.length > 0) {
      const node = stack.pop()!;
      nodes += 1;
      if (nodes > SNAP_SHOT_ACCESSIBILITY_MAX_NODES) {
        return `Accessibility trees must not exceed ${SNAP_SHOT_ACCESSIBILITY_MAX_NODES} nodes.`;
      }
      stack.push(...node.children);
    }
    return (
      JSON.stringify(accessibility).length <= SNAP_SHOT_ACCESSIBILITY_MAX_SERIALIZED_CHARS ||
      `Accessibility trees must not exceed ${SNAP_SHOT_ACCESSIBILITY_MAX_SERIALIZED_CHARS} serialized characters.`
    );
  }),
);
```

## SnapShotSource (chatAttachment.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/chatAttachment.ts:129–145](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/chatAttachment.ts#L129-L145) · SHA-256 `a185f749c986e6e0b82d085b39bff4fe7c2a93c7421a054b47e2cf373a4f6507`

```typescript
export const SnapShotSource = Schema.Struct({
  kind: Schema.Literal("snap-shot"),
  capturedAt: IsoDateTime,
  appName: TrimmedNonEmptyString.check(Schema.isMaxLength(255)),
  windowTitle: TrimmedString.check(Schema.isMaxLength(1_000)),
  accessibleText: Schema.optional(
    TrimmedNonEmptyString.check(Schema.isMaxLength(SNAP_SHOT_ACCESSIBLE_TEXT_MAX_CHARS)),
  ),
  accessibility: Schema.optional(SnapShotAccessibility),
  appIdentifier: Schema.optional(TrimmedNonEmptyString.check(Schema.isMaxLength(255))),
  appIconDataUrl: Schema.optional(
    TrimmedNonEmptyString.check(
      Schema.isMaxLength(100_000),
      Schema.isPattern(/^data:image\/png;base64,/i),
    ),
  ),
});
```

## ChatImageAttachment (chatAttachment.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/chatAttachment.ts:148–155](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/chatAttachment.ts#L148-L155) · SHA-256 `1868080baf7f57ab036d1c4ae05d14c807e1f40ab1c6fe4f2273b1c2fb95bb80`

```typescript
export const ChatImageAttachment = Schema.Struct({
  type: Schema.Literal("image"),
  id: ChatAttachmentId,
  name: TrimmedNonEmptyString.check(Schema.isMaxLength(255)),
  mimeType: TrimmedNonEmptyString.check(Schema.isMaxLength(100), Schema.isPattern(/^image\//i)),
  sizeBytes: NonNegativeInt.check(Schema.isLessThanOrEqualTo(PROVIDER_SEND_TURN_MAX_IMAGE_BYTES)),
  source: Schema.optional(SnapShotSource),
});
```

## PastedTextAttachmentSource (chatAttachment.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/chatAttachment.ts:158–158](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/chatAttachment.ts#L158-L158) · SHA-256 `9ce4e219af93621e621a894bdd49626fe7805058d3c861eee9fc3ca5c20ef5e2`

```typescript
export const PastedTextAttachmentSource = Schema.TaggedStruct("pasted-text", {});
```

## ChatFileAttachment (chatAttachment.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/chatAttachment.ts:161–172](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/chatAttachment.ts#L161-L172) · SHA-256 `f9fdadea03c0b3cb5274c4670dbc7768702832ca290652c41e5b4dad5dad8dac`

```typescript
export const ChatFileAttachment = Schema.Struct({
  type: Schema.Literal("file"),
  id: ChatAttachmentId,
  name: TrimmedNonEmptyString.check(Schema.isMaxLength(255)),
  mimeType: TrimmedNonEmptyString.check(Schema.isMaxLength(100)),
  sizeBytes: NonNegativeInt.check(
    Schema.isGreaterThanOrEqualTo(1),
    Schema.isLessThanOrEqualTo(PROVIDER_SEND_TURN_MAX_FILE_BYTES),
  ),
  /** Keep path-only so agents inspect selectively without consuming the context folding preserves. */
  source: Schema.optional(PastedTextAttachmentSource),
});
```

## McpAttachmentInput (input.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[apps/server/src/mcp/toolkits/attachment/input.ts:6–9](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/attachment/input.ts#L6-L9) · SHA-256 `289738913279e720dd60da77348974c0af8bb3f275dd7a4facc1558addea3d71`

```typescript
export const McpAttachmentInput = Schema.Union([
  ChatImageAttachment.mapFields(Struct.omit(["source"])),
  ChatFileAttachment,
]);
```

## DeviceId (device.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/device.ts:168–168](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/device.ts#L168-L168) · SHA-256 `0c8e84f53857e2c65776a377fa01089d463c62e6e4abd65004178616bbb5b6f5`

```typescript
export const DeviceId = TrimmedNonEmptyString.check(Schema.isMaxLength(256));
```

## DevicePlatform (device.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/device.ts:7–7](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/device.ts#L7-L7) · SHA-256 `67059cbbb6e3ce0fa0c59042ae5983d4e9643da2121334093776b10dd0ef489b`

```typescript
export const DevicePlatform = Schema.Literals(["ios", "android"]);
```

## DeviceHostId (device.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/device.ts:10–10](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/device.ts#L10-L10) · SHA-256 `6da6440447ca9aca14858adcdb12e5902c7bcc544b4e3626eaec82c8508db009`

```typescript
export const DeviceHostId = TrimmedNonEmptyString.check(Schema.isMaxLength(128));
```

## DeviceToolOpenInput (device.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/device.ts:636–650](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/device.ts#L636-L650) · SHA-256 `29e524304177cc2f874de10531566cc0491ffeb9fd018c475e130c05aabbc997`

```typescript
export const DeviceToolOpenInput = Schema.Struct({
  deviceId: Schema.optional(
    DeviceId.annotate({
      description: "Device id from `device_list`. Default: the booted or last used device.",
    }),
  ),
  platform: Schema.optional(
    DevicePlatform.annotate({
      description: "Needed with no `deviceId` when both platforms exist.",
    }),
  ),
  hostId: Schema.optional(
    DeviceHostId.annotate({ description: "Host from `device_list`. Default local." }),
  ),
});
```

## DeviceToolTargetInput (device.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/device.ts:664–671](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/device.ts#L664-L671) · SHA-256 `58a9ddfd676315d5db301b9548476c8230acc08791281ddbddfd81e5928f46d4`

```typescript
export const DeviceToolTargetInput = Schema.Struct({
  deviceId: Schema.optional(
    DeviceId.annotate({
      description: "Device. Default: the last one opened here.",
    }),
  ),
  hostId: Schema.optional(DeviceHostId),
});
```

## DeviceToolCloseInput (device.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/device.ts:685–697](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/device.ts#L685-L697) · SHA-256 `680f5ed7e88dea4379f3b99904d167973977f732ee91b66f1f20f2cf36f8a15c`

```typescript
export const DeviceToolCloseInput = Schema.Struct({
  deviceId: Schema.optional(
    DeviceId.annotate({
      description: "Device to close. None: close all here.",
    }),
  ),
  hostId: Schema.optional(DeviceHostId),
  shutdown: Schema.optional(
    Schema.Boolean.annotate({
      description: "Also turn it off. Default false.",
    }),
  ),
});
```

## EnvironmentId (baseSchemas.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/baseSchemas.ts:254–254](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/baseSchemas.ts#L254-L254) · SHA-256 `be3e6b8ec15a6566a1d8562d680d74d4979b7cd3b760c409a83d32969bef5f53`

```typescript
export const EnvironmentId = makeEntityId("EnvironmentId");
```

## OrchestratorMcpEnvironmentTarget (orchestratorMcp.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/orchestratorMcp.ts:323–329](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/orchestratorMcp.ts#L323-L329) · SHA-256 `457e3cc335eb3c64b037f1d4e25ad9470d13623abb206cf23a5bda9dfcaed1e0`

```typescript
export const OrchestratorMcpEnvironmentTarget = Schema.optional(
  EnvironmentId.annotate({
    description:
      "Linked environment to act in. Omit for this one. Ids are then that environment's.",
  }),
);

```

## ProviderInstanceId (providerInstance.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/providerInstance.ts:22–22](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/providerInstance.ts#L22-L22) · SHA-256 `3b2fd02b608ab5aab43e93eb95714db7a4a1d6fcbe616ec7e9d7c1e3055e32a9`

```typescript
export const ProviderInstanceId = slugSchema.pipe(Schema.brand("ProviderInstanceId"));
```

## ModelFavorite (settings.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/settings.ts:334–337](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L334-L337) · SHA-256 `12d56fea80cdab4fbb50b0fe832ffb23f873ee7c2ab51ae07010188cdb0c050e`

```typescript
export const ModelFavorite = Schema.Struct({
  provider: ProviderInstanceId,
  model: TrimmedNonEmptyString,
});
```

## ModelFavorites (settings.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/settings.ts:338–338](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L338-L338) · SHA-256 `cc726c6d46e7b98189db28f3aaf5e369f87910eb5876abc2d9649d6580910718`

```typescript
export const ModelFavorites = Schema.Array(ModelFavorite);
```

## ProviderModelPreferences (settings.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/settings.ts:339–345](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L339-L345) · SHA-256 `2273dc2445bc4c2a1bdec435fabff3198987983a718b99ace56cd769a3a4697f`

```typescript
export const ProviderModelPreferences = Schema.Record(
  ProviderInstanceId,
  Schema.Struct({
    hiddenModels: Schema.Array(Schema.String).pipe(Schema.withDecodingDefault(Effect.succeed([]))),
    modelOrder: Schema.Array(Schema.String).pipe(Schema.withDecodingDefault(Effect.succeed([]))),
  }),
);
```

## WorktreeKeepWhen (settings.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/settings.ts:994–998](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L994-L998) · SHA-256 `d5adc25bfec9dce11c2524d3ab8a9a179dc04330fa11c4cb00757d7c35c4b040`

```typescript
export const WorktreeKeepWhen = Schema.Literals([
  "any-local-files",
  "uncommitted-changes",
  "tracked-changes",
]);
```

## StorageRetentionDays (settings.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/settings.ts:987–989](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L987-L989) · SHA-256 `855a3452b328febd56794c98a6891a78aea47066dc586897868594e54207be6b`

```typescript
const StorageRetentionDays = Schema.NullOr(
  Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 3650 })),
);
```

## SettledWorktreeRetentionDays (settings.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/settings.ts:990–993](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L990-L993) · SHA-256 `0fc16cc44528e40fa322a1ec5e60eda34f5ae752e64fb475376569c12f856e24`

```typescript
const SettledWorktreeRetentionDays = Schema.NullOr(
  Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 3650 })),
);

```

## ResponseStreamingMode (settings.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/settings.ts:984–984](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L984-L984) · SHA-256 `0c9f2cc10c7d65ce12510aa7a9404e16474c88cb1ea7d34a8178998158a0d8c1`

```typescript
export const ResponseStreamingMode = Schema.Literals(["turn", "paragraph"]);
```

## ProjectId (baseSchemas.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/baseSchemas.ts:252–252](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/baseSchemas.ts#L252-L252) · SHA-256 `49740fd89f19e2ffc8105be80f2e016c68078192bec37a35457a7744ccc4a856`

```typescript
export const ProjectId = makeEntityId("ProjectId");
```

## ProjectScriptIcon (project.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/project.ts:24–31](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/project.ts#L24-L31) · SHA-256 `df0edf54dc24c59cf3ff695d67f9688dc7135b044e75a82b2e9946a7d0f3f484`

```typescript
export const ProjectScriptIcon = Schema.Literals([
  "play",
  "test",
  "lint",
  "configure",
  "build",
  "debug",
]);
```

## ProjectScript (project.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/project.ts:34–44](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/project.ts#L34-L44) · SHA-256 `3ee18739ed1b023f356cb5db8edb4ace455ea1a4a084ecaf9a32bb7ce2f5de82`

```typescript
export const ProjectScript = Schema.Struct({
  id: TrimmedNonEmptyString,
  name: TrimmedNonEmptyString,
  command: TrimmedNonEmptyString,
  icon: ProjectScriptIcon,
  runOnWorktreeCreate: Schema.Boolean,
  runOnSettle: Schema.optional(Schema.Boolean),
  async: Schema.optional(Schema.Boolean),
  previewUrl: Schema.optional(TrimmedNonEmptyString),
  autoOpenPreview: Schema.optional(Schema.Boolean),
});
```

## ModelSelectionSource (modelSelection.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/modelSelection.ts:15–21](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/modelSelection.ts#L15-L21) · SHA-256 `bf207e31f8069ff6cb51a96cf0bd68e798eaa7bbef389a8954458d61cfc805b7`

```typescript
const ModelSelectionSource = Schema.Struct({
  provider: Schema.optional(Schema.Unknown),
  instanceId: Schema.optional(Schema.Unknown),
  model: Schema.Unknown,
  options: Schema.optional(Schema.Unknown),
});

```

## ProviderOptionSelectionValue (model.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/model.ts:46–46](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/model.ts#L46-L46) · SHA-256 `3dba1cc4753feae7b8e38edb6bc802acf471f815bd7dfa62cd7b31561b398596`

```typescript
export const ProviderOptionSelectionValue = Schema.Union([TrimmedNonEmptyString, Schema.Boolean]);
```

## ProviderOptionSelection (model.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/model.ts:49–52](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/model.ts#L49-L52) · SHA-256 `2633d64b98df9a68c453ca67ee5d627b0c46d738c9edc1e1b12f754f6b4cc790`

```typescript
export const ProviderOptionSelection = Schema.Struct({
  id: TrimmedNonEmptyString,
  value: ProviderOptionSelectionValue,
});
```

## LegacyProviderOptionSelectionsObject (model.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/model.ts:55–56](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/model.ts#L55-L56) · SHA-256 `103dbb6c53f6b491ad9a376070410d78aa72da263fcbcb7e70a34fdff80cb231`

```typescript
const LegacyProviderOptionSelectionsObject = Schema.Record(Schema.String, Schema.Unknown);

```

## ProviderOptionSelectionsFromLegacyObject (model.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/model.ts:57–66](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/model.ts#L57-L66) · SHA-256 `6e4a40a11523a00e0971c732956c60885192e5638a88853f4650994a8d6b5f14`

```typescript
const ProviderOptionSelectionsFromLegacyObject = LegacyProviderOptionSelectionsObject.pipe(
  Schema.decodeTo(
    Schema.Array(ProviderOptionSelection),
    SchemaTransformation.transformEffect({
      decode: (record) => Effect.succeed(coerceLegacyOptionsObjectToArray(record)),
      encode: (selections) => Effect.succeed(canonicalSelectionsToLegacyObject(selections)),
    }),
  ),
);

```

## ProviderOptionSelections (model.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/model.ts:67–70](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/model.ts#L67-L70) · SHA-256 `1c3164df018b3b6e1ee316b63ba5218c63c9cad9d1bbc3bc14e2c63a45e26914`

```typescript
export const ProviderOptionSelections = Schema.Union([
  Schema.Array(ProviderOptionSelection),
  ProviderOptionSelectionsFromLegacyObject,
]);
```

## ModelSelectionWire (modelSelection.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/modelSelection.ts:9–14](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/modelSelection.ts#L9-L14) · SHA-256 `c60057d5599dffd347dd5bd38ad2b10138fba3b1eb2f2fad043a98e356902826`

```typescript
const ModelSelectionWire = Schema.Struct({
  instanceId: ProviderInstanceId,
  model: TrimmedNonEmptyString,
  options: Schema.optionalKey(ProviderOptionSelections),
});

```

## ModelSelection (modelSelection.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/modelSelection.ts:22–50](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/modelSelection.ts#L22-L50) · SHA-256 `565adb23e8af530bb7c0b01a2de34d8289e7252cc05ece9abf6ef4094aec8512`

```typescript
export const ModelSelection = ModelSelectionSource.pipe(
  Schema.decodeTo(
    ModelSelectionWire,
    SchemaTransformation.transformEffect({
      decode: (raw) => {
        const instanceIdSource =
          raw.instanceId !== undefined
            ? raw.instanceId
            : typeof raw.provider === "string"
              ? raw.provider
              : undefined;
        const base: Record<string, unknown> = {
          instanceId: instanceIdSource,
          model: raw.model,
        };
        if (raw.options !== undefined) base.options = raw.options;
        return Effect.succeed(base as typeof ModelSelectionWire.Encoded);
      },
      encode: (value) => {
        const base: Record<string, unknown> = {
          instanceId: value.instanceId,
          model: value.model,
        };
        if (value.options !== undefined) base.options = value.options;
        return Effect.succeed(base as typeof ModelSelectionSource.Encoded);
      },
    }),
  ),
);
```

## RuntimeMode (providerPolicy.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/providerPolicy.ts:25–30](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/providerPolicy.ts#L25-L30) · SHA-256 `a41d8b79b9982ee9b8277e3dea1a2dc2f1418912c6b36ab7433cb3f5251c42ea`

```typescript
export const RuntimeMode = Schema.Literals([
  "approval-required",
  "auto-accept-edits",
  "auto",
  "full-access",
]);
```

## WorktreeCleanupRules (settings.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/settings.ts:1001–1012](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L1001-L1012) · SHA-256 `552d23c0b6c294c8684ad74c8a4a940f287a7b40ead791de7ae7a8136f0419d9`

```typescript
export const WorktreeCleanupRules = Schema.Struct({
  worktreeKeepWhen: WorktreeKeepWhen.pipe(
    Schema.withDecodingDefault(Effect.succeed("uncommitted-changes")),
  ),
  worktreeAfterDays: StorageRetentionDays,
  worktreeSettledAfterDays: SettledWorktreeRetentionDays.pipe(
    Schema.withDecodingDefault(Effect.succeed(null)),
  ),
  worktreeOnMerge: Schema.Boolean,
  worktreeOnDelete: Schema.Boolean,
  worktreeUnchanged: Schema.Boolean,
});
```

## WorktreeCleanup (settings.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/settings.ts:1015–1020](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L1015-L1020) · SHA-256 `84484c9219327853b9325554948653201b342e4a6ffb41f8b42f25db62dc99cf`

```typescript
export const WorktreeCleanup = Schema.NullOr(
  Schema.Union([
    Schema.Struct({ mode: Schema.Literal("off") }),
    Schema.Struct({ mode: Schema.Literal("custom"), rules: WorktreeCleanupRules }),
  ]),
);
```

## ThreadEnvMode (environment.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/environment.ts:49–49](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/environment.ts#L49-L49) · SHA-256 `6acdb0ca464eda8b31929d797b4668fdc40f42fbe4db7817c68d45237dcda6f3`

```typescript
export const ThreadEnvMode = Schema.Literals(["local", "worktree"]);
```

## ForwardCompatibleOptional (baseSchemas.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/baseSchemas.ts:48–63](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/baseSchemas.ts#L48-L63) · SHA-256 `69dda4da2ebd2774b0fa8acff92fc2436751d428ce6ea75d9096823e23839e9d`

```typescript
export const ForwardCompatibleOptional = <Value extends Schema.Top>(value: Value) => {
  const decodeValue = Schema.decodeUnknownOption(value as never);
  return Schema.optionalKey(
    Schema.Unknown.pipe(
      Schema.decodeTo(
        Schema.UndefinedOr(value),
        SchemaTransformation.transform<Value["Encoded"] | undefined, unknown>({
          decode: (raw) =>
            Option.isSome(decodeValue(raw)) ? (raw as Value["Encoded"]) : undefined,
          encode: (raw) => raw,
        }),
      ),
    ),
  );
};

```

## WorktreeSubmodules (environment.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/environment.ts:52–52](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/environment.ts#L52-L52) · SHA-256 `d715da2f0b7ea9586a391251051d91146acbd5d15533ad825f18c79c4592c62e`

```typescript
export const WorktreeSubmodules = Schema.Literals(["recursive", "top-level", "none"]);
```

## SourceControlWritingStyleMode (settings.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/settings.ts:895–899](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L895-L899) · SHA-256 `6faba8da5a2ad7fe349870fd821a522d785b89b9023a6fbdcb00f7e491404d9a`

```typescript
export const SourceControlWritingStyleMode = Schema.Literals([
  "repo_conventions",
  "conventional_commits",
  "custom",
]);
```

## SourceControlWritingStyleSettings (settings.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/settings.ts:902–910](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L902-L910) · SHA-256 `5832cb9d3601f5649460318fe903a41129d5da7bd54bf8c4de4a07b6d83d6211`

```typescript
export const SourceControlWritingStyleSettings = Schema.Struct({
  mode: SourceControlWritingStyleMode.pipe(
    Schema.withDecodingDefault(Effect.succeed("repo_conventions" as const)),
  ),
  customInstructions: TrimmedString.pipe(Schema.withDecodingDefault(Effect.succeed(""))),
  followChangeRequestTemplates: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(true)),
  ),
});
```

## LegacySourceControlWritingStyle (settings.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/settings.ts:913–928](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L913-L928) · SHA-256 `5af5505a2dc53ce5ecdbc302f5187c137a0c12a04cca12f7acab7f2d8befd946`

```typescript
const LegacySourceControlWritingStyle = TrimmedString.pipe(
  Schema.decodeTo(
    Schema.toType(SourceControlWritingStyleSettings),
    SchemaTransformation.transform({
      decode: (value): SourceControlWritingStyleSettings => ({
        mode: value.length > 0 ? "custom" : "repo_conventions",
        customInstructions: value,
        followChangeRequestTemplates: true,
      }),
      encode: (value) => value.customInstructions,
    }),
  ),
);

// The struct member comes first so encoding uses its defaulted fields: the server strips
// default sub-fields before writing settings.json, and a toType target would reject them.
```

## SourceControlWritingStyleSetting (settings.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/settings.ts:929–933](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L929-L933) · SHA-256 `ded0c3000005ce24a1d93aaf47e0d22445c08e3512412f908aec87624abb6419`

```typescript
const SourceControlWritingStyleSetting = Schema.Union([
  SourceControlWritingStyleSettings,
  LegacySourceControlWritingStyle,
]);

```

## BranchNamingMode (settings.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/settings.ts:934–934](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L934-L934) · SHA-256 `9a86e68beee780d0a80d6bcf3f11b1c178dbca5126e792ed42febbf8d5a47945`

```typescript
export const BranchNamingMode = Schema.Literals(["static", "semantic", "custom"]);
```

## PullRequestMergeMethod (pullRequest.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/pullRequest.ts:57–57](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/pullRequest.ts#L57-L57) · SHA-256 `6304a0039f2106efbd21708557e297b12b76dd486ba1d5aecf0ea9541b38987c`

```typescript
export const PullRequestMergeMethod = Schema.Literals(["merge", "squash", "rebase"]);
```

## MIN_SIDEBAR_AUTO_SETTLE_AFTER_DAYS (settings.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/settings.ts:76–76](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L76-L76) · SHA-256 `a69988e30d5097eb6bdab52416841d7ca1e49cb1f6e085514a43052924dfe601`

```typescript
export const MIN_SIDEBAR_AUTO_SETTLE_AFTER_DAYS = 1;
```

## MAX_SIDEBAR_AUTO_SETTLE_AFTER_DAYS (settings.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/settings.ts:77–77](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L77-L77) · SHA-256 `eb4f99feb1e1131a2eac4970d585a84f5342bb796ec28d4eff2dc6c7d9663aaa`

```typescript
export const MAX_SIDEBAR_AUTO_SETTLE_AFTER_DAYS = 90;
```

## SidebarAutoSettleAfterDays (settings.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/settings.ts:78–83](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L78-L83) · SHA-256 `391587dd4a4b1110bd268e7883f4fb36e063a1813bb5fe0a427024e3102d5c22`

```typescript
export const SidebarAutoSettleAfterDays = Schema.Number.check(
  Schema.isBetween({
    minimum: MIN_SIDEBAR_AUTO_SETTLE_AFTER_DAYS,
    maximum: MAX_SIDEBAR_AUTO_SETTLE_AFTER_DAYS,
  }),
);
```

## ProjectProviderInstanceOverride (settings.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/settings.ts:1053–1055](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L1053-L1055) · SHA-256 `5595ce4561060149a80a6eecd19e2ee676d5ba5d2297c3f228b443444f94d85f`

```typescript
export const ProjectProviderInstanceOverride = Schema.Struct({
  enabled: Schema.optionalKey(Schema.Boolean),
});
```

## PROJECT_SCOPED_SERVER_SETTING_KEYS (settings.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/settings.ts:1023–1050](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L1023-L1050) · SHA-256 `c43606b7645c21fe577640e83437bc9a9c2d82cddeb6e34da32f738219d0ae3f`

```typescript
export const PROJECT_SCOPED_SERVER_SETTING_KEYS = [
  "worktreeCleanup",
  "defaultModelSelection",
  "defaultRuntimeMode",
  "defaultThreadEnvMode",
  "newWorktreesStartFromOrigin",
  "worktreeSubmodules",
  "defaultAutoPull",
  "defaultProjectScripts",
  "enableAgentBrowserAccess",
  "enableAgentDeviceAccess",
  "textGenerationModelSelection",
  "threadTitleInstructions",
  "sourceControlWriterModelSelection",
  "reviewGuideModelSelection",
  "reviewGuideInstructions",
  "sourceControlWritingStyle",
  "removeAgentCreditsOnMerge",
  "branchNamingMode",
  "branchNamePrefix",
  "branchNameInstructions",
  "pullRequestMergeMethod",
  "sidebarAutoSettleOnMerge",
  "sidebarAutoSettleAfterDays",
  "sidebarAutoSettleKeepPullRequests",
  "continueThreadsAfterServerUpdate",
  "responseStreamingMode",
] as const;
```

## ProjectScopedServerSettingKey (settings.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/settings.ts:1051–1052](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L1051-L1052) · SHA-256 `79ee4f32b9e4492f87f6168c8c8701dec0825b2259329979a0f3292cfd01196e`

```typescript
export type ProjectScopedServerSettingKey = (typeof PROJECT_SCOPED_SERVER_SETTING_KEYS)[number];

```

## ProjectSettingsOverrides (settings.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/settings.ts:1060–1090](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L1060-L1090) · SHA-256 `5ce09d3e2da95d7c28c6dfa10c4c7923fa1dfd21956f7a137197349add6c881a`

```typescript
export const ProjectSettingsOverrides = Schema.Struct({
  worktreeCleanup: Schema.optionalKey(WorktreeCleanup),
  defaultModelSelection: Schema.optionalKey(Schema.NullOr(ModelSelection)),
  defaultRuntimeMode: Schema.optionalKey(RuntimeMode),
  defaultThreadEnvMode: Schema.optionalKey(ThreadEnvMode),
  newWorktreesStartFromOrigin: Schema.optionalKey(Schema.Boolean),
  worktreeSubmodules: ForwardCompatibleOptional(WorktreeSubmodules),
  defaultAutoPull: Schema.optionalKey(Schema.Boolean),
  defaultProjectScripts: Schema.optionalKey(Schema.Array(ProjectScript)),
  enableAgentBrowserAccess: Schema.optionalKey(Schema.Boolean),
  enableAgentDeviceAccess: Schema.optionalKey(Schema.Boolean),
  textGenerationModelSelection: Schema.optionalKey(ModelSelection),
  threadTitleInstructions: Schema.optionalKey(TrimmedString),
  sourceControlWriterModelSelection: Schema.optionalKey(Schema.NullOr(ModelSelection)),
  reviewGuideModelSelection: Schema.optionalKey(Schema.NullOr(ModelSelection)),
  reviewGuideInstructions: Schema.optionalKey(TrimmedString),
  sourceControlWritingStyle: Schema.optionalKey(SourceControlWritingStyleSetting),
  removeAgentCreditsOnMerge: Schema.optionalKey(Schema.Boolean),
  branchNamingMode: Schema.optionalKey(BranchNamingMode),
  branchNamePrefix: Schema.optionalKey(TrimmedString),
  branchNameInstructions: Schema.optionalKey(TrimmedString),
  pullRequestMergeMethod: Schema.optionalKey(Schema.NullOr(PullRequestMergeMethod)),
  sidebarAutoSettleOnMerge: Schema.optionalKey(Schema.Boolean),
  sidebarAutoSettleAfterDays: Schema.optionalKey(Schema.NullOr(SidebarAutoSettleAfterDays)),
  sidebarAutoSettleKeepPullRequests: Schema.optionalKey(Schema.Boolean),
  continueThreadsAfterServerUpdate: Schema.optionalKey(Schema.Boolean),
  responseStreamingMode: Schema.optionalKey(ResponseStreamingMode),
  providerInstances: Schema.optionalKey(
    Schema.Record(ProviderInstanceId, ProjectProviderInstanceOverride),
  ),
} satisfies Record<ProjectScopedServerSettingKey | "providerInstances", unknown>);
```

## ConfiguredDeviceHostId (device.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/device.ts:16–20](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/device.ts#L16-L20) · SHA-256 `e5215e19d323287b8e14b28c8339603c2d36af85b74988307af6dcf280f7058f`

```typescript
const ConfiguredDeviceHostId = DeviceHostId.check(
  Schema.isPattern(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/),
  Schema.makeFilter((id) => id !== "local" || "The local host id is reserved."),
);

```

## SshDeviceHostConfig (device.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/device.ts:21–29](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/device.ts#L21-L29) · SHA-256 `7526e4835d77ea7fc8601df5d30251225357225aeab89f92039117f060a7ee93`

```typescript
export const SshDeviceHostConfig = Schema.Struct({
  // Hosts saved before EAS hosts existed carry no kind.
  kind: Schema.Literal("ssh").pipe(Schema.withDecodingDefaultKey(Effect.succeed("ssh" as const))),
  id: ConfiguredDeviceHostId,
  label: TrimmedNonEmptyString,
  target: TrimmedNonEmptyString.check(Schema.isPattern(/^[^\s-][^\s]*$/)),
  identityFile: Schema.optional(TrimmedNonEmptyString),
  port: Schema.optional(Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 65535 }))),
});
```

## SshDeviceHostConfigs (device.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/device.ts:104–110](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/device.ts#L104-L110) · SHA-256 `f80113ff1a7aa41b4599989a75d0f47a9ba1aa7d8d7681e47cd08b70bdd0f381`

```typescript
export const SshDeviceHostConfigs = Schema.Array(SshDeviceHostConfig).check(uniqueHostIds);

/**
 * Kept apart from the SSH hosts in settings: servers and clients from before
 * EAS hosts decode `deviceHosts` as SSH hosts and would reject the whole file
 * or snapshot over one EAS entry.
 */
```

## EasDeviceHostConfig (device.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/device.ts:36–68](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/device.ts#L36-L68) · SHA-256 `f5d37c3d05199ddcdb32a1e466772cf101333e6095d5bbc949f0b60e903d302b`

```typescript
export const EasDeviceHostConfig = Schema.Struct({
  kind: Schema.Literal("eas"),
  id: ConfiguredDeviceHostId,
  label: TrimmedNonEmptyString,
  /** EAS project that sessions run under, when the project's app config does not name one. */
  appId: Schema.optional(TrimmedNonEmptyString),
  /**
   * Expo access token, kept in the secret store. When empty the server uses
   * EXPO_TOKEN, then the `eas login` session. This is `secretSetting` from
   * settings.ts, which imports this module.
   */
  accessToken: TrimmedString.pipe(
    Schema.withDecodingDefaultKey(Effect.succeed("")),
    Schema.annotateKey({ settingsSecret: true }),
  ),
  /** EAS allows at most 40 minutes on free accounts and 115 on paid ones. */
  maxSessionMinutes: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 115 })).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(30)),
  ),
  idleMinutes: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 60 })).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(10)),
  ),
  maxConcurrentSessions: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 20 })).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(2)),
  ),
}).check(
  // EAS requires the idle limit to be smaller than the session limit.
  Schema.makeFilter(
    (host: { readonly idleMinutes: number; readonly maxSessionMinutes: number }) =>
      host.idleMinutes < host.maxSessionMinutes ||
      "Idle minutes must be smaller than session minutes.",
  ),
);
```

## EasDeviceHostConfigs (device.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/device.ts:111–113](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/device.ts#L111-L113) · SHA-256 `611e8737e6824f96241f42624412673689e8424044b3bc5043c82c31b5e0cd4f`

```typescript
export const EasDeviceHostConfigs = Schema.Array(EasDeviceHostConfig).check(uniqueHostIds);

/** Kept apart from the other host lists for the same reason as EAS hosts. */
```

## SimlockDeviceHostConfig (device.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/device.ts:75–93](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/device.ts#L75-L93) · SHA-256 `adf3fa32b3e48e3b6a26f599ce05e45fa142f1c999354650557404e65654500c`

```typescript
export const SimlockDeviceHostConfig = Schema.Struct({
  kind: Schema.Literal("simlock"),
  id: ConfiguredDeviceHostId,
  label: TrimmedNonEmptyString,
  /** The gateway's origin, such as https://gateway.example.ts.net:4700. */
  gatewayUrl: TrimmedNonEmptyString.check(Schema.isPattern(/^https?:\/\/[^\s/]+\/?$/)),
  /** Leases, drives, watches, and takes input on its own leases. Kept in the secret store. */
  agentToken: TrimmedString.pipe(
    Schema.withDecodingDefaultKey(Effect.succeed("")),
    Schema.annotateKey({ settingsSecret: true }),
  ),
  maxLeases: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 20 })).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(2)),
  ),
  /** A lease the Device panel keeps alive ends this long after it started. */
  maxLeaseMinutes: Schema.Int.check(Schema.isBetween({ minimum: 5, maximum: 240 })).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(60)),
  ),
});
```

## SimlockDeviceHostConfigs (device.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/device.ts:114–115](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/device.ts#L114-L115) · SHA-256 `43ea7318a01b77cff2fca985d10706a68c551b31442db71796c179963493c079`

```typescript
export const SimlockDeviceHostConfigs = Schema.Array(SimlockDeviceHostConfig).check(uniqueHostIds);

```

## IDLE_COMPACTION_MODES (settings.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/settings.ts:688–692](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L688-L692) · SHA-256 `702994c39065697d60260bf50d1b7117a829e25236197e96744952b0c67e3771`

```typescript
export const IDLE_COMPACTION_MODES = [
  { value: "onReturn", label: "When you return" },
  { value: "beforeCacheExpires", label: "Before the cache expires (beta)" },
  { value: "off", label: "Never" },
] as const;
```

## IdleCompactionMode (settings.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/settings.ts:693–693](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L693-L693) · SHA-256 `8c5f0327aae1cfe7b95905328706b122cbc6b065196e42bff2dd2452d216f39b`

```typescript
export const IdleCompactionMode = Schema.Literals(IDLE_COMPACTION_MODES.map((mode) => mode.value));
```

## LegacyCompactIdleThreads (settings.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/settings.ts:698–699](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L698-L699) · SHA-256 `ee3a32a6c11b6553245c7e1ad14cdb8f1a446906cf1dae877015a24bdd655c91`

```typescript
const LegacyCompactIdleThreads = Schema.Union([Schema.Boolean, IdleCompactionMode]);

```

## MAX_SNOOZE_PRESET_MINUTES (settings.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/settings.ts:87–87](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L87-L87) · SHA-256 `c4a31e5070d00ef8a6d3c62dbc8b06ef816d5f2042ad234adf71c5c8140de92c`

```typescript
export const MAX_SNOOZE_PRESET_MINUTES = 30 * 24 * 60;
```

## SnoozePresetDay (settings.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/settings.ts:89–99](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L89-L99) · SHA-256 `db8a7b5c23a0c7761cb1fa335f77e5f316e1ebab5c36c89216d8da5a26cbe32a`

```typescript
export const SnoozePresetDay = Schema.Literals([
  "today",
  "tomorrow",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);
```

## SnoozePresetSetting (settings.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/settings.ts:102–112](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L102-L112) · SHA-256 `00542676ce4f01b00852768362ca797f97a1752e59bc434d683489bc3d196075`

```typescript
export const SnoozePresetSetting = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("after"),
    minutes: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: MAX_SNOOZE_PRESET_MINUTES })),
  }),
  Schema.Struct({
    kind: Schema.Literal("at"),
    day: SnoozePresetDay,
    time: Schema.String.check(Schema.isPattern(/^([01]\d|2[0-3]):[0-5]\d$/)),
  }),
]);
```

## MAX_SNOOZE_PRESETS (settings.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/settings.ts:88–88](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L88-L88) · SHA-256 `d10e36ec18d67e4536c394adc55c8b9edf5f82ee183eeeff75ea5ff574c9d115`

```typescript
export const MAX_SNOOZE_PRESETS = 8;
```

## SnoozePresetSettings (settings.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/settings.ts:114–116](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L114-L116) · SHA-256 `d06c8ac032bc40485387576dd2efcf91026d6aad80a13bbd5bde6b9546a11696`

```typescript
export const SnoozePresetSettings = Schema.Array(SnoozePresetSetting).check(
  Schema.isMaxLength(MAX_SNOOZE_PRESETS),
);
```

## BackgroundActivityProfileSelection (settings.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/settings.ts:954–959](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L954-L959) · SHA-256 `06e1f30920e533b91d09495c53b39f219f2ce7ab14ff517be30ad4eed8c90e09`

```typescript
export const BackgroundActivityProfileSelection = Schema.Literals([
  "balanced",
  "performance",
  "battery-saver",
  "custom",
]);
```

## BackgroundActivityProfile (settings.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/settings.ts:946–950](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L946-L950) · SHA-256 `8e11f1de9938c4ac060001c1afb018ec0b774275d475c7ca67f5e074f0d7a291`

```typescript
export const BackgroundActivityProfile = Schema.Literals([
  "balanced",
  "performance",
  "battery-saver",
]);
```

## BackgroundActivityOverrides (settings.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/settings.ts:962–971](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L962-L971) · SHA-256 `28b69c25a309d31386681b194d6557f940af97f35c2d0f2decf4e6465acbc613`

```typescript
export const BackgroundActivityOverrides = Schema.Struct({
  automaticGitFetchInterval: Schema.optionalKey(Schema.DurationFromMillis),
  providerHealthRefreshInterval: Schema.optionalKey(Schema.DurationFromMillis),
  hostPowerMonitorActiveInterval: Schema.optionalKey(Schema.DurationFromMillis),
  hostPowerMonitorIdleInterval: Schema.optionalKey(Schema.DurationFromMillis),
  pauseWhenHostLocked: Schema.optionalKey(Schema.Boolean),
  pauseWhenHostLowPower: Schema.optionalKey(Schema.Boolean),
  pauseWhenClientLowPower: Schema.optionalKey(Schema.Boolean),
  pauseWhenOnBattery: Schema.optionalKey(Schema.Boolean),
});
```

## ENVIRONMENT_MACHINE_KINDS (environment.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/environment.ts:29–37](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/environment.ts#L29-L37) · SHA-256 `7e361a56ffcb5080128e8cf5989fdeeced49eacbf9326cccb6a131ac37080599`

```typescript
export const ENVIRONMENT_MACHINE_KINDS = [
  "server",
  "cloud",
  "linux",
  "desktop",
  "laptop",
  "mac-mini",
  "mac-studio",
] as const;
```

## EnvironmentMachineKind (environment.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/environment.ts:38–38](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/environment.ts#L38-L38) · SHA-256 `d8f0e12e45207d08d3f49ed0e7fc406ddbaa540b15fb4617065188698d0dd8e9`

```typescript
export const EnvironmentMachineKind = Schema.Literals(ENVIRONMENT_MACHINE_KINDS);
```

## ModelSelectionPatch (settings.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/settings.ts:1515–1520](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L1515-L1520) · SHA-256 `2b332e4f717e07b9945304700f48e9e95f383dfa43de8eda10b916d50ad6480d`

```typescript
const ModelSelectionPatch = Schema.Struct({
  instanceId: Schema.optionalKey(ProviderInstanceId),
  model: Schema.optionalKey(TrimmedNonEmptyString),
  options: Schema.optionalKey(ProviderOptionSelections),
});

```

## SourceControlHostSettings (settings.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/settings.ts:885–885](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L885-L885) · SHA-256 `1447984008e0b92399d3c71b5133266d14103f3848ca82b165b96256b7af660c`

```typescript
export const SourceControlHostSettings = Schema.Record(Schema.String, Schema.Unknown);
```

## ProviderDriverKind (providerInstance.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/providerInstance.ts:17–17](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/providerInstance.ts#L17-L17) · SHA-256 `720e3b19d47cae7713d7d3da59725b4d7f07cfc486436b833683967a6a7ee4b9`

```typescript
export const ProviderDriverKind = slugSchema.pipe(Schema.brand("ProviderDriverKind"));
```

## ENVIRONMENT_VARIABLE_NAME_MAX_CHARS (providerInstance.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/providerInstance.ts:9–9](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/providerInstance.ts#L9-L9) · SHA-256 `1f79d6c09ab96fba1378ba59d6a192a5e5a1cc7e9e1096e442968401aeb6613f`

```typescript
const ENVIRONMENT_VARIABLE_NAME_MAX_CHARS = 128;
```

## ENVIRONMENT_VARIABLE_NAME_PATTERN (providerInstance.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/providerInstance.ts:10–11](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/providerInstance.ts#L10-L11) · SHA-256 `6e68105a4a8687451372fa99763f6e18cd82133f4de1596638a2c395e05a4147`

```typescript
const ENVIRONMENT_VARIABLE_NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

```

## ProviderInstanceEnvironmentVariableName (providerInstance.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/providerInstance.ts:25–28](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/providerInstance.ts#L25-L28) · SHA-256 `6eb2eedd96006f46d11c7265f513d5c4fab97d8efb21866f72670f21621339b7`

```typescript
export const ProviderInstanceEnvironmentVariableName = TrimmedNonEmptyString.check(
  Schema.isMaxLength(ENVIRONMENT_VARIABLE_NAME_MAX_CHARS),
  Schema.isPattern(ENVIRONMENT_VARIABLE_NAME_PATTERN),
);
```

## SecretProviderSlug (secretReference.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/secretReference.ts:8–12](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/secretReference.ts#L8-L12) · SHA-256 `9a16ccbcfb638fff170ceb4378bd43da9e307cbc2dc1f51aa54e696f5f7bebef`

```typescript
export const SecretProviderSlug = TrimmedNonEmptyString.check(
  Schema.isMaxLength(64),
  Schema.isPattern(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/),
);

```

## SecretProviderId (secretReference.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/secretReference.ts:13–13](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/secretReference.ts#L13-L13) · SHA-256 `96b2c20d27438ba7316a536fd555a150af4053b8f3a95e036b6d27a09b1b2ae0`

```typescript
export const SecretProviderId = SecretProviderSlug.pipe(Schema.brand("SecretProviderId"));
```

## SecretReferencePath (secretReference.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/secretReference.ts:17–22](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/secretReference.ts#L17-L22) · SHA-256 `3df1e716bd58879275434eb906912e65e8d7ac81ffe2db331719ff773ebd4a18`

```typescript
export const SecretReferencePath = TrimmedNonEmptyString.check(
  Schema.isMaxLength(1024),
  Schema.isPattern(/^[^\r\n]+$/),
);

/** Points at a secret held by a configured secret provider; the secret itself is never stored. */
```

## SecretReference (secretReference.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/secretReference.ts:23–26](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/secretReference.ts#L23-L26) · SHA-256 `62dbb34713100b2aa37ba1712ced6e92efaac1743b88bc294801663c342e6da5`

```typescript
export const SecretReference = Schema.Struct({
  provider: SecretProviderId,
  reference: SecretReferencePath,
});
```

## StoredProviderInstanceEnvironmentVariable (providerInstance.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/providerInstance.ts:40–47](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/providerInstance.ts#L40-L47) · SHA-256 `cf3f9a1e5ecf5571114c84c644aa456659c1d04a8dd1973d0d88e8192254e3c8`

```typescript
const StoredProviderInstanceEnvironmentVariable = Schema.Struct({
  name: ProviderInstanceEnvironmentVariableName,
  value: Schema.String.pipe(Schema.withDecodingDefault(Effect.succeed(""))),
  sensitive: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(false))),
  valueRedacted: Schema.optionalKey(Schema.Boolean),
  secret: Schema.optionalKey(SecretReference),
});

```

## ProviderInstanceEnvironmentVariableValue (providerInstance.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/providerInstance.ts:32–39](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/providerInstance.ts#L32-L39) · SHA-256 `8ee12271ced6ede0d3fb6fda5f38fb4f51126dcda04324aa466ded015b5360be`

```typescript
const ProviderInstanceEnvironmentVariableValue = Schema.Struct({
  name: ProviderInstanceEnvironmentVariableName,
  value: Schema.Union([Schema.String, SecretReference]),
  sensitive: Schema.Boolean,
  valueRedacted: Schema.optionalKey(Schema.Boolean),
});

// A reference is encoded beside an empty value so older servers and clients still decode it.
```

## ProviderInstanceEnvironmentVariable (providerInstance.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/providerInstance.ts:48–63](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/providerInstance.ts#L48-L63) · SHA-256 `81f58db9b4ef992b04c16628bc5286dbc2ee8ca8df4e38d251f1bfe49003a5fb`

```typescript
export const ProviderInstanceEnvironmentVariable = StoredProviderInstanceEnvironmentVariable.pipe(
  Schema.decodeTo(
    Schema.toType(ProviderInstanceEnvironmentVariableValue),
    SchemaTransformation.transform<
      typeof ProviderInstanceEnvironmentVariableValue.Type,
      typeof StoredProviderInstanceEnvironmentVariable.Type
    >({
      decode: ({ secret, ...variable }) =>
        secret === undefined ? variable : { ...variable, value: secret },
      encode: ({ value, ...variable }) =>
        typeof value === "string"
          ? { ...variable, value }
          : { ...variable, value: "", secret: value },
    }),
  ),
);
```

## ProviderInstanceEnvironment (providerInstance.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/providerInstance.ts:66–66](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/providerInstance.ts#L66-L66) · SHA-256 `2d180fc040efa3736475f18ff502b72821b23938e7fb9a723784736997d79e27`

```typescript
export const ProviderInstanceEnvironment = Schema.Array(ProviderInstanceEnvironmentVariable);
```

## ProviderInstanceConfig (providerInstance.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/providerInstance.ts:75–82](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/providerInstance.ts#L75-L82) · SHA-256 `b18c44901637197c1e7de73a556f54e223bc3bd47827d2111338c8f44c948252`

```typescript
export const ProviderInstanceConfig = Schema.Struct({
  driver: ProviderDriverKind,
  displayName: Schema.optional(TrimmedNonEmptyString),
  accentColor: Schema.optional(TrimmedNonEmptyString),
  environment: Schema.optionalKey(ProviderInstanceEnvironment),
  enabled: Schema.optionalKey(Schema.Boolean),
  config: Schema.optionalKey(Schema.Unknown),
});
```

## UsageLimitSourceId (usageLimitSourceId.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/usageLimitSourceId.ts:4–4](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/usageLimitSourceId.ts#L4-L4) · SHA-256 `bcbd4761658e190cdf66e630f6b142a6172266483397f9ff34f7b921e76acdab`

```typescript
export const UsageLimitSourceId = Schema.String.pipe(Schema.brand("UsageLimitSourceId"));
```

## UsageLimitSourceConfig (settings.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/settings.ts:856–862](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L856-L862) · SHA-256 `e0b25caa8d842d73f083e2e669694fb667baebcd3ad8c96ec5d1657eba707ad4`

```typescript
export const UsageLimitSourceConfig = Schema.Struct({
  kind: Schema.Literal("cliproxy"),
  label: Schema.optional(TrimmedNonEmptyString),
  url: TrimmedNonEmptyString,
  managementKey: TrimmedString.pipe(Schema.withDecodingDefault(Effect.succeed("")), secretSetting),
  enabled: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(true))),
});
```

## SecretProviderKind (settings.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/settings.ts:865–865](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L865-L865) · SHA-256 `607befb2a915f2f506b55ab20f771ea0e8998db47370d9d17156de2c8d20e870`

```typescript
export const SecretProviderKind = SecretProviderSlug.pipe(Schema.brand("SecretProviderKind"));
```

## SecretProviderConfig (settings.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/settings.ts:871–875](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L871-L875) · SHA-256 `ef9a91143f4cc99f244d95f9b645959d50978a65e92c3a564795ac45511284c4`

```typescript
export const SecretProviderConfig = Schema.Struct({
  kind: SecretProviderKind,
  label: TrimmedNonEmptyString,
  config: Schema.optionalKey(Schema.Unknown),
});
```

## SecretProviderLabel (settings.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/settings.ts:868–870](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L868-L870) · SHA-256 `c73f50124d722c947217acdc54544059feea15bc9a375f3f11fc612a7b44438d`

```typescript
export const SecretProviderLabel = TrimmedNonEmptyString.check(Schema.isMaxLength(64));

/** Kinds decode their own config; unknown-kind envelopes round-trip verbatim across versions. */
```

## SecretProviderConfigWrite (settings.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/settings.ts:880–884](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L880-L884) · SHA-256 `4bb728c6124d3f4c47a245fe5ededdd036edfa07d1c62f886d47a4111cc21571`

```typescript
const SecretProviderConfigWrite = Schema.Struct({
  ...SecretProviderConfig.fields,
  label: SecretProviderLabel,
});

```

## UsageModelTokenPrice (settings.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/settings.ts:530–535](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L530-L535) · SHA-256 `3e47fd81280203bef43de0da66077d6fa3857035b1683a6464efe53d1055a0e9`

```typescript
const UsageModelTokenPrice = Schema.Number.check(
  Schema.isFinite(),
  Schema.isGreaterThanOrEqualTo(0),
);

/** Omitted cache rates use the input rate. */
```

## UsageModelPriceOverride (settings.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/settings.ts:536–541](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L536-L541) · SHA-256 `0443e68de21e564fc86e2ed14c115ce88008cc69945dfc8009646041d035114d`

```typescript
export const UsageModelPriceOverride = Schema.Struct({
  inputCostPerMillionTokens: UsageModelTokenPrice,
  outputCostPerMillionTokens: UsageModelTokenPrice,
  cacheReadCostPerMillionTokens: Schema.optionalKey(UsageModelTokenPrice),
  cacheWriteCostPerMillionTokens: Schema.optionalKey(UsageModelTokenPrice),
});
```

## ServerSettingsPatch (settings.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/settings.ts:1521–1681](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/settings.ts#L1521-L1681) · SHA-256 `00d3faa0f5971696506f5d6c9c91ddc44d6b456583caea0eb0568680f11230c5`

```typescript
export const ServerSettingsPatch = Schema.Struct({
  setModelFavorites: Schema.optionalKey(
    Schema.Array(Schema.Struct({ ...ModelFavorite.fields, favorite: Schema.Boolean })),
  ),
  setModelsHidden: Schema.optionalKey(
    Schema.Array(Schema.Struct({ ...ModelFavorite.fields, hidden: Schema.Boolean })),
  ),
  setProviderModelOrder: Schema.optionalKey(
    Schema.Struct({ provider: ProviderInstanceId, modelOrder: Schema.Array(TrimmedString) }),
  ),
  favorites: Schema.optionalKey(ModelFavorites),
  providerModelPreferences: Schema.optionalKey(ProviderModelPreferences),
  // Applied under the settings service's write lock, only while still unset.
  migrateModelPreferences: Schema.optionalKey(
    Schema.Struct({
      favorites: Schema.optionalKey(ModelFavorites),
      providerModelPreferences: Schema.optionalKey(ProviderModelPreferences),
    }),
  ),
  worktreeCleanup: Schema.optionalKey(
    Schema.NullOr(
      Schema.Union([
        Schema.Struct({ mode: Schema.Literal("off") }),
        Schema.Struct({
          mode: Schema.Literal("custom"),
          rules: Schema.Struct({
            worktreeKeepWhen: Schema.optionalKey(WorktreeKeepWhen),
            worktreeAfterDays: Schema.optionalKey(StorageRetentionDays),
            worktreeSettledAfterDays: Schema.optionalKey(SettledWorktreeRetentionDays),
            worktreeOnMerge: Schema.optionalKey(Schema.Boolean),
            worktreeOnDelete: Schema.optionalKey(Schema.Boolean),
            worktreeUnchanged: Schema.optionalKey(Schema.Boolean),
          }),
        }),
      ]),
    ),
  ),
  storageCleanup: Schema.optionalKey(
    Schema.Struct({
      worktreeKeepWhen: Schema.optionalKey(WorktreeKeepWhen),
      worktreeAfterDays: Schema.optionalKey(StorageRetentionDays),
      worktreeSettledAfterDays: Schema.optionalKey(SettledWorktreeRetentionDays),
      worktreeOnMerge: Schema.optionalKey(Schema.Boolean),
      worktreeOnDelete: Schema.optionalKey(Schema.Boolean),
      worktreeUnchanged: Schema.optionalKey(Schema.Boolean),
      browserArtifactsAfterDays: Schema.optionalKey(StorageRetentionDays),
      logsAfterDays: Schema.optionalKey(StorageRetentionDays),
    }),
  ),
  worktreesDirectory: Schema.optionalKey(TrimmedString),
  responseStreamingMode: Schema.optionalKey(ResponseStreamingMode),
  enableProviderUpdateChecks: Schema.optionalKey(Schema.Boolean),
  continueThreadsAfterServerUpdate: Schema.optionalKey(Schema.Boolean),
  enableAgentBrowserAccess: Schema.optionalKey(Schema.Boolean),
  projectAgentBrowserAccessOverrides: Schema.optionalKey(
    Schema.Record(ProjectId, Schema.NullOr(Schema.Boolean)),
  ),
  defaultAutoPull: Schema.optionalKey(Schema.Boolean),
  defaultProjectScripts: Schema.optionalKey(Schema.Array(ProjectScript)),
  projectScriptOverrides: Schema.optionalKey(
    Schema.Record(ProjectId, Schema.NullOr(Schema.Array(ProjectScript))),
  ),
  projectAutoPullOverrides: Schema.optionalKey(
    Schema.Record(ProjectId, Schema.NullOr(Schema.Boolean)),
  ),
  defaultModelSelection: Schema.optionalKey(Schema.NullOr(ModelSelection)),
  defaultRuntimeMode: Schema.optionalKey(RuntimeMode),
  fallbackModelSelection: Schema.optionalKey(Schema.NullOr(ModelSelection)),
  /** Replaces each project's override set; null removes it. Omitted providerInstances retains its stored value. */
  projectSettingsOverrides: Schema.optionalKey(
    Schema.Record(
      ProjectId,
      Schema.NullOr(
        keepUnknownOverrideKeys(
          Schema.Struct({
            ...ProjectSettingsOverrides.fields,
            sourceControlWritingStyle: Schema.optionalKey(SourceControlWritingStyleSettings),
          }),
        ),
      ),
    ),
  ),
  enableAgentDeviceAccess: Schema.optionalKey(Schema.Boolean),
  enableDeviceSupport: Schema.optionalKey(Schema.Boolean),
  deviceOnboardingCompleted: Schema.optionalKey(Schema.Boolean),
  deviceHosts: Schema.optionalKey(SshDeviceHostConfigs),
  easDeviceHosts: Schema.optionalKey(EasDeviceHostConfigs),
  simlockDeviceHosts: Schema.optionalKey(SimlockDeviceHostConfigs),
  simlockDeviceHostsEnabled: Schema.optionalKey(Schema.Boolean),
  sidebarAutoSettleAfterDays: Schema.optionalKey(Schema.NullOr(SidebarAutoSettleAfterDays)),
  compactIdleThreads: Schema.optionalKey(LegacyCompactIdleThreads),
  idleCompaction: Schema.optionalKey(IdleCompactionMode),
  sidebarAutoSettleKeepPullRequests: Schema.optionalKey(Schema.Boolean),
  sidebarAutoSettleOnMerge: Schema.optionalKey(Schema.Boolean),
  autoResumeLimitedThreads: Schema.optionalKey(Schema.Boolean),
  snoozeLimitedThreads: Schema.optionalKey(Schema.Boolean),
  snoozePresets: Schema.optionalKey(SnoozePresetSettings),
  guestSharingEnabled: Schema.optionalKey(Schema.Boolean),
  linkedEnvironmentsEnabled: Schema.optionalKey(Schema.Boolean),
  backgroundActivity: Schema.optionalKey(
    Schema.Struct({
      schemaVersion: Schema.optionalKey(Schema.Literal(1)),
      profile: Schema.optionalKey(BackgroundActivityProfileSelection),
      baseProfile: Schema.optionalKey(BackgroundActivityProfile),
      overrides: Schema.optionalKey(BackgroundActivityOverrides),
    }),
  ),
  automaticGitFetchInterval: Schema.optionalKey(Schema.DurationFromMillis),
  providerHealthRefreshInterval: Schema.optionalKey(Schema.DurationFromMillis),
  backgroundActivityProfile: Schema.optionalKey(BackgroundActivityProfile),
  environmentIcon: Schema.optionalKey(Schema.NullOr(EnvironmentMachineKind)),
  defaultThreadEnvMode: Schema.optionalKey(Schema.NullOr(ThreadEnvMode)),
  newWorktreesStartFromOrigin: Schema.optionalKey(Schema.Boolean),
  worktreeSubmodules: Schema.optionalKey(Schema.NullOr(WorktreeSubmodules)),
  addProjectBaseDirectory: Schema.optionalKey(TrimmedString),
  textGenerationModelSelection: Schema.optionalKey(ModelSelectionPatch),
  threadTitleInstructions: Schema.optionalKey(TrimmedString),
  branchNamingMode: Schema.optionalKey(BranchNamingMode),
  branchNamePrefix: Schema.optionalKey(TrimmedString),
  branchNameInstructions: Schema.optionalKey(TrimmedString),
  removeAgentCreditsOnMerge: Schema.optionalKey(Schema.Boolean),
  sourceControlWritingStyle: Schema.optionalKey(
    Schema.Struct({
      mode: Schema.optionalKey(SourceControlWritingStyleMode),
      customInstructions: Schema.optionalKey(TrimmedString),
      followChangeRequestTemplates: Schema.optionalKey(Schema.Boolean),
    }),
  ),
  sourceControlWriterModelSelection: Schema.optionalKey(Schema.NullOr(ModelSelection)),
  reviewGuidesEnabled: Schema.optionalKey(Schema.Boolean),
  reviewGuideModelSelection: Schema.optionalKey(Schema.NullOr(ModelSelection)),
  reviewGuideInstructions: Schema.optionalKey(TrimmedString),
  pullRequestMergeMethod: Schema.optionalKey(Schema.NullOr(PullRequestMergeMethod)),
  observability: Schema.optionalKey(
    Schema.Struct({
      otlpTracesUrl: Schema.optionalKey(TrimmedString),
      otlpMetricsUrl: Schema.optionalKey(TrimmedString),
      otlpLogsUrl: Schema.optionalKey(TrimmedString),
    }),
  ),
  /** Merges per host, replacing patched fields whole; redaction markers retain secrets, empty or omitted secrets remove them. */
  sourceControlHosts: Schema.optionalKey(Schema.Record(Schema.String, SourceControlHostSettings)),
  // Replace whole maps to avoid half-merged driver configs.
  providerInstances: Schema.optionalKey(Schema.Record(ProviderInstanceId, ProviderInstanceConfig)),
  // Merge per source to avoid racing other edits; null removes an entry.
  usageLimitSources: Schema.optionalKey(
    Schema.Record(UsageLimitSourceId, Schema.NullOr(UsageLimitSourceConfig)),
  ),
  secretProviders: Schema.optionalKey(
    Schema.Record(SecretProviderId, Schema.NullOr(SecretProviderConfigWrite)),
  ),
  cursorKeychainUsageEnabled: Schema.optionalKey(Schema.Boolean),

  usagePriceOverrides: Schema.optionalKey(
    Schema.Record(TrimmedNonEmptyString, Schema.NullOr(UsageModelPriceOverride)),
  ),

  usageModelAliases: Schema.optionalKey(
    Schema.Record(TrimmedNonEmptyString, Schema.NullOr(TrimmedNonEmptyString)),
  ),
});
```

## Html (tools.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[apps/server/src/mcp/toolkits/html/tools.ts:19–22](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/html/tools.ts#L19-L22) · SHA-256 `cd650bca63354b784b96ef88b06c70e3ac6c52baf8a011aa83c8ccc0bfdd5933`

```typescript
const Html = Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(512_000)).annotate({
  description: "A complete, self-contained HTML document.",
});

```

## OrchestratorMcpCapabilitiesInput (orchestratorMcp.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/orchestratorMcp.ts:572–579](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/orchestratorMcp.ts#L572-L579) · SHA-256 `ab346d693b7f1f4c5bdc3d7f6d28472c79e148296b1fc122708055d48f23aaa0`

```typescript
export const OrchestratorMcpCapabilitiesInput = Schema.Struct({
  environmentId: OrchestratorMcpEnvironmentTarget,
  search: Schema.optional(
    TrimmedNonEmptyString.check(Schema.isMaxLength(200)).annotate({
      description: "Match model ids and labels. Replaces the short list.",
    }),
  ),
});
```

## OrchestratorMcpPrompt (orchestratorMcp.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/orchestratorMcp.ts:46–46](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/orchestratorMcp.ts#L46-L46) · SHA-256 `f21e4c2fe2bbf76cee99bd82f7e71f42c08c47e8bfae53d8189bd88bfd8b84e9`

```typescript
const OrchestratorMcpPrompt = TrimmedNonEmptyString.check(Schema.isMaxLength(120_000));
```

## OrchestratorMcpTargetOptionsFromRecord (orchestratorMcp.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/orchestratorMcp.ts:73–89](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/orchestratorMcp.ts#L73-L89) · SHA-256 `cdad1a65f9cf1b324c43cd8086b5111adb217732b1949cb83bb87cb5f666ab87`

```typescript
const OrchestratorMcpTargetOptionsFromRecord = Schema.Record(
  Schema.String,
  ProviderOptionSelectionValue,
).pipe(
  Schema.decodeTo(
    Schema.Array(ProviderOptionSelection),
    SchemaTransformation.transformEffect({
      decode: (record) =>
        Effect.succeed(Object.entries(record).map(([id, value]) => ({ id, value }))),
      encode: (selections: ReadonlyArray<ProviderOptionSelection>) =>
        Effect.succeed(
          Object.fromEntries(selections.map((selection) => [selection.id, selection.value])),
        ),
    }),
  ),
);

```

## OrchestratorMcpTargetOptions (orchestratorMcp.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/orchestratorMcp.ts:90–93](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/orchestratorMcp.ts#L90-L93) · SHA-256 `df4334a95235698d7ed69c23ac49eb91ba7cf81625073879d2694f0d4702b476`

```typescript
export const OrchestratorMcpTargetOptions = Schema.Union([
  Schema.Array(ProviderOptionSelection),
  OrchestratorMcpTargetOptionsFromRecord,
]);
```

## OrchestratorMcpTarget (orchestratorMcp.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/orchestratorMcp.ts:96–126](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/orchestratorMcp.ts#L96-L126) · SHA-256 `d560a0cc1be3830a8c5175393db5f26d355bbd14638ae7ca83eda986f406182d`

```typescript
export const OrchestratorMcpTarget = Schema.Struct({
  providerInstanceId: Schema.optional(
    ProviderInstanceId.annotate({
      description: "Provider instance id from `orchestrator_capabilities`.",
    }),
  ),
  driverKind: Schema.optional(
    ProviderDriverKind.annotate({
      description: "Prefer `providerInstanceId`.",
    }),
  ),
  model: Schema.optional(TrimmedNonEmptyString),
  options: Schema.optional(
    OrchestratorMcpTargetOptions.annotate({
      description:
        "Options from `orchestrator_capabilities`, such as {effort:'max'}. Given values override inherited. [] or {} clears.",
    }),
  ),
  environmentId: Schema.optional(
    EnvironmentId.annotate({
      description:
        "Linked environment to run in. Provider and model default to yours; others come from `orchestrator_capabilities` with this `environmentId`.",
    }),
  ),
  projectId: Schema.optional(
    ProjectId.annotate({
      description:
        "With `environmentId`: its project to run in. Default: the one with this project's repository.",
    }),
  ),
});
```

## OrchestratorMcpTitle (orchestratorMcp.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/orchestratorMcp.ts:47–47](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/orchestratorMcp.ts#L47-L47) · SHA-256 `dabe3966b00122c41c6dfaa7660f68b728cc1253d925caa8b3865be2ef053b9e`

```typescript
const OrchestratorMcpTitle = TrimmedNonEmptyString.check(Schema.isMaxLength(512));
```

## OrchestratorMcpTaskRole (orchestratorMcp.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/orchestratorMcp.ts:138–145](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/orchestratorMcp.ts#L138-L145) · SHA-256 `948fb83712bccef6d56d832266745df35329a93b7e20d406555ffbc264a26661`

```typescript
export const OrchestratorMcpTaskRole = Schema.Literals([
  "implementation",
  "research",
  "review",
  "design",
  "test",
  "general",
]);
```

## OrchestratorMcpClientRequestId (orchestratorMcp.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/orchestratorMcp.ts:48–58](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/orchestratorMcp.ts#L48-L58) · SHA-256 `fa77991ae04e9768329e24b84ef59ed75c6eb4ac741ecfb6d3a949ffa36eafef`

```typescript
export const OrchestratorMcpClientRequestId = TrimmedNonEmptyString.check(Schema.isMaxLength(256))
  .check(
    Schema.makeFilter((value) =>
      hasOnlyPairedSurrogates(value)
        ? true
        : "clientRequestId must contain valid paired Unicode surrogates.",
    ),
  )
  .annotate({ description: "Reuse it to retry the same call. A new call gets a new key." });

// OpenCode 1.15 serializes nested MCP union objects as JSON strings; decode that form at the boundary.
```

## OrchestratorMcpRuntimeMode (orchestratorMcp.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/orchestratorMcp.ts:129–129](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/orchestratorMcp.ts#L129-L129) · SHA-256 `cdef7179328cc8a5938d8c3a0098ae91fbdc77d719aab77ebd2e2a9d7b236ace`

```typescript
export const OrchestratorMcpRuntimeMode = Schema.Union([Schema.Literal("inherit"), RuntimeMode]);
```

## ProviderInteractionMode (providerPolicy.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/providerPolicy.ts:34–34](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/providerPolicy.ts#L34-L34) · SHA-256 `c8325b191917b546d0a43208afd1c16bd4211e03d0ea68d5eed037a15a76766a`

```typescript
export const ProviderInteractionMode = Schema.Literals(["default", "plan"]);
```

## OrchestratorMcpInteractionMode (orchestratorMcp.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/orchestratorMcp.ts:132–135](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/orchestratorMcp.ts#L132-L135) · SHA-256 `b3cbbcbaf7db6e82352dc6ebd2fbb70d4646c189a93f31806b46421357505027`

```typescript
export const OrchestratorMcpInteractionMode = Schema.Union([
  Schema.Literal("inherit"),
  ProviderInteractionMode,
]);
```

## OrchestratorMcpDelegateTaskInput (orchestratorMcp.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/orchestratorMcp.ts:168–196](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/orchestratorMcp.ts#L168-L196) · SHA-256 `1407c29022e376a9f5e06066adede6a805a8bd36bc11846fcb1b531e2636eaa2`

```typescript
export const OrchestratorMcpDelegateTaskInput = Schema.Struct({
  task: OrchestratorMcpPrompt,
  target: Schema.optional(OrchestratorMcpTarget),
  title: Schema.optional(OrchestratorMcpTitle),
  role: Schema.optional(OrchestratorMcpTaskRole),
  isolation: Schema.optional(
    Schema.Literals(["shared", "worktree"]).annotate({
      description:
        "'shared' (default): parent checkout. 'worktree': new prepared checkout from the parent commit, for a separate checkout or PR per child. Uncommitted edits stay out.",
    }),
  ),
  mode: Schema.optional(
    Schema.Literals(["async", "wait"]).annotate({
      description:
        "Default 'async'. 'wait' only if this turn needs the result. A question or approval ends the wait.",
    }),
  ),
  timeoutMs: Schema.optional(Schema.Finite).annotate({
    description: "Mode 'wait' only. Default 10 min. A timeout does not cancel the child.",
  }),
  clientRequestId: Schema.optional(OrchestratorMcpClientRequestId),
  runtimeMode: Schema.optional(
    OrchestratorMcpRuntimeMode.annotate({
      description:
        "Omit unless the user asks for a supervised child. Narrow modes pause for human approval, not read-only. Above yours is rejected.",
    }),
  ),
  interactionMode: Schema.optional(OrchestratorMcpInteractionMode),
});
```

## NodeId (baseSchemas.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/baseSchemas.ts:268–268](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/baseSchemas.ts#L268-L268) · SHA-256 `a620e6f3ba9cfeac16558916925db6faae125e81466311b5df99b40d704891fb`

```typescript
export const NodeId = makeEntityId("NodeId");
```

## OrchestratorMcpTaskStatusInput (orchestratorMcp.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/orchestratorMcp.ts:243–245](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/orchestratorMcp.ts#L243-L245) · SHA-256 `e861e121406978e4a4b3891512b34b3e053c6a9484bd2cd99c2f4f3d480c210f`

```typescript
export const OrchestratorMcpTaskStatusInput = Schema.Struct({
  taskId: NodeId,
});
```

## OrchestratorMcpTaskCancelInput (orchestratorMcp.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/orchestratorMcp.ts:248–252](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/orchestratorMcp.ts#L248-L252) · SHA-256 `436417111b0a667639ee4a23d4108fa3e772e0710f8916e81d9407e35d6a4f97`

```typescript
export const OrchestratorMcpTaskCancelInput = Schema.Struct({
  taskId: NodeId,
  reason: Schema.optional(Schema.String.check(Schema.isMaxLength(2_000))),
  clientRequestId: Schema.optional(OrchestratorMcpClientRequestId),
});
```

## OrchestrationV2StopWorkflowInput (orchestrationV2.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/orchestrationV2.ts:3896–3899](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/orchestrationV2.ts#L3896-L3899) · SHA-256 `e26f6f51e72a7148d5b08883b0f6236377202691e1ab71e16c0b5d63b32d6368`

```typescript
export const OrchestrationV2StopWorkflowInput = Schema.Struct({
  threadId: ThreadId,
  subagentId: NodeId,
});
```

## RepositoryIdentityLocator (environment.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/environment.ts:175–179](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/environment.ts#L175-L179) · SHA-256 `af1577292e9fa9e5e852138c4967ab873bfa49d40630309240aaf8b916ea0fb1`

```typescript
export const RepositoryIdentityLocator = Schema.Struct({
  source: Schema.Literal("git-remote"),
  remoteName: TrimmedNonEmptyString,
  remoteUrl: TrimmedNonEmptyString,
});
```

## SourceControlProviderKind (sourceControl.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/sourceControl.ts:6–9](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/sourceControl.ts#L6-L9) · SHA-256 `d0fa6783042e7de56444cb3fe9d94eead3d87e7170687f1ec9dc62cfad7943f5`

```typescript
export const SourceControlProviderKind = TrimmedNonEmptyString.check(
  Schema.isMaxLength(64),
  Schema.isPattern(/^[a-z][a-z0-9-]*$/),
).pipe(Schema.brand("SourceControlProviderKind"));
```

## RepositoryOrigin (environment.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/environment.ts:182–186](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/environment.ts#L182-L186) · SHA-256 `5b0de76b460fccc2395c3fb614dbab94825afce6bc2cf9a33f1b7850549d0042`

```typescript
export const RepositoryOrigin = Schema.Struct({
  canonicalKey: TrimmedNonEmptyString,
  remoteUrl: Schema.optionalKey(TrimmedNonEmptyString),
  displayName: Schema.optionalKey(TrimmedNonEmptyString),
});
```

## RepositoryIdentity (environment.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/environment.ts:189–200](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/environment.ts#L189-L200) · SHA-256 `a2db582d95d05a8b39e321c5fedc30011b6ebe4481b1c9fb5681c3b154c721ce`

```typescript
export const RepositoryIdentity = Schema.Struct({
  canonicalKey: TrimmedNonEmptyString,
  locator: RepositoryIdentityLocator,
  webUrl: Schema.optionalKey(TrimmedNonEmptyString),
  /** Work tree root, or the git dir for a bare repository. */
  rootPath: Schema.optionalKey(TrimmedNonEmptyString),
  displayName: Schema.optionalKey(TrimmedNonEmptyString),
  provider: Schema.optionalKey(SourceControlProviderKind),
  owner: Schema.optionalKey(TrimmedNonEmptyString),
  name: Schema.optionalKey(TrimmedNonEmptyString),
  origin: Schema.optionalKey(RepositoryOrigin),
});
```

## UnknownUnionMember (baseSchemas.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/baseSchemas.ts:141–150](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/baseSchemas.ts#L141-L150) · SHA-256 `a0c5ef52ec3d0ed986af0d27bd655c1a0291ab3cc9178b16bab5960165373a81`

```typescript
export class UnknownUnionMember<Tag extends string = string> {
  readonly tag: Tag;
  readonly value: string;
  constructor(tag: Tag, value: string) {
    this.tag = tag;
    this.value = value;
  }
}

/** Unknown members are decode-only; encoding one fails. */
```

## ForwardCompatibleUnion (baseSchemas.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/baseSchemas.ts:151–177](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/baseSchemas.ts#L151-L177) · SHA-256 `c4404c7df171b4565556fb87a9f1f1b7264a1270df67bd3cd48a915adaacb19a`

```typescript
export const ForwardCompatibleUnion = <
  const Members extends ReadonlyArray<Schema.Top & { readonly fields: object }>,
  const Tag extends string,
>(
  members: Members,
  tag: Tag,
) => {
  const known = knownTags(members, tag);
  const unknownMember = Schema.Struct({
    [tag]: Schema.String.check(
      Schema.makeFilter(
        (value: string) => !known.has(value) || `A known ${tag} must decode in full.`,
      ),
    ),
  } as Record<Tag, Schema.String>).pipe(
    Schema.decodeTo(Schema.instanceOf(UnknownUnionMember<Tag>), {
      decode: SchemaGetter.transform(
        (raw: Record<string, string>) => new UnknownUnionMember(tag, raw[tag]!),
      ),
      encode: SchemaGetter.forbidden(() => `Unknown ${tag} values are never sent.`),
    }),
  );
  return Schema.Union([...members, unknownMember]) as unknown as ForwardCompatibleUnion<
    Members,
    Tag
  >;
};
```

## ProjectLucideIconName (project.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/project.ts:69–73](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/project.ts#L69-L73) · SHA-256 `604dfd908e1971153e1f81ce735ceb145189f7e86f319e1f52c34174a630432a`

```typescript
const ProjectLucideIconName = TrimmedNonEmptyString.check(
  Schema.isMaxLength(64),
  Schema.isPattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
);

```

## ProjectIconColor (project.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/project.ts:47–66](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/project.ts#L47-L66) · SHA-256 `bdea6694c6040ac1dcf21a6f8a6833a0ec17f516bb42c71f5eb88a3c69a90d94`

```typescript
export const ProjectIconColor = Schema.Literals([
  "gray",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
]);
```

## ProjectLucideIcon (project.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/project.ts:82–86](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/project.ts#L82-L86) · SHA-256 `f66873de49518e08b67fdcd39ee6b56ee3708a50e4fa3dbf7e6d6deac3ac39e4`

```typescript
const ProjectLucideIcon = Schema.Struct({
  kind: Schema.Literal("lucide"),
  name: ProjectLucideIconName,
  color: ProjectIconColor,
});
```

## ProjectEmoji (project.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/project.ts:74–76](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/project.ts#L74-L76) · SHA-256 `510cf6fc64704f1110877aaae6f4d7c771e88e90bc7e9fbc11334ce79b69b735`

```typescript
const ProjectEmoji = TrimmedNonEmptyString.check(Schema.isMaxLength(32));

// Grapheme-count validation belongs to the server command boundary, not snapshot decoding.
```

## ProjectEmojiIcon (project.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/project.ts:87–90](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/project.ts#L87-L90) · SHA-256 `bba34b8a567ba85ea8cc34efb195eda0a5fefadcb4a294b56bf2a68862f9578d`

```typescript
const ProjectEmojiIcon = Schema.Struct({
  kind: Schema.Literal("emoji"),
  emoji: ProjectEmoji,
});
```

## ProjectMonogramText (project.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/project.ts:77–81](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/project.ts#L77-L81) · SHA-256 `ac6e5f10ec2c5b59c2a9206c61b0072942fe598e057b5d25f818180278714d1c`

```typescript
export const ProjectMonogramText = TrimmedNonEmptyString.check(
  Schema.isMaxLength(32),
  Schema.isPattern(/^[\p{L}\p{N}][\p{L}\p{N}\p{M}\u200c\u200d]*$/u),
);

```

## ProjectMonogramIcon (project.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/project.ts:91–95](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/project.ts#L91-L95) · SHA-256 `08cd97a709b87c4e6f08c3c949ae442e15ab989b7e4a672f78020805f885c0b8`

```typescript
const ProjectMonogramIcon = Schema.Struct({
  kind: Schema.Literal("monogram"),
  text: ProjectMonogramText,
  color: ProjectIconColor,
});
```

## ProjectIconOverride (project.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/project.ts:102–106](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/project.ts#L102-L106) · SHA-256 `4aa3419702f7a8d9ff3284def9e486e08ba147107c591f8c1d1d84ef27906dad`

```typescript
export const ProjectIconOverride = Schema.Union([
  ProjectLucideIcon,
  ProjectEmojiIcon,
  ProjectMonogramIcon,
]);
```

## ProjectIconMember (project.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/project.ts:119–120](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/project.ts#L119-L120) · SHA-256 `636e234ccf00b7d4399c9b83f54a6e5fed1b091e8e6519754c4085f6471fd622`

```typescript
type ProjectIconMember = (typeof projectIconMembers)[number]["Type"];

```

## ReceivedProjectIcon (project.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/project.ts:139–151](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/project.ts#L139-L151) · SHA-256 `062e4be051693f8ef5b1195197a2e6dc87319065631e8e9470c487526b9f67d2`

```typescript
export const ReceivedProjectIcon = ForwardCompatibleUnion(projectIconMembers, "kind").pipe(
  Schema.decodeTo(
    Schema.NullOr(Schema.toType(ProjectIconOverride)),
    SchemaTransformation.transform<
      ProjectIconOverride | null,
      ProjectIconMember | UnknownUnionMember<"kind">
    >({
      decode: (icon) => (isUnknownUnionMember(icon) ? null : fromLegacyMonogram(icon)),
      encode: (icon) => icon as ProjectIconMember,
    }),
  ),
);

```

## Project (project.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/project.ts:152–167](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/project.ts#L152-L167) · SHA-256 `27301f1bd8158c448756f42b264ab505af96ef749e16fbae684faf9a703d6545`

```typescript
export const Project = Schema.Struct({
  id: ProjectId,
  title: TrimmedNonEmptyString,
  workspaceRoot: TrimmedNonEmptyString,
  repositoryIdentity: Schema.optional(Schema.NullOr(RepositoryIdentity)),
  faviconPath: Schema.optional(Schema.NullOr(TrimmedNonEmptyString)),
  projectIcon: Schema.optional(Schema.NullOr(ReceivedProjectIcon)),
  defaultModelSelection: Schema.NullOr(ModelSelection),
  defaultThreadEnvMode: Schema.optional(Schema.NullOr(ThreadEnvMode)),
  // Opt-in because background sync performs network I/O and may move the checkout.
  autoPull: Schema.optional(Schema.Boolean),
  scripts: Schema.Array(ProjectScript),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
  deletedAt: Schema.NullOr(IsoDateTime),
});
```

## OrchestratorMcpProjectTarget (orchestratorMcp.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/orchestratorMcp.ts:312–322](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/orchestratorMcp.ts#L312-L322) · SHA-256 `82888a479f625fe0f717a22db5d7646cff6039d340f33e8c6cfdad4965331a4b`

```typescript
const OrchestratorMcpProjectTarget = Schema.optional(
  ProjectId.annotate({
    description: "Project to use. Default: your thread's project. Required outside a thread.",
  }),
);

/**
 * A linked environment to act in instead of this one. The tools that take it
 * forward the call there, where the link's access and the caller's own modes
 * both apply.
 */
```

## ScheduledTaskIntervalMs (scheduledTask.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/scheduledTask.ts:27–28](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/scheduledTask.ts#L27-L28) · SHA-256 `3d1cfd71936a135ec2edf858241b1b1c485f629664e3b490f9dd1d29acba808c`

```typescript
const ScheduledTaskIntervalMs = Schema.Int.check(Schema.isGreaterThan(0));

```

## MIN_SCHEDULED_TASK_INTERVAL_MS (scheduledTask.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/scheduledTask.ts:25–26](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/scheduledTask.ts#L25-L26) · SHA-256 `dd1b38e6215224d71ec84a4e8bb88dc152fcc68092474aafaa88d9db971578cc`

```typescript
export const MIN_SCHEDULED_TASK_INTERVAL_MS = 60_000;

```

## TimeOfDay (scheduledTask.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/scheduledTask.ts:21–24](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/scheduledTask.ts#L21-L24) · SHA-256 `e92af22420b124ead5ea66c5a8a21eda26c0e100e1751294bf7466fd62b15745`

```typescript
const TimeOfDay = TrimmedNonEmptyString.check(
  Schema.isPattern(/^([01]?\d|2[0-3]):([0-5]\d)$/),
).annotate({ description: "Local time as HH:MM, such as 09:30." });

```

## ScheduledTaskFixedTimeSchedule (scheduledTask.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/scheduledTask.ts:34–47](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/scheduledTask.ts#L34-L47) · SHA-256 `c2bf714764b6dc7cdcbc7463c49b9c12e4f59d4160d6414dd5c45a41eb6db5da`

```typescript
const ScheduledTaskFixedTimeSchedule = Schema.Struct({
  type: Schema.Literal("fixed_time"),
  timeOfDay: TimeOfDay,
  weekdays: Schema.optional(
    Schema.Array(
      Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 6 })).annotate({
        description: "Weekday. 0 is Sunday, 6 is Saturday.",
      }),
    ).annotate({
      description: "Default: every day.",
    }),
  ),
});

```

## ScheduledTaskWebhookSignatureFields (scheduledTask.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/scheduledTask.ts:48–57](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/scheduledTask.ts#L48-L57) · SHA-256 `9b0587a4d229c55e94b0ee7a7a0dd6881c5b4e7ef8158bd644979108f6dfeae6`

```typescript
const ScheduledTaskWebhookSignatureFields = {
  header: TrimmedNonEmptyString.annotate({
    description: "Header with the signature, such as x-hub-signature-256.",
  }),
  encoding: Schema.Literals(["hex", "base64"]),
  prefix: Schema.String.annotate({
    description: "Text before the digest, such as 'sha256='. Empty for none.",
  }),
};

```

## SecretRef (baseSchemas.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/baseSchemas.ts:317–317](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/baseSchemas.ts#L317-L317) · SHA-256 `c25cd98cb9d7060faec3409735a04938d2600da6bc6bf57a9f19d324839e5686`

```typescript
export const SecretRef = makeEntityId("SecretRef");
```

## MAX_WEBHOOK_DELIVERY_AGE_MINUTES (scheduledTask.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/scheduledTask.ts:64–65](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/scheduledTask.ts#L64-L65) · SHA-256 `1c1b4ad66958fc496d3d004187d0340e1f9b945e3ac5a57fb429b1fcfc8b2a40`

```typescript
export const MAX_WEBHOOK_DELIVERY_AGE_MINUTES = 24 * 60;

```

## WebhookMaxDeliveryAgeMinutes (scheduledTask.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/scheduledTask.ts:66–71](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/scheduledTask.ts#L66-L71) · SHA-256 `3580e8df63123eb611a7bf0cc9e1512f005878ac98956a5e58e849d8b7919e55`

```typescript
const WebhookMaxDeliveryAgeMinutes = Schema.Int.check(
  Schema.isBetween({ minimum: 1, maximum: MAX_WEBHOOK_DELIVERY_AGE_MINUTES }),
).annotate({
  description: "Skip requests held offline over this many minutes. Omit to run all.",
});

```

## WebhookDedupeTemplate (scheduledTask.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/scheduledTask.ts:79–80](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/scheduledTask.ts#L79-L80) · SHA-256 `0a1410b5b66f011e3a0bbb4f804de0b237f9fe31bd0d3d1d360a43a46adb531b`

```typescript
const WebhookDedupeTemplate = Schema.String.check(Schema.makeFilter(isWebhookDedupeTemplate));

```

## ScheduledTaskWebhookDedupe (scheduledTask.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/scheduledTask.ts:81–90](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/scheduledTask.ts#L81-L90) · SHA-256 `75ee48d950d3425073dbfdd36541c1a6d8a01d43d0e594ae74ef7b521e17ba25`

```typescript
const ScheduledTaskWebhookDedupe = Schema.Struct({
  replayKey: Schema.optional(WebhookDedupeTemplate),
  coalesceKey: Schema.optional(WebhookDedupeTemplate),
  coalesceWindowSeconds: Schema.optional(
    Schema.Int.check(Schema.isBetween({ minimum: 10, maximum: 3600 })),
  ),
}).annotate({
  description: "Replay and coalesce key templates. Window in seconds, default 120.",
});

```

## WebhookFilterPath (scheduledTask.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/scheduledTask.ts:93–100](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/scheduledTask.ts#L93-L100) · SHA-256 `db96569ae89a20966e40484b7066314f153d2ad8faf82cbc2347450eaf487f75`

```typescript
const WebhookFilterPath = TrimmedNonEmptyString.check(
  Schema.isPattern(/^(body|headers|query)(\.|$)/),
);

/**
 * Forms edit an `in` list as comma-separated text, so a value that has no
 * comma and no surrounding whitespace survives that round trip unchanged.
 */
```

## WebhookFilterListValue (scheduledTask.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/scheduledTask.ts:101–104](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/scheduledTask.ts#L101-L104) · SHA-256 `7221ef38b433a56a5fab29d1b8c486ed01d7d27fe10f6209eeb8aaae1cd114c0`

```typescript
const WebhookFilterListValue = Schema.String.check(
  Schema.isPattern(/^[^,\s](?:[^,]*[^,\s])?$/),
).annotate({ description: "Non-empty, without commas or surrounding whitespace." });

```

## ScheduledTaskWebhookFilter (scheduledTask.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/scheduledTask.ts:105–120](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/scheduledTask.ts#L105-L120) · SHA-256 `ae642c784bc23aa25df6f93ba267fdb7e8d438c25e6196148c119f0e2bf97b97`

```typescript
export const ScheduledTaskWebhookFilter = Schema.Union([
  Schema.Struct({
    path: WebhookFilterPath,
    op: Schema.Literals(["equals", "notEquals", "startsWith"]),
    value: Schema.String,
  }),
  Schema.Struct({
    path: WebhookFilterPath,
    op: Schema.Literal("in"),
    value: Schema.Array(WebhookFilterListValue).check(Schema.isMinLength(1)),
  }),
  Schema.Struct({ path: WebhookFilterPath, op: Schema.Literal("exists") }),
]).annotate({
  description:
    "Path: `headers.x-event` or `body.action`. String compare. Objects pass only 'exists'. A `[]` segment matches any array item. `notEquals` passes only if no item equals.",
});
```

## MAX_WEBHOOK_FILTERS (scheduledTask.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/scheduledTask.ts:91–92](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/scheduledTask.ts#L91-L92) · SHA-256 `9c71d944383e62ab4e6b7777431165c8cd61b7dbba2d44bebc2b630591fff095`

```typescript
export const MAX_WEBHOOK_FILTERS = 16;

```

## ScheduledTaskWebhookFilters (scheduledTask.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/scheduledTask.ts:124–129](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/scheduledTask.ts#L124-L129) · SHA-256 `44ab568c9362d5ed0b7617e4b76341b0e24b5b63fcc3d66f65fee55e0ad61d39`

```typescript
const ScheduledTaskWebhookFilters = Schema.Array(ScheduledTaskWebhookFilter)
  .check(Schema.isMaxLength(MAX_WEBHOOK_FILTERS))
  .annotate({
    description: "All must match. Max 16. Omitted: keep stored. [] clears.",
  });

```

## ScheduledTaskUpsertWebhookSchedule (scheduledTask.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/scheduledTask.ts:140–165](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/scheduledTask.ts#L140-L165) · SHA-256 `b2e4389e9b5c40f9946f8b89d222c996f5dc646b6b0d7a24d043a6770f827000`

```typescript
const ScheduledTaskUpsertWebhookSchedule = Schema.Struct({
  type: Schema.Literal("webhook"),
  signature: Schema.optional(
    Schema.NullOr(
      Schema.Struct({
        ...ScheduledTaskWebhookSignatureFields,
        secret: Schema.optional(TrimmedNonEmptyString).annotate({
          description: "Default: stored secret.",
        }),
        secretRef: Schema.optional(SecretRef).annotate({
          description: "From `request_secret`. Instead of `secret`. Spent by this save.",
        }),
      }),
    ),
  ).annotate({
    description: "Omit for URL token only.",
  }),
  maxDeliveryAgeMinutes: Schema.optional(Schema.NullOr(WebhookMaxDeliveryAgeMinutes)),
  dedupe: Schema.optional(ScheduledTaskWebhookDedupe),
  filters: Schema.optional(ScheduledTaskWebhookFilters),
}).annotate({
  description:
    "Run per webhook request. Prompt can use {{body.path}}, {{headers.name}}, {{query.name}}, {{body}}, {{request}}.",
});

/** Accept legacy sub-minute schedules so users can still manage them. */
```

## ScheduledTaskUpsertSchedule (scheduledTask.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/scheduledTask.ts:173–184](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/scheduledTask.ts#L173-L184) · SHA-256 `bda4d9b5ddd193dd3c97b8e07bfbb62b91b2bd9c5cf185f62034c1944ddcc4cd`

```typescript
export const ScheduledTaskUpsertSchedule = Schema.Union([
  Schema.Struct({
    type: Schema.Literal("interval"),
    everyMs: ScheduledTaskIntervalMs.check(
      Schema.isGreaterThanOrEqualTo(MIN_SCHEDULED_TASK_INTERVAL_MS),
    ).annotate({
      description: "Min 60000.",
    }),
  }),
  ScheduledTaskFixedTimeSchedule,
  ScheduledTaskUpsertWebhookSchedule,
]);
```

## OrchestratorMcpScheduleFromJsonString (orchestratorMcp.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/orchestratorMcp.ts:59–64](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/orchestratorMcp.ts#L59-L64) · SHA-256 `cc5631580dcf6ec080db50916ec69eb7c239e8d03a96a4370c780e59b61c4ddd`

```typescript
const OrchestratorMcpScheduleFromJsonString = Schema.fromJsonString(
  ScheduledTaskUpsertSchedule,
).annotate({
  description: "JSON-text schedule. Prefer the object form.",
});

```

## OrchestratorMcpSchedule (orchestratorMcp.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/orchestratorMcp.ts:65–72](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/orchestratorMcp.ts#L65-L72) · SHA-256 `beb4e0488421f9429ebf530194979b003ba9f2359ce913a2187c32a2193076f3`

```typescript
const OrchestratorMcpSchedule = Schema.Union([
  ScheduledTaskUpsertSchedule,
  OrchestratorMcpScheduleFromJsonString,
]).annotate({
  description:
    "Trigger: {type:'interval',everyMs}, {type:'fixed_time',timeOfDay,weekdays?}, or {type:'webhook'}.",
});

```

## OrchestratorMcpScheduleTaskInput (orchestratorMcp.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/orchestratorMcp.ts:652–665](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/orchestratorMcp.ts#L652-L665) · SHA-256 `2285b174ef5197fe145769c3c1f69d63f48385edf6ed3aa39e75f49d0dbf5310`

```typescript
export const OrchestratorMcpScheduleTaskInput = Schema.Struct({
  environmentId: OrchestratorMcpEnvironmentTarget,
  projectId: OrchestratorMcpProjectTarget,
  prompt: OrchestratorMcpPrompt,
  schedule: OrchestratorMcpSchedule,
  title: Schema.optional(OrchestratorMcpTitle),
  enabled: Schema.optional(Schema.Boolean.annotate({ description: "Default true." })),
  bindToCurrentThread: Schema.optional(
    Schema.Boolean.annotate({
      description: "Default true: runs post in this thread. False: new thread per run.",
    }),
  ),
  clientRequestId: Schema.optional(OrchestratorMcpClientRequestId),
});
```

## ScheduledTaskId (baseSchemas.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/baseSchemas.ts:315–316](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/baseSchemas.ts#L315-L316) · SHA-256 `07b71711e59d32ace0530cf93ce310e384d8e7931c013d9411eafbe71258bd58`

```typescript
export const ScheduledTaskId = makeEntityId("ScheduledTaskId");
/** A one-use handle to a secret the user entered for an agent; the agent never sees the value. */
```

## OrchestratorMcpSaveScheduledTaskInput (orchestratorMcp.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/orchestratorMcp.ts:669–674](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/orchestratorMcp.ts#L669-L674) · SHA-256 `f19d1d11bd57289f9c9f1725fc47906def603c857fa33f28798c4e4125d6a8fe`

```typescript
export const OrchestratorMcpSaveScheduledTaskInput = Schema.Struct({
  ...OrchestratorMcpScheduleTaskInput.fields,
  scheduledTaskId: Schema.optional(ScheduledTaskId),
  prompt: Schema.optional(OrchestratorMcpPrompt),
  schedule: Schema.optional(OrchestratorMcpSchedule),
});
```

## OrchestratorMcpListScheduledTasksInput (orchestratorMcp.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/orchestratorMcp.ts:699–706](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/orchestratorMcp.ts#L699-L706) · SHA-256 `ed9350c6164d38e4385776e23139c3ddaf59315152bb2edfa6fc997aea5f4332`

```typescript
export const OrchestratorMcpListScheduledTasksInput = Schema.Struct({
  environmentId: OrchestratorMcpEnvironmentTarget,
  projectId: Schema.optional(
    ProjectId.annotate({
      description: "Default: your thread's project, or all outside a thread.",
    }),
  ),
});
```

## OrchestratorMcpDeleteScheduledTaskInput (orchestratorMcp.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/orchestratorMcp.ts:840–843](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/orchestratorMcp.ts#L840-L843) · SHA-256 `f0375a734a4ba2a1e568e20b898cf2a6a4c3f466cfb663e085d0a0b92d721979`

```typescript
export const OrchestratorMcpDeleteScheduledTaskInput = Schema.Struct({
  environmentId: OrchestratorMcpEnvironmentTarget,
  scheduledTaskId: ScheduledTaskId,
});
```

## OrchestratorMcpRequestSecretInput (orchestratorMcp.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/orchestratorMcp.ts:728–746](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/orchestratorMcp.ts#L728-L746) · SHA-256 `bb1ae93917d881dca20325b892c38c2e7fcaf710812a085487bbc608c93a7f1f`

```typescript
export const OrchestratorMcpRequestSecretInput = Schema.Struct({
  label: TrimmedNonEmptyString.annotate({
    description: "Card title, such as 'GitHub webhook secret'.",
  }),
  reason: TrimmedNonEmptyString.annotate({
    description: "What it is for and where to get it.",
  }),
  placeholder: Schema.optional(TrimmedNonEmptyString),
  delivery: Schema.optional(Schema.Literals(["secretRef", "file"])).annotate({
    description:
      'secretRef (default) for a T3 tool. file for a shell CLI: read the path in your command, e.g. TOKEN="$(cat <file>)" wrangler whoami.',
  }),
  timeoutMs: Schema.optional(
    Schema.Int.check(Schema.isBetween({ minimum: 1_000, maximum: 60 * 60 * 1_000 })),
  ).annotate({ description: "Default 10 min." }),
  clientRequestId: Schema.optional(OrchestratorMcpClientRequestId).annotate({
    description: "Retry key for this ask. New key after a timeout or cancel.",
  }),
});
```

## OrchestratorMcpCreateThreadRequest (orchestratorMcp.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/orchestratorMcp.ts:261–267](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/orchestratorMcp.ts#L261-L267) · SHA-256 `e02abeb633e155f75935628ab7e83b232c4742cc6a3e305a8cc584e8c380df2e`

```typescript
export const OrchestratorMcpCreateThreadRequest = Schema.Struct({
  prompt: Schema.optional(OrchestratorMcpPrompt),
  title: Schema.optional(OrchestratorMcpTitle),
  target: Schema.optional(OrchestratorMcpTarget),
  runtimeMode: Schema.optional(OrchestratorMcpRuntimeMode),
  interactionMode: Schema.optional(OrchestratorMcpInteractionMode),
});
```

## OrchestratorMcpCreateThreadsInput (orchestratorMcp.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/orchestratorMcp.ts:270–276](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/orchestratorMcp.ts#L270-L276) · SHA-256 `78cc1d7326bbce8d85abb656de4dc6e3c0be1987e57183d31e57ca04837ab740`

```typescript
export const OrchestratorMcpCreateThreadsInput = Schema.Struct({
  threads: Schema.Array(OrchestratorMcpCreateThreadRequest).check(
    Schema.isMinLength(1),
    Schema.isMaxLength(20),
  ),
  clientRequestId: Schema.optional(OrchestratorMcpClientRequestId),
});
```

## OrchestrationV2RunStatus (orchestrationV2.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/orchestrationV2.ts:580–591](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/orchestrationV2.ts#L580-L591) · SHA-256 `9e7f695cc11c47b122e368c6c6f06820399c7242f40e3caae11f383d17d1fb92`

```typescript
export const OrchestrationV2RunStatus = Schema.Literals([
  "preparing",
  "queued",
  "starting",
  "running",
  "waiting",
  "completed",
  "interrupted",
  "failed",
  "cancelled",
  "rolled_back",
]);
```

## OrchestratorMcpThreadStatus (orchestratorMcp.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/orchestratorMcp.ts:306–309](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/orchestratorMcp.ts#L306-L309) · SHA-256 `a98c395ebefbef873eee017f6a61864c2cdcd65c082f9b21b0fe5389a1c862d8`

```typescript
export const OrchestratorMcpThreadStatus = Schema.Union([
  Schema.Literal("idle"),
  OrchestrationV2RunStatus,
]);
```

## OrchestratorMcpThreadListInput (orchestratorMcp.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/orchestratorMcp.ts:330–343](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/orchestratorMcp.ts#L330-L343) · SHA-256 `43394c4a3a13ed075721719448c995da24d6f4c1efd6f59d939bb2ae8748ff5c`

```typescript
export const OrchestratorMcpThreadListInput = Schema.Struct({
  environmentId: OrchestratorMcpEnvironmentTarget,
  projectId: OrchestratorMcpProjectTarget,
  allProjects: Schema.optional(Schema.Boolean),
  statuses: Schema.optional(
    Schema.Array(OrchestratorMcpThreadStatus).check(Schema.isMaxLength(10)),
  ),
  titleContains: Schema.optional(TrimmedNonEmptyString.check(Schema.isMaxLength(256))),
  settled: Schema.optional(Schema.Boolean),
  snoozed: Schema.optional(Schema.Boolean),
  includeSubagents: Schema.optional(Schema.Boolean),
  cursor: Schema.optional(NonNegativeInt),
  limit: Schema.optional(PositiveInt.check(Schema.isLessThanOrEqualTo(100))),
});
```

## TurnItemId (baseSchemas.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/baseSchemas.ts:311–311](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/baseSchemas.ts#L311-L311) · SHA-256 `ee34d9b0251c90ed283291d2479172587f67c56ac4e144e0d068c078e7c3dfa0`

```typescript
export const TurnItemId = makeEntityId("TurnItemId");
```

## OrchestratorMcpThreadReadInput (orchestratorMcp.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/orchestratorMcp.ts:406–422](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/orchestratorMcp.ts#L406-L422) · SHA-256 `e19cd7f088c536c704d172b0f38f2b257c376ecabdaddb49f2ffb226e15d8d75`

```typescript
export const OrchestratorMcpThreadReadInput = Schema.Struct({
  environmentId: OrchestratorMcpEnvironmentTarget,
  threadId: ThreadId,
  itemId: Schema.optional(TurnItemId),
  textOffset: Schema.optional(NonNegativeInt),
  view: Schema.optional(Schema.Literals(["messages", "activity"])),
  afterPosition: Schema.optional(NonNegativeInt),
  limit: Schema.optional(clampedPositiveInt(100)).annotate({
    description: "Max items, 1 to 100.",
  }),
  runLimit: Schema.optional(clampedPositiveInt(50)).annotate({
    description: "Max recent runs, 1 to 50.",
  }),
  maxCharsPerItem: Schema.optional(clampedPositiveInt(50_000)).annotate({
    description: "Max chars per item, 1 to 50000.",
  }),
});
```

## ThreadMetadataMcpAction (threadMetadataMcp.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/threadMetadataMcp.ts:43–43](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/threadMetadataMcp.ts#L43-L43) · SHA-256 `ddabe609cc045bf8c1605bb49eb57da6c4339530c293d57ea68d605e9c756997`

```typescript
export const ThreadMetadataMcpAction = Schema.Literals(["rename", "regenerate_title"]);
```

## ThreadMetadataTitle (threadMetadataMcp.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/threadMetadataMcp.ts:29–32](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/threadMetadataMcp.ts#L29-L32) · SHA-256 `a90ded6b819584ea33725cd7993811c73a7a9f74842256c0a9b96f483045611e`

```typescript
const ThreadMetadataTitle = TrimmedNonEmptyString.check(Schema.isMaxLength(512)).annotate({
  description: "New concise display title. Required only when action is rename.",
});

```

## ThreadMetadataClientRequestId (threadMetadataMcp.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/threadMetadataMcp.ts:33–42](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/threadMetadataMcp.ts#L33-L42) · SHA-256 `4cfb62d3c5a6d75aa8d6f729bded9ca203f467e66732d542d9c59bb2323aecb2`

```typescript
const ThreadMetadataClientRequestId = TrimmedNonEmptyString.check(Schema.isMaxLength(256))
  .check(
    Schema.makeFilter((value) =>
      hasOnlyPairedSurrogates(value)
        ? true
        : "clientRequestId must contain valid paired Unicode surrogates.",
    ),
  )
  .annotate({ description: "Stable idempotency key to reuse when retrying this mutation." });

```

## ThreadMetadataMcpUpdateInput (threadMetadataMcp.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/threadMetadataMcp.ts:46–57](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/threadMetadataMcp.ts#L46-L57) · SHA-256 `d497bb83acacfe9bd70d9b2c61a962523e8e7ec9b53980bad3b02d4a467cb327`

```typescript
export const ThreadMetadataMcpUpdateInput = Schema.Struct({
  threadId: Schema.optional(ThreadId),
  action: ThreadMetadataMcpAction,
  title: Schema.optional(ThreadMetadataTitle),
  clientRequestId: Schema.optional(ThreadMetadataClientRequestId),
}).check(
  Schema.makeFilter((input) =>
    (input.action === "rename") === (input.title !== undefined)
      ? true
      : "rename requires title; regenerate_title does not accept one.",
  ),
);
```

## OrchestratorMcpThreadSendInput (orchestratorMcp.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/orchestratorMcp.ts:501–507](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/orchestratorMcp.ts#L501-L507) · SHA-256 `362fd89e2b38dccc5c929e21d20794c0bf1b7d0848a1ee92508e477faf1cefed`

```typescript
export const OrchestratorMcpThreadSendInput = Schema.Struct({
  environmentId: OrchestratorMcpEnvironmentTarget,
  threadId: ThreadId,
  message: OrchestratorMcpPrompt,
  mode: Schema.optional(Schema.Literals(["auto", "queue", "steer", "restart"])),
  clientRequestId: Schema.optional(OrchestratorMcpClientRequestId),
});
```

## RunId (baseSchemas.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/baseSchemas.ts:264–264](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/baseSchemas.ts#L264-L264) · SHA-256 `9192f0b6f1b64448e48d2b474bff6c05f4125661a45cc1cac1aaf9533eb23688`

```typescript
export const RunId = makeEntityId("RunId");
```

## OrchestratorMcpThreadWaitInput (orchestratorMcp.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/orchestratorMcp.ts:521–532](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/orchestratorMcp.ts#L521-L532) · SHA-256 `f0c62c96780062c819322a5834f41498b44cbc7723ce2e0d0fc4899336679f92`

```typescript
export const OrchestratorMcpThreadWaitInput = Schema.Struct({
  environmentId: OrchestratorMcpEnvironmentTarget,
  threadId: ThreadId,
  runId: Schema.optional(RunId),
  timeoutMs: Schema.optional(Schema.Finite),
  untilDelegatedWorkSettled: Schema.optional(
    Schema.Boolean.annotate({
      description:
        "Also wait for its delegated and background tasks and their completions to settle. `resultRun` then names the run with its final answer.",
    }),
  ),
});
```

## OrchestratorMcpThreadInterruptInput (orchestratorMcp.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/orchestratorMcp.ts:546–558](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/orchestratorMcp.ts#L546-L558) · SHA-256 `b51e6fbd105c2bd15abea2d4cd36e4090c11c190a562b288c19203fd28b93ddd`

```typescript
export const OrchestratorMcpThreadInterruptInput = Schema.Struct({
  environmentId: OrchestratorMcpEnvironmentTarget,
  threadId: ThreadId,
  runId: Schema.optional(RunId),
  reason: Schema.optional(Schema.String.check(Schema.isMaxLength(2_000))),
  /**
   * Stop the thread as its Stop button does instead: interrupt its running
   * turn whichever run that is, hold its queued messages, end its pull request
   * watches and stop every task it delegated. `runId` is then not used.
   */
  stop: Schema.optional(Schema.Boolean),
  clientRequestId: Schema.optional(OrchestratorMcpClientRequestId),
});
```

## AuthMcpClientAccess (auth.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/auth.ts:402–408](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/auth.ts#L402-L408) · SHA-256 `31c4d87c309336f6e0488ddf936cd86f6c419085e9757c7f6ade9ff61f5538f7`

```typescript
export const AuthMcpClientAccess = Schema.Literals([
  "read-only",
  "approval-required",
  "auto-accept-edits",
  "auto",
  "full-access",
]);
```

## OrchestratorMcpEnvironmentLinkInput (orchestratorMcp.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/orchestratorMcp.ts:772–791](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/orchestratorMcp.ts#L772-L791) · SHA-256 `ded2dfabe2f6043319ebe0f21de6411f798ac6ae7ddb3f62a942db431732c821`

```typescript
export const OrchestratorMcpEnvironmentLinkInput = Schema.Struct({
  environmentId: Schema.optional(EnvironmentId).annotate({
    description:
      "The machine, when known, e.g. from a mentioned machine. Otherwise the user picks it in the card.",
  }),
  url: Schema.optional(TrimmedNonEmptyString).annotate({
    description:
      "Only an address the user gave: https, Tailscale, LAN or loopback. Never guess one.",
  }),
  hint: Schema.optional(TrimmedNonEmptyString).annotate({
    description: 'The user\'s words for the machine, e.g. "vps". Preselects it in the card.',
  }),
  reason: Schema.optional(TrimmedNonEmptyString).annotate({
    description: "One sentence for the card.",
  }),
  requestedAccess: Schema.optional(AuthMcpClientAccess).annotate({
    description: "Suggested access. The user picks; default approval-required.",
  }),
  clientRequestId: Schema.optional(OrchestratorMcpClientRequestId),
});
```

## OrchestratorMcpEnvironmentUnlinkInput (orchestratorMcp.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/orchestratorMcp.ts:825–829](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/orchestratorMcp.ts#L825-L829) · SHA-256 `65873958c63f8d9eda239b77959947cb8861ee10a1cc6b72528438867f3b4673`

```typescript
export const OrchestratorMcpEnvironmentUnlinkInput = Schema.Struct({
  environmentId: EnvironmentId.annotate({
    description: "The linked environment to forget, from t3_environment_links.",
  }),
});
```

## PreviewTabId (preview.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/preview.ts:15–15](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/preview.ts#L15-L15) · SHA-256 `7d85e3a8ccba753d83c49349af66f2ad9c02a78358ed05e11e6d146fcc28616e`

```typescript
export const PreviewTabId = TrimmedNonEmptyString.check(Schema.isMaxLength(128));
```

## PreviewAutomationTabTargetFields (previewAutomation.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/previewAutomation.ts:58–61](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/previewAutomation.ts#L58-L61) · SHA-256 `1c965246bd86016f408e79adcd604bab3e480e47eb19e3b96d89d60678c7df1b`

```typescript
const PreviewAutomationTabTargetFields = {
  tabId: Schema.optional(PreviewTabId),
};

```

## PreviewAutomationTabTargetInput (previewAutomation.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/previewAutomation.ts:62–62](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/previewAutomation.ts#L62-L62) · SHA-256 `f528674aa7d62cfe6919220e649150176bcdad03ad35a7e581908f8a4c8932de`

```typescript
export const PreviewAutomationTabTargetInput = Schema.Struct(PreviewAutomationTabTargetFields);
```

## BoundedUrl (previewAutomation.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/previewAutomation.ts:15–17](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/previewAutomation.ts#L15-L17) · SHA-256 `603bdac352981dd731d3d151406c8af18c8b7ef69309eff59e42f0b86ac42032`

```typescript
const BoundedUrl = Schema.String.check(Schema.isTrimmed())
  .check(Schema.isNonEmpty())
  .check(Schema.isMaxLength(2048));
```

## URL_GUIDANCE (previewAutomation.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/previewAutomation.ts:18–18](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/previewAutomation.ts#L18-L18) · SHA-256 `05b735c55c25c1bdd6916ef60e2f509888c0addcab3c8c0694e00077738d30f0`

```typescript
const URL_GUIDANCE = "Absolute http(s) URL, or a bare host (https; http for loopback).";
```

## PROFILE_GUIDANCE (previewAutomation.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/previewAutomation.ts:19–20](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/previewAutomation.ts#L19-L20) · SHA-256 `7b1ab912ccc08befa314d0b876c842425d20e48677fa7ec7f001fdb7fb8809d4`

```typescript
const PROFILE_GUIDANCE =
  "Profile id or name from preview_status, for a new tab. Default: the user's. A tab keeps its profile.";
```

## PreviewAutomationOpenInput (previewAutomation.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/previewAutomation.ts:139–168](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/previewAutomation.ts#L139-L168) · SHA-256 `4f37212d31a0e4dd1a4aa6a529babf6d82be012bc5e087d5573620a9357725fa`

```typescript
export const PreviewAutomationOpenInput = Schema.Struct({
  ...PreviewAutomationTabTargetFields,
  url: Schema.optional(BoundedUrl).annotate({
    description: `First page URL. ${URL_GUIDANCE} Omit to open a blank tab.`,
  }),
  open: Schema.optional(
    Schema.Boolean.annotate({
      description: "Show the preview to the user. Default true. False for background only.",
    }),
  ),
  show: Schema.optional(
    Schema.Boolean.annotate({
      description: "Old alias for `open`.",
    }),
  ),
  reuseExistingTab: Schema.optional(
    Schema.Boolean.annotate({
      description: "Reuse `tabId`, or your current tab. Default true. False makes a new tab.",
    }),
  ),
  profileId: Schema.optional(TrimmedNonEmptyString.check(Schema.isMaxLength(64))).annotate({
    description: PROFILE_GUIDANCE,
  }),
}).check(
  Schema.makeFilter(
    (input) =>
      !(input.tabId !== undefined && input.reuseExistingTab === false) ||
      "tabId cannot be combined with reuseExistingTab=false.",
  ),
);
```

## PreviewAutomationDialogInput (previewAutomation.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/previewAutomation.ts:132–136](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/previewAutomation.ts#L132-L136) · SHA-256 `854eda65f1a831dfb47ece9ec15cf4c425bd1e7611d3d7004ff9fdcf72dcdcb2`

```typescript
export const PreviewAutomationDialogInput = Schema.Struct({
  ...PreviewAutomationTabTargetFields,
  accept: Schema.Boolean,
  promptText: Schema.optional(Schema.String),
});
```

## BrowserNavigationTarget (previewAutomation.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/previewAutomation.ts:171–194](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/previewAutomation.ts#L171-L194) · SHA-256 `5ea90395c4c05acf82506e148d4132618fd15aadc77323d3a3391358b717979e`

```typescript
export const BrowserNavigationTarget = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("url"),
    url: BoundedUrl.annotate({
      description: `Website URL. ${URL_GUIDANCE}`,
    }),
  }),
  Schema.Struct({
    kind: Schema.Literal("environment-port"),
    port: Schema.Int.check(Schema.isGreaterThan(0))
      .check(Schema.isLessThan(65_536))
      .annotate({ description: "Dev-server port here." }),
    protocol: Schema.optional(
      Schema.Literals(["http", "https"]).annotate({
        description: "Default http.",
      }),
    ),
    path: Schema.optional(
      Schema.String.annotate({
        description: "Path, query, and fragment, such as /settings?tab=account.",
      }),
    ),
  }),
]);
```

## OptionalTimeoutMs (previewAutomation.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/previewAutomation.ts:21–24](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/previewAutomation.ts#L21-L24) · SHA-256 `3529858dae7ff9f15df5554fdd1f5c0024369cad54e3c6563a2eeef6c284b291`

```typescript
const OptionalTimeoutMs = Schema.optional(
  Schema.Int.check(Schema.isGreaterThan(0)).check(Schema.isLessThanOrEqualTo(60_000)),
).annotate({ description: "Default 15000." });

```

## PreviewAutomationNavigateInput (previewAutomation.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/previewAutomation.ts:197–213](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/previewAutomation.ts#L197-L213) · SHA-256 `d280063000292d73205c36aaf7c0098e6ac36266ebe27972ee26c2619c8a099a`

```typescript
export const PreviewAutomationNavigateInput = Schema.Struct({
  ...PreviewAutomationTabTargetFields,
  url: Schema.optional(BoundedUrl).annotate({
    description: `Website URL. ${URL_GUIDANCE} For public pages.`,
  }),
  target: Schema.optional(BrowserNavigationTarget),
  readiness: Schema.optional(Schema.Literals(["load", "domContentLoaded", "none"])).annotate({
    description: "Default 'load'. 'none': return at once.",
  }),
  timeoutMs: OptionalTimeoutMs,
}).check(
  Schema.makeFilter(
    (input) =>
      Number(input.url !== undefined) + Number(input.target !== undefined) === 1 ||
      "Provide exactly one of url or target.",
  ),
);
```

## PREVIEW_VIEWPORT_PRESET_IDS (preview.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/preview.ts:48–67](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/preview.ts#L48-L67) · SHA-256 `f70b1e591282ecec5144bc64319be9f97016bd6114dd5d71dc4afcf277b3a92e`

```typescript
export const PREVIEW_VIEWPORT_PRESET_IDS = [
  "iphone-se",
  "iphone-xr",
  "iphone-12-pro",
  "iphone-14-pro-max",
  "pixel-7",
  "samsung-galaxy-s8-plus",
  "samsung-galaxy-s20-ultra",
  "ipad-mini",
  "ipad-air",
  "ipad-pro",
  "surface-pro-7",
  "surface-duo",
  "galaxy-z-fold-5",
  "asus-zenbook-fold",
  "samsung-galaxy-a51-71",
  "nest-hub",
  "nest-hub-max",
] as const;

```

## PreviewViewportPresetId (preview.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/preview.ts:68–68](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/preview.ts#L68-L68) · SHA-256 `9ec4c1045c1e38802df749d98ce9c975e9e7fb1bc304c27e682dc2f290789d93`

```typescript
export const PreviewViewportPresetId = Schema.Literals(PREVIEW_VIEWPORT_PRESET_IDS);
```

## PREVIEW_VIEWPORT_MIN_DIMENSION (preview.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/preview.ts:18–18](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/preview.ts#L18-L18) · SHA-256 `9861c777671661a74071c7de06cdf5b5b62f8c0e5c974c8369ee0ec788526508`

```typescript
export const PREVIEW_VIEWPORT_MIN_DIMENSION = 240;
```

## PREVIEW_VIEWPORT_MAX_DIMENSION (preview.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/preview.ts:19–19](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/preview.ts#L19-L19) · SHA-256 `764dffdc16fda2612d44f26f7bd3e08a9a60cbcf1ea94c971bb12a475efe6a31`

```typescript
export const PREVIEW_VIEWPORT_MAX_DIMENSION = 3840;
```

## PreviewViewportDimension (preview.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/preview.ts:22–28](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/preview.ts#L22-L28) · SHA-256 `5390f48fa5b504911b24a2fce564ac78c1890562ae614926103d30ca069c7f4b`

```typescript
const PreviewViewportDimension = Schema.Int.check(
  Schema.isBetween({
    minimum: PREVIEW_VIEWPORT_MIN_DIMENSION,
    maximum: PREVIEW_VIEWPORT_MAX_DIMENSION,
  }),
);

```

## PreviewViewportSize (preview.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/preview.ts:35–38](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/preview.ts#L35-L38) · SHA-256 `d063cf81af121c121df7e53c784a24eb5c4e3bf728c4ab73b84d0e6a176346f4`

```typescript
export const PreviewViewportSize = Schema.Struct({
  width: PreviewViewportDimension,
  height: PreviewViewportDimension,
}).check(viewportAreaFilter);
```

## PREVIEW_VIEWPORT_MAX_AREA (preview.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/preview.ts:20–21](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/preview.ts#L20-L21) · SHA-256 `0237718bc8d5c6fe563470b20068c3b4e7c9445caac2b42a0f1785e6a7291c87`

```typescript
export const PREVIEW_VIEWPORT_MAX_AREA = 3840 * 2160;

```

## PreviewAutomationResizeInput (previewAutomation.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/previewAutomation.ts:216–247](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/previewAutomation.ts#L216-L247) · SHA-256 `26406c122a017e3c785b8bffb64d77fd589306002d02b5798807066429d9c6c1`

```typescript
export const PreviewAutomationResizeInput = Schema.Struct({
  ...PreviewAutomationTabTargetFields,
  mode: Schema.Literals(["fill", "freeform", "preset"]),
  preset: Schema.optional(PreviewViewportPresetId),
  width: Schema.optional(PreviewViewportSize.fields.width),
  height: Schema.optional(PreviewViewportSize.fields.height),
  orientation: Schema.optional(Schema.Literals(["portrait", "landscape"])),
  timeoutMs: OptionalTimeoutMs,
}).check(
  Schema.makeFilter((input) => {
    const hasPreset = input.preset !== undefined;
    const hasWidth = input.width !== undefined;
    const hasHeight = input.height !== undefined;
    if (hasWidth !== hasHeight) return "Custom dimensions require both width and height.";
    if (input.mode === "fill") {
      return !hasPreset && !hasWidth && input.orientation === undefined
        ? true
        : "Fill mode does not accept a preset, dimensions, or orientation.";
    }
    if (input.mode === "freeform") {
      if (!hasWidth || !hasHeight || hasPreset || input.orientation !== undefined) {
        return "Freeform mode requires width and height and does not accept a preset or orientation.";
      }
    } else if (!hasPreset || hasWidth || hasHeight) {
      return "Preset mode requires a preset and does not accept custom dimensions.";
    }
    if (hasWidth && hasHeight && input.width! * input.height! > PREVIEW_VIEWPORT_MAX_AREA) {
      return `Custom viewport area must not exceed ${PREVIEW_VIEWPORT_MAX_AREA} pixels.`;
    }
    return true;
  }),
);
```

## PreviewAutomationColorScheme (previewAutomation.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/previewAutomation.ts:258–258](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/previewAutomation.ts#L258-L258) · SHA-256 `b91fa35f0e44e99c1e481b5d4ab08065c2b3acdaf3081d28e5d7685a934c511c`

```typescript
export const PreviewAutomationColorScheme = Schema.Literals(["system", "light", "dark"]);
```

## PreviewAutomationSetColorSchemeInput (previewAutomation.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/previewAutomation.ts:261–264](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/previewAutomation.ts#L261-L264) · SHA-256 `9f7e366c97119480a8f24a8bfefa8836b7b4b57907b8055dc390800e744a8c71`

```typescript
export const PreviewAutomationSetColorSchemeInput = Schema.Struct({
  ...PreviewAutomationTabTargetFields,
  colorScheme: PreviewAutomationColorScheme,
});
```

## Locator (previewAutomation.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/previewAutomation.ts:274–274](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/previewAutomation.ts#L274-L274) · SHA-256 `712867376cf0943ae5257ad2a1ff465ccfae385bb15c6798f54889b73aff4fc4`

```typescript
const Locator = TrimmedNonEmptyString;
```

## LegacySelector (previewAutomation.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/previewAutomation.ts:275–276](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/previewAutomation.ts#L275-L276) · SHA-256 `86477eddfc082d9f7d56622f07744223013f6e0105310160ef2850e5607bc6fa`

```typescript
const LegacySelector = TrimmedNonEmptyString;

```

## PreviewAutomationPressInput (previewAutomation.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/previewAutomation.ts:391–395](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/previewAutomation.ts#L391-L395) · SHA-256 `7239261eeb5d26f4f4122087b8a5de2346a5a25911663a827ab4e01ef628441a`

```typescript
export const PreviewAutomationPressInput = Schema.Struct({
  ...PreviewAutomationTabTargetFields,
  key: Schema.String.check(Schema.isTrimmed()).check(Schema.isNonEmpty()),
  modifiers: Schema.optional(Schema.Array(Schema.Literals(["Alt", "Control", "Meta", "Shift"]))),
});
```

## PreviewAutomationActInput (previewAutomation.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/previewAutomation.ts:428–457](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/previewAutomation.ts#L428-L457) · SHA-256 `6e4cb1f5999f7d944e7e7df1a7f15b096dd090344acee1789ac7587783ccd688`

```typescript
export const PreviewAutomationActInput = Schema.Struct({
  action: Schema.Literals([
    "click",
    "type",
    "hover",
    "select",
    "drag",
    "upload",
    "press",
    "scroll",
  ]),
  ...PreviewAutomationTabTargetFields,
  locator: Schema.optional(Locator),
  selector: Schema.optional(LegacySelector),
  x: Schema.optional(Schema.Finite),
  y: Schema.optional(Schema.Finite),
  button: Schema.optional(Schema.Literals(["left", "right", "middle"])),
  clickCount: Schema.optional(Schema.Int),
  text: Schema.optional(Schema.String),
  clear: Schema.optional(Schema.Boolean),
  values: Schema.optional(Schema.Array(Schema.String)),
  source: Schema.optional(Locator),
  target: Schema.optional(Locator),
  paths: Schema.optional(Schema.Array(Schema.String)),
  key: Schema.optional(Schema.String),
  modifiers: PreviewAutomationPressInput.fields.modifiers,
  deltaX: Schema.optional(Schema.Finite),
  deltaY: Schema.optional(Schema.Finite),
  timeoutMs: Schema.optional(Schema.Int),
});
```

## PreviewAutomationEvaluateInput (previewAutomation.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/previewAutomation.ts:460–471](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/previewAutomation.ts#L460-L471) · SHA-256 `16a8fd553a1978a7a8735a34a4c2514ea064efe7a1cd247f0f4652f590ccc632`

```typescript
export const PreviewAutomationEvaluateInput = Schema.Struct({
  ...PreviewAutomationTabTargetFields,
  expression: Schema.String.check(Schema.isTrimmed())
    .check(Schema.isNonEmpty())
    .check(Schema.isMaxLength(64_000)),
  awaitPromise: Schema.optional(Schema.Boolean.annotate({ description: "Default true." })),
  returnByValue: Schema.optional(
    Schema.Boolean.annotate({
      description: "False returns a ref. Default true.",
    }),
  ),
});
```

## PreviewAutomationWaitForInput (previewAutomation.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/previewAutomation.ts:474–496](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/previewAutomation.ts#L474-L496) · SHA-256 `ce00850215158cdc633384b8cff4eead94a84b92c80fd8d332cc4e602974933c`

```typescript
export const PreviewAutomationWaitForInput = Schema.Struct({
  ...PreviewAutomationTabTargetFields,
  selector: Schema.optional(LegacySelector),
  locator: Schema.optional(Locator),
  text: Schema.optional(TrimmedNonEmptyString).annotate({
    description: "Case counts.",
  }),
  urlIncludes: Schema.optional(TrimmedNonEmptyString),
  timeoutMs: OptionalTimeoutMs,
}).check(
  Schema.makeFilter((input) => {
    if (input.selector !== undefined && input.locator !== undefined) {
      return "Provide at most one of selector or locator.";
    }
    return (
      input.selector !== undefined ||
      input.locator !== undefined ||
      input.text !== undefined ||
      input.urlIncludes !== undefined ||
      "Provide at least one wait condition."
    );
  }),
);
```

## ProjectCreatePayload (project.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/project.ts:176–182](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/project.ts#L176-L182) · SHA-256 `76a4d9a0fe75f443a3bcbe824a47efc7aa4b53868c91f718d626b6c1dcb3f5f5`

```typescript
export const ProjectCreatePayload = Schema.Struct({
  title: TrimmedNonEmptyString,
  workspaceRoot: TrimmedNonEmptyString,
  createWorkspaceRootIfMissing: Schema.optional(Schema.Boolean),
  defaultModelSelection: Schema.optional(Schema.NullOr(ModelSelection)),
  scripts: Schema.optional(Schema.Array(ProjectScript)),
});
```

## ProjectUpdatePayload (project.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/project.ts:185–194](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/project.ts#L185-L194) · SHA-256 `32fbde2caf9067d1dbed3083678d3ac52c884136cab0073428e315577f5ee188`

```typescript
export const ProjectUpdatePayload = Schema.Struct({
  title: Schema.optional(TrimmedNonEmptyString),
  workspaceRoot: Schema.optional(TrimmedNonEmptyString),
  defaultModelSelection: Schema.optional(Schema.NullOr(ModelSelection)),
  autoPull: Schema.optional(Schema.Boolean),
  projectIcon: Schema.optional(Schema.NullOr(ProjectIconOverride)),
  faviconPath: Schema.optional(Schema.NullOr(TrimmedNonEmptyString)),
  defaultThreadEnvMode: Schema.optional(Schema.NullOr(ThreadEnvMode)),
  scripts: Schema.optional(Schema.Array(ProjectScript)),
});
```

## SourceControlCloneProtocol (sourceControl.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/sourceControl.ts:51–51](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/sourceControl.ts#L51-L51) · SHA-256 `a2d4c5ef6ea77b21f46bca3e1d9aeb20038e8705d5ee3b897b33f0a91987e59c`

```typescript
export const SourceControlCloneProtocol = Schema.Literals(["auto", "ssh", "https"]);
```

## SourceControlCloneRepositoryInput (sourceControl.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/sourceControl.ts:69–75](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/sourceControl.ts#L69-L75) · SHA-256 `605ecb62ec3c52e685d8cb725579598c352ff749b9faf059a40118a96220309e`

```typescript
export const SourceControlCloneRepositoryInput = Schema.Struct({
  provider: Schema.optional(SourceControlProviderKind),
  repository: Schema.optional(TrimmedNonEmptyString),
  remoteUrl: Schema.optional(TrimmedNonEmptyString),
  destinationPath: TrimmedNonEmptyString,
  protocol: Schema.optional(SourceControlCloneProtocol),
});
```

## OrchestrationV2ThreadLaunchWorkspaceStrategy (orchestrationV2.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/orchestrationV2.ts:644–660](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/orchestrationV2.ts#L644-L660) · SHA-256 `20d928733ff44f1cec154bf648203e246bfddd3b2738631bcc39ef83e11529d5`

```typescript
export const OrchestrationV2ThreadLaunchWorkspaceStrategy = Schema.Union([
  Schema.Struct({
    type: Schema.Literal("root"),
    branch: Schema.optional(TrimmedNonEmptyString),
  }),
  Schema.Struct({
    type: Schema.Literal("existing_worktree"),
    worktreePath: TrimmedNonEmptyString,
    branch: Schema.optional(TrimmedNonEmptyString),
  }),
  Schema.Struct({
    type: Schema.Literal("worktree"),
    baseRef: TrimmedNonEmptyString,
    branch: Schema.optional(TrimmedNonEmptyString),
    startFromOrigin: Schema.optional(Schema.Boolean),
  }),
]);
```

## OrchestrationV2DelegatedFrom (orchestrationV2.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/orchestrationV2.ts:134–138](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/orchestrationV2.ts#L134-L138) · SHA-256 `8c46a9946365d6aeb444cad2c981d14605944f94d90f8c5d10fa0a469aaa22f0`

```typescript
export const OrchestrationV2DelegatedFrom = Schema.Struct({
  environmentId: EnvironmentId,
  threadId: ThreadId,
  title: Schema.String,
});
```

## PullRequestTargetInput (tools.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[apps/server/src/mcp/toolkits/pullRequests/tools.ts:36–59](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/pullRequests/tools.ts#L36-L59) · SHA-256 `c87567d7ab2e027e03b997077e299554441921d78146518cac8b81ff5775f9c8`

```typescript
export const PullRequestTargetInput = Schema.Struct({
  environmentId: OrchestratorMcpEnvironmentTarget,
  threadId: Schema.optional(
    ThreadId.annotate({
      description: "Thread. Default: this thread.",
    }),
  ),
  url: Schema.optional(TrimmedNonEmptyString),
  repository: Schema.optional(
    TrimmedNonEmptyString.annotate({
      description: "With `number`, when no `url`.",
    }),
  ),
  number: Schema.optional(
    PositiveInt.annotate({
      description: "With `repository`, when no `url`.",
    }),
  ),
  host: Schema.optional(
    TrimmedNonEmptyString.annotate({
      description: "Default: this project's host.",
    }),
  ),
});
```

## GuideTarget (tools.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[apps/server/src/mcp/toolkits/pullRequests/tools.ts:346–352](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/pullRequests/tools.ts#L346-L352) · SHA-256 `8503aa89ec5aa9e368c478cc4fcd1a36067ff9b1af0e7d53392551fbdc418ef2`

```typescript
const GuideTarget = Schema.Struct({
  url: PullRequestTargetInput.fields.url,
  repository: PullRequestTargetInput.fields.repository,
  number: PullRequestTargetInput.fields.number,
  host: PullRequestTargetInput.fields.host,
});

```

## QUEUE_READ_ACTIONS (tools.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[apps/server/src/mcp/toolkits/thread/tools.ts:82–82](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/thread/tools.ts#L82-L82) · SHA-256 `5691274bbcb400c5dd73bec8a7f37397c7e78108da97d04b6aa099709bb1f74a`

```typescript
const QUEUE_READ_ACTIONS = ["list", "read"] as const;
```

## RuntimeRequestId (baseSchemas.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/baseSchemas.ts:313–313](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/baseSchemas.ts#L313-L313) · SHA-256 `2048262aa1627c28140d5f9c19ba0a17f3190f6ac8fbda04d542f2a395705d6e`

```typescript
export const RuntimeRequestId = makeEntityId("RuntimeRequestId");
```

## ProviderUserInputAnswers (providerPolicy.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/providerPolicy.ts:68–68](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/providerPolicy.ts#L68-L68) · SHA-256 `6cfe33c77cd434af1be7f1ad716549e31d9a8ae5b0a56f355ed40c647fdf5e44`

```typescript
export const ProviderUserInputAnswers = Schema.Record(Schema.String, Schema.Unknown);
```

## CheckpointId (baseSchemas.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/baseSchemas.ts:324–324](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/baseSchemas.ts#L324-L324) · SHA-256 `75f22708330903428249ca43ae113c46a4c59109b62a4fa01b1333aa8df23ee3`

```typescript
export const CheckpointId = makeEntityId("CheckpointId");
```

## OrchestrationV2ThreadForkSourcePoint (orchestrationV2.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/orchestrationV2.ts:179–183](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/orchestrationV2.ts#L179-L183) · SHA-256 `f665744c8a837a3b1b6e383bc93ba23511b9683095ebaa8f8e06e4396fc38676`

```typescript
export const OrchestrationV2ThreadForkSourcePoint = Schema.Union([
  Schema.Struct({ type: Schema.Literal("latest_stable") }),
  Schema.Struct({ type: Schema.Literal("run"), runId: RunId }),
  Schema.Struct({ type: Schema.Literal("checkpoint"), checkpointId: CheckpointId }),
]);
```

## THREAD_SEARCH_QUERY_MAX_LENGTH (threadSearch.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/threadSearch.ts:16–19](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/threadSearch.ts#L16-L19) · SHA-256 `1200047ef268447ffbd25a142c1c238aec3638f3d92f34015b99857ee719f3b6`

```typescript
export const THREAD_SEARCH_QUERY_MAX_LENGTH = 200;

// The server's SQLite client is synchronous and single-connection. Bound both
// scan input and response size so a search cannot monopolize that connection.
```

## OrchestrationSearchThreadsInput (threadSearch.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/threadSearch.ts:20–26](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/threadSearch.ts#L20-L26) · SHA-256 `d98a67d71bb1af4dc4115900daf1959c533e20dc84cb0b18689f4db5564652af`

```typescript
export const OrchestrationSearchThreadsInput = Schema.Struct({
  query: TrimmedString.check(
    Schema.isMinLength(2),
    Schema.isMaxLength(THREAD_SEARCH_QUERY_MAX_LENGTH),
  ),
  limit: Schema.optionalKey(Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 50 }))),
});
```

## WorktreeMcpHandoffInput (worktreeMcp.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/worktreeMcp.ts:6–29](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/worktreeMcp.ts#L6-L29) · SHA-256 `ca18162566e035103c9898c7f351a8b65058eb4c7cb01c40001a8cd477140124`

```typescript
export const WorktreeMcpHandoffInput = Schema.Struct({
  branch: TrimmedNonEmptyString,
  baseRef: Schema.optional(
    TrimmedNonEmptyString.annotate({
      description: "Default: checked-out branch.",
    }),
  ),
  startFromOrigin: Schema.optional(
    Schema.Boolean.annotate({
      description:
        "True: fetch, start from the remote ref; check `startedFromOrigin`. Default: server setting.",
    }),
  ),
  runSetupScript: Schema.optional(
    Schema.Boolean.annotate({
      description: "Default true.",
    }),
  ),
  continuationPrompt: Schema.optional(
    TrimmedNonEmptyString.check(Schema.isMaxLength(120_000)).annotate({
      description: "Work to resume in the worktree next turn. Omitted: thread waits.",
    }),
  ),
});
```

## TrimmedNonEmptyStringSchema (git.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/git.ts:14–14](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/git.ts#L14-L14) · SHA-256 `3e038624b7aeb32a01543979a11a0c46eb885ff5104580c2be45da15c91e2757`

```typescript
const TrimmedNonEmptyStringSchema = TrimmedNonEmptyString;
```

## GIT_LIST_BRANCHES_MAX_LIMIT (git.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/git.ts:16–17](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/git.ts#L16-L17) · SHA-256 `168dfd060dbcf7840d7b0bc4c4c9a8553e4b09059fcf4bb2ccdaf42bbfa6e88e`

```typescript
const GIT_LIST_BRANCHES_MAX_LIMIT = 200;

```

## VcsListRefsInput (git.ts)

Complete Effect/TypeScript parameter-schema source, including annotations and dependent schema links. Not a captured wire schema.

**When:** Referenced by a T3 MCP tool parameter schema, directly or transitively; availability follows the tool registry and per-launch capabilities.

[packages/contracts/src/git.ts:138–148](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/contracts/src/git.ts#L138-L148) · SHA-256 `839faa4045399bb4921d6ea44bf33b7fdc1f919e08c0f12ea22ac6a538f4b313`

```typescript
export const VcsListRefsInput = Schema.Struct({
  cwd: TrimmedNonEmptyStringSchema,
  query: Schema.optional(TrimmedNonEmptyStringSchema.check(Schema.isMaxLength(256))),
  cursor: Schema.optional(NonNegativeInt),
  includeMatchingRemoteRefs: Schema.optional(Schema.Boolean),
  refKind: Schema.optional(Schema.Literals(["all", "local", "remote"])),
  refresh: Schema.optional(Schema.Boolean),
  limit: Schema.optional(
    PositiveInt.check(Schema.isLessThanOrEqualTo(GIT_LIST_BRANCHES_MAX_LIMIT)),
  ),
});
```
