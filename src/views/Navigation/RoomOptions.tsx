
import "./RoomOptions.scss";
import { useContext } from "react";
import { useHistory } from "react-router-dom";

import { Option, HoverOption, OptionIcon } from "../../components/elements";
import { ContextMenu, popupCtx, Confirm, modalCtx, Prompt } from "../../components/popups";

import Settings from "../../utils/settings";
import { getRoomNotifIcon, NotificationOptions } from "../../utils/notifications";

import { mdiCog, mdiContentCopy, mdiEye, mdiExitToApp, mdiCheckAll, mdiPencil } from "@mdi/js";

import type { Room } from "matrix-js-sdk";


type RoomOptionsProps = {
    roomId: string,
    read?: boolean,
} & Omit<React.ComponentProps<typeof ContextMenu>, "x" | "y" | "children">;

export default function RoomOptions({ roomId, read = true, ...props }: RoomOptionsProps) {
    const setPopup = useContext(popupCtx);
    const setModal = useContext(modalCtx);
    const history = useHistory();

    const room: Room = global.matrix.getRoom(roomId);

    return (
        <ContextMenu {...props} x="align-mouse-left" y="align-mouse-top">
            { !room.isSpaceRoom() &&
                <Option compact text="Mark as read" icon={<OptionIcon path={mdiCheckAll} />} enabled={!read}
                    select={() => {
                        setPopup(null);
                        const events = room.getLiveTimeline().getEvents();
                        const lastEvent = events[events.length - 1];
                        if (lastEvent) {
                            console.log(`Mark ${lastEvent.getId()} as read`)
                            global.matrix.sendReadReceipt(lastEvent);
                        }
                    }}
                />
            }

            { !room.isSpaceRoom() &&  // Technically you could set the space room notifications, but you won't likely read the events
                <HoverOption text="Notifications"
                        icon={<OptionIcon path={getRoomNotifIcon(room)} />}
                >
                    <NotificationOptions room={room} />
                </HoverOption>
            }

            { !room.isSpaceRoom() &&
                <Option compact text="Display name"
                    select={() => {
                        setPopup(null);
                        setModal(
                            <RoomDisplayNameModal roomId={roomId} />
                        );
                    }}
                    icon={<OptionIcon path={mdiPencil} />}
                />
            }

            {   room.isSpaceRoom() && Settings.get("devMode") &&
                <Option compact text="View Timeline"
                    select={() => {
                        history.push("/room/" + roomId);
                    }}
                    icon={<OptionIcon path={mdiEye} />}
                />
            }

            <Option compact text="Settings"
                select={() => {
                    history.push("/settings/room/" + roomId);
                    setPopup();
                }}
                icon={<OptionIcon path={mdiCog} />}
            />

            <Option compact danger text="Leave"
                select={() => {
                    setPopup(null);
                    setModal(
                        <Confirm title={`Leave ${room.name}?`} acceptLabel="Leave" onConfirm={async () => await global.matrix.leave(roomId)} />
                    );
                }}
                icon={<OptionIcon path={mdiExitToApp} colour="error" />}
            />

            <Option compact text="Copy Room ID"
                select={() => {
                    navigator.clipboard.writeText(roomId);
                    setPopup();
                }}
                icon={<OptionIcon path={mdiContentCopy} />}
            />
        </ContextMenu>
    )
}


function RoomDisplayNameModal({ roomId }: {roomId: string}) {
    const room: Room = global.matrix.getRoom(roomId);
    const myMember = room.getMember(global.matrix.getUserId());

    return (
        <Prompt title={`${room.name} Display Name`} acceptLabel="Save" acceptStyle="save"
            initial={myMember.name} placeholder={myMember.user.displayName ?? "Display name"} clearable
            onConfirm={async (displayName) => {
                const event = room.currentState.getStateEvents("m.room.member", global.matrix.getUserId());
                const newEvent = {...event.getContent(), displayname: displayName ? displayName : myMember.user.displayName};
                await global.matrix.sendStateEvent(roomId, "m.room.member", newEvent, global.matrix.getUserId());
            }}
        />
    )
}
