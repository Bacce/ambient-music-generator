# MIDI → MP3 on the Client Side

**Status:** Investigation complete; proof of concept verified in Chrome
**Date:** 2026-11-22
**Scope:** Add a client-side "Export MP3" action to the generated MIDI workflow
**Verdict:** Small feature, not an architecture change. The app already synthesizes client-side; only offline rendering and MP3 encoding need to be added. Estimated **~150–200 LOC, two dependencies, no server work**.

## Summary

The existing app generates MIDI (`composeAmbientSequence` → `sequenceToMidi`) and plays it in real time with `spessasynth_lib` + `GeneralUserGS.sf3`. Converting MIDI to MP3 requires two additional steps:

1. Render the MIDI to stereo PCM using `OfflineAudioContext` and `WorkletSynthesizer.startOfflineRender`.
2. Encode the PCM to MP3 using a browser-compatible encoder.

No native browser API encodes MP3. `MediaRecorder` exposes Opus/AAC containers in mainstream browsers, not `audio/mpeg`, so a JavaScript or WebAssembly encoder is required. `wasm-media-encoders` (MIT) is the recommended option.

## Current architecture

| Component | Location | Role |
|---|---|---|
| Sequence generation | `src/service/midigen.ts` | Produces `AmbientSequence` and base64 MIDI bytes |
| MIDI bytes | `src/App.tsx` (`GeneratedMidi.bytes`) | Already retained for download |
| Realtime playback | `src/service/midiPlayback.ts` | `AudioContext` + `WorkletSynthesizer` + `Sequencer` |
| Worklet processor | `public/spessasynth_processor.min.js` | AudioWorklet synth engine |
| Soundfont | `public/soundfonts/GeneralUserGS.sf3` | 8.1 MB SF3 used for playback |

The playback engine is tied to a realtime `AudioContext`. MP3 export should use a separate `OfflineAudioContext` rather than recording playback: recording is realtime, loses the reverb tail, and cannot produce MP3 in Chrome/Firefox.

## Proposed pipeline

```mermaid
flowchart LR
    A[Generated MIDI bytes] --> B[BasicMIDI.fromArrayBuffer]
    B --> C[OfflineAudioContext + WorkletSynthesizer]
    C --> D[Float32 stereo PCM]
    D --> E[wasm-media-encoders MP3]
    E --> F[Blob → download]
```

### Render phase

```ts
const sampleRate = 44100;
const seconds = midiDuration + 2; // reverb tail
const ctx = new OfflineAudioContext({
  numberOfChannels: 2,
  sampleRate,
  length: Math.ceil(sampleRate * seconds),
});

await ctx.audioWorklet.addModule(assetUrl(PROCESSOR_URL));

const synth = new WorkletSynthesizer(ctx, { eventsEnabled: false });
synth.connect(ctx.destination);

await synth.startOfflineRender({
  soundBankList: [{ bankOffset: 0, soundBankBuffer: sf3Buffer }],
  midiSequence: BasicMIDI.fromArrayBuffer(midiBytes.slice().buffer),
  loopCount: 0,
});
await synth.isReady;

const audio = await ctx.startRendering();
```

The soundfont is supplied directly to `startOfflineRender`, so the export path does not need the realtime engine's `SoundBankManager`. Cache/reuse the fetched SF3 promise to avoid a second 8.1 MB download.

### Encode phase

```ts
const encoder = await createMp3Encoder();
encoder.configure({ sampleRate, channels: 2, bitrate: 128 });

const left = audio.getChannelData(0);
const right = audio.getChannelData(1);
const chunks: Uint8Array[] = [];

for (let i = 0; i < audio.length; i += 4096) {
  const out = encoder.encode([
    left.subarray(i, i + 4096),
    right.subarray(i, i + 4096),
  ]);
  // The returned view is owned by the encoder; copy before the next call.
  if (out.length) chunks.push(out.slice());
}

const tail = encoder.finalize();
if (tail.length) chunks.push(tail.slice());

const blob = new Blob(chunks, { type: "audio/mpeg" });
```

Use `createEncoder("audio/mpeg", wasmUrl)` and serve `mp3.wasm` as a static asset rather than `createMp3Encoder()`, which inlines the wasm as base64 and expands the ES module to ~765 KiB uncompressed.

## Proof-of-concept results

Environment: Google Chrome 156 headless, Node 24.15.0 for standalone encoding benchmarks. The PoC used the repo's actual 8.1 MB SF3 and generated ambient sequences.

| Metric | Result |
|---|---|
| 30 s MIDI → 32 s stereo PCM @ 44.1 kHz | Rendered in **0.91 s** (35× realtime) |
| 32 s PCM → 128 kbps CBR MP3 | Encoded in **0.49 s** (65× realtime) |
| MP3 output | **512,417 bytes**; `decodeAudioData` reports **32.026 s** |
| 600 s PCM → MP3 (Node, same wasm) | **8.65 s**, **9.16 MB** |
| Default piano+pad mix level | Peak ≈ 0.023 (−33 dBFS), RMS ≈ 0.0044 |

