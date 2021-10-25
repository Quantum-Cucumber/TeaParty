import { useState, useEffect, useRef } from 'react';

// Stolen from matrix-org/matrix-react-sdk
function hashCode(str) {
    let hash = 0;
    let i;
    let chr;
    if (str.length === 0) {
        return hash;
    }
    for (i = 0; i < str.length; i++) {
        chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0;
    }
    return Math.abs(hash);
}

const colours = ["blue", "magenta", "aqua", "pink", "orange", "light-blue", "purple", "green"]
export function getUserColour(user_id) {
    return `var(--${colours[hashCode(user_id) % 8]})`
}


export function acronym(text, len = 3) {
    if(!text) {return ""};
    const chars = text.match(/\b([a-z0-9])/gi);
    if (!chars) {return text[0]};
    return chars.slice(0, len).join("").toUpperCase()
}

export function useBindEscape(setState, value) {
    /* Listen for escape key to hide unread indicator */
    useEffect(() => {
        function keyPress(e) {
            if (e.key === "Escape") {
                setState(value);
            }
        }
    
        document.addEventListener("keydown", keyPress);

        return () => {
            document.removeEventListener("keydown", keyPress);
        };
    }, [setState, value]);
}

export function classList(...classes) {
    /* Takes a dict of classNames: bool and outputs a string of the classes that are true */
    var output = [];
    classes.forEach((item) => {
        if (typeof item === "object" && item !== null) {
            Object.keys(item).forEach((className) => {
                if (item[className]) {
                    output.push(className)
                }
            });
        }
        else if (item !== null & item !== undefined) {
            output.push(item)
        }
    });

    // Return space seperated classes, or null if there are no classes to be added
    return output.join(" ") || null;
}


export function debounce(func, timeout) {
    /* Returns a function that will only run once per the timeout period */
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            Promise.resolve(func.apply(this, args));
        }, timeout);
    };
}

export function useDebouncedState(initial, delay) {
    // The pending state to return
    const [queuedState, queueState] = useState(initial);
    // The final state (when the timeout ends)
    const [debouncedState, saveState] = useState(queuedState);
    // Save the timer ID so we can unmount it on unload
    const timerId = useRef();

    useEffect(() => {
        // When the timer ends, save the queued state and return it, otherwise when a new state is queued, cancel the timeout
        timerId.current = setTimeout(() => {
            saveState(queuedState);
        }, delay);

        return () => {
            clearTimeout(timerId.current);
        }
    }, [queuedState, delay])
    // If component is unmounted, clear the timer
    useEffect(() => {
        return () => {clearTimeout(timerId.current)};
    }, [])

    // Appears like useState. The current state value and the function to add to the queue
    return [debouncedState, queueState];
}

export function useStableState(prop) {
    /* Creates a ref that is updated when the prop changes */
    const stableProp = useRef(prop);

    useEffect(() => {
        stableProp.current = prop;
    }, [prop])

    return stableProp
}

export function useDownloadUrl(url) {
    const [blobUrl, setBlobUrl] = useState();
    function download(e) {
        if (!url || blobUrl) {return}
        e.preventDefault();

        mediaToBlob(url)
        .then((blob) => { 
            setBlobUrl(blob)

            e.target.closest("a").click();
        })

    }
    
    useEffect(() => {
        return () => {
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
            }
        }
    }, [blobUrl])

    return [blobUrl, download];
}

export function friendlyList(list, max=null, plural, singular) {
    if (!singular) {singular = plural}
    if (list.length === 0) {return ""}

    if (max !== null && list.length > max) {
        const remainder = list.length - max;
        list.splice(max, remainder, `${remainder} ${remainder === 1 ? "other" : "others"}`)
    }

    if (list.length === 1) {return list[0] + (singular ? ` ${singular}` : "")}

    const last = list.pop();
    return list.join(", ") + ` and ${last}` + (plural ? ` ${plural}` : "");
}

export function bytesToFriendly(bytes) {
    if (isNaN(bytes)) {return "? B"}
    if (bytes < 1000) {return `${bytes} B`}
    const units = ["kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];  // Yottabyte support is crucial

    const power = Math.floor(Math.log(bytes) / Math.log(1000)); // Root 1024
    const value = Math.round(bytes / Math.pow(1000, power) * 100) / 100;  // Math.round(n*100)/100 to get <2 d.p.
    return  `${value} ${units[power - 1]}`;
}

export async function mediaToBlob(url) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } 
    catch {
        return url;
    }
}
