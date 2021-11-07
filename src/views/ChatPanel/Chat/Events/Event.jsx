import "./Event.scss";
import { useContext, memo, useState, useEffect, useRef } from "react";

import { Avatar, Member, UserPopup } from "../../../../components/user";
import { Button, Option } from "../../../../components/elements";
import { Tooltip, ContextMenu, Modal, popupCtx, modalCtx } from "../../../../components/popups";
import { Code, TextCopy } from "../../../../components/wrappers";
import Reactions, { getEventReactions, ReactionViewer } from "./Reactions";
import { Message, EmoteMsg, MembershipEvent, RoomEditEvent, PinEvent, StickerEvent } from "./eventTypes";
import Reply from "./Reply";

import { classList } from "../../../../utils/utils";
import { dateToTime, messageTimestampFull } from "../../../../utils/datetime";
import Settings from "../../../../utils/settings";
import { getMembersRead, tryGetUser } from "../../../../utils/matrix-client";
import { isMessageEvent, isJoinEvent, isLeaveEvent, isRoomEditEvent, isPinEvent, isStickerEvent, getReplyId } from "../../../../utils/event";
import { useScrollPaginate } from "../../../../utils/hooks";

import { mdiCheckAll, mdiDotsHorizontal, /*mdiEmoticonOutline, mdiReply,*/ mdiXml, mdiEmoticon } from "@mdi/js";
import Icon from "@mdi/react";

function eventIsSame(oldProps, newProps) {
    const oldEvent = oldProps.event;
    const newEvent = newProps.event;

    return (
        // Edits
        oldEvent.replacingEventId() === newEvent.replacingEventId()
    );
}

export const TimelineEvent = memo(({ event, partial=false }) => {    
    let eventEntry = null;
    if (isMessageEvent(event)) {
        if (event.getContent().msgtype === "m.emote") {
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
}, eventIsSame)

export function EventWrapper({ event, partial=false, compact=false, children }) {
    const setPopup = useContext(popupCtx);
    const [hover, setHover] = useState(false);

    const author = tryGetUser(event.getSender());
    function userPopup(e) {
        setPopup(
            <UserPopup parent={e.target} user={author} room={event.getRoomId()} setPopup={setPopup} />
        )
    }

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
        <div className={classList("event", {"event--hover": hover}, {"event--partial": partial})}>
            <div className="event__offset">
                { partial ?
                    <div className="event__timestamp-align">
                        <Tooltip delay={0.5} dir="top" text={messageTimestampFull(event.getDate())}>
                                <span className="event__timestamp">{dateToTime(event.getDate())}</span>
                        </Tooltip>
                    </div>
                :
                <Avatar user={author} subClass={classList("event__avatar", {"event__avatar--compact": compact}, "data__user-popup")} clickFunc={userPopup} />
            }
            </div>
            <div className="event__body">
                { replyId && <Reply roomId={event.getRoomId()} eventId={replyId} /> }
                {children}
                {reactionsRelation && <Reactions reactionsRelation={reactionsRelation} />}
            </div>
            <EventButtons event={event} setHover={setHover} reactions={reactionsRelation} />
        </div>
    )
}


function EventButtons(props) {
    const setPopup = useContext(popupCtx);

    return (
        <div className="event__buttons">
            {/*<Button subClass="message__buttons__entry" path={mdiReply} size="100%" tipDir="top" tipText="Reply" />
            <Button subClass="message__buttons__entry" path={mdiEmoticonOutline} size="95%" tipDir="top" tipText="Add reaction" />*/}
            <Button subClass="event__buttons__entry" path={mdiDotsHorizontal} size="100%" tipDir="top" tipText="More"
                clickFunc={(e) => {
                    setPopup(
                        <MoreOptions parent={e.target.closest(".event__buttons__entry")} {...props} />
                    );
                }}
            />
        </div>
    )
}

const messageOptions = {
    reacts: {
        path: mdiEmoticon,
        condition: ({ reactions }) => {
            return reactions ? true : false
        },
        title: "Reactions",
        label: "Reactions",
        bodyClass: "overlay__modal--reacts",
        render: ({ event, reactions }) => {
            return (
                <ReactionViewer event={event} reactions={reactions} />
            )
        },
    },
    read: {
        path: mdiCheckAll,
        label: "Read receipts",
        title: "Read By",
        bodyClass: "overlay__modal--read",
        render: ({ event }) => 
            <ReadReceipts event={event} />,
    },
    source: {
        path: mdiXml,
        condition: () => {return Settings.get("devMode") === true},
        label: "View source",
        title: "Event Source",
        render: ({ trueEvent }) => {
            const eventJSON = JSON.stringify(trueEvent.toJSON(), null, 4);
            return (<>
               <TextCopy text={trueEvent.getId()}>
                    <b>Event ID:</b> {trueEvent.getId()}
                </TextCopy>
                <TextCopy text={trueEvent.getRoomId()}>
                    <b>Room ID:</b> {trueEvent.getRoomId()}
                </TextCopy>
                <br />
                <Code className="language-json">
                    {eventJSON}
                </Code>
            </>)
        },
    },
}

function MoreOptions({ parent, event, setHover, reactions }) {
    const setModal = useContext(modalCtx);
    const setPopup = useContext(popupCtx);

    // Maintain the :hover effect on the selected message when this menu is rendered
    useEffect(() => {
        setHover(true);
        return () => {setHover(false)};
    }, [setHover])

    
    function hide() {
        setModal();
    }
    function selectModal(key) {
        const {title, render, modalClass, bodyClass} = messageOptions[key];
        const trueEvent = event.replacingEvent() || event;

        setModal(
            <Modal title={title} hide={hide} modalClass={modalClass} bodyClass={bodyClass}>
                {render({ trueEvent, event, reactions})}
            </Modal>
        );
        // Hide popup as it would render over the top of the modal
        setPopup();
    }

    return (
        <ContextMenu parent={parent} x="left" y="align-top">
            {
                Object.keys(messageOptions).filter((key) => {
                    const condition = messageOptions[key].condition;
                    return condition ? condition({event, reactions}) : true;
                }).map((key) => {
                    const {path, label} = messageOptions[key];

                    return (
                        <Option text={label} select={() => {selectModal(key)}} key={key} compact>
                            <Icon path={path} size="1em" color="var(--text)" />
                        </Option>
                    )
                })
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
