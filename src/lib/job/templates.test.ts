import { describe, expect, it } from "vitest";
import {
  CL_TEMPLATES,
  CV_TEMPLATES,
  DEFAULT_CL_TEMPLATE,
  DEFAULT_CV_TEMPLATE,
  isClTemplateId,
  isCvTemplateId,
} from "./templates";

describe("cv templates", () => {
  it("exposes a default that is one of the variants", () => {
    expect(isCvTemplateId(DEFAULT_CV_TEMPLATE)).toBe(true);
  });

  it("recognizes every listed template id", () => {
    for (const template of CV_TEMPLATES) {
      expect(isCvTemplateId(template.id)).toBe(true);
    }
  });

  it("rejects unknown values", () => {
    expect(isCvTemplateId("fancy")).toBe(false);
    expect(isCvTemplateId(42)).toBe(false);
    expect(isCvTemplateId(null)).toBe(false);
  });
});

describe("cover letter templates", () => {
  it("exposes a default that is one of the variants", () => {
    expect(isClTemplateId(DEFAULT_CL_TEMPLATE)).toBe(true);
  });

  it("recognizes every listed template id", () => {
    for (const template of CL_TEMPLATES) {
      expect(isClTemplateId(template.id)).toBe(true);
    }
  });

  it("rejects unknown values", () => {
    expect(isClTemplateId("fancy")).toBe(false);
    expect(isClTemplateId(undefined)).toBe(false);
  });
});