import * as matrix from "matrix-js-sdk";

export const logged_in = () => {return localStorage.getItem("token") !== null};

async function discover_base_url(homeserver) {
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
        if (!response.ok) {throw response.statusText};

        const data = await response.json();
        return data["m.homeserver"].base_url;
    } catch (e) {
        throw e;
    }
}

export async function login_client(username, homeserver, password) {
    console.log("Attempting log in...")
    const base_url = await discover_base_url(homeserver);
    console.log("Found base url: " + base_url);

    const client = matrix.createClient(base_url)
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
