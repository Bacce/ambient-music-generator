import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function copy(source, target) {
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(source, target);
}

copy(
    resolve(root, "node_modules/spessasynth_lib/dist/spessasynth_processor.min.js"),
    resolve(root, "public/spessasynth_processor.min.js"),
);

copy(
    resolve(root, "node_modules/wasm-media-encoders/wasm/mp3.wasm"),
    resolve(root, "public/mp3.wasm"),
);
