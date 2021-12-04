import { useEffect, useRef, useCallback, useReducer } from "react";
import Settings, { isEventVisibility } from "../../utils/settings";
import { debounce } from "../../utils/utils";
import { useStableState } from "../../utils/hooks";
import { getOrpanedRooms, getDirects, getSpaceChildren, getJoinedRooms, getSpaces, flatSubrooms } from "../../utils/roomFilters";
import { shouldDisplayEvent } from "../ChatPanel/Chat/eventTimeline";
import { sortRooms } from "../../utils/roomFilters";


export function getChildRoomsFromGroup(groupKey) {
    switch(groupKey) {
        case "home":
            return sortRooms(getOrpanedRooms());
        case "directs":
            return sortRooms(getDirects());

        default:  // Likely a space Id
            const space = global.matrix.getRoom(groupKey);
            return space ? sortRooms(getSpaceChildren(space)) : [];
    }
}

export function roomInGroup(groupKey, room) {
    /* Check if room is a descendent of the current group*/

    let flatGroupSubrooms;
    switch (groupKey) {
        case "home":
            flatGroupSubrooms = getOrpanedRooms();
            break;
        case "directs":
            flatGroupSubrooms = getDirects();
            break;
        default:
            const space = global.matrix.getRoom(groupKey);
            flatGroupSubrooms = space ? flatSubrooms(space, true) : [];
    }

    return flatGroupSubrooms.includes(room);
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

    return {"Rooms": rooms, "Direct messages": directs, "Spaces": spaces};
}


function _summariseRooms() {
    const summaries = {};
    
    const rooms = getJoinedRooms().filter((room) => !room.isSpaceRoom());
    rooms.forEach((room) => {
        const {read, notifications} = getUnreads(room);

        summaries[room.roomId] = {
            roomId: room.roomId,
            name: room.name,
            room: room,
            read: read,
            notifications: notifications,
        }
    })

    // Calculate groups based off the already calculated rooms
    function mergeUnreads(unreadList) {
        const unread = unreadList.some((state) => {return !state.read});  // If any are unread
        const notifications = unreadList.reduce((count, state) => {return count + state.notifications}, 0);  // Get sum

        return {read: !unread, notifications: notifications}
    }

    getSpaces().forEach((space) => {
        const childUnreads = flatSubrooms(space).map((room) => {return summaries[room.roomId]});
        const {read, notifications} = mergeUnreads(childUnreads);

        summaries[space.roomId] = {
            roomId: space.roomId,
            name: space.name,
            room: space,
            read: read,
            notifications: notifications,
        }
    });
    ["home", "directs"].forEach((group) => {
        // There should not be spaces here
        const childUnreads = getChildRoomsFromGroup(group).map(getUnreads);
        // The only thing about a group that should change is the notifications status
        summaries[group] = mergeUnreads(childUnreads);
    })

    return summaries;
}

