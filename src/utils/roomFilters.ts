import { Room } from "matrix-js-sdk";
import { EventType } from "matrix-js-sdk/lib/@types/event";

function _isJoined(room: Room) {
    return room?.getMyMembership() === "join";
}
export function getJoinedRooms(): Room[] {
    return global.matrix.getRooms().filter(_isJoined);
}

function _roomIdsToRoom(roomIds: (string | undefined)[]): Room[] {
    return roomIds.map((roomId) => {
        return global.matrix.getRoom(roomId);
    }).filter((room) => {
        return room;  // If invalid room ID, don't return an entry
    })
}

export function getSpaceChildren(space: Room) {
    /* Get children of a given space object */
    const childEvents = space.currentState.getStateEvents("m.space.child");
    return _roomIdsToRoom(
        childEvents.map((event) => {
            return event.event.state_key;
        })
    )
}

export function getSpaces() {
    /* Get all joined spaces */
    return getJoinedRooms().filter((room) => {
        return room.isSpaceRoom();
    });
}

export function getRootSpaces() {
    /* Get all top level spaces */

    const allSpaces = getSpaces();  // List to iterate through
    const rootSpaces = new Set(getSpaces());

    // Remove each child space from our list
    allSpaces.forEach((space) => {
        getChildSpaces(space)
        .forEach((subSpace) => {
            rootSpaces.delete(subSpace);
        })
    })

    return [...rootSpaces.values()]
}    
function getChildSpaces(space: Room) {
    /* Get children of a space, that are spaces themselves */

    const childRooms = getSpaceChildren(space);
    return childRooms.filter((room) => {
        return room && room.isSpaceRoom() && _isJoined(room);
    })
}

export function getDirects() {
    /* Get all rooms saved under m.direct 
       Assumes structure of - {userId: [roomId]}
    */

    const directInfo: {string: string[]} = global.matrix.getAccountData(EventType.Direct)?.getContent() || {};
    const directs: Set<string> = new Set();

    Object.values(directInfo).forEach((roomIds) => {
        roomIds.forEach((directRoomId) => {
            directs.add(directRoomId);  // Add each room to the set
        })
    });

    return _roomIdsToRoom([...directs]);  // set => array of room Ids
}

export function isDirect(room: Room) {
    return getDirects().includes(room);
}

export function getOrpanedRooms() {
    /* Get rooms that are not spaces, space children, or directs */

    const rooms = new Set(getJoinedRooms());

    // Remove directs
    getDirects().forEach((directRoom) => {
        rooms.delete(directRoom);
    })
    // Remove spaces and their children
    getSpaces().forEach((space) => {
        rooms.delete(space);

        getSpaceChildren(space).forEach((space) => {
            rooms.delete(space);
        })
    });

    return [...rooms];
}

export function flatSubrooms(space: Room, includeSpaces = false): Room[] {
    /* Traverse the room heirarchy and place all the rooms into one deduplicated list */

    const traversedSpaces: Set<Room> = new Set();  // To avoid circular spaces
    const rooms: Set<Room> = new Set();

    function traverse(space: Room) {
        getSpaceChildren(space).forEach((room) => {
            // For space rooms, mark as traversed and run this function on it again
            if (room.isSpaceRoom()) {
                if (!traversedSpaces.has(room)) {
                    traversedSpaces.add(room);
                    traverse(room);
                }
            }
            // Add normal room to set
            else {
                rooms.add(room);
            }
        })
    }
    traverse(space);

    return includeSpaces ? [...rooms, ...traversedSpaces] : [...rooms];
}


// Highest -> lowest
const tagPriority = {
    "m.favourite": 2,
    "m.servernotice": 1,
    "m.lowpriority": -1,
}
function tagToInt(roomTags: Room["tags"]): [number, number] {
    /* Processes a room's tags and returns an int that can be compared easily */
    for (const tag in tagPriority) {
        if (tag in roomTags) {
            // Priority of tag + order of tag (between 0 and 1) (or 2 if no order supplied - to go below those with orders)
            return [tagPriority[tag], ("order" in roomTags[tag] ? roomTags[tag].order : 2)];
        }
    }
    // No special tags
    return [0, 2];
}

export function sortRooms(roomList: Room[]) {
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

