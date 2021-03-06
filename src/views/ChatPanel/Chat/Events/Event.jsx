import "./Event.scss";
import { useContext, memo, useState, useEffect, useRef } from "react";
import { EventType, MsgType } from "matrix-js-sdk/lib/@types/event";

import { MemberAvatar, Member, UserOptions, UserPopup } from "../../../../components/user";
import { IconButton, Option, OptionIcon } from "../../../../components/elements";
import { Tooltip, ContextMenu, Modal, popupCtx, modalCtx } from "../../../../components/popups";
import EmojiPicker from "../../../../components/EmojiPicker";
import { Code, TextCopy } from "../../../../components/wrappers";
import Reactions, { getEventReactions, ReactionViewer } from "./Reactions";
import { Message, EmoteMsg, MembershipEvent, RoomEditEvent, PinEvent, StickerEvent } from "./eventTypes";
import Reply from "./Reply";

import { classList } from "../../../../utils/utils";
import { dateToTime, messageTimestampFull } from "../../../../utils/datetime";
import Settings from "../../../../utils/settings";
import { getMember, getMembersRead, tryGetUser } from "../../../../utils/matrix-client";
import { isMessageEvent, isJoinEvent, isLeaveEvent, isRoomEditEvent, isPinEvent, isStickerEvent, getReplyId } from "../../../../utils/event";
import { useScrollPaginate } from "../../../../utils/hooks";
import { MatrixtoPermalink } from "../../../../utils/linking";

import { mdiCheckAll, mdiDotsHorizontal, mdiEmoticonOutline, mdiXml, mdiEmoticon, mdiShareVariant, mdiDelete, mdiPinOff, mdiPin } from "@mdi/js";
import { addReaction, updatePins } from "../../../../utils/eventSending";

function eventIsSame(oldProps, newProps) {
    const oldEvent = oldProps.event;
    const newEvent = newProps.event;

    return (
        // Edits
        oldEvent.replacingEventId() === newEvent.replacingEventId() &&
        oldEvent.status === newEvent.status
    );
}

export const TimelineEvent = memo(
    function TimelineEvent({ event, partial=false }) {    
        let eventEntry = null;
        if (isMessageEvent(event)) {
            if (event.getContent().msgtype === MsgType.Emote) {
                eventEntry = (
                    <EmoteMsg event={event} partial={partial} />
                );
            }
            else {    
                eventEntry = (
                    <Message event={event} partial={partial} />
                );
            }
        } 
        else if (isJoinEvent(event) || isLeaveEvent(event)) {
            eventEntry = (
                <MembershipEvent event={event} partial={partial} />
            );
        }
        else if (isRoomEditEvent(event)) {
            eventEntry = (
                <RoomEditEvent event={event} partial={partial} />
            );
        } 
        else if (isPinEvent(event)) {
            eventEntry = (
                <PinEvent event={event} partial={partial} />
            );
        }
        else if (isStickerEvent(event)) {
            eventEntry = (
                <StickerEvent event={event} partial={partial} />
            )
        }

        return eventEntry;
    }
, eventIsSame)

