import "./popups.scss";
import { useState, useEffect, useRef, useCallback, createContext, useContext, useLayoutEffect, cloneElement } from "react";

import { A, IconButton, Button, Loading } from "./elements";

import { classList } from '../utils/utils';
import { useOnKeypress, useDownloadUrl, useCatchState } from "../utils/hooks";

import Icon from "@mdi/react";
import { mdiDownload, mdiClose, mdiOpenInNew } from "@mdi/js";


type xPos = "center" | "left" | "right" | "align-left" | "align-right" | "mouse" | "align-mouse-left" | "align-mouse-right";
type yPos = "center" | "top" | "bottom" | "align-top" | "align-bottom" | "mouse" | "align-mouse-top" | "align-mouse-bottom";

export function positionFloating(positionMe: HTMLElement, referenceNode: HTMLElement, x: xPos, y: yPos, offset=0, mouseEvent: React.MouseEvent<HTMLElement> = null, constrain=false) {
    // What to position relative to
    const referenceRect = referenceNode.getBoundingClientRect();

    const mouseX = mouseEvent ? mouseEvent.clientX : null;
    const mouseY = mouseEvent ? mouseEvent.clientY : null;

    // Determine horizontal positioning
    switch (x) {
        // Align node's center with the center of the reference node
        case "center":
            positionMe.style.left = `${referenceRect.x - (positionMe.offsetWidth / 2) + (referenceRect.width / 2)}px`;
            break;
        // Position to the left of the reference node w/ offset
        case "left":
            positionMe.style.left = `${referenceRect.x - positionMe.offsetWidth - offset}px`;
            break;
        // Position to the right of the reference node w/ offset
        case "right":
            positionMe.style.left = `${referenceRect.x + referenceRect.width + offset}px`;
            break;
        // Align the left edge of both nodes
        case "align-left":
            positionMe.style.left = `${referenceRect.x}px`;
            break;
        // Align the right edge of both nodes
        case "align-right":
            positionMe.style.left = `${referenceRect.x - positionMe.offsetWidth + referenceRect.width}px`;
            break;
        // Center node over the mouseEvent x position
        case "mouse":
            positionMe.style.left = `${mouseX - (positionMe.offsetWidth / 2)}px`;
            break;
        // Align left edge with mouse
        case "align-mouse-left":
            positionMe.style.left = `${mouseX}px`;
            break;
        // Align right edge with mouse
        case "align-mouse-right":
            positionMe.style.left = `${mouseX - positionMe.offsetWidth}px`;
            break;
        default:
            break;
    }
    // Vertical positioning
    switch (y) {
        // Align node's center with the center of the reference node
        case "center":
            positionMe.style.top = `${referenceRect.y - (positionMe.offsetHeight / 2) + (referenceRect.height / 2)}px`;
            break;
        // Position above the reference node w/ offset
        case "top":
            positionMe.style.top = `${referenceRect.y - positionMe.offsetHeight - offset}px`;
            break;
        // Position below the reference node w/ offset
        case "bottom":
            positionMe.style.top = `${referenceRect.y + referenceRect.height + offset}px`;
            break;
        // Align the top edge of both nodes
        case "align-top": 
            positionMe.style.top = `${referenceRect.y}px`;
            break;
        // Align the bottom edge of both nodes
        case "align-bottom":
            positionMe.style.top = `${referenceRect.y - positionMe.offsetHeight + referenceRect.height}px`;
            break;
        // Center node over the mouseEvent y position
        case "mouse":
            positionMe.style.top = `${mouseY - (positionMe.offsetHeight / 2)}px`;
            break;
        // Align top edge with mouse position
        case "align-mouse-top":
            positionMe.style.top = `${mouseY}px`;
            break;
        // Align bottom edge with mouse position
        case "align-mouse-bottom":
            positionMe.style.top = `${mouseY - positionMe.offsetHeight}px`;
            break;
        default:
            break;
    }

    if (constrain) {
        const rect = positionMe.getBoundingClientRect();

        // Constrain to screen height
        if (rect.bottom > window.innerHeight) {
            positionMe.style.top = `${window.innerHeight - offset - rect.height}px`;
        }

        // Render on other side of parent if off the screen
        if (rect.right > window.innerWidth) {
            const inverseX = {
                "left": "right", "right": "left",
                "align-left": "align-right", "align-right": "align-left",
                "align-mouse-left": "align-mouse-right", "align-mouse-right": "align-mouse-left",
            }
            positionFloating(positionMe, referenceNode, inverseX[x], null, offset, mouseEvent);
        }
    }

    return positionMe;
}

