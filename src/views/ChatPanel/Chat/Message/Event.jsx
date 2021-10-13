import "./Event.scss";
import { useContext, memo, useState, useEffect } from "react";
import { Avatar, Member, userPopupCtx } from "../../../../components/user";
import { Button, Tooltip, contextMenuCtx, ContextMenu, Option, Modal, TextCopy } from "../../../../components/interface";
import { classList, getUserColour } from "../../../../utils/utils";
import { dateToTime, messageTimestamp, messageTimestampFull } from "../../../../utils/datetime";
import { getSetting } from "../../../../utils/settings";
import { getMembersRead, tryGetUser } from "../../../../utils/matrix-client";
import { mdiCheckAll, mdiDotsHorizontal, /*mdiEmoticonOutline, mdiReply,*/ mdiXml } from "@mdi/js";
import MessageContent, { EditMarker, MessageText } from "./MessageTypes";
import Icon from "@mdi/react";

function eventIsSame(oldProps, newProps) {
    const oldEvent = oldProps.event;
    const newEvent = newProps.event;

    return (
        oldEvent.replacingEventId() === newEvent.replacingEventId()
    );
}

export const TimelineEvent = memo(({ event, partial=false }) => {
    const [hover, setHover] = useState(false);
    
    let eventEntry;
    if (event.getType() === "m.room.message") {
        if (event.getContent().msgtype === "m.emote") {
            eventEntry = (<EmoteMsg event={event} partial={partial} />);
        }
        
        else if (partial) {
            eventEntry = (<PartialMessage event={event} />);
        } else {
            eventEntry = (<Message event={event} />);
        }
    }

    return (
        <div className={classList("event", {"event--hover": hover}, {"event--partial": partial})}>
            {eventEntry}
            <EventButtons event={event} setHover={setHover} />
        </div>
    );
}, eventIsSame)

function Message({ event }) {
    const setUserPopup = useContext(userPopupCtx);

    const author = tryGetUser(event.getSender());
    if (!author) {return;}

    function userPopup(e) {
        setUserPopup({parent: e.target, user: author})
    }

    return (
        <div className="message">
            <Avatar user={author} subClass="message__avatar__crop data__user-popup" clickFunc={userPopup} />
            <div className="message__text">
                <div className="message__info">
                    <span className="message__author data__user-popup" style={{color: getUserColour(author.userId)}} onClick={userPopup}>
                        {author.displayName}
                    </span>

                    <Tooltip delay={0.5} dir="top" text={messageTimestampFull(event.getDate())}>
                        <span className="message-timestamp">{messageTimestamp(event.getDate())}</span>
                    </Tooltip>
                </div>
                <MessageContent event={event} />
            </div>
        </div>
    );
}

function PartialMessage({ event }) {
    return (
        <div className="message--partial">
            <div className="message--partial__offset">
                <Tooltip delay={0.5} dir="top" text={messageTimestampFull(event.getDate())}>
                    <span className="message-timestamp">{dateToTime(event.getDate())}</span>
                </Tooltip>
            </div>
            <div className="message__text">
                <MessageContent event={event} />
            </div>
        </div>
    )
}

function EmoteMsg ({ event, partial }) {
    const setUserPopup = useContext(userPopupCtx);

    const author = tryGetUser(event.getSender());
    if (!author) {return;}

    function userPopup(e) {
        setUserPopup({parent: e.target, user: author})
    }

    return (
        <div className={classList("message--partial", {"message--emote--partial": partial})}>
            <div className="message--partial__offset">
                <Tooltip delay={0.5} dir="top" text={messageTimestampFull(event.getDate())}>
                    <span className="message-timestamp">{dateToTime(event.getDate())}</span>
                </Tooltip>
            </div>
            <div className="message__text message__content message--emote__content">
                &#x2217;&nbsp;
                <span className="message__author data__user-popup" style={{color: getUserColour(author.userId)}} onClick={userPopup}>
                    {author.displayName}
                </span>
                {" "}
                <MessageText eventContent={event.getContent()} />
                <EditMarker event={event} />
            </div>
        </div>
    )
}

function EventButtons(props) {
    const setPopup = useContext(contextMenuCtx);

    return (
        <div className="message__buttons">
            {/*<Button subClass="message__buttons__entry" path={mdiReply} size="100%" tipDir="top" tipText="Reply" />
            <Button subClass="message__buttons__entry" path={mdiEmoticonOutline} size="95%" tipDir="top" tipText="Add reaction" />*/}
            <Button subClass="message__buttons__entry" path={mdiDotsHorizontal} size="100%" tipDir="top" tipText="More"
                clickFunc={(e) => {
                    setPopup(
                        <MoreOptions parent={e.target.closest(".message__buttons__entry")} {...props} />
                    );
                }}
            />
        </div>
    )
}

const messageOptions = {
    read: {
        path: mdiCheckAll,
        title: "Read By",
        label: "Read receipts",
        bodyClass: "overlay__modal--read",
        render: ({ event, setUserPopup }) => {
            const readBy = getMembersRead(event);
            return (<>
                {
                    readBy.map((member) => {
                        const user = member.user || global.matrix.getUser(member.userId);
                        return (
                            <Member user={user} key={member.userId} subClass="data__user-popup" clickFunc={
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
        condition: () => {return getSetting("devMode") === true},
        title: "Event Source",
        label: "View source",
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

function MoreOptions({ parent, event, setHover }) {
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
                {render({ trueEvent, event, setUserPopup})}
            </Modal>
        );
    }

    return (
        <ContextMenu parent={parent} x="left" y="align-top">
            {
                Object.keys(messageOptions).filter((key) => {
                    const condition = messageOptions[key].condition;
                    return condition ? condition() : true;
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
