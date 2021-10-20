import "./eventTypes.scss";
import { useContext } from "react";

import { userPopupCtx } from "../../../../components/user";
import { Tooltip } from "../../../../components/popups";
import MessageContent, { EditMarker, MessageText } from "./MessageContent";
import { EventWrapper } from "./Event";

import { messageTimestamp, messageTimestampFull } from "../../../../utils/datetime";
import { getMember, tryGetUser } from "../../../../utils/matrix-client";
import { getUserColour } from "../../../../utils/utils";

import { mdiAccountCancel, mdiAccountPlus, mdiAccountRemove, mdiAccountMinus, mdiPencil, mdiImage, mdiTextBox, mdiPin, mdiShield } from "@mdi/js";
import Icon from "@mdi/react";


export function Message({ event }) {
    const setUserPopup = useContext(userPopupCtx);

    const author = tryGetUser(event.getSender());
    if (!author) {return;}

    function userPopup(e) {
        setUserPopup({parent: e.target, user: author})
    }

    return (
        <EventWrapper event={event}>
            <div className="message__info">
                <span className="message__info__author data__user-popup" style={{color: getUserColour(author.userId)}} onClick={userPopup}>
                    {getMember(event.getSender(), event.getRoomId()).name}
                </span>

                <Tooltip delay={0.5} dir="top" text={messageTimestampFull(event.getDate())}>
                    <span className="event__timestamp">{messageTimestamp(event.getDate())}</span>
                </Tooltip>
            </div>
            <MessageContent event={event} />
        </EventWrapper>
    );
}

export function PartialMessage({ event }) {
    return (
        <EventWrapper event={event} partial>
            <MessageContent event={event} />
        </EventWrapper>
    )
}

export function EmoteMsg({ event, partial }) {
    const setUserPopup = useContext(userPopupCtx);

    const author = tryGetUser(event.getSender());
    if (!author) {return;}
    function userPopup(e) {
        setUserPopup({parent: e.target, user: author})
    }

    return (
        <EventWrapper event={event} partial={partial} compact>
            <div className="message__content message--emote__content">
                &#x2217;&nbsp;
                <span className="message__author data__user-popup" onClick={userPopup}>
                    {getMember(event.getSender(), event.getRoomId()).name}
                </span>
                {" "}
                <MessageText eventContent={event.getContent()} />
                <EditMarker event={event} />
            </div>
        </EventWrapper>
    )
}

export function IconEvent({ event, partial, userId, icon, text }) {
    const setUserPopup = useContext(userPopupCtx);
    const user = tryGetUser(userId);
    function userPopup(e) {
        setUserPopup({parent: e.target, user})
    }
    
    return (
        <EventWrapper event={event} partial={partial} compact>
            <div className="event--compact-event">
                <Icon path={icon} color="var(--text-greyed)" size="1em" className="event--compact-event__icon" />
                <span className="event--compact-event__user data__user-popup" onClick={userPopup}>
                    {getMember(userId, event.getRoomId()).name}
                </span>
                {text}
            </div>
        </EventWrapper>
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
        <IconEvent event={event} partial={partial} userId={userId} icon={icon} text={" " + membershipText} />
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
        default: 
            break;
    }

    if (!userId || !what) {return null};
    return (
        <IconEvent event={event} partial={partial} userId={userId} icon={icon} text={" changed the room " + what} />
    )
}

export function PinEvent({ event, partial }) {
    const userId = event.getSender();

    if (!userId) {return null};
    return (
        <IconEvent event={event} partial={partial} userId={userId} icon={mdiPin} text="changed the room pins" />
    )
}