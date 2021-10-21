import "./wrappers.scss";
import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "./elements";
import { classList } from "../utils/utils";
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
        <Button subClass="copy-text__button" path={mdiContentCopy} size="100%" tipDir="top" tipText={tooltip} clickFunc={copyText} />
        </div>
    )
}

export function Resize({ children, initialSize, side, minSize = "0px", collapseSize = 0, collapseState }) {
    const [dragging, setDrag] = useState(false);
    const [size, setSize] = useState(initialSize);
    const container = useRef();

    // If collapseState isn't passed, use our own state
    const backupCollapseState = useState(false);
    const [collapse, setCollapse] = collapseState ? collapseState : backupCollapseState;

    // Fires when the slider is clicked
    function mouseDown(e) {
        e.preventDefault();  // Prevent text selection
        setDrag(true);
    }
    // Fires when the mouse is released
    const mouseUp = useCallback(() => {
        setDrag(false)
    }, [setDrag])

    const mouseMove = useCallback((e) => {
        if (!container.current) {return}

        // Distance between the container's offset and the mouse as the width
        const bounding = container.current.getBoundingClientRect();
        switch (side) {
            case "top":
                setSize(bounding.bottom - e.clientY);
                break;
            case "right":
                setSize(e.clientX - bounding.left);
                break;
            case "bottom":
                setSize(e.clientY - bounding.top);
                break;
            case "left":
                setSize(bounding.right - e.clientX);
                break;
            default:
                break;
        }
    }, [side])

    // When size changes, check whether it should be collapsed due to being less than collapseSize
    useEffect(() => {
        setCollapse(size < collapseSize);
    }, [size, collapseSize, setCollapse])
    // When collapse is set to false, set size to initial
    useEffect(() => {
        if (!collapse) {
            setSize(initialSize)
        }
    }, [collapse, initialSize])

    // When the mouse is clicking the slider, bind the mousemove event. Unbind if that value changes
    useEffect(() => {
        if (!container.current) {return}

        if (dragging) {
            document.addEventListener("mousemove", mouseMove)
            document.addEventListener("mouseup", mouseUp)
        } else {
            document.removeEventListener("mousemove", mouseMove)
            document.removeEventListener("mouseup", mouseUp)
        }
    }, [dragging, mouseMove, mouseUp])
    // Remove listeners on unmount
    useEffect(() => {
        return () => {
            document.removeEventListener("mousemove", mouseMove)
            document.removeEventListener("mouseup", mouseUp)
        }
    }, [mouseMove, mouseUp])

    // Whether to change the width or height of the container
    const dimension = side === "left" || side === "right" ? "width" : "height"
    const style = {[dimension]: collapse ? minSize : size , [`min${dimension}`]: minSize};
    return (
        <div className={classList("resizable", "resizable--"+side, {"resizable--collapsed": collapse})} style={style} ref={container}>
            {children}
            <div className="resizable__handle" onMouseDown={mouseDown}></div>
        </div>
    )
}