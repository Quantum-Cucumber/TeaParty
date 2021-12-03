import "./ChatPanel.scss";
import { useEffect, useState, useRef, useContext, useCallback, useReducer } from "react";
import { useHistory } from "react-router-dom";

import { classList, friendlyList } from "../../utils/utils";
import Settings from "../../utils/settings";
import { getEventById } from "../../utils/matrix-client";

import Chat from "./Chat/Chat";
import { IconButton, Loading, RoomIcon } from "../../components/elements";
import { ContextMenu, popupCtx, Tooltip } from "../../components/popups";
import { TimelineEvent } from "./Chat/Events/Event";

import Icon from "@mdi/react";
import { mdiAccountMultiple, mdiAlert, mdiUpdate, mdiMenu, mdiPin, mdiShieldLock } from "@mdi/js";
import { FancyText } from "../../components/wrappers";

import type { SyntheticEvent } from "react";
import type { MatrixEvent, Room, RoomMember } from "matrix-js-sdk";


type ChatPanelTypes = {
    currentRoom: string,
    hideMemberListState: ReturnType<typeof useState>,
    hideRoomListState: ReturnType<typeof useState>,
}

export default function ChatPanel({currentRoom, hideMemberListState, hideRoomListState}: ChatPanelTypes) {
    const setPopup: Function = useContext(popupCtx);

    // Restore panel states on render
    const [hideRoomList, setHideRoomList] = hideRoomListState as [boolean, Function];
    const [hideMemberList, setHideMemberList] = hideMemberListState as [boolean, Function];

    useEffect(() => {
        setHideRoomList(Settings.get("startRoomsCollapsed"));
        setHideMemberList(Settings.get("startMembersCollapsed"));
    }, [setHideRoomList, setHideMemberList])
    
    useEffect(() => {
        Settings.update("startRoomsCollapsed", hideRoomList);
    }, [hideRoomList])
    useEffect(() => {
        Settings.update("startMembersCollapsed", hideMemberList);
    }, [hideMemberList])

    // Store the room as an object to be reused rather than needing getRoom for everything
    const room = useRef(currentRoom ? global.matrix.getRoom(currentRoom) : null);
    // Store whether the room is encrypted
    const [isRoomEncrypted, setIsRoomEncrypted] = useState(global.matrix.isRoomEncrypted(currentRoom) as boolean);
    useEffect(() => {
        if (currentRoom) {
            room.current = global.matrix.getRoom(currentRoom);
            setIsRoomEncrypted(global.matrix.isRoomEncrypted(currentRoom));
        }
    }, [currentRoom])

    return (<>
        <div className="header chat-header">
            <IconButton path={mdiMenu} size="25px" tipDir="right" tipText={`${hideRoomList ? "Show" : "Hide"} Rooms`} clickFunc={() => {setHideRoomList((current) => !current)}} />

            {room.current && <>
                <div className="chat-header__icon">
                    <RoomIcon room={room.current} />
                </div>
                <div className="chat-header__name">
                    {room.current.name}
                </div>
                { isRoomEncrypted &&
                    <Tooltip text="This room is encrypted" dir="bottom" delay={0.15}>
                        <Icon path={mdiShieldLock} color="var(--text-greyed)" className="chat-header__shield" size="1.2rem" />
                    </Tooltip>
                }
                <div className="chat-header__topic" title={room.current.currentState.getStateEvents("m.room.topic")[0]?.getContent().topic}>
                    <FancyText>
                        {room.current.currentState.getStateEvents("m.room.topic")[0]?.getContent().topic}
                    </FancyText>
                </div>
            </>}

            <IconButton path={mdiPin} size="25px" tipDir="bottom" tipText="Pinned Events" clickFunc={(e: SyntheticEvent) => {
                e.stopPropagation();  // Needed to stop the popup from immediately closing
                const target = e.target as HTMLElement;
                setPopup(
                    <PinnedMessages parent={target.closest(".button")} room={room.current} eventIds={
                        room.current?.currentState.getStateEvents("m.room.pinned_events", "")?.getContent().pinned
                    }/>
                )
            }} />
            <IconButton path={mdiAccountMultiple} size="25px" tipDir="left" tipText={`${hideMemberList ? "Show" : "Hide"} Members`} clickFunc={() => {setHideMemberList((current) => !current)}} />
        </div>

        <div className="chat-frame">
            <Chat currentRoom={currentRoom} />
        </div>
        <Status room={room.current} />
        <TypingIndicator currentRoom={currentRoom} />
    </>);
}


type statusType = {
    class: string, 
    contents: string | JSX.Element, 
    path: string
} | null;
type statusesType = {
    type?: statusType,
}
type reducerActionType = {
    action: "set" | "clear",
    type: "conn" | "tombstone" | null,
    status?: statusType,
} | null;

const statusTypeOrder = {
    "conn": 1,
    "tombstone": 0,
};

function statusReducer(state: statusesType, action: reducerActionType) {
    switch (action.action) {
        case "set":
            state[action.type] = action.status;
            return {...state};
        case "clear":
            delete state[action.type];
            return {...state};
        default:
            throw new Error();
    }
}

