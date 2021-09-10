function _is_joined(room) {
    return room?.getMyMembership() === "join";
}

export function get_orphan_rooms() {
    /* Finds all rooms that are not DMs and that are not a part of a space */
    var rooms = [];
    var directs = get_directs(false);
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

export function get_directs(asRoomObj) {
    // Get all direct rooms
    var rooms = []
    const directs = global.matrix.getAccountData("m.direct").getContent();
    Object.values(directs).forEach((directRooms) => {
        const roomObj = global.matrix.getRoom(directRooms);
        if (_is_joined(roomObj)) {
            rooms = rooms.concat(asRoomObj? roomObj : directRooms);
        }
    })

    return rooms;
}

export async function get_joined_space_rooms(spaceId) {
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
