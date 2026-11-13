/**
 * The model, off the main thread.
 *
 * all-MiniLM-L6-v2 (8-bit, 384 dimensions) runs in the browser through
 * transformers.js. It is about 25 MB, downloaded once and cached by the browser,
 * which is the whole trade: no API key, no account, no per-analysis cost, and
 * the text never leaves the machine. A worker keeps the page responsive while a
 * long page is being embedded.
 */

export interface ModelProgress {
  phase: "download" | "ready" | "error";
  /** Percent when known; -1 while the size is still unknown. */
  percent: number;
  detail?: string;
}

export const MODEL_LABEL = "all-MiniLM-L6-v2 · 384 dimensions · ~25 MB, cached after the first run";

type Pending = { resolve: (value: Float32Array[]) => void; reject: (error: Error) => void };

export class Embedder {
  private worker: Worker | null = null;
  private sequence = 0;
  private pending = new Map<number, Pending>();
  private ready: Promise<void> | null = null;

  constructor(private onProgress?: (progress: ModelProgress) => void) {}

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    const worker = new Worker(new URL("../worker/embed.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent) => {
      const message = event.data as
        | { type: "progress"; percent: number; detail?: string }
        | { type: "ready" }
        | { type: "error"; message: string }
        | { type: "result"; id: number; vectors: number[][] };

      if (message.type === "progress") {
        this.onProgress?.({ phase: "download", percent: message.percent, detail: message.detail });
      } else if (message.type === "ready") {
        this.onProgress?.({ phase: "ready", percent: 100 });
      } else if (message.type === "error") {
        this.onProgress?.({ phase: "error", percent: 0, detail: message.message });
        for (const [, entry] of this.pending) entry.reject(new Error(message.message));
        this.pending.clear();
      } else {
        const entry = this.pending.get(message.id);
        this.pending.delete(message.id);
        entry?.resolve(message.vectors.map((row) => new Float32Array(row)));
      }
    };
    this.worker = worker;
    return worker;
  }

  /** Loads the model once; later calls resolve immediately. */
  load(): Promise<void> {
    if (!this.ready) {
      const worker = this.ensureWorker();
      this.ready = new Promise<void>((resolve, reject) => {
        const onMessage = (event: MessageEvent) => {
          const message = event.data as { type: string; message?: string };
          if (message.type === "ready") {
            worker.removeEventListener("message", onMessage);
            resolve();
          } else if (message.type === "error") {
            worker.removeEventListener("message", onMessage);
            reject(new Error(message.message ?? "model failed to load"));
          }
        };
        worker.addEventListener("message", onMessage);
        worker.postMessage({ type: "load" });
      });
    }
    return this.ready;
  }

  /** Embeds in one batch; the worker splits it so progress can be reported. */
  async embed(texts: string[]): Promise<Float32Array[]> {
    await this.load();
    if (texts.length === 0) return [];
    const worker = this.ensureWorker();
    const id = (this.sequence += 1);
    return new Promise<Float32Array[]>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      worker.postMessage({ type: "embed", id, texts });
    });
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    this.ready = null;
  }
}
