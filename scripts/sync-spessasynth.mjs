import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(
    root,
    "node_modules/spessasynth_lib/dist/spessasynth_processor.min.js",
);
const target = resolve(root, "public/spessasynth_processor.min.js");

mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);
