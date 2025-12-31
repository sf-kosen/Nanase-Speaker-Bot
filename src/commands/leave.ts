import { JOINING_VOICE_CHANNELS, VOICE_CLIENTS } from "..";
import { Command } from "../types/command";
import { EmbedBuilder, Colors, MessageFlags } from "discord.js";

export default {
    data: {
        name: "leave",
        description: "Leaves the voice channel",
        flags: MessageFlags.Ephemeral,
        defer: true
    },
    async execute(interaction) {
        const channelId = interaction.channelId;
        const voiceClient = VOICE_CLIENTS.get(channelId);
        if (!voiceClient) {
            const embed = new EmbedBuilder()
                .setTitle("ボイスチャンネルに接続していません")
                .setDescription("まずは /join コマンドでボイスチャンネルに接続してください。")
                .setColor(Colors.Red);
            await interaction.followUp({ embeds: [embed] });
            return;
        }
        const joiningPromise = JOINING_VOICE_CHANNELS.get(channelId);
        joiningPromise?.destroy();

        VOICE_CLIENTS.delete(channelId);
        JOINING_VOICE_CHANNELS.delete(channelId);

        const embed = new EmbedBuilder()
            .setTitle("ボイスチャンネルから切断しました")
            .setDescription("ボイスチャンネルから正常に切断しました。")
            .setColor(Colors.Green);
        await interaction.followUp({ embeds: [embed] });
    }
} as Command;