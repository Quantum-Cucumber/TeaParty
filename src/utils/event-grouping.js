
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

export function isStickerEvent(event) {
    return event.getType() === "m.sticker";
}


// Highest -> lowest
const tagPriority = {
    "m.favourite": 2,
    "m.servernotice": 1,
    "m.lowpriority": -1,
}
function tagToInt(roomTags) {
    /* Processes a room's tags and returns an int that can be compared easily */
    for (let tag in tagPriority) {
        if (roomTags.hasOwnProperty(tag)) {
            // Priority of tag + order of tag (between 0 and 1) (or 2 if no order supplied - to go below those with orders)
            return [tagPriority[tag], (roomTags[tag].hasOwnProperty("order") ? roomTags[tag].order : 2)];
        }
    }
    // No special tags
    return [0, 2];
}

export function sortRooms(roomList) {
    /* Sort alphabetically then by order tags */
    return roomList.sort((roomA, roomB) => {
        return new Intl.Collator("en").compare(roomA.name, roomB.name)
    })
    .sort((roomA, roomB) => {
        const [aPriority, aOrder] = tagToInt(roomA.tags);
        const [bPriority, bOrder] = tagToInt(roomB.tags);
        // console.log("a", roomA.name, aPriority, aOrder)
        // console.log("b", roomB.name, bPriority, bOrder)
        
        // Sort by priority first - high to low
        if (aPriority !== bPriority) {
            return bPriority - aPriority;
        }
        // Sort by order of priority tag - low to high
        return aOrder - bOrder;
    })
}
