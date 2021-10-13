const default_settings = {
    theme: "dark",
    groupBreadcrumbs: {},
    devMode: false,
}

class SettingsManager {
    constructor() {
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
    }

    // Custom handlers

    setTheme(theme = null) {
        console.log(this)
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