function Status({ room }: {room: Room | null}) {
    const [statuses, setStatus] = useReducer(statusReducer, {});
    const history = useHistory();

    // Listen for client states that indicate an issue
    useEffect(() => {
        function clientState(_oldState: string, newState: string) {
            switch (newState) {
                case "ERROR":
                    setStatus({
                        action: "set",
                        type: "conn",
                        status: { contents: "Error connecting to server...", class: "chat__state--error", path: mdiAlert }
                    });
                    break;
                case "RECONNECTING":
                    setStatus({
                        action: "set",
                        type: "conn",
                        status: { contents: "Reconnecting to server...", class: "chat__state--error", path: mdiAlert }
                    });
                    break;
                default:
                    setStatus({
                        action: "clear",
                        type: "conn"
                    })
                    break;
            }
        }

        global.matrix.on("sync", clientState);
        return () => {
            global.matrix.removeListener("sync", clientState)
        }
    }, [])


    // Check for if the room is tombstoned

    const setTombstoneStatus = useCallback((tombstone: MatrixEvent) => {
        if (tombstone?.getContent()) {
            const {body, replacement_room} = tombstone.getContent();

            setStatus({
                action: "set",
                type: "tombstone",
                status: { 
                    contents: (<>
                        <div style={{flex: "1 1 auto"}}>{body || "This room has been replaced"}</div>
                        <div onClick={() => history.push(`/room/${replacement_room}`)} className="chat__state--info__link">Go to new room</div>
                    </>),
                    class: "chat__state--info",
                    path: mdiUpdate
                }
            });
        }
    }, [setStatus, history])
    useEffect(() => {
        // Set on first render
        const tombstone = room?.currentState.getStateEvents("m.room.tombstone", "");
        setTombstoneStatus(tombstone)

        // Pass new m.room.tombstone events to the handler
        function checkTombstone(event: MatrixEvent, _room: Room, toStartOfTimeline: boolean) {
            if (event.getRoomId() === room.roomId && event.getType() === "m.room.tombstone" && !toStartOfTimeline) {
                setTombstoneStatus(event);
            }
        }

        // Bind listener
        global.matrix.on("Room.timeline", checkTombstone);
        return () => {
            global.matrix.removeListener("Room.timeline", checkTombstone);

            // Clear the current tombstone
            setStatus({
                action: "clear",
                type: "tombstone"
            })
        }
    }, [room, setTombstoneStatus])

    return (<>{
        Object.entries(statuses)
        .sort((a, b) => {
            return statusTypeOrder[b[0]] - statusTypeOrder[a[0]]
        })
        .map(([type, status]) => (
            <div className={classList("chat__state", status.class)} key={type}>
                <Icon path={status.path} color="var(--text)" size="1em" />
                &nbsp;
                {status.contents}
            </div>
        ))
    }</>)
}


type typingSetType = Set<string>;

function TypingIndicator({currentRoom}: {currentRoom: string}) {
    const [typing, setTyping] = useState(new Set()) as [typingSetType, Function];

    // Listen for typing events
    useEffect(() => {
        setTyping(new Set());

        function onTyping(_event: MatrixEvent, member: RoomMember) {
            const isTyping = member.typing;
            const name = member.rawDisplayName;

            // ONly listen in current room or event is for the current user
            if (member.roomId !== currentRoom || member.userId === global.matrix.getUserId()) {return}
    
            // If needs to be added
            if (isTyping) {
                setTyping((current: typingSetType) => {
                    return new Set(current).add(name);
                })
            }
            // If needs to be removed
            else if (!isTyping) {
                setTyping((current: typingSetType) => {
                    const temp = new Set(current);
                    temp.delete(name);
                    return temp;
                })
            }
        }

        global.matrix.on("RoomMember.typing", onTyping);
        return () => {
            global.matrix.removeListener("RoomMember.typing", onTyping)
        };
    }, [currentRoom]);

    // Format text
    let text = "";
    const typingList = [...typing];
    if (typingList.length > 3) {
        text = "Several people are typing...";
    }
    else if (typingList.length !== 0) {  // Between 2 and 3 people
        text = friendlyList(typingList, null, "are", "is") + " typing...";
    }

    return (
        <div className="chat__typing-indicator">
            { text &&
            <>
                <svg className="chat__typing-indicator__dots">
                    <circle />
                    <circle />
                    <circle />
                </svg>
                <div>{text}</div>
            </>
            }
        </div>
    );
}


type PinnedMessagesTypes = {
    parent: HTMLElement,
    room: Room,
    eventIds: string[],
}

function PinnedMessages({ parent, room, eventIds }: PinnedMessagesTypes) {
    const [events, setEvents] = useState([]) as [MatrixEvent[], Function];

    // TODO : Will try setEvents if unmounted while going through for loop
    useEffect(() => {
        if (!room || !eventIds) {return};
        setEvents([]);
        var isMounted = true;

        function appendEvent(event: MatrixEvent) {
            if (isMounted) {
                setEvents((current: MatrixEvent[]) => current.concat(event));
            }
        }

        for (let i=0; i<eventIds.length; i++) {
            const eventId = eventIds[i];

            getEventById(room.roomId, eventId).then(appendEvent);
        }

        return () => {
            isMounted = false;
        }
    }, [eventIds, room])
    
    if (!room) {return null}

    return (
        <ContextMenu subClass="pinned-events" parent={parent} x="align-left" y="bottom">
            <div className="pinned-events__title">
                Pinned Events:
            </div>
            <div className="pinned-events__scroll">
                {
                    events.map((event) => {
                        return event ? (
                            // @ts-ignore - TimelineEvent is memoized and the props get screwy
                            <TimelineEvent event={event} key={event.getId()} />
                        ) : null
                    })
                }
                { (eventIds && events.length !== eventIds.length) &&
                    <div className="pinned-events__loading">
                        <Loading size="2rem" />
                    </div>
                }
                {!eventIds &&
                    <div>No events have been pinned</div>
                }
            </div>
        </ContextMenu>
    )
}
