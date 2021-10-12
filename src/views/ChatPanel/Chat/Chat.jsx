import "./Chat.scss";
import { useEffect, useState, useRef, useCallback, memo } from "react";
import { Loading } from "../../../components/interface";
import messageTimeline from "./messageTimeline";
import { useBindEscape, useDebouncedState } from "../../../utils/utils";
import { dayBorder, dateToDateStr } from "../../../utils/datetime";
import { TimelineEvent } from "./Message/Message";


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
    const [messageList, setMessageList] = useDebouncedState([], 200);

    const updateMessageList = useCallback(() => {
        setMessageList(timeline.current.getMessages());
    }, [setMessageList]);

    // Add event listener when room is changed
    useEffect(() => {
        setMessageList([]);
        timeline.current = null;
        // No listener when no selected room
        if (!currentRoom) {return};

        console.info("Load room: ", currentRoom)
        timeline.current = new messageTimeline(currentRoom);

        // Set up timeline event handler
        function onEvent(event, eventRoom, toStartOfTimeline) {
            if (eventRoom.roomId !== currentRoom) {return}
            
            // Pass event to timeline handler and refresh message list
            timeline.current.onEvent(event, toStartOfTimeline);
            updateMessageList();
        }
        global.matrix.on("Room.timeline", onEvent);

        updateMessageList();

        // Remove listener on unmount (room change)
        return () => {global.matrix.removeListener("Room.timeline", onEvent)};
    }, [currentRoom, setMessageList, updateMessageList]);

    if (!timeline.current) {return null}

    // Render timeline
    var messages = [];
    const lastRead = currentRoom && !timeline.current?.isRead() ? global.matrix.getRoom(currentRoom).getEventReadUpTo(global.matrix.getUserId()) : null;
    messageList.forEach((event, index) => {
        if (!timeline.current.shouldDisplayEvent(event)) {return};
        event = event.toSnapshot();
        const prevEvent = messageList[index - 1]; 

        if (lastRead && prevEvent?.getId() === lastRead) {
            messages.push(
                <UnreadBorder key="unread"/>
            );
        }

        const border = dayBorder(event, prevEvent);
        if (border !== null) {
            messages.push(
                <MessageBorder text={border} color="var(--text-greyed)" key={border}/>
            );
        }
        
        // Pass to handler to generate message
        messages.push(
            <TimelineEvent event={event} partial={
                border === null && nextShouldBePartial(event, prevEvent)
            } key={event.getId()}/>
        )

    });
    // If rendered last message in channel, add a day border and 30vh of padding
    if (messageList.length !== 0 && timeline.current.canLoad === false) {
        const text = dateToDateStr(messageList[0].getDate());
        messages.unshift(
            <div style={{height: "30vh"}} key="padding"></div>,
            <MessageBorder text={text} color="var(--text-greyed)" key={text}/>
        );
    }

    return (
        <ChatScroll timeline={timeline} updateMessageList={updateMessageList}>
            <div className="chat">
                {messages}
            </div>
        </ChatScroll>
    );
}

function ChatScroll({ children, timeline, updateMessageList }) {
    const atBottom = useRef(true);
    const scrollPos = useRef(false);
    const scrollRef = useRef();
    const loadingRef = useRef();
    const isLoading = useRef(false);

    // When escape key pressed, scroll to the bottom and mark chat as read
    const markAsRead = useCallback(() => {
        scrollToBottom();
        timeline.current.markAsRead();
    }, [timeline]);
    useBindEscape(markAsRead, null);

    // Callback to load more messages
    const loadMore = useCallback(() => {
        // Don't try and load new messages if we are still waiting for a batch
        if (isLoading.current) {return}

        isLoading.current = true;
        timeline.current.getMore().then(() => {
            updateMessageList();
            isLoading.current = false;
        });
    }, [timeline, updateMessageList]);

    // When children are modified, if scroll was at the bottom, stay there
    useEffect(() => {
        if (atBottom.current) {
            scrollToBottom();
        } 
    }, [children]);

    // When new messages load
    useEffect(() => {
        restoreScrollPos();

        // If still able to see the loading cog, load more messages
        if (isAtTop() && !isLoading.current) {
            loadMore();
        }
    }, [children, timeline, loadMore]);

    function scrollToBottom() {
        if (scrollRef) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }
    function saveScrollPos() {  // Calculates scroll offset from bottom of the page
        scrollPos.current = scrollRef.current.scrollHeight - scrollRef.current.scrollTop;
    }
    function restoreScrollPos() {  // Jumps to the saved offset
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight - scrollPos.current;
    }
    function isAtTop() {
        // If loading wheel isn't loaded then ignore
        if (!loadingRef.current) {return false}

        return loadingRef.current.getBoundingClientRect().bottom >= 0;
    }

    function onScroll(e) {
        atBottom.current = false;  // Will be reset if needed
        timeline.current.isReading = false;  // ^
        saveScrollPos();  // Save scroll position in case it will be restored

        // When we can see the loading wheel and are able to load messages
        if (timeline.current.canLoad && isAtTop() && !isLoading.current) {
            loadMore();
        } 
        // Scrolled to bottom
        else if (e.target.scrollTop === e.target.scrollHeight - e.target.offsetHeight) {
            atBottom.current = true;
            
            // Mark messages as read when scrolled to the bottom, if the page is opened
            if (document.hasFocus()) {
                timeline.current.isReading = true;
                markAsRead()
            }
        }
    }

    return (
        <div className="chat-scroll" ref={scrollRef} onScroll={onScroll}>
            {timeline.current?.canLoad && <div className="chat-scroll__loading" ref={loadingRef}><Loading size="50px"/></div>}
            {children}
        </div>
    );
}


function MessageBorder({ text, color }) {
    return (
        <div className="chat__border" style={{"--color": color}}>
            <div className="chat__border__line"></div>
            <div className="chat__border__text">
                {text}
            </div>
            <div className="chat__border__line"></div>
        </div>
    );
}

function UnreadBorder() {
    const [visible, setVisible] = useState(true);
    useBindEscape(setVisible, false);


    return visible && <MessageBorder text="New Messages" color="var(--error)"/>;
}

export default memo(Chat);
