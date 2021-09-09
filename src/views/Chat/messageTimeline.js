const msgLoadCount = 30;

export default class messageTimeline {
    constructor(roomId) {
        this.roomId = roomId;
        this.room = global.matrix.getRoom(this.roomId);
        this.timeline = this.room?.timeline;

        this.edits = new Map();
        this.timeline.forEach((event) => {
            if (this._isEdit(event)) {
                this._addRelationToMap(this.edits, event);
            }
        });
    }
    canScroll = true;

    async getMore() {
        // Only get scrollback if there are messages still to get
        if (this.room.oldState.paginationToken !== null) {
            await global.matrix.scrollback(this.room, msgLoadCount);
        } else {
            this.canScroll = false;
        }
    }

    _isMessage(event) {
        return event.getType() === "m.room.message" && !event.isRedacted();
    }
    _isEdit(event) {return event.isRelation("m.replace")}

    onEvent(event) {
        // Only process messages for current room
        if (event.getRoomId() !== this.roomId) {return}

        // If edited message
        if (this._isEdit(event)) {
            this._addRelationToMap(this.edits, event);
        }
    }

    getMessages() {
        let compiled = this.timeline.filter((event) => {
            return this._isMessage(event) && !this._isEdit(event)
        })
        compiled.reverse()

        return compiled;
    }
    
    _addRelationToMap(map, event) {
        const refId = event.getAssociatedId();

        if (!refId) {return};
        // Events are oldest first so we can safely clear the old edit if one exists
        map.set(refId, event);
    }

    async padTimeline() {
        do {
            await this.getMore()
            var messages = this.getMessages();
        } while (this.canScroll && messages.length < msgLoadCount)
        return messages;
    }

}
