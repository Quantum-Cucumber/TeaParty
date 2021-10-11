const msgLoadCount = 30;

export default class messageTimeline {
    constructor(roomId) {
        this.roomId = roomId;
        this.room = global.matrix.getRoom(this.roomId);
        this.timeline = this.room?.getLiveTimeline().getEvents();
        this.userId = global.matrix.getUserId();

        this.edits = new Map();
        this.timeline.forEach((event) => {
            if (this._isEdit(event)) {
                this._addRelationToMap(this.edits, event);
            }
        });
    }
    canLoad = true;
    read = false;

    async getMore() {
        // Only get scrollback if there are messages still to get
        if (this.room.oldState.paginationToken !== null) {
            await global.matrix.scrollback(this.room, msgLoadCount);
        } else {
            this.canLoad = false;
        }
    }

    _isMessage(event) {
        return event.getType() === "m.room.message" && !event.isRedacted();
    }
    _isEdit(event) {return event.isRelation("m.replace")}

    onEvent(event, toStartOfTimeline) {
        // Only process messages for current room
        if (event.getRoomId() !== this.roomId) {return}

        // If edited message
        if (this._isEdit(event)) {
            this._addRelationToMap(this.edits, event);
        } 
        // Mark timeline as unread if new message received and not from current user
        if (!toStartOfTimeline && this._isMessage(event) && event.getSender() !== this.userId) {
            console.log("mark unread")
            this.read = false;
        }
    }

    getMessages() {
        let compiled = this.timeline.filter((event) => {
            return this._isMessage(event) && !this._isEdit(event)
        })
        
        return compiled;
    }
    
    _addRelationToMap(map, event) {
        const refId = event.getAssociatedId();

        if (!refId) {return};
        // Events are oldest first so we can safely clear the old edit if one exists
        map.set(refId, event);
    }

    async markAsRead() {
        if (!this.read) {
            const messages = this.getMessages()
            if (messages.length === 0) {return}

            const event = messages[messages.length - 1];
            // Spec says not to send read receipts for own events
            if (event.getSender() === global.matrix.getUserId()) {return}

            this.read = true;
            await global.matrix.sendReadReceipt(event);
        }
    }
}
