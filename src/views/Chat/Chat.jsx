import "./Chat.scss";
import { Avatar } from "../../components/user";
import { useEffect, useState } from "react";

function Chat({ currentRoom }) {
    const [messageTimeline, setTimeline] = useState([]);
    function appendEvent(event) {
        console.log("append", event)
        setTimeline((messageTimeline) => {return [event].concat(messageTimeline)});
    }

    // Add event listener when room is changed
    useEffect(() => {
        // No listener when no selected room
        if (currentRoom === null) {return};

        function onEvent(event, eventRoom, toStartOfTimeline) {
            console.log("Event", event)
            // Ignore pagination
            if (toStartOfTimeline) {return}
            // Filter for just messages
            if (event.getType() !== "m.room.message") {return}
            // Filter for just this room
            if (currentRoom !== eventRoom.roomId) {return}
            appendEvent(event);
        }

        global.matrix.on("Room.timeline", onEvent);

        // Remove listener on unmount (room change)
        return () => {global.matrix.removeListener("Room.timeline", onEvent)};
    }, [currentRoom]);

    console.log(messageTimeline, typeof messageTimeline);
    const messages = messageTimeline.map((event) => {
        return (
        <Message event={event} key={event.getId()}/>
        );
    });

    return (
        <div className="chat-scroll">
            <div className="chat">
                {messages}
            </div>
        </div>
    );
}

function Message({ event }) {
    const author = global.matrix.getUser(event.getSender());
    return (
        <div className="message">
            <Avatar user={author} subClass="message__avatar__crop" />
            <div className="message__text">
                <div className="message__author">{author.displayName}</div>
                <div className="message__content">{event.getContent().body}</div>
            </div>
        </div>
    );
}

export default Chat;
