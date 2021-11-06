const matrixtoRegex = /^(?:https:\/\/)?(?:www\.)?matrix\.to\/#\/(([!@#+]).+)/i;

export function parseMatrixto(url) {
    const match = matrixtoRegex.exec(decodeURIComponent(url));
    
    let type;
    let sigil;
    let identifier;

    if (match !== null) {
        identifier = match[1];
        sigil = match[2];

        switch (sigil) {
            case "@":
                type = "user";
                break;
            case "#":
            case "!":
                type = "room";
                break;
            case "+":
                type = "group";
                break;
            default:
                break;
        }

        if (type === "room" && match[1].includes("/$")) {
            type = "event";
        }
    }

    return {match: match !== null, type: type, sigil: sigil, identifier: identifier}
}


export const linkifyOptions = {
    target: "_blank",
    rel: "noopener noreferrer",
    defaultProtocol: "https",

}
