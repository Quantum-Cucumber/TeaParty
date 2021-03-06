import "./elements.scss";
import React, { useState, useReducer, useRef, useEffect, forwardRef } from "react";
import { EventType } from "matrix-js-sdk/lib/@types/event";

import { ContextMenu, Tooltip } from "./popups";
import { FancyText } from "./wrappers";

import { acronym, classList, getUserColour } from "../utils/utils";
import { isDirect } from "../utils/roomFilters";

import Icon from "@mdi/react";
import { mdiCheck, mdiChevronDown, mdiChevronRight, mdiLoading, mdiPencil } from "@mdi/js";

import type { MatrixEvent, Room } from "matrix-js-sdk";


type IconButtonProps = {
    path: string,
    clickFunc?: (ev?: React.MouseEvent<HTMLDivElement>) => void,
    subClass?: string | null,
    size?: string,
    tipDir?: "top" | "bottom" | "left" | "right",
    tipText?: string | null,
}

export function IconButton({ path, clickFunc, subClass=null, size="1em", tipDir="top", tipText=null }: IconButtonProps) {
    return (
        <div className={classList("icon-button", subClass)} onClick={clickFunc}>
            {tipText ?
                <Tooltip text={tipText} dir={tipDir}>
                    <Icon path={path} className="icon-button__icon" size={size} />
                </Tooltip> 
                :
                <Icon path={path} className="icon-button__icon" size={size} />
            }
        </div>
    );
}

export function Loading({ size }: {size: string}) {
    return (
        <Icon path={mdiLoading} color="var(--primary)" size={size} spin={1.2}/>
    );
}


type AvatarProps = {
    mxcUrl?: string,
    fallback: React.ReactNode,
    backgroundColor?: string,
}

export function Avatar({ mxcUrl, fallback, backgroundColor = null }: AvatarProps) {
    if (mxcUrl) {
        const httpUrl = global.matrix.mxcUrlToHttp(mxcUrl, 96, 96, "crop")
        return (
            <img className="avatar avatar--img" src={httpUrl} alt={typeof fallback === "string" ? fallback : "Avatar"} /> 
        )
    }
    else {
        return (
            <div className="avatar" style={{backgroundColor: backgroundColor, color: backgroundColor ? "var(--bg)" : null}}>
                {fallback}
            </div>
        )
    }
}


export function RoomIcon({ room }: {room: Room}) {
    const [iconUrl, setIconUrl] = useState(room.getMxcAvatarUrl());
    const directRoom = isDirect(room);

    // Bind listener for room avatar updates
    useEffect(() => {
        console.log("bind room icon", room.name)
        // When the room changes, update the icon
        setIconUrl(room.getMxcAvatarUrl());

        function stateUpdate(event: MatrixEvent) {
            if (event.getRoomId() === room.roomId && event.getType() === EventType.RoomAvatar) {
                setIconUrl(event.getContent().url);
            }
        }

        global.matrix.addListener("RoomState.events", stateUpdate);
        return () => {
            global.matrix.removeListener("RoomState.events", stateUpdate);   
        }
        
    }, [room])

    if (!iconUrl && directRoom) {
        const member = room.getAvatarFallbackMember();
        return (
            <Avatar mxcUrl={member.getMxcAvatarUrl()} fallback={acronym(member.name, 1)} backgroundColor={getUserColour(member.userId)} />
        )
    } else {
        return (
            <Avatar mxcUrl={iconUrl} fallback={acronym(room.name)} />
        )
    }
}


type OptionProps<T> = {
    text: string,
    k?: T,
    selected?: T,
    select?: (k?: T) => void,
    danger?: boolean,
    compact?: boolean,
    enabled?: boolean,
    icon?: JSX.Element,
    children?: JSX.Element,
    [key: string]: any,
}

