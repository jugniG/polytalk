/*
 * Scripted walkthrough stage — the polished, judge-facing main page.
 * Same look and hold-to-talk choreography, but every turn is pre-configured:
 * no STT, no translate API, no TTS API. Timings are randomized per take to
 * mimic real pipeline latency (transcript first, translation + speech after).
 * The fully functional implementation lives at /backup.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowLeftRight, Mic } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getLangFlag, getLangFlagUrl } from "../backup/-actions";
import { MessageBubble, type Message } from "../backup/-components/messageBubble";
import { WaveformBars } from "../backup/-components/waveformbars";

export const Route = createFileRoute("/translate/")({ component: DemoStage });

/* ─────────────────────────────────────────────────── */
/*  Pre-configured script                              */
/* ─────────────────────────────────────────────────── */

const LANG_A = "English";
const LANG_B = "Marathi";

interface DemoMsg extends Message {
	/** static asset played when the page auto-speaks the translation */
	translatedAudioUrl: string;
}

const SCRIPT: Array<{
	spokenLang: string;
	targetLang: string;
	raw: string;
	translated: string;
	originalAudio: string;
	translatedAudio: string;
}> = [
	{
		spokenLang: "en",
		targetLang: "mr",
		raw: "excuse me sir can you help me with this address",
		translated: "माफ करा साहेब, तुम्ही मला हा पत्ता मिळवून देऊ शकाल का?",
		originalAudio: "/demo/01-ask-en.mp3",
		translatedAudio: "/demo/02-app-reply-mr.mp3",
	},
	{
		spokenLang: "mr",
		targetLang: "en",
		raw: "5 स्टार हॉटेल पुढे आहे तिथून उजवीकडे वळा",
		translated: "The 5 star hotel is ahead, turn right.",
		originalAudio: "/demo/03-local-reply-mr.mp3",
		translatedAudio: "/demo/04-app-reply-en.mp3",
	},
];

const rand = (min: number, max: number) =>
	Math.round(min + Math.random() * (max - min));

/* ─────────────────────────────────────────────────── */
/*  Static language card (no selector — fixed pair)    */
/* ─────────────────────────────────────────────────── */

function StaticLangCard({ label, lang }: { label: "A" | "B"; lang: string }) {
	const flag = getLangFlagUrl(lang);
	return (
		<div className="flex-1 flex flex-col gap-3 rounded-2xl p-4 border bg-white/[0.03] border-white/20 transition-all duration-300">
			<div className="flex items-center justify-between">
				<span className="text-[10px] font-semibold text-white/50 uppercase tracking-[0.15em]">
					Person {label}
				</span>
			</div>
			<div className="flex items-center gap-2">
				<img
					src={flag}
					alt={`${lang} flag`}
					className="h-6 w-6 rounded-full object-cover"
				/>
				<span className="text-white font-semibold text-base">{lang}</span>
			</div>
		</div>
	);
}

/* ─────────────────────────────────────────────────── */
/*  Stage                                              */
/* ─────────────────────────────────────────────────── */

