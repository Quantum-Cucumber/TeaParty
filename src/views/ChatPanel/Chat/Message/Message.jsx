import "./Message.scss";
import { Avatar } from "../../../../components/user";
import { ImagePopup, Tooltip } from "../../../../components/interface";
import { getUserColour } from "../../../../utils/utils";
import { dateToTime, messageTimestamp, messageTimestampFull } from "../../../../utils/datetime";
import { tryGetUser } from "../../../../utils/matrix-client";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm"


export function Message({ event, timeline, setUserPopup }) {
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
        </div>
    );
}

export function PartialMessage({ event, timeline }) {
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
        </div>
    )
}

function MessageContent({ event, timeline }) {
    const edited = timeline.current.edits.get(event.getId());
    const eventContent = event.getContent();

    let content;
    switch (eventContent.msgtype) {
        case "m.text":
            content = (
                <MessageText eventContent={eventContent} edited={edited} />
            );
            break;
        case "org.matrix.custom.html":
            content = (
                <MessageText eventContent={eventContent} edited={edited}/>
            );
            break;
        case "m.image": 
            content = (
                <MessageImage eventContent={eventContent} />
            )
            break;
        default:
            content = (
                <UnknownMessageType eventContent={eventContent} edited={edited} />
            )
    }

    return (
        <div className="message__content">
            {content}
            {edited && 
                <Tooltip delay={0.5} dir="top" text={messageTimestampFull(edited.getDate())}>
                    <div className="message__content__edited">(edited)</div>
                </Tooltip>
            }
        </div>
    );
}

function MessageText({ eventContent, edited }) {
    const content = edited ? edited.getContent()["m.new_content"].body : eventContent.body;
    const useMarkdown = eventContent.format === "org.matrix.custom.html";

    return (<>
        {useMarkdown ? 
            <ReactMarkdown remarkPlugins={[[remarkGfm, {singleTilde: false}]]} linkTarget="_blank">{content}</ReactMarkdown> :
            <p>{content}</p>
        }
    </>)
}

function UnknownMessageType({ eventContent, edited }) {
    const content = edited ? edited.getContent()["m.new_content"].body : eventContent.body;

    return (
        <p className="message__content--unknown">
            {content || "** Unknown message type **"}
        </p>
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
