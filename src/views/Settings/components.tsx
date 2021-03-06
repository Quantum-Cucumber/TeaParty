import "./components.scss";
import { useCallback, useState, useRef, useEffect, useContext } from "react";

import { Loading, Option, Button, TextBox, Avatar } from "../../components/elements";
import { ContextMenu, popupCtx } from "../../components/popups";

import Settings from "../../utils/settings";
import { classList } from "../../utils/utils";
import { useCatchState, useDrag } from "../../utils/hooks";

import Icon from "@mdi/react";
import { mdiChevronDown, mdiImageFilterHdr } from "@mdi/js";

import type { ChangeEvent, ComponentProps } from "react";


export function Section({ name, description, children }: {name?: string, description?: string, children: React.ReactNode}) {
    return (
        <div className="settings__panel__group">
            { name &&
                <div className="settings__panel__group__label">{name}:</div>
            }
            { description &&
                <div className="settings__panel__group__description">
                    {description}
                </div>
            }
            <div className="settings__panel__group__body">
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
                    Array( Math.round((max - min) / interval) + 1 ).fill(null)
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


interface DropDownProps {
    value?: any,
    options: {
        [key: number | string]: OptionType,
    },
    saveFunc: (value: any) => void,  // Not sure if "any" is the right way to do it
    canEdit?: boolean,
    allowCustom?: boolean,
    allowNull?: boolean,
    placeholder?: string,
    number?: boolean,
    min?: number;
    max?: number;
}
type OptionType = {
    text: string,
    icon?: string,
    hidden?: boolean,
}
interface DropDownStringProps extends DropDownProps {
    value?: string,
    options: {
        [key: string]: OptionType,
    },
    saveFunc: (value: string) => void,
    number?: false,
}
interface DropDownNumberProps extends DropDownProps {
    value?: number,
    options: {
        [key: number]: OptionType,
    },
    saveFunc: (value: number) => void,
    number: true,
    min?: number;
    max?: number;
}

export function DropDown(props: DropDownStringProps): JSX.Element;
export function DropDown(props: DropDownNumberProps): JSX.Element;
export function DropDown({value, options, saveFunc, canEdit = true, allowCustom = false, allowNull = false, placeholder = "Unknown value", number = false, min = 0, max = Infinity}: DropDownProps) {
    const [isCustom, setCustom] = useState(false);
    const setPopup = useContext(popupCtx);

    const save = useCallback((newValue) => {
        if (value !== newValue) {
            saveFunc(number ? parseInt(newValue) : newValue);
        }
    }, [value, saveFunc, number]);

    const showOptions = useCallback((e) => {
        setPopup(
            <ContextMenu parent={e.target.closest(".dropdown")} x="align-right" y="align-top">
                {
                    Object.keys(options)
                    .filter((key) => options[key].hidden !== false)  // This allows for values that should be displayed with text, but not show as an option
                    .map((key) => {
                        if (number && (parseInt(key) < min || parseInt(key) > max)) {return null}  // Only show options in the specified range

                        const {text, icon = null} = key in options ? options[key] : {text: allowCustom ? `Custom (${key})` : "Unknown value"};
                        return (
                            <Option compact text={text} k={key} selected={value} key={key} 
                                select={() => {
                                    setPopup(null);
                                    save(number ? parseInt(key) : key);
                                }}
                                icon={icon && <Icon path={icon} color="var(--text)" size="1em"/>}
                            />
                        )
                    })
                }
                { allowNull &&
                    <Option compact text="None"
                        select={() => {
                            setPopup(null);
                            save(null);
                        }}
                    />
                }
                { allowCustom &&
                    <Option compact text="Custom"
                        select={() => {
                            setPopup(null);
                            setCustom(true);
                        }} 
                    />
                }
            </ContextMenu>
        )
    }, [setPopup, options, value, allowNull, allowCustom, number, min, max, save])


    const {text, icon = null} = value in options ? options[value] : {text: allowCustom && value ? `Custom (${value})` : placeholder};
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
                        : undefined
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


type ImageUploadProps = {
    mxcUrl: string,
    onSelect: (mxcUrl: string) => Promise<void>,
    canEdit?: boolean,
}

export function ImageUpload({ mxcUrl, onSelect, canEdit = true }: ImageUploadProps) {
    const [currentMxcUrl, setMxcUrl] = useCatchState(mxcUrl, onSelect);
    const [state, setState] = useState<"loading" | "edit" | "static">(canEdit ? "edit" : "static");
    const inputRef = useRef<HTMLInputElement>();

    useEffect(() => {
        setMxcUrl(mxcUrl, undefined, true);
    }, [mxcUrl, setMxcUrl])

    async function onChange(e: ChangeEvent<HTMLInputElement>) {
        const file = e.target.files[0];

        setState("loading");
        try {
            const newMxcUrl: string = await global.matrix.uploadContent(file, {onlyContentUri: true});
            await setMxcUrl(newMxcUrl);
        }

        finally {
            setState(canEdit ? "edit" : "static");
        }

    }


    let statusElement: JSX.Element;
    switch (state) {
        case "edit":
            statusElement = (
                <div className="image-upload__banner">Edit</div>
            );
            break;
        case "loading":
            statusElement = (
                <div className="image-upload__loading">
                    <Loading size="2em" />
                </div>
            );
            break;
        case "static":
        default:
            statusElement = null;
            break;
    }

    return (
        <div className={classList("image-upload", {"image-upload--disabled": !canEdit})}>
            <div className="image-upload__body" onClick={state === "edit" ? () => inputRef.current?.click() : null}>
                <Avatar mxcUrl={currentMxcUrl} 
                    fallback={
                        <Icon path={mdiImageFilterHdr} size="2em" color="var(--toggle-indicator)" />
                    }
                />
                {statusElement}
            </div>
            { (state === "edit" && currentMxcUrl) &&
                <Button link onClick={() => setMxcUrl(null)}>Remove</Button>
            }
            <input type="file" accept="image/*" className="image-upload__input" onChange={onChange} ref={inputRef} />
        </div>
    )
}