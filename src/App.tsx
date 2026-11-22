import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type SubmitEvent,
} from "react";
import {
  AMBIENT_MIDI_DEFAULTS,
  composeAmbientSequence,
  sequenceToMidi,
  type AmbientMidiOptions,
  type AmbientSequence,
  type Instrument,
  type KeyName,
  type Mood,
} from "./service/midigen.ts";
import { playSequence, type PlaybackHandle } from "./service/midiPlayback.ts";
import { PianoRoll } from "./PianoRoll.tsx";

const KEYS: KeyName[] = ["C", "D", "Eb", "F", "G", "A", "Bb"];

const MOODS: Mood[] = ["peaceful", "dreamy", "nostalgic", "mysterious"];

const INSTRUMENTS: Instrument[] = ["piano", "pad", "strings", "musicbox"];

type NumberField = "duration" | "bpm" | "seed";

type Drafts = Record<NumberField, string>;

interface GeneratedMidi {
  sequence: AmbientSequence;
  bytes: Uint8Array<ArrayBuffer>;
  options: AmbientMidiOptions;
}

const INITIAL_OPTIONS: AmbientMidiOptions = {
  ...AMBIENT_MIDI_DEFAULTS,
  instruments: [...AMBIENT_MIDI_DEFAULTS.instruments],
};

const INITIAL_DRAFTS: Drafts = {
  duration: String(AMBIENT_MIDI_DEFAULTS.duration),
  bpm: String(AMBIENT_MIDI_DEFAULTS.bpm),
  seed: String(AMBIENT_MIDI_DEFAULTS.seed),
};

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(base64), char => char.charCodeAt(0));
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function formatBytes(bytes: number): string {
  return bytes < 1024
    ? `${bytes} B`
    : `${(bytes / 1024).toFixed(1)} KB`;
}

function readDraft(drafts: Drafts, field: NumberField, label: string): number {
  const raw = drafts[field].trim();

  if (raw === "") throw new Error(`${label} must be a number.`);

  const value = Number(raw);

  if (!Number.isFinite(value)) throw new Error(`${label} must be a number.`);

  return value;
}

