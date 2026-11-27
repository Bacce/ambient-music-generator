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
  KEYS,
  MAX_DURATION_SECONDS,
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
import { renderMidiToBuffer } from "./service/midiRender.ts";
import { encodeMp3 } from "./service/mp3.ts";
import { readSharedOptions, shareUrl } from "./service/share.ts";
import { PianoRoll } from "./PianoRoll.tsx";

type NumberField = "duration" | "bpm" | "seed";

const KEY_NAMES = Object.keys(KEYS) as KeyName[];

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

function draftsFromOptions(options: AmbientMidiOptions): Drafts {
  return {
    duration: String(options.duration),
    bpm: String(options.bpm),
    seed: String(options.seed),
  };
}

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

function generatedFilename(generated: GeneratedMidi, extension: string): string {
  return (
    `ambient-${generated.options.style}-${generated.options.key}-` +
    `${generated.options.bpm}bpm-seed${generated.sequence.seed}.${extension}`
  );
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M8 5.2v13.6L19 12z" fill="currentColor" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="6.5" y="6.5" width="11" height="11" rx="1.5" fill="currentColor" />
    </svg>
  );
}

function DieIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <g fill="currentColor">
        <circle cx="8" cy="8" r="2" />
        <circle cx="16" cy="8" r="2" />
        <circle cx="12" cy="12" r="2" />
        <circle cx="8" cy="16" r="2" />
        <circle cx="16" cy="16" r="2" />
      </g>
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 4v10.5" />
        <path d="M7.5 10.5L12 15l4.5-4.5" />
        <path d="M5 19h14" />
      </g>
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="18" cy="5.5" r="2.5" />
        <circle cx="6" cy="12" r="2.5" />
        <circle cx="18" cy="18.5" r="2.5" />
        <path d="M8.2 10.8l7.6-4M8.2 13.2l7.6 4" />
      </g>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M5 12.5l4.5 4.5L19 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M4 9.5h3.5L12 5.8v12.4l-4.5-3.7H4z"
        fill="currentColor"
      />
      {muted
        ? (
          <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M16 9.5l4 5M20 9.5l-4 5" />
          </g>
        )
        : (
          <g
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M15.5 9.2a4 4 0 010 5.6" />
            <path d="M18 7a7.5 7.5 0 010 10" />
          </g>
        )}
    </svg>
  );
}

