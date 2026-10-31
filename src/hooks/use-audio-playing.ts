import { useCallback, useRef, useState } from "react";

export type PlayingSide = "original" | "translated";
export type PlayingKey = { msgId: string; side: PlayingSide } | null;

/**
 * Tracks which message's audio is currently playing so its bubble button can
 * animate. Starts playback, pauses any previously tracked audio, and clears
 * the marker on end/pause/error. A token guards against stale events after a
 * newer playback replaces the current one.
 */
export function useAudioPlaying() {
	const [playing, setPlaying] = useState<PlayingKey>(null);
	const tokenRef = useRef(0);
	const currentAudioRef = useRef<HTMLAudioElement | null>(null);

	const stop = useCallback(
		(msgId: string, side: PlayingSide) => {
			setPlaying((current) =>
				current && current.msgId === msgId && current.side === side
					? null
					: current,
			);
		},
		[],
	);

	const trackAudio = useCallback(
		(msgId: string, side: PlayingSide, audio: HTMLAudioElement) => {
			const token = ++tokenRef.current;
			currentAudioRef.current?.pause();
			currentAudioRef.current = audio;
			setPlaying({ msgId, side });

			const clearIfCurrent = () => {
				if (tokenRef.current !== token) return;
				tokenRef.current = 0;
				currentAudioRef.current = null;
				stop(msgId, side);
			};
			audio.addEventListener("ended", clearIfCurrent, { once: true });
			audio.addEventListener("pause", clearIfCurrent, { once: true });
			audio.addEventListener("error", clearIfCurrent, { once: true });

			void audio.play().catch(() => {
				clearIfCurrent();
			});
		},
		[stop],
	);

	return { playing, trackAudio, stop };
}
