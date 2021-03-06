import Settings from "../../../utils/settings";
import { debounce } from "../../../utils/utils";
import { isMessageEvent, isEditEvent, isJoinEvent, isLeaveEvent, isRoomEditEvent, isPinEvent, isStickerEvent } from "../../../utils/event";

import type { MatrixEvent, Room } from "matrix-js-sdk";

const msgLoadCount = 30;


export function shouldDisplayEvent(event: MatrixEvent) {
    return !!event && (
        // If event is allowed to be displayed
        (
            isMessageEvent(event) ||
            (isJoinEvent(event) && !!Settings.get("showJoinEvents")) || (isLeaveEvent(event) && !!Settings.get("showLeaveEvents")) ||
            (isRoomEditEvent(event) && !!Settings.get("showRoomEdits")) ||
            isPinEvent(event) ||
            isStickerEvent(event)
        ) &&
        // If event otherwise shouldn't be displayed
        !isEditEvent(event) &&  // Edits will update the original event object so don't display them
        (!event.isRedacted() || !!Settings.get("showRedactedEvents"))
    )
}

export default class eventTimeline {
    roomId: string;
    room: Room;
    userId: string;
    constructor(roomId: string) {
        this.roomId = roomId;
        this.room = global.matrix.getRoom(this.roomId);
        this.userId = global.matrix.getUserId();
    }
    canLoad = true;
    read = false;

    async getMore() {
        // Only get scrollback if there are events still to get
        if (this.room.oldState.paginationToken !== null) {
            await global.matrix.scrollback(this.room, msgLoadCount);
        } else {
            this.canLoad = false;
        }
    }

    onEvent(event: MatrixEvent, toStartOfTimeline: boolean) {
        /* Basically just to update unread flag ig?? */
        
        // Only process messages for current room
        if (event.getRoomId() !== this.roomId) {return}

        // Mark timeline as unread if new message received and not from current user
        if (!toStartOfTimeline && shouldDisplayEvent(event) && event.getSender() !== this.userId) {
            console.log("mark unread")
            this.read = false;
        }
    }

    getEvents() {
        const compiled = this.room?.getLiveTimeline().getEvents().filter(shouldDisplayEvent)
        return compiled;
    }

    // Avoid spamming read receipts
    debouncedRead = debounce((event: MatrixEvent) => {global.matrix.sendReadReceipt(event)}, 500);
    markAsRead() {
        if (!this.read) {
            const events = this.getEvents()
            if (events.length === 0) {return}

            const event = events[events.length - 1];
            // Spec says not to send read receipts for own events
            if (event.getSender() === global.matrix.getUserId()) {return}

            this.read = true;
            this.debouncedRead(event)
        }
    }
}
