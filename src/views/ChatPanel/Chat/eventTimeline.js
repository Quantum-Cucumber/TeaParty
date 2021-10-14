import Settings from "../../../utils/settings";
import { debounce } from "../../../utils/utils";

const msgLoadCount = 30;

function _isMessage(event) {
    return event.getType() === "m.room.message";
}
function _isEdit(event) {return event.isRelation("m.replace")}

function _isJoin(event) {
    return (
        event.getType() === "m.room.member" &&
        event.getContent()?.membership === "join"
    )
}
function _isLeave(event) {
    return (
        event.getType() === "m.room.member" &&
        event.getContent()?.membership === "leave" &&
        event.getContent()?.membership === "ban"
    )
}

export function shouldDisplayEvent(event) {
    return (
        (   // If m.room.message should be displayed
            _isMessage(event) && 
            !_isEdit(event) &&  // Edits will update the original event object
            (!event.isRedacted() || Settings.getSetting("showRedactedEvents"))
        ) ||
        // Join/leave events
        (_isJoin(event) && Settings.getSetting("showJoinEvents")) || (_isLeave(event) && Settings.getSetting("showLeaveEvents"))
    )
}

export default class eventTimeline {
    constructor(roomId) {
        this.roomId = roomId;
        this.room = global.matrix.getRoom(this.roomId);
        this.timeline = this.room?.getLiveTimeline().getEvents();
        this.userId = global.matrix.getUserId();
    }
    canLoad = true;
    read = false;
    isReading = false;  // An override variable for read. true when user is at bottom of the chat

    isRead() {
        return (this.read || this.isReading);
    }

    async getMore() {
        // Only get scrollback if there are events still to get
        if (this.room.oldState.paginationToken !== null) {
            await global.matrix.scrollback(this.room, msgLoadCount);
        } else {
            this.canLoad = false;
        }
    }

    onEvent(event, toStartOfTimeline) {
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
        /* Filter events that will update the state of the chat */
        let compiled = this.timeline.filter((event) => {
            return _isMessage(event) || shouldDisplayEvent(event);
        })
        
        return compiled;
    }

    // Avoid spamming read receipts
    debouncedRead = debounce((event) => {global.matrix.sendReadReceipt(event)}, 500);
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
