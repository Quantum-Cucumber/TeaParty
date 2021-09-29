import Icon from '@mdi/react';
import "./components.scss";
import { mdiLoading } from "@mdi/js";
import { useState, cloneElement, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { Avatar } from './user';
import { useBindEscape } from '../utils/utils';
import { powerLevelText } from "../utils/matrix-client";

export function Button({ path, clickFunc, subClass, size=null, tipDir, tipText }) {
    return (
        <div className={subClass} onClick={clickFunc}>
            <Tooltip text={tipText} dir={tipDir}>
                <Icon path={path} className="mdi-icon" size={size} />
            </Tooltip>
        </div>
    );
}

export function Loading({ size }) {
    return (
        <Icon path={mdiLoading} color="var(--primary)" size={size} spin={1.2}/>
    );
}

export function Tooltip({ text, dir, children, delay = 0 }) {
    const [visible, setVisible] = useState(false);
    const tooltipRef = useRef();
    const childRef = useRef();
    const timer = useRef();  // If a delay is set, this tracks the setTimeout ID

    function show() {
        const offset = 5 + 5;  // Offset + arrow size
        // Calculate position of tooltip
        const tooltip = tooltipRef.current;
        const child = childRef.current;
        const childRect = child.getBoundingClientRect();

        switch (dir) {
            case "top": 
                // Horizontal center
                tooltip.style.left = `${childRect.x - (tooltip.offsetWidth / 2) + (childRect.width / 2)}px`;
                // Top
                tooltip.style.top = `${childRect.y - tooltip.offsetHeight - offset}px`;
                break;
            case "bottom":
                // Horizontal center
                tooltip.style.left = `${childRect.x - (tooltip.offsetWidth / 2) + (childRect.width / 2)}px`;
                // Bottom
                tooltip.style.top = `${childRect.y + childRect.height + offset}px`;
                break;
            case "left":
                // Vertical center
                tooltip.style.top = `${childRect.y - (tooltip.offsetHeight / 2) + (childRect.height / 2)}px`;
                // Left
                tooltip.style.left = `${childRect.x - tooltip.offsetWidth - offset}px`;
                break;
            case "right":
                // Vertical center
                tooltip.style.top = `${childRect.y - (tooltip.offsetHeight / 2) + (childRect.height / 2)}px`;
                // Right
                tooltip.style.left = `${childRect.x + childRect.width + offset}px`;
                break;
            default:
                break;
        }

        timer.current = setTimeout(() => setVisible(true), delay * 1000);
    }
    function hide() {
        clearTimeout(timer.current);
        setVisible(false);
    }

    useEffect(() => {
        return () => {clearTimeout(timer.current)};
    }, [])

    // Can only have a single child
    if (Array.isArray(children)) {
        console.warn("Tooltip component can only have one child element");
        return null;
    }
    
    // Add listeners for all children (generally should be one child)
    children = cloneElement(children, {
        onMouseEnter: show,
        onMouseLeave: hide,
        ref: childRef,
    });

    return (
        <>
            {children}
            <div className={`tooltip tooltip--${dir} ${visible ? "tooltip--visible" : ""}`} ref={tooltipRef}>{text}</div>
        </>
    );
}

export function Option({ k, text, selected, select, danger, unread=false, notification=0, children }) {
    const className = "option" + 
                      (selected === k ? " option--selected" : "") +
                      (danger ? " option--danger" : "");

    var indicator = null;
    if (notification > 0) {
        indicator = (<div className="option__notification">{notification}</div>);
    } else if (unread) {
        indicator = (<div className="option__unread"></div>);
    }

    return (
        <div className={className} onClick={() => select(k)}>
            {children}
            <div className="option__text">{text}</div>
            {indicator}
        </div>
    );
}

export function Overlay({ children, opacity="90%", click }) {
    return (
        <div className="overlay">
            <div className="overlay__modal">
                {children}
            </div>
            <div className="overlay__fade" style={{opacity: opacity}} onClick={click}></div>
        </div>
    )
}

export function UserPopup({ user, parent, room, setUserPopup }) {
    const popupRef = useRef();

    useBindEscape(setUserPopup, {parent: null, user: null});

    const clicked = useCallback((e) => {
        if (!e.target.closest(".user-popup")) {
            setUserPopup({parent: null, user: null});
        }
    }, [setUserPopup]);

    // useLayoutEffect to set position before render
    useLayoutEffect(() => {
        if (!user || !parent) {return};
        // Want to position at same height at parent, to the right of it while also within window boundaries
        const padding = 10;
        const parentRect = parent.getBoundingClientRect();
        const popup = popupRef.current;

        // Position at same height
        popup.style.top = `${parentRect.y}px`;
        popup.style.bottom = "auto";
        // Position to the right of parent
        popup.style.left = `${parentRect.x + parentRect.width + padding}px`
        popup.style.right = "auto";

        // Constrain to screen height
        const popupRect = popup.getBoundingClientRect();
        if (popupRect.bottom > window.innerHeight) {
            popup.style.top = "auto";
            popup.style.bottom = `${padding}px`;
        }
    }, [user, parent])

    // Attach click event AFTER render
    useEffect(() => {
        if (!user || !parent) {return};
        // Attach click event to dismiss the popup
        document.addEventListener("click", clicked);
        return () => document.removeEventListener("click", clicked);
    }, [user, parent, clicked]);
    

    if (!user || !parent || !room) {return null};

    return (
        <div className="user-popup" ref={popupRef}>
            <Avatar user={user} subClass="user-popup__avatar" />
            <div className="user-popup__display-name">{user.rawDisplayName}</div>
            <div className="user-popup__text">{user.userId}</div>

            <div className="user-popup__label">Power Level</div>
            <div className="user-popup__text">{powerLevelText(user.userId, room)}</div>
        </div>
    );
}
