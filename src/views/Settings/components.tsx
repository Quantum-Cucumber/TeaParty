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

import type { ChangeEvent, ComponentProps } from "react";


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


type ToggleType = {
    label: string,
    value: boolean,
    saveFunc: (value: boolean) => void,
    canEdit?: boolean,
}

export function Toggle({ label, value, saveFunc, canEdit = true }: ToggleType) {
    return (
        <div className={classList("settings__row", "toggle", {"toggle--disabled": !canEdit})} onClick={canEdit ? () => {saveFunc(!value)} : null}>
            <div className="settings__row__label">
                {label}
            </div>
            <div className={classList("toggle__switch", {"toggle__switch--on": value})}>
                <div className="toggle__switch__indicator"></div>
            </div>
        </div>
    )
}


export function ToggleSetting({ label, setting }: {label: string, setting: string}) {
    /* Directly toggles a boolean setting, interacting with the settings.js util */
    const [state, setState] = useState(Settings.get(setting) as boolean);

    useEffect(() => {
        setState(Settings.get(setting));
    }, [setting])
    
    const save = useCallback((value: boolean) => {
        Settings.update(setting, value);
        setState(value);
    }, [setting])

    return (
        <Toggle label={label} value={state} saveFunc={save} />
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


type TextBoxProps = {
    initialValue?: string,
    placeholder: string,
    multiline?: boolean,
    saveFunc: (value: string) => void,
    focus?: boolean,
    validation?: (value: string) => boolean,
}


type TextInput = HTMLInputElement & HTMLTextAreaElement;

export function TextBox({ initialValue = "", placeholder, multiline = false, focus = false, saveFunc, validation = () => true }: TextBoxProps) {
    const [value, setValue] = useState(initialValue);
    const inputRef = useRef<TextInput>();
    const [valid, setValid] = useState(true);

    // Focus on render if flag is set
    useEffect(() => {
        if(inputRef && focus) {
            inputRef.current.focus()
        }
    }, [focus])

    function save() {
        if (validation(value.trim())) {
            saveFunc(value.trim());
        }
        else {
            setValid(false);
        }
    }

    function onChange(e: ChangeEvent<TextInput>) {
        setValue(e.target.value);
        setValid(true);  // Reset to valid until submitted for validation again
    }

    return (
        <div className="textbox">
            <form
                onSubmit={(e) => {e.preventDefault(); save()}}
            >
                {   multiline ?
                    <textarea className={classList("textbox__input", {"textbox__input--error": !valid})} placeholder={placeholder} value={value} rows={4} onChange={onChange} ref={inputRef} />
                :
                    <input className={classList("textbox__input", {"textbox__input--error": !valid})} type="text" placeholder={placeholder} value={value} onChange={onChange} ref={inputRef} />
                }
            </form>
            <Button path={mdiCheck} clickFunc={save} subClass="textbox__button" tipText="Save" tipDir="right" />
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
    validation?: (value: string) => boolean,
}

export function EditableText({ label, text, subClass = null, saveFunc = () => {}, multiline = false, canEdit = true, validation }: EditTextProps) {
    const [editing, setEditing] = useState(false);

    function save(value: string) {
        setEditing(false);
        if (text !== value) {
            saveFunc(value); 
        }
    }

    return (
        <div className={classList("text-edit", subClass)}>
            { editing && canEdit ?
                <TextBox placeholder={label} initialValue={text} multiline={multiline} saveFunc={save} validation={validation} focus />
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
    value?: any,
    options: {
        [key: number | string]: {
            text: string,
            icon?: string,
        }
    },
    saveFunc: (value: any) => void,  // Not sure if "any" is the right way to do it
    canEdit?: boolean,
    allowCustom?: boolean,
    number?: boolean,
    min?: number;
    max?: number;
}
interface DropDownStringProps extends DropDownProps {
    value?: string,
    options: {
        [key: string]: {
            text: string,
            icon?: string,
        }
    },
    saveFunc: (value: string) => void,
    number: false,
}
interface DropDownNumberProps extends DropDownProps {
    value?: number,
    options: {
        [key: number]: {
            text: string,
            icon?: string,
        }
    },
    saveFunc: (value: number) => void,
    number: true,
    min?: number;
    max?: number;
}

export function DropDown(props: DropDownStringProps): JSX.Element;
export function DropDown(props: DropDownNumberProps): JSX.Element;
export function DropDown({value, options, saveFunc, canEdit = true, allowCustom = false, number = false, min = 0, max = Infinity}: DropDownProps) {
    const [isCustom, setCustom] = useState(false);
    const setPopup: (popup: JSX.Element) => void = useContext(popupCtx);

    const save = useCallback((newValue) => {
        if (value !== newValue) {
            saveFunc(number ? parseInt(newValue) : newValue);
        }
    }, [value, saveFunc, number]);

    const showOptions = useCallback((e) => {
        setPopup(
            <ContextMenu parent={e.target.closest(".dropdown")} x="align-left" y="align-top">
                {
                    Object.keys(options).map((key) => {
                        if (number && (key < min || key > max)) {return null}  // Only show options in the specified range

                        const {text, icon = null} = key in options ? options[key] : {text: allowCustom ? `Custom (${key})` : "Unknown value"};
                        return (
                            <Option compact text={text} k={key} selected={value} key={key} 
                                select={() => {
                                    setPopup(null);
                                    save(number ? parseInt(key) : key);
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
    }, [setPopup, options, value, allowCustom, number, min, max, save])


    const {text, icon = null} = value in options ? options[value] : {text: allowCustom && value ? `Custom (${value})` : "Unknown value"};
    return (
        isCustom ? 
            <div className="dropdown__custom">
                <TextBox placeholder="Custom" focus
                    saveFunc={(value) => {
                        setCustom(false);
                        save(value);
                    }}
                    validation={
                        number ? ((value) => {
                            const asInt = parseInt(value, 10);
                            return !isNaN(asInt) && asInt >= min && asInt <= max;
                        })
                        : null
                    }
                />
            </div>
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
    )
}


interface DropDownRowProps extends ComponentProps<typeof DropDown> {
    label: string,
}

export function DropDownRow({ label, ...dropdownProps }: DropDownRowProps) {
    return (
        <div className="settings__row">
            <div className="settings__row__label">
                {label}
            </div>
            <DropDown {...dropdownProps} />
        </div>
    )
}