export function Option<T>({ text, k = undefined, selected = undefined, select = () => {}, danger=false, compact=false, enabled=true, icon = null, children, ...props }: OptionProps<T>) {
    const className = classList("option",
                                {"option--selected": k !== undefined ? (selected === k) : false}, 
                                {"option--danger": danger},
                                {"option--compact": compact},
                                {"option--disabled": !enabled},
                               )

    return (
        <div className={className} onClick={enabled ? () => select(k) : null} {...props}>
            {icon}
            <div className="option__text">{text}</div>
            {children}
        </div>
    );
}

export function OptionIcon({ path, colour = "text" }: {path: string, colour?: string}) {
    return (
        <Icon path={path} size="1em" color={`var(--${colour})`} />
    )
}


type HoverOptionProps = {
    icon: JSX.Element,
    text: string,
    children: React.ReactNode,
}

export function HoverOption({ icon, text, children }: HoverOptionProps) {
    const [show, setShow] = useState(false);
    const anchor = useRef<HTMLDivElement>();

    return (
        <div className="option option--compact" onMouseOver={() => {setShow(true)}} onMouseLeave={() => {setShow(false)}} ref={anchor}>
            {icon}
            <div className="option__text">{text}</div>
            <Icon path={mdiChevronRight} size="1em" color="var(--text)" />

            { show && 
                <ContextMenu parent={anchor.current as HTMLElement} x="right" y="align-top" padding={0}>
                    {children}
                </ContextMenu>
            }
        </div>
    )
}


type OptionDropDownProps = {
    icon: React.ReactNode,
    text: string,
    indicator: JSX.Element,
    startOpen?: boolean,
    onToggle?: (open: boolean) => void,
    children: React.ReactNode,
    unread?: boolean,
    notifications?: number,
    [key: string]: any,
}

export function OptionDropDown({ icon, text, indicator, startOpen = false, onToggle = () => {}, children, ...props }: OptionDropDownProps) {
    const [open, toggleOpen] = useReducer((current) => !current, startOpen);

    useEffect(() => {
        onToggle(open);
    }, [open, onToggle])

    return (
        <div className="option--dropdown-wrapper">
            <div className={classList("option--dropdown", {"option--dropdown--open": open})} onClick={toggleOpen} {...props}>
                <Icon path={mdiChevronDown} color={open ? "var(--text)" : "var(--text-greyed)"} size="1.5rem" className="option--dropdown__chevron" rotate={open ? 0 : -90} />
                { icon }
                <div className="option--dropdown__text">{text}</div>
                { indicator }
            </div>
            { open &&
                <div className="option--dropdown__content">
                    {children}
                </div>
            }
        </div>
    )
}

export function A(props: React.HTMLProps<HTMLAnchorElement>) {
    const {children, ...otherProps} = props;
    return (
        <a target="_blank" rel="noopener noreferrer" {...otherProps}>
            {children}
        </a>
    )
}


