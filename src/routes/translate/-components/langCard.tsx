import { getLangFlagUrl, LANGUAGES } from "../-actions";

export function LangCard({
	label,
	lang,
	onLangChange,
}: {
	label: "A" | "B";
	lang: string;
	onLangChange: (v: string) => void;
}) {
	const flag = getLangFlagUrl(lang);
	return (
		<div className="flex-1 flex flex-col gap-3 rounded-2xl p-4 border bg-white/[0.03] border-white/20 transition-all duration-300">
			{/* Label badge */}
			<div className="flex items-center justify-between">
				<span className="text-[10px] font-semibold text-white/50 uppercase tracking-[0.15em]">
					Person {label}
				</span>
			</div>

			{/* Flag + Language selector */}
			<div className="flex items-center gap-2">
				<img
					src={flag}
					alt={`${lang} flag`}
					className="h-6 w-6 rounded-full object-cover"
				/>
				<div className="relative flex-1">
					<select
						value={lang}
						onChange={(e) => onLangChange(e.target.value)}
						className="w-full bg-transparent text-white font-semibold text-base outline-none cursor-pointer appearance-none pr-5 [&>option]:bg-zinc-900 [&>option]:text-white"
						data-testid={`select-lang-${label.toLowerCase()}`}
					>
						{LANGUAGES.map((l) => (
							<option key={l.name} value={l.name}>
								{l.name}
							</option>
						))}
					</select>
					<svg
						className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/50"
						viewBox="0 0 12 12"
						fill="none"
					>
						<path
							d="M3 4.5l3 3 3-3"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</div>
			</div>
		</div>
	);
}
