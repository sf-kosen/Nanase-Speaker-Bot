import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../types/command';
import { sperkersData } from '..';
import path from 'path';
import fs from 'fs';

export default {
    data: {
        name: 'dictionary',
        description: '辞書操作を行います。',
        defer: true,
        options: [
            {
                name: 'mode',
                type: 3, // STRING
                description: '操作モードを選択してください。',
                required: true,
                choices: [
                    { name: '追加', value: 'add' },
                    { name: '削除', value: 'remove' },
                ]
            },
            {
                name: 'word',
                type: 3, // STRING
                description: '対象の単語を入力してください。',
                required: true,
            },
            {
                name: 'replacement',
                type: 3, // STRING
                description: '置換後の単語を入力してください。（追加モード時のみ）',
                required: false,
            },
            {
                name: 'use_regex',
                type: 5, // BOOLEAN
                description: '正規表現を使用するかどうか。（省略時は無効）',
                required: false,
            }
        ]
    },
    
    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const mode = interaction.options.getString('mode', true);
        const word = interaction.options.getString('word', true);
        const replacement = interaction.options.getString('replacement', false) || '';
        const useRegex = interaction.options.getBoolean('use_regex', false) || false;

        if (mode === 'add') {
            sperkersData.dictionary.push({ word, replacement, useRegex });
            fs.writeFileSync(path.join(__dirname, '../../dictionary.json'), JSON.stringify(sperkersData, null, 2), 'utf-8');
            const embed = new EmbedBuilder()
                .setTitle('辞書追加完了')
                .setDescription(`単語 **${word}** を **${replacement}** に追加しました。`)
                .setColor(0x00FF00);
            await interaction.followUp({ embeds: [embed] });
        } else if (mode === 'remove') {
            const index = sperkersData.dictionary.findIndex((entry: any) => entry.word === word);
            if (index !== -1) {
                sperkersData.dictionary.splice(index, 1);
                fs.writeFileSync(path.join(__dirname, '../../dictionary.json'), JSON.stringify(sperkersData, null, 2), 'utf-8');
                const embed = new EmbedBuilder()
                    .setTitle('辞書削除完了')
                    .setDescription(`単語 **${word}** を辞書から削除しました。`)
                    .setColor(0x00FF00);
                await interaction.followUp({ embeds: [embed] });
            } else {
                const embed = new EmbedBuilder()
                    .setTitle('辞書削除失敗')
                    .setDescription(`単語 **${word}** は辞書に存在しません。`)
                    .setColor(0xFF0000);
                await interaction.followUp({ embeds: [embed] });
            }
        }
    }
} as Command;