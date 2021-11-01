const matrixtoRegex = /^(?:https:\/\/)?(?:www\.)?matrix\.to\/#\/(([!@#+]).+)/i;

export function parseMatrixto(string) {
    const match = matrixtoRegex.exec(string);
    let type;
    let sigil;

    if (match !== null) {
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

    return {match: match !== null, type: type, sigil: sigil}
}
