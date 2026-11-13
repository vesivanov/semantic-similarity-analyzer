/// <reference lib="webworker" />
/**
 * Embedding worker. Downloads the model once, then answers batches of text with
 * normalised vectors — normalised so a dot product is a cosine and the scoring
 * code never has to divide by magnitudes.
 */
import { env, pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

env.allowLocalModels = false;
env.useBrowserCache = true;

const MODEL = "Xenova/all-MiniLM-L6-v2";
const BATCH = 12;
let extractor: FeatureExtractionPipeline | null = null;

type ProgressInfo = { status?: string; file?: string; progress?: number };
type CreatePipeline = (
  task: "feature-extraction",
  model: string,
  options: { dtype: string; progress_callback: (progress: ProgressInfo) => void },
) => Promise<FeatureExtractionPipeline>;

// The overload set on `pipeline` is too wide for TypeScript to keep, so the one
// signature this worker uses is named here.
const createPipeline = pipeline as unknown as CreatePipeline;

async function load(): Promise<FeatureExtractionPipeline> {
  if (extractor) return extractor;
  extractor = await createPipeline("feature-extraction", MODEL, {
    dtype: "q8",
    progress_callback: (progress) => {
      if (progress.status === "progress" && typeof progress.progress === "number") {
        self.postMessage({ type: "progress", percent: Math.round(progress.progress), detail: progress.file });
      }
    },
  });
  self.postMessage({ type: "ready" });
  return extractor;
}

self.onmessage = async (event: MessageEvent) => {
  const message = event.data as { type: string; id?: number; texts?: string[] };
  try {
    if (message.type === "load") {
      await load();
      return;
    }
    if (message.type !== "embed" || !message.texts || message.id === undefined) return;

    const model = await load();
    const vectors: number[][] = [];
    for (let i = 0; i < message.texts.length; i += BATCH) {
      const batch = message.texts.slice(i, i + BATCH);
      const output = await model(batch, { pooling: "mean", normalize: true });
      const [rows, dims] = output.dims as [number, number];
      const flat = output.data as Float32Array;
      for (let r = 0; r < rows; r += 1) {
        vectors.push(Array.from(flat.slice(r * dims, (r + 1) * dims)));
      }
    }
    self.postMessage({ type: "result", id: message.id, vectors });
  } catch (error) {
    self.postMessage({ type: "error", message: error instanceof Error ? error.message : "embedding failed" });
  }
};
