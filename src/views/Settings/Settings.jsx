import "./Settings.scss";
import { useEffect, useState } from "react";
import { Option } from "../../components/interface";
import { mdiBrush, mdiHelpCircleOutline } from "@mdi/js";
import { Icon } from "@mdi/react";


const settings_pages = [
    {
        label: "Appearance",
        path: mdiBrush,
        page: (
            <Group name="Theme"></Group>
        ),
    },
    {
        label: "Test",
        path: mdiHelpCircleOutline,
        page: (
            <Group name="Test"></Group>
        ),
    },
];


function SettingsPage({ setPage }) {
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
            console.log("unmount");
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

function Group({ name, children }) {
    return (
        <div className="settings__panel__group">
            <div className="settings__panel__group__label">{`${name}:`}</div>
            <div>
                {children}
            </div>
        </div>
    );
}

export default SettingsPage;
