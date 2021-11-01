import "./Chat.scss";
import { useEffect, useState, useRef, useCallback, memo } from "react";
import { Loading } from "../../../components/elements";
import eventTimeline, { shouldDisplayEvent } from "./eventTimeline";
import { useBindEscape, useDebouncedState } from "../../../utils/hooks";
import { dayBorder, dateToDateStr } from "../../../utils/datetime";
import { TimelineEvent } from "./Events/Event";
import Settings, { isEventVisibility } from "../../../utils/settings";


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
    const [eventList, setEventList] = useDebouncedState([], 400);

    const updateEventList = useCallback(() => {
        if (!timeline.current) {setEventList([]); return};
        setEventList(timeline.current.getEvents());
    }, [setEventList]);

    // Add event listener when room is changed
    useEffect(() => {
        timeline.current = null;
        setEventList([]);
        // No listener when no selected room
        if (!currentRoom) {return};
        if (!global.matrix.getRoom(currentRoom)) {return}

        console.info("Load room: ", currentRoom)
        timeline.current = new eventTimeline(currentRoom);

        // Set up timeline event handler
        function onEvent(event, eventRoom, toStartOfTimeline) {
            if (eventRoom.roomId !== currentRoom) {return}
            
            // Pass event to timeline handler and refresh message list
            timeline.current.onEvent(event, toStartOfTimeline);
            updateEventList();
        }
        global.matrix.on("Room.timeline", onEvent);

        updateEventList();

        // Remove listener on unmount (room change)
        return () => {global.matrix.removeListener("Room.timeline", onEvent)};
    }, [currentRoom, setEventList, updateEventList]);
    // Settings listener
    useEffect(() => {
        function settingUpdate(setting) {
            if (isEventVisibility(setting)) {
                updateEventList();
            }
        }
        Settings.on("settingUpdate", settingUpdate);
        return () => {Settings.removeListener("settingUpdate", settingUpdate)}
    }, [updateEventList])

    if (!timeline.current) {return null}


    /* Render timeline */
    
    var events = [];
    const lastRead = currentRoom && !timeline.current?.isRead() ? global.matrix.getRoom(currentRoom)?.getEventReadUpTo(global.matrix.getUserId()) : null;
    const filteredEvents = eventList.filter((event) => {return shouldDisplayEvent(event)});
    filteredEvents.forEach((event, index) => {
        const prevEvent = filteredEvents[index - 1];
        event = event.toSnapshot();

        if (lastRead && prevEvent?.getId() === lastRead) {
            events.push(
                <UnreadBorder key="unread"/>
            );
        }

        const border = dayBorder(event, prevEvent);
        if (border !== null) {
            events.push(
                <EventBorder text={border} color="var(--text-greyed)" key={event.getDate().toISOString()}/>
            );
        }
        
        // Pass to handler to generate message
        events.push(
            <TimelineEvent event={event} partial={
                border === null && nextShouldBePartial(event, prevEvent)
            } key={event.getId()}/>
        )

    });
    // If rendered last message in channel, add a day border and 30vh of padding
    if (filteredEvents.length !== 0 && timeline.current.canLoad === false) {
        const text = dateToDateStr(filteredEvents[0].getDate());
        events.unshift(
            <div style={{height: "30vh"}} key="padding"></div>,
            <EventBorder text={text} color="var(--text-greyed)" key={text}/>
        );
    }

    return (
        <ChatScroll timeline={timeline} updateEventList={updateEventList}>
            <div className="chat">
                {events}
            </div>
        </ChatScroll>
    );
}

function ChatScroll({ children, timeline, updateEventList }) {
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
        // Don't try and load new events if we are still waiting for a batch
        if (isLoading.current) {return}

        isLoading.current = true;
        timeline.current.getMore().then(() => {
            updateEventList();
            isLoading.current = false;
        });
    }, [timeline, updateEventList]);

    // When children are modified, if scroll was at the bottom, stay there
    useEffect(() => {
        if (atBottom.current) {
            scrollToBottom();
        } 
    }, [children]);

    // When new events load
    useEffect(() => {
        restoreScrollPos();

        // If still able to see the loading cog, load more events
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

        // When we can see the loading wheel and are able to load events
        if (timeline.current.canLoad && isAtTop() && !isLoading.current) {
            loadMore();
        } 
        // Scrolled to bottom
        else if (e.target.scrollTop === e.target.scrollHeight - e.target.offsetHeight) {
            atBottom.current = true;
            
            // Mark event as read when scrolled to the bottom, if the page is opened
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


function EventBorder({ text, color }) {
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


    return visible && <EventBorder text="New Messages" color="var(--error)"/>;
}

export default memo(Chat);
