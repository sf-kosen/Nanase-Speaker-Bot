import { Speaker, SPERKERS } from "../types/voicebox";
import { createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnection, AudioPlayer } from "@discordjs/voice";
import { Buffer } from "buffer";
import path from "path";
import fs from "fs";

const ENDPOINT = "https://deprecatedapis.tts.quest/v2/voicevox/audio/";
const API_KEY = "Q411563_2-i_70P";
const MAX_TEXT_LENGTH = 100;
const REPLACES: { pattern: RegExp; replace: string }[] = [
    { pattern: /```[\s\S]*?```|``[\s\S]*?``|`[^`]*`/g, replace: "コード省略" }, // バッククオート囲みのコードをまとめて省略
    { pattern: /<(#|@|id:|:).*>/g,                     replace: "メンション省略" }, // メンションをメンション省略に
    { pattern: /https?:\/\/\S+(?=\s|$)/g,              replace: "URL省略" }, // URL除去
    { pattern: /\s+/g,                                 replace: " " }, // 連続する空白を単一の空白に
    { pattern: /@/g,                                   replace: "アットマーク" }, // @をアットマークに
    { pattern: /#/g,                                   replace: "シャープ" }, // #をシャープに
    { pattern: /&/g,                                   replace: "アンド" }, // &をアンドに
    { pattern: /^> .*$(?:\n> .*)*$/gm,                 replace: "引用省略" }, // 引用部分を削除
];


class VoiceClient {
    private readonly voice: VoiceConnection | undefined;
    private readonly local: boolean;
    private player: AudioPlayer | null = null;
    private currentTempFile: string | null = null;

    constructor(voice?: VoiceConnection, local?: boolean) {
        this.voice = voice;
        this.local = local || false;
    }

    /**
     * 現在再生中かどうかを確認
     */
    isPlaying(): boolean {
        return this.player !== null && this.player.state.status === AudioPlayerStatus.Playing;
    }

    /**
     * 再生が終了するまで待機
     */
    async waitUntilIdle(): Promise<void> {
        if (!this.player || this.player.state.status === AudioPlayerStatus.Idle) {
            return;
        }

        return new Promise((resolve) => {
            const checkIdle = () => {
                if (this.player && this.player.state.status === AudioPlayerStatus.Idle) {
                    this.player.off(AudioPlayerStatus.Idle, checkIdle);
                    resolve();
                }
            };

            this.player?.on(AudioPlayerStatus.Idle, checkIdle);

            // すでにIdleになっている場合
            if (this.player?.state.status === AudioPlayerStatus.Idle) {
                this.player.off(AudioPlayerStatus.Idle, checkIdle);
                resolve();
            }
        });
    }

    /**
     * 現在の再生を停止
     */
    stop(): void {
        if (this.player) {
            this.player.stop(true); // 強制停止
            this.player.removeAllListeners(); // すべてのイベントリスナーを削除
            this.player = null;
        }

        // 一時ファイルを削除
        if (this.currentTempFile && fs.existsSync(this.currentTempFile)) {
            fs.unlink(this.currentTempFile, (err) => {
                if (err) console.error("Failed to delete temp file:", err);
            });
            this.currentTempFile = null;
        }
    }

    async speak(text: string, speaker: Speaker): Promise<void> {
        const speakerIndex = SPERKERS.indexOf(speaker);
        if (speakerIndex === -1) throw new Error("Invalid speaker");
        const replacedText = REPLACES.reduce((acc, { pattern, replace }) => acc.replace(pattern, replace), text);

        const uri = new URL(ENDPOINT);
        uri.searchParams.append("text", replacedText.length > MAX_TEXT_LENGTH ? replacedText.slice(0, MAX_TEXT_LENGTH) + "、以下省略" : replacedText);
        uri.searchParams.append("speaker", speakerIndex.toString());
        uri.searchParams.append("key", API_KEY);

        await this.play(uri.toString());
    }

    async youtube(url: string): Promise<string> {
        const response = await fetch("https://oo6o8y6la6.execute-api.eu-central-1.amazonaws.com/default/Upload-DownloadYoutubeLandingPage", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            },
            body: JSON.stringify({
                url,
                app: "transkriptor",
                is_only_download: true
            })
        });

        const json = await response.json();
        const youtubeUrl = json.download_url;

        // GoogleVideo用のヘッダー
        const videoResponse = await fetch(youtubeUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                "Accept": "video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5",
                "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
                "Accept-Encoding": "identity;q=1, *;q=0",
                "Range": "bytes=0-",
                "Sec-Ch-Ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
                "Sec-Ch-Ua-Mobile": "?0",
                "Sec-Ch-Ua-Platform": '"Windows"',
                "Sec-Fetch-Dest": "video",
                "Sec-Fetch-Mode": "no-cors",
                "Sec-Fetch-Site": "cross-site"
            },
            redirect: "manual" // リダイレクトを手動で処理
        });

        // リダイレクトされた場合、Locationヘッダーを返す
        if (videoResponse.status >= 300 && videoResponse.status < 400) {
            const location = videoResponse.headers.get("Location");
            if (location) return location;
        }

        if (!videoResponse.ok) throw new Error(`Failed to fetch YouTube audio: ${videoResponse.statusText}`);

        return youtubeUrl;
    }

    async play(url: string): Promise<void> {
        // 既に再生中なら停止
        if (this.player) {
            this.stop();
        }

        let tempFilePath = url;

        if (this.local) {
            // 2. 一時ファイルパス作成
            const tempDir = path.resolve("./temp");
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
            const tempFilePath = path.join(tempDir, `${Date.now()}.mp3`);
            this.currentTempFile = tempFilePath;

            // 3. fetchしてローカル保存
            console.log("Fetching audio from URL:", url);
            const response = await fetch(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                    "Accept": "audio/webm,audio/ogg,audio/wav,audio/*;q=0.9,application/ogg;q=0.7,video/*;q=0.6,*/*;q=0.5",
                    "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
                    "Accept-Encoding": "identity;q=1, *;q=0",
                    "Range": "bytes=0-",
                    "Sec-Ch-Ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
                    "Sec-Ch-Ua-Mobile": "?0",
                    "Sec-Ch-Ua-Platform": '"Windows"',
                    "Sec-Fetch-Dest": "audio",
                    "Sec-Fetch-Mode": "no-cors",
                    "Sec-Fetch-Site": "cross-site"
                }
            });
            if (!response.ok) throw new Error(`Failed to fetch audio: ${response.statusText}`);

            // node-fetch v3 では .buffer() が使えないので arrayBuffer を使う
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            fs.writeFileSync(tempFilePath, buffer);
        }


        // 4. 再生処理
        this.player = createAudioPlayer();
        const resource = createAudioResource(tempFilePath, { inlineVolume: true });
        if (resource.volume) resource.volume.setVolume(0.5);

        this.player.play(resource);
        this.voice?.subscribe(this.player);

        this.player.on(AudioPlayerStatus.Idle, () => {
            // 再生終了時の処理
            fs.unlink(tempFilePath, () => { }); // 再生後に削除
            this.currentTempFile = null;
        });

        this.player.on("error", (error) => {
            console.error("Audio player error:", error);
            fs.unlink(tempFilePath, () => { });
            this.currentTempFile = null;
        });
    }
}


async function speak2(text: string): Promise<string> {
    return "";
}

export { VoiceClient };