export default function useRoomStates({ currentGroup, setGroupRooms }) {
    // Contains information to rerender rooms
    const [roomStates, refreshRoomStates] = useReducer(_summariseRooms, _summariseRooms());
    const [invitedRooms, refreshInvites] = useReducer(_getInvitedRooms, _getInvitedRooms());
    const stableCurrentGroup = useStableState(currentGroup);

    const refreshRooms = useCallback(() => {
        setGroupRooms(getChildRoomsFromGroup(stableCurrentGroup.current.key));
    }, [setGroupRooms, stableCurrentGroup])


    // Membership in room updated
    const _membershipChange = useCallback((room, state, oldState) => {
        console.log("Membership change", oldState, state, room);

        if (oldState === "invite" && state !== "invite") {
            refreshInvites();
        }

        switch (state) {
            case "invite":
                refreshInvites();
                break;
            case "join":
                refreshRooms();
                break;
            case "leave":
            case "ban":
                refreshRooms();
                refreshRoomStates();
                break;
            default:
                break;
        }
    }, [refreshRooms, refreshInvites, refreshRoomStates])

    // Direct room added
    const _accountData = useCallback((event) => {
        console.log("Account data", event)

        // If m.directs list updated, refresh the dms list
        if (event.getType() === "m.direct") {
            refreshRooms();
        };
    }, [refreshRooms])

    // When channel is read
    const _readReceipt = useCallback((event) => {
        // Check if read receipt was the signed in user, then update the unread indicators if so
        const userId = Object.keys(Object.values(event.getContent())[0]["m.read"])[0];
        if (userId === global.matrix.getUserId()) {
            refreshRoomStates()
        }
    }, [refreshRoomStates])

    // Message event
    const _roomEvent = useCallback((event, _room, toStartOfTimeline, removed) => {
        if (removed) {return};
        if (!shouldDisplayEvent(event)) {return};
        if (toStartOfTimeline) {return}  // Only update for messages at start of chat
        if (event.getSender() === global.matrix.getUserId()) {return}  // No unread indicators for own events

        refreshRoomStates()
    }, [refreshRoomStates]);

    const _settingsUpdate = useCallback((setting) => {
        if (isEventVisibility(setting)) {
            refreshRoomStates()
        }
        else if (setting === "showRoomIcons") {
            refreshRooms();
        }
    }, [refreshRoomStates, refreshRooms])

    useEffect(() => {
        // Mount listeners
        const listeners = {
            "Room.myMembership": _membershipChange,
            "accountData": _accountData,
            "Room.name": refreshRoomStates,
            "Room.timeline": debounce(_roomEvent, 1000),  // For unread indicator updates
            "Room.receipt": _readReceipt,
            "Room.tags": refreshRooms,
        }

        Object.keys(listeners).forEach((type) => {
            console.log("Attached", type)
            global.matrix.on(type, listeners[type]);
        })

        // Refresh unread indicators when the events to be shown are updated
        Settings.on("settingUpdate", _settingsUpdate)

        // Detach listeners on mount
        return () => {
            Object.keys(listeners).forEach((type) => {
                global.matrix.removeListener(type, listeners[type]);
            })

            Settings.removeListener("settingUpdate", _settingsUpdate)
        }
    }, [_membershipChange, _accountData, _roomEvent, _readReceipt, _settingsUpdate, refreshRooms])

    return [roomStates, invitedRooms];
}

export function useGroupBreadcrumbs({ currentGroup, currentRoom, selectRoom }) {
    /* Tracks the last selected room for a given group. When the group is changed, select a relevant room */

    const lastOpenedRoom = useRef(new Map(Object.entries(Settings.get("groupBreadcrumbs"))));  // group => selected room;
    const stableCurrentGroup = useStableState(currentGroup);  // To avoid updating the breadcrumb setter

    // When the current room is changed, update the mapping with the new room
    useEffect(() => {
        if (!currentRoom) {return}  // If no room selected, don't save that
        // Ensure the room is actually in that map
        if (!roomInGroup(stableCurrentGroup.current.key, global.matrix.getRoom(currentRoom))) {return}

        lastOpenedRoom.current.set(stableCurrentGroup.current.key, currentRoom);
        // Convert map to object to be saved
        const crumbObj = Object.fromEntries(lastOpenedRoom.current);
        Settings.update("groupBreadcrumbs", crumbObj);
    }, [stableCurrentGroup, currentRoom])

    // When a different group is selected, open either the last opened room for that group, the first direct child or set as null 
    useEffect(() => {
        const lastRoom = lastOpenedRoom.current.get(currentGroup.key);
        if (lastRoom) {
            selectRoom(lastRoom);
        }
        else {
            // Get direct children that are not spaces
            const children = getChildRoomsFromGroup(currentGroup.key).filter((room) => !room.isSpaceRoom());
            if (children.length !== 0) {
                selectRoom(children[0].roomId);
            }
            // No suitable room, select nothing
            else {
                selectRoom(null);
            }
        }
    }, [currentGroup, selectRoom])
}
