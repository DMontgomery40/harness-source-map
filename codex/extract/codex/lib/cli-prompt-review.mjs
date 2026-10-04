import crypto from "node:crypto";
const sha = text => crypto.createHash("sha256").update(text).digest("hex");

// The inspected commit binds distant call sites too. A new revision needs a new review,
// even if the declaration and its immediate neighborhood have not changed.
export function reviewedConstant(candidate, reviews, sourceCommit) {
  if (!/^[a-f0-9]{40}$/.test(sourceCommit ?? "")) return null;
  return reviews.find(review => review.source === candidate.source && review.sha256 === sha(candidate.text)
    && review.source_context_sha256 === sha(candidate.source_context) && review.source_commit === sourceCommit) ?? null;
}

export function constantDisposition(candidate, review) {
  if (candidate.withheld_reason) return "withheld";
  if (review) return review.model_facing ? "publish" : "source-reviewed-negative";
  return candidate.model_facing >= 0.8 ? "publish" : "pending-source-review";
}
