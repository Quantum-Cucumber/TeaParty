import "./Chat.scss";
import { Avatar } from "../../components/user";
import { useEffect, useState, useRef, useCallback } from "react";
import { getUserColour } from "../../utils/utils";
import { Loading } from "../../components/interface";

function Chat({ currentRoom }) {
    const getRoomObj = useCallback(() => {return global.matrix.getRoom(currentRoom)}, [currentRoom]);
    // Store events
    const [messageTimeline, setTimeline] = useState([]);
    function appendEvent(event) {
        console.log("append", event)
        setTimeline((messageTimeline) => {return [event].concat(messageTimeline)});
    }

    const timelineFromStore = useCallback(() => {
        var timeline = []
        getRoomObj().timeline.forEach((event) => {
            if (event.getType() !== "m.room.message") {return}
            timeline.unshift(event)  // Add to front of array
        });
        setTimeline(timeline);
    }, [setTimeline, getRoomObj]);

    // Add event listener when room is changed
    useEffect(() => {
        // No listener when no selected room
        if (!currentRoom) {return};
        console.info("Load room: ", currentRoom)

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
        // Use a function so we can fetch another batch (if needed) but only AFTER the current batch returns
        async function getPadding() {
            // Determine the number of messages currently in the timeline
            var timelineCount = 0;
            getRoomObj().timeline.forEach((event) => {
                if (event.getType() === "m.room.message") {
                    timelineCount++;
                }
            });
            console.log(timelineCount, "messages in chat")

            // If we have less than 30 messages, and there are still messages to retrieve
            if (timelineCount < 30 && getRoomObj().oldState.paginationToken !== null) {
                await global.matrix.scrollback(getRoomObj(), 15)
                await getPadding();
            }
        }
        getPadding().then(() => {
            timelineFromStore();
        });

        // Remove listener on unmount (room change)
        return () => {global.matrix.removeListener("Room.timeline", onEvent)};
    }, [currentRoom, getRoomObj, timelineFromStore]);

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
        if (getRoomObj().oldState.paginationToken !== null) {
            await global.matrix.scrollback(getRoomObj());
            timelineFromStore();
        } else {console.log("Last message in room")}
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
    const atBottom = useRef(true);
    const atTop = useRef(false);
    const scrollRef = useRef();

    // Whenever component rerenders, if we were at the bottom, stay there
    useEffect(() => {
        if (atBottom.current) {
            scrollToBottom();
        } 
    });

    // Only preserve height if at the top and new children (messages) are added
    useEffect(() => {
        if (atTop.current !== false) {
            // Calculate where scrollTop should be based on last distance to bottom
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight - atTop.current;
        }
    }, [children]);

    // When the loading wheel is rendered, save the scroll height to jump to when the children load
    useEffect(() => {
        if (loading) {
            scrollToTop();

            // Since we scroll to the top after loading the wheel, scrollTop is 0 so we ignore it
            atTop.current = scrollRef.current.scrollHeight;
        }
    }, [loading]);

    function scrollToTop() {
        if (scrollRef) {
            scrollRef.current.scrollTop = 0;
        }
    }
    function scrollToBottom() {
        if (scrollRef) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }

    // Determine position when we scroll and set flags accordingly
    function onScroll(e) {
        atBottom.current = false;
        atTop.current = false;
        // When scrolled to the top, show the loading wheel and load new messages
        if (e.target.scrollTop === 0 && !loading && !atBottom.current) {
            setLoading(true);
            loadNewMessages().then(() => setLoading(false));
        } 
        // Scrolled to bottom
        else if (e.target.scrollTop === e.target.scrollHeight - e.target.offsetHeight) {
            atBottom.current = true;
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
