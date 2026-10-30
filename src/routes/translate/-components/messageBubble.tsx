import langs from "langs";
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
	timestamp: Date;
}

function codeToLangName(code: string) {
	const name = langs.where("1", code)?.name || "English";
	// "Punjabi" is missing from the langs package (its IANA name is "Panjabi")
	return name === "Panjabi" ? "Punjabi" : name;
}

export function MessageBubble({
	msg,
	mode,
}: {
	msg: Message;
	mode: "raw" | "translated";
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
		</div>
	);
}
