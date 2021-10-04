import "./Message.scss";
import { Avatar } from "../../../../components/user";
import { Tooltip } from "../../../../components/interface";
import { getUserColour } from "../../../../utils/utils";
import { dateToTime, messageTimestamp, messageTimestampFull } from "../../../../utils/datetime";
import { tryGetUser } from "../../../../utils/matrix-client";
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
    const content = edited ? edited.getContent()["m.new_content"].body : event.getContent().body;
    const useMarkdown = event.getContent().format === "org.matrix.custom.html";

    return (
        <div className="message__content">
            {useMarkdown ? 
                <ReactMarkdown remarkPlugins={[remarkGfm]} linkTarget="_blank">{content}</ReactMarkdown> :
                <p>{content}</p>
            }
            {edited && 
                <Tooltip delay={0.5} dir="top" text={messageTimestampFull(edited.getDate())}>
                    <div className="message__content__edited">(edited)</div>
                </Tooltip>
            }
        </div>
    );
}
