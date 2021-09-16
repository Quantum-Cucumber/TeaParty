function _isJoined(room) {
    return room?.getMyMembership() === "join";
}

function roomStates(rooms) {
    /* Create a bare bones copy of a room object, enough to differentiate it from other instances*/
    return rooms.map((room) => {
        const userId = global.matrix.getUserId();
        const events = room.getLiveTimeline().events.slice().reverse();  // Get events youngest to oldest
        const lastRead = room.getEventReadUpTo(userId);
        var read = true;
        for (const event of events) {
            // If reached read event, all events are read, so quit the for/of
            if (event.getId() === lastRead) {break}
            // If event is a message (and we havent reached the read event), this event is unread
            // Ignore messages from the logged in user since those will be read anyway
            if (event.getType() === "m.room.message" && event.getSender() !== userId) {
                read = false;
                break;
            }
        }
        
        const notifications = room.getUnreadNotificationCount("total");

        return {
            roomId: room.roomId, name: room.name, room: room, 
            read: read, notifications: notifications
        };
    });
}


export default class navManager {
    constructor(setGroups, setRooms, setInvites, selectRoom) {
        this.setGroups = setGroups;
        this.setRooms = setRooms;
        this.setInvites = setInvites;
        this.selectRoom = selectRoom;

        this.roomToGroup = new Map();  // room => group
        this.groupBreadcrumbs = new Map();  // group => selected room
        this.currentGroup = null;
        this.currentRooms = [];
        this.selectedRoom = null;

        this._initRoomMap();

        this._startListeners();
        this.setGroups(this._getGroups());
        this.setInvites(this._getInvitedRooms());
        // When initialised, go to home by default
        this.groupSelected("home");
    }


    getRoomsFromGroup(groupKey) {
        var rooms = [];
        switch(groupKey) {
            case "home":
                const spaceIds = this._getGroups().map((group) => {return group.roomId})

                // Get rooms that are not in the space/directs map
                global.matrix.getVisibleRooms().forEach((room) => {
                    if (_isJoined(room)) {
                        if (!this.roomToGroup.has(room.roomId) && !spaceIds.includes(room.roomId)) {
                            rooms.push(room);
                        }
                    }
                });
                break;

            default:
                this.roomToGroup.forEach((groupId, roomId) => {
                    const room = global.matrix.getRoom(roomId);
                    if (groupId === groupKey && _isJoined(room)) {
                        rooms.push(room);
                    }
                });
        }
        return rooms;
    }


    groupSelected(groupKey) {
        this.currentGroup = groupKey;
        const rooms = this.getRoomsFromGroup(groupKey);
        this.setRooms(roomStates(rooms));
        this.currentRooms = rooms;

        this.selectRoom(this.groupBreadcrumbs.get(this.currentGroup) || null);
    }


    /* Listeners */

    _listeners = {
        "Room.myMembership": this._membershipChange.bind(this),
        "accountData": this._accountData.bind(this), 
        "Room.name": this._roomRenamed.bind(this),
        "Room.timeline": this._roomEvent.bind(this),
        "Room.receipt": this._readReceipt.bind(this),
    }
    _startListeners() {
        Object.keys(this._listeners).forEach((type) => {
            console.log("Attached", type)
            global.matrix.on(type, this._listeners[type]);
        })
    }
    detachListeners() {
        Object.keys(this._listeners).forEach((type) => {
            global.matrix.removeListener(type, this._listeners[type]);
        })
    }

