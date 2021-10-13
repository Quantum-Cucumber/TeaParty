import "./Settings.scss";
import { useEffect, useState } from "react";
import { Loading, Option } from "../../components/interface";
import { mdiClose, mdiBrush, mdiLock, mdiHammerWrench } from "@mdi/js";
import { Icon } from "@mdi/react";
import Settings from "../../utils/settings";
import { logoutMatrix } from "../../utils/matrix-client";
import { msToDate } from "../../utils/datetime";
import { classList, useBindEscape } from "../../utils/utils";
import { Section, Toggle } from "./components";

const settings_pages = [
    {
        title: "Appearance",
        icon: mdiBrush,
        render: () => {
            const currentTheme = Settings.getSetting("theme");
            return (
                <Section name="Theme">
                    <ThemeSelect initial={currentTheme} themeList={[
                        {label: "Dark", theme: "dark"},
                        {label: "Light", theme: "light"}
                    ]}/>
                </Section>
            );
        },
    },
    {
        title: "Security",
        icon: mdiLock,
        render: () => {
            return (
                <Section name="Devices">
                    <DeviceTable />
                </Section>
            );
        },
    },
    {
        title: "Advanced",
        icon: mdiHammerWrench,
        render: () => {
            return (
                <Section name="Advanced">
                    <Toggle label="Developer Tools" setting="devMode" />
                </Section>
            );
        }
    },
];


function SettingsPage({ setPage }) {
    const [tab, setTab] = useState(settings_pages[0].title);
    const [settingsPage, setSettingsPage] = useState(settings_pages[0].render());


    function SettingsTab({ icon, title, children }) {
        function select(k) {
            setTab(k);
            setSettingsPage(children);
        }

        return (
            <Option k={title} text={title} select={select} selected={tab}>
                <Icon path={icon} size="1.4rem" color="var(--text)" />
            </Option>
        );
    }

    const tabs = settings_pages.map((tab) => {
        return (
            <SettingsTab icon={tab.icon} title={tab.title} key={tab.title}>
                {tab.render()}
            </SettingsTab>
        );
    });
    
    useBindEscape(setPage, null);

    return (
        <div className="page--settings">
            <div className="page--settings__close" onClick={() => setPage(null)}>
                <Icon path={mdiClose} size="100%" color="var(--text-greyed)" />
            </div>
            <div className="settings__holder">
                <div className="settings__categories">
                    {tabs}
                    <div className="options-divider"></div>
                    <Option danger text="Log Out" k="logout" select={logoutMatrix}/>
                </div>
                <div className="settings__divider"></div>
                <div className="settings__panel">
                    {settingsPage}
                </div>
            </div>
        </div>
    );
}

function ThemeSelect({ initial, themeList }) {
    const [selected, Select] = useState(initial);

    function Theme({ label, name }) {
        return (
            <div
                className={classList("theme", name, {"theme--selected": selected === name})}
                onClick={() => {Settings.setTheme(name); Select(name)}}
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

function DeviceTable() {
    const [deviceList, setDeviceList] = useState();

    useEffect(() => {
        global.matrix.getDevices()
        .then((result) => {
            setDeviceList(result.devices);
        });
    }, [setDeviceList]);


    function Table({ children }) {
        return (
            <table className="device-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Device ID</th>
                        <th>Last Seen</th>
                    </tr>
                </thead>
                <tbody>
                    {children}
                </tbody>
            </table>
        );
    }
    
    if (!deviceList) {
        return (
            <Table>
                <tr><td colSpan="4">
                        <div className="device-table__loading">
                            <Loading size="60px"></Loading>
                        </div>
                </td></tr>
            </Table>
        );
    }

    // Sort most recent session to the top
    deviceList.sort((a, b) => {return b.last_seen_ts - a.last_seen_ts});
    const devices = deviceList.map((device) => {
        const { display_name, device_id, last_seen_ts, last_seen_ip } = device;
        const current = device_id === global.matrix.getDeviceId();

        return (
            <tr key={device_id} className={classList({"device-table--current": current})}>
                <td>{display_name}</td>
                <td>{device_id}</td>
                <td>{msToDate(last_seen_ts)}<br />{last_seen_ip}</td>
            </tr>
        );
    });

    return (
        <Table>
            {devices}
        </Table>
    );
}

export default SettingsPage;
