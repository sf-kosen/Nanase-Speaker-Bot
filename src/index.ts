import {
    Client,
    GatewayIntentBits,
    ModalSubmitInteraction,
    ButtonInteraction,
    Interaction,
    CacheType,
} from "discord.js";
import { VoiceConnection } from "@discordjs/voice";
import { Command, ModalCommand, ButtonCommand } from "./types/command";
import { Action, Actions } from "./types/action";
import { VoiceClient } from "./libs/voice";
import { handleSpeak } from "./handlers/vc/speak";
import { handleVcJoin } from "./handlers/vc/join";
import { handleVcLeave } from "./handlers/vc/leave";
import { handleVcLogger } from "./handlers/vc/logger";
import { loadCommands } from "./utils/loader";
import dotenv from "dotenv";


export const JOINING_VOICE_CHANNELS = new Map<string, VoiceConnection>(); // channels -> VoiceConnection
export const VOICE_CLIENTS = new Map<string, VoiceClient>(); // channelId -> VoiceClient

dotenv.config({ path: ".env" });

// 実行環境に応じてファイルタイプとディレクトリを決定
const FILE_TYPE: string = process.argv[2] === "js" ? ".js" : ".ts";
const IS_PRODUCTION = FILE_TYPE === ".js";
const BASE_DIR = IS_PRODUCTION ? "./dist" : "./src";

const commands: { [key: string]: Command } = loadCommands(BASE_DIR, FILE_TYPE);

console.log("Registering commands...");

const client = new Client({
    intents: Object.values(GatewayIntentBits) as GatewayIntentBits[],
});

client.once("clientReady", async () => {
    console.log(`Logged in as ${client.user?.tag}`);

    // Registering commands
    const data: Record<string, any>[] = new Array();

    for (const commandName in commands) {
        console.warn(`  Registering command: ${commandName}`);
        data.push(commands[commandName].data);
    }

    await client.application?.commands.set(data as any);

    console.log("Commands registered successfully!");
    console.log("");
    console.log("Bot is ready!");
    console.log("");

    return client.user?.setActivity("with Discord.js", { type: 0 });
});

function logAndSendError(interaction: any, message: string, err?: any) {
    console.error(err);
    return (async () => {
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: message, ephemeral: true } as any);
            } else if (typeof interaction.reply === "function") {
                await interaction.reply({ content: message, ephemeral: true } as any);
            }
        } catch (e) {
            console.error('Failed to send error message to interaction', e);
        }
    })();
}

client.on("interactionCreate", async (interaction: Interaction<CacheType>) => {
    try {
        // コマンド
        if (interaction.isCommand()) {
            const { commandName } = interaction;
            const command: Command | undefined = commands[commandName];
            if (!command) {
                console.error(`Command ${commandName} not found`);
                await interaction.followUp("This command does not exist!");
                return;
            }

            const flags = command.data.flags || 0;
            if (command.data.defer != false) await interaction.deferReply({ flags });

            console.log(`Executing command: ${commandName}`);
            await command.execute(interaction as any);
            return;
        }
    } catch (error) {
        await logAndSendError(interaction, 'There was an error while executing this interaction!', error);
    }
});

client.on("messageCreate", handleSpeak);
client.on("voiceStateUpdate", handleVcLogger);
client.on("voiceStateUpdate", handleVcJoin);
client.on("voiceStateUpdate", handleVcLeave);

export { FILE_TYPE, client, commands };
client.login(process.env.DISCORD_TOKEN);