import { useReducer } from "react";
import { useEffect } from "react/cjs/react.development";
import Settings from "../../utils/settings";
import { classList } from "../../utils/utils";

export function Section({ name, children }) {
    return (
        <div className="settings__panel__group">
            <div className="settings__panel__group__label">{`${name}:`}</div>
            <div className="settings__panel__group__options">
                {children}
            </div>
        </div>
    );
}

export function Toggle({ label, setting }) {
    /* Directly toggles a boolean setting, interacting with the settings.js util */
    const [state, toggleState] = useReducer((current) => {return !current}, Settings.get(setting));

    useEffect(() => {
        Settings.update(setting, state);
    }, [setting, state])

    return (
        <div className="settings__toggle" onClick={toggleState}>
            <div className="settings__toggle__label">
                {label}
            </div>
            <div className={classList("settings__toggle__switch", {"settings__toggle__switch--on": state})}>
                <div className="settings__toggle__switch__indicator"></div>
            </div>
        </div>
    )
}
