import "./Message.scss";
import { useContext, memo, useState, useEffect } from "react";
import { Avatar, Member, userPopupCtx } from "../../../../components/user";
import { Button, Tooltip, contextMenuCtx, ContextMenu, Option, Modal, TextCopy } from "../../../../components/interface";
import { classList, getUserColour } from "../../../../utils/utils";
import { dateToTime, messageTimestamp, messageTimestampFull } from "../../../../utils/datetime";
import { getMembersRead, tryGetUser } from "../../../../utils/matrix-client";
import { mdiCheckAll, mdiDotsHorizontal, mdiEmoticonOutline, mdiReply, mdiXml } from "@mdi/js";
import MessageContent from "./MessageTypes";
import Icon from "@mdi/react";


export const Message = memo(({ event, timeline }) => {
    const [hover, setHover] = useState(false);
    const setUserPopup = useContext(userPopupCtx);

    const author = tryGetUser(event.getSender());
    if (!author) {return;}

    function userPopup(e) {
        setUserPopup({parent: e.target, user: author})
    }

    return (
        <div className={classList("message", {"message--hover": hover})}>
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
                <MessageContent event={event} timeline={timeline} />
            </div>
            <MessageButtons event={event} setHover={setHover} />
        </div>
    );
})

export const PartialMessage = memo(({ event, timeline }) => {
    const [hover, setHover] = useState(false);

    return (
        <div className={classList("message--partial", {"message--hover": hover})}>
            <div className="message--partial__offset">
                <Tooltip delay={0.5} dir="top" text={messageTimestampFull(event.getDate())}>
                    <span className="message-timestamp">{dateToTime(event.getDate())}</span>
                </Tooltip>
            </div>
            <div className="message__text">
                <MessageContent event={event} timeline={timeline} />
            </div>
            <MessageButtons event={event} setHover={setHover} />
        </div>
    )
})

function MessageButtons({ event, setHover }) {
    const setPopup = useContext(contextMenuCtx);

    return (
        <div className="message__buttons">
            <Button subClass="message__buttons__entry" path={mdiReply} size="100%" tipDir="top" tipText="Reply" />
            <Button subClass="message__buttons__entry" path={mdiEmoticonOutline} size="95%" tipDir="top" tipText="Add reaction" />
            <Button subClass="message__buttons__entry" path={mdiDotsHorizontal} size="100%" tipDir="top" tipText="More"
                clickFunc={(e) => {
                    setPopup(
                        <MoreOptions event={event} parent={e.target.closest(".message__buttons__entry")} setHover={setHover} />
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
            return (<>
                {
                    getMembersRead(event).map((member) => {
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
        title: "Event Source",
        label: "View source",
        modalClass: "message__popup",
        render: ({ event }) => {
            const eventJSON = JSON.stringify(event.toJSON(), null, 4);
            return (<>
               <TextCopy text={event.getId()}>
                    <b>Event ID:</b> {event.getId()}
                </TextCopy>
                <TextCopy text={event.getRoomId()}>
                    <b>Room ID:</b> {event.getRoomId()}
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

        modal = (
            <Modal title={title} hide={hide} modalClass={modalClass} bodyClass={bodyClass}>
                {render({event, setUserPopup})}
            </Modal>
        );
    }

    return (
        <ContextMenu parent={parent} x="left" y="align-top">
            {
                Object.keys(messageOptions).map((key) => {
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