type ButtonProps = {
    plain?: boolean,
    save?: boolean,
    danger?: boolean,
    link?: boolean,
    disabled?: boolean,
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({plain = false, save = false, danger = false, link = false, disabled = false, ...props}: ButtonProps) {
    const variation = classList(
        {"button--plain": plain},
        {"button--save": save},
        {"button--danger": danger},
        {"button--link": link},
        {"button--disabled": disabled},
    )

    return (
        <button className={variation} {...props} />
    )
}

type AsyncButtonProps = {
    activeText: string,
    errorText?: string,
    successText?: string,
    func: () => Promise<void>,
}

enum asyncButtonState {
    active,
    loading,
    error,
    success,
}

export function AsyncButton({activeText, errorText = "Error", successText, func, ...buttonProps}: AsyncButtonProps & React.ComponentProps<typeof Button>) {
    const [state, setState] = useState<asyncButtonState>(asyncButtonState.active);

    async function click() {
        setState(asyncButtonState.loading);
        try {
            await func();
            setState(asyncButtonState.success);
        }
        catch {
            setState(asyncButtonState.error);
        }
    }


    let element: JSX.Element;
    switch (state) {
        case asyncButtonState.active:
            element = (
                <Button save {...buttonProps} onClick={click}>{activeText}</Button>
            );
            break;
        case asyncButtonState.loading:
            element = (
                <Loading size="1.5em" />
            );
            break;
        case asyncButtonState.error:
            element = <>{errorText}</>
            break;
        case asyncButtonState.success:
            element = <>{successText}</>;
            break;
    }

    return element;
}


type ManualTextBoxProps = {
    placeholder: string,
    valid?: boolean,
    multiline?: boolean,
    value: string
    setValue: React.Dispatch<React.SetStateAction<string>>,
}
type TextInput = HTMLInputElement & HTMLTextAreaElement;


/* A simple styled, controlled text box that defers validation and submission to the parent */
export const ManualTextBox = forwardRef(
    function ManualTextBox({ placeholder, valid = true, multiline = false, value, setValue }: ManualTextBoxProps, ref: React.ForwardedRef<TextInput>) {
        return ( multiline ?
            <textarea className={classList("textbox__input", {"textbox__input--error": !valid})} placeholder={placeholder} value={value} rows={4} onChange={(e) => setValue(e.target.value)} ref={ref} />
        :
            <input className={classList("textbox__input", {"textbox__input--error": !valid})} type="text" placeholder={placeholder} value={value} onChange={(e) => setValue(e.target.value)} ref={ref} />
        )
    }
);


type TextBoxProps = {
    initialValue?: string,
    placeholder: string,
    multiline?: boolean,
    focus?: boolean,
    saveFunc?: (value: string) => void,
    validation?: (value: string) => boolean,
}

/* Text input with a save button */
export function TextBox({ initialValue = "", placeholder, multiline = false, focus = false, saveFunc, validation = () => true }: TextBoxProps) {
    const [value, setValue] = useState(initialValue);
    const inputRef = useRef<TextInput>();
    const [valid, setValid] = useState(true);

    // Focus on render if flag is set
    useEffect(() => {
        if(inputRef.current && focus) {
            inputRef.current.focus()
        }
    }, [focus])

    function save() {
        if (validation(value.trim())) {
            saveFunc(value.trim());
        }
        else {
            setValid(false);
        }
    }

    // Clear invalid flag when text edited
    useEffect(() => {
        setValid(true);
    }, [value])

    return (
        <div className="textbox">
            <form onSubmit={(e) => {e.preventDefault(); save()}}>
                <ManualTextBox placeholder={placeholder} valid={valid} multiline={multiline} value={value} setValue={setValue} ref={inputRef} />
            </form>
            <IconButton path={mdiCheck} clickFunc={save} subClass="textbox__button" tipText="Save" tipDir="right" />
        </div>
    )
}


type EditTextProps = {
    label: string,
    text: string,
    subClass?: string,
    saveFunc?: (value: string) => void;
    multiline?: boolean,
    links?: boolean;
    canEdit?: boolean,
    validation?: (value: string) => boolean,
}

/* Text with a pencil icon to indicate it can be edited, transforms into a <TextBox> */
export function EditableText({ label, text, subClass = null, saveFunc = () => {}, multiline = false, links = false, canEdit = true, validation }: EditTextProps) {
    const [editing, setEditing] = useState(false);

    function save(value: string) {
        setEditing(false);
        if (text !== value) {
            saveFunc(value); 
        }
    }

    return (
        <div className={classList("text-edit", subClass)}>
            { editing && canEdit ?
                <TextBox placeholder={label} initialValue={text} multiline={multiline} saveFunc={save} validation={validation} focus />
            :
                <>
                    <FancyText className={classList("text-edit__current", {"text-edit__current--multiline": multiline}, {"text-edit__current--placeholder": !text})} links={links}>
                        {text || label}
                    </FancyText>
                    { canEdit &&
                        <IconButton path={mdiPencil} clickFunc={() => {setEditing(true)}} subClass="text-edit__button" tipText="Edit" tipDir="right" />
                    }
                </>
            }
        </div>
    )
}
