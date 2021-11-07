import "./Reply.scss";

import { getMember } from "../../../../utils/matrix-client";
import { getUserColour } from "../../../../utils/utils";

import Icon from "@mdi/react";

import type { MatrixEvent, Room } from "matrix-js-sdk";
import { MessageText } from "./MessageContent";

const mdiArrowDownLeft = "M20 4V6H13.5C11 6 9 8 9 10.5V16.17L12.09 13.09L13.5 14.5L8 20L2.5 14.5L3.91 13.08L7 16.17V10.5C7 6.91 9.91 4 13.5 4H20Z";


type ReplyProps = {
    roomId: string,
    eventId: string
}

export default function Reply({ roomId, eventId }: ReplyProps) {
    const room: Room = global.matrix.getRoom(roomId);
    const event = room!.findEventById(eventId);

    const member = getMember(event?.getSender(), roomId);
    const colour = member?.userId ? getUserColour(member.userId) : "var(--text-greyed)";

    return (
        <div className="event__reply">
            <Icon className="event__reply__icon" path={mdiArrowDownLeft} size="1em" color={colour} />

            { event && <>
                <span className="event__reply__username" style={{color: colour}}>
                    {member.name}
                </span>
                <ReplyBody event={event} />
            </>}
        </div>
    )
}

type ReplyBodyProps = {event: MatrixEvent}
function ReplyBody({event}: ReplyBodyProps) {
    const msgType = event.getContent().msgtype;

    if (event.getType() !== "m.room.message") {return null};

    let content = null;
    switch (msgType) {
        case "m.image":
            content = "sent an image.";
            break;
        case "m.video":
            content = "sent a video.";
            break;
        case "m.audio":
            content = "sent an audio file.";
            break;
        case "m.file":
            content = "sent a file.";
            break;
        case "m.location":
            content = "sent a location.";
            break;
        case "m.text":
        case "m.emote":
        case "m.notice":
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
