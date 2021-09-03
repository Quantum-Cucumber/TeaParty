import Icon from '@mdi/react';
import "./components.css";

export function Button({ path, clickFunc, subClass, size=null }) {
    return (
        <div className={subClass} onClick={clickFunc}>
            <Icon path={path} className="mdi-icon" size={size} />
        </div>
    );
}