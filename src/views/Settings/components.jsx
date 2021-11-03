import { useCallback, useReducer, useState, useRef, useEffect } from "react";
import Settings from "../../utils/settings";
import { classList } from "../../utils/utils";
import { useDrag } from "../../utils/hooks";

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

const clamp = (min, value, max) => Math.min(Math.max(value, min), max);

export function Slider({label, setting, min, max, interval, units}) {
    const [current, setCurrent] = useState(Settings.get(setting));
    const barRef = useRef();

    useEffect(() => {
        Settings.update(setting, current);
    }, [setting, current])

    const snapValue = useCallback((value) => {
        // Value between 0 and 1
        const range = (max - min);
        const factor = interval / range;
        return range * Math.round(value / factor) * factor + min
    }, [min, max, interval])

    const mouseMove = useCallback((e) => {
        if (!barRef.current) {return}  // Shouldn't happen but just to be safe

        const x = e.clientX;
        const barBox = barRef.current.getBoundingClientRect();

        // Calc mouse position on slider as value between 0 and 1
        const perc = clamp(0, (x - barBox.left) / (barBox.right - barBox.left), 1);
        // Translate the percentage into a valid interval point in the given range
        setCurrent(snapValue(perc));
    }, [barRef, snapValue]);

    const startDrag = useDrag(mouseMove);

    return (
        <div className="settings__slider">
            <div className="settings__slider__labels">
                <div>{label}</div>
                <div className="settings__slider__labels--right">{current}{units}</div>
            </div>

            <div className="settings__slider__bar" ref={barRef} onMouseDown={startDrag}>
                <div className="settings__slider__bar__indicator" style={{left: `${ (current - min) / (max - min) * 100 }%`}}></div>
            </div>

            <div className="settings__slider__labels settings__slider__labels--greyed">
                <div>{min}{units}</div>
                <div className="settings__slider__labels--right">{max}{units}</div>
            </div>
        </div>
    )
}
