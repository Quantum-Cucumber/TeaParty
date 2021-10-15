
export function isMessageEvent(event) {
    return event.getType() === "m.room.message";
}
export function isEditEvent(event) {return event.isRelation("m.replace")}

export function isJoinEvent(event) {
    return (
        event.getType() === "m.room.member" &&
        event.getContent()?.membership === "join" &&
        event.getPrevContent()?.membership !== "join"  // If current and previous membership is join, the member object was updated
    )
}
export function isLeaveEvent(event) {
    return (
        event.getType() === "m.room.member" && (
            event.getContent()?.membership === "leave" ||
            event.getContent()?.membership === "ban"
        ) &&
        event.getPrevContent()?.membership === "join"
    )
}
export function isRoomEditEvent(event) {
    return (
        event.getType() === "m.room.name" ||
        event.getType() === "m.room.avatar" ||
        event.getType() === "m.room.topic" ||
        event.getType() === "m.room.server_acl"
    )
}

export function isPinEvent(event) {
    return event.getType() === "m.room.pinned_events";
}
