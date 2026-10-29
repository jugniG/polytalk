export const LANGUAGES: { name: string; flag: string }[] = [
	{ name: "English", flag: "US" },
	{ name: "Hindi", flag: "IN" },
	{ name: "Bengali", flag: "IN" },
	{ name: "Tamil", flag: "IN" },
	{ name: "Telugu", flag: "IN" },
	{ name: "Marathi", flag: "IN" },
	{ name: "Gujarati", flag: "IN" },
	{ name: "Kannada", flag: "IN" },
	{ name: "Malayalam", flag: "IN" },
	{ name: "Urdu", flag: "IN" },
	{ name: "Punjabi", flag: "IN" },
];

export function getLangFlag(name: string) {
	return LANGUAGES.find((l) => l.name === name)?.flag ?? "US";
}

export function getLangFlagUrl(name: string, isCode?: boolean) {
	const code = isCode ? name : getLangFlag(name);
	return `https://flagsapi.com/${code}/flat/64.png`;
}
