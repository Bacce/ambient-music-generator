import type { AmbientSequence } from "./midigen.ts";

export interface SequenceNote {
    start: number;
    duration: number;
    pitch: number;
    velocity: number;
    program: number;
    track: number;
}

interface OpenNote {
    tick: number;
    velocity: number;
}

export function collectSequenceNotes(
    sequence: AmbientSequence,
): SequenceNote[] {
    const secondsPerTick = 60 / (sequence.bpm * sequence.ticksPerBeat);
    const notes: SequenceNote[] = [];

    for (const [trackIndex, track] of sequence.tracks.entries()) {
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
                track: trackIndex,
            });
        }
    }

    return notes.sort((a, b) => a.start - b.start);
}
