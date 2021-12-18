import "./wrappers.scss";
import { useEffect, useState, useCallback, useRef } from "react";
import Twemoji from "twemoji";
import linkifyElement from "linkify-element";
import hljs from "highlight.js";

import { IconButton } from "./elements";

import { classList } from "../utils/utils";
import { useDrag, useStableState } from "../utils/hooks"
import { linkifyOptions } from "../utils/linking";

import { mdiContentCopy } from "@mdi/js";


export function TextCopy({ text, children }) {
    const [tooltip, setTooltip] = useState("Copy");
    const timerId = useRef();

    function copyText() {
        navigator.clipboard.writeText(text);
        setTooltip("Copied");
        timerId.current = setTimeout(() => {setTooltip("Copy")}, 1000);
    }
    // Clear timeout on unmount
    useEffect(() => {
        return () => {
            clearTimeout(timerId.current)
        }
    }, [])

    return (
        <div className="copy-text">
        {children || text}&nbsp;
        <IconButton subClass="copy-text__button" path={mdiContentCopy} size="100%" tipDir="top" tipText={tooltip} clickFunc={copyText} />
        </div>
    )
}

export function Resize({ children, initialSize, side, minSize = "0px", collapseSize = 0, collapseState }) {
    const [size, setSize] = useState(initialSize);
    const container = useRef();
    const stableCollapseSize = useStableState(collapseSize);

    // If collapseState isn't passed, use our own state
    const backupCollapseState = useState(false);
    const [collapse, setCollapse] = collapseState ? collapseState : backupCollapseState;

    const mouseMove = useCallback((e) => {
        if (!container.current) {return}

        // Distance between the container's offset and the mouse as the width
        const bounding = container.current.getBoundingClientRect();
        let newSize;
        switch (side) {
            case "top":
                newSize = bounding.bottom - e.clientY;
                break;
            case "right":
                newSize = e.clientX - bounding.left;
                break;
            case "bottom":
                newSize = e.clientY - bounding.top;
                break;
            case "left":
                newSize = bounding.right - e.clientX;
                break;
            default:
                break;
        }

        setSize(newSize);
        setCollapse(newSize < stableCollapseSize.current);
    }, [side, setCollapse, stableCollapseSize])

    const startDrag = useDrag(mouseMove);

    // When collapse is set to false, set size to the initial size
    useEffect(() => {
        if (!collapse) {
            setSize(initialSize);
        }
    }, [collapse, initialSize])

    // Whether to change the width or height of the container
    const dimension = side === "left" || side === "right" ? "width" : "height"
    // Override size completely if collapse is set
    const style = {[dimension]: collapse ? minSize : size , [`min${dimension}`]: minSize};
    return (
        <div className={classList("resizable", "resizable--"+side, {"resizable--collapsed": collapse})} style={style} ref={container}>
            {children}
            <div className="resizable__handle" onMouseDown={startDrag}></div>
        </div>
    )
}

export function FancyText(props) {
    /* Appplies twemoji and links */
    const parentRef = useRef();

    const {children, twemoji = true, links = true, ...spanProps} = props;

    // After each render, re-parse
    useEffect(() => {
        if (!parentRef.current) {return}

        if (twemoji) {
            Twemoji.parse(parentRef.current);
        }
        if (links) {
            linkifyElement(parentRef.current, linkifyOptions);
        }
    })

    return (
        <span ref={parentRef} {...spanProps}>
            {children}
        </span>
    )
}

export function Code(props) {
    const parentRef = useRef();

    // After each render, re-parse the styling
    useEffect(() => {
        if (!parentRef.current) {return}

        hljs.highlightElement(parentRef.current);
    })

    const {children, className, ...otherProps} = props;
    return (
        <code className="code codeblock" {...otherProps}>
            <TextCopy text={children}>
                <span className={className} ref={parentRef}>
                    {children}
                </span>
            </TextCopy>
        </code>
    )
}

