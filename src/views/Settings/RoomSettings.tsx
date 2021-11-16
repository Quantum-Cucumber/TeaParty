import SettingsPage from "./Settings"

import { mdiText } from "@mdi/js"


export default function RoomSettings({ roomId }) {
    return (
        <SettingsPage pages={roomPages} />
    )
}

const roomPages = [
    {
        title: "Overview",
        icon: mdiText,
        render: () => {
            return null
        },
    },
]