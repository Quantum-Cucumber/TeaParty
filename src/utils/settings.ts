import { EventEmitter } from "events";

const default_settings = {
    theme: "dark",
    groupBreadcrumbs: {},

    // Appearance
    collapseGroups: false,
    startRoomsCollapsed: false,
    startMembersCollapsed: false,
    showRoomIcons: true,
    circularAvatars: false,
    fontSize: 18,  // In px

    devMode: false,

    // Event Visibility
    showRedactedEvents: false,
    showJoinEvents: false,
    showLeaveEvents: false,
    showRoomEdits: false,
}

export function isEventVisibility(settingName: string) {
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
    [x: string]: {};
    constructor() {
        super();
        this.settings = {};
    }

    init() {
        const settings = localStorage.getItem("settings");
        this.settings = settings ? JSON.parse(settings) : {};

        Object.keys(default_settings).forEach((key) => {
            this.emit("settingUpdate", key, this.get(key));
        })
    }

    get(key: string) {
        return this.settings.hasOwnProperty(key) ? this.settings[key] : default_settings[key];
    }
    
    update(key: string, value: any) {
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
    const root: HTMLElement = document.querySelector(":root")!;

    switch (setting) {
        case "theme":
            // If called without a theme, load the current theme/default and set it
            if (value === undefined) {
                value = Settings.get("theme");
            }

            // Just hope we don't need to apply any other classes to the root ig
            root.className = value;

            break;
        case "circularAvatars":
            root.style.setProperty("--avatar-radius", value ? "50%" : "var(--avatar-rounded)");
            break;
        case "fontSize":
            root.style.setProperty("--font-size", `${value}px`);
            break;
        default:
            break;
    }
})
Settings.init();


export default Settings;
