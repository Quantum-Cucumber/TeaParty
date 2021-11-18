import "./RoomSettings.scss";
import { useHistory } from "react-router-dom";

import SettingsPage from "./Settings"
import { EditText, DropDown, Section } from "./components";
import { RoomIcon } from "../../components/elements";

import { mdiChatQuestion, mdiEarth, mdiEmail, mdiShield, mdiText } from "@mdi/js"

import type { Room } from "matrix-js-sdk";
import type {pagesType} from "./Settings";


export default function RoomSettings({ roomId }) {
    const history = useHistory();
    const room: Room = global.matrix?.getRoom(roomId);
    if (!room) {
        // TODO: Just show the loading screen if the client isn't initialised
        history.push(`/room/${roomId}`)
        return null;
    }

    return (
        <SettingsPage pages={roomPages} room={room} />
    )
}

const roomPages: pagesType = [
    {
        title: "Overview",
        icon: mdiText,
        render: ({ room }) => {
            return (
                <Overview room={room} />
            )
        },
    },
    {
        title: "Permissions",
        icon: mdiShield,
        render: ({ room }) => {
            return (
                <PowerLevels room={room} />
            )
        },
    },
]

const visibilityMap = Object.freeze({
    "public": {
        icon: mdiEarth,
        text: "Public",
    },
    "knock": {
        icon: mdiChatQuestion,
        text: "Ask to join",
    },
    "invite": {
        icon: mdiEmail,
        text: "Invite Only",
    },
})

function Overview({ room }: {room: Room}) {
    const roomTopic: string = room.currentState.getStateEvents("m.room.topic")[0]?.getContent().topic;
    const roomVisibility: keyof typeof visibilityMap = room.currentState.getStateEvents("m.room.join_rules")[0]?.getContent().join_rule;
    const roomAliases = room.getCanonicalAlias() ? [...room.getAltAliases(), room.getCanonicalAlias()] : room.getAltAliases();

    const canEditName = false  // room.currentState.maySendStateEvent("m.room.name", global.matrix.getUserId());
    const canEditTopic = false  // room.currentState.maySendStateEvent("m.room.name", global.matrix.getUserId());
    const canEditJoinRules = false // room.currentState.maySendStateEvent("m.room.join_rules", global.matrix.getUserId());

    return (<>
        <div className="room-settings__basic">
            <div className="room-settings__basic__body">
                <EditText label="Room name" text={room.name} subClass="room-settings__basic__name" canEdit={canEditName} />
                <EditText multiline label="Room topic" text={roomTopic} subClass="settings__panel__group__options" canEdit={canEditTopic} />
            </div>
            <div className="room__icon__crop">
                <RoomIcon room={room} />
            </div>
        </div>
        
        <Section name="Visibility">
            <DropDown label="Join rule" current={roomVisibility} options={visibilityMap} canEdit={canEditJoinRules} />
            <div className="settings__row settings__row__label">
                <Section name="Room Aliases">
                    {roomAliases.length > 0 ?
                        roomAliases.map((alias) => {
                            return (
                                <div className="settings__row" key={alias}>
                                    {alias}
                                </div>
                            )
                        })
                    :
                        <div className="settings__row">
                            <div style={{color: "var(--text-greyed)"}}>No aliases have been set</div>
                        </div>
                    }
                </Section>
            </div>
        </Section>
    </>)
}


const powerLevelContent = Object.freeze({
    "events_default": {
        text: "Send events",
        defaultValue: 0
    },
    "invite": {
        text: "Invite users",
        defaultValue: 50
    },
    
    "redact": {
        text: "Redact events",
        defaultValue: 50
    },
    "kick": {
        text: "Kick members",
        defaultValue: 50
    },
    "ban": {
        text: "Ban members",
        defaultValue: 50
    },
    "state_default": {
        text: "Change room settings",
        defaultValue: 50
    },
})


function PowerLevels({ room }: {room: Room}) {
    const powerLevelState = room.currentState.getStateEvents("m.room.power_levels")[0]?.getContent();
    const canEditPowerLevels = false  // room.currentState.maySendStateEvent("m.room.power_levels", global.matrix.getUserId());

    const powerLevelOptions = {
        50: {
            text: "Moderator (50)",
        },
        100: {
            text: "Administrator (100)"
        },
    };

    const defaultPowerLevel = powerLevelState.users_default || 0;
    powerLevelOptions[defaultPowerLevel] = {text: `User (${defaultPowerLevel})`}

    return (
        <Section name="Permissions">
            {
                Object.entries(powerLevelContent).map(([key, {text, defaultValue}]) => {
                    return (
                        <DropDown label={text} current={powerLevelState[key] || defaultValue} options={powerLevelOptions} allowCustom canEdit={canEditPowerLevels} />
                    )
                })
            }
        </Section>
    )
}


