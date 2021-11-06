import "./MessageContent.scss";
import { useState, useEffect, useContext } from "react";

import { A, Button } from "../../../../components/elements";
import { ImagePopup, Tooltip, popupCtx } from "../../../../components/popups";
import { UserPopup } from "../../../../components/user";
import HtmlContent from "./HtmlContent";

import { messageTimestampFull } from "../../../../utils/datetime";
import { bytesToFriendly } from "../../../../utils/utils";
import { useDownloadUrl } from "../../../../utils/hooks";
import { tryGetUser } from "../../../../utils/matrix-client";

import { mdiChatRemove, mdiDownload, mdiFileDocumentOutline } from "@mdi/js";
import Icon from "@mdi/react";
import { FancyText } from "../../../../components/wrappers";

export default function MessageContent({ event }) {
    const eventContent = event.getContent();

    let content;
    switch (eventContent.msgtype) {
        case "m.text":
        case "org.matrix.custom.html":
            content = (
                <MessageText event={event} />
            );
            break;
        case "m.image": 
            content = (
                <MessageImage eventContent={eventContent} />
            )
            break;
        case "m.file":
            content = (
                <MessageFile eventContent={eventContent} />
            )
            break;
        case "m.notice":
            content = (
                <MessageNotice eventContent={eventContent} />
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

export function MessageText({ event }) {
    const useMarkdown = event.getContent().format === "org.matrix.custom.html";

    return useMarkdown ? 
            // Only process the html <a> tags as links
            <FancyText links={false}>
                <HtmlContent event={event} />
            </FancyText>
           :
            <FancyText>
                <p>{event.getContent().body}</p>
            </FancyText>
}

function MessageNotice({ eventContent }) {
    return (
        <p className="message__content--notice">
            {eventContent.body}
        </p>
    )
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

function RedactedMessage({ event }) {
    const setPopup = useContext(popupCtx);

    const redaction = event.getRedactionEvent();
    const reason = redaction?.content?.reason;
    const redactUser = tryGetUser(redaction?.sender);

    function userPopup(e) {
        setPopup(
            <UserPopup parent={e.target} user={redactUser} room={event.getRoomId()} setPopup={setPopup} />
        )
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

/* Media */
export function genThumbnailUrl(url, desiredWidth, desiredHeight) {
    /* Load a smaller version of the given file */
    const maxWidth = 320;
    const maxHeight = 240;

    const width = desiredWidth ? Math.min(desiredWidth, maxWidth) : maxWidth;
    const height = desiredWidth ? Math.min(desiredHeight, maxHeight) : maxHeight;

    return global.matrix.mxcUrlToHttp(url, width, height, "scale") || url;
}

function MessageImage({ eventContent }) {
    const [showOverlay, setShowOverlay] = useState(false);
    const [thumbnail, setThumbnail] = useState();

    useEffect(() => {
        setThumbnail(genThumbnailUrl(eventContent.url, eventContent.info.w, eventContent.info.h));
    }, [eventContent])

    const sourceUrl = global.matrix.mxcUrlToHttp(eventContent.url) || eventContent.url;

    return (<>
        <img src={thumbnail} alt={eventContent.body} className="message__content__image" onClick={() => {setShowOverlay(true)}} />
        <ImagePopup sourceUrl={sourceUrl} setRender={setShowOverlay} render={showOverlay} name={eventContent.body}/>
    </>)
}

function MessageFile({ eventContent }) {
    const url = global.matrix.mxcUrlToHttp(eventContent.url);
    const size = eventContent.info?.size;
    const name = eventContent.body;

    const [blobUrl, download] = useDownloadUrl(url);


    return (
        <div className="message__content__file">
            <Icon className="message__content__file__icon" path={mdiFileDocumentOutline} size="2.3rem" color="var(--text)" />
            <div className="message__content__file__text">
                <Tooltip text={name} dir="top" x="mouse" delay={0.5} >
                    <div className="message__content__file__text__name">{name}</div>
                </Tooltip>
                <div className="message__content__file__text__size">{bytesToFriendly(size)}</div>
            </div>
            <A href={blobUrl} download={name || "download"} onClick={download}>
                <Button subClass="message__content__file__download" path={mdiDownload} size="1.5rem" tipDir="top" tipText="Download" />
            </A>
        </div>
    );
}
