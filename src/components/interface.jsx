import Icon from '@mdi/react';
import "./components.scss";
import { mdiLoading } from "@mdi/js";
import { useState, cloneElement, useRef, useEffect, useLayoutEffect } from 'react';
import { classList } from '../utils/utils';

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
            <div className={classList("tooltip", `tooltip--${dir}`, {"tooltip--visible": visible})} ref={tooltipRef}>{text}</div>
        </>
    );
}

export function Option({ k, text, selected, select, danger, unread=false, notification=0, children }) {
    const className = classList("option",
                                {"option--selected": selected===k}, 
                                {"option--danger": danger}) 

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

export function Overlay({ children, opacity = "85%", click, dim = true, fade = 0, render = true, mountAnimation, unmountAnimation }) {
    /* click refers to the onClick function for the dim bg
       dim is whether to add a transparent overlay to the background
       fade determines how long the dim element will fade for
       render is passed to determine if the overlay should display
    */

    const [mount, setMount] = useState(true);  // Master state for whether to display or not
    const [modal, modalUpdate] = useState();  // Acts as a ref except triggers the state update
    const [dimNode, dimUpdate] = useState();  // ^

    // Allows for playing an animation when unmounting
    useLayoutEffect(() => {  // LayoutEffect creates a smoother animation
        if (render) {
            if (modal && mountAnimation) {
                modal.style.animation = mountAnimation;
            }
            setMount(true);
        } 
        else if (!render) {
            if (modal && unmountAnimation) {
                // Bind for animation end event then unmount
                const unmount = () => {setMount(false);console.log("unmount")};
                modal.addEventListener("animationend", unmount);
                // Set unmount animation
                modal.style.animation = unmountAnimation;
                void(modal.offsetHeight);  // Force animation to run

                return () => {modal.removeEventListener("animationend", unmount)}
            } 
            else {
                setMount(false);
            }
        }
    }, [modal, render, mountAnimation, unmountAnimation])
    useLayoutEffect(() => {
        if (!dimNode || !dim) {return}

        dimNode.style.animation = `overlay__dim__fade-${render ? "in" : "out"} ${fade}s ease 0s 1`;
        void(dimNode.offsetHeight);
        // dimNode.style.display = render ? "block" : "none";
    }, [dimNode, dim, fade, render]);

    if (!mount) {return null}

    return (
        <div className="overlay">
            <div className="overlay__modal" ref={modalUpdate}>
                {children}
            </div>
            {dim && <div className="overlay__dim" ref={dimUpdate} style={{opacity: opacity}} onClick={click}></div>}
        </div>
    )
}
