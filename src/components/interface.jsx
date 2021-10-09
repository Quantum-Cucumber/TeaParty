import "./components.scss";
import Icon from '@mdi/react';
import { mdiLoading, mdiDownload, mdiOpenInNew, mdiClose } from "@mdi/js";
import { useState, cloneElement, useRef, useEffect, useLayoutEffect, useCallback, createContext, useContext } from 'react';
import { classList, useBindEscape } from '../utils/utils';

export function Button({ path, clickFunc, subClass, size=null, tipDir, tipText }) {
    return (
        <div className={subClass} onClick={clickFunc}>
            {tipText ?
                <Tooltip text={tipText} dir={tipDir}>
                    <Icon path={path} className="mdi-icon" size={size} />
                </Tooltip> 
                :
                <Icon path={path} className="mdi-icon" size={size} />
            }
        </div>
    );
}

export function Loading({ size }) {
    return (
        <Icon path={mdiLoading} color="var(--primary)" size={size} spin={1.2}/>
    );
}

export function positionFloating(positionMe, referenceNode, x, y, offset=0, mouseEvent=null, constrain=false) {
    const referenceRect = referenceNode.getBoundingClientRect();;

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
        // Center node over the mouseEvent x position
        case "mouse":
            const centerX = mouseEvent.clientX;
            positionMe.style.left = `${centerX - (positionMe.offsetWidth / 2)}px`;
            break;
        // Align the left edge of both nodes
        case "align-left":
            positionMe.style.left = `${referenceRect.x}px`;
            break;
        // Align the right edge of both nodes
        case "align-right":
            positionMe.style.left = `${referenceRect.x - positionMe.offsetWidth + referenceRect.width}px`;
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
        // Center node over the mouseEvent y position
        case "mouse":
            const centerY = mouseEvent.clientY;
            positionMe.style.top = `${centerY - (positionMe.offsetHeight / 2)}px`;
            break;
        // Align the top edge of both nodes
        case "align-top": 
            positionMe.style.top = `${referenceRect.y}px`;
            break;
        // Align the bottom edge of both nodes
        case "align-bottom":
            positionMe.style.top = `${referenceRect.y - positionMe.offsetHeight + referenceRect.height}px`;
            break;
        default:
            break;
    }

    if (constrain) {
        const rect = positionMe.getBoundingClientRect();

        // Constrain to screen height
        if (rect.bottom > window.innerHeight) {
            positionMe.style.top = "auto";
            positionMe.style.bottom = `${offset}px`;
        }

        // Render on other side of parent if off the screen
        if (rect.right > window.innerWidth) {
            const inverseX = {
                "left": "right", "right": "left",
                "align-left": "align-right", "align-right": "align-left",
            }
            positionFloating(positionMe, referenceNode, inverseX[x], y, offset);
        }
    }

    return positionMe;
}

export function Tooltip({ text, x, y, dir, children, delay = 0 }) {
    const [visible, setVisible] = useState(false);
    const tooltipRef = useRef();
    const childRef = useRef();
    const timer = useRef();  // If a delay is set, this tracks the setTimeout ID
    const mouseEvent = useRef({});

    const setPosition = useCallback((e) => {
        const offset = 5 + 5;  // Offset + arrow size
        // Calculate position of tooltip
        const tooltip = tooltipRef.current;
        const child = childRef.current;

        const presets = {
            "top": {x: "center", y: "top"},
            "bottom": {x: "center", y: "bottom"},
            "left": {x: "left", y: "center"},
            "right": {x: "right", "y": "center"}
        }

        positionFloating(tooltip, child, x || presets[dir]?.x, y || presets[dir]?.y, offset, e);
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
        onMouseMove: x === "mouse" || y === "mouse" ? (e) => {mouseEvent.current = e; console.log('mouse')} : null,
    });

    return (
        <>
            {children}
            <div className={classList("tooltip", `tooltip--${dir}`, {"tooltip--visible": visible})} ref={tooltipRef}>{text}</div>
        </>
    );
}

export function Option({ text, k, selected, select = ()=>{}, danger=false, compact=false, unread=false, notification=0, children }) {
    const className = classList("option",
                                {"option--selected": k ? selected===k : null}, 
                                {"option--danger": danger},
                                {"option--compact": compact}) 

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

export function Overlay({ children, opacity = "85%", click, modalClass, dim = true, 
                          fade = 0, render = true, mountAnimation, unmountAnimation }) {
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
            <div className={classList("overlay__modal", modalClass)} ref={modalUpdate}>
                {children}
            </div>
            {dim && <div className="overlay__dim" ref={dimUpdate} style={{opacity: opacity}} onClick={click}></div>}
        </div>
    )
}
export function Modal(props) {
    /* High order component of overlay that gives the modal styling and adds a title/close button */
    const { title, hide, children, modalClass, ...passThroughProps } = props;

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
            {children}
        </Overlay>
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

export const contextMenuCtx = createContext(() => {});
export function ContextMenu({ parent, x, y, mouseEvent = null, children }) {
    const setVisible = useContext(contextMenuCtx);
    const [menu, setMenu] = useState();

    useBindEscape(setVisible, () => {});

    useEffect(() => {
        if (!menu) {return}
        positionFloating(menu, parent, x, y, 10, mouseEvent, true);
    }, [menu, x, y, parent, mouseEvent])

    useEffect(() => {
        if (!menu) {return};

        function hide(e) {
            if (!e.target.closest(".context-menu")) {
                console.log("hide")
                setVisible(false);
            }
        }

        document.addEventListener("click", hide);
        return () => {document.removeEventListener("click", hide)};
    }, [setVisible, menu])

    return (
        <div className="context-menu" ref={setMenu}>
            {children}
        </div>
    )
}
