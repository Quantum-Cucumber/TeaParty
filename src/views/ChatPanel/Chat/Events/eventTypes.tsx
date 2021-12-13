import "./eventTypes.scss";
import React, { useContext } from "react";
import { EventType } from "matrix-js-sdk/lib/@types/event";

import { UserPopup } from "../../../../components/user";
import { popupCtx, Tooltip } from "../../../../components/popups";
import MessageContent, { EditMarker, MessageText } from "./MessageContent";
import { EventWrapper } from "./Event";

import { messageTimestamp, messageTimestampFull } from "../../../../utils/datetime";
import { getMember, tryGetUser } from "../../../../utils/matrix-client";
import { classList, getUserColour } from "../../../../utils/utils";

import Icon from "@mdi/react";
import { mdiAccountCancel, mdiAccountPlus, mdiAccountRemove, mdiAccountMinus, mdiPencil,
         mdiImage, mdiTextBox, mdiPin, mdiShield, mdiAsterisk, mdiUpdate, mdiPinOff } from "@mdi/js";

import type { MatrixEvent } from "matrix-js-sdk";


export function Message({ event, partial, children }: {event: MatrixEvent, partial: boolean, children: React.ReactNode}) {
    const setPopup = useContext(popupCtx);

    const author = tryGetUser(event.getSender());
    if (!author) {return;}

    function userPopup(e: React.MouseEvent) {
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


type IconEventProps = {
    event: MatrixEvent, 
    partial: Boolean,
    userId: string,
    icon: string,
    text: React.ReactNode,
    iconClass?: string,
}
type SpecificIconEventProps = {
    event: MatrixEvent,
    partial: boolean,
}

export function IconEvent({ event, partial, userId, icon, text, iconClass }: IconEventProps) {
    const setPopup = useContext(popupCtx);
    const user = tryGetUser(userId);
    function userPopup(e: React.MouseEvent) {
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

export function EmoteMsg({ event, partial }: SpecificIconEventProps) {
    return (
        <IconEvent event={event} partial={partial} userId={event.getSender()} icon={mdiAsterisk} iconClass="message--emote__icon" text={
            <div className="message__content message--emote__content">
                <MessageText event={event} />
                <EditMarker event={event} />
            </div>
        } />
    )
}

export function MembershipEvent({ event, partial }: SpecificIconEventProps) {
    const content = event.getContent();
    const membership = content.membership;
    const userId = event.getStateKey();

    let icon: string;
    let membershipText: string;
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

export function RoomEditEvent({ event, partial }: SpecificIconEventProps) {
    const type = event.getType();
    const userId = event.getSender();
    const content = event.getContent();

    let icon: string;
    let property: string;  // The property that was edited
    switch (type) {
        case EventType.RoomName:
            icon = mdiPencil;
            property = "name to: " + content.name;
            break;
        case EventType.RoomAvatar:
            icon = mdiImage;
            property = "icon";
            break;
        case EventType.RoomTopic:
            icon = mdiTextBox;
            property = "topic to: " + content.topic;
            break;
        case EventType.RoomServerAcl:
            icon = mdiShield;
            property = "ACL";
            break;
        case EventType.RoomTombstone:
            icon = mdiUpdate;
            property = "version: " + content.body;
            break;
        default: 
            break;
    }

    if (!userId || !property) {return null};
    return (
        <IconEvent event={event} partial={partial} userId={userId} icon={icon} text={"changed the room " + property} />
    )
}

export function PinEvent({ event, partial }: SpecificIconEventProps) {
    const userId = event.getSender();

    // Calculate if an event has been pinned or unpinned
    const currentPins: string[] = event.getContent().pinned ?? [];
    const oldPins: string[] = event.getPrevContent()?.pinned ?? [];

    let icon: string;
    let text: string;
    // Strictly speaking, events could be added and removed and the length isn't enough to determine that, but hopefully clients don't do that
    // Could be improved
    if (currentPins.length > oldPins.length) {
        icon = mdiPin;
        text = "pinned an event";
    }
    else if (oldPins.length > currentPins.length) {
        icon = mdiPinOff;
        text = "unpinned an event";
    }
    else {  // Equal length, see above comments
        icon = mdiPin;
        text = "changed this room's pins"
    }

    if (!userId) {return null};
    return (
        <IconEvent event={event} partial={partial} userId={userId} icon={icon} text={text} />
    )
}

export function StickerEvent({event, partial}: SpecificIconEventProps) {
    const eventContent = event.getContent();
    const url: string = global.matrix.mxcUrlToHttp(eventContent.url);

    return (
        <Message event={event} partial={partial}>
            <Tooltip text={eventContent.body} dir="right" delay={0.15}>
                <img alt={eventContent.body} src={url} className="event__sticker" draggable="false" />
            </Tooltip>
        </Message>
    );
}
