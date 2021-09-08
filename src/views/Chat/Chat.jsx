import "./Chat.scss";
import { Avatar } from "../../components/user";
import { useEffect, useState, useRef } from "react";
import { getUserColour } from "../../utils/utils";
import { Loading } from "../../components/interface";

function Chat({ currentRoom }) {
    const getRoomObj = () => {return global.matrix.getRoom(currentRoom)};
    // Store events
    const [messageTimeline, setTimeline] = useState([]);
    function appendEvent(event) {
        console.log("append", event)
        setTimeline((messageTimeline) => {return [event].concat(messageTimeline)});
    }

    function timelineFromStore() {
        var timeline = []
        getRoomObj().timeline.forEach((event) => {
            if (event.getType() !== "m.room.message") {return}
            timeline.unshift(event)  // Add to front of array
        });
        setTimeline(timeline);
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
        timelineFromStore();

        // Fetch enough messages to have 30 in the chat
        const remainder = 30 - messageTimeline.length;
        if (remainder > 0 && false) {
            console.log(remainder)
            global.matrix.scrollback(getRoomObj(), remainder).then(() => {
                timelineFromStore();
            });
        }

        // Remove listener on unmount (room change)
        return () => {global.matrix.removeListener("Room.timeline", onEvent)};
    }, [currentRoom]);

    // Convert message events into message components
    const messages = messageTimeline.map((event, index) => {
        // Determine whether last message was by same user
        if (messageTimeline[index + 1] &&  messageTimeline[index + 1].getSender() === event.getSender()) {
            return (
                <PartialMessage event={event} key={event.getId()}/>
            );
        } else {
            return (
                <Message event={event} key={event.getId()}/>
            );
        }
    });

    async function loadNewMessages() {
        await global.matrix.scrollback(getRoomObj());
        timelineFromStore();
    }

    return (
        <ChatScroll loadNewMessages={loadNewMessages}>
            <div className="chat">
                {messages}
            </div>
        </ChatScroll>
    );
}

function ChatScroll({ children, loadNewMessages }) {
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef();

    function scrollTop() {
        if (scrollRef) {
            scrollRef.current.scrollTop = 0;
        }
    }

    function onScroll(e) {
        if (e.target.scrollTop === 0) {
            console.log("Loading")
            setLoading(true);
            scrollTop()
            //loadNewMessages().then(setLoading(false));
        }
    }

    return (
        <div className="chat-scroll" ref={scrollRef} onScroll={onScroll}>
            {loading && <div className="chat-scroll__loading"><Loading size="50px"/></div>}
            {children}
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
