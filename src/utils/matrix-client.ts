import * as matrixsdk from "matrix-js-sdk";
import { EventType } from "matrix-js-sdk/lib/@types/event";
import globToRegexp from "glob-to-regexp";

import type { MatrixEvent, Room, RoomMember, User } from "matrix-js-sdk";
import type { IStore } from "matrix-js-sdk/lib/store";

export const logged_in = () => { return localStorage.getItem("token") !== null };

export const userIdRegex = /^@\S+:\S+$/;
export const roomIdRegex = /^!\S+:\S+$/;
export const aliasRegex = /^#\S+:\S+$/;

async function discover_base_url(homeserver: string): Promise<string> {
    /* Query the selected homeserver to get the base_url */

    // Format homeserver url
    homeserver = homeserver.trim();
    // Add protocol
    if (!homeserver.startsWith("https://")) {
        homeserver = "https://" + homeserver;
    }
    // Remove trailing slash
    if (homeserver.endsWith("/")) {
        homeserver = homeserver.substr(0, homeserver.length - 1);
    }

    const url = homeserver + "/.well-known/matrix/client";
    const response = await fetch(url);
    if (!response.ok) { throw response.statusText }

    const data: object = await response.json();
    return data["m.homeserver"].base_url;
}

export async function attemptLogin(username: string, homeserver: string, password: string) {
    /* Connect to the homeserver base_url and login with username/password*/

    console.info("Attempting log in...")
    const base_url = await discover_base_url(homeserver);
    console.info("Found base url: " + base_url);

    const client = matrixsdk.createClient({
        baseUrl: base_url,
        unstableClientRelationAggregation: true,
    })
    const response = await client.login("m.login.password", {
        identifier: {
            type: "m.id.user",
            user: username
        },
        password: password,
        initial_device_display_name: "TeaParty Web",
    });

    localStorage.setItem("token", response.access_token);
    localStorage.setItem("device_id", response.device_id);
    if ("well_known" in response) {
        localStorage.setItem("base_url", response.well_known["m.homeserver"].base_url);
    } else {
        localStorage.setItem("base_url", base_url);
    }
    localStorage.setItem("user_id", response.user_id);

    console.info("Logged in as: " + response.user_id);
}

export async function buildMatrix() {
    /* Build the matrix client via the localStorage components and assign to global variable */

    const token = localStorage.getItem("token");
    if (!token) {throw new Error("No token was saved")}
    const user_id = localStorage.getItem("user_id");
    if (!token) {throw new Error("No user ID was saved")}
    const base_url = localStorage.getItem("base_url");
    if (!token) {throw new Error("No homeserver url was saved")}
    const device_id = localStorage.getItem("device_id");
    if (!token) {throw new Error("No homeserver url was saved")}

    const opts = { indexedDB: window.indexedDB, localStorage: window.localStorage };
    const store = new matrixsdk.IndexedDBStore(opts);
    await store.startup()
    console.info("Started IndexedDB");

    global.matrix = matrixsdk.createClient({
        accessToken: token, userId: user_id, baseUrl: base_url, deviceId: device_id, 
        store: store as IStore, unstableClientRelationAggregation: true, timelineSupport: true,
    })
    await global.matrix.startClient();
}

export async function logoutMatrix() {
    // Stop client if started
    if (global.matrix !== undefined) {
        global.matrix.stopClient();
        await global.matrix.clearStores()
    }

    // Clear storage
    localStorage.clear();

    window.location.reload();
}

export function tryGetUser(userId: string) {
    /* Sometimes the user mightn't be cached, so make a pretend user object */
    const user: User = global.matrix.getUser(userId);
    if (!user) {
        return {displayName: userId, userId: userId};
    }

    return user;
}

export function getMember(roomId: string, userId: string) {
    const room: Room = global.matrix.getRoom(roomId);
    const member: RoomMember | null = room?.getMember(userId);
    return member;
}
// These two mimic matrix-js-sdk's way of extracting this info
export function getLocalpart(user: User) {
    return user.userId.split(":")[0].substring(1);
}
export function getHomeserver(userId: string) {
    /* Split user ID at first : to get homeserver portion */
    return userId.replace(/^.*?:/, "");
}

export function powerLevelText(userId: string, roomId: string) {
    const room: Room = global.matrix.getRoom(roomId);
    const member = room.getMember(userId);

    const powerLevel = member?.powerLevel;
    if (powerLevel !== undefined) {
        if (powerLevel >= 100) {
            return `Admin (${powerLevel})`;
        } 
        else if (powerLevel >= 50) {
            return `Moderator (${powerLevel})`;
        }
        else if (powerLevel >= 0) {
            return `User (${powerLevel})`;
        } 
        else {return powerLevel.toString()}
    }
    else {
        return "Unknown";
    }
}

export function getMembersRead(event: MatrixEvent) {
    const eventId = event.getId();
    const room: Room = global.matrix.getRoom(event.getRoomId());
    const roomEvents = [...room.getLiveTimeline().getEvents()];
    roomEvents.reverse();  // Newest event first

    let readUpTo: string[] = [];
    for (let i=0; i < roomEvents.length; i++) {  // Progress through timeline
        readUpTo.push(...room.getReceiptsForEvent(roomEvents[i]).map((receipt) => receipt.userId))  // Add each user to array
        // This event's author has likely read the events above it
        // Primarily for events the current user sent
        readUpTo.push(roomEvents[i].getSender());
        if (eventId === roomEvents[i].getId()) {break}  // Stop loop when we find the event
    }
    readUpTo = [...new Set(readUpTo)];  // Dedup array

    return readUpTo.map((read) => {
        return room.getMember(read);
    })
}

export async function getEventById(roomId: string, eventId: string) {
    const room: Room = global.matrix.getRoom(roomId);
    const event = room.findEventById(eventId);

    if (!event) {
        // Gets an event via an api call if needed
        await global.matrix.getEventTimeline(room.getUnfilteredTimelineSet(), eventId);
    }
    return room.findEventById(eventId);
}

export class AclChecker {
    room: matrixsdk.Room;
    allowedServers: RegExp[];
    disallowedServers: RegExp[];
    constructor(room: Room) {
        this.room = room;
        this.allowedServers = [];
        this.disallowedServers = [];

        this.process();
    }

    private process() {
    // Load allowed/denied servers
        const aclState = this.room.currentState.getStateEvents(EventType.RoomServerAcl, "");
        if (aclState) {
            const allow: string[] = aclState.getContent().allow || [];
            allow.forEach((rule) => {
                this.allowedServers.push(aclGlobToRegex(rule))
            })

            const deny: string[] = aclState.getContent().deny || [];
            deny.forEach((rule) => {
                this.disallowedServers.push(aclGlobToRegex(rule))
            })
        }
        else {
            this.allowedServers = [/^.*$/];
        }
    }

    isAllowed(homeserver: string) {
        const isInAllowed = this.allowedServers.some((rule) => rule.test(homeserver));
        const isInDisallowed = this.disallowedServers.some((rule) => rule.test(homeserver));
        return isInAllowed && !isInDisallowed;
    }
}

function aclGlobToRegex(rule: string) {
    const regex: RegExp = globToRegexp(rule, {extended: false, globstar: false});
    const regexStr: string = regex.toString().replace(/\\\?/g, ".");
    // Conver to regex & strip beginning and trailing /
    return new RegExp(regexStr.substring(1, regexStr.length - 1));
}
