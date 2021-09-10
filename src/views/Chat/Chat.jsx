import "./Chat.scss";
import { Avatar } from "../../components/user";
import { useEffect, useState, useRef, useCallback } from "react";
import { getUserColour } from "../../utils/utils";
import { Loading } from "../../components/interface";
import messageTimeline from "./messageTimeline";
import { dtToTime, dayBorder, dtToDate } from "../../utils/datetime";


function nextShouldBePartial(thisMsg, lastMsg) {
    // No message above current
    if (!lastMsg) {return false}
    // Different senders
    if (thisMsg.getSender() !== lastMsg.getSender()) {return false}
    // Within 10 min of each other
    if ((thisMsg.getDate() - lastMsg.getDate()) > (10 * 60 * 1000)) {return false}
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
            if (eventRoom.roomId !== currentRoom) {return}
            
            // Pass event to timeline handler and update message list
            timeline.current.onEvent(event);
            updateMessageList();
        }
        global.matrix.on("Room.timeline", onEvent);

        updateMessageList();

        // Remove listener on unmount (room change)
        return () => {global.matrix.removeListener("Room.timeline", onEvent)};
    }, [currentRoom, updateMessageList]);

    // Convert message events into message components
    // Messages are in order of youngest (top) to oldest (bottom)
    var messages = [];
    messageList.forEach((event, index) => {
        const prevEvent = messageList[index + 1]; 

        const border = dayBorder(event, prevEvent);
        
        // Determine whether last message was by same user
        if (border === null && nextShouldBePartial(event, prevEvent)) {
            messages.push(
                <PartialMessage event={event} timeline={timeline} key={event.getId()}/>
            );
        } else {
            messages.push(
                <Message event={event} timeline={timeline} key={event.getId()}/>
            );
        }

        if (border !== null) {
            messages.push(
                <DayBorder text={border} key={border} />
            );
        }
    });
    // If rendered last message in channel, add a day border and
    if (timeline.current && messageList.length !== 0 && !timeline.current.canScroll) {
        const text = dtToDate(messageList[messageList.length - 1].getDate());
        messages.push(
            <DayBorder text={text} key={text}/>,
            <div style={{height: "30vh"}}></div>
        );
    }

    if (!timeline.current) {return null}
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

    const loadMore = useCallback(() => {
        setLoading(true);
        timeline.current.getMore().then(() => {
            updateMessageList();
            setLoading(false);
        });
    }, [timeline, updateMessageList]);

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

        // If screen isn't full and messages can be loaded, do that :)
        if (scrollRef.current.offsetHeight === scrollRef.current.scrollHeight && timeline.current.canScroll) {
            atBottom.current = true;
            loadMore();
        }
    }, [children, timeline, loadMore]);

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
            loadMore();
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
    const content = edited ? edited.getContent()["m.new_content"].body : event.getContent().body;

    return (
        <div className="message">
            <Avatar user={author} subClass="message__avatar__crop" />
            <div className="message__text">
                <div className="message__info">
                    <span className="message__author" style={{color: getUserColour(author.userId)}}>{author.displayName}</span>
                    <span className="message-timestamp">{dtToTime(event.getDate())}</span>
                </div>
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
            <div className="message--partial__offset">
                <span className="message-timestamp">{dtToTime(event.getDate())}</span>
            </div>
            <div className="message__text">
                <div className="message__content">
                    {content}
                    {edited && <div className="message__content__edited">(edited)</div>}
                </div>
            </div>
        </div>
    )
}

function DayBorder({ text }) {
    return (
        <div className="chat__day-border">
            <div className="chat__day-border__line"></div>
            <div className="chat__day-border__day">
                {text}
            </div>
            <div className="chat__day-border__line"></div>
        </div>
    );
}

export default Chat;
