import "./RoomSettings.scss";

import SettingsPage from "./Settings"
import { EditText } from "./components";
import { RoomIcon } from "../../components/elements";

import { mdiText } from "@mdi/js"

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

function RoomOverview({roomId}) {
    const room: Room = global.matrix?.getRoom(roomId);

    const roomTopic = room.currentState.getStateEvents("m.room.topic")[0]?.getContent().topic;
    const canEditName = false  // room.currentState.maySendStateEvent("m.room.name", global.matrix.getUserId());
    const canEditTopic = false  // room.currentState.maySendStateEvent("m.room.name", global.matrix.getUserId());

    if (!room) {return null}
    return (
        <div className="room-settings--overview">
            <div className="room-settings--overview__stretch">
                <EditText label="Room name" text={room.name} subClass="room-settings--overview__name" saveFunc={alert} canEdit={canEditName} />
                <EditText multiline label="Room topic" text={roomTopic} saveFunc={alert} canEdit={canEditTopic} />
            </div>
            <div className="room__icon__crop">
                <RoomIcon room={room} />
            </div>
        </div>
    )
}