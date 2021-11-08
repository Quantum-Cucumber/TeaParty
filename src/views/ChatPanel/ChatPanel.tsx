import "./ChatPanel.scss";
import { useEffect, useState, useRef, useContext } from "react";
import type { SyntheticEvent } from "react";

import { friendlyList } from "../../utils/utils";
import { getDirects } from "../../utils/roomFilters";
import Settings from "../../utils/settings";
import { getEventById } from "../../utils/matrix-client";

import Chat from "./Chat/Chat";
import { Button, Loading, RoomIcon } from "../../components/elements";
import { ContextMenu, popupCtx } from "../../components/popups";
import { TimelineEvent } from "./Chat/Events/Event";

import Icon from "@mdi/react";
import { mdiAccountMultiple, mdiAlert, mdiMenu, mdiPin } from "@mdi/js";
import { FancyText } from "../../components/wrappers";

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
    useEffect(() => {
        if (currentRoom) {
            room.current = global.matrix.getRoom(currentRoom);
        }
    }, [currentRoom])

    return (<>
        <div className="header chat-header">
            <Button path={mdiMenu} size="25px" tipDir="right" tipText={`${hideRoomList ? "Show" : "Hide"} Rooms`} clickFunc={() => {setHideRoomList((current) => !current)}} />

            {room.current && <>
                <div className="chat-header__icon room__icon__crop">
                    <RoomIcon room={room.current} directRoom={getDirects().includes(room.current)} />
                </div>
                <div className="chat-header__name">
                    {room.current.name}
                </div>
                <div className="chat-header__topic" title={room.current.currentState.getStateEvents("m.room.topic")[0]?.getContent().topic}>
                    <FancyText>
                        {room.current.currentState.getStateEvents("m.room.topic")[0]?.getContent().topic}
                    </FancyText>
                </div>
            </>}

            <Button path={mdiPin} size="25px" tipDir="bottom" tipText="Pinned Events" clickFunc={(e: SyntheticEvent) => {
                e.stopPropagation();  // Needed to stop the popup from immediately closing
                const target = e.target as HTMLElement;
                setPopup(
                    <PinnedMessages parent={target.closest(".button")} room={room.current} eventIds={
                        room.current?.currentState.getStateEvents("m.room.pinned_events", "")?.getContent().pinned
                    }/>
                )
            }} />
            <Button path={mdiAccountMultiple} size="25px" tipDir="left" tipText={`${hideMemberList ? "Show" : "Hide"} Members`} clickFunc={() => {setHideMemberList((current) => !current)}} />
        </div>

        <div className="chat-frame">
            <Chat currentRoom={currentRoom} />
        </div>
        <TypingIndicator currentRoom={currentRoom} />
    </>);
}

type typingSetType = Set<string>;

function TypingIndicator({currentRoom}: {currentRoom: string}) {
    const [typing, setTyping] = useState(new Set()) as [typingSetType, Function];
    const [connError, setConnError] = useState(null) as [string | null, Function];

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

    useEffect(() => {
        function clientState(_oldState: string, newState: string) {
            if (newState === "ERROR" || newState === "RECONNECTING") {
                setConnError(newState);
            } else {
                setConnError(false);
            }
        }

        global.matrix.on("sync", clientState);
        return () => {
            global.matrix.removeListener("sync", clientState)
        }
    }, [])

    // Format text
    let text = "";
    if (connError) {
        if (connError === "ERROR") {
            text = "Reconnecting to server..."
        } else if (connError === "RECONNECTING") {
            text = "Error connecting to server..."
        }
    } else {
        const typingList = [...typing];
        if (typingList.length > 3) {
            text = "Several people are typing...";
        }
        else if (typingList.length !== 0) {  // Between 2 and 3 people
            text = friendlyList(typingList, null, "are", "is") + " typing...";
        }
    }

    return (
        <div className="typing-indicator">
            { text && !connError &&
            <>
                <svg className="typing-indicator__dots">
                    <circle />
                    <circle />
                    <circle />
                </svg>
                <div>{text}</div>
            </>
            }
            { connError && <>
                <Icon path={mdiAlert} color="var(--error)" size="0.9rem" />
                &nbsp;
                <div className="typing-indicator__error">
                    {text}
                </div>
            </>}
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
