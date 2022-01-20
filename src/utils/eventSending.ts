import { EventType, RelationType, MsgType } from "matrix-js-sdk/lib/@types/event";

import type { MatrixEvent } from "matrix-js-sdk";


export async function addReaction(event: MatrixEvent, emote: string) {
    const newEvent = {
        "m.relates_to": {
            rel_type: RelationType.Annotation,
            event_id: event.getId(),
            key: emote,
        }
    };
    await global.matrix.sendEvent(event.getRoomId(), EventType.Reaction, newEvent)
}

export async function updatePins(roomId: string, pins: string[]) {
    const newContent = {
        pinned: pins,
    }
    await global.matrix.sendStateEvent(roomId, EventType.RoomPinnedEvents, newContent);
}

export async function sendMessage(roomId: string, body: string) {
    const event = {
        body: body,
        msgtype: MsgType.Text,
    }

    await global.matrix.sendEvent(roomId, EventType.RoomMessage, event);
}
