import type { AmbientSequence } from "./midigen.ts";

interface Voice {
    type: OscillatorType;
    attack: number;
    decay: number;
    sustain: number;
    release: number;
    peak: number;
}

interface Note {
    start: number;
    duration: number;
    pitch: number;
    velocity: number;
    program: number;
}

interface OpenNote {
    tick: number;
    velocity: number;
}

export interface PlaybackHandle {
    stop(): void;
    durationSeconds: number;
}

// General MIDI program → rough Web Audio substitute.
const VOICES: Record<number, Voice> = {
    0: { type: "triangle", attack: 0.005, decay: 1.2, sustain: 0.2, release: 0.4, peak: 0.55 },
    10: { type: "sine", attack: 0.002, decay: 1, sustain: 0.08, release: 0.7, peak: 0.5 },
    48: { type: "sawtooth", attack: 0.35, decay: 0.8, sustain: 0.45, release: 1.4, peak: 0.16 },
    89: { type: "sine", attack: 0.8, decay: 1.5, sustain: 0.65, release: 2, peak: 0.35 },
};

const DEFAULT_VOICE: Voice = {
    type: "triangle",
    attack: 0.01,
    decay: 0.8,
    sustain: 0.4,
    release: 0.6,
    peak: 0.4,
};

function collectNotes(sequence: AmbientSequence): Note[] {
    const secondsPerTick = 60 / (sequence.bpm * sequence.ticksPerBeat);
    const notes: Note[] = [];

    for (const track of sequence.tracks) {
        const events = [...track].sort(
            (a, b) => a.tick - b.tick || a.priority - b.priority
        );

        const openNotes = new Map<number, OpenNote[]>();
        let program = 0;

        for (const { tick, data } of events) {
            const [status, pitch, velocity] = data;
            const kind = status & 0xf0;

            if (kind === 0xc0) {
                program = pitch;
                continue;
            }

            if (kind !== 0x80 && kind !== 0x90) continue;

            const key = (status & 0x0f) << 8 | pitch;

            if (kind === 0x90 && velocity > 0) {
                const open = openNotes.get(key);

                if (open) open.push({ tick, velocity });
                else openNotes.set(key, [{ tick, velocity }]);
                continue;
            }

            const start = openNotes.get(key)?.shift();
            if (!start) continue;

            notes.push({
                start: start.tick * secondsPerTick,
                duration: (tick - start.tick) * secondsPerTick,
                pitch,
                velocity: start.velocity,
                program,
            });
        }
    }

    return notes.sort((a, b) => a.start - b.start);
}

export function playSequence(
    sequence: AmbientSequence,
    onEnded: () => void = () => {},
): PlaybackHandle {
    const notes = collectNotes(sequence);
    const durationSeconds =
        sequence.totalTicks * 60 / (sequence.bpm * sequence.ticksPerBeat);
    const startTime = 0.15;

    const context = new AudioContext();
    const master = context.createGain();
    master.gain.value = 0.22;

    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.005;
    compressor.release.value = 0.25;

    master.connect(compressor).connect(context.destination);

    for (const note of notes) {
        const voice = VOICES[note.program] ?? DEFAULT_VOICE;
        const start = context.currentTime + startTime + note.start;
        const end = start + Math.max(note.duration, 0.05);
        const peak = note.velocity / 127 * voice.peak;

        const oscillator = context.createOscillator();
        oscillator.type = voice.type;
        oscillator.frequency.value = 440 * 2 ** ((note.pitch - 69) / 12);

        const envelope = context.createGain();
        envelope.gain.setValueAtTime(0.0001, start);
        envelope.gain.linearRampToValueAtTime(peak, start + voice.attack);
        envelope.gain.setTargetAtTime(
            peak * voice.sustain,
            start + voice.attack,
            voice.decay / 3
        );
        envelope.gain.setTargetAtTime(0.0001, end, voice.release / 4);

        oscillator.connect(envelope).connect(master);
        oscillator.start(start);
        oscillator.stop(end + voice.release * 2);
    }

    let finished = false;

    const timer = setTimeout(
        () => finish(true),
        (durationSeconds + startTime + 1) * 1000
    );

    function finish(notify: boolean): void {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        void context.close().catch(() => {});
        if (notify) onEnded();
    }

    void context.resume().catch(() => {});

    return { stop: () => finish(true), durationSeconds };
}
