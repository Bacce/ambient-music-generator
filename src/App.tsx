import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type SyntheticEvent,
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

const KEYS: KeyName[] = ["C", "D", "Eb", "F", "G", "A", "Bb"];

const MOODS: Mood[] = ["peaceful", "dreamy", "nostalgic", "mysterious"];

const INSTRUMENTS: Instrument[] = ["piano", "pad", "strings", "musicbox"];

type NumberField = "duration" | "bpm" | "seed";

interface GeneratedMidi {
  sequence: AmbientSequence;
  base64: string;
  options: AmbientMidiOptions;
}

const INITIAL_OPTIONS: AmbientMidiOptions = {
  ...AMBIENT_MIDI_DEFAULTS,
  instruments: [...AMBIENT_MIDI_DEFAULTS.instruments],
};

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(base64), char => char.charCodeAt(0));
}

export const App = () => {
  const [options, setOptions] = useState<AmbientMidiOptions>(INITIAL_OPTIONS);
  const [generated, setGenerated] = useState<GeneratedMidi | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const playback = useRef<PlaybackHandle | null>(null);

  useEffect(() => () => playback.current?.stop(), []);

  const stopPlayback = () => {
    playback.current?.stop();
    playback.current = null;
    setIsPlaying(false);
  };

  const updateNumber = (event: ChangeEvent<HTMLInputElement>) => {
    const field = event.target.name as NumberField;
    setOptions(current => ({ ...current, [field]: Number(event.target.value) }));
  };

  const toggleInstrument = (instrument: Instrument) => {
    setOptions(current => ({
      ...current,
      instruments: current.instruments.includes(instrument)
        ? current.instruments.filter(item => item !== instrument)
        : [...current.instruments, instrument],
    }));
  };

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    stopPlayback();

    try {
      const sequence = composeAmbientSequence(options);

      setGenerated({
        sequence,
        base64: sequenceToMidi(sequence),
        options: { ...options, instruments: [...options.instruments] },
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

    playback.current = playSequence(generated.sequence, () => {
      playback.current = null;
      setIsPlaying(false);
    });
    setIsPlaying(true);
  };

  const download = () => {
    if (!generated) return;

    const url = URL.createObjectURL(
      new Blob([base64ToBytes(generated.base64)], { type: "audio/midi" })
    );

    const link = document.createElement("a");
    link.href = url;
    link.download =
      `ambient-${generated.options.key}-${generated.options.bpm}bpm.mid`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <main>
      <h1>Ambient Music Generator</h1>

      <form onSubmit={handleSubmit}>
        <label>
          Duration (seconds)
          <input
            type="number"
            name="duration"
            min={1}
            step={1}
            value={options.duration}
            onChange={updateNumber}
          />
        </label>

        <label>
          Tempo (BPM)
          <input
            type="number"
            name="bpm"
            min={30}
            max={240}
            step={1}
            value={options.bpm}
            onChange={updateNumber}
          />
        </label>

        <label>
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

        <label>
          Mood
          <select
            value={options.mood}
            onChange={event => setOptions(current => ({
              ...current,
              mood: event.target.value as Mood,
            }))}
          >
            {MOODS.map(mood => <option key={mood} value={mood}>{mood}</option>)}
          </select>
        </label>

        <fieldset>
          <legend>Instruments</legend>
          {INSTRUMENTS.map(instrument => (
            <label key={instrument}>
              <input
                type="checkbox"
                checked={options.instruments.includes(instrument)}
                onChange={() => toggleInstrument(instrument)}
              />
              {instrument}
            </label>
          ))}
        </fieldset>

        <label>
          Seed
          <input
            type="number"
            name="seed"
            step={1}
            value={options.seed}
            onChange={updateNumber}
          />
        </label>

        <div className="actions">
          <button type="submit">Generate</button>
        </div>

        {error && <p className="error" role="alert">{error}</p>}

        {generated && !error && (
          <div className="result">
            <p className="ready">
              Generated {generated.options.duration}s piece in{" "}
              {generated.options.key} at {generated.options.bpm} BPM
              (seed {generated.sequence.seed}). Listen, then download.
            </p>
            <div className="actions">
              <button type="button" className="secondary" onClick={togglePlayback}>
                {isPlaying ? "Stop" : "Listen"}
              </button>
              <button type="button" onClick={download}>Download MIDI</button>
            </div>
          </div>
        )}
      </form>
    </main>
  );
};