Offline rendering and MP3 encoding are both much faster than realtime. A 10-minute export is roughly **17 s render + 9 s encode** [INFERENCE from scaling], not a 10-minute capture.

## Encoder options

| Option | License | Size | Assessment |
|---|---|---|---|
| `wasm-media-encoders` 0.7.0 | MIT | 130 KiB wasm; ~66 KiB gzipped as an asset | **Recommended.** Fast, tiny, simple API |
| `@breezystack/lamejs` 1.2.7 | LGPL-3.0 | 254 KiB JS | Avoid unless LGPL is acceptable; slower pure JS |
| `MediaRecorder` | native | n/a | Cannot produce MP3 in Chrome/Firefox; realtime only |

`wasm-media-encoders` supports CBR (`bitrate`) and VBR (`vbrQuality`). For ambient music, CBR 128–192 kbps or `vbrQuality: 2` is reasonable.

## Implementation plan

| Change | Approx. size |
|---|---|
| Add `wasm-media-encoders` and direct `spessasynth_core` dependencies | 2 lines in `package.json` |
| Copy `node_modules/wasm-media-encoders/wasm/mp3.wasm` to `public/` in `scripts/sync-spessasynth.mjs` | ~4 lines |
| New `src/service/midiRender.ts` — offline render, cached soundfont, duration/tail, progress | ~70 LOC |
| New `src/service/mp3.ts` — chunked encode, progress, Blob | ~50 LOC |
| `src/App.tsx` — export button, `isExporting`, progress, error handling, filename | ~40 LOC |
| Cross-browser and long-duration verification | manual |

Reuse `generated.bytes` and the existing duration calculation. Keep `assetUrl()` so deployments under a non-root `BASE_URL` continue to work. Mirror the existing MIDI filename, swapping `.mid` for `.mp3`.

## Risks and mitigations

### 1. Memory at 600 s

Stereo PCM at 44.1 kHz consumes `44100 × 2 × 4 = 352.8 KB/s`:

| Duration | PCM buffer | MP3 @128 kbps |
|---:|---:|---:|
| 60 s | 21 MB | 0.96 MB |
| 300 s | 106 MB | 4.8 MB |
| 600 s | **212 MB** | **9.6 MB** |

Desktop browsers should handle this; mobile may OOM. Mitigations:

- Cap MP3 export duration and disclose the cap in the UI.
- Render at 32 kHz or 22.05 kHz for export, reducing PCM memory to ~154 MB or ~106 MB at 600 s.
- Stream-render and encode in chunks — significantly more work; not recommended for the first version.

### 2. Main-thread encoding

Encoding 600 s blocks the main thread for ~9 s. Yield to the event loop every ~100 chunks, or move encoding to a Web Worker. A Worker requires copying the channel data for transfer and raises peak memory; chunked yielding on the main thread is the lower-risk first implementation.

### 3. Offline render ordering

`spessasynth_lib` warns that Chromium may ignore worklet messages on `OfflineAudioContext` if other synth methods are called between initialization and `startOfflineRender`. Follow the order above exactly. Chrome 156 passed; Firefox and Safari were not tested.

### 4. Reverb tail

Add ~2 s to the offline context length. The 30 s test intentionally rendered 32 s; without the tail, reverb is clipped.

### 5. Mix level

The generated mix is quiet (peak ≈ −33 dBFS). MP3 export inherits this. If exports should be louder, add an explicit gain/limiter stage — this is an audio change, not part of format conversion.

### 6. Wasm asset strategy

`createMp3Encoder()` inlines the 130 KiB wasm as base64, producing a ~765 KiB ES module. Copy `mp3.wasm` into `public/` and pass its URL to `createEncoder`. This keeps the main JS bundle small and mirrors the existing processor-copying pattern.

## Acceptance criteria

- Export button produces a `.mp3` that plays in Chrome, Firefox, and Safari.
- Duration matches the generated piece plus a ~2 s reverb tail.
- Export progress is shown; UI remains responsive.
- Failure to load the worklet, soundfont, or encoder surfaces an error without losing the generated MIDI.
- A 10-minute export completes without a tab crash on a desktop browser; behavior on mobile is documented.
- Existing MIDI download and realtime playback are unchanged.

## Recommendation

Implement the `OfflineAudioContext` + `WorkletSynthesizer` + `wasm-media-encoders` path. It is the smallest change, uses the existing synth stack, and has been verified end to end against the repository's real assets.

Keep `WorkerSynthesizer.renderAudio` as a fallback only if offline rendering proves unreliable in Safari or Chromium. It avoids the `OfflineAudioContext` caveat but requires a custom worker entry, a second synthesizer path, and a larger refactor.
