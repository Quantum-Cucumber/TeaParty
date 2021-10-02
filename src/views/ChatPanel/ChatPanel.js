import "./ChatPanel.scss";
import Chat from "./Chat/Chat";
import { useEffect, useState, useRef } from "react";


export default function ChatPanel({currentRoom, setUserPopup}) {
    return (
        <>
        <div className="chat-frame">
            <Chat currentRoom={currentRoom} setUserPopup={setUserPopup}/>
        </div>
        <TypingIndicator currentRoom={currentRoom} />
        </>
    );
}

function TypingIndicator({currentRoom}) {
    const [text, setText] = useState(null);
    const typing = useRef([]);

    // Listen for typing events
    useEffect(() => {
        setText(null);  // When room changed, clear typing text

        function onTyping(event, member) {
            const isTyping = member.typing;

            // ONly listen in current room
            if (member.roomId !== currentRoom) {return}
    
            // If needs to be added
            if (isTyping && !typing.current.includes(member) && member.userId !== global.matrix.getUserId()) {
                typing.current.push(member);
            }
            // If needs to be removed
            else if (!isTyping && typing.current.includes(member)) {
                typing.current.splice(typing.current.indexOf(member), 1);
            }
            // No changes to be made
            else {return}

            var newText = null;
            if (typing.current.length === 1) {
                newText = typing.current[0].name + " is typing...";
            }
            else if (typing.current.length > 3) {
                newText = "Several people are typing...";
            }
            else if (typing.current.length !== 0) {  // Between 2 and 3 people
                const names = typing.current.map((member) => {return member.name});
                const last = names.slice(names.length - 1);
                newText = names.slice(0, names.length - 1).join(", ") + ` and ${last} are typing...`;
            }
            setText(newText);
        }

        global.matrix.on("RoomMember.typing", onTyping);
        return () => {global.matrix.removeListener("RoomMember.typing", onTyping)};
    }, [currentRoom]);

    return (
        <div className="typing-indicator">
            { text &&
            <>
                <svg className="typing-indicator__dots">
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