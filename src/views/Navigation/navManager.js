import Settings from "../../utils/settings";
// import { debounce } from "../../utils/utils";
import { shouldDisplayEvent } from "../ChatPanel/Chat/eventTimeline";

function _isJoined(room) {
    return room?.getMyMembership() === "join";
}

function getUnreads(room) {
    /* Determine if there are unread events or notifications for the given room */
    const userId = global.matrix.getUserId();
    const events = room.getLiveTimeline().getEvents().slice().reverse();  // Get events youngest to oldest
    const lastRead = room.getEventReadUpTo(userId);
    var read = true;
    for (const event of events) {
        // If reached read event, all events are read, so quit the for/of
        if (event.getId() === lastRead) {break}
        // If event is is to be displayed (and we havent reached the read event), this event is unread
        // Ignore messages from the logged in user since those will be read anyway
        if (shouldDisplayEvent(event) && event.getSender() !== userId) {
            read = false;
            break;
        }
    }
    
    const notifications = room.getUnreadNotificationCount("total");
    return {read: read, notifications: notifications}
}


/* Room filters */

function _getJoinedRooms() {
    return global.matrix.getRooms().filter(_isJoined);
}

function _roomIdsToRoom(roomIds) {
    return roomIds.map((roomId) => {
        return global.matrix.getRoom(roomId);
    }).filter((room) => {
        return room;  // If invalid room ID, don't return an entry
    })
}

export function getSpaceChildren(space) {
    /* Get children of a given space object */
    const childEvents = space.currentState.getStateEvents('m.space.child');
    return _roomIdsToRoom(
        childEvents.map((event) => {
            return event.event.state_key;
        })
    )
}

function _getSpaces() {
    return _getJoinedRooms().filter((room) => {
        return room.isSpaceRoom();
    });
}

export function getRootSpaces() {
    /* Get all top level spaces */

    const allSpaces = _getSpaces();  // List to iterate through
    const rootSpaces = new Set(_getSpaces());

    // Remove each child space from our list
    allSpaces.forEach((space) => {
        getChildSpaces(space)
        .forEach((subSpace) => {
            rootSpaces.delete(subSpace);
        })
    })

    return [...rootSpaces.values()]
}    
function getChildSpaces(space) {
    /* Get children of a space, that are spaces themselves */

    const childRooms = getSpaceChildren(space);
    return childRooms.filter((room) => {
        return room && room.isSpaceRoom() && _isJoined(room);
    })
}

export function getDirects() {
    /* Get all rooms saved with m.direct */
    const directInfo = global.matrix.getAccountData("m.direct").getContent();
    const directs = new Set();

    Object.values(directInfo).forEach((roomIds) => {
        roomIds.forEach((directRoomId) => {
            directs.add(directRoomId);  // Add each room to the set
        })
    });

    return _roomIdsToRoom([...directs]);  // set => array of room Ids
}

function getOrpanedRooms() {
    /* Get rooms without a space that arent directs */
    const rooms = new Set(_getJoinedRooms());

    // Remove directs
    getDirects().forEach((directRoom) => {
        rooms.delete(directRoom);
    })
    // Remove spaces and their children
    _getSpaces().forEach((space) => {
        rooms.delete(space);

        getSpaceChildren(space).forEach((space) => {
            rooms.delete(space);
        })
    });

    return [...rooms];
}


export function getChildRoomsFromGroup(groupKey) {
    switch(groupKey) {
        case "home":
            return getOrpanedRooms();
        case "directs":
            return getDirects();

        default:  // Likely a space Id
            const space = global.matrix.getRoom(groupKey);
            return space ? getSpaceChildren(space) : [];
    }
}


function _getInvitedRooms() {
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




export default class navManager {
    constructor(setInvites, selectRoom) {
        this.setInvites = setInvites;
        this.selectRoom = selectRoom;

        // Create map from saved breadcrumbs object
        this.groupBreadcrumbs = new Map(Object.entries(Settings.getSetting("groupBreadcrumbs")));  // group => selected room
        this.currentGroup = null;

        // this._startListeners();

        this.setInvites(_getInvitedRooms());
        // When initialised, go to home by default
        this.groupSelected("home");
    }


    groupSelected(groupKey) {
        this.currentGroup = groupKey;
        // Get non-space rooms
        const rooms = getChildRoomsFromGroup(groupKey).filter((room) => {return !room.isSpaceRoom});

        this.selectRoom(this.groupBreadcrumbs.get(this.currentGroup) || rooms[0]?.roomId);
    }

    _roomStates(rooms) {
        /* Create a bare bones copy of a room object, enough to differentiate it from other instances*/
        return rooms.map((room) => {
            let unreads;
            if (room.isSpaceRoom()) {
                unreads = this.groupUnreads(room.roomId);
            } else {
                unreads = getUnreads(room);
            }

            return {
                roomId: room.roomId, name: room.name, room: room, 
                read: unreads.read, notifications: unreads.notifications
            };
        });
    }

    groupUnreads(groupKey) {
        // Get unreads for all children
        let children = getChildRoomsFromGroup(groupKey).map((child) => {
            return getUnreads(child);
        });
        // In case space has no joined children
        if (children.length === 0) {children = [{read: true, notifications: 0}]}

        // Merge all unread states
        const unread = children.some((state) => {return !state.read});  // If any are unread
        const notifications = children.reduce((count, state) => {return count + state.notifications}, 0);  // Get sum
        return {read: !unread, notifications: notifications};
    }


    /* Listeners */

    /*_listeners = {
        "Room.myMembership": this._membershipChange.bind(this),
        "accountData": this._accountData.bind(this), 
        "Room.name": this._roomRenamed.bind(this),
        "Room.timeline": debounce(this._roomEvent.bind(this), 1000),  // For unread indicator updates
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
                this.setGroups(this._roomStates(this.getGroups()));
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
                this.setGroups(getRootSpaces());
            } else {
                // We don't know which group this belongs to, so reinitialise all the groups
                this._initRoomMap();

                // Check if the current group was updated, if so, refresh it
                if (getChildRoomsFromGroup(this.currentGroup).includes(room)) {
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
            this.setRooms(this._roomStates(this.currentRooms));
        }
    }

    // Message event
    _roomEvent(event, room, toStartOfTimeline, removed) {
        if (removed) {return};
        if (event.getType() !== "m.room.message") {return};
        if (toStartOfTimeline) {return}  // Only update for messages at start of chat

        // If event's room is in current roomlist, refresh (to add indicators)
        if (this.currentRooms.includes(room)) {
            this.groupSelected(this.currentGroup);
        }
        // Update group list
        this.setGroups(getRootSpaces());
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
            // Update group list
            this.setGroups(getRootSpaces());
        }        
    }*/


    /* Room breadcrumbs */
    roomSelected(room) {
        this.groupBreadcrumbs.set(this.currentGroup, room);
        // Convert map to object to be saved
        const crumbObj = Object.fromEntries(this.groupBreadcrumbs);
        Settings.updateSetting("groupBreadcrumbs", crumbObj);
    }
}