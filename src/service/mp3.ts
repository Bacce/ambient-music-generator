import { createEncoder } from "wasm-media-encoders";
import { assetUrl } from "./assets.ts";

const MP3_WASM_URL = "mp3.wasm";
const BITRATE = 192;
const FRAMES_PER_CHUNK = 4096;
// Encoding is synchronous, so yield occasionally to keep the UI responsive.
const CHUNKS_PER_YIELD = 100;

async function yieldToEventLoop(): Promise<void> {
    await new Promise<void>(resolve => setTimeout(resolve, 0));
}

function copyToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    const copy = new ArrayBuffer(bytes.byteLength);

    new Uint8Array(copy).set(bytes);

    return copy;
}

export async function encodeMp3(
    buffer: AudioBuffer,
    onProgress: (ratio: number) => void = () => {},
): Promise<Blob> {
    const encoder = await createEncoder("audio/mpeg", assetUrl(MP3_WASM_URL));

    encoder.configure({
        sampleRate: buffer.sampleRate,
        channels: 2,
        bitrate: BITRATE,
    });

    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    const chunks: ArrayBuffer[] = [];
    let chunkCount = 0;

    for (let offset = 0; offset < buffer.length; offset += FRAMES_PER_CHUNK) {
        const end = Math.min(offset + FRAMES_PER_CHUNK, buffer.length);
        // The returned view is owned by the encoder; copy it before the next call.
        const encoded = encoder.encode([
            left.subarray(offset, end),
            right.subarray(offset, end),
        ]);

        if (encoded.length > 0) chunks.push(copyToArrayBuffer(encoded));

        onProgress(end / buffer.length);

        if (++chunkCount % CHUNKS_PER_YIELD === 0) await yieldToEventLoop();
    }

    const tail = encoder.finalize();

    if (tail.length > 0) chunks.push(copyToArrayBuffer(tail));

    onProgress(1);

    return new Blob(chunks, { type: "audio/mpeg" });
}
