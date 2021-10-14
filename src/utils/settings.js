import { EventEmitter } from "events";

const default_settings = {
    theme: "dark",
    groupBreadcrumbs: {},
    devMode: false,
    showRedactedEvents: false,
    showJoinEvents: false,
    showLeaveEvents: false,
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

    getSetting(key) {
        return this.settings[key] || default_settings[key];
    }
    
    updateSetting(key, value) {
        this.settings[key] = value;
        localStorage.setItem("settings", JSON.stringify(this.settings));
        this.emit("settingUpdate", key, value);
    }

    // Custom handlers

    setTheme(theme = null) {
        // If called without a theme, load the theme from storage
        if (theme !== null) {
            this.updateSetting("theme", theme);
        } else {
            theme = this.getSetting("theme");
            if (theme === undefined) {theme = default_settings["theme"]};
        }
    
        // Just hope we don't need to apply any other classes to the root ig
        document.getElementById("root").className = theme;
    }
}

const Settings = new SettingsManager();
export default Settings;