export function EventWrapper({ event, partial=false, compact=false, children }) {
    const setPopup = useContext(popupCtx);
    const [hover, setHover] = useState(false);

    const author = tryGetUser(event.getSender());
    function userPopup(e) {
        setPopup(
            <UserPopup parent={e.target} user={author} room={event.getRoomId()} setPopup={setPopup} />
        )
    }
    const member = getMember(event.getRoomId(), event.getSender());

    // Reactions
    const [reactionsRelation, setReactionsRelation] = useState(getEventReactions(event));
    useEffect(() => {
        // No need to listen for relation creation if relation exists
        if (reactionsRelation) {return}

        function updateReactionRelation() {
            setReactionsRelation(getEventReactions(event));
            event.removeListener("Event.relationsCreated", updateReactionRelation);
        }
        event.on("Event.relationsCreated", updateReactionRelation);

        return () => {
            event.removeListener("Event.relationsCreated", updateReactionRelation);
        }
    }, [event, reactionsRelation])

    // Rich reply
    const replyId = getReplyId(event);

    if (!author) {return}
    return (
        <div className={classList("event-container", {"event-container--hover": hover}, {"event-container--partial": partial}, {"event-container--sending": event.isSending()})}
            onContextMenu={(e) => {
                // Don't show the message popup if a link is right clicked
                // TODO: Add extra options if the A tag is clicked - copy link/open link
                if (e.target.tagName === "A") {return}

                e.preventDefault();
                e.stopPropagation();  // Not totally necessary unless a parent has a listener too
                setPopup(
                    <EventOptions parent={e.target} x="align-mouse-left" y="align-mouse-top" 
                                  mouseEvent={e} event={event} reactions={reactionsRelation} setHover={setHover} />
                );
            }}
        >
            { replyId && <Reply roomId={event.getRoomId()} eventId={replyId} /> }
            <div className="event">
                <div className="event__offset">
                    { partial ?
                        <div className="event__timestamp-align">
                            <Tooltip delay={0.5} dir="top" text={messageTimestampFull(event.getDate())}>
                                    <span className="event__timestamp">{dateToTime(event.getDate())}</span>
                            </Tooltip>
                        </div>
                    :
                    <div className={classList("event__avatar", {"event__avatar--compact": compact}, "data__user-popup")} 
                            onClick={userPopup} onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setPopup(
                                    <UserOptions parent={e.target} roomId={event.getRoomId()} userId={author.userId} x="align-mouse-left" y="align-mouse-top" mouseEvent={e} />
                                )
                            }}
                    >
                        <MemberAvatar member={member} />
                    </div>
                }
                </div>
                <div className="event__body">
                    {children}
                    {reactionsRelation && <Reactions event={event} reactionsRelation={reactionsRelation} />}
                </div>
            </div>
            <EventButtons event={event} setHover={setHover} reactions={reactionsRelation} />
        </div>
    )
}


function EventButtons(props) {
    const setPopup = useContext(popupCtx);

    return (
        <div className="event__buttons">
            <IconButton subClass="event__buttons__entry" path={mdiEmoticonOutline} size="95%" tipDir="top" tipText="Add reaction"
                clickFunc={(e) => {
                    setPopup(
                        <EmojiPicker parent={e.target.closest(".event__buttons__entry")} {...props} x="align-right" y="align-top"
                            onSelect={(emote) => {
                                addReaction(props.event, emote);
                            }}
                        />
                    );
                }}
            />
            <IconButton subClass="event__buttons__entry" path={mdiDotsHorizontal} size="100%" tipDir="top" tipText="More"
                clickFunc={(e) => {
                    setPopup(
                        <EventOptions parent={e.target.closest(".event__buttons__entry")} {...props} x="right" y="align-top" />
                    );
                }}
            />
        </div>
    )
}


