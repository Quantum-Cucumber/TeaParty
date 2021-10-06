import "./Message.scss";
import { Avatar } from "../../../../components/user";
import { Button, Overlay, Tooltip } from "../../../../components/interface";
import { getUserColour } from "../../../../utils/utils";
import { dateToTime, messageTimestamp, messageTimestampFull } from "../../../../utils/datetime";
import { tryGetUser } from "../../../../utils/matrix-client";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm"
import { mdiDownload, mdiOpenInNew } from "@mdi/js";


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
            content = null;
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


async function mediaToBlob(url) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } 
    catch {
        return url;
    }
}

function genThumbnailUrl(eventContent) {
    const width = 800;
    const height = 600;
    const info = eventContent.info;

    if (info.w > width || info.h > height) {
        return global.matrix.mxcUrlToHttp(eventContent.url, width, height, "scale");
    } else {
        return global.matrix.mxcUrlToHttp(eventContent.url)  // Return as is
    }
}

function MessageImage({ eventContent }) {
    const [showOverlay, setShowOverlay] = useState(false);
    const [source, setSource] = useState();
    const [thumbnail, setThumbnail] = useState();
    const [blobUrl, setBlobUrl] = useState();

    useEffect(() => {
        setSource(global.matrix.mxcUrlToHttp(eventContent.url));
        setThumbnail(genThumbnailUrl(eventContent));
    }, [eventContent])

    useEffect(() => {
        return () => {
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
            }
        }
    }, [blobUrl])

    function download(e) {
        if (!source || blobUrl) {return}
        e.preventDefault()

        mediaToBlob(source)
        .then((url) => {
            setBlobUrl(url);

            e.target.closest("a").click();
        })
    }

    return (<>
        <img src={thumbnail} alt={eventContent.body} className="message__content__image" onClick={() => {setShowOverlay(true)}} />
        <Overlay click={() => {setShowOverlay(false)}} render={showOverlay} fade={0.15}
                mountAnimation="image__zoom-in 0.15s ease-out" unmountAnimation="image__zoom-out 0.15s ease-in">
            <img src={source} alt={eventContent.body} className="image-popup" />
            <div className="image-popup__buttons">
                <a rel="noopener noreferrer" target="_blank" href={blobUrl || source} download={eventContent.body || "download"} onClick={download}>
                    <Button path={mdiDownload} size="1.5rem" tipDir="top" tipText="Download" />
                </a>
                <a rel="noopener noreferrer" target="_blank" href={source}>
                    <Button path={mdiOpenInNew} size="1.5rem" tipDir="top" tipText="Open Original" />
                </a>
            </div>
        </Overlay>
    </>)
}
