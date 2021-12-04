import "./elements.scss";
import { useState, useReducer, useRef, useEffect } from "react";

import { ContextMenu, Tooltip } from "./popups";
import { Avatar } from "./user";

import { acronym, classList } from '../utils/utils';
import { isDirect } from "../utils/roomFilters";

import Icon from '@mdi/react';
import { mdiChevronDown, mdiChevronRight, mdiLoading } from "@mdi/js";


export function IconButton({ path, clickFunc, subClass=null, size="1em", tipDir="top", tipText=null }) {
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

export function Loading({ size }) {
    return (
        <Icon path={mdiLoading} color="var(--primary)" size={size} spin={1.2}/>
    );
}


const getRoomUrl = (room) => room.getAvatarUrl(global.matrix.getHomeserverUrl(), 96, 96, "crop");

export function RoomIcon({ room }) {
    const [iconUrl, setIconUrl] = useState(getRoomUrl(room));
    const directRoom = isDirect(room);

    // Bind listener for room avatar updates
    useEffect(() => {
        console.log("bind room icon", room.name)
        // When the room changes, update the icon
        setIconUrl(getRoomUrl(room));

        function stateUpdate(event) {
            if (event.getRoomId() === room.roomId && event.getType() === "m.room.avatar") {
                const httpUrl = global.matrix.mxcUrlToHttp(event.getContent().url, 96, 96, "crop");
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


export function Option({ text, k = null, selected = null, select = ()=>{}, danger=false, compact=false, unread=false, notifications=0, children = null, ...props }) {
    const className = classList("option",
                                {"option--selected": k ? selected===k : null}, 
                                {"option--danger": danger},
                                {"option--compact": compact}) 

    let indicator = null;
    if (notifications > 0) {
        indicator = (<div className="option__notification">{notifications}</div>);
    } else if (unread) {
        indicator = (<div className="option__unread"></div>);
    }

    return (
        <div className={className} onClick={() => select(k)} {...props}>
            {children}
            <div className="option__text">{text}</div>
            {indicator}
        </div>
    );
}

export function HoverOption({ icon, text, children }) {
    const [show, setShow] = useState(false);
    const anchor = useRef();

    return (
        <div className="option option--compact" onMouseOver={() => {setShow(true)}} onMouseLeave={() => {setShow(false)}} ref={anchor}>
            {icon}
            <div className="option__text">{text}</div>
            <Icon path={mdiChevronRight} size="1em" color="var(--text)" />

            { show && 
                <ContextMenu parent={anchor.current} x="right" y="align-top" padding={0}>
                    {children}
                </ContextMenu>
            }
        </div>
    )
}

export function OptionDropDown({ icon, text, children, unread=false, notifications=0, ...props }) {
    const [open, toggleOpen] = useReducer((current) => !current, false);

    let indicator = null;
    if (notifications > 0) {
        indicator = (<div className="option--dropdown__notification">{notifications}</div>);
    } else if (unread) {
        indicator = (<div className="option--dropdown__unread"></div>);
    }

    return (
        <div className="option--dropdown-wrapper">
            <div className="option--dropdown" onClick={toggleOpen} {...props}>
                <Icon path={mdiChevronDown} color={open ? "var(--text)" : "var(--text-greyed)"} size="1.5rem" className="option--dropdown__chevron" rotate={open ? 0 : -90} />
                { icon }
                <div className="option--dropdown__text">{text}</div>
                {indicator}
            </div>
            { open &&
                <div className="option--dropdown__content">
                    {children}
                </div>
            }
        </div>
    )
}

export function A(props) {
    const {children, ...passthroughProps} = props;

    return (
        <a target="_blank" rel="noopener noreferrer" {...passthroughProps}>
            {children}
        </a>
    )
}

export function Button({plain = false, save = false, danger = false, link = false, ...props}) {
    const variation = classList(
        {"button--plain": plain},
        {"button--save": save},
        {"button--danger": danger},
        {"button--link": link},
    )

    return (
        <button className={variation} {...props} />
    )
}