export const App = () => {
  const [sharedOptions] = useState(() =>
    readSharedOptions(window.location.search)
  );
  const [options, setOptions] = useState<AmbientMidiOptions>(() =>
    sharedOptions ?? INITIAL_OPTIONS
  );
  const [drafts, setDrafts] = useState<Drafts>(() =>
    draftsFromOptions(sharedOptions ?? AMBIENT_MIDI_DEFAULTS)
  );
  const [generated, setGenerated] = useState<GeneratedMidi | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(1);
  const [instrumentQuery, setInstrumentQuery] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportPhase, setExportPhase] = useState<"rendering" | "encoding">(
    "rendering",
  );
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  const playback = useRef<PlaybackHandle | null>(null);
  const playbackToken = useRef(0);
  const starting = useRef(false);
  const toggleRef = useRef<() => void>(() => { });
  const exportToken = useRef(0);
  const seeking = useRef(false);
  const autoGenerated = useRef(false);
  const generateRef = useRef<() => void>(() => { });

  useEffect(() => () => {
    playbackToken.current += 1;
    exportToken.current += 1;
    playback.current?.stop();
  }, []);

  const stopPlayback = () => {
    playbackToken.current += 1;
    seeking.current = false;
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

  const generate = () => {
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
      setShareStatus(null);
    } catch (reason) {
      setGenerated(null);
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  };

  useEffect(() => {
    generateRef.current = generate;
  });

  useEffect(() => {
    if (!sharedOptions || autoGenerated.current) return;

    autoGenerated.current = true;
    generateRef.current();
  }, [sharedOptions]);

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

      if (seeking.current) return;

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

  const nextSeed = () => Math.floor(Math.random() * 2 ** 32);

  const randomizeSeed = () => {
    setDrafts(current => ({ ...current, seed: String(nextSeed()) }));
  };

  const feelingLucky = () => {
    const style = STYLES[Math.floor(Math.random() * STYLES.length)];

    setDrafts(current => ({ ...current, seed: String(nextSeed()) }));
    setOptions(current => ({
      ...current,
      key: KEY_NAMES[Math.floor(Math.random() * KEY_NAMES.length)],
      style,
      mood: MOODS[Math.floor(Math.random() * MOODS.length)],
      variation: Math.floor(Math.random() * 21) * 5,
      instruments: [...SUGGESTED_INSTRUMENTS[style]],
      rhythm: Math.random() < 0.5,
      randomStops: Math.random() < 0.5,
    }));
  };

  const download = () => {
    if (!generated) return;

    downloadBlob(
      new Blob([generated.bytes], { type: "audio/midi" }),
      generatedFilename(generated, "mid"),
    );
  };

  const copyShareLink = async () => {
    if (!generated) return;

    let settings: AmbientMidiOptions;

    try {
      const duration = readDraft(drafts, "duration", "Duration");
      const bpm = readDraft(drafts, "bpm", "Tempo");
      const draftSeed = readDraft(drafts, "seed", "Seed");
      const seed = draftSeed === -1 ? generated.sequence.seed : draftSeed;

      if (duration <= 0 || duration > MAX_DURATION_SECONDS) {
        throw new Error(
          `Duration must be between 1 and ${MAX_DURATION_SECONDS} seconds.`,
        );
      }

      if (bpm < 30 || bpm > 240) {
        throw new Error("Tempo must be between 30 and 240 BPM.");
      }

      if (!Number.isInteger(seed)) throw new Error("Seed must be an integer.");

      if (options.instruments.length === 0) {
        throw new Error("Select at least one instrument to generate.");
      }

      settings = {
        ...options,
        duration,
        bpm,
        seed,
        instruments: [...options.instruments],
      };
    } catch (reason) {
      setShareStatus(reason instanceof Error ? reason.message : String(reason));
      return;
    }

    const url = shareUrl(settings);

    try {
      await navigator.clipboard.writeText(url);
      window.history.replaceState(null, "", url);
      setShareStatus("Share link copied.");
    } catch {
      setShareStatus(url);
    }
  };

  const seekPlayback = (event: ChangeEvent<HTMLInputElement>) => {
    const handle = playback.current;

    if (!handle) return;

    const ratio = Number(event.target.value) / 100;

    handle.seek(ratio * handle.durationSeconds);
    setProgress(ratio);
  };

  const totalSeconds = generated
    ? generated.sequence.totalTicks * 60 /
    (generated.sequence.bpm * generated.sequence.ticksPerBeat)
    : 0;

  const exportMp3 = async () => {
    if (!generated || isExporting) return;

    const token = ++exportToken.current;
    const piece = generated;
    const pieceSeconds = totalSeconds;

    setIsExporting(true);
    setExportPhase("rendering");
    setExportProgress(0);
    setExportError(null);

    try {
      const buffer = await renderMidiToBuffer(piece.bytes, pieceSeconds);

      if (token !== exportToken.current) return;

      setExportPhase("encoding");

      const blob = await encodeMp3(buffer, ratio => {
        if (token === exportToken.current) setExportProgress(ratio);
      });

      if (token !== exportToken.current) return;

      downloadBlob(blob, generatedFilename(piece, "mp3"));
      setExportProgress(1);
    } catch (reason) {
      if (token === exportToken.current) {
        setExportError(
          reason instanceof Error ? reason.message : String(reason),
        );
      }
    } finally {
      if (token === exportToken.current) setIsExporting(false);
    }
  };
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
      <div className="layout">
        <form className="config" onSubmit={handleSubmit} noValidate>
        <header className="app-header">
          <h1>Ambient Music Generator</h1>
          <p className="tagline">
            Compose slow, layered ambient music in your browser, then play it,
            download it, or share a link.
          </p>
        </header>

        <div className="actions sticky-actions">
          <button
            type="button"
            className="secondary with-icon"
            onClick={feelingLucky}
            title="Randomize key, style, mood, instruments, variation and seed without generating. Duration and tempo stay as set."
          >
            <DieIcon />
            Feeling lucky
          </button>
          <button type="submit" disabled={!canGenerate}>Generate</button>
        </div>

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

          <div className="field-toggles">
            <label className="field-toggle">
              <input
                type="checkbox"
                checked={options.rhythm}
                onChange={event => setOptions(current => ({
                  ...current,
                  rhythm: event.target.checked,
                }))}
              />
              <span>
                Add rhythm
                <small>
                  Keeps the slow background but adds a drum groove and a
                  rhythmic middle passage.
                </small>
              </span>
            </label>

            <label className="field-toggle">
              <input
                type="checkbox"
                checked={options.randomStops}
                onChange={event => setOptions(current => ({
                  ...current,
                  randomStops: event.target.checked,
                }))}
              />
              <span>
                Random stops
                <small>
                  Occasionally rests a pad, texture or bass for a bar on a
                  bar line.
                </small>
              </span>
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
                {KEY_NAMES.map(key => <option key={key} value={key}>{key}</option>)}
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
          <button
            type="button"
            className="ghost"
            onClick={randomizeSeed}
            title="Set a new random seed without generating"
          >
            Randomize seed
          </button>
        </div>
        </form>

        <aside className="output" aria-label="Generated piece">
          {generated ? (
            <section className="result">
              <div className="result-head">
                <p className="ready" role="status">
                  {Math.round(totalSeconds)}s · {generated.options.key} ·{" "}
                  {generated.options.bpm} BPM · {styleLabel(generated.options.style)}
                  {" · "}{moodLabel(generated.options.mood)}
                  {" · "}{generated.options.variation}% variation
                  {generated.options.rhythm ? " · rhythm" : ""}
                  {generated.options.randomStops ? " · stops" : ""}
                  {" "}(seed {generated.sequence.seed})
                </p>
                <span className="meta">
                  {formatBytes(generated.bytes.length)} MIDI
                </span>
              </div>

          <p className="meta instrumentation">
            {generated.options.instruments
              .map(instrumentLabel)
              .join(" · ")}
            {generated.options.rhythm
              && !generated.options.instruments.includes("drums")
              ? " · Drum Kit (rhythm)"
              : ""}
          </p>

          <PianoRoll sequence={generated.sequence} />

          <div className="transport">
            <button
              type="button"
              className="icon-button play-button"
              onClick={() => void togglePlayback()}
              aria-pressed={isPlaying}
              aria-label={
                isPreparing
                  ? "Loading preview"
                  : isPlaying
                  ? "Stop playback"
                  : "Play preview"
              }
              title={isPlaying ? "Stop" : "Play"}
              disabled={isPreparing}
            >
              {isPlaying ? <StopIcon /> : <PlayIcon />}
            </button>

            <input
              className="seek"
              type="range"
              min={0}
              max={100}
              step={0.1}
              value={progress * 100}
              onChange={seekPlayback}
              onPointerDown={() => { seeking.current = true; }}
              onPointerUp={() => { seeking.current = false; }}
              onPointerCancel={() => { seeking.current = false; }}
              onLostPointerCapture={() => { seeking.current = false; }}
              disabled={!isPlaying}
              aria-label="Playback position"
              aria-valuetext={`${formatClock(progress * totalSeconds)} of ${formatClock(totalSeconds)}`}
            />

            <span className="transport-time">
              {formatClock(progress * totalSeconds)} / {formatClock(totalSeconds)}
            </span>

            <button
              type="button"
              className="icon-button ghost-icon"
              onClick={() => void copyShareLink()}
              aria-label="Copy share link"
              title={shareStatus === "Share link copied." ? "Link copied" : "Copy share link"}
            >
              {shareStatus === "Share link copied."
                ? <CheckIcon />
                : <ShareIcon />}
            </button>

            <div className="volume-control">
              <button
                type="button"
                className="icon-button ghost-icon"
                aria-label={`Volume ${Math.round(volume * 100)}%`}
                title="Volume"
              >
                <SpeakerIcon muted={volume === 0} />
              </button>
              <div className="volume-popover">
                <span className="volume-popover-label">
                  Volume
                  <span>{Math.round(volume * 100)}%</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={200}
                  step={5}
                  value={Math.round(volume * 100)}
                  onChange={updateVolume}
                  aria-label="Volume"
                />
              </div>
            </div>
          </div>

          {error && <p className="error" role="alert">{error}</p>}

          {shareStatus && (
            <p className="hint share-status" role="status">{shareStatus}</p>
          )}

          {isExporting && (
            <div className="progress-row" role="status">
              {exportPhase === "rendering"
                ? <progress aria-label="MP3 export progress" />
                : (
                  <progress
                    max={100}
                    value={exportProgress * 100}
                    aria-label="MP3 export progress"
                  />
                )}
              <span>
                {exportPhase === "rendering"
                  ? "Rendering audio…"
                  : `Encoding MP3… ${Math.round(exportProgress * 100)}%`}
              </span>
            </div>
          )}

          {exportError && (
            <p className="error" role="alert">{exportError}</p>
          )}

        </section>
          ) : (
            <div className="output-empty">
              <p className="empty-title">Nothing generated yet</p>
              <p className="hint">
                Choose your settings, then press “Generate” to compose a piece.
              </p>
              {error && <p className="error" role="alert">{error}</p>}
            </div>
          )}
        </aside>
      </div>
    </main>
  );
};
