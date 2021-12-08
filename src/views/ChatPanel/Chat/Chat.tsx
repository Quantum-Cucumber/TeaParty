import "./Chat.scss";
import React, { useEffect, useRef, useCallback, memo, useState } from "react";

import { Loading } from "../../../components/elements";
import { TimelineEvent } from "./Events/Event";
import eventTimeline, { shouldDisplayEvent } from "./eventTimeline";

import { useOnKeypress, useDebouncedState } from "../../../utils/hooks";
import { dayBorder, dateToDateStr } from "../../../utils/datetime";
import Settings, { isEventVisibility } from "../../../utils/settings";
import { getReplyId } from "../../../utils/event";

import type { MatrixEvent, Room } from "matrix-js-sdk";


function nextShouldBePartial(thisMsg: MatrixEvent, lastMsg: MatrixEvent) {
    // No message above current
    if (!lastMsg) {return false}
    // Different senders
    if (thisMsg.getSender() !== lastMsg.getSender()) {return false}
    // Is a reply
    if (getReplyId(thisMsg) !== undefined) {return false}
    // Within 10 min of each other
    if ((thisMsg.getDate().getTime() - lastMsg.getDate().getTime()) > (10 * 60 * 1000)) {return false}
    // All others passed
    return true
}


function Chat({ currentRoom }: {currentRoom: string}) {
    const timeline = useRef<eventTimeline>();
    const [eventList, setEventList] = useDebouncedState<MatrixEvent[]>([], 400);

    const updateEventList = useCallback(() => {
        if (!timeline.current) {setEventList([]); return};
        setEventList(timeline.current.getEvents());
    }, [setEventList]);

    // Unread indicator should be displayed when the page is not focussed and a message is sent
    // When this happens, the last read event ID should be grabbed and saved
    // The indicator should show until the escape key is pressed to clear it (TODO: Not this)
    // The indicator should also be displayed when the room is initially opened
    const [lastUnread, setLastUnread] = useState<string>(null);  // Contains last read event's Id and is retained until esc pressed
    
    const updateUnread = useCallback((clear = false) => {
        if (clear) {
            // Allow for new unread to be set and hide indicator
            setLastUnread(null);
            console.log("clear unread")
            return;
        }

        const room: Room = global.matrix.getRoom(currentRoom);
        setLastUnread((current) => {
            if (current) {
                console.log("currently set", current)
                return current;
            }
            else {
                const a = currentRoom ? room?.getEventReadUpTo(global.matrix.getUserId()) : null
                console.log("set unread", a)
                return a;
            }
        });
    }, [currentRoom]);


    // Add event listener when room is changed
    useEffect(() => {
        timeline.current = null;
        setEventList([]);
        setLastUnread(null);

        // No listener when no selected room
        if (!currentRoom) {return};
        if (!global.matrix.getRoom(currentRoom)) {return}

        console.info("Load room: ", currentRoom)
        timeline.current = new eventTimeline(currentRoom);

        // Set up timeline event handler
        function onEvent(event: MatrixEvent, eventRoom: Room, toStartOfTimeline = true) {
            if (eventRoom.roomId !== currentRoom) {return}
            
            // Pass event to timeline handler and refresh message list
            timeline.current.onEvent(event, toStartOfTimeline);
            updateEventList();
        }
        global.matrix.on("Room.timeline", onEvent);
        global.matrix.on("Room.redaction", onEvent);

        const timelineReset = () => setEventList([]);
        global.matrix.on("Room.timelineReset", timelineReset)

        updateUnread();
        updateEventList();

        // Remove listener on unmount (room change)
        return () => {
            global.matrix.removeListener("Room.timeline", onEvent);
            global.matrix.removeListener("Room.redaction", onEvent);
            global.matrix.removeListener("Room.timelineReset", timelineReset)
        };
    }, [currentRoom, setEventList, updateEventList, updateUnread]);
    // Settings listener
    useEffect(() => {
        function settingUpdate(setting: string) {
            if (isEventVisibility(setting)) {
                updateEventList();
            }
        }
        Settings.on("settingUpdate", settingUpdate);
        return () => {Settings.removeListener("settingUpdate", settingUpdate)}
    }, [updateEventList])

    if (!timeline.current) {return null}


    /* Render timeline */
    
    var events: JSX.Element[] = [];
    const filteredEvents = eventList.filter((event) => {return shouldDisplayEvent(event)});
    filteredEvents.forEach((event, index) => {
        const prevEvent = filteredEvents[index - 1];
        event = event.toSnapshot();

        if (lastUnread && prevEvent?.getId() === lastUnread) {
            events.push(
                <UnreadBorder updateUnread={updateUnread} key="unread"/>
            );
        }

        const border = dayBorder(event, prevEvent);
        if (border !== null) {
            events.push(
                <EventBorder text={border} colour="var(--text-greyed)" key={event.getDate().toISOString()}/>
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
            <EventBorder text={text} colour="var(--text-greyed)" key={text}/>
        );
    }

    return (
        <ChatScroll timeline={timeline} updateEventList={updateEventList} updateUnread={updateUnread}>
            <div className="chat">
                {events}
            </div>
        </ChatScroll>
    );
}


type ChatScrollProps = {
    children: JSX.Element,
    timeline: React.MutableRefObject<eventTimeline>,
    updateEventList: () => void,
    updateUnread:  (clear?: boolean) => void,
}
function ChatScroll({ children, timeline, updateEventList, updateUnread }: ChatScrollProps) {
    const atBottom = useRef(true);
    const scrollPos = useRef<number>(null);
    const scrollRef = useRef<HTMLDivElement>();
    const loadingRef = useRef<HTMLDivElement>();
    const isLoading = useRef(false);

    // When escape key pressed, scroll to the bottom and mark chat as read
    const markAsRead = useCallback(() => {
        scrollToBottom();
        timeline.current.markAsRead();
    }, [timeline]);
    useOnKeypress("Escape", markAsRead);

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

        // If document isn't focussed, show the indicator
        if (document.visibilityState === "hidden") {
            updateUnread();
        }
    }, [children, updateUnread]);

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

    function onScroll(e: React.UIEvent<HTMLDivElement>) {
        atBottom.current = false;  // Will be reset if needed
        saveScrollPos();  // Save scroll position in case it will be restored

        // When we can see the loading wheel and are able to load events
        if (timeline.current.canLoad && isAtTop() && !isLoading.current) {
            loadMore();
        } 
        // Scrolled to bottom
        else if (e.currentTarget.scrollTop === e.currentTarget.scrollHeight - e.currentTarget.offsetHeight) {
            atBottom.current = true;
            
            // Mark event as read when scrolled to the bottom, if the page is opened
            if (document.visibilityState === "visible") {
                markAsRead();
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


function EventBorder({ text, colour }: {text: string, colour: string}) {
    return (
        <div className="chat__border" style={{"--color": colour} as React.CSSProperties}>
            <div className="chat__border__line"></div>
            <div className="chat__border__text">
                {text}
            </div>
            <div className="chat__border__line"></div>
        </div>
    );
}


type UnreadBorderProps = {
    updateUnread: (clear?: boolean) => void,
}
function UnreadBorder({ updateUnread }: UnreadBorderProps) {
    useOnKeypress("Escape", () => updateUnread(true));

    return <EventBorder text="New Messages" colour="var(--error)"/>;
}

export default memo(Chat);
