import "./ChatPanel.scss";
import Chat from "./Chat/Chat";
import { useEffect, useState } from "react";
import Icon from "@mdi/react";
import { mdiAlert } from "@mdi/js";


export default function ChatPanel({currentRoom}) {
    return (
        <>
        <div className="chat-frame">
            <Chat currentRoom={currentRoom} />
        </div>
        <TypingIndicator currentRoom={currentRoom} />
        </>
    );
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
        if (typingList.length === 1) {
            text = typingList[0] + " is typing...";
        }
        else if (typingList.length > 3) {
            text = "Several people are typing...";
        }
        else if (typingList.length !== 0) {  // Between 2 and 3 people
            const last = typingList.slice(typingList.length - 1);
            text = typingList.slice(0, typingList.length - 1).join(", ") + ` and ${last} are typing...`;
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