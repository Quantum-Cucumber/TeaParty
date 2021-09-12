import * as matrixsdk from "matrix-js-sdk";

const localpart_regex = /@(.*?):/

export const logged_in = () => { return localStorage.getItem("token") !== null };

async function discover_base_url(homeserver) {
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
    try {
        const response = await fetch(url);
        if (!response.ok) { throw response.statusText };

        const data = await response.json();
        return data["m.homeserver"].base_url;
    } catch (e) {
        throw e;
    }
}

export async function attemptLogin(username, homeserver, password) {
    /* Connect to the homeserver base_url and login with username/password*/

    console.info("Attempting log in...")
    const base_url = await discover_base_url(homeserver);
    console.info("Found base url: " + base_url);

    const client = matrixsdk.createClient(base_url)
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
    if (response.hasOwnProperty("well_known")) {
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

    let opts = { indexedDB: window.indexedDB, localStorage: window.localStorage };
    let store = new matrixsdk.IndexedDBStore(opts);
    await store.startup()
    console.info("Started IndexedDB");

    global.matrix = matrixsdk.createClient({
        accessToken: token, userId: user_id, baseUrl: base_url, store: store, deviceId: device_id,
    })
    await global.matrix.startClient();
}

export function get_username(user) {
    /* Gets the localpart of the user ID or their displayname if set */
    const localpart = user.userId.match(localpart_regex)[1];
    return user.displayName ? user.displayName : localpart;
}
export function get_homeserver(user) {
    /* Split user ID at first : to get homeserver portion */
    return user.userId.split(/:(.+)/)[1];
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

export function tryGetUser(userId) {
    /* Sometimes the user mightn't be cached, so make a pretend user object */

    var user = global.matrix.getUser(userId);
    if (!user) {
        user = {displayName: userId, userId: userId};
    }

    return user;
}
