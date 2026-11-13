/**
 * Scoring. No I/O, no model, no React — every number here is a function of
 * vectors that are already computed, which is what makes it testable and what
 * lets the same logic run in a worker or in a test.
 */
import type { Chunk, ParsedKeyword } from "./text";

export interface Vectors {
  /** Same order and length as the chunks passed with it. */
  chunks: Chunk[];
  vectors: Float32Array[];
}

export interface KeywordRow {
  term: string;
  weight: number;
  /** Best passage match for this keyword in your content, 0..1. */
  score: number;
  /** The same for the competitor, 0..1, or null when none was given. */
  competitorScore: number | null;
  /** Which passage is the evidence — the one that scored best. */
  evidence: { heading: string; text: string; score: number } | null;
  verdict: "covered" | "thin" | "missing";
}

export interface SectionRow {
  heading: string;
  words: number;
  score: number;
  topKeywords: string[];
}

export interface Cluster {
  terms: string[];
  similarity: number;
}

export interface Analysis {
  keywords: KeywordRow[];
  sections: SectionRow[];
  clusters: Cluster[];
  gaps: KeywordRow[];
  overall: {
    /** How much of what you set out to say the page actually says. */
    coverage: number;
    /** Your page against the keyword set, one number, weighted. */
    alignment: number;
    competitorAlignment: number | null;
    /** Your page against the competitor's, as a document. */
    similarity: number | null;
  };
}

/** Calibrated on all-MiniLM-L6-v2: a paraphrase lands near 0.6, a related but
 *  differently-worded passage near 0.45, an unrelated one under 0.2. */
export const STRONG = 0.5;
export const PRESENT = 0.36;
const GAP_MARGIN = 0.08;
const CLUSTER_SIMILARITY = 0.82;

export function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function centroid(vectors: Float32Array[], weights?: number[]): Float32Array {
  const dims = vectors[0]?.length ?? 0;
  const sum = new Float32Array(dims);
  let total = 0;
  vectors.forEach((vector, i) => {
    const weight = weights?.[i] ?? 1;
    total += weight;
    for (let d = 0; d < dims; d += 1) sum[d] += vector[d] * weight;
  });
  if (total === 0) return sum;
  for (let d = 0; d < dims; d += 1) sum[d] /= total;
  return sum;
}

function bestMatch(
  keyword: Float32Array,
  target: Vectors,
): { score: number; chunk: Chunk | null } {
  let best = -1;
  let chunk: Chunk | null = null;
  target.vectors.forEach((vector, i) => {
    const score = cosine(keyword, vector);
    if (score > best) {
      best = score;
      chunk = target.chunks[i];
    }
  });
  return { score: Math.max(0, best), chunk };
}

export function verdictFor(score: number): KeywordRow["verdict"] {
  if (score >= STRONG) return "covered";
  if (score >= PRESENT) return "thin";
  return "missing";
}

/** Terms that mean nearly the same thing: one page competes with itself. */
export function findClusters(keywords: ParsedKeyword[], vectors: Float32Array[]): Cluster[] {
  const parent = keywords.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  let maxEdge = 0;

  for (let i = 0; i < keywords.length; i += 1) {
    for (let j = i + 1; j < keywords.length; j += 1) {
      const similarity = cosine(vectors[i], vectors[j]);
      if (similarity >= CLUSTER_SIMILARITY) {
        parent[find(j)] = find(i);
        maxEdge = Math.max(maxEdge, similarity);
      }
    }
  }

  const groups = new Map<number, string[]>();
  keywords.forEach((keyword, i) => {
    const root = find(i);
    groups.set(root, [...(groups.get(root) ?? []), keyword.term]);
  });

  return [...groups.values()]
    .filter((terms) => terms.length > 1)
    .map((terms) => ({ terms, similarity: maxEdge }));
}

