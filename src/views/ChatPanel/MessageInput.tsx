import "./MessageInput.scss";
import React, { useContext, useEffect, useState } from "react";

import { classList } from "../../utils/utils";
import { sendMessage } from "../../utils/eventSending";

import { popupCtx } from "../../components/popups";
import EmojiPicker from "../../components/EmojiPicker";

import Icon from "@mdi/react";
import { mdiEmoticon, mdiSendCircle } from "@mdi/js";



type MessageInputProps = {
    roomId: string,
}

export function MessageInput({ roomId }: MessageInputProps) {
    const [value, setValue] = useState("");
    const [disabled, setDisabled] = useState(false);
    const setPopup = useContext(popupCtx);

    useEffect(() => {
        setValue("");

        const maySendMessage = global.matrix.getRoom(roomId)?.maySendMessage();
        console.log(maySendMessage)
        setDisabled(!maySendMessage);
    }, [roomId])

    function send() {
        if (value) {
            setValue("");
            sendMessage(roomId, value);
        }
    }

    function keyPress(event: React.KeyboardEvent) {
        // Newline when shift-enter is pressed, otherwise send the message
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            send();
        }
    }

    const height = Math.min(value.split("\n").length, 4);
    const canSend = !!value;

    return (
        <div className={classList("message-input", {"message-input--disabled": disabled})}>
            <textarea className="message-input__editor" placeholder="Send a message..." rows={height}
                value={value} onChange={(e) => setValue(e.target.value)} onKeyPress={keyPress}
            />
            <div className={classList("message-input__button")}>
                <div onClick={(e) => {
                    setPopup(
                        <EmojiPicker parent={e.target} mouseEvent={e} x="align-right" y="top" padding={5}
                            onSelect={(emoji) => setValue(current => `${current}${emoji} `)}
                        />
                    )
                }}>
                    <Icon path={mdiEmoticon} color="var(--text)" size="2.2em" />
                </div>
            </div>
            <div className={classList("message-input__button", {"message-input__button--disabled": !canSend})}>
                <div onClick={send}>
                    <Icon path={mdiSendCircle} color="var(--text)" size="2.2em" />
                </div>
            </div>
        </div>
    )
}