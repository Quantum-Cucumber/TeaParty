import Icon from '@mdi/react';
import "./components.scss";
import { mdiLoading } from "@mdi/js";

export function Button({ path, clickFunc, subClass, size=null }) {
    return (
        <div className={subClass} onClick={clickFunc}>
            <Icon path={path} className="mdi-icon" size={size} />
        </div>
    );
}

export function Loading({ size }) {
    return (
        <Icon path={mdiLoading} color="var(--content)" size={size} spin={1.2}/>
    );
}
