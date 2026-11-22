import { useEffect, useRef } from "react";
import type { AmbientSequence } from "./service/midigen.ts";
import { collectSequenceNotes } from "./service/midiPlayback.ts";

const TRACK_COLORS = ["--c1", "--c2", "--c3", "--c4", "--c5"];

interface PianoRollProps {
    sequence: AmbientSequence;
}

export const PianoRoll = ({ sequence }: PianoRollProps) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const notes = collectSequenceNotes(sequence);
        const duration =
            sequence.totalTicks * 60 / (sequence.bpm * sequence.ticksPerBeat);
        const pitches = notes.map(note => note.pitch);
        const lowest = pitches.length > 0 ? Math.min(...pitches) : 48;
        const highest = pitches.length > 0 ? Math.max(...pitches) : 84;
        const pitchSpan = Math.max(highest - lowest + 1, 12);
        const barSeconds = 4 * 60 / sequence.bpm;

        const draw = () => {
            const width = canvas.clientWidth;
            const height = canvas.clientHeight;

            if (width === 0 || height === 0 || duration <= 0) return;

            const ratio = window.devicePixelRatio || 1;
            canvas.width = Math.round(width * ratio);
            canvas.height = Math.round(height * ratio);

            const context = canvas.getContext("2d");
            if (!context) return;

            const styles = getComputedStyle(canvas);
            const readColor = (name: string, fallback: string) =>
                styles.getPropertyValue(name).trim() || fallback;
            const grid = readColor("--grid", "rgba(128, 128, 128, 0.15)");
            const palette = TRACK_COLORS.map((name, index) =>
                readColor(name, ["#7c6fd6", "#4f8f8b", "#c58b5a", "#a46a9e", "#6f8f4f"][index])
            );

            context.setTransform(ratio, 0, 0, ratio, 0, 0);
            context.clearRect(0, 0, width, height);

            context.strokeStyle = grid;
            context.lineWidth = 1;

            for (let time = 0; time <= duration; time += barSeconds) {
                const x = Math.round(time / duration * width) + 0.5;
                context.beginPath();
                context.moveTo(x, 0);
                context.lineTo(x, height);
                context.stroke();
            }

            const noteHeight = Math.max(2, (height - 8) / pitchSpan * 0.9);

            for (const note of notes) {
                const x = note.start / duration * width;
                const noteWidth = Math.max(2, note.duration / duration * width);
                const y = (1 - (note.pitch - lowest) / pitchSpan) * (height - 8) + 4;

                context.globalAlpha = 0.55 + 0.45 * (note.velocity / 127);
                context.fillStyle = palette[note.track % palette.length];
                context.fillRect(x, y, noteWidth, noteHeight);
            }

            context.globalAlpha = 1;
        };

        draw();

        const observer = new ResizeObserver(draw);
        observer.observe(canvas);

        const media = window.matchMedia("(prefers-color-scheme: dark)");
        media.addEventListener("change", draw);

        return () => {
            observer.disconnect();
            media.removeEventListener("change", draw);
        };
    }, [sequence]);

    return (
        <canvas
            ref={canvasRef}
            className="piano-roll"
            role="img"
            aria-label="Piano roll of the generated piece"
        />
    );
};
