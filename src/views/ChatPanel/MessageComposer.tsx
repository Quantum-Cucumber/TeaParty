import "./MessageComposer.scss";
import React, { CSSProperties, useContext, useEffect, useRef, useState } from "react";

import { classList } from "../../utils/utils";
import { sendFile, sendImage, sendMessage } from "../../utils/eventSending";

import { popupCtx } from "../../components/popups";
import EmojiPicker from "../../components/EmojiPicker";

import Icon from "@mdi/react";
import { mdiCloseCircle, mdiEmoticon, mdiFile, mdiPlusCircle, mdiSendCircle } from "@mdi/js";
import { IconButton } from "../../components/elements";



type MessageInputProps = {
    roomId: string,
}

export default function MessageComposer({ roomId }: MessageInputProps) {
    const [value, setValue] = useState("");
    const [file, setFile] = useState<File>(null);
    const [uploadProgress, setUploadProgress] = useState<number>(null);
    const [disabled, setDisabled] = useState(false);

    const setPopup = useContext(popupCtx);
    const inputRef = useRef<HTMLTextAreaElement>();
    const fileRef = useRef<HTMLInputElement>();

    useEffect(() => {
        setValue("");
        setFile(null);
        setUploadProgress(null);

        const maySendMessage = global.matrix.getRoom(roomId)?.maySendMessage();
        console.log(maySendMessage)
        setDisabled(!maySendMessage);
    }, [roomId])


    function keyPress(event: React.KeyboardEvent) {
        // Newline when shift-enter is pressed, otherwise send the message
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            send();
        }
    }

    function updateUploadProgress(state: {loaded: number, total: number}) {
        const percent = Math.round( (state.loaded / state.total) * 100 );
        setUploadProgress(percent < 100 ? percent : null)
    }

    async function send() {
        const mxcUrl = file ? await global.matrix.uploadContent(file, {onlyContentUri: true, progressHandler: updateUploadProgress}) : null
        setValue("");
        setFile(null);

        if (value.trimEnd()) {
            await sendMessage(roomId, value.trimEnd());
        }
        if (mxcUrl) {

            switch (file.type.split("/")[0]) {
                case "image":
                    await sendImage(roomId, mxcUrl, file);
                    break;
                default:
                    await sendFile(roomId, mxcUrl, file);
                    break;
            }
        }
        inputRef.current.focus();
    }

    const height = Math.min(value.split("\n").length, 4);

    return (
        <div className={classList("message-composer", {"message-composer--disabled": disabled})}>
            { file &&
                <div className="message-composer__row message-composer__files">
                    <FilePreview file={file} setFile={setFile} />
                    { uploadProgress &&
                        <div className="message-composer__files__upload" style={{"--progress": `${uploadProgress}%`} as CSSProperties} />
                    }
                </div>
            }
            <div className="message-composer__row">
                <div className="message-composer__buttons">
                    <div className="message-composer__button" onClick={() => fileRef.current.click()}>
                        <Icon path={mdiPlusCircle} color="var(--text)" size="100%" />
                    </div>

                    <input style={{display: "none"}} type="file" ref={fileRef}
                        onChange={(e) => {
                            setFile(e.target.files[0]);
                            inputRef.current.focus();
                        }}
                    />
                </div>

                <textarea className="message-composer__editor" placeholder="Send a message..." rows={height}
                    value={value} onChange={(e) => setValue(e.target.value)} onKeyPress={keyPress} ref={inputRef}
                />

                <div className="message-composer__buttons">
                    <div className="message-composer__button" onClick={(e) => {
                        setPopup(
                            <EmojiPicker parent={e.currentTarget} mouseEvent={e} x="align-right" y="top" padding={5}
                                onSelect={(emoji) => {
                                    setValue(current => `${current}${emoji} `);
                                    inputRef.current.focus();
                                }}
                            />
                        )
                    }}>
                        <Icon path={mdiEmoticon} color="var(--text)" size="100%" />
                    </div>

                    <div className={classList("message-composer__button", {"message-composer__button--disabled": !value && !file})} onClick={send}>
                        <Icon path={mdiSendCircle} color="var(--text)" size="100%" />
                    </div>
                </div>
            </div>
        </div>
    )
}


type FilePreviewProps = {
    file: File,
    setFile: (file: File) => void,
}

function FilePreview({ file, setFile }: FilePreviewProps) {
    const [preview, setPreview] = useState<React.ReactNode>(null);


    useEffect(() => {
        const isImage = file.type.startsWith("image/");

        if (isImage) {
            const url = URL.createObjectURL(file);
            setPreview(
                <img className="message-composer__file__preview" src={url} alt={file.name} />
            )

            return () => {
                URL.revokeObjectURL(url);
            }
        }
        else {
            setPreview(
                <Icon className="message-composer__file__preview" path={mdiFile} size="6rem" color="var(--text-greyed)" />
            )
        }
    }, [file])

    return (
        <div className="message-composer__file">
            <IconButton path={mdiCloseCircle} size="1.5rem" subClass="message-composer__file__remove" clickFunc={() => setFile(null)} />
            {preview}
            <div className="message-composer__file__name">{file.name}</div>
        </div>
    )
}
