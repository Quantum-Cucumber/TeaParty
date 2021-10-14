import "./Event.scss";
import { useContext, memo, useState, useEffect } from "react";
import { Avatar, Member, userPopupCtx } from "../../../../components/user";
import { Button, Tooltip, contextMenuCtx, ContextMenu, Option, Modal, TextCopy } from "../../../../components/interface";
import { classList, getUserColour } from "../../../../utils/utils";
import { dateToTime, messageTimestamp, messageTimestampFull } from "../../../../utils/datetime";
import Settings from "../../../../utils/settings";
import { getMembersRead, tryGetUser } from "../../../../utils/matrix-client";
import { mdiCheckAll, mdiDotsHorizontal, /*mdiEmoticonOutline, mdiReply,*/ mdiXml } from "@mdi/js";
import MessageContent, { EditMarker, MessageText } from "./MessageContent";
import Icon from "@mdi/react";

function eventIsSame(oldProps, newProps) {
    const oldEvent = oldProps.event;
    const newEvent = newProps.event;

    return (
        oldEvent.replacingEventId() === newEvent.replacingEventId()
    );
}

export const TimelineEvent = memo(({ event, partial=false }) => {    
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

    return eventEntry;
}, eventIsSame)

function MessageWrapper({ event, partial=false, compact=false, children }) {
    const setUserPopup = useContext(userPopupCtx);
    const [hover, setHover] = useState(false);

    const author = tryGetUser(event.getSender());
    if (!author) {return;}

    function userPopup(e) {
        setUserPopup({parent: e.target, user: author})
    }

    return (
        <div className={classList("event", {"event--hover": hover}, {"event--partial": partial})}>
            <div className="event__offset">
                { partial ?
                    <Tooltip delay={0.5} dir="top" text={messageTimestampFull(event.getDate())}>
                        <span className="event__timestamp">{dateToTime(event.getDate())}</span>
                    </Tooltip>
                :
                    <Avatar user={author} subClass={classList("event__avatar", {"event__avatar--compact": compact}, "data__user-popup")} clickFunc={userPopup} />
                }
            </div>
            <div className="event__body">
                {children}
            </div>
            <EventButtons event={event} setHover={setHover} />
        </div>
    )
}

function Message({ event }) {
    const setUserPopup = useContext(userPopupCtx);

    const author = tryGetUser(event.getSender());
    if (!author) {return;}

    function userPopup(e) {
        setUserPopup({parent: e.target, user: author})
    }

    return (
        <MessageWrapper event={event}>
            <div className="message__info">
                <span className="message__info__author data__user-popup" style={{color: getUserColour(author.userId)}} onClick={userPopup}>
                    {author.displayName}
                </span>

                <Tooltip delay={0.5} dir="top" text={messageTimestampFull(event.getDate())}>
                    <span className="event__timestamp">{messageTimestamp(event.getDate())}</span>
                </Tooltip>
            </div>
            <MessageContent event={event} />
        </MessageWrapper>
    );
}

function PartialMessage({ event }) {
    return (
        <MessageWrapper event={event} partial>
            <MessageContent event={event} />
        </MessageWrapper>
    )
}

function EmoteMsg({ event, partial }) {
    const setUserPopup = useContext(userPopupCtx);

    const author = tryGetUser(event.getSender());
    if (!author) {return;}

    function userPopup(e) {
        setUserPopup({parent: e.target, user: author})
    }

    return (
        <MessageWrapper event={event} partial={partial} compact>
            <div className="message__content message--emote__content">
                &#x2217;&nbsp;
                <span className="message__author data__user-popup" onClick={userPopup}>
                    {author.displayName}
                </span>
                {" "}
                <MessageText eventContent={event.getContent()} />
                <EditMarker event={event} />
            </div>
        </MessageWrapper>
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
        condition: () => {return Settings.getSetting("devMode") === true},
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
