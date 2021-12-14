import "./elements.scss";
import { useState, useReducer, useRef, useEffect } from "react";
import { EventType } from "matrix-js-sdk/lib/@types/event";

import { ContextMenu, Tooltip } from "./popups";
import { Avatar } from "./user";

import { acronym, classList } from '../utils/utils';
import { isDirect } from "../utils/roomFilters";

import Icon from '@mdi/react';
import { mdiChevronDown, mdiChevronRight, mdiLoading } from "@mdi/js";

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


const getRoomUrl = (room: Room) => room.getAvatarUrl(global.matrix.getHomeserverUrl(), 96, 96, "crop");

export function RoomIcon({ room }: {room: Room}) {
    const [iconUrl, setIconUrl] = useState(getRoomUrl(room));
    const directRoom = isDirect(room);

    // Bind listener for room avatar updates
    useEffect(() => {
        console.log("bind room icon", room.name)
        // When the room changes, update the icon
        setIconUrl(getRoomUrl(room));

        function stateUpdate(event: MatrixEvent) {
            if (event.getRoomId() === room.roomId && event.getType() === EventType.RoomAvatar) {
                const httpUrl: string = global.matrix.mxcUrlToHttp(event.getContent().url, 96, 96, "crop");
                setIconUrl(httpUrl);
            }
        }

        global.matrix.addListener("RoomState.events", stateUpdate);
        return () => {
            global.matrix.removeListener("RoomState.events", stateUpdate);   
        }
        
    }, [room])

    if (!iconUrl && directRoom) {
        const user = global.matrix.getUser(room.guessDMUserId());
        return <Avatar subClass="avatar" user={user} />
    } else {
        return iconUrl ?
               <img className="avatar" src={iconUrl} alt={acronym(room.name)} /> :
               <div className="avatar">{acronym(room.name)}</div>;
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
    children: React.ReactNode,
    unread?: boolean,
    notifications?: number,
    [key: string]: any,
}

export function OptionDropDown({ icon, text, indicator, children, ...props }: OptionDropDownProps) {
    const [open, toggleOpen] = useReducer((current) => !current, false);

    return (
        <div className="option--dropdown-wrapper">
            <div className="option--dropdown" onClick={toggleOpen} {...props}>
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

export function Button({plain = false, save = false, danger = false, link = false, disabled = false, ...props}) {
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
