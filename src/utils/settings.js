function loadSettings() {
    const settings = localStorage.getItem("settings");
    if (!settings) { return {} }
    return JSON.parse(settings);
}

export function getSetting(key) {
    return loadSettings()[key];
}

export function updateSettings(key, value) {
    let settings = loadSettings();
    settings[key] = value;
    localStorage.setItem("settings", JSON.stringify(settings));
}


export function setTheme(theme = null) {
    // If called without a theme, load the theme from storage
    if (theme !== null) {
        updateSettings("theme", theme);
    } else {
        theme = getSetting("theme");
    }

    // Just hope we don't need to apply any other classes to the root ig
    document.getElementById("root").className = theme;
}
