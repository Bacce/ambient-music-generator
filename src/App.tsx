import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type SubmitEvent,
} from "react";
import {
  AMBIENT_MIDI_DEFAULTS,
  INSTRUMENT_FAMILIES,
  MAX_MELODIC_INSTRUMENTS,
  MOODS,
  STYLES,
  SUGGESTED_INSTRUMENTS,
  composeAmbientSequence,
  instrumentLabel,
  moodLabel,
  sequenceToMidi,
  styleDescription,
  styleLabel,
  type AmbientMidiOptions,
  type AmbientSequence,
  type Instrument,
  type KeyName,
  type Mood,
  type Style,
} from "./service/midigen.ts";
import {
  playSequence,
  setPlaybackVolume,
  type PlaybackHandle,
} from "./service/midiPlayback.ts";
import { PianoRoll } from "./PianoRoll.tsx";

const KEYS: KeyName[] = ["C", "D", "Eb", "F", "G", "A", "Bb"];

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
  const [isPreparing, setIsPreparing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(1);
  const [instrumentQuery, setInstrumentQuery] = useState("");

  const playback = useRef<PlaybackHandle | null>(null);
  const playbackToken = useRef(0);
  const starting = useRef(false);
  const toggleRef = useRef<() => void>(() => {});

  useEffect(() => () => {
    playbackToken.current += 1;
    playback.current?.stop();
  }, []);

  const stopPlayback = () => {
    playbackToken.current += 1;
    playback.current?.stop();
    playback.current = null;
    setIsPlaying(false);
    setProgress(0);
  };

  const updateNumber = (event: ChangeEvent<HTMLInputElement>) => {
    const field = event.target.name as NumberField;

    setDrafts(current => ({ ...current, [field]: event.target.value }));
  };

  const updateVolume = (event: ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value) / 100;

    setVolume(next);
    setPlaybackVolume(next);
  };

  const toggleInstrument = (instrument: Instrument) => {
    setOptions(current => {
      if (current.instruments.includes(instrument)) {
        return {
          ...current,
          instruments: current.instruments.filter(item => item !== instrument),
        };
      }

      const next = [...current.instruments, instrument];
      const melodicCount = next.filter(item => item !== "drums").length;

      if (instrument !== "drums" && melodicCount > MAX_MELODIC_INSTRUMENTS) {
        return current;
      }

      return { ...current, instruments: next };
    });
  };

  const applyStylePreset = () => {
    setOptions(current => ({
      ...current,
      instruments: [...SUGGESTED_INSTRUMENTS[current.style]],
    }));
  };

  const clearInstruments = () => {
    setOptions(current => ({ ...current, instruments: [] }));
  };

  const generate = (seedOverride?: number) => {
    stopPlayback();

    try {
      const duration = readDraft(drafts, "duration", "Duration");
      const bpm = readDraft(drafts, "bpm", "Tempo");
      const seed = seedOverride ?? readDraft(drafts, "seed", "Seed");
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

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    generate();
  };

  const togglePlayback = async () => {
    if (playback.current) {
      stopPlayback();
      return;
    }

    if (!generated || starting.current) return;

    const token = ++playbackToken.current;

    starting.current = true;
    setIsPreparing(true);
    setProgress(0);

    try {
      const handle = await playSequence(
        generated.sequence,
        generated.bytes,
        () => {
          playback.current = null;
          setIsPlaying(false);
          setProgress(0);
        },
      );

      if (token !== playbackToken.current) {
        handle.stop();
        return;
      }

      playback.current = handle;
      setIsPlaying(true);
      setError(null);
    } catch (reason) {
      if (token === playbackToken.current) {
        playback.current = null;
        setIsPlaying(false);
        setError(reason instanceof Error ? reason.message : String(reason));
      }
    } finally {
      starting.current = false;
      setIsPreparing(false);
    }
  };

  useEffect(() => {
    toggleRef.current = togglePlayback;
  });

  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      const handle = playback.current;

      if (!handle) return;

      setProgress(
        handle.durationSeconds > 0
          ? Math.min(1, handle.currentTime / handle.durationSeconds)
          : 0,
      );
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

  const randomizeAndGenerate = () => {
    const seed = Math.floor(Math.random() * 2 ** 32);

    setDrafts(current => ({ ...current, seed: String(seed) }));
    generate(seed);
  };

  const download = () => {
    if (!generated) return;

    const url = URL.createObjectURL(
      new Blob([generated.bytes], { type: "audio/midi" })
    );
    const link = document.createElement("a");

    link.href = url;
    link.download =
      `ambient-${generated.options.style}-${generated.options.key}-` +
      `${generated.options.bpm}bpm-seed${generated.sequence.seed}.mid`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const totalSeconds = generated
    ? generated.sequence.totalTicks * 60 /
      (generated.sequence.bpm * generated.sequence.ticksPerBeat)
    : 0;
  const melodicCount = options.instruments.filter(
    instrument => instrument !== "drums"
  ).length;
  const atCapacity = melodicCount >= MAX_MELODIC_INSTRUMENTS;
  const canGenerate = options.instruments.length > 0;
  const query = instrumentQuery.trim().toLowerCase();
  const visibleFamilies = INSTRUMENT_FAMILIES
    .map(family => ({
      ...family,
      instruments: family.instruments.filter(instrument =>
        query === ""
        || instrument.label.toLowerCase().includes(query)
        || family.label.toLowerCase().includes(query)
        || instrument.role.includes(query)
      ),
    }))
    .filter(family => family.instruments.length > 0);

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

            <label className="field variation-field">
              <span>
                Variation <span className="field-value">{options.variation}%</span>
              </span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={options.variation}
                onChange={event => setOptions(current => ({
                  ...current,
                  variation: Number(event.target.value),
                }))}
                aria-label="Variation amount"
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
              Style
              <select
                value={options.style}
                onChange={event => setOptions(current => ({
                  ...current,
                  style: event.target.value as Style,
                }))}
              >
                {STYLES.map(style => (
                  <option key={style} value={style}>{styleLabel(style)}</option>
                ))}
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
                  <option key={mood} value={mood}>{moodLabel(mood)}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="hint">{styleDescription(options.style)}</p>
        </fieldset>

        <fieldset className="panel">
          <legend>Instruments</legend>

          <div className="instrument-toolbar">
            <input
              type="search"
              className="instrument-search"
              placeholder="Search instruments or families"
              value={instrumentQuery}
              onChange={event => setInstrumentQuery(event.target.value)}
              aria-label="Search instruments"
            />
            <span className="instrument-count">
              {melodicCount}/{MAX_MELODIC_INSTRUMENTS} +{" "}
              {options.instruments.includes("drums") ? "kit" : "no kit"}
            </span>
          </div>

          <div className="instrument-toolbar">
            <button
              type="button"
              className="ghost"
              onClick={applyStylePreset}
            >
              {styleLabel(options.style)} preset
            </button>
            <button
              type="button"
              className="ghost"
              onClick={clearInstruments}
              disabled={options.instruments.length === 0}
            >
              Clear
            </button>
          </div>

          {options.instruments.length > 0 && (
            <div className="selected-chips" aria-label="Selected instruments">
              {options.instruments.map(instrument => (
                <button
                  key={instrument}
                  type="button"
                  className="chip"
                  onClick={() => toggleInstrument(instrument)}
                  title={`Remove ${instrumentLabel(instrument)}`}
                >
                  {instrumentLabel(instrument)}
                  <span aria-hidden="true">×</span>
                </button>
              ))}
            </div>
          )}

          <div className="instrument-groups">
            {visibleFamilies.map(family => (
              <section key={family.id} className="instrument-family">
                <h3>{family.label}</h3>
                <div className="instrument-grid">
                  {family.instruments.map(instrument => {
                    const checked = options.instruments.includes(instrument.id);
                    const blocked = (
                      !checked
                      && atCapacity
                      && instrument.id !== "drums"
                    );

                    return (
                      <label
                        key={instrument.id}
                        className={`instrument${blocked ? " blocked" : ""}`}
                        title={blocked
                          ? `Limit is ${MAX_MELODIC_INSTRUMENTS} melodic instruments`
                          : instrument.label}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={blocked}
                          onChange={() => toggleInstrument(instrument.id)}
                        />
                        {instrument.label}
                      </label>
                    );
                  })}
                </div>
              </section>
            ))}

            {visibleFamilies.length === 0 && (
              <p className="hint">No instruments match “{instrumentQuery}”.</p>
            )}
          </div>

          {!canGenerate && (
            <p className="hint">Select at least one instrument to generate.</p>
          )}
          {atCapacity && (
            <p className="hint">
              Melodic channel limit reached. Remove an instrument to add another.
            </p>
          )}
        </fieldset>

        <div className="actions">
          <label className="seed-field">
            Seed
            <input
              type="number"
              name="seed"
              inputMode="numeric"
              step={1}
              value={drafts.seed}
              onChange={updateNumber}
              title="Use -1 for a random seed"
            />
          </label>
          <button type="submit" disabled={!canGenerate}>Generate</button>
          <button
            type="button"
            className="secondary"
            onClick={randomizeAndGenerate}
            disabled={!canGenerate}
          >
            Randomize &amp; Generate
          </button>
        </div>

        {error && <p className="error" role="alert">{error}</p>}
      </form>

      {generated && !error && (
        <section className="result" aria-label="Generated piece">
          <div className="result-head">
            <p className="ready" role="status">
              {generated.options.duration}s · {generated.options.key} ·{" "}
              {generated.options.bpm} BPM · {styleLabel(generated.options.style)}
              {" · "}{moodLabel(generated.options.mood)}
              {" · "}{generated.options.variation}% variation
              {" "}(seed {generated.sequence.seed})
            </p>
            <span className="meta">{formatBytes(generated.bytes.length)} MIDI</span>
          </div>

          <p className="meta instrumentation">
            {generated.options.instruments
              .map(instrumentLabel)
              .join(" · ")}
          </p>

          <PianoRoll sequence={generated.sequence} />

          <div className="actions">
            <button
              type="button"
              className="secondary"
              onClick={() => void togglePlayback()}
              aria-pressed={isPlaying}
              disabled={isPreparing}
            >
              {isPreparing ? "Loading…" : isPlaying ? "Stop" : "Listen"}
            </button>
            <button type="button" onClick={download}>Download MIDI</button>
          </div>

          <div className="volume-row">
            <label className="volume-field">
              <span>Volume</span>
              <input
                type="range"
                min={0}
                max={200}
                step={5}
                value={Math.round(volume * 100)}
                onChange={updateVolume}
              />
              <span className="volume-value">
                {Math.round(volume * 100)}%
              </span>
            </label>
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
