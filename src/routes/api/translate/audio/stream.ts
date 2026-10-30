import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import speech from "@google-cloud/speech";
import { createFileRoute } from "@tanstack/react-router";
import { detectAudioFormat } from "#/lib/audio";
import { env } from "#/lib/env";
import { translateText } from "#/lib/translation/client";

const defaultLocales: Record<string, string> = {
	en: "en-US",
	hi: "hi-IN",
	bn: "bn-BD",
	ta: "ta-IN",
	te: "te-IN",
	mr: "mr-IN",
	gu: "gu-IN",
	kn: "kn-IN",
	ml: "ml-IN",
	ur: "ur-PK",
	pa: "pa-Guru-IN",
};

export function langToLocale(lang: string) {
	const langPrefix = lang.toLowerCase().split("-")[0];

	return defaultLocales[langPrefix] || `${langPrefix}-US`;
}

function createSseEvent(event: string, data: unknown) {
	return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function getAudioExtension(mimeType: string, detectedFormat: string) {
	if (detectedFormat !== "unknown") {
		return detectedFormat;
	}

	const normalizedMimeType = mimeType.toLowerCase();
	if (normalizedMimeType.includes("mpeg")) return "mp3";
	if (normalizedMimeType.includes("mp4")) return "mp4";
	if (normalizedMimeType.includes("ogg")) return "ogg";
	if (normalizedMimeType.includes("wav")) return "wav";
	return "webm";
}

async function persistDebugAudio(args: {
	audioBuffer: Buffer;
	mimeType: string;
	detectedFormat: string;
	reason: string;
}) {
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	const extension = getAudioExtension(args.mimeType, args.detectedFormat);
	const fileName = `debug-${args.reason}-${timestamp}.${extension}`;
	const filePath = resolve(process.cwd(), "public", "failed-audios", fileName);

	try {
		await mkdir(dirname(filePath), { recursive: true });
		await writeFile(filePath, args.audioBuffer);

		console.log(`[${ts()}] [audio stream] debug audio saved`, {
			reason: args.reason,
			fileName,
			filePath,
			audioBytes: args.audioBuffer.length,
			mimeType: args.mimeType || "unknown",
			detectedFormat: args.detectedFormat,
		});

		return { fileName, filePath };
	} catch (error) {
		// debug persistence must never break the user-facing flow
		console.warn("[audio stream] could not save debug audio", error);
		return { fileName, filePath };
	}
}

function getErrorMessage(error: unknown) {
	if (
		typeof error === "object" &&
		error !== null &&
		"error" in error &&
		typeof error.error === "object" &&
		error.error !== null &&
		"message" in error.error &&
		typeof error.error.message === "string"
	) {
		return error.error.message;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return "Streaming translation failed";
}

const serviceAccountPath = resolve(
	process.cwd(),
	env.GOOGLE_SERVICE_ACCOUNT_FILE,
);

const ts = () =>
	new Date().toLocaleTimeString("en-GB", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	});
// "global" location must use the global endpoint host; regional locations
// prepend the region (e.g. asia-south1-speech.googleapis.com)
const speechEndpoint =
	env.GOOGLE_STT_REGION === "global"
		? "speech.googleapis.com"
		: `${env.GOOGLE_STT_REGION}-speech.googleapis.com`;
const sttClient = existsSync(serviceAccountPath)
	? new speech.v2.SpeechClient({
			keyFilename: serviceAccountPath,
			apiEndpoint: speechEndpoint,
		})
	: null;

console.log(`[${ts()}] [stt] client init`, {
	endpoint: speechEndpoint,
	region: env.GOOGLE_STT_REGION,
	model: env.GOOGLE_STT_MODEL || "short",
	serviceAccountFile: env.GOOGLE_SERVICE_ACCOUNT_FILE,
	clientReady: !!sttClient,
});

async function transcribeWithGoogle(
	audioBuffer: Buffer,
	languageCodes: string[],
	detectedFormat: string,
) {
	if (!env.GOOGLE_CLOUD_PROJECT_ID) {
		throw new Error(
			"Google STT is not configured. Set GOOGLE_CLOUD_PROJECT_ID.",
		);
	}

	if (!sttClient) {
		throw new Error(
			`Google STT service account file not found at ${serviceAccountPath}`,
		);
	}

	const sttModel = env.GOOGLE_STT_MODEL || "short";
	const recognizerPath = `projects/${env.GOOGLE_CLOUD_PROJECT_ID}/locations/${env.GOOGLE_STT_REGION}/recognizers/_`;
	console.log(`[${ts()}] [google stt] recognize request`, {
		model: sttModel,
		region: env.GOOGLE_STT_REGION,
	});

	// autoDecodingConfig only handles WAV/FLAC/AMR/AMR-WB; Chrome's
	// MediaRecorder emits WebM/Opus which Google cannot auto-detect, so
	// specify the decoding params explicitly for those containers.
	const decodingConfig =
		detectedFormat === "webm"
			? {
					explicitDecodingConfig: {
						encoding: "WEBM_OPUS" as "WEBM_OPUS",
						sampleRateHertz: 48000,
						audioChannelCount: 1,
					},
				}
			: detectedFormat === "ogg"
				? {
						explicitDecodingConfig: {
							encoding: "OGG_OPUS" as "OGG_OPUS",
							sampleRateHertz: 48000,
							audioChannelCount: 1,
						},
					}
				: { autoDecodingConfig: {} };

	const [response] = await sttClient.recognize({
		recognizer: recognizerPath,
		config: {
			...decodingConfig,
			languageCodes,
			model: sttModel,
		},
		content: audioBuffer,
	});

	const transcript = response.results
		?.flatMap((result: any) => result.alternatives || [])
		.map((alternative: any) => alternative.transcript || "")
		.join(" ")
		.trim();

	console.log(`[${ts()}] [google stt] recognize response`, {
		resultCount: response.results?.length || 0,
		transcriptLength: transcript?.length,
	});

	if (!transcript) {
		console.error("[google stt] empty transcript", {
			languageCodes,
			resultCount: response.results?.length || 0,
		});
		return "";
	}

	return transcript;
}

export const Route = createFileRoute("/api/translate/audio/stream")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				try {
					const formData = await request.formData();
					const audioFile = formData.get("audio") as File | null;
					const primaryLang = formData.get("primaryLanguage") as string | null;
					const secondaryLanguage = formData.get("secondaryLanguage") as
						| string
						| null;

					if (!audioFile || !primaryLang || !secondaryLanguage) {
						console.log({primaryLang,secondaryLanguage});
						
						return new Response(
							JSON.stringify({
								error:
									"Missing required fields: audio, primaryLang, secondaryLanguage, nativeLocale, secondaryLocale",
							}),
							{ status: 400 },
						);
					}

					const arrayBuffer = await audioFile.arrayBuffer();
					const audioBuffer = Buffer.from(arrayBuffer);
					const detectedFormat = detectAudioFormat(audioBuffer);
					const audioMimeType = audioFile.type || "unknown";
					const languageCodes = [
						langToLocale(primaryLang),
						langToLocale(secondaryLanguage),
					];
					console.log(`[${ts()}] [audio stream] request received`, {
						sizeKB: (audioBuffer.length / 1024).toFixed(1),
						mimeType: audioMimeType || "unknown",
						detectedFormat,
						primaryLang,
						secondaryLanguage,
						languageCodes,
					});

					if (detectedFormat === "unknown") {
						console.error("[audio stream] unsupported audio format", {
							fileName: audioFile.name || "unnamed",
							mimeType: audioFile.type || "unknown",
							audioBytes: audioBuffer.length,
						});
						return new Response(
							JSON.stringify({
								error:
									"Recorded audio format is not recognized. Try again in Chrome/Edge, or use a different microphone/browser.",
								mimeType: audioFile.type || "unknown",
								size: audioBuffer.length,
							}),
							{ status: 415 },
						);
					}

					const stream = new ReadableStream({
						start(controller) {
							const encoder = new TextEncoder();
							let isClosed = false;

							const enqueue = (event: string, data: unknown) => {
								if (isClosed) return;
								try {
									controller.enqueue(encoder.encode(createSseEvent(event, data)));
								} catch (e) {
									isClosed = true;
								}
							};

							const closeStream = () => {
								if (isClosed) return;
								try {
									controller.close();
								} catch (e) {
									// ignore
								} finally {
									isClosed = true;
								}
							};

							void (async () => {
								try {
									const userTranscript = await transcribeWithGoogle(
										audioBuffer,
										languageCodes,
										detectedFormat,
									);

									if (!userTranscript) {
										await persistDebugAudio({
											audioBuffer,
											mimeType: audioMimeType,
											detectedFormat,
											reason: "empty-transcript",
										});
										console.log(`[${ts()}] [audio stream] no transcript returned`, {
											languageCodes,
										});
										enqueue("done", {
											userTranscript: "",
											translatedText: "",
											detectedLanguage: primaryLang,
											isUserSpeakingNative: true,
										});
										closeStream();
										return;
									}

									enqueue("transcript.delta", { text: userTranscript });

									// Google returns the spoken language with the
									// translation — no separate detection call. If the
									// detected language equals the secondary (i.e. the
									// first call was same->same), the speech was
									// actually in the secondary direction, so re-run
									// the translation toward the primary.
									let {
										text: translatedText,
										detectedLanguage,
										durationMs: translateMs,
									} = await translateText(userTranscript, secondaryLanguage);

									if (detectedLanguage === secondaryLanguage) {
										const flipped = await translateText(
											userTranscript,
											primaryLang,
										);
										translatedText = flipped.text;
										detectedLanguage = flipped.detectedLanguage;
										translateMs += flipped.durationMs;
									}

									console.log(`[${ts()}] [audio stream] transcript resolved`, {
										userTranscript,
										detectedLanguage,
										primaryLang,
										secondaryLanguage,
										translateMs,
									});

									enqueue("transcript.final", {
										text: userTranscript,
										detectedLanguage,
									});

									const targetLang =
										detectedLanguage === primaryLang
											? secondaryLanguage
											: primaryLang;

									const sourceLang =
										detectedLanguage === primaryLang
											? primaryLang
											: secondaryLanguage;

									console.log(`[${ts()}] [audio stream] translation complete`, {
										sourceLang,
										targetLang,
										translateMs,
										userTranscript,
										translatedText,
									});

									enqueue("translation.final", {
										text: translatedText,
									});
									enqueue("done", {
										userTranscript,
										translatedText,
										sourceLang,
										targetLang,
									});

									console.log(`[${ts()}] [audio stream] completed`, {
										userTranscriptLength: userTranscript.length,
										translatedLength: translatedText.length,
									});
									closeStream();
								} catch (error) {
									if (isClosed) return;
									console.error("[audio stream] failed", error);
									enqueue("error", {
										message: getErrorMessage(error),
									});
									closeStream();
								}
							})();
						},
						cancel() {
							console.log("[audio stream] client disconnected");
						}
					});

					return new Response(stream, {
						headers: {
							"Content-Type": "text/event-stream",
							"Cache-Control": "no-cache, no-transform",
							Connection: "keep-alive",
						},
					});
				} catch (error) {
					console.error("[audio stream] request setup failed", error);
					return new Response(
						JSON.stringify({ error: "Streaming translation failed" }),
						{ status: 500 },
					);
				}
			},
		},
	},
});
