import { Command } from "../types/command";
import { Colors, EmbedBuilder, ChatInputCommandInteraction } from "discord.js";
import { joinVoiceChannel } from "@discordjs/voice";
import { VoiceClient } from "../libs/voice";
import { JOINING_VOICE_CHANNELS, VOICE_CLIENTS } from "../..";

export default {
    data: {
        name: "join",
        description: "ボイスチャンネルに参加します。",
        defer: true,
    },

    async execute(interaction: ChatInputCommandInteraction) {
        const memberId = interaction.member?.user.id;
        const member = interaction.guild?.members.cache.get(memberId || "");
        const voiceChannel = member?.voice.channel;

        if (!voiceChannel) {
            const embed = new EmbedBuilder()
                .setColor(Colors.Red)
                .setTitle("エラー")
                .setDescription("ボイスチャンネルに参加してから実行してください。");
            await interaction.followUp({ embeds: [embed], ephemeral: true });
            return;
        }

        try {
            const voiceConnection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild.id,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            });
            const voiceClient = new VoiceClient(voiceConnection);
            
            JOINING_VOICE_CHANNELS.set(interaction.channelId, voiceConnection);
            VOICE_CLIENTS.set(voiceChannel.id, voiceClient);
            const embed = new EmbedBuilder()
                .setColor(Colors.Green)
                .setTitle("成功")
                .setDescription(`ボイスチャンネル「${voiceChannel.name}」に参加しました。`);
            await interaction.followUp({ embeds: [embed], ephemeral: true });
            return;
        } catch (error) {
            console.error("join: ボイスチャンネル参加に失敗しました:", error);
            const embed = new EmbedBuilder()
                .setColor(Colors.Red)
                .setTitle("エラー")
                .setDescription("ボイスチャンネルへの参加に失敗しました。");
            await interaction.followUp({ embeds: [embed], ephemeral: true });
            return;
        }
    }
} as Command;