    // Membership in room updated
    _membershipChange(room, state, oldState) {
        console.log("Membership change", oldState, state, room);

        // Left room
        if (state === "leave" || state === "ban") {
            if (room.isSpaceRoom()) {
                // Left space, update group list
                this.setGroups(this.getGroups());
                return;
            }

            // Remove from mapping
            this.roomToGroup.delete(room.roomId);
            // If current group has that room, refresh the list
            if (this.currentRooms.includes(room)) {
                this.groupSelected(this.currentGroup);
            }
        }

        // New invite to a room, or invite has changed (joined room etc)
        if (state === "invite" || oldState === "invite") {
            this.setInvites(this._getInvitedRooms());
        }

        // Joined room 
        if (state === "join") {
            if (room.isSpaceRoom()) {
                this.setGroups(this._getGroups());
            } else {
                // We don't know which group this belongs to, so reinitialise all the groups
                this._initRoomMap();

                // Check if the current group was updated, if so, refresh it
                if (this.getRoomsFromGroup(this.currentGroup).includes(room)) {
                    this.groupSelected(this.currentGroup);
                }
            }
        }
    }

    // DM room info
    _accountData(event) {
        console.log("Account data", event)

        // If m.directs list updated, refresh the dms list
        if (event.getType() !== "m.direct") {
            this._getDirects();  // This updates the room mapping with new values

            // If currently in the directs group, update the room list
            if (this.currentGroup === "directs") {
                this.groupSelected("directs");
            }
        };

    }

    // Room name updated
    _roomRenamed(room) {
        if (this.currentRooms.includes(room)) {
            this.setRooms(roomStates(this.currentRooms));
        }
    }

    // Message event
    _roomEvent(event, room, toStartOfTimeline, removed) {
        if (removed) {return};
        if (event.getType() !== "m.room.message") {return};

        // If event's room is in current roomlist, refresh (to add indicators)
        if (this.currentRooms.includes(room)) {
            this.groupSelected(this.currentGroup);
        }
    }

    // Read receipt
    _readReceipt(event, room) {
        // Check if read receipt was the signed in user, then update the unread indicators if so
        const userId = Object.keys(Object.values(event.getContent())[0]["m.read"])[0];
        if (userId === global.matrix.getUserId()) {
            // If event's room is in current roomlist, refresh (to add indicators)
            if (this.currentRooms.includes(room)) {
                this.groupSelected(this.currentGroup);
            }
        }        
    }

    
    /* Initial population of groups */

    _initRoomMap() {
        // Reset current map
        this.roomToGroup.clear();

        // Get room maps
        this._getDirects();
        const groups = this._getGroups();
        groups.forEach((group) => {
            this._getSpaceChildren(group.roomId);
        });}

    _getDirects() {
        /* Get all direct rooms and add to mapping */
        const directs = global.matrix.getAccountData("m.direct").getContent();
        Object.values(directs).forEach((rooms) => {
            rooms.forEach((directRoom) => {
                this.roomToGroup.set(directRoom, "directs")
            })
        });
    }

    _getSpaceChildren(spaceId) {
        const space = global.matrix.getRoom(spaceId);
        const childEvents = space.currentState.getStateEvents('m.space.child');
        childEvents.forEach((event) => {
            const childId = event.event.state_key;
            this.roomToGroup.set(childId, spaceId);
        })
    }

    _getGroups() {
        return global.matrix.getVisibleRooms().filter((room) => {
            return _isJoined(room) && room.isSpaceRoom();
        });
    }

    _getInvitedRooms() {
        var rooms = [];
        var directs = [];
        var spaces = [];
        global.matrix.getVisibleRooms().forEach((room) => {
            if (room.getMyMembership() === "invite") {
                //m.room.member event for logged in user
                const memberEvent = room.getMember(global.matrix.getUserId()).events.member;
                const inviter = memberEvent.event.sender;

                // Identify if invite is to a DM
                if (memberEvent?.getContent()?.is_direct) {
                    directs.push({inviter: inviter, room: room});
                }
                // If space room
                else if (room.isSpaceRoom()) {
                    spaces.push({inviter: inviter, room: room});
                }
                else {
                    rooms.push({inviter: inviter, room: room});
                }
                
            }
        });

        return {Rooms: rooms, "Direct messages": directs, Spaces: spaces};
    }

    /* Room breadcrumbs */
    roomSelected(room) {
        this.groupBreadcrumbs.set(this.currentGroup, room);
    }
}