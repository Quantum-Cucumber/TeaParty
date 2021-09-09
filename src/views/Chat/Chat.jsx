import "./Chat.scss";
import { Avatar } from "../../components/user";
import { useEffect, useState, useRef, useCallback } from "react";
import { getUserColour } from "../../utils/utils";
import { Loading } from "../../components/interface";
import messageTimeline from "./messageTimeline";


function nextShouldBePartial(thisMsg, lastMsg) {
    // No message above current
    if (!lastMsg) {return false}
    // Different senders
    if (thisMsg.getSender() !== lastMsg.getSender()) {return false}
    // Within 30 min of each other
    if ((thisMsg.getDate() - lastMsg.getDate()) > (30 * 60 * 1000)) {return false}
    // All others passed
    return true
}


function Chat({ currentRoom }) {
    const timeline = useRef();
    const [messageList, setMessageList] = useState([]);

    const updateMessageList = useCallback(() => {
        setMessageList(timeline.current.getMessages());
    }, [setMessageList])

    // Add event listener when room is changed
    useEffect(() => {
        // No listener when no selected room
        if (!currentRoom) {return};
        console.info("Load room: ", currentRoom)
        timeline.current = new messageTimeline(currentRoom);

        // Set up timeline event handler
        function onEvent(event, eventRoom, toStartOfTimeline) {
            // Ignore pagination (not too sure what this is lol)
            if (toStartOfTimeline) {return}
            
            // Pass event to timeline handler and update message list
            timeline.current.onEvent(event);
            updateMessageList();
        }
        global.matrix.on("Room.timeline", onEvent);

        updateMessageList();
        // Ensure we start off with enough messages
        // Use a function so we can fetch another batch (if needed) but only AFTER the current batch returns
        timeline.current.padTimeline().then((result) => setMessageList(result));

        // Remove listener on unmount (room change)
        return () => {global.matrix.removeListener("Room.timeline", onEvent)};
    }, [currentRoom, updateMessageList]);

    // Convert message events into message components
    const messages = messageList.map((event, index) => {
        // Determine whether last message was by same user
        if (nextShouldBePartial(event, messageList[index + 1])) {
            return (
                <PartialMessage event={event} timeline={timeline} key={event.getId()}/>
            );
        } else {
            return (
                <Message event={event} timeline={timeline} key={event.getId()}/>
            );
        }
    });

    return (
        <ChatScroll timeline={timeline} updateMessageList={updateMessageList}>
            <div className="chat">
                {messages}
            </div>
        </ChatScroll>
    );
}

function ChatScroll({ children, timeline, updateMessageList }) {
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
            restoreScrollPos();
            atTop.current = false;
        }
    }, [children]);

    useEffect(() => {
        // Don't move page when loading wheel is rendered
        if (loading && atTop.current !== false) {
            restoreScrollPos();
        }
    }, [loading]);

    function scrollToBottom() {
        if (scrollRef) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }
    function saveScrollPos() {
        atTop.current = scrollRef.current.scrollHeight - scrollRef.current.scrollTop;
    }
    function restoreScrollPos() {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight - atTop.current;
    }

    // Determine position when we scroll and set flags accordingly
    function onScroll(e) {
        atBottom.current = false;

        if (atTop.current !== false) {saveScrollPos()};
        // When scrolled to the top, show the loading wheel and load new messages
        if (e.target.scrollTop === 0 && !loading && !atBottom.current && timeline.current.canScroll) {
            saveScrollPos();
            setLoading(true);
            timeline.current.getMore().then(() => {
                updateMessageList();
                setLoading(false);
            });
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


function Message({ event, timeline }) {
    const author = global.matrix.getUser(event.getSender());
    const edited = timeline.current.edits.get(event.getId());
    console.log(edited)
    const content = edited ? edited.getContent()["m.new_content"].body : event.getContent().body;

    return (
        <div className="message">
            <Avatar user={author} subClass="message__avatar__crop" />
            <div className="message__text">
                <div className="message__author" style={{color: getUserColour(author.userId)}}>{author.displayName}</div>
                <div className="message__content">
                    {content}
                    {edited && <div className="message__content__edited">(edited)</div>}
                </div>
            </div>
        </div>
    );
}

function PartialMessage({ event, timeline }) {
    const edited = timeline.current.edits.get(event.getId());
    const content = edited ? edited.getContent()["m.new_content"].body : event.getContent().body;

    return (
        <div className="message--partial">
            <div className="message--partial__offset"></div>
            <div className="message__text">
                <div className="message__content">
                    {content}
                    {edited && <div className="message__content__edited">(edited)</div>}
                </div>
            </div>
        </div>
    )
}

export default Chat;
