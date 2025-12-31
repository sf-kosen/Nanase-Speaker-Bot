import { Message } from "discord.js";
import { JOINING_VOICE_CHANNELS, VOICE_CLIENTS, sperkersData } from "../../..";
import { VoiceClient } from "../../libs/voice";

// FFmpegのパス設定
try {
    const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
    process.env.FFMPEG_PATH = ffmpegPath;
    console.log("FFmpeg configured from package:", ffmpegPath);
} catch (error) {
    console.log("Using system FFmpeg");
}

export async function handleSpeak(message: Message): Promise<void> {
    if (message.author.bot) return;
    const voice = JOINING_VOICE_CHANNELS.get(message.channelId);
    if (!voice) return;

    const content = 
        (message.reference ? "リプライ、" : "") +
        message.content.trim();
    if (!content) return;

    console.log(`Speak in ${message.channelId}: ${content}`);

    try {
        // 既存のVoiceClientを取得または新規作成
        let voiceClient = VOICE_CLIENTS.get(message.channelId);
        if (!voiceClient) {
            voiceClient = new VoiceClient(voice);
            VOICE_CLIENTS.set(message.channelId, voiceClient);
        }

        // 再生中なら終了を待つ
        if (voiceClient.isPlaying()) {
            console.log(`Waiting for current audio to finish in ${message.channelId}...`);
            await voiceClient.waitUntilIdle();
            console.log(`Previous audio finished in ${message.channelId}`);
        }
        
        // 2. 再生
        const sperker = sperkersData.speakers[message.author.id] ?? "VOICEVOX:春日部つむぎ（ノーマル）";
        const replacedContent = sperkersData.dictionary.reduce((text: string, entry: any) => {
            if (entry.useRegex) {
                const regex = new RegExp(entry.word, 'g');
                return text.replace(regex, entry.replacement);
            }
            return text.split(entry.word).join(entry.replacement);
        }, content);

        await voiceClient.speak(replacedContent, sperker);
        
    } catch (e) {
        console.error("Error in handleSpeak:", e);
        await message.reply("読み上げに失敗しました。").catch(() => {});
    }
}

// await voiceClient.play(`https://www.yukumo.net/api/v2/aqtk1/koe.mp3?type=f1&kanji=${encodeURIComponent(truncatedText)}`);