type TooltipProps = {
    text: string,
    dir: "top" | "bottom" | "left" | "right",
    children: JSX.Element,
    x?: xPos,
    y?: yPos,
    delay?: number,
}

export function Tooltip({ text, dir, children, x = null, y = null, delay = 0 }: TooltipProps) {
    const [visible, setVisible] = useState(false);
    const tooltipRef = useRef<HTMLDivElement>();
    const childRef = useRef<HTMLElement>();
    const timer = useRef<NodeJS.Timer>();  // If a delay is set, this tracks the setTimeout ID
    const mouseEvent = useRef<React.MouseEvent<HTMLElement>>();

    const setPosition = useCallback((e: React.MouseEvent<HTMLElement>) => {
        const offset = 5 + 5;  // Offset + arrow size
        // Calculate position of tooltip
        const tooltip = tooltipRef.current;
        const child = childRef.current;
        if (!tooltip || !child) {return};

        const presets = {
            "top": {x: "center", y: "top"},
            "bottom": {x: "center", y: "bottom"},
            "left": {x: "left", y: "center"},
            "right": {x: "right", "y": "center"},
        }

        positionFloating(tooltip, child, x || presets[dir]?.x as xPos, y || presets[dir]?.y as yPos, offset, e);
    }, [x, y, dir])
    function show() {
        timer.current = setTimeout(() => {
            setPosition(mouseEvent.current);
            setVisible(true)
        }, delay * 1000);
    }
    function hide() {
        clearTimeout(timer.current);
        setVisible(false);
    }

    // If the text changes, recalculate position
    useEffect(() => {
        setPosition(mouseEvent.current);
    }, [text, setPosition])

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
        onMouseMove: x === "mouse" || y === "mouse" ? (e: React.MouseEvent<HTMLElement>) => {mouseEvent.current = e} : null,
    });

    return (
        <>
            {children}
            <div className={classList("tooltip", `tooltip--${dir}`, {"tooltip--visible": visible})} ref={tooltipRef}>{text}</div>
        </>
    );
}


type OverlayProps = {
    children: React.ReactNode,
    opacity?: string,
    click?: (e?: React.MouseEvent<HTMLElement>) => void,
    modalClass?: string,
    dim?: boolean,
    fade?: number,
    render?: boolean,
    mountAnimation?: string,
    unmountAnimation?: string,
}

export function Overlay({ children, opacity = "85%", click = null, modalClass = "", dim = true, 
                          fade = 0, render = true, mountAnimation = null, unmountAnimation = null }: OverlayProps) {
    /* click refers to the onClick function for the dim bg
       dim is whether to add a transparent overlay to the background
       fade determines how long the dim element will fade for
       render is passed to determine if the overlay should display
    */
    const [mount, setMount] = useState(true);  // Master state for whether to display or not
    const [modal, modalUpdate] = useState<HTMLElement>();  // Acts as a ref except triggers the state update
    const [dimNode, dimUpdate] = useState<HTMLElement>();  // ^

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
                const unmount = () => {setMount(false)};
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
            <div className={classList("overlay__modal", modalClass)} ref={modalUpdate}>
                {children}
            </div>
            {dim && <div className="overlay__dim" ref={dimUpdate} style={{opacity: opacity}} onClick={click}></div>}
        </div>
    )
}


type ModalProps = {
    title: string,
    hide: () => void,
    children: React.ReactNode,
    modalClass?: string,
    bodyClass?: string,
}

