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

export async function attempt_login(username, homeserver, password) {
    /* Connect to the homeserver base_url and login with username/password*/

    console.log("Attempting log in...")
    const base_url = await discover_base_url(homeserver);
    console.log("Found base url: " + base_url);

    const client = matrixsdk.createClient(base_url)
    const response = await client.loginWithPassword(username, password);

    localStorage.setItem("token", response.access_token);
    localStorage.setItem("device_id", response.device_id);
    if (response.hasOwnProperty("well_known")) {
        localStorage.setItem("base_url", response.well_known["m.homeserver"].base_url);
    } else {
        localStorage.setItem("base_url", base_url);
    }
    localStorage.setItem("user_id", response.user_id);

    console.log("Logged in as: " + response.user_id);
}

export async function build_matrix() {
    /* Build the matrix client via the localStorage components and assign to global variable */

    const token = localStorage.getItem("token");
    const user_id = localStorage.getItem("user_id");
    const base_url = localStorage.getItem("base_url");
    console.log(token, user_id, base_url);

    let opts = { indexedDB: window.indexedDB, localStorage: window.localStorage };
    let store = new matrixsdk.IndexedDBStore(opts);
    await store.startup()
    console.log("Started IndexedDB");

    global.matrix = matrixsdk.createClient({
        accessToken: token, userId: user_id, baseUrl: base_url, store: store
    })
    global.matrix.startClient();
}

export function get_username(user) {
    console.log(user);
    /* Gets the localpart of the user ID or their displayname if set */
    const localpart = user.userId.match(localpart_regex)[1];
    return user.displayName ? user.displayName : localpart;
}
export function get_homeserver(user) {
    /* Split user ID at first : to get homeserver portion */
    return user.userId.split(/:(.+)/)[1];
}
