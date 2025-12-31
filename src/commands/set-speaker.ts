import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { SPERKERS } from '../types/voicebox';
import { Command } from '../types/command';
import { sperkersData } from '..';
import path from 'path';
import fs from 'fs';

export default {
    data: {
        name: 'set-speaker',
        description: '話者を設定します。',
        defer: true,
        options: [
            {
                name: 'speaker',
                type: 3, // STRING
                description: '使用する話者の名前またはID',
                required: true,
                choices: SPERKERS.map((speaker, index) => ({
                    name: speaker.replace('VOICEVOX:', '').slice(0, 25),
                    value: index.toString(),
                })).slice(0, 25), // Discordの仕様で選択肢は最大25個まで
            }
        ]
    },

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const speakerIndex = interaction.options.getString('speaker', true);
        const speaker = SPERKERS[parseInt(speakerIndex)];
        sperkersData.speakers[interaction.user.id] = speaker;
        fs.writeFileSync(path.join(__dirname, '../../speakers.json'), JSON.stringify(sperkersData, null, 2), 'utf-8');

        const embed = new EmbedBuilder()
            .setTitle('話者設定完了')
            .setDescription(`話者を **${speaker}** に設定しました。`)
            .setColor(0x00FF00);

        await interaction.followUp({ embeds: [embed] });
    }
} as Command;