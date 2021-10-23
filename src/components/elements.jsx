import "./elements.scss";
import { Tooltip } from "./popups";
import { classList } from '../utils/utils';
import Icon from '@mdi/react';
import { mdiChevronDown, mdiLoading } from "@mdi/js";
import { useReducer } from "react";


export function Button({ path, clickFunc, subClass, size=null, tipDir, tipText }) {
    return (
        <div className={classList("button", subClass)} onClick={clickFunc}>
            {tipText ?
                <Tooltip text={tipText} dir={tipDir}>
                    <Icon path={path} className="button__icon" size={size} />
                </Tooltip> 
                :
                <Icon path={path} className="button__icon" size={size} />
            }
        </div>
    );
}

export function Loading({ size }) {
    return (
        <Icon path={mdiLoading} color="var(--primary)" size={size} spin={1.2}/>
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

export function DropDown({ icon, text, children }) {
    const [open, toggleOpen] = useReducer((current) => !current, false);

    return (
        <div className="dropdown-wrapper">
            <div className="dropdown" onClick={toggleOpen}>
                <Icon path={mdiChevronDown} color={open ? "var(--text)" : "var(--text-greyed)"} size="1.5rem" className="dropdown__chevron" rotate={open ? 0 : -90} />
                { icon }
                <div className="dropdown__text">{text}</div>
            </div>
            { open &&
                <div className="dropdown__content">
                    {children}
                </div>
            }
        </div>
    )
}