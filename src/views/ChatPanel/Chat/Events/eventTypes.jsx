import "./eventTypes.scss";
import { useContext } from "react";

import { UserPopup } from "../../../../components/user";
import { popupCtx, Tooltip } from "../../../../components/popups";
import MessageContent, { EditMarker, MessageText } from "./MessageContent";
import { EventWrapper } from "./Event";

import { messageTimestamp, messageTimestampFull } from "../../../../utils/datetime";
import { getMember, tryGetUser } from "../../../../utils/matrix-client";
import { classList, getUserColour } from "../../../../utils/utils";

import { mdiAccountCancel, mdiAccountPlus, mdiAccountRemove, mdiAccountMinus, mdiPencil,
         mdiImage, mdiTextBox, mdiPin, mdiShield, mdiAsterisk, mdiUpdate } from "@mdi/js";
import Icon from "@mdi/react";


export function Message({ event, partial, children }) {
    const setPopup = useContext(popupCtx);

    const author = tryGetUser(event.getSender());
    if (!author) {return;}

    function userPopup(e) {
        setPopup(
            <UserPopup parent={e.target} user={author} room={event.getRoomId()} setPopup={setPopup} />
        )
    }

    return (
        <EventWrapper event={event} partial={partial}>
            {!partial &&
                <div className="message__info">
                    <span className="message__info__author data__user-popup" style={{color: getUserColour(author.userId)}} onClick={userPopup}>
                        {getMember(event.getRoomId(), event.getSender())?.name}
                    </span>

                    <Tooltip delay={0.5} dir="top" text={messageTimestampFull(event.getDate())}>
                        <span className="event__timestamp">{messageTimestamp(event.getDate())}</span>
                    </Tooltip>
                </div>
            }
            {children || <MessageContent event={event} />}
        </EventWrapper>
    );
}

export function IconEvent({ event, partial, userId, icon, text, iconClass }) {
    const setPopup = useContext(popupCtx);
    const user = tryGetUser(userId);
    function userPopup(e) {
        setPopup(
            <UserPopup parent={e.target} user={user} room={event.getRoomId()} setPopup={setPopup} />
        )
    }
    
    return (
        <EventWrapper event={event} partial={partial} compact>
            <div className="event--compact-event">
                <Tooltip text={messageTimestampFull(event.getDate())} dir="top" delay={0.5}>
                    <Icon path={icon} color="var(--text-greyed)" size="1em" className={classList("event--compact-event__icon", iconClass)} />
                </Tooltip>
                <span className="event--compact-event__user data__user-popup" onClick={userPopup}>
                    {getMember(event.getRoomId(), userId)?.name}
                </span>
                {" "}{text}
            </div>
        </EventWrapper>
    )
}

export function EmoteMsg({ event, partial }) {
    return (
        <IconEvent event={event} partial={partial} userId={event.getSender()} icon={mdiAsterisk} iconClass="message--emote__icon" text={
            <div className="message__content message--emote__content">
                <MessageText event={event} />
                <EditMarker event={event} />
            </div>
        } />
    )
}

export function MembershipEvent({ event, partial }) {
    const content = event.getContent();
    const membership = content.membership;
    const userId = event.getStateKey();

    let icon;
    let membershipText;
    switch (membership) {
        case "join":
            icon = mdiAccountPlus;
            membershipText = "joined the room";
            break;
        case "ban":
            icon = mdiAccountCancel;
            membershipText = "was banned from the room";
            break;
        case "leave":
            if (userId === event.getSender()) {  // User left
                icon = mdiAccountMinus;
                membershipText = "left the room";
            } else {  // User kicked
                icon = mdiAccountRemove;
                membershipText = "was kicked";
            }
            break;
        default: 
            break;
    }

    if (!userId || !membershipText) {return null};
    return (
        <IconEvent event={event} partial={partial} userId={userId} icon={icon} text={membershipText} />
    )
}

export function RoomEditEvent({ event, partial }) {
    const type = event.getType();
    const userId = event.getSender();
    const content = event.getContent();

    let icon;
    let what;  // The property that was edited
    switch (type) {
        case "m.room.name":
            icon = mdiPencil;
            what = "name to: " + content.name;
            break;
        case "m.room.avatar":
            icon = mdiImage;
            what = "icon";
            break;
        case "m.room.topic":
            icon = mdiTextBox;
            what = "topic to: " + content.topic;
            break;
        case "m.room.server_acl":
            icon = mdiShield;
            what = "ACL";
            break;
        case "m.room.tombstone":
            icon = mdiUpdate;
            what = "version: " + content.body;
            break;
        default: 
            break;
    }

    if (!userId || !what) {return null};
    return (
        <IconEvent event={event} partial={partial} userId={userId} icon={icon} text={"changed the room " + what} />
    )
}

export function PinEvent({ event, partial }) {
    const userId = event.getSender();

    if (!userId) {return null};
    return (
        <IconEvent event={event} partial={partial} userId={userId} icon={mdiPin} text="changed the room pins" />
    )
}

export function StickerEvent({event, partial}) {
    const eventContent = event.getContent();
    const url = global.matrix.mxcUrlToHttp(eventContent.url)

    return (
        <Message event={event} partial={partial}>
            <Tooltip text={eventContent.body} dir="right" delay={0.15}>
                <img alt={eventContent.body} src={url} className="event__sticker" draggable="false" />
            </Tooltip>
        </Message>
    );
}
