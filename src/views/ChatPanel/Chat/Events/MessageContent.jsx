import { useState, useEffect, useContext } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm"
import { ImagePopup, Tooltip } from "../../../../components/interface";
import { messageTimestampFull } from "../../../../utils/datetime";
import { mdiChatRemove } from "@mdi/js";
import Icon from "@mdi/react";
import { tryGetUser } from "../../../../utils/matrix-client";
import { userPopupCtx } from "../../../../components/user";

export default function MessageContent({ event }) {
    const eventContent = event.getContent();

    let content;
    switch (eventContent.msgtype) {
        case "m.text":
        case "org.matrix.custom.html":
            content = (
                <MessageText eventContent={eventContent} />
            );
            break;
        case "m.image": 
            content = (
                <MessageImage eventContent={eventContent} />
            )
            break;
        default:
            content = (
                <UnknownMessageType eventContent={eventContent} />
            )
    }

    if (event.isRedacted()) {
        content = (
            <RedactedMessage event={event} />
        )
    }

    return (
        <div className="message__content">
            {content}
            <EditMarker event={event} />
        </div>
    );
}

export function EditMarker({ event }) {
    return (<>
        {event.replacingEventId() && 
            <Tooltip delay={0.5} dir="top" text={messageTimestampFull(event.replacingEventDate())}>
                <div className="event__body__edited">(edited)</div>
            </Tooltip>
        }
    </>)
}

export function MessageText({ eventContent }) {
    const content = eventContent.body;
    const useMarkdown = eventContent.format === "org.matrix.custom.html";

    return (<>
        {useMarkdown ? 
            <ReactMarkdown remarkPlugins={[[remarkGfm, {singleTilde: false}]]} linkTarget="_blank">{content}</ReactMarkdown> :
            <p>{content}</p>
        }
    </>)
}

function UnknownMessageType({ eventContent }) {
    const content = eventContent.body;

    return (
        <Tooltip text={eventContent.msgtype} dir="top" x="mouse" delay={0.5} >
            <p className="message__content--unknown">
                {content || "** Unknown message type **"}
            </p>
        </Tooltip>
    )
}

function genThumbnailUrl(eventContent) {
    /* Load a smaller version of the given file */
    const width = 320;
    const height = 240;
    const info = eventContent.info;
    const url = eventContent.url;

    if (info.w > width || info.h > height) {
        return global.matrix.mxcUrlToHttp(url, width, height, "scale") || url;
    } else {
        return global.matrix.mxcUrlToHttp(eventContent.url) || url;  // Return as is
    }
}

function MessageImage({ eventContent }) {
    const [showOverlay, setShowOverlay] = useState(false);
    const [thumbnail, setThumbnail] = useState();

    useEffect(() => {
        setThumbnail(genThumbnailUrl(eventContent));
    }, [eventContent])

    const sourceUrl = global.matrix.mxcUrlToHttp(eventContent.url) || eventContent.url;

    return (<>
        <img src={thumbnail} alt={eventContent.body} className="message__content__image" onClick={() => {setShowOverlay(true)}} />
        <ImagePopup sourceUrl={sourceUrl} setRender={setShowOverlay} render={showOverlay} name={eventContent.body}/>
    </>)
}

function RedactedMessage({ event }) {
    const setUserPopup = useContext(userPopupCtx);

    const redaction = event.getRedactionEvent();
    const reason = redaction?.content?.reason;
    const redactUser = tryGetUser(redaction?.sender);

    function userPopup(e) {
        setUserPopup({parent: e.target, user: redactUser})
    }

    return (
        <Tooltip text={"Reason: " + (reason ? reason : "None given")} dir="top" x="mouse" delay={0.8}>
            <div className="event--compact-event">
                <Icon path={mdiChatRemove} color="var(--text-greyed)" size="1em" className=".event--compact-event__icon" />
                &nbsp;Redacted by
                {" "}
                <span className="event--compact-event__user data__user-popup" onClick={userPopup}>
                    {redactUser.displayName}
                </span>
            </div>
        </Tooltip>
    )
}