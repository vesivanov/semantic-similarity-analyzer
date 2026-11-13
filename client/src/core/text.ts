/**
 * Turning two textareas into the units the analyser scores.
 *
 * A page is not one vector. "Do I cover this keyword?" is a question about the
 * best passage, not the average of the document — one strong section and nine
 * empty ones is exactly the case a document-level score hides. So text is cut
 * into passages that keep their heading, and every question is asked of each
 * passage.
 */

export interface ParsedKeyword {
  term: string;
  /** 1 unless the line said otherwise, e.g. "pricing:3". */
  weight: number;
}

export interface Chunk {
  id: number;
  /** Nearest heading above the passage, or "" before the first one. */
  heading: string;
  text: string;
  words: number;
}

const MAX_KEYWORDS = 200;
const MAX_WEIGHT = 5;

/**
 * `pricing, semantics:2, "content strategy (3)"` — weights are optional, the
 * separator is anything a person would type, and the same term twice counts
 * once at its highest weight.
 */
export function parseKeywords(input: string): ParsedKeyword[] {
  const seen = new Map<string, ParsedKeyword>();
  for (const rawLine of input.split(/[\n,;]+/)) {
    let line = rawLine.trim().replace(/^[-*•]\s*/, "");
    if (!line) continue;

    let weight = 1;
    const weighted = line.match(/^(.*?)[\s]*[:(\[\s]\s*(\d{1,2}(?:\.\d)?)\s*[)\]]?$/);
    if (weighted && weighted[1].trim()) {
      line = weighted[1].trim();
      weight = Math.min(MAX_WEIGHT, Math.max(1, Number(weighted[2])));
    }
    line = line.replace(/^["'“”]|["'“”]$/g, "").replace(/\s+/g, " ").trim();
    // "42" is a number, not a keyword; it is usually a stray line weight.
    if (!line || /^[\d\s.,]+$/.test(line)) continue;

    const key = line.toLowerCase();
    const existing = seen.get(key);
    if (existing) existing.weight = Math.max(existing.weight, weight);
    else seen.set(key, { term: line, weight });
    if (seen.size >= MAX_KEYWORDS) break;
  }
  return [...seen.values()];
}

/** HTML in, readable text out — a pasted page source is a normal input here. */
export function toPlainText(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article|br)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<h([1-6])[^>]*>/gi, "\n\n## ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&(?:euro|#8364);/g, "€")
    .replace(/&(?:pound|#163);/g, "£")
    .replace(/&(?:mdash|#8212);/g, "—")
    .replace(/&(?:ndash|#8211);/g, "–")
    .replace(/&(?:rsquo|#8217);/g, "’")
    .replace(/&(?:lsquo|#8216);/g, "‘")
    .replace(/&(?:ldquo|#8220);/g, "“")
    .replace(/&(?:rdquo|#8221);/g, "”")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const HEADING = /^\s{0,3}(#{1,6})\s+(.*)$/;

/**
 * Cut text into passages of roughly `targetWords`, starting a new passage at
 * every heading and never merging across one. Short paragraphs are glued to
 * their neighbour so a page of one-line bullets does not become a hundred
 * chunks of noise.
 */
export function chunkText(input: string, targetWords = 90): Chunk[] {
  const text = toPlainText(input);
  if (!text) return [];

  const blocks: { heading: string; text: string }[] = [];
  let heading = "";
  for (const block of text.split(/\n{2,}/)) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    const asHeading = trimmed.match(HEADING);
    if (asHeading) {
      heading = asHeading[2].trim();
      continue;
    }
    // A single-line block under 12 words that is not a sentence reads as a
    // heading in pasted content that lost its markup.
    if (trimmed.length < 90 && !/[.!?]$/.test(trimmed) && trimmed.split(/\s+/).length <= 12) {
      heading = trimmed;
      continue;
    }
    blocks.push({ heading, text: trimmed });
  }

  const chunks: Chunk[] = [];
  let buffer = "";
  let bufferHeading = "";
  let id = 0;

  const flush = () => {
    const body = buffer.trim();
    if (!body) return;
    chunks.push({ id, heading: bufferHeading, text: body, words: countWords(body) });
    id += 1;
    buffer = "";
  };

  for (const block of blocks) {
    const words = countWords(block.text);
    if (!buffer) {
      buffer = block.text;
      bufferHeading = block.heading;
      continue;
    }
    if (bufferHeading === block.heading && countWords(buffer) + words <= targetWords) {
      buffer += `\n\n${block.text}`;
      continue;
    }
    flush();
    buffer = block.text;
    bufferHeading = block.heading;
  }
  flush();

  return chunks;
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
