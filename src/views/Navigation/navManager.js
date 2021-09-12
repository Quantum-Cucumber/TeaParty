function _is_joined(room) {
    return room?.getMyMembership() === "join";
}

function copyRooms(rooms) {
    /* Create a bare bones copy of a room object, enough to differentiate it from other instances*/
    return rooms.map((room) => {
        return {roomId: room.roomId, name: room.name, room: room};
    });
}


export default class navManager {
    constructor(setGroups, setRooms) {
        this.setGroups = setGroups;
        this.setRooms = setRooms;
        this.groups = new Map();  // Store a cache of the rooms in given groups
        this.currentGroup = null;
        this.currentRooms = []

        this._startListeners()
        this.setGroups(this.getGroups()); 
        // When initialised, go to home by default
        this.groupSelected("home");
    }


    groupSelected(groupKey) {
        this.currentGroup = groupKey;
        // Return from this.groups, otherwise
        if (this.groups.has(groupKey)) {
            const rooms = this.groups.get(groupKey);
            this.currentRooms = rooms;
            this.setRooms(copyRooms(rooms));
            return;
        }

        let fetched = this._getRooms(groupKey);
        this.setRooms(null);  // For loading wheel

        // Resolve as promise so async space requests return once loaded. Non async won't be affected
        Promise.resolve(fetched).then((result) => {
            this.groups.set(groupKey, result);
            this.currentRooms = result;
            this.setRooms(copyRooms(result))
        });
    }

    /* Listeners */
    /*
    Room.myMembership - membership in room updated
    Room - new room is added
    accountData - dm room info
    Room.name - room name updated
    deleteRoom - room deleted (forget room)
    */

    _listeners = {
        "Room.myMembership": this._membershipChange, // Membership in room updated (e.g. invited -> joined)
        "Room": ()=>{}, // New room added
        "accountData": this._accountData, // DM room info
        "Room.name": this._roomRenamed.bind(this), // Room name updated
        "deleteRoom": ()=>{}, // room deleted ("forget room")
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

    _membershipChange(room, state, oldState) {
        console.log("Membership change", state, room)
        return;
    }

    _accountData(event) {
        console.log("Account data", event)
        return;
        if (event.getType() !== "m.direct") {return};
        if (!this.groups.has("directs")) {return};

        // Update mapping and refresh current room list if needed
        this.groups.set("directs", this.getDirects(true))
        if (this.currentGroup === "directs") {
            this.groupSelected("directs");
        }
    }

    _roomRenamed(room) {
        if (this.currentRooms.includes(room)) {
            this.setRooms(copyRooms(this.currentRooms));
        }
    }

    
    /* Handle manually filtering for a group's rooms */

    _getRooms(groupKey) {
        switch (groupKey) {
            case "home":
                return this.getOrphanRooms();
            case "directs":
                return this.getDirects(true);
            default:
                return this.joinedSpaceChildren(groupKey);
        }
    }


    getOrphanRooms() {
        /* Finds all rooms that are not DMs and that are not a part of a space */
        var rooms = [];
        var directs = this.getDirects(false);
        global.matrix.getVisibleRooms().forEach((room) => {
            // Check if room is a space
            const state = room.currentState;
            if (room.isSpaceRoom() ||
                state.getStateEvents("m.space.child").length !== 0 ||
                state.getStateEvents("m.space.parent").length !== 0
            ) { return };
    
            // Check if a DM
            if (directs.includes(room.roomId)) { return }
    
            if (_is_joined(room)) {
                rooms.push(room)
            }
        });
        return rooms;
    }

    getDirects(asRoomObj) {
        // Get all direct rooms
        var rooms = [];
        const directs = global.matrix.getAccountData("m.direct").getContent();
        Object.values(directs).forEach((directRooms) => {
            const roomObj = global.matrix.getRoom(directRooms);
            if (_is_joined(roomObj)) {
                rooms = rooms.concat(asRoomObj? roomObj : directRooms);
            }
        });
    
        return rooms;
    }

    async joinedSpaceChildren(spaceId) {
        var promise = new Promise((resolve) => {
            var rooms = [];
            global.matrix.getRoomHierarchy(spaceId).then((result) => {
                result.rooms.forEach((room) => {
                    const roomObj = global.matrix.getRoom(room.room_id);
                    if (global.matrix.getRoom(room.room_id) && room.room_id !== spaceId && _is_joined(roomObj)) {
                        rooms.push(roomObj)
                    }
                });
                resolve(rooms);
            });
        });
    
        return promise;
    }

    getGroups() {
        return global.matrix.getVisibleRooms().filter((room) => {
            return _is_joined(room) && room.isSpaceRoom();
        });
    }
}