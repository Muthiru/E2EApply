import { describe, expect, it } from "vitest";
import { GHOST_AFTER_DAYS, isLikelyGhosted } from "./tracker";

const now = new Date("2026-08-17T12:00:00Z");
const day = 86_400_000;

describe("isLikelyGhosted", () => {
  it("flags stale pending applications", () => {
    expect(
      isLikelyGhosted(
        "PENDING",
        new Date(now.getTime() - (GHOST_AFTER_DAYS + 1) * day),
        now,
      ),
    ).toBe(true);
  });

  it("does not flag applications before the threshold", () => {
    expect(
      isLikelyGhosted(
        "APPLIED",
        new Date(now.getTime() - (GHOST_AFTER_DAYS - 1) * day),
        now,
      ),
    ).toBe(false);
  });

  it("does not flag statuses with a definitive outcome", () => {
    expect(isLikelyGhosted("OFFER", new Date(0), now)).toBe(false);
    expect(isLikelyGhosted("REJECTED", new Date(0), now)).toBe(false);
    expect(isLikelyGhosted("GHOSTED", new Date(0), now)).toBe(false);
    expect(isLikelyGhosted("WITHDRAWN", new Date(0), now)).toBe(false);
  });

  it("does not flag applications without an event", () => {
    expect(isLikelyGhosted("PENDING", null, now)).toBe(false);
  });
});