// Stolen from matrix-org/matrix-react-sdk
function hashCode(str: string) {
    let hash = 0;
    let i: number;
    let chr: number;
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
export function getUserColour(userId: string) {
    return `var(--${colours[hashCode(userId) % 8]})`
}


export function acronym(text: string, len = 3) {
    if(!text) {return ""};
    const chars = text.match(/\b([a-z0-9])/gi);
    if (!chars) {return text[0]};
    return chars.slice(0, len).join("").toUpperCase()
}


export function classList(...classes: (string | {[key: string]: boolean} | null | undefined)[]) {
    /* Takes a dict of classNames: bool and outputs a string of the classes that are true */
    var output: string[] = [];
    classes.forEach((item) => {
        if (typeof item === "object") {
            if (item !== null) {
                Object.keys(item).forEach((className) => {
                    if (item[className]) {
                        output.push(className)
                    }
                });
            }
        }
        else if (item !== null && item !== undefined) {
            output.push(item)
        }
    });

    // Return space seperated classes, or null if there are no classes to be added
    return output.join(" ") || null;
}

export function debounce(func: Function, timeout: number) {
    /* Returns a function that will only run once per the timeout period */
    let timer: NodeJS.Timer;
    return function(this: any, ...args: any) {
        clearTimeout(timer);
        timer = setTimeout(() => {
            Promise.resolve(func.apply(this, args));
        }, timeout);
    };
}

export function asyncDebounce<F extends Function>(func: F, timeout: number): F {
    /* debounce, but returns a promise */
    let timer: NodeJS.Timer;
    function asyncTimeout() {
        return new Promise(resolve => {
            timer = setTimeout(resolve, timeout);
        });
    }

    return async function(this: any, ...args: any[]) {
        clearTimeout(timer);
        await asyncTimeout();
        await func(...args);
    } as any;
}

export function friendlyList(list: string[], max=null, plural?: string, singular?: string) {
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

export function bytesToFriendly(bytes: number) {
    if (isNaN(bytes)) {return "? B"}
    if (bytes < 1000) {return `${bytes} B`}
    const units = ["kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];  // Yottabyte support is crucial

    const power = Math.floor(Math.log(bytes) / Math.log(1000)); // Root 1024
    const value = Math.round(bytes / Math.pow(1000, power) * 100) / 100;  // Math.round(n*100)/100 to get <2 d.p.
    return  `${value} ${units[power - 1]}`;
}

export async function mediaToBlob(url: string) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } 
    catch {
        return url;
    }
}

export function stringSize(value: string) {
    /* Number of bytes of a string */
    return new Blob([value]).size
}
