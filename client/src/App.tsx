import { useCallback, useMemo, useRef, useState } from "react";
import { analyzeContent, toCsv, toMarkdown, type Analysis } from "./core/analyze";
import { chunkText, countWords, parseKeywords } from "./core/text";
import { Embedder, MODEL_LABEL, type ModelProgress } from "./core/embed";
import { EXAMPLE } from "./example";

type Phase = "idle" | "loading" | "analyzing" | "done" | "error";

const MAX_WORDS = 6000;

function pct(value: number | null | undefined): string {
  if (value === null || value === undefined) return "–";
  return `${Math.round(value * 100)}%`;
}

function download(name: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [keywordsText, setKeywordsText] = useState("");
  const [mainText, setMainText] = useState("");
  const [competitorText, setCompetitorText] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState<ModelProgress | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [meta, setMeta] = useState({ passages: 0, keywords: 0, competitorPassages: 0 });
  const [error, setError] = useState<string | null>(null);
  const [openEvidence, setOpenEvidence] = useState<string | null>(null);
  const embedder = useRef<Embedder | null>(null);

  const keywords = useMemo(() => parseKeywords(keywordsText), [keywordsText]);
  const mainWords = useMemo(() => countWords(mainText), [mainText]);
  const competitorWords = useMemo(() => countWords(competitorText), [competitorText]);

  const ready = keywords.length > 0 && mainWords >= 40;

  const run = useCallback(async () => {
    setError(null);
    setAnalysis(null);
    setPhase("loading");
    try {
      const mainChunks = chunkText(mainText);
      const competitorChunks = competitorText.trim() ? chunkText(competitorText) : [];
      if (mainChunks.length === 0) throw new Error("That text produced no passages to score.");

      if (mainWords > MAX_WORDS || competitorWords > MAX_WORDS) {
        throw new Error(`Keep each text under ${MAX_WORDS.toLocaleString()} words for one run.`);
      }

      if (!embedder.current) embedder.current = new Embedder(setProgress);
      const model = embedder.current;

      setPhase("analyzing");
      const keywordVectors = await model.embed(keywords.map((keyword) => keyword.term));
      const mainVectors = await model.embed(mainChunks.map((chunk) => chunk.text));
      const competitorVectors = competitorChunks.length
        ? await model.embed(competitorChunks.map((chunk) => chunk.text))
        : null;

      const result = analyzeContent({
        keywords,
        keywordVectors,
        main: { chunks: mainChunks, vectors: mainVectors },
        competitor: competitorVectors ? { chunks: competitorChunks, vectors: competitorVectors } : null,
      });
      setAnalysis(result);
      setMeta({
        passages: mainChunks.length,
        keywords: keywords.length,
        competitorPassages: competitorChunks.length,
      });
      setPhase("done");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The analysis failed.");
      setPhase("error");
    }
  }, [competitorText, competitorWords, keywords, mainText, mainWords]);

  const loadExample = () => {
    setKeywordsText(EXAMPLE.keywords);
    setMainText(EXAMPLE.main);
    setCompetitorText(EXAMPLE.competitor);
    setAnalysis(null);
    setPhase("idle");
  };

  const busy = phase === "loading" || phase === "analyzing";

  return (
    <>
      <header className="bar">
        <div className="inner">
          <div className="wordmark">
            <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
              <circle cx="12" cy="16" r="8" fill="none" stroke="#14130f" strokeWidth="2" />
              <circle cx="21" cy="16" r="8" fill="none" stroke="#bf2e1d" strokeWidth="2" />
            </svg>
            Semantic Similarity Analyzer
          </div>
          <span className="badge">Runs in your browser · no key</span>
        </div>
      </header>

      <div className="wrap">
        <h1>Which keywords does this page actually answer?</h1>
        <p className="lede">
          Paste a page and the keywords it is supposed to win. Every passage is measured against
          every keyword, so you see the one section that carries a term and the nine that do not.
          Add a competitor to see where they answer and you stay quiet.
        </p>

        <div className="stack">
          <div className="panel">
            <label htmlFor="keywords">
              <span className="label">Target keywords</span>
              <span className="hint">{keywords.length} of 200 · add a weight with <code>:3</code></span>
            </label>
            <textarea
              id="keywords"
              value={keywordsText}
              onChange={(event) => setKeywordsText(event.target.value)}
              placeholder={"ai receptionist\nappointment booking:3\nwhatsapp integration"}
              aria-describedby="keywords-help"
            />
            <p id="keywords-help" className="note">
              One per line or comma separated. A number after a colon sets its importance (1–5).
            </p>
          </div>

          <div className="grid">
            <div className="panel">
              <label htmlFor="main">
                <span className="label">Your page</span>
                <span className="hint">{mainWords.toLocaleString()} words</span>
              </label>
              <textarea
                id="main"
                className="tall"
                value={mainText}
                onChange={(event) => setMainText(event.target.value)}
                placeholder="Paste the page text. Markdown headings, pasted HTML and plain text all work."
              />
            </div>
            <div className="panel">
              <label htmlFor="competitor">
                <span className="label">Competitor page <span style={{ color: "var(--muted)", fontWeight: 400 }}>optional</span></span>
                <span className="hint">{competitorWords.toLocaleString()} words</span>
              </label>
              <textarea
                id="competitor"
                className="tall"
                value={competitorText}
                onChange={(event) => setCompetitorText(event.target.value)}
                placeholder="Paste the page you are losing to. Leave empty for a keyword-only check."
              />
            </div>
          </div>
        </div>

        <div className="actions">
          <button onClick={run} disabled={!ready || busy}>
            {busy ? "Analyzing…" : "Analyze"}
          </button>
          <button className="ghost" onClick={loadExample} disabled={busy}>
            Load example
          </button>
          <span className="note">
            {ready ? MODEL_LABEL : "Add keywords and at least 40 words of your own copy."}
          </span>
        </div>

        {busy && (
          <div className="progress" role="status" aria-live="polite">
            <div className="track">
              <div className="fill" style={{ width: `${phase === "analyzing" ? 100 : Math.max(4, progress?.percent ?? 4)}%` }} />
            </div>
            <span className="note">
              {phase === "loading"
                ? progress?.percent && progress.percent > 0
                  ? `Loading the model… ${progress.percent}%`
                  : "Loading the model (first run downloads about 25 MB)…"
                : "Scoring passages…"}
            </span>
          </div>
        )}

        {error && <div className="error" style={{ marginTop: 18 }}>{error}</div>}

        {analysis && (
          <section className="results" aria-live="polite">
            <div className="results-head">
              <h2>Result</h2>
              <span className="note">
                {meta.keywords} keywords · {meta.passages} passages
                {meta.competitorPassages ? ` · competitor ${meta.competitorPassages} passages` : ""}
              </span>
            </div>

            <div className="stats">
              <div className="stat">
                <div className="k">Weighted coverage</div>
                <div className="v">{pct(analysis.overall.alignment)}</div>
                <div className="s">of what you set out to say</div>
              </div>
              <div className="stat">
                <div className="k">Competitor</div>
                <div className="v">{pct(analysis.overall.competitorAlignment)}</div>
                <div className="s">{analysis.overall.competitorAlignment === null ? "no competitor pasted" : "same keywords, their page"}</div>
              </div>
              <div className="stat">
                <div className="k">Page similarity</div>
                <div className="v">{pct(analysis.overall.similarity)}</div>
                <div className="s">{analysis.overall.similarity === null ? "needs a competitor" : "yours against theirs"}</div>
              </div>
              <div className="stat">
                <div className="k">Gaps</div>
                <div className="v">{analysis.gaps.length}</div>
                <div className="s">they answer, you do not</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Keyword</th>
                  <th className="num">You</th>
                  <th className="barcell" aria-label="your match" />
                  <th>Verdict</th>
                  <th className="num">Them</th>
                  <th className="barcell" aria-label="competitor match" />
                </tr>
              </thead>
              <tbody>
                {analysis.keywords.map((row) => (
                  <>
                    <tr key={row.term}>
                      <td>
                        <button
                          className="ghost small"
                          style={{ border: 0, padding: 0, background: "none", fontWeight: 600 }}
                          onClick={() => setOpenEvidence(openEvidence === row.term ? null : row.term)}
                          aria-expanded={openEvidence === row.term}
                        >
                          {row.term}
                          {row.weight > 1 ? <span className="hint"> ×{row.weight}</span> : null}
                        </button>
                      </td>
                      <td className="num">{pct(row.score)}</td>
                      <td className="barcell">
                        <div className="bar"><span style={{ width: pct(row.score) }} /></div>
                      </td>
                      <td><span className={`pill ${row.verdict}`}>{row.verdict}</span></td>
                      <td className="num">{row.competitorScore === null ? "–" : pct(row.competitorScore)}</td>
                      <td className="barcell">
                        {row.competitorScore === null ? null : (
                          <div className="bar them"><span style={{ width: pct(row.competitorScore) }} /></div>
                        )}
                      </td>
                    </tr>
                    {openEvidence === row.term && (
                      <tr key={`${row.term}-evidence`}>
                        <td colSpan={6}>
                          <div className="evidence">
                            {row.evidence ? (
                              <>
                                <b>{row.evidence.heading || "Closest passage"}</b> — {row.evidence.text.slice(0, 420)}
                                {row.evidence.text.length > 420 ? "…" : ""}
                              </>
                            ) : (
                              "No passage to quote."
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>

            <div className="two">
              <div className="card">
                <h3>Where they answer and you do not</h3>
                <p className="sub">Same keyword, their best passage scores higher by at least 8 points.</p>
                {analysis.gaps.length === 0 ? (
                  <p className="note">Nothing — no competitor, or you match them everywhere.</p>
                ) : (
                  <ul className="plain">
                    {analysis.gaps.map((gap) => (
                      <li key={gap.term}>
                        <span>{gap.term}</span>
                        <span className="score">{pct(gap.score)} → {pct(gap.competitorScore)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="card">
                <h3>Keywords too close to each other</h3>
                <p className="sub">Near-identical meaning: one page cannot rank for both, it splits itself.</p>
                {analysis.clusters.length === 0 ? (
                  <p className="note">No two keywords are closer than 0.82.</p>
                ) : (
                  <ul className="plain">
                    {analysis.clusters.map((cluster) => (
                      <li key={cluster.terms.join("|")}>
                        <span>{cluster.terms.join(" ≈ ")}</span>
                        <span className="score">{cluster.similarity.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="card" style={{ marginTop: 18 }}>
              <h3>Passages, strongest first</h3>
              <p className="sub">The average of each passage's three best keywords. This is where the page carries a topic and where it coasts.</p>
              <table>
                <thead>
                  <tr><th>Passage</th><th className="num">Words</th><th className="num">Score</th><th className="barcell" /><th>Carries</th></tr>
                </thead>
                <tbody>
                  {[...analysis.sections].sort((a, b) => b.score - a.score).map((section) => (
                    <tr key={section.heading}>
                      <td>{section.heading}</td>
                      <td className="num">{section.words}</td>
                      <td className="num">{pct(section.score)}</td>
                      <td className="barcell"><div className="bar"><span style={{ width: pct(section.score) }} /></div></td>
                      <td className="note">{section.topKeywords.length ? section.topKeywords.join(", ") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="actions">
              <button className="ghost" onClick={() => download("semantic-coverage.csv", toCsv(analysis), "text/csv")}>
                Download CSV
              </button>
              <button
                className="ghost"
                onClick={() =>
                  download(
                    "semantic-coverage.md",
                    toMarkdown(analysis, { pages: `${mainWords} words, ${meta.passages} passages`, keywords: meta.keywords }),
                    "text/markdown",
                  )
                }
              >
                Download report
              </button>
            </div>
          </section>
        )}

        <footer>
          <span>MIT · nothing is uploaded, nothing is tracked · the model is cached by your browser after the first run</span>
          <a href="https://github.com/vesivanov/semantic-similarity-analyzer">Source on GitHub</a>
        </footer>
      </div>
    </>
  );
}
