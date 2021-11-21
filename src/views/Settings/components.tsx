import "./components.scss";
import { useCallback, useState, useRef, useEffect, useContext } from "react";

import { Button, Option } from "../../components/elements";
import { FancyText } from "../../components/wrappers";
import { ContextMenu, popupCtx } from "../../components/popups";

import Settings from "../../utils/settings";
import { classList } from "../../utils/utils";
import { useDrag } from "../../utils/hooks";

import Icon from "@mdi/react";
import { mdiCheck, mdiChevronDown, mdiPencil } from "@mdi/js";


export function Section({ name, children }: {name?: string, children: React.ReactNode}) {
    return (
        <div className="settings__panel__group">
            { name &&
                <div className="settings__panel__group__label">{name}:</div>
            }
            <div className="settings__panel__group__options">
                {children}
            </div>
        </div>
    );
}

export function Toggle({ label, setting }: {label: string, setting: string}) {
    /* Directly toggles a boolean setting, interacting with the settings.js util */
    const [state, setState] = useState(Settings.get(setting) as boolean);

    useEffect(() => {
        setState(Settings.get(setting));
    }, [setting])
    
    useEffect(() => {
        Settings.update(setting, state);
        console.log(setting, Settings.get(setting), state)
    }, [setting, state])

    return (
        <div className="settings__row toggle" onClick={() => {console.log("click"); setState(current => !current)}}>
            <div className="settings__row__label">
                {label}
            </div>
            <div className={classList("toggle__switch", {"toggle__switch--on": state})}>
                <div className="toggle__switch__indicator"></div>
            </div>
        </div>
    )
}

const clamp = (min: number, value: number, max: number) => Math.min(Math.max(value, min), max);

type SliderProps = {
    label: string,
    setting: string,
    min: number,
    max: number,
    interval: number,
    units: string,
}

