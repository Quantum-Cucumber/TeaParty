import "./Message.scss";
import { useContext, memo, useState } from "react";
import { Avatar } from "../../../../components/user";
import { Button, Tooltip, contextMenuCtx, ContextMenu, Option, Modal } from "../../../../components/interface";
import { getUserColour } from "../../../../utils/utils";
import { dateToTime, messageTimestamp, messageTimestampFull } from "../../../../utils/datetime";
import { tryGetUser } from "../../../../utils/matrix-client";
import { mdiDotsHorizontal, mdiEmoticonOutline, mdiReply } from "@mdi/js";
import MessageContent from "./MessageTypes";


export const Message = memo(({ event, timeline, setUserPopup }) => {
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
                <MessageContent event={event} timeline={timeline} />
            </div>
            <MessageButtons event={event} />
        </div>
    );
})

export const PartialMessage = memo(({ event, timeline }) => {
    return (
        <div className="message--partial">
            <div className="message--partial__offset">
                <Tooltip delay={0.5} dir="top" text={messageTimestampFull(event.getDate())}>
                    <span className="message-timestamp">{dateToTime(event.getDate())}</span>
                </Tooltip>
            </div>
            <div className="message__text">
                <MessageContent event={event} timeline={timeline} />
            </div>
            <MessageButtons event={event} />
        </div>
    )
})

function MessageButtons({ event }) {
    const setPopup = useContext(contextMenuCtx);

    return (
        <div className="message__buttons">
            <Button subClass="message__buttons__entry" path={mdiReply} size="100%" tipDir="top" tipText="Reply" />
            <Button subClass="message__buttons__entry" path={mdiEmoticonOutline} size="95%" tipDir="top" tipText="Add reaction" />
            <Button subClass="message__buttons__entry" path={mdiDotsHorizontal} size="100%" tipDir="top" tipText="More"
                clickFunc={(e) => {
                    setPopup(
                        <MoreOptions event={event} parent={e.target.closest(".message__buttons__entry")} />
                    );
                }}
            />
        </div>
    )
}

function MoreOptions({ parent, event }) {
    const [showSource, setShowSource] = useState(false);

    return (
        <ContextMenu parent={parent} x="left" y="align-top">
            <Option text="View source" select={() => {setShowSource(true)}} compact/>

            {showSource &&
                <Modal title="Event Source" hide={() => {setShowSource(false)}} modalClass="message__popup">
                    <div><b>Event ID:</b> {event.getId()}</div>
                    <div><b>Room ID:</b> {event.getRoomId()}</div>
                    <br />
                    <code className="codeblock scroll--hover">
                        {JSON.stringify(event.toJSON(), null, 4)}
                    </code>
                </Modal>
            }
        </ContextMenu>
    )
}
