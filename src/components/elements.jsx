import "./elements.scss";
import { Tooltip } from "./popups";
import { classList } from '../utils/utils';
import Icon from '@mdi/react';
import { mdiLoading } from "@mdi/js";


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