export const App = () => {
  const [options, setOptions] = useState<AmbientMidiOptions>(INITIAL_OPTIONS);
  const [drafts, setDrafts] = useState<Drafts>(INITIAL_DRAFTS);
  const [generated, setGenerated] = useState<GeneratedMidi | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const playback = useRef<PlaybackHandle | null>(null);
  const toggleRef = useRef<() => void>(() => {});

  useEffect(() => () => playback.current?.stop(), []);

  const stopPlayback = () => {
    playback.current?.stop();
    playback.current = null;
    setIsPlaying(false);
    setProgress(0);
  };

  const updateNumber = (event: ChangeEvent<HTMLInputElement>) => {
    const field = event.target.name as NumberField;

    setDrafts(current => ({ ...current, [field]: event.target.value }));
  };

  const toggleInstrument = (instrument: Instrument) => {
    setOptions(current => ({
      ...current,
      instruments: current.instruments.includes(instrument)
        ? current.instruments.filter(item => item !== instrument)
        : [...current.instruments, instrument],
    }));
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    stopPlayback();

    try {
      const duration = readDraft(drafts, "duration", "Duration");
      const bpm = readDraft(drafts, "bpm", "Tempo");
      const seed = readDraft(drafts, "seed", "Seed");
      const candidate: AmbientMidiOptions = {
        ...options,
        duration,
        bpm,
        seed,
        instruments: [...options.instruments],
      };
      const sequence = composeAmbientSequence(candidate);
      const resolved: AmbientMidiOptions = { ...candidate, seed: sequence.seed };

      setOptions(resolved);
      setDrafts(current => ({ ...current, seed: String(sequence.seed) }));
      setGenerated({
        sequence,
        bytes: base64ToBytes(sequenceToMidi(sequence)),
        options: resolved,
      });
      setError(null);
    } catch (reason) {
      setGenerated(null);
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  };

  const togglePlayback = () => {
    if (playback.current) {
      stopPlayback();
      return;
    }

    if (!generated) return;

    try {
      playback.current = playSequence(generated.sequence, () => {
        playback.current = null;
        setIsPlaying(false);
        setProgress(0);
      });
      setProgress(0);
      setIsPlaying(true);
      setError(null);
    } catch (reason) {
      playback.current = null;
      setIsPlaying(false);
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  };

  useEffect(() => {
    toggleRef.current = togglePlayback;
  });

  useEffect(() => {
    if (!isPlaying) return;

    const startedAt = performance.now();
    const totalSeconds = playback.current?.durationSeconds ?? 0;

    if (totalSeconds <= 0) return;

    const timer = setInterval(() => {
      const elapsed = (performance.now() - startedAt) / 1000;
      setProgress(Math.min(1, elapsed / totalSeconds));
    }, 100);

    return () => clearInterval(timer);
  }, [isPlaying]);

  useEffect(() => {
    if (!generated) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat) return;

      const target = event.target as HTMLElement | null;

      if (target?.closest("input, select, textarea, button")) return;

      event.preventDefault();
      toggleRef.current();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [generated]);

  const randomizeSeed = () => {
    setDrafts(current => ({
      ...current,
      seed: String(Math.floor(Math.random() * 2 ** 32)),
    }));
  };

  const download = () => {
    if (!generated) return;

    const url = URL.createObjectURL(
      new Blob([generated.bytes], { type: "audio/midi" })
    );
    const link = document.createElement("a");

    link.href = url;
    link.download =
      `ambient-${generated.options.key}-${generated.options.bpm}bpm-` +
      `${generated.options.mood}-seed${generated.sequence.seed}.mid`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const totalSeconds = generated
    ? generated.sequence.totalTicks * 60 /
      (generated.sequence.bpm * generated.sequence.ticksPerBeat)
    : 0;
  const canGenerate = options.instruments.length > 0;

  return (
    <main>
      <h1>Ambient Music Generator</h1>

      <form onSubmit={handleSubmit} noValidate>
        <fieldset className="panel">
          <legend>Piece</legend>
          <div className="field-grid">
            <label className="field">
              Duration (seconds)
              <input
                type="number"
                name="duration"
                inputMode="numeric"
                min={1}
                max={600}
                step={1}
                value={drafts.duration}
                onChange={updateNumber}
              />
            </label>

            <label className="field">
              Tempo (BPM)
              <input
                type="number"
                name="bpm"
                inputMode="numeric"
                min={30}
                max={240}
                step={1}
                value={drafts.bpm}
                onChange={updateNumber}
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="panel">
          <legend>Character</legend>
          <div className="field-grid">
            <label className="field">
              Key
              <select
                value={options.key}
                onChange={event => setOptions(current => ({
                  ...current,
                  key: event.target.value as KeyName,
                }))}
              >
                {KEYS.map(key => <option key={key} value={key}>{key}</option>)}
              </select>
            </label>

            <label className="field">
              Mood
              <select
                value={options.mood}
                onChange={event => setOptions(current => ({
                  ...current,
                  mood: event.target.value as Mood,
                }))}
              >
                {MOODS.map(mood => (
                  <option key={mood} value={mood}>{capitalize(mood)}</option>
                ))}
              </select>
            </label>

            <label className="field">
              Seed
              <span className="seed-control">
                <input
                  type="number"
                  name="seed"
                  inputMode="numeric"
                  step={1}
                  value={drafts.seed}
                  onChange={updateNumber}
                  title="Use -1 for a random seed"
                />
                <button
                  type="button"
                  className="ghost"
                  onClick={randomizeSeed}
                >
                  Random
                </button>
              </span>
            </label>
          </div>
        </fieldset>

        <fieldset className="panel">
          <legend>Instruments</legend>
          <div className="instrument-grid">
            {INSTRUMENTS.map(instrument => (
              <label key={instrument} className="instrument">
                <input
                  type="checkbox"
                  checked={options.instruments.includes(instrument)}
                  onChange={() => toggleInstrument(instrument)}
                />
                {capitalize(instrument)}
              </label>
            ))}
          </div>
          {!canGenerate && (
            <p className="hint">Select at least one instrument to generate.</p>
          )}
        </fieldset>

        <div className="actions">
          <button type="submit" disabled={!canGenerate}>Generate</button>
        </div>

        {error && <p className="error" role="alert">{error}</p>}
      </form>

      {generated && !error && (
        <section className="result" aria-label="Generated piece">
          <div className="result-head">
            <p className="ready" role="status">
              {generated.options.duration}s in {generated.options.key} at{" "}
              {generated.options.bpm} BPM, {generated.options.mood}
              (seed {generated.sequence.seed})
            </p>
            <span className="meta">{formatBytes(generated.bytes.length)} MIDI</span>
          </div>

          <PianoRoll sequence={generated.sequence} />

          <div className="actions">
            <button
              type="button"
              className="secondary"
              onClick={togglePlayback}
              aria-pressed={isPlaying}
            >
              {isPlaying ? "Stop" : "Listen"}
            </button>
            <button type="button" onClick={download}>Download MIDI</button>
          </div>

          {isPlaying && (
            <div className="progress-row">
              <progress
                max={100}
                value={progress * 100}
                aria-label="Playback progress"
              />
              <span>
                {formatClock(progress * totalSeconds)} / {formatClock(totalSeconds)}
              </span>
            </div>
          )}

          <p className="hint">Press Space to play or stop.</p>
        </section>
      )}
    </main>
  );
};
