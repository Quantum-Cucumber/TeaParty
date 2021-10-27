import "./Event.scss";
import { useContext, memo, useState, useEffect } from "react";

import { Avatar, Member, userPopupCtx } from "../../../../components/user";
import { Button, Option } from "../../../../components/elements";
import { Tooltip, contextMenuCtx, ContextMenu, Modal } from "../../../../components/popups";
import { TextCopy } from "../../../../components/wrappers";
import Reactions, { getEventReactions, ReactionViewer } from "./Reactions";
import { Message, PartialMessage, EmoteMsg, MembershipEvent, RoomEditEvent, PinEvent } from "./eventTypes";

import { classList } from "../../../../utils/utils";
import { dateToTime, messageTimestampFull } from "../../../../utils/datetime";
import Settings from "../../../../utils/settings";
import { getMembersRead, tryGetUser } from "../../../../utils/matrix-client";
import { isMessageEvent, isJoinEvent, isLeaveEvent, isRoomEditEvent, isPinEvent } from "../../../../utils/event-grouping";

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
            eventEntry = (<EmoteMsg event={event} partial={partial} />);
        }
        
        else if (partial) {
            eventEntry = (<PartialMessage event={event} />);
        } else {
            eventEntry = (<Message event={event} />);
        }
    } 
    else if (isJoinEvent(event) || isLeaveEvent(event)) {
        eventEntry = (<MembershipEvent event={event} partial={partial} />);
    }
    else if (isRoomEditEvent(event)) {
        eventEntry = (<RoomEditEvent event={event} partial={partial} />);
    } 
    else if (isPinEvent(event)) {
        eventEntry = (<PinEvent event={event} partial={partial} />);
    }

    return eventEntry;
}, eventIsSame)

export function EventWrapper({ event, partial=false, compact=false, children }) {
    const setUserPopup = useContext(userPopupCtx);
    const [hover, setHover] = useState(false);

    const author = tryGetUser(event.getSender());
    function userPopup(e) {
        setUserPopup({parent: e.target, user: author})
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
                {children}
                {reactionsRelation && <Reactions reactionsRelation={reactionsRelation} />}
            </div>
            <EventButtons event={event} setHover={setHover} reactions={reactionsRelation} />
        </div>
    )
}


function EventButtons(props) {
    const setPopup = useContext(contextMenuCtx);

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
        render: ({ reactions, setUserPopup }) => {
            return (
                <ReactionViewer reactions={reactions} setUserPopup={setUserPopup} />
            )
        },
    },
    read: {
        path: mdiCheckAll,
        label: "Read receipts",
        title: "Read By",
        bodyClass: "overlay__modal--read",
        render: ({ event, setUserPopup }) => {
            const readBy = getMembersRead(event);
            return (<>
                {
                    readBy.map((member) => {
                        const user = global.matrix.getUser(member?.userId);
                        if (!user) {return null}
                        return (
                            <Member member={member} key={member.userId} subClass="data__user-popup" clickFunc={
                                (e) => {
                                    setUserPopup({user: user, parent: e.target.closest(".user")});
                                }
                            } />
                        )
                    })
                }
            </>)
        },
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
                <code className="codeblock">
                    <TextCopy text={eventJSON}>
                        {eventJSON}
                    </TextCopy>
                </code> 
            </>)
        },
    },
}

function MoreOptions({ parent, event, setHover, reactions }) {
    const [currentModal, selectModal] = useState(null);
    const hide = () => {selectModal(null)};
    const setUserPopup = useContext(userPopupCtx);

    // Maintain the :hover effect on the selected message when this menu is rendered
    useEffect(() => {
        setHover(true);
        return () => {setHover(false)};
    }, [setHover])

    let modal;
    if (messageOptions[currentModal]) {
        const {title, render, modalClass, bodyClass} = messageOptions[currentModal];
        const trueEvent = event.replacingEvent() || event;

        modal = (
            <Modal title={title} hide={hide} modalClass={modalClass} bodyClass={bodyClass}>
                {render({ trueEvent, event, setUserPopup, reactions})}
            </Modal>
        );
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
            {modal}
        </ContextMenu>
    )
}
