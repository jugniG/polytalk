import langs from "langs";
import { Volume2 } from "lucide-react";
import { getLangFlagUrl } from "../-actions";

export interface Message {
	id: string;
	/** ISO-639-1 code of the language this was SPOKEN in */
	lang: string;
	/** ISO-639-1 code of the language the translation is in (optional) */
	targetLang?: string;
	/** what the person actually said */
	sourceText?: string;
	/** the translated text */
	translatedText: string;
	/** object URL of the actual recorded speech — replayed by "Play original" */
	recordedAudioUrl?: string;
	timestamp: Date;
}

function codeToLangName(code: string) {
	const name = langs.where("1", code)?.name || "English";
	// "Punjabi" is missing from the langs package (its IANA name is "Panjabi")
	return name === "Panjabi" ? "Punjabi" : name;
}

/* Equalizer bars shown while this button's audio is playing */
function PlayingBars() {
	return (
		<span className="flex items-center gap-[2px] h-3" aria-hidden>
			<span className="w-[3px] h-2 rounded-full bg-current animate-bounce [animation-delay:-200ms] [animation-duration:500ms]" />
			<span className="w-[3px] h-3 rounded-full bg-current animate-bounce [animation-duration:500ms]" />
			<span className="w-[3px] h-2 rounded-full bg-current animate-bounce [animation-delay:200ms] [animation-duration:500ms]" />
		</span>
	);
}

function PlayButton({
	side,
	playing,
	onClick,
	children,
}: {
	side: "original" | "translated";
	playing: boolean;
	onClick: () => void;
	children: React.ReactNode;
}) {
	const active = playing;
	return (
		<button
			onClick={onClick}
			className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] transition ${
				active
					? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300"
					: "border-white/10 text-white/40 hover:border-white/20 hover:text-white hover:bg-white/[0.03]"
			}`}
			title={active ? "Playing…" : undefined}
			data-testid={`button-play-${side}`}
			data-playing={active ? "true" : "false"}
		>
			{active ? <PlayingBars /> : <Volume2 className="h-3.5 w-3.5" />}
			{children}
		</button>
	);
}

export function MessageBubble({
	msg,
	mode,
	playing,
	onPlayOriginal,
	onPlayTranslated,
}: {
	msg: Message;
	mode: "raw" | "translated";
	playing?: "original" | "translated" | null;
	onPlayOriginal?: () => void;
	onPlayTranslated?: () => void;
}) {
	const showRaw = mode === "raw";
	const text = (showRaw ? msg.sourceText : msg.translatedText) || msg.translatedText;
	// Flag/label always reflects the language that was SPOKEN, in both
	// modes — the Raw⇄Translated switch only changes the text.
	const langCode = msg.lang;
	const langName = codeToLangName(langCode);

	return (
		<div className="flex flex-col gap-2 py-1">
			<div className="flex items-center gap-2">
				<img
					src={getLangFlagUrl(langName)}
					alt={`${langName} flag`}
					className="h-5 w-5 rounded-full object-cover"
				/>
				<span className="text-xs font-medium text-white/30 uppercase tracking-widest">
					{langName}
					{!showRaw && msg.sourceText ? " · translated" : ""}
				</span>
				<div className="flex-1 h-px bg-white/[0.05]" />
				<span className="text-[10px] text-white/15">
					{msg.timestamp.toLocaleTimeString([], {
						hour: "2-digit",
						minute: "2-digit",
						second: "2-digit",
					})}
				</span>
			</div>

			<div className="flex items-start gap-2 mt-0.5 pl-7">
				<p className="text-white text-[15px] font-medium leading-relaxed">
					{text ? (
						text
					) : (
						<span className="inline-block w-20 h-4 bg-white/10 rounded-md animate-pulse align-middle" />
					)}
				</p>
			</div>

			{(onPlayOriginal || onPlayTranslated) && (
				<div className="flex items-center gap-2 pl-7 mt-1">
					{onPlayOriginal && msg.sourceText?.trim() && (
						<PlayButton
							side="original"
							playing={playing === "original"}
							onClick={onPlayOriginal}
						>
							Play original
						</PlayButton>
					)}
					{onPlayTranslated && msg.translatedText?.trim() && (
						<PlayButton
							side="translated"
							playing={playing === "translated"}
							onClick={onPlayTranslated}
						>
							Play translated
						</PlayButton>
					)}
				</div>
			)}
		</div>
	);
}
