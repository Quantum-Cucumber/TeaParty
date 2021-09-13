function _isJoined(room) {
    return room?.getMyMembership() === "join";
}

function copyRooms(rooms) {
    /* Create a bare bones copy of a room object, enough to differentiate it from other instances*/
    return rooms.map((room) => {
        return {roomId: room.roomId, name: room.name, room: room};
    });
}


export default class navManager {
    constructor(setGroups, setRooms, setInvites) {
        this.setGroups = setGroups;
        this.setRooms = setRooms;
        this.setInvites = setInvites;

        this.roomToGroup = new Map();  // room => group
        this.currentGroup = null;
        this.currentRooms = []

        // Initialise room mapping
        this._getDirects();
        const groups = this._getGroups();
        groups.forEach((group) => {
            this._getSpaceChildren(group.roomId);
        });

        this._startListeners();
        this.setGroups(groups);
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
        this.setRooms(copyRooms(rooms));
        this.currentRooms = rooms;
    }


    /* Listeners */

    _listeners = {
        "Room.myMembership": this._membershipChange.bind(this),
        "accountData": this._accountData.bind(this), 
        "Room.name": this._roomRenamed.bind(this),
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
        if (oldState === "join" && state === "leave") {
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

        // Invited to room
        if (oldState === null && state === "invite") {
            this.setInvites(this._getInvitedRooms());
        }
    }

    // DM room info
    _accountData(event) {
        console.log("Account data", event)
        return;
        if (event.getType() !== "m.direct") {return};
        if (!this.groups.has("directs")) {return};

    }

    // Room name updated
    _roomRenamed(room) {
        if (this.currentRooms.includes(room)) {
            this.setRooms(copyRooms(this.currentRooms));
        }
    }

    
    /* Initial population of groups */

    _getDirects() {
        /* Get all direct rooms and add to mapping */
        const directs = global.matrix.getAccountData("m.direct").getContent();
        Object.values(directs).forEach((rooms) => {
            rooms.forEach((directRoom) => {
                const roomObj = global.matrix.getRoom(directRoom);
                if (_isJoined(roomObj)) {
                    this.roomToGroup.set(directRoom, "directs")
                }
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
        var invites = [];
        global.matrix.getVisibleRooms().forEach((room) => {
            if (room.getMyMembership() === "invite") {
                //m.room.member event for logged in user
                const memberEvent = room.getMember(global.matrix.getUserId()).events.member;
                const inviter = memberEvent.event.sender;
                let type = "Room";

                // Identify if invite is to a DM
                if (memberEvent?.getContent()?.is_direct) {
                    type = "Direct";
                }
                // If space room
                else if (room.isSpaceRoom()) {
                    type = "Space";
                }
                
                invites.push({type: type, inviter: inviter, room: room});
            }
        });

        return invites;
    }
}