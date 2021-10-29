import "./ChatPanel.scss";
import { useEffect, useState, useRef } from "react";
import Chat from "./Chat/Chat";
import Icon from "@mdi/react";
import { mdiAccountMultiple, mdiAlert, mdiMenu } from "@mdi/js";
import { friendlyList } from "../../utils/utils";
import { getDirects } from "../../utils/roomFilters";
import { Button, RoomIcon } from "../../components/elements";
import Settings from "../../utils/settings";


export default function ChatPanel({currentRoom, hideMemberListState, hideRoomListState}) {
    const [hideRoomList, setHideRoomList] = hideRoomListState;
    const [hideMemberList, setHideMemberList] = hideMemberListState;

    useEffect(() => {
        setHideRoomList(Settings.get("startRoomsCollapsed"));
        console.log("startMembersCollapsed", Settings.get("startMembersCollapsed"))
        setHideMemberList(Settings.get("startMembersCollapsed"));
    }, [setHideRoomList, setHideMemberList])
    
    useEffect(() => {
        Settings.update("startRoomsCollapsed", hideRoomList);
    }, [hideRoomList])
    useEffect(() => {
        console.log(hideMemberList)
        Settings.update("startMembersCollapsed", hideMemberList);
    }, [hideMemberList])

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
                    {room.current.currentState.getStateEvents("m.room.topic")[0]?.getContent().topic}
                </div>
            </>}

            <Button path={mdiAccountMultiple} size="25px" tipDir="left" tipText={`${hideMemberList ? "Show" : "Hide"} Members`} clickFunc={() => {setHideMemberList((current) => !current)}} />
        </div>

        <div className="chat-frame">
            <Chat currentRoom={currentRoom} />
        </div>
        <TypingIndicator currentRoom={currentRoom} />
    </>);
}

function TypingIndicator({currentRoom}) {
    const [typing, setTyping] = useState(new Set());
    const [connError, setConnError] = useState(null);

    // Listen for typing events
    useEffect(() => {
        setTyping(new Set());

        function onTyping(event, member) {
            const isTyping = member.typing;
            const name = member.rawDisplayName;

            // ONly listen in current room or event is for the current user
            if (member.roomId !== currentRoom || member.userId === global.matrix.getUserId()) {return}
    
            // If needs to be added
            if (isTyping) {
                setTyping((current) => {
                    return new Set(current).add(name);
                })
            }
            // If needs to be removed
            else if (!isTyping) {
                setTyping((current) => {
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
        function clientState(oldState, newState) {
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
    let text;
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