import { describe, expect, it } from "vitest";
import { analyzeContent, cosine, verdictFor, toCsv, toMarkdown, type Vectors } from "./analyze";
import type { ParsedKeyword } from "./text";

const v = (...values: number[]) => new Float32Array(values);

/** Two orthogonal axes make the expectations readable: [a, b]. */
const chunks = (vectors: number[][]) => ({
  chunks: vectors.map((_, i) => ({ id: i, heading: `H${i}`, text: `passage ${i}`, words: 10 })),
  vectors: vectors.map((row) => v(...row)),
}) as Vectors;

describe("cosine", () => {
  it("is 1 for the same direction and 0 for orthogonal vectors", () => {
    expect(cosine(v(1, 0), v(2, 0))).toBeCloseTo(1);
    expect(cosine(v(1, 0), v(0, 1))).toBeCloseTo(0);
  });
});

describe("verdictFor", () => {
  it("separates a covered keyword from one that merely appears", () => {
    expect(verdictFor(0.72)).toBe("covered");
    expect(verdictFor(0.4)).toBe("thin");
    expect(verdictFor(0.1)).toBe("missing");
  });
});

describe("analyzeContent", () => {
  const keywords: ParsedKeyword[] = [
    { term: "pricing", weight: 1 },
    { term: "automation", weight: 3 },
  ];

  it("scores a keyword by its best passage, not by the document average", () => {
    const analysis = analyzeContent({
      keywords,
      keywordVectors: [v(1, 0), v(0, 1)],
      // pricing appears strongly in one passage; automation is absent everywhere.
      // The vectors are near-orthogonal so "absent" really is absent: a passage
      // like [0.2, 0.2] shares its direction with both axes.
      main: chunks([[1, 0], [0.9, -0.2], [0, 0]]),
      competitor: null,
    });

    const pricing = analysis.keywords.find((row) => row.term === "pricing")!;
    expect(pricing.verdict).toBe("covered");
    expect(pricing.evidence?.text).toBe("passage 0");

    const automation = analysis.keywords.find((row) => row.term === "automation")!;
    expect(automation.verdict).toBe("missing");
  });

  it("weights the overall coverage by the importance a person set", () => {
    const analysis = analyzeContent({
      keywords,
      keywordVectors: [v(1, 0), v(0, 1)],
      main: chunks([[1, 0], [0.9, 0.1], [0.8, -0.2]]),
      competitor: null,
    });
    // pricing (weight 1) is fully covered, automation (weight 3) is weak.
    expect(analysis.overall.alignment).toBeGreaterThan(0.2);
    expect(analysis.overall.alignment).toBeLessThan(0.5);
  });

  it("calls out the keywords the competitor answers better", () => {
    const analysis = analyzeContent({
      keywords,
      keywordVectors: [v(1, 0), v(0, 1)],
      main: chunks([[0.2, 0.9], [0.1, 0.1]]),
      competitor: chunks([[0.95, 0.1], [0.2, 0.9]]),
    });
    expect(analysis.gaps.map((gap) => gap.term)).toContain("pricing");
    expect(analysis.overall.competitorAlignment).toBeGreaterThan(analysis.overall.alignment);
  });

  it("flags keywords so close that a page competes with itself", () => {
    const analysis = analyzeContent({
      keywords: [
        { term: "seo pricing", weight: 1 },
        { term: "seo cost", weight: 1 },
        { term: "hiring", weight: 1 },
      ],
      keywordVectors: [v(1, 0.05), v(1, 0.06), v(0, 1)],
      main: chunks([[1, 0]]),
      competitor: null,
    });
    expect(analysis.clusters).toHaveLength(1);
    expect(analysis.clusters[0].terms).toEqual(["seo pricing", "seo cost"]);
  });

  it("orders keywords weakest first, because that is the work", () => {
    const analysis = analyzeContent({
      keywords,
      keywordVectors: [v(1, 0), v(0, 1)],
      main: chunks([[1, 0], [0.9, 0.1], [0.8, -0.2]]),
      competitor: null,
    });
    expect(analysis.keywords[0].term).toBe("automation");
  });
});

describe("exports", () => {
  const analysis = analyzeContent({
    keywords: [{ term: "pricing", weight: 2 }],
    keywordVectors: [v(1, 0)],
    main: chunks([[1, 0]]),
    competitor: chunks([[0.5, 0.5]]),
  });

  it("writes a CSV with one row per keyword", () => {
    const csv = toCsv(analysis);
    expect(csv.split("\n")).toHaveLength(2);
    expect(csv).toContain('"pricing",2');
  });

  it("writes a markdown report that states the numbers it claims", () => {
    const markdown = toMarkdown(analysis, { pages: "1 page", keywords: 1 });
    expect(markdown).toContain("Weighted coverage: **100%**");
    expect(markdown).toContain("| pricing | 100% | covered |");
  });
});
