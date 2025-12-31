import { VoiceState } from "discord.js";
import { VOICE_CLIENTS, JOINING_VOICE_CHANNELS } from "../..";

const handleVcLeave = (async (oldState: VoiceState, newState: VoiceState) => {
    if (!oldState.channel) return;
    const channelId = oldState.channel.id;
    const memberId = oldState.member?.user.id;

    // 自分自身が退出した場合、VOICE_CLIENTSから削除
    if (memberId === oldState.client.user?.id) {
        if (VOICE_CLIENTS.has(channelId)) {
            VOICE_CLIENTS.delete(channelId);
            JOINING_VOICE_CHANNELS.delete(channelId);
            console.log(`VoiceClient for channel ${channelId} has been removed due to bot leaving.`);
        }
        return;
    }
});

export { handleVcLeave };