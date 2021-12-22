import "./ClientSettings.scss";
import { useEffect, useState } from "react";

import SettingsPage from "./Settings";
import { A, IconButton, Loading, Option, EditableText, ManualTextBox, Button } from "../../components/elements";
import { ImageUpload, Section, Slider, ToggleSetting } from "./components";

import Settings from "../../utils/settings";
import { msToDate } from "../../utils/datetime";
import { classList } from "../../utils/utils";
import { logoutMatrix } from "../../utils/matrix-client";
import { useCatchState } from "../../utils/hooks";

import { Icon } from "@mdi/react" ;
import { mdiBrush, mdiLock, mdiHammerWrench, mdiTune, mdiGithub, mdiEye, mdiEyeOff, mdiAccount } from "@mdi/js";
import MatrixLogo from "./matrix-logo.svg";

import type { IMyDevice, User } from "matrix-js-sdk";


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
        title: "Profile",
        icon: mdiAccount,
        render: () => {
            return (
                <Profile />
            )
        },
    },
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
                    <Devices />
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



function Profile() {
    const myUser: User = global.matrix.getUser(global.matrix.getUserId());

    const [oldDisplayName, setOldDisplayName] = useState(myUser.displayName);
    const [displayName, setDisplayName] = useState(myUser.displayName);

    async function saveAvatar(mxcUrl: string) {
        await global.matrix.setAvatarUrl(mxcUrl);
    }
    async function saveDisplayName() {
        try {
            await global.matrix.setDisplayName(displayName.trim());
            setOldDisplayName(displayName.trim());
        }
        catch {
            setDisplayName(oldDisplayName);
        }
    }

    const nameHasChanged = displayName.trim() !== oldDisplayName;
    const displayNameStyle = {
        [nameHasChanged ? "save" : "disabled"]: true,
    }

    return (
        <Section name="Profile">
            <div className="profile-settings">
                <div className="profile-settings__avatar">
                    <ImageUpload mxcUrl={myUser.avatarUrl} onSelect={saveAvatar} />
                </div>
                <div className="profile-settings__name">
                    <ManualTextBox placeholder="Display name" value={displayName} setValue={setDisplayName} />
                    <Button {...displayNameStyle} onClick={nameHasChanged ? saveDisplayName : null}>Save</Button>
                </div>
            </div>
        </Section>
    )
}


type ThemeSelectProps = {
    initial: string,
    themeList: {label: string, theme: string}[],
}

function ThemeSelect({ initial, themeList }: ThemeSelectProps) {
    const [selected, Select] = useState(initial);

    function Theme({ label, name }: {label: string, name: string}) {
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


// TODO - Deleting devices needs the interactive auth which is scary so left out atm
function Devices() {
    const [detailed, showDetails] = useState(false);
    const [deviceList, setDeviceList] = useState<IMyDevice[]>(null);

    useEffect(() => {
        global.matrix.getDevices()
        .then((result: {devices: IMyDevice[]}) => {
            setDeviceList(result.devices);
        });
    }, [setDeviceList]);

    
    if (!deviceList) {
        return (
            <div className="devices__loading">
                <Loading size="60px"></Loading>
            </div>
        )
    }

    return (<>
        <div className="devices__buttons">
            <IconButton path={detailed ? mdiEyeOff : mdiEye} size="1.25em" tipText={`${detailed ? "Hide" : "Show"} details`} clickFunc={() => showDetails((current) => !current)} />
        </div>
        {
            deviceList.sort((a, b) => {return b.last_seen_ts - a.last_seen_ts})
            .map((device) => {
                return (
                    <Device {...device} detailed={detailed} key={device.device_id} />
                )
            })
        }
    </>);
}

interface DeviceProps extends IMyDevice {
    detailed: boolean,
}

function Device({ display_name = null, device_id, last_seen_ts = null, last_seen_ip = null, detailed }: DeviceProps) {
    const [name, setName] = useCatchState(display_name || "Unnamed device", saveName);

    async function saveName(newName: string) {
        await global.matrix.setDeviceDetails(device_id, {display_name: newName});
    }

    return (
        <div className="devices__device">
            <div className="devices__device__body">
                <EditableText label="Device name" text={name} saveFunc={setName} links={false}/>
                { detailed &&
                    <span className="devices__device__id">{device_id}</span>
                }

                <div className="devices__device__timestamp">
                { global.matrix.getDeviceId() === device_id ?
                    "This device"
                :
                    last_seen_ts && `Last seen: ${msToDate(last_seen_ts)}`
                }
                { (detailed && last_seen_ip) &&
                    <span> @ {last_seen_ip}</span>
                }
                </div>
            </div>
        </div>
    )
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
