import "./Settings.scss";
import { useEffect, useState } from "react";
import { Option } from "../../components/interface";
import { mdiClose, mdiBrush } from "@mdi/js";
import { Icon } from "@mdi/react";
import { setTheme, getSetting } from "../../utils/settings";


function SettingsPage({ setPage }) {
    const currentTheme = getSetting("theme");
    const settings_pages = [
        {
            label: "Appearance",
            path: mdiBrush,
            page: (
                <Section name="Theme">
                    <ThemeSelect initial={currentTheme} setter={setTheme} themeList={[
                        {label: "Dark", theme: "dark"},
                        {label: "Light", theme: "light"}
                    ]}/>
                </Section>
            ),
        },
    ];

    const [tab, setTab] = useState(settings_pages[0].label);
    const [settingsPage, setSettingsPage] = useState(settings_pages[0].page);


    function SettingsTab({ path, text, children }) {
        function select(k) {
            setTab(k);
            setSettingsPage(children);
        }

        return (
            <Option k={text} text={text} select={select} selected={tab}>
                <Icon path={path} size="1.4rem" color="var(--text)" />
            </Option>
        );
    }

    const tabs = settings_pages.map((tab) => {
        return (
            <SettingsTab path={tab.path} text={tab.label} key={tab.label}>
                {tab.page}
            </SettingsTab>
        );
    });

    /* Listen for escape key to close menu */
    useEffect(() => {
        document.addEventListener("keydown", keyPress);

        return () => {
            document.removeEventListener("keydown", keyPress);
        };
    });
    function keyPress(e) {
        if (e.key === "Escape") {
            setPage(null);
        }
    }

    return (
        <div className="page--settings">
            <div className="page--settings__close" onClick={() => setPage(null)}>
                <Icon path={mdiClose} size="100%" color="var(--text-greyed)" />
            </div>
            <div className="settings__holder">
                <div className="settings__categories">
                    {tabs}
                </div>
                <div className="settings__divider"></div>
                <div className="settings__panel">
                    {settingsPage}
                </div>
            </div>
        </div>
    );
}

function Section({ name, children }) {
    return (
        <div className="settings__panel__group">
            <div className="settings__panel__group__label">{`${name}:`}</div>
            <div className="settings__panel__group__options">
                {children}
            </div>
        </div>
    );
}

function ThemeSelect({ initial, setter, themeList }) {
    const [selected, Select] = useState(initial);

    function Theme({ label, name }) {
        return (
            <div
                className={`theme ${name}` + (selected === name ? " theme--selected" : "")}
                onClick={() => {setter(name); Select(name)}}
            >
                <div className="theme__colours">
                    <div className="theme__bg"></div>
                    <div className="theme__primary"></div>
                </div>
                <div className="theme__label">{label}</div>
            </div>
        );
    }

    
    themeList = themeList.map((theme) => {
        return (
            <Theme label={theme.label} name={theme.theme} key={theme.theme}/>
        );
    });

    return (
        themeList
    );
}

export default SettingsPage;
