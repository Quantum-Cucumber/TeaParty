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

export function Resize({ children, initialSize, side, minSize = "0px", collapseSize = 0 }) {
    const [dragging, setDrag] = useState(false);
    const [size, setSize] = useState(initialSize);
    const container = useRef();

    function mouseDown(e) {
        e.preventDefault();
        setDrag(true);
    }
    const mouseUp = useCallback(() => {
        setDrag(false)
    }, [setDrag])

    const mouseMove = useCallback((e) => {
        if (!container.current) {return}

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
    }, [setSize, side])

    useEffect(() => {
        if (!container.current) {return}

        if (dragging) {
            document.addEventListener("mousemove", mouseMove)
            document.addEventListener("mouseup", mouseUp)
        }

        return () => {  // Will fire when dragging changes
            document.removeEventListener("mousemove", mouseMove)
            document.addEventListener("mouseup", mouseUp)
        }
    }, [dragging, mouseMove, mouseUp])


    const dimension = side === "left" || side === "right" ? "width" : "height"
    const collapse = size < collapseSize;
    const style = {[dimension]: collapse ? minSize : size , [`min${dimension}`]: minSize};
    return (
        <div className={classList("resizable", "resizable--"+side, {"resizable--collapsed": collapse})} style={style} ref={container}>
            {children}
            <div className="resizable__handle" onMouseDown={mouseDown}></div>
        </div>
    )
}