import Icon from '@mdi/react';
import "./components.scss";
import { mdiLoading } from "@mdi/js";
import { useState, cloneElement } from 'react';

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
        <Icon path={mdiLoading} color="var(--text)" size={size} spin={1.2}/>
    );
}

export function Tooltip({ text, dir, children }) {
    const [visible, setVisible] = useState(false);

    // Can only have a single child
    if (Array.isArray(children)) {
        console.warn("Tooltip component can only have one child element");
        return null;
    }
    
    // Add listeners for all children (generally should be one child)
    children = cloneElement(children, {
        onMouseLeave: () => {setVisible(false)},
        onMouseEnter: () => {setVisible(true)},
    });

    return (
        <>
            {children}
            <div className={`tooltip tooltip--${dir} ${visible ? "tooltip--visible" : ""}`}>{text}</div>
        </>
    );
}

export function Option({ k, text, selected, select, children }) {
    return (
        <div className={"option" + (selected === k ? " option--selected" : "")} onClick={() => select(k)}>
            {children}
            <div className="option__text">{text}</div>
        </div>
    );
}
