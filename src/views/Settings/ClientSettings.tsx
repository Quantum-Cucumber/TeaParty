import "./ClientSettings.scss";
import { useEffect, useState } from "react";

import SettingsPage from "./Settings";
import { A, Loading, Option } from "../../components/elements";
import { Section, Slider, ToggleSetting } from "./components";

import Settings from "../../utils/settings";
import { msToDate } from "../../utils/datetime";
import { classList } from "../../utils/utils";
import { logoutMatrix } from "../../utils/matrix-client";

import { Icon } from "@mdi/react" ;
import { mdiBrush, mdiLock, mdiHammerWrench, mdiTune, mdiGithub } from "@mdi/js";
import {ReactComponent as MatrixLogo} from "./matrix-logo.svg";
import { IMyDevice } from "matrix-js-sdk";


export default function ClientSettings() {
    return (
        <SettingsPage pages={clientPages}
            tabsFooter={<>
                <div className="options-divider"></div>
                <Option danger text="Logout" select={logoutMatrix} />
                <div className="options-divider"></div>
                <About />
            </>} 
        />
    )
}

const clientPages = [
    {
        title: "Appearance",
        icon: mdiBrush,
        render: () => {
            const currentTheme: string = Settings.get("theme");
            return (<>
                <Section name="Theme">
                    <ThemeSelect initial={currentTheme}
                        themeList={[
                            {label: "Dark", theme: "dark"},
                            {label: "Light", theme: "light"}
                        ]}
                    />
                </Section>
                <Section name="Appearance">
                    <ToggleSetting label="Circular avatars" setting="circularAvatars" />
                    <ToggleSetting label="Show room avatars in sidebar" setting="showRoomIcons" />
                    <Slider label="Text size" setting="fontSize" min={10} max={26} interval={2} units="px" />
                </Section>
                <Section name="Events">
                    <ToggleSetting label="Show deleted events" setting="showRedactedEvents" />
                    <ToggleSetting label="Show member join events" setting="showJoinEvents" />
                    <ToggleSetting label="Show member leave events" setting="showLeaveEvents" />
                    <ToggleSetting label="Show room edit events" setting="showRoomEdits" />
                </Section>
            </>);
        },
    },
    {
        title: "Behaviour",
        icon: mdiTune,
        render: () => {
            return (
                <Section name="Behaviour">
                    <ToggleSetting label="Collapse group list" setting="collapseGroups" />
                </Section>
            )
        }
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
                    <ToggleSetting label="Developer Tools" setting="devMode" />
                </Section>
            );
        }
    },
];


type ThemeSelectProps = {
    initial: string,
    themeList: {label: string, theme: string}[],
}

function ThemeSelect({ initial, themeList }: ThemeSelectProps) {
    const [selected, Select] = useState(initial);

    function Theme({ label, name }) {
        return (
            <div
                className={classList("theme", name, {"theme--selected": selected === name})}
                onClick={() => {Settings.update("theme", name); Select(name)}}
            >
                <div className="theme__colours">
                    <div className="theme__bg"></div>
                    <div className="theme__primary"></div>
                </div>
                <div className="theme__label">{label}</div>
            </div>
        );
    }

    return (<>
        {
            themeList.map((theme) => {
                return (
                    <Theme label={theme.label} name={theme.theme} key={theme.theme}/>
                );
            })
        }
    </>)
}

function DeviceTable() {
    const [deviceList, setDeviceList] = useState(null as IMyDevice[]);

    useEffect(() => {
        global.matrix.getDevices()
        .then((result: {devices: IMyDevice[]}) => {
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
                <tr><td colSpan={4}>
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

function About() {
    return (
        <div className="settings__categories__about">
            <A href="https://github.com/quantum-cucumber/teaparty" className="settings__categories__about__icon" title="Github">
                <Icon path={mdiGithub} color="var(--text)" size="calc(16px + 1rem)" />
            </A>
            <A href="https://matrix.org/" className="settings__categories__about__icon" title="Made For Matrix">
                <MatrixLogo className="matrix-logo" />
            </A>
        </div>
    )
}
