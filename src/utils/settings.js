import { EventEmitter } from "events";

const default_settings = {
    theme: "dark",
    groupBreadcrumbs: {},

    collapseGroups: false,
    showRoomIcons: true,
    circularAvatars: false,

    devMode: false,

    showRedactedEvents: false,
    showJoinEvents: false,
    showLeaveEvents: false,
    showRoomEdits: false,
}

export function isEventVisibility(settingName) {
    switch (settingName) {
        case "showRedactedEvents":
        case "showJoinEvents":
        case "showLeaveEvents":
        case "showRoomEdits":
            return true;
        default:
            return false;
    }
}

class SettingsManager extends EventEmitter {
    constructor() {
        super();
        this.settings = {};
        this._loadSettings();
    }

    _loadSettings() {
        const settings = localStorage.getItem("settings");
        this.settings = settings ? JSON.parse(settings) : {};
    }

    get(key) {
        return this.settings.hasOwnProperty(key) ? this.settings[key] : default_settings[key];
    }
    
    update(key, value) {
        // If value is undefined, just broadcast the value rather than setting it too
        if (value !== undefined) {
            this.settings[key] = value;
            localStorage.setItem("settings", JSON.stringify(this.settings));
        }
        this.emit("settingUpdate", key, value);
    }
}

const Settings = new SettingsManager();
// Perform actions when certain settings update
Settings.on("settingUpdate", (setting, value) => {
    switch (setting) {
        case "theme":
            // If called without a theme, load the current theme/default and set it
            if (value === undefined) {
                value = Settings.get("theme");
            }

            // Just hope we don't need to apply any other classes to the root ig
            document.getElementById("root").className = value;

            break;
        case "circularAvatars":
            const root = document.querySelector(":root");
            root.style.setProperty("--avatar-radius", value ? "50%" : "var(--avatar-rounded)");

            break;
        default:
            break;
    }
})


export default Settings;
