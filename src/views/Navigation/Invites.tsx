import "./Invites.scss";
import React, { useContext, useState } from "react";
import { EventType } from "matrix-js-sdk/lib/@types/event";

import { Loading, RoomIcon } from "../../components/elements";
import { Tooltip, Modal, modalCtx } from "../../components/popups";

import { Icon } from "@mdi/react";
import { mdiEmail, mdiCheck, mdiClose } from "@mdi/js";

import type { invitedRoomsType, inviteInfo } from "./RoomStates"


type InvitesIconProps = {
    invLen: number,
    invites: invitedRoomsType,
}

export function InvitesIcon({ invLen, invites }: InvitesIconProps) {
    const setModal = useContext(modalCtx);
    function showInviteModal() {
        setModal(
            <Invites invitedRooms={invites}/>
        )
    }

    return (
        <div className="group__holder">
            <Tooltip text="Invites" dir="right">
                <div className="group group--default" onClick={showInviteModal}>
                    <Icon path={mdiEmail} color="var(--text)" size="100%" />
                    <div className="group__notification">{invLen}</div>
                </div> 
            </Tooltip>
        </div>
    );    
}

function Invites({ invitedRooms }: {invitedRooms: invitedRoomsType}) {
    const setModal = useContext(modalCtx);

    // Make a holder for each invite type and populate with its values
    const holders = Object.keys(invitedRooms).reduce((holders, name) => {
        if (invitedRooms[name].length === 0) {return holders}
        const invites = invitedRooms[name].map((invite) => {
            return (
                <InviteEntry invite={invite} key={invite.room.roomId} direct={name === "Direct messages"} />
            );
        })

        return holders.concat([
            <div key={name}>
                <div className="invite__type">{name}</div>
                <div>{invites}</div>
            </div>
        ]);
    }, []);

    return (
        <Modal title="Invites" hide={() => setModal(null)}>
            <>{holders}</>
        </Modal>
    )
}

type InviteEntryProps = {
    invite: inviteInfo,
    direct: boolean,
}

function InviteEntry({ invite, direct }: InviteEntryProps) {
    const [status, setStatus] = useState(null);
    const { inviter, room } = invite;

    async function acceptInvite() {
        setStatus(<Loading size="1.5rem"/>);
        try {
            await global.matrix.joinRoom(room.roomId);
            setStatus("Joined");
        }
        catch {
            setStatus("Error");
        }

        if (direct) {
            // Update account data
            const directs = global.matrix.getAccountData(EventType.Direct)?.getContent() || {};
            directs[inviter] = room.roomId;
            try {
                await global.matrix.setAccountData(EventType.Direct, directs);
            } catch (e) {
                console.warn(e);
            }
        }
    }

    async function declineInvite() {
        setStatus(<Loading size="1.5rem"/>);
        try {
            await global.matrix.leave(room.roomId)
            setStatus("Declined");
        }
        catch {
            setStatus("Error")
        }
    }

    return (
        <div className="invite-entry">
            <div className="invite-entry__icon">
                <RoomIcon room={room} />
            </div>
            <div className="invite-entry__label">
                <div>{room.name}</div>
                <div className="invite-entry__label--inviter">{inviter}</div>
            </div>
            { status === null ?
                <div className="invite-entry__buttons">
                    <div style={{"--button": "var(--error)"} as React.CSSProperties} onClick={declineInvite}>
                        <Icon path={mdiClose} size="100%" />
                    </div>
                    <div style={{"--button": "var(--success)"} as React.CSSProperties} onClick={acceptInvite}>
                        <Icon path={mdiCheck} size="100%" />
                    </div>
                </div>
            :
            <div className="invite-entry__status">{status}</div>
            }
        </div>
    )
}