function EventOptions({ event, setHover, reactions, ...contextMenuProps }) {
    const setModal = useContext(modalCtx);
    const setPopup = useContext(popupCtx);

    // Maintain the :hover effect on the selected message when this menu is rendered
    useEffect(() => {
        setHover(true);
        return () => {setHover(false)};
    }, [setHover])

    function selectModal(title, render, modalClass=null, bodyClass=null) {
        setModal(
            <Modal title={title} hide={() => setModal()} modalClass={modalClass} bodyClass={bodyClass}>
                {render}
            </Modal>
        );
        // Hide popup as it would render over the top of the modal
        setPopup();
    }

    const trueEvent = event.replacingEvent() || event;
    const room = global.matrix.getRoom(event.getRoomId());

    const pinnedEvents = room.currentState.getStateEvents(EventType.RoomPinnedEvents, "")?.getContent().pinned ?? [];
    const isPinned = pinnedEvents.includes(event.getId());
    const canPin = room.currentState.maySendStateEvent(EventType.RoomPinnedEvents, global.matrix.getUserId());

    return (
        <ContextMenu {...contextMenuProps}>
            <Option compact text="Add reaction"
                select={() => {
                    setPopup(
                        <EmojiPicker setHover={setHover} {...contextMenuProps}
                            onSelect={(emote) => {
                                addReaction(event, emote);
                            }}
                        />
                    )
                }}
                icon={<OptionIcon path={mdiEmoticon} />}
            />

            { reactions && 
                <Option compact text="Reactions"
                    select={() => {
                        selectModal("Reactions", 
                                    <ReactionViewer event={event} reactions={reactions} />, 
                                    null, "overlay__modal--reacts"
                        )
                    }}
                    icon={<OptionIcon path={mdiEmoticon} />}
                />
            }

            <Option compact text="Read Receipts"
                select={() => {
                    selectModal("Read By", <ReadReceipts event={event} />, null, "overlay__modal--read")
                }}
                icon={<OptionIcon path={mdiCheckAll} />}
            />

            { canPin &&
                <Option compact text={isPinned ? "Unpin" : "Pin"}
                    icon={<OptionIcon path={isPinned ? mdiPinOff : mdiPin} />}
                    select={() => {
                        let newPins;
                        if (isPinned) {
                            // Remove pin
                            newPins = pinnedEvents.filter((eventId) => eventId !== event.getId());
                        }
                        else {
                            // Add pin
                            newPins = [event.getId(), ...pinnedEvents];
                        }
                        // Send state event
                        updatePins(event.getRoomId(), newPins);
                        setPopup();
                    }}
                />
            }

            { room.currentState.maySendRedactionForEvent(event, global.matrix.getUserId()) &&
                <Option compact danger text="Delete" 
                    select={() => {
                        global.matrix.redactEvent(event.getRoomId(), event.getId());
                        setPopup();
                    }}
                    icon={<OptionIcon path={mdiDelete} colour="error" />}
                />
            }

            <Option compact text="Copy link"
                select={() => {
                        const url = (new MatrixtoPermalink()).event(event.getRoomId(), event.getId());
                        navigator.clipboard.writeText(url);
                        setPopup();
                }}
                icon={<OptionIcon path={mdiShareVariant} />}
            />
            
            { Settings.get("devMode") &&
                <Option compact text="View source"
                    select={() => {
                        selectModal("Event Source", 
                            <>
                                <TextCopy text={trueEvent.getId()}>
                                    <b>Event ID:</b> {trueEvent.getId()}
                                </TextCopy>
                                <TextCopy text={trueEvent.getRoomId()}>
                                    <b>Room ID:</b> {trueEvent.getRoomId()}
                                </TextCopy>
                                <br />
                                <Code className="language-json">
                                    {JSON.stringify(trueEvent.toJSON(), null, 4)}
                                </Code>
                            </>
                        )
                    }}
                    icon={<OptionIcon path={mdiXml} />}
                />
            }
        </ContextMenu>
    )
}


const readReceiptsChunks = 30;
function ReadReceipts({ event }) {
    const setPopup = useContext(popupCtx);
    const readBy = useRef(getMembersRead(event));
    const [loadingRef, setLoadingRef] = useState();
    const loaded = useScrollPaginate(loadingRef, readReceiptsChunks);

    return (<>
        {
            readBy.current.slice(0, loaded).map((member) => {
                const user = global.matrix.getUser(member?.userId);
                if (!user) {return null}
                return (
                    <Member member={member} key={member.userId} subClass="data__user-popup" clickFunc={
                        (e) => {
                            setPopup(
                                <UserPopup parent={e.target} user={user} room={event.getRoomId()} setPopup={setPopup} />
                            );
                        }
                    } />
                )
            })
        }

        { readBy.current.length > loaded &&
            <div ref={setLoadingRef} style={{height: "1px", width: "100%"}}></div>
        }
    </>)
}
