
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
    return text.match(/\b([a-z0-9])/gi).slice(0, len).join("").toUpperCase()
}