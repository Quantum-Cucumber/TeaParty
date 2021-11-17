import "./RoomSettings.scss";

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
    const room: Room = global.matrix?.getRoom(roomId);
    if (!room) {return null}

    const roomTopic: string = room.currentState.getStateEvents("m.room.topic")[0]?.getContent().topic;
    const roomVisibility: keyof typeof visibilityMap = room.currentState.getStateEvents("m.room.join_rules")[0]?.getContent().join_rule;

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
        
        <Section name="Availability">
            <DropDown label="Visibility" current={roomVisibility} options={visibilityMap} canEdit={canEditJoinRules} />
        </Section>
    </>)
}