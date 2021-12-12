import type { MatrixEvent } from "matrix-js-sdk";
import { EventType, RelationType } from "matrix-js-sdk/lib/@types/event";

// Filters

export function isMessageEvent(event: MatrixEvent) {
    return event.getType() === EventType.RoomMessage;
}
export function isEditEvent(event: MatrixEvent) {return event.isRelation(RelationType.Replace)}

export function isJoinEvent(event: MatrixEvent) {
    return (
        event.getType() === EventType.RoomMember &&
        event.getContent()?.membership === "join" &&
        event.getPrevContent()?.membership !== "join"  // If current and previous membership is join, the member object was updated
    )
}
export function isLeaveEvent(event: MatrixEvent) {
    return (
        event.getType() === EventType.RoomMember && (
            event.getContent()?.membership === "leave" ||
            event.getContent()?.membership === "ban"
        ) &&
        event.getPrevContent()?.membership === "join"
    )
}
export function isRoomEditEvent(event: MatrixEvent) {
    return (
        event.getType() === EventType.RoomName ||
        event.getType() === EventType.RoomAvatar ||
        event.getType() === EventType.RoomTopic ||
        event.getType() === EventType.RoomServerAcl ||
        event.getType() === EventType.RoomTombstone
    )
}

export function isPinEvent(event: MatrixEvent) {
    return event.getType() === EventType.RoomPinnedEvents;
}

export function isStickerEvent(event: MatrixEvent) {
    return event.getType() === EventType.Sticker;
}

// Utils
export function getReplyId(event: MatrixEvent) {
    const relations = event.getContent()["m.relates_to"];
    const reply: {event_id: string} = relations?.["m.in_reply_to"];
    return reply?.event_id
}
