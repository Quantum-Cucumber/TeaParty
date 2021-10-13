import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm"
import { ImagePopup, Tooltip } from "../../../../components/interface";
import { messageTimestampFull } from "../../../../utils/datetime";

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
            <RedactedMessage />
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
                <div className="message__content__edited">(edited)</div>
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

function RedactedMessage() {
    return (
        <div className="message__content--redacted">
            Redacted
        </div>
    )
}