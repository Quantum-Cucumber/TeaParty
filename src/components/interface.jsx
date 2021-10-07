import Icon from '@mdi/react';
import "./components.scss";
import { mdiLoading, mdiDownload, mdiOpenInNew } from "@mdi/js";
import { useState, cloneElement, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
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

export function Tooltip({ text, x, y, dir, children, delay = 0 }) {
    const [visible, setVisible] = useState(false);
    const tooltipRef = useRef();
    const childRef = useRef();
    const timer = useRef();  // If a delay is set, this tracks the setTimeout ID
    const oldEvent = useRef({});

    const setPosition = useCallback((e) => {
        const offset = 5 + 5;  // Offset + arrow size
        // Calculate position of tooltip
        const tooltip = tooltipRef.current;
        const child = childRef.current;
        const childRect = child.getBoundingClientRect();

        oldEvent.current = e;  // Save in case text changes 

        const presets = {
            "top": {x: "center", y: "top"},
            "bottom": {x: "center", y: "bottom"},
            "left": {x: "left", y: "center"},
            "right": {x: "right", "y": "center"}
        }

        // Determine horizontal positioning
        switch (x || presets[dir]?.x) {
            case "center":
                tooltip.style.left = `${childRect.x - (tooltip.offsetWidth / 2) + (childRect.width / 2)}px`;
                break;
            case "left":
                tooltip.style.left = `${childRect.x - tooltip.offsetWidth - offset}px`;
                break;
            case "right":
                tooltip.style.left = `${childRect.x + childRect.width + offset}px`;
                break;
            case "mouse":
                const centerX = e.clientX;
                tooltip.style.left = `${centerX - (tooltip.offsetWidth / 2)}px`;
                break;
            default:
                break;
        }
        // Vertical positioning
        switch (y || presets[dir]?.y) {
            case "center":
                tooltip.style.top = `${childRect.y - (tooltip.offsetHeight / 2) + (childRect.height / 2)}px`;
                break;
            case "top":
                tooltip.style.top = `${childRect.y - tooltip.offsetHeight - offset}px`;
                break;
            case "bottom":
                tooltip.style.top = `${childRect.y + childRect.height + offset}px`;
                break;
            case "mouse":
                const centerY = e.clientY;
                tooltip.style.top = `${centerY - (tooltip.offsetHeight / 2)}px`;
                break;
            default:
                break;
        }
    }, [x, y, dir])
    function show(e) {
        setPosition(e)
        timer.current = setTimeout(() => setVisible(true), delay * 1000);
    }
    function hide() {
        clearTimeout(timer.current);
        setVisible(false);
    }

    // If the text changes, recalculate position
    useEffect(() => {
        setPosition(oldEvent.current);
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
            <div className="overlay__modal" ref={modalUpdate}>
                {children}
            </div>
            {dim && <div className="overlay__dim" ref={dimUpdate} style={{opacity: opacity}} onClick={click}></div>}
        </div>
    )
}


async function mediaToBlob(url) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } 
    catch {
        return url;
    }
}

export function ImagePopup({ sourceUrl, render, setRender, name }) {
    const [blobUrl, setBlobUrl] = useState();
    
    useEffect(() => {
        return () => {
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
            }
        }
    }, [blobUrl])

    function download(e) {
        if (!sourceUrl || blobUrl) {return}
        e.preventDefault()

        mediaToBlob(sourceUrl)
        .then((url) => {
            setBlobUrl(url);

            e.target.closest("a").click();
        })
    }

    return (
        <Overlay click={() => {setRender(false)}} render={render} fade={0.15}
                mountAnimation="image__zoom-in 0.15s ease-out" unmountAnimation="image__zoom-out 0.15s ease-in">
            <img src={sourceUrl} alt={name} className="image-popup" />
            <div className="image-popup__buttons">
                <a rel="noopener noreferrer" target="_blank" href={blobUrl || sourceUrl} download={name || "download"} onClick={download}>
                    <Button path={mdiDownload} size="1.5rem" tipDir="top" tipText="Download" />
                </a>
                <a rel="noopener noreferrer" target="_blank" href={sourceUrl}>
                    <Button path={mdiOpenInNew} size="1.5rem" tipDir="top" tipText="Open Original" />
                </a>
            </div>
        </Overlay>
    );
}
