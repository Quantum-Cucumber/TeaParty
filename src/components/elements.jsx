import "./elements.scss";
import { useState, useReducer, useRef } from "react";

import { ContextMenu, Tooltip } from "./popups";
import { Avatar } from "./user";

import { acronym, classList } from '../utils/utils';

import Icon from '@mdi/react';
import { mdiChevronDown, mdiChevronRight, mdiLoading } from "@mdi/js";


export function Button({ path, clickFunc, subClass=null, size=null, tipDir, tipText }) {
    return (
        <div className={classList("button", subClass)} onClick={clickFunc}>
            {tipText ?
                <Tooltip text={tipText} dir={tipDir}>
                    <Icon path={path} className="button__icon" size={size} />
                </Tooltip> 
                :
                <Icon path={path} className="button__icon" size={size} />
            }
        </div>
    );
}

export function Loading({ size }) {
    return (
        <Icon path={mdiLoading} color="var(--primary)" size={size} spin={1.2}/>
    );
}


export function RoomIcon({ room, directRoom = false }) {
    const iconUrl = room.getAvatarUrl(global.matrix.getHomeserverUrl(), 96, 96, "crop");

    if (!iconUrl && directRoom) {
        const user = global.matrix.getUser(room.guessDMUserId());
        return <Avatar subClass="room__icon" user={user} />
    } else {
        return iconUrl ?
               <img className="room__icon" src={iconUrl} alt={acronym(room.name)} /> :
               <div className="room__icon">{acronym(room.name)}</div>;
    }
}


export function Option({ text, k = null, selected = null, select = ()=>{}, danger=false, compact=false, unread=false, notifications=0, children, ...props }) {
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

export function DropDown({ icon, text, children, unread=false, notifications=0, ...props }) {
    const [open, toggleOpen] = useReducer((current) => !current, false);

    let indicator = null;
    if (notifications > 0) {
        indicator = (<div className="dropdown__notification">{notifications}</div>);
    } else if (unread) {
        indicator = (<div className="dropdown__unread"></div>);
    }

    return (
        <div className="dropdown-wrapper">
            <div className="dropdown" onClick={toggleOpen} {...props}>
                <Icon path={mdiChevronDown} color={open ? "var(--text)" : "var(--text-greyed)"} size="1.5rem" className="dropdown__chevron" rotate={open ? 0 : -90} />
                { icon }
                <div className="dropdown__text">{text}</div>
                {indicator}
            </div>
            { open &&
                <div className="dropdown__content">
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