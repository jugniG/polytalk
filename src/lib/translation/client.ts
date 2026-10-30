const languageNames = new Intl.DisplayNames(["en"], { type: "language" });

const ts = () =>
	new Date().toLocaleTimeString("en-GB", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	});

function codeToName(code: string): string {
	return languageNames.of(code)?.toLowerCase() || code.toLowerCase();
}

export type TranslationResult = {
	text: string;
	detectedLanguage: string;
	durationMs: number;
};

// Google Cloud Translation v2 — sub-second latency and auto-detects the
// source language for free in the same response. Replaces Lingo.dev,
// which took 6-12s per call on short conversational text.
export async function translateText(
	text: string,
	targetLocale: string,
	sourceLocale?: string,
): Promise<TranslationResult> {
	if (!text) {
		throw new Error("Missing text for translation");
	}
	if (!targetLocale) {
		throw new Error("Missing target language for translation");
	}

	const apiKey = process.env.GOOGLE_TTS_API_KEY;
	if (!apiKey) {
		throw new Error(
			"Google Translate is not configured. Set GOOGLE_TTS_API_KEY.",
		);
	}

	console.log(`[${ts()}] [translation client] request payload`, {
		text,
		targetLocale,
		sourceLocale: sourceLocale || "auto",
	});

	const startedAt = Date.now();
	const response = await fetch(
		`https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				q: text,
				target: targetLocale,
				...(sourceLocale ? { source: sourceLocale } : {}),
				format: "text",
			}),
		},
	);
	const durationMs = Date.now() - startedAt;

	if (!response.ok) {
		const errorText = await response.text();
		console.error(`[${ts()}] [translation client] google request failed`, {
			status: response.status,
			statusText: response.statusText,
			body: errorText.slice(0, 300),
		});
		throw new Error(`Translation API failed with status ${response.status}`);
	}

	const { data } = await response.json();
	const translation = data?.translations?.[0];
	if (!translation?.translatedText) {
		throw new Error("Translation API returned no text");
	}

	console.log(`[${ts()}] [translation client] translated (${durationMs}ms)`, {
		source: translation.detectedSourceLanguage || sourceLocale || "?",
		target: targetLocale,
		text: translation.translatedText,
	});

	return {
		text: translation.translatedText,
		detectedLanguage: translation.detectedSourceLanguage || sourceLocale || "",
		durationMs,
	};
}

export { codeToName };
