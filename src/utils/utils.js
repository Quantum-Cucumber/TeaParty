import { useEffect } from 'react';

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
        if (typeof item === "object") {
            Object.keys(item).forEach((className) => {
                if (item[className]) {
                    output.push(className)
                }
            });
        } 
        else if (item !== null) {
            output.push(item)
        }
    });

    // Return space seperated classes, or null if there are no classes to be added
    return output.join(" ") || null;
}

