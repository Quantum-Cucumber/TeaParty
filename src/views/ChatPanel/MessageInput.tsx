import "./MessageInput.scss";
import React, { useEffect, useState } from "react";

import { classList } from "../../utils/utils";
import { sendMessage } from "../../utils/eventSending";

import Icon from "@mdi/react";
import { mdiSendCircle } from "@mdi/js";



type MessageInputProps = {
    roomId: string,
    disabled?: boolean,
}

export function MessageInput({ roomId, disabled = false }: MessageInputProps) {
    const [value, setValue] = useState("")

    useEffect(() => {
        setValue("");
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
        <div className={classList("message-input", {"message-input__disabled": disabled})}>
            <textarea className="message-input__editor" placeholder="Send a message..." rows={height}
                value={value} onChange={(e) => setValue(e.target.value)} onKeyPress={keyPress}
            />
            <div className={classList("message-input__button", {"message-input__button--disabled": !canSend})}>
                <div onClick={send}>
                    <Icon path={mdiSendCircle} color="var(--text)" size="2.2em" />
                </div>
            </div>
        </div>
    )
}