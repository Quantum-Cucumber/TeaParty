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
        <Icon path={mdiLoading} color="var(--primary)" size={size} spin={1.2}/>
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
