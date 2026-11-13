import { describe, expect, it } from "vitest";
import { chunkText, parseKeywords, toPlainText } from "./text";

describe("parseKeywords", () => {
  it("reads a list however a person types it", () => {
    const parsed = parseKeywords("content marketing, semantic SEO\n\n* topical authority; search intent");
    expect(parsed.map((k) => k.term)).toEqual([
      "content marketing",
      "semantic SEO",
      "topical authority",
      "search intent",
    ]);
    expect(parsed.every((k) => k.weight === 1)).toBe(true);
  });

  it("reads weights and keeps the highest when a term repeats", () => {
    const parsed = parseKeywords("pricing:3\nPricing (2)\ninternal links");
    expect(parsed).toEqual([
      { term: "pricing", weight: 3 },
      { term: "internal links", weight: 1 },
    ]);
  });

  it("never treats a bare number as a keyword and caps absurd weights", () => {
    const parsed = parseKeywords("semantics:99, 42");
    expect(parsed).toEqual([{ term: "semantics", weight: 5 }]);
  });
});

describe("toPlainText", () => {
  it("turns pasted HTML into readable text and keeps headings", () => {
    const html = "<h2>Cost</h2><p>From &euro;500&nbsp;per month.</p><script>alert(1)</script>";
    const text = toPlainText(html);
    expect(text).toContain("## Cost");
    expect(text).toContain("From €500 per month.");
  });
});

describe("chunkText", () => {
  it("starts a new passage at every heading and never crosses one", () => {
    const chunks = chunkText(
      "## What it costs\n\nA short sentence about price.\n\n## How it works\n\nAnother short sentence about the process.",
    );
    expect(chunks.map((c) => c.heading)).toEqual(["What it costs", "How it works"]);
  });

  it("glues short paragraphs together so a page is not a hundred fragments", () => {
    const chunks = chunkText("One line.\n\nTwo line.\n\nThree line.\n\nFour line.");
    expect(chunks).toHaveLength(1);
    expect(chunks[0].words).toBeGreaterThan(6);
  });

  it("returns nothing for empty input rather than one empty passage", () => {
    expect(chunkText("   \n\n ")).toEqual([]);
  });
});
