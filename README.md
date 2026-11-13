# Semantic Similarity Analyzer

**Which keywords does this page actually answer?**

Paste a page and the keywords it is supposed to win. Every passage is measured
against every keyword, so you see the one section that carries a term and the
nine that do not. Add a competitor page to see where they answer and you stay
quiet.

Runs entirely in your browser. No API key, no account, no upload, no cost.

## What it does

- **Passage-level coverage, not a document average.** One strong section and nine
  empty ones is exactly the case a whole-page score hides. Text is cut into
  passages that keep their heading, and a keyword is scored by its best match.
- **Weighted keywords.** `pricing:3` counts three times as much as a keyword you
  left at 1.
- **Competitor gaps.** The same keyword, their best passage against yours: the
  list of things they answer and you do not.
- **Cannibalisation.** Keywords closer than 0.82 to each other are grouped — one
  page cannot rank for both, it splits itself.
- **Evidence.** Every score opens to the passage it came from, so a claim can be
  checked rather than trusted.
- **Exports.** A CSV with one row per keyword, and a Markdown report for a ticket
  or a client email.

## How it works

`all-MiniLM-L6-v2` (8-bit, 384 dimensions) runs locally through
[transformers.js](https://github.com/huggingface/transformers.js) in a web
worker. The model is about 25 MB, downloaded once and cached by the browser. Your
text never leaves the machine — there is no server to leave it to.

Thresholds, calibrated on that model: a paraphrase lands near 0.6, a related but
differently worded passage near 0.45, an unrelated one under 0.2. A keyword
scores `covered` at 0.50, `thin` at 0.36, `missing` below that.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # the scoring logic, deterministic, no model needed
npm run build    # static site in dist/
```

Deployed on Netlify; `netlify.toml` builds from `main`.

## Honest limits

- Embeddings measure meaning, not ranking. A page can cover every keyword and
  still lose on links, intent or freshness; this tool says nothing about those.
- The model is small on purpose. Paraphrases that share little vocabulary score
  lower than a large model would score them; the verdict thresholds above are
  tuned for it, not for `text-embedding-3-large`.
- Passage splitting uses headings and paragraph breaks. A page that is one wall
  of text is scored as one passage, which is accurate but not useful.

MIT.