export function Modal({title, hide, children, modalClass, bodyClass, ...passThroughProps}: ModalProps) {
    /* High order component of overlay that gives the modal styling and adds a title/close button */

    useOnKeypress("Escape", hide)

    return (
        <Overlay modalClass={classList("overlay__modal--bg", modalClass)} click={hide} {...passThroughProps}>
            <div className="overlay__title">
                {title}:

                <Icon className="overlay__close" 
                    path={mdiClose} 
                    size="20px" 
                    color="var(--text-greyed)" 
                    onClick={hide}
                />
            </div>
            <div className={classList("overlay__body", bodyClass)}>
                {children}
            </div>
        </Overlay>
    )
}


type ConfirmProps = {
    title?: string,
    body?: JSX.Element,
    onConfirm: () => Promise<void>,
}

export function Confirm({title = null, body = null, onConfirm}: ConfirmProps) {
    const setPopup = useContext(popupCtx);
    const [loading, setLoading] = useCatchState(false, run);

    useOnKeypress("Escape", setPopup);

    async function run() {
        await onConfirm();
        setPopup(null);
    }

    return (
        <Overlay click={() => {setPopup(null)}} modalClass="overlay__modal--bg">
            <div className="overlay__title">
                {title}
            </div>
            <div className="overlay__body">
                {body}
            </div>
            <div className="overlay__buttons">
                { !loading ?
                    <>
                        <Button plain onClick={() => setPopup(null)}>Cancel</Button>
                        <Button danger
                            onClick={async () => {
                                await setLoading(true)
                            }}
                        >Accept</Button>
                    </>
                :
                    <Loading size="1.5em" />
                }
            </div>
        </Overlay>
    )
}


type ImagePopupProps = {
    sourceUrl: string,
    render: boolean,
    setRender: (render: boolean) => void,
    name: string,
}

export function ImagePopup({ sourceUrl, render, setRender, name }: ImagePopupProps) {
    const [blobUrl, download] = useDownloadUrl(sourceUrl);

    useOnKeypress("Escape", setRender, false, render);

    return (
        <Overlay click={() => {setRender(false)}} render={render} fade={0.15}
                mountAnimation="image__zoom-in 0.15s ease-out" unmountAnimation="image__zoom-out 0.15s ease-in">
            <img src={sourceUrl} alt={name} className="image-popup" />
            <div className="image-popup__buttons">
                <A href={blobUrl || sourceUrl} download={name || "download"} onClick={download}>
                    <IconButton path={mdiDownload} size="1.5rem" tipDir="top" tipText="Download" />
                </A>
                <A href={sourceUrl}>
                    <IconButton path={mdiOpenInNew} size="1.5rem" tipDir="top" tipText="Open Original" />
                </A>
            </div>
        </Overlay>
    );
}


type ContextMenuProps = {
    parent: HTMLElement,
    x: xPos,
    y: yPos,
    mouseEvent?: React.MouseEvent<HTMLElement>,
    subClass?: string,
    padding?: number,
    children: React.ReactNode,
}

export function ContextMenu({ parent, x, y, mouseEvent = null, subClass = null, padding = 10, children }: ContextMenuProps) {
    const setVisible = useContext(popupCtx);
    const menuRef = useRef<HTMLDivElement>();

    useOnKeypress("Escape", setVisible);

    useLayoutEffect(() => {  // Layout effect reduces visual bugs
        if (!menuRef.current) {return}
        positionFloating(menuRef.current, parent, x, y, padding, mouseEvent, true);
    }, [x, y, parent, padding, mouseEvent])

    useEffect(() => {
        function hide(this: Document, e: MouseEvent) {
            if (e.target instanceof HTMLElement && !e.target.closest(".context-menu")) {
                setVisible(null);
            }
        }

        document.addEventListener("click", hide);
        return () => {
            document.removeEventListener("click", hide)
        };
    }, [setVisible])

    return (
        <div className={classList("context-menu", subClass)} ref={menuRef}>
            {children}
        </div>
    )
}


// TODO: Use a eventemitter for this to be used with mentions etc
// Modals are windows of information
export const modalCtx: React.Context<(modal?: JSX.Element) => void> = createContext(() => {});
// Popups are small snippets of information that can sit over the top of modals
export const popupCtx: React.Context<(popup?: JSX.Element) => void>  = createContext(() => {});
