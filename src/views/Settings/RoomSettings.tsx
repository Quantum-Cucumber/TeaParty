import "./RoomSettings.scss";
import { useHistory } from "react-router-dom";

import SettingsPage from "./Settings"
import { EditText, DropDown, Section } from "./components";
import { RoomIcon } from "../../components/elements";

import { mdiChatQuestion, mdiEarth, mdiEmail, mdiText } from "@mdi/js"

import type { Room } from "matrix-js-sdk";
import type {pagesType} from "./Settings";


export default function RoomSettings({ roomId }) {
    return (
        <SettingsPage pages={roomPages} roomId={roomId} />
    )
}

const roomPages: pagesType = [
    {
        title: "Overview",
        icon: mdiText,
        render: ({ roomId }) => {
            return (
                <RoomOverview roomId={roomId} />
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

function RoomOverview({roomId}) {
    const history = useHistory();
    const room: Room = global.matrix?.getRoom(roomId);
    if (!room) {
        // TODO: Just show the loading screen if the client isn't initialised
        history.push(`/room/${roomId}`)
        return null;
    }

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
                            <div style={{color: "var(--text-greyed)"}}>None</div>
                        </div>
                    }
                </Section>
            </div>
        </Section>
    </>)
}
