import type { MatrixEvent } from "matrix-js-sdk";

// Filters

export function isMessageEvent(event: MatrixEvent) {
    return event.getType() === "m.room.message";
}
export function isEditEvent(event: MatrixEvent) {return event.isRelation("m.replace")}

export function isJoinEvent(event: MatrixEvent) {
    return (
        event.getType() === "m.room.member" &&
        event.getContent()?.membership === "join" &&
        event.getPrevContent()?.membership !== "join"  // If current and previous membership is join, the member object was updated
    )
}
export function isLeaveEvent(event: MatrixEvent) {
    return (
        event.getType() === "m.room.member" && (
            event.getContent()?.membership === "leave" ||
            event.getContent()?.membership === "ban"
        ) &&
        event.getPrevContent()?.membership === "join"
    )
}
export function isRoomEditEvent(event: MatrixEvent) {
    return (
        event.getType() === "m.room.name" ||
        event.getType() === "m.room.avatar" ||
        event.getType() === "m.room.topic" ||
        event.getType() === "m.room.server_acl" ||
        event.getType() === "m.room.tombstone"
    )
}

export function isPinEvent(event: MatrixEvent) {
    return event.getType() === "m.room.pinned_events";
}

export function isStickerEvent(event: MatrixEvent) {
    return event.getType() === "m.sticker";
}

// Utils
export function getReplyId(event: MatrixEvent) {
    const relations = event.getContent()["m.relates_to"];
    const reply: {event_id: string} = relations?.["m.in_reply_to"];
    return reply?.event_id
}
