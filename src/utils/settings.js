import { EventEmitter } from "events";

const default_settings = {
    theme: "dark",
    groupBreadcrumbs: {},

    collapseGroups: false,
    showRoomIcons: true,

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
        this.settings[key] = value;
        localStorage.setItem("settings", JSON.stringify(this.settings));
        this.emit("settingUpdate", key, value);
    }

    // Custom handlers

    setTheme(theme = null) {
        // If called without a theme, load the theme from storage
        if (theme !== null) {
            this.update("theme", theme);
        } else {
            theme = this.update("theme");
            if (theme === undefined) {theme = default_settings["theme"]};
        }
    
        // Just hope we don't need to apply any other classes to the root ig
        document.getElementById("root").className = theme;
    }
}

const Settings = new SettingsManager();
export default Settings;