function DemoStage() {
	const [messages, setMessages] = useState<DemoMsg[]>([]);
	const [showTranslated, setShowTranslated] = useState(true);
	const [activeSide, setActiveSide] = useState<"A" | "B">("A");
	const [status, setStatus] = useState<"idle" | "recording" | "processing">(
		"idle",
	);
	const [waveformData, setWaveformData] = useState<number[]>([]);
	const [scriptDone, setScriptDone] = useState(false);

	const turnIdxRef = useRef(0);
	const waveTimerRef = useRef<number | null>(null);
	const pendingTimeoutRef = useRef<number | null>(null);
	const pendingMsgIdRef = useRef<string | null>(null);
	const pendingAudioRef = useRef<string | null>(null);
	const messagesEndRef = useRef<HTMLDivElement | null>(null);

	const clearTimers = useCallback(() => {
		if (waveTimerRef.current !== null) {
			window.clearInterval(waveTimerRef.current);
			waveTimerRef.current = null;
		}
		if (pendingTimeoutRef.current !== null) {
			window.clearTimeout(pendingTimeoutRef.current);
			pendingTimeoutRef.current = null;
		}
	}, []);

	useEffect(() => clearTimers, [clearTimers]);

	// keep the newest bubble in view
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages.length]);

	const activeLang = activeSide === "A" ? LANG_A : LANG_B;

	// ── hold: animated waveform while "listening" ──
	const handleRecordButtonDown = () => {
		if (status !== "idle" || scriptDone) return;
		if (turnIdxRef.current >= SCRIPT.length) return;

		setStatus("recording");

		waveTimerRef.current = window.setInterval(() => {
			setWaveformData(
				Array.from({ length: 24 }, (_, index) => {
					const oscillation =
						Math.sin((index / 24) * Math.PI * 2) * 0.04;
					const jitter = Math.random() * 0.25;
					return Math.min(
						1,
						Math.max(0, 0.5 + jitter + oscillation),
					);
				}),
			);
		}, 120);
	};

	// ── release: run the scripted turn like a real pipeline ──
	const handleRecordButtonUp = () => {
		if (status !== "recording") return;
		if (waveTimerRef.current !== null) {
			window.clearInterval(waveTimerRef.current);
			waveTimerRef.current = null;
		}
		setWaveformData([]);

		const turn = SCRIPT[turnIdxRef.current];
		if (!turn) {
			setStatus("idle");
			return;
		}

		setStatus("processing");

		// Phase 1 (STT-ish latency): bubble appears with raw text only;
		// the translated field stays empty so it shows its loading pulse.
		pendingMsgIdRef.current = crypto.randomUUID();
		pendingAudioRef.current = turn.translatedAudio;
		const sttDelay = rand(600, 1000);

		pendingTimeoutRef.current = window.setTimeout(() => {
			setMessages((current) => [
				...current,
				{
					id: pendingMsgIdRef.current!,
					sourceText: turn.raw,
					translatedText: "",
					lang: turn.spokenLang,
					targetLang: turn.targetLang,
					recordedAudioUrl: turn.originalAudio,
					translatedAudioUrl: turn.translatedAudio,
					timestamp: new Date(),
				},
			]);

			// Phase 2 (translate latency): translation fills in, then the
			// app "speaks" exactly like the real auto-play flow.
			const translateDelay = rand(700, 1200);
			pendingTimeoutRef.current = window.setTimeout(() => {
				setMessages((current) =>
					current.map((msg) =>
						msg.id === pendingMsgIdRef.current
							? { ...msg, translatedText: turn.translated }
							: msg,
					),
				);
				pendingMsgIdRef.current = null;
				turnIdxRef.current += 1;
				if (turnIdxRef.current >= SCRIPT.length) setScriptDone(true);
				setActiveSide((s) => (s === "A" ? "B" : "A"));
				setStatus("idle");

				if (pendingAudioRef.current) {
					void new Audio(pendingAudioRef.current).play().catch(() => {});
					pendingAudioRef.current = null;
				}
			}, translateDelay);
		}, sttDelay);
	};

	const handleRecordButtonLeave = () => {
		// mouse left the button mid-hold behaves like a release
		if (status === "recording") handleRecordButtonUp();
	};

	const restart = () => {
		clearTimers();
		turnIdxRef.current = 0;
		pendingMsgIdRef.current = null;
		pendingAudioRef.current = null;
		setScriptDone(false);
		setMessages([]);
		setWaveformData([]);
		setActiveSide("A");
		setStatus("idle");
	};

	const micDisabled = status === "processing" || scriptDone;

	return (
		<div className="h-[100dvh] w-full flex flex-col bg-[#0c0c0e] text-white overflow-hidden">
			<header className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3 sm:py-4 border-b border-white/[0.06]">
				<Link to="/">
					<button
						className="flex items-center gap-2 hover:text-white/70 transition-colors"
						data-testid="button-back"
					>
						<ArrowLeft className="w-4 h-4" />
						<span className="text-sm font-medium">PolyTalk</span>
					</button>
				</Link>

				<div className="flex items-center gap-2">
					<button
						onClick={restart}
						className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/40 hover:border-white/20 hover:text-white transition"
						data-testid="button-restart"
					>
						Restart
					</button>
				</div>
			</header>

			{/* ─── Language Cards ─── */}
			<div className="flex-shrink-0 px-4 pt-4 pb-3">
				<div className="flex items-stretch justify-center gap-3">
					<div>
						<StaticLangCard label="A" lang={LANG_A} />
					</div>

					<div className="flex flex-col items-center justify-center gap-2 flex-shrink-0">
						<div className="w-9 h-9 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center text-white/30">
							<ArrowLeftRight className="w-3.5 h-3.5" />
						</div>
					</div>

					<div>
						<StaticLangCard label="B" lang={LANG_B} />
					</div>
				</div>

				<p className="mt-2.5 text-center text-[10px] text-white/50 leading-snug">
					Each person's language can be set independently
				</p>
			</div>

			{/* ─── Conversation Area ─── */}
			<div className="flex-1 overflow-y-auto px-4 py-2 min-h-0">
				{messages.length === 0 ? (
					<div className="h-full flex flex-col items-center justify-center gap-3 text-center">
						<div className="flex items-center gap-3 text-3xl opacity-60">
							<span>{getLangFlag(LANG_A)}</span>
							<ArrowLeftRight className="w-4 h-4 text-white/50" />
							<span>{getLangFlag(LANG_B)}</span>
						</div>
						<div>
							<p className="text-white/50 font-medium text-sm mb-1">
								{status === "processing"
									? "Translating..."
									: status === "recording"
										? `Listening to ${activeLang}`
										: scriptDone
											? "Demo script complete"
											: "Ready to translate"}
							</p>
							<p className="text-white/40 text-xs max-w-[220px] leading-relaxed">
								{scriptDone
									? "Restart to replay the demo script"
									: `Tap the mic and speak in ${activeLang}`}
							</p>
						</div>
					</div>
				) : (
					<div className="py-2">
						{/* Raw ⇄ Translated switch */}
						<div className="flex justify-end mb-2">
							<button
								role="switch"
								aria-checked={showTranslated}
								onClick={() => setShowTranslated((v) => !v)}
								className="group flex items-center gap-2 cursor-pointer"
								data-testid="switch-translated"
							>
								<span
									className={`text-[10px] uppercase tracking-widest transition-colors ${
										showTranslated
											? "text-white/40 group-hover:text-white/60"
											: "text-white/70 group-hover:text-white"
									}`}
								>
									Translated
								</span>
								<span
									className={`relative h-4 w-7 rounded-full transition-colors duration-200 ${
										showTranslated
											? "bg-emerald-500/80"
											: "bg-white/15"
									}`}
								>
									<span
										className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all duration-200 ${
											showTranslated
												? "left-3.5"
												: "left-0.5"
										}`}
									/>
								</span>
							</button>
						</div>
						{messages.map((msg) => (
							<MessageBubble
								key={msg.id}
								msg={msg}
								mode={showTranslated ? "translated" : "raw"}
								onPlayOriginal={() => {
									if (msg.recordedAudioUrl)
										void new Audio(msg.recordedAudioUrl)
											.play()
											.catch(() => {});
								}}
								onPlayTranslated={() => {
									void new Audio(msg.translatedAudioUrl)
										.play()
										.catch(() => {});
								}}
							/>
						))}
						<div ref={messagesEndRef} />
					</div>
				)}
			</div>

			{/* ─── Record Footer ─── */}
			<div className="flex-shrink-0 border-t border-white/[0.06] px-6 pb-8 pt-4 flex flex-col items-center gap-3">
				{/* Waveform / status */}
				<div className="w-full max-w-xs h-10">
					{status === "recording" && <WaveformBars data={waveformData} />}
					{status === "processing" && (
						<div className="flex items-center justify-center gap-1.5 h-10 text-xs text-white/25">
							{[0, 150, 300].map((d) => (
								<span
									key={d}
									className="w-1.5 h-1.5 rounded-full bg-indigo-400/70 animate-bounce"
									style={{ animationDelay: `${d}ms` }}
								/>
							))}
							<span className="ml-2 uppercase tracking-widest">
								Translating
							</span>
						</div>
					)}
					{status === "idle" && <div className="h-10" />}
				</div>

				<p className="text-[10px] text-white/50 uppercase tracking-widest h-3">
					{status === "recording"
						? "Release to send"
						: scriptDone
							? "Demo script complete — Restart to replay"
							: `Tap and hold to speak in ${activeLang}`}
				</p>

				{/* Record button */}
				<button
					onMouseDown={handleRecordButtonDown}
					onMouseUp={handleRecordButtonUp}
					onMouseLeave={handleRecordButtonLeave}
					onTouchStart={handleRecordButtonDown}
					onTouchEnd={handleRecordButtonUp}
					disabled={micDisabled}
					data-testid="button-record"
					className={`cursor-pointer
			relative flex items-center justify-center w-[72px] h-[72px] rounded-full
			select-none touch-none transition-all duration-200 ease-out
			${
				micDisabled
					? "opacity-30 cursor-not-allowed scale-90 bg-white/10"
					: status === "recording"
						? "scale-110 bg-rose-500 shadow-[0_0_0_10px_rgba(244,63,94,0.12),0_0_32px_rgba(244,63,94,0.25)]"
						: "bg-white hover:scale-[1.04] active:scale-95 shadow-[0_2px_32px_rgba(255,255,255,0.08)]"
			}
		  `}
				>
					{status === "recording" && (
						<span className="absolute inset-0 rounded-full border-2 border-rose-400 animate-ping opacity-40" />
					)}
					<Mic
						className={`w-7 h-7 ${
							status === "recording"
								? "text-white"
								: "text-zinc-950"
						}`}
					/>
				</button>
			</div>
		</div>
	);
}
