import { VoiceState, ChannelType, PermissionFlagsBits } from "discord.js";
import { VOICE_CLIENTS } from "../..";

const handleVcJoin = (async (oldState: VoiceState, newState: VoiceState) => {
    if (!newState.channel) return;
    const channelId = newState.channel.id;
    if (!VOICE_CLIENTS.has(channelId)) return;

    VOICE_CLIENTS.get(channelId)?.speak(`${newState.member?.user.username} がボイスチャンネルに参加しました.`, "VOICEVOX:No.7（アナウンス）")
});

export { handleVcJoin };