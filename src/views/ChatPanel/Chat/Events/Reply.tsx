import "./Reply.scss";
import { useEffect, useState } from "react";
import { EventType, MsgType } from "matrix-js-sdk/lib/@types/event";

import { MessageText } from "./MessageContent";

import { getEventById, getMember } from "../../../../utils/matrix-client";
import { getUserColour } from "../../../../utils/utils";

import Icon from "@mdi/react";

import type { MatrixEvent } from "matrix-js-sdk";

const mdiArrowDownLeft = "M20 4V6H13.5C11 6 9 8 9 10.5V16.17L12.09 13.09L13.5 14.5L8 20L2.5 14.5L3.91 13.08L7 16.17V10.5C7 6.91 9.91 4 13.5 4H20Z";


type ReplyProps = {
    roomId: string,
    eventId: string
}

export default function Reply({ roomId, eventId }: ReplyProps) {
    const [event, setEvent] = useState(null as MatrixEvent);
    const [status, setStatus] = useState("Loading reply...");

    // Load event object
    useEffect(() => {
        getEventById(roomId, eventId).then((event) => {
            if (event) {
                setEvent(event);
            }
            else {
                setStatus("Couldn't load reply");
            }
        }).catch(() => {
            setStatus("Couldn't load reply");
        });
    }, [roomId, eventId]);


    const member = event && getMember(roomId, event.getSender());
    const colour = member ? getUserColour(member.userId) : "var(--text-greyed)";

    return (
        <div className="event__reply">
            { event ? 
            <>
                <Icon className="event__reply__icon" path={mdiArrowDownLeft} size="1em" color={colour} />
                <span className="event__reply__username" style={{color: colour}}>
                    {member.name}
                </span>
                <ReplyBody event={event} />
            </>
            :
            <span className="event__reply__loading">{status}</span>
            }
        </div>
    )
}

type ReplyBodyProps = {event: MatrixEvent}
function ReplyBody({event}: ReplyBodyProps) {
    const msgType = event.getContent().msgtype;

    if (event.getType() !== EventType.RoomMessage) {return null}

    let content = null;
    switch (msgType) {
        case MsgType.Image:
            content = "sent an image.";
            break;
        case MsgType.Video:
            content = "sent a video.";
            break;
        case MsgType.Audio:
            content = "sent an audio file.";
            break;
        case MsgType.File:
            content = "sent a file.";
            break;
        case MsgType.Location:
            content = "sent a location.";
            break;
        case MsgType.Text:
        case MsgType.Emote:
        case MsgType.Notice:
            content = (
                <MessageText event={event} />
            );
            break;
        default:
            break;
    }

    return (
        <div className="event__reply__content">
            {content}
        </div>
    );
}
