import type { Room } from "matrix-js-sdk";
import { EventType } from "matrix-js-sdk/src/@types/event";
import { AclChecker, getHomeserver } from "./matrix-client";

const matrixtoRegex = /^(?:https:\/\/)?(?:www\.)?matrix\.to\/#\/(([!@#+]).+)/i;
const matrixtoBase = "https://matrix.to";

type identifierType = "room" | "user" | "group" | "event";

export function parseMatrixto(url: string) {
    const match = matrixtoRegex.exec(decodeURIComponent(url));
    
    let type: identifierType | null = null;
    let sigil: string | null = null;
    let identifier: string | null = null;

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


export class MatrixtoPermalink {
    user(userId: string) {
        return `${matrixtoBase}/#/${userId}`;
    }

    private getCandidates(roomId: string) {
        /* Wrapper for getCandidates */
        const room: Room = global.matrix.getRoom(roomId);
        const candidates = getCandidates(room);

        return candidates ? "?via=" + candidates.map(encodeURIComponent).join("via=") : "";
    }

    event(roomId: string, eventId: string) {
        const room: Room = global.matrix.getRoom(roomId);
        const alias = room?.getCanonicalAlias();
        if (alias) {
            return `${matrixtoBase}/#/${alias}/${eventId}`;
        }
        else {
            const candidates = this.getCandidates(roomId);
            return `${matrixtoBase}/#/${roomId}/${eventId}${candidates}`;
        }
    }

    room(roomId: string) {
        const room: Room = global.matrix.getRoom(roomId);
        const alias = room?.getCanonicalAlias();
        if (alias) {
            return `${matrixtoBase}/#/${alias}`
        }
        else {
            const candidates = this.getCandidates(roomId);
            return `${matrixtoBase}/#/${roomId}${candidates}`;
        }
    }
}

function getCandidates(room: Room) {
    const candidates: string[] = [];
    const roomAclChecker = new AclChecker(room);

    // Get the user with the highest power level - Candidate 1

    const powerLevelsEvent = room.currentState.getStateEvents(EventType.RoomPowerLevels, "");
    if (powerLevelsEvent?.getContent()?.users) {
        // Get all the set power levels
        const powerLevels: {string: number} = powerLevelsEvent.getContent().users;
        // User must be in the room, not be on a disallowed server and have a power level >= 50
        const validCandidates = Object.entries(powerLevels).filter(([userId, powerLevel]) => {
            const member = room.getMember(userId);
            return (
                (member && member.membership === "join") &&
                roomAclChecker.isAllowed(getHomeserver(userId)) &&
                powerLevel >= 50
            );
        });

        // Find the highest power level
        const highestPowerLevel = validCandidates.reduce((prev: [string, number] | null, current) => {
            return (prev === null || current[1] > prev[1]) ? current : prev;
        }, null)
        if (highestPowerLevel) {
            candidates.push(getHomeserver(highestPowerLevel[0]))
        }
    }

    // Most common server - Candidate (1-)2-3

    const homeservers = {} as {string: number};
    room.getJoinedMembers().forEach((member) => {
        let homeserver = getHomeserver(member.userId);
        if (homeserver in homeservers) {
            homeservers[homeserver] = 0;
        }
        homeservers[homeserver]++;
    });

    // Remove already added candidates from the pool
    candidates.forEach((candidate) => {
        delete homeservers[candidate];
    })

    // Filter out allowed servers and sort by number of members in that homeserver
    const sortedHomeservers = Object.keys(homeservers)
    .filter((homeserver) => {return roomAclChecker.isAllowed(homeserver)})
    .sort((a, b) => {return homeservers[b] - homeservers[a]});

    // Insert the needed number of candidates (2-3) from the list of homeservers by population
    return candidates.concat(
        sortedHomeservers.slice(0, 3 - candidates.length)
    );
}
