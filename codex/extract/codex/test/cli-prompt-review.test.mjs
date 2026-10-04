import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { reviewedConstant, constantDisposition } from "../lib/cli-prompt-review.mjs";
const sha = text => crypto.createHash("sha256").update(text).digest("hex");
const sourceCommit = "a".repeat(40);

test("a low classifier score stays unresolved until a source review decides its role", () => {
  const candidate={source:"context.rs::GUIDANCE",text:"The turn was interrupted.",source_context:"DeveloperInstructions::new(GUIDANCE)",model_facing:0.61};
  assert.equal(constantDisposition(candidate,null),"pending-source-review");
  const review={source:candidate.source,source_commit:sourceCommit,sha256:sha(candidate.text),source_context_sha256:sha(candidate.source_context),model_facing:true};
  assert.equal(constantDisposition(candidate,reviewedConstant(candidate,[review],sourceCommit)),"publish");
  assert.equal(constantDisposition(candidate,{...review,model_facing:false}),"source-reviewed-negative");
  assert.equal(reviewedConstant({...candidate,text:"Changed instructions."},[review],sourceCommit),null);
  assert.equal(reviewedConstant({...candidate,source_context:"UILabel::new(GUIDANCE)"},[review],sourceCommit),null);
  assert.equal(constantDisposition({...candidate,withheld_reason:"privacy rejection"},review),"withheld");
});

test("a source review expires when distant call sites change in another source revision", () => {
  const candidate={source:"context.rs::GUIDANCE",text:"The turn was interrupted.",source_context:"pub const GUIDANCE: &str = ..."};
  const review={source:candidate.source,source_commit:sourceCommit,sha256:sha(candidate.text),source_context_sha256:sha(candidate.source_context),model_facing:true};
  assert.equal(reviewedConstant(candidate,[review],"b".repeat(40)),null);
  assert.equal(reviewedConstant(candidate,[review]),null);
  assert.equal(reviewedConstant(candidate,[{...review,source_commit:undefined}],sourceCommit),null);
  assert.equal(reviewedConstant(candidate,[review],sourceCommit),review);
});
