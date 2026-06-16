/* eslint-disable */
// Adapter for KevinAHM's Pocket TTS ONNX browser runtime.
// Source: https://huggingface.co/spaces/KevinAHM/pocket-tts-web

const SAMPLE_RATE = 24000;

const localeToBundle = (locale) =>
  locale === "fr" ? "french_24l" : "english_2026-04";

class PocketAudioQueue {
  constructor() {
    this.context = null;
    this.nextStart = 0;
    this.sources = new Set();
  }

  async ensureContext() {
    this.context ??= new AudioContext({
      sampleRate: SAMPLE_RATE,
      latencyHint: "interactive",
    });
    if (this.context.state === "suspended") {
      await this.context.resume();
    }
    return this.context;
  }

  async playChunk(samples, sampleRate = SAMPLE_RATE) {
    const context = await this.ensureContext();
    const audioBuffer = context.createBuffer(1, samples.length, sampleRate);
    audioBuffer.copyToChannel(samples, 0);

    const source = context.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(context.destination);

    const startAt = Math.max(context.currentTime + 0.02, this.nextStart);
    this.nextStart = startAt + audioBuffer.duration;
    this.sources.add(source);
    source.onended = () => this.sources.delete(source);
    source.start(startAt);
  }

  stop() {
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {
        // Already stopped.
      }
    }
    this.sources.clear();
    if (this.context) this.nextStart = this.context.currentTime;
  }

  async waitForIdle() {
    if (!this.context) return;
    const delayMs = Math.max(0, (this.nextStart - this.context.currentTime) * 1000);
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

class PocketTtsEngine {
  constructor() {
    this.worker = null;
    this.workerReady = false;
    this.currentBundle = null;
    this.sampleRate = SAMPLE_RATE;
    this.audio = new PocketAudioQueue();
    this.pending = new Map();
    this.request = null;
  }

  ensureWorker(initialBundle) {
    if (this.worker) return;
    this.worker = new Worker("/tts/pocket/inference-worker.js", {
      type: "module",
    });
    this.worker.onmessage = (event) => this.onWorkerMessage(event.data);
    this.worker.postMessage({
      type: "load",
      data: { language: initialBundle || "english_2026-04" },
    });
  }

  onWorkerMessage(message) {
    if (message.type === "loaded") {
      this.workerReady = true;
      this.resolvePending("load");
      return;
    }

    if (message.type === "bundle_loaded") {
      this.currentBundle = message.language;
      this.sampleRate = message.sampleRate || SAMPLE_RATE;
      this.resolvePending(`bundle:${message.language}`);
      return;
    }

    if (message.type === "audio_chunk" && this.request) {
      void this.audio.playChunk(message.data, this.sampleRate);
      return;
    }

    if (message.type === "stream_ended") {
      const request = this.request;
      this.request = null;
      void this.audio.waitForIdle().then(() => request?.resolve());
      return;
    }

    if (message.type === "error") {
      const error = new Error(message.error || "Pocket TTS failed.");
      this.rejectAll(error);
      if (this.request) {
        this.request.reject(error);
        this.request = null;
      }
    }
  }

  waitFor(key) {
    if (key === "load" && this.workerReady) return Promise.resolve();
    if (key.startsWith("bundle:") && this.currentBundle === key.slice(7)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const list = this.pending.get(key) || [];
      list.push({ resolve, reject });
      this.pending.set(key, list);
    });
  }

  resolvePending(key) {
    const list = this.pending.get(key);
    if (!list) return;
    this.pending.delete(key);
    for (const item of list) item.resolve();
  }

  rejectAll(error) {
    for (const list of this.pending.values()) {
      for (const item of list) item.reject(error);
    }
    this.pending.clear();
  }

  async setBundle(bundle) {
    this.ensureWorker(bundle);
    await this.waitFor("load");
    if (this.currentBundle === bundle) return;
    this.worker.postMessage({ type: "set_language", data: { language: bundle } });
    await this.waitFor(`bundle:${bundle}`);
  }

  async speak({ text, locale, signal }) {
    this.stop();
    const bundle = localeToBundle(locale);
    await this.setBundle(bundle);
    if (signal.aborted) return;

    await this.audio.ensureContext();

    const promise = new Promise((resolve, reject) => {
      this.request = { resolve, reject };
    });
    const abort = () => {
      this.stop();
      this.request?.resolve();
      this.request = null;
    };
    signal.addEventListener("abort", abort, { once: true });

    try {
      this.worker.postMessage({ type: "generate", data: { text } });
      await promise;
    } finally {
      signal.removeEventListener("abort", abort);
    }
  }

  stop() {
    this.audio.stop();
    if (this.worker) this.worker.postMessage({ type: "stop" });
  }
}

let engine = null;

export function createPocketTtsEngine() {
  engine ??= new PocketTtsEngine();
  return engine;
}
