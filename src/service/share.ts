import {
  AMBIENT_MIDI_DEFAULTS,
  INSTRUMENTS,
  KEYS,
  MAX_DURATION_SECONDS,
  MAX_MELODIC_INSTRUMENTS,
  MOODS,
  STYLES,
  type AmbientMidiOptions,
  type Instrument,
  type KeyName,
  type Mood,
  type Style,
} from "./midigen.ts";

const SHARE_PARAMS = [
  "duration",
  "bpm",
  "key",
  "mood",
  "style",
  "variation",
  "instruments",
  "seed",
  "rhythm",
  "randomStops",
] as const;

const INSTRUMENT_IDS = new Set<string>(
  INSTRUMENTS.map(instrument => instrument.id),
);
const KEY_IDS = new Set<string>(Object.keys(KEYS));
const MOOD_IDS = new Set<string>(MOODS);
const STYLE_IDS = new Set<string>(STYLES);

function readNumber(params: URLSearchParams, name: string): number | null {
  const raw = params.get(name);

  if (raw === null || raw.trim() === "") return null;

  const value = Number(raw);

  return Number.isFinite(value) ? value : null;
}

function readBoolean(params: URLSearchParams, name: string): boolean | null {
  const raw = params.get(name);

  if (raw === "1" || raw === "true") return true;
  if (raw === "0" || raw === "false") return false;

  return null;
}

function readInstruments(raw: string | null): Instrument[] | null {
  if (raw === null) return null;

  const seen = new Set<Instrument>();
  const instruments: Instrument[] = [];
  let melodicCount = 0;

  for (const id of raw.split(",")) {
    if (!INSTRUMENT_IDS.has(id) || seen.has(id)) continue;

    if (id !== "drums" && melodicCount >= MAX_MELODIC_INSTRUMENTS) continue;

    seen.add(id);
    instruments.push(id);

    if (id !== "drums") melodicCount += 1;
  }

  return instruments.length > 0 ? instruments : null;
}

export function readSharedOptions(search: string): AmbientMidiOptions | null {
  const params = new URLSearchParams(search);

  if (!SHARE_PARAMS.some(name => params.has(name))) return null;

  const options: AmbientMidiOptions = {
    ...AMBIENT_MIDI_DEFAULTS,
    instruments: [...AMBIENT_MIDI_DEFAULTS.instruments],
  };

  const duration = readNumber(params, "duration");

  if (duration !== null && duration > 0 && duration <= MAX_DURATION_SECONDS) {
    options.duration = duration;
  }

  const bpm = readNumber(params, "bpm");

  if (bpm !== null && bpm >= 30 && bpm <= 240) options.bpm = bpm;

  const key = params.get("key");

  if (key !== null && KEY_IDS.has(key)) options.key = key as KeyName;

  const mood = params.get("mood");

  if (mood !== null && MOOD_IDS.has(mood)) options.mood = mood as Mood;

  const style = params.get("style");

  if (style !== null && STYLE_IDS.has(style)) options.style = style as Style;

  const variation = readNumber(params, "variation");

  if (variation !== null && variation >= 0 && variation <= 100) {
    options.variation = variation;
  }

  const instruments = readInstruments(params.get("instruments"));

  if (instruments !== null) options.instruments = instruments;

  const seed = readNumber(params, "seed");

  if (seed !== null && Number.isInteger(seed)) options.seed = seed;

  const rhythm = readBoolean(params, "rhythm");

  if (rhythm !== null) options.rhythm = rhythm;

  const randomStops = readBoolean(params, "randomStops");

  if (randomStops !== null) options.randomStops = randomStops;

  return options;
}

export function shareUrl(
  options: AmbientMidiOptions,
  base = window.location.href,
): string {
  const params = new URLSearchParams({
    duration: String(options.duration),
    bpm: String(options.bpm),
    key: options.key,
    mood: options.mood,
    style: options.style,
    variation: String(options.variation),
    instruments: options.instruments.join(","),
    seed: String(options.seed),
    rhythm: options.rhythm ? "1" : "0",
    randomStops: options.randomStops ? "1" : "0",
  });
  const url = new URL(base);

  url.search = params.toString();

  return url.toString();
}
