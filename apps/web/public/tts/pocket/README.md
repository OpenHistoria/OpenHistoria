# Pocket TTS runtime adapter

Open Historia loads `/tts/pocket/adapter.js` at runtime when the browser
supports WebAssembly. The adapter uses KevinAHM's community Pocket TTS ONNX
browser runtime from:

- https://huggingface.co/spaces/KevinAHM/pocket-tts-web
- https://huggingface.co/KevinAHM/pocket-tts-onnx

The app currently maps locales to these ONNX bundles:

- `en` -> `english_2026-04`
- `fr` -> `french_24l`

Model files are fetched from Hugging Face on first use rather than committed to
this repository. The browser may cache them after the initial download.
