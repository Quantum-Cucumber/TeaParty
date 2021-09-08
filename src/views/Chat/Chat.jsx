import "./Chat.scss";
import { Avatar } from "../../components/user";
import { useEffect, useState } from "react";
import { getUserColour } from "../../utils/utils";

function Chat({ currentRoom }) {
    const [messageTimeline, setTimeline] = useState([]);
    function appendEvent(event) {
        console.log("append", event)
        setTimeline((messageTimeline) => {return [event].concat(messageTimeline)});
    }

    // Add event listener when room is changed
    useEffect(() => {
        // No listener when no selected room
        if (!currentRoom) {return};
        console.log("Room: ", currentRoom)

        function onEvent(event, eventRoom, toStartOfTimeline) {
            // Ignore pagination
            if (toStartOfTimeline) {return}
            // Filter for just messages
            if (event.getType() !== "m.room.message") {return}
            // Filter for just this room
            if (currentRoom !== eventRoom.roomId) {return}
            appendEvent(event);
        }
        global.matrix.on("Room.timeline", onEvent);
        
        // Create timeline from store events
        var timeline = []
        global.matrix.getRoom(currentRoom).timeline.forEach((event) => {
            if (event.getType() !== "m.room.message") {return}
            timeline.unshift(event)  // Add to front of array
        });
        setTimeline(timeline);

        // Remove listener on unmount (room change)
        return () => {global.matrix.removeListener("Room.timeline", onEvent)};
    }, [currentRoom]);

    const messages = messageTimeline.map((event, index) => {
        // Determine whether last message was by same user
        if (messageTimeline[index + 1] &&  messageTimeline[index + 1].getSender() === event.getSender()) {
            return (
                <PartialMessage event={event} key={event.getId()}/>
            )
        } else {
            return (
                <Message event={event} key={event.getId()}/>
            );
        }
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
                <div className="message__author" style={{color: getUserColour(author.userId)}}>{author.displayName}</div>
                <div className="message__content">{event.getContent().body}</div>
            </div>
        </div>
    );
}

function PartialMessage({ event }) {
    return (
        <div className="message--partial">
            <div className="message--partial__offset"></div>
            <div className="message__text">
                <div className="message__content">{event.getContent().body}</div>
            </div>
        </div>
    )
}

export default Chat;