export function analyzeContent(params: {
  keywords: ParsedKeyword[];
  keywordVectors: Float32Array[];
  main: Vectors;
  competitor: Vectors | null;
}): Analysis {
  const { keywords, keywordVectors, main, competitor } = params;

  const rows: KeywordRow[] = keywords.map((keyword, i) => {
    const mine = bestMatch(keywordVectors[i], main);
    const theirs = competitor ? bestMatch(keywordVectors[i], competitor) : null;
    return {
      term: keyword.term,
      weight: keyword.weight,
      score: mine.score,
      competitorScore: theirs ? theirs.score : null,
      evidence: mine.chunk
        ? { heading: mine.chunk.heading, text: mine.chunk.text, score: mine.score }
        : null,
      verdict: verdictFor(mine.score),
    };
  });

  const weights = keywords.map((k) => k.weight);
  const weightTotal = weights.reduce((a, b) => a + b, 0) || 1;
  const alignment = rows.reduce((sum, row) => sum + row.score * row.weight, 0) / weightTotal;
  const competitorAlignment = competitor
    ? rows.reduce((sum, row) => sum + (row.competitorScore ?? 0) * row.weight, 0) / weightTotal
    : null;

  const keywordCentroid = centroid(keywordVectors, weights);
  const mainCentroid = centroid(main.vectors);
  const competitorCentroid = competitor ? centroid(competitor.vectors) : null;

  const sections: SectionRow[] = main.chunks.map((chunk, i) => {
    const scored = keywordVectors
      .map((vector, k) => ({ term: keywords[k].term, score: cosine(vector, main.vectors[i]) }))
      .sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 3);
    return {
      heading: chunk.heading || `Passage ${i + 1}`,
      words: chunk.words,
      score: top.reduce((sum, row) => sum + row.score, 0) / Math.max(1, top.length),
      topKeywords: top.filter((row) => row.score >= PRESENT).map((row) => row.term),
    };
  });

  return {
    keywords: rows.sort((a, b) => a.score - b.score),
    sections,
    clusters: findClusters(keywords, keywordVectors),
    gaps: rows
      .filter((row) => row.competitorScore !== null && row.competitorScore - row.score >= GAP_MARGIN)
      .sort((a, b) => (b.competitorScore ?? 0) - (a.competitorScore ?? 0)),
    overall: {
      coverage: alignment,
      alignment,
      competitorAlignment,
      similarity: competitorCentroid ? cosine(mainCentroid, competitorCentroid) : null,
    },
  };
}

/** CSV with a column per question a client actually asks. */
export function toCsv(analysis: Analysis): string {
  const header = ["keyword", "weight", "your_score", "verdict", "competitor_score", "evidence_heading", "evidence"];
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const rows = analysis.keywords.map((row) => [
    escape(row.term),
    String(row.weight),
    row.score.toFixed(3),
    row.verdict,
    row.competitorScore === null ? "" : row.competitorScore.toFixed(3),
    escape(row.evidence?.heading ?? ""),
    escape((row.evidence?.text ?? "").slice(0, 400).replace(/\s+/g, " ")),
  ]);
  return [header.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

/** The report pasted into a ticket or a client email. */
export function toMarkdown(analysis: Analysis, meta: { pages: string; keywords: number }): string {
  const pct = (value: number) => `${Math.round(value * 100)}%`;
  const lines = [
    "# Semantic coverage report",
    "",
    `- Keywords analysed: ${meta.keywords}`,
    `- Page: ${meta.pages}`,
    `- Weighted coverage: **${pct(analysis.overall.alignment)}**`,
  ];
  if (analysis.overall.competitorAlignment !== null) {
    lines.push(`- Same page, competitor's coverage: **${pct(analysis.overall.competitorAlignment)}**`);
  }
  if (analysis.overall.similarity !== null) {
    lines.push(`- Whole-page similarity to competitor: **${pct(analysis.overall.similarity)}**`);
  }
  lines.push("", "## Keywords, weakest first", "", "| Keyword | You | Verdict | Competitor |", "| --- | --- | --- | --- |");
  for (const row of analysis.keywords) {
    lines.push(
      `| ${row.term} | ${pct(row.score)} | ${row.verdict} | ${row.competitorScore === null ? "-" : pct(row.competitorScore)} |`,
    );
  }
  if (analysis.gaps.length) {
    lines.push("", "## Where the competitor answers and you do not", "");
    for (const gap of analysis.gaps) {
      lines.push(`- **${gap.term}** — they ${pct(gap.competitorScore ?? 0)}, you ${pct(gap.score)}`);
    }
  }
  if (analysis.clusters.length) {
    lines.push("", "## Keywords too close to each other", "");
    for (const cluster of analysis.clusters) lines.push(`- ${cluster.terms.join(" ≈ ")}`);
  }
  return lines.join("\n");
}