export function Slider({label, setting, min, max, interval, units}: SliderProps) {
    const [current, setCurrent] = useState<number>(Settings.get(setting));
    const barRef = useRef<HTMLDivElement>();

    useEffect(() => {
        Settings.update(setting, current);
    }, [setting, current])

    const snapValue = useCallback((value: number) => {
        // value must be between 0 and 1
        const range = (max - min);
        const factor = interval / range;
        return range * Math.round(value / factor) * factor + min
    }, [min, max, interval])

    const mouseMove = useCallback((e: MouseEvent) => {
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
        <div className="slider">
            <div className="slider__labels">
                <div>{label}</div>
                <div className="slider__labels--right">{current}{units}</div>
            </div>

            <div className="slider__bar" ref={barRef} onMouseDown={startDrag}>
                {
                    // Array with null values, with the appropriate number of steps
                    Array.apply(null, Array( Math.round((max - min) / interval) + 1 ))
                    .map((_: null, index: number) => {
                        const perc = (index * interval) / (max - min) * 100;
                        return (
                            <div className="slider__bar__marker" style={{left: `calc(${perc}% - (var(--width) / 2))`}} key={perc}></div>
                        )
                    })
                }

                <div className="slider__bar__fill" style={{width: `calc( ${ (current - min) / (max - min) * 100 }%`}}></div>
                <div className="slider__bar__indicator" style={{left: `calc( ${ (current - min) / (max - min) * 100 }% - (var(--width) / 2) )`}}></div>
            </div>
        </div>
    )
}


type EditTextProps = {
    label: string,
    text: string,
    subClass?: string,
    saveFunc?: (value: string) => void;
    multiline?: boolean,
    canEdit?: boolean,
}

export function EditText({ label, text, subClass = null, saveFunc = () => {}, multiline = false, canEdit = true }: EditTextProps) {
    const [editing, setEditing] = useState(false);
    const [editedText, setEditedText] = useState(text);
    const [textboxRef, setTextboxRef] = useState<HTMLElement>();

    // If value changes externally, update current state
    useEffect(() => {
        setEditedText(text);
    }, [text])

    function save() {
        setEditing(false);
        if (text !== editedText) {
            saveFunc(editedText); 
        }
    }

    // When the textbox is rendered, focus it
    useEffect(() => {
        if (textboxRef) {
            textboxRef.focus();
        }
    }, [textboxRef])

    return (
        <div className={classList("text-edit", subClass)}>
            { editing && canEdit ?
                <>
                    <form onSubmit={(e) => {
                            e.preventDefault();
                            save()
                        }}
                    >
                        {   multiline ?
                            <textarea className="text-edit__input" placeholder={label} value={editedText} rows={4} onChange={(e) => {setEditedText(e.target.value)}} ref={setTextboxRef} />
                        :
                        <input className="text-edit__input" type="text" placeholder={label} value={editedText} onChange={(e) => {setEditedText(e.target.value)}} ref={setTextboxRef} />
                        }
                    </form>
                    <Button path={mdiCheck} clickFunc={save} subClass="text-edit__button" tipText="Save" tipDir="right" />
                </>
            :
                <>
                    <FancyText className={classList("text-edit__current", {"text-edit__current--multiline": multiline}, {"text-edit__current--placeholder": !text})}>
                        {text || label}
                    </FancyText>
                    { canEdit &&
                        <Button path={mdiPencil} clickFunc={() => {setEditing(true)}} subClass="text-edit__button" tipText="Edit" tipDir="right" />
                    }
                </>
            }
        </div>
    )
}



interface DropDownProps {
    label: string,
    value: string,
    options: {
        [key: string | number]: {
            text: string,
            icon?: string,
        }
    },
    saveFunc?: (value: any) => void,  // Not sure if "any" is the right way to do it
    canEdit?: boolean,
    allowCustom?: boolean,
    number?: boolean,
}
interface DropDownStringProps extends DropDownProps {
    options: {
        [key: string]: {
            text: string,
            icon?: string,
        }
    },
    saveFunc?: (value: string) => void,
    number?: false,
}
interface DropDownNumberProps extends DropDownProps {
    options: {
        [key: number]: {
            text: string,
            icon?: string,
        }
    },
    saveFunc?: (value: number) => void,
    number: true,
}

export function DropDown(props: DropDownStringProps): JSX.Element;
export function DropDown(props: DropDownNumberProps): JSX.Element;
export function DropDown({ label, value, options, saveFunc = () => {}, canEdit = true, allowCustom = false, number = false }: DropDownProps) {
    const [isCustom, setCustom] = useState(false);
    const [customValue, setCustomValue] = useState("");
    const setPopup: (popup: JSX.Element) => void = useContext(popupCtx);


    const showOptions = useCallback((e) => {
        setPopup(
            <ContextMenu parent={e.target.closest(".dropdown")} x="align-left" y="align-top">
                {
                    Object.keys(options).map((key) => {
                        const {text, icon = null} = key in options ? options[key] : {text: allowCustom ? `Custom (${key})` : "Unknown value"};
                        return (
                            <Option compact text={text} k={key} selected={value} key={key} 
                                select={() => {
                                    setPopup(null);
                                    saveFunc(number ? parseInt(key) : key);
                                }}
                            >
                                {icon && 
                                    <Icon path={icon} color="var(--text)" size="1em"/>
                                }
                            </Option>
                        )
                    })
                }
                {   allowCustom &&
                    <Option compact text="Custom"
                        select={() => {
                            setPopup(null);
                            setCustom(true);
                        }} 
                    />
                }
            </ContextMenu>
        )
    }, [setPopup, options, value, saveFunc, allowCustom, number])


    const {text, icon = null} = value in options ? options[value] : {text: allowCustom ? `Custom (${value})` : "Unknown value"};
    return (
        <div className="settings__row">
            <div className="settings__row__label">
                {label}
            </div>
            
            { isCustom ? 
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        setCustom(false);
                        saveFunc(customValue);
                    }}
                >
                    <input className="dropdown--custom__input text-edit__input" type={number ? "number" : "text"} placeholder="Custom" value={customValue} 
                        onChange={(e) => {
                            setCustomValue(e.target.value)
                        }}
                    />
                </form>
            :
                <div className={classList("dropdown", {"dropdown--disabled": !canEdit})} onClick={canEdit ? (e) => showOptions(e) : null}>
                    { icon && <Icon path={options[value].icon} color="var(--text)" size="1em" /> }
                    <div className="dropdown__value">
                        {text}
                    </div>
                    { canEdit &&
                        <Icon path={mdiChevronDown} color="var(--text)" size="1em" />
                    }
                </div>
            }
        </div>
    )
}
