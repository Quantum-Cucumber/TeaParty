import "./RoomSettings.scss";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useHistory } from "react-router-dom";

import SettingsPage from "../Settings"
import RoomPermissions, { getPowerLevels } from "./RoomPermissions";
import { EditableText, Section, Toggle, DropDownRow } from "../components";
import { RoomIcon } from "../../../components/elements";
import { Avatar } from "../../../components/user";

import { stringSize } from "../../../utils/utils";
import { useScrollPaginate } from "../../../utils/hooks";
import { getMember } from "../../../utils/matrix-client";

import { mdiChatQuestion, mdiEarth, mdiEmail, mdiGavel, mdiShield, mdiText } from "@mdi/js"

import type { Room } from "matrix-js-sdk";
import type {pagesType} from "../Settings";
import type { Visibility } from "matrix-js-sdk/lib/@types/partials";


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
                <RoomPermissions room={room} />
            )
        },
    },
    {
        title: "Bans",
        icon: mdiGavel,
        render: ({ room }) => {
            return (
                <Bans room={room} />
            )
        }
    }
]

const visibilityMap = Object.freeze({
    "public": {
        icon: mdiEarth,
        text: "Anyone can join",
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

const getTopic = (room: Room) => room.currentState.getStateEvents("m.room.topic")[0]?.getContent().topic as string;
const getJoinRule = (room: Room) => room.currentState.getStateEvents("m.room.join_rules")[0]?.getContent().join_rule as keyof typeof visibilityMap as string;
const getAllAliases = (room: Room) => room.getCanonicalAlias() ? [...room.getAltAliases(), room.getCanonicalAlias()] : room.getAltAliases();

function Overview({ room }: {room: Room}) {
    const [roomName, setName] = useState(room.name);
    const [roomTopic, setTopic] = useState(getTopic(room));
    const [roomVisibility, setVisibility] = useState(getJoinRule(room));
    const [roomAliases, setAliases] = useState(getAllAliases(room));
    const [roomIsPublished, setIsPublished] = useState<boolean>(null);  // Start as null to indicate the true value hasn't loaded


    // Determine what state events can be sent
    const canEditName = room.currentState.maySendStateEvent("m.room.name", global.matrix.getUserId());
    const canEditTopic = room.currentState.maySendStateEvent("m.room.name", global.matrix.getUserId());
    const canEditJoinRules = room.currentState.maySendStateEvent("m.room.join_rules", global.matrix.getUserId());
    const canEditAliases = room.currentState.maySendStateEvent("m.room.canonical_aliases", global.matrix.getUserId());


    // Display the updated data -> send the event -> if an error occurs, use the previous state
    const saveName = useCallback((name: string) => {
        setName(name);
        global.matrix.setRoomName(room.roomId, name)
        .catch(() => {
            setName(roomName);
        });
    }, [room, roomName]);

    const saveTopic = useCallback((topic: string) => {
        setTopic(topic);
        global.matrix.setRoomTopic(room.roomId, topic)
        .catch(() => {
            setName(roomTopic);
        });
    }, [room, roomTopic]);

    const saveVisibility = useCallback((join_rule: string) => {
        setVisibility(join_rule);
        const content = {
            join_rule: join_rule,
        }
        global.matrix.sendStateEvent(room.roomId, "m.room.join_rules", content, "")
        .catch(() => {
            setName(roomVisibility);
        });
    }, [room, roomVisibility])

    const saveIsPublished = useCallback((value: boolean) => {
        setIsPublished(value);
        global.matrix.setRoomDirectoryVisibility(room.roomId, value ? "public" : "private")
        .catch(() => {
            setIsPublished(roomIsPublished);
        })
    }, [room, roomIsPublished])


    // Fetch whether the room is published to the HS's directory
    useEffect(() => {
        global.matrix.getRoomDirectoryVisibility(room.roomId)
        .then((response: {visibility: Visibility}) => {
            setIsPublished(response.visibility === "public");
        });
    }, [room])


    return (<>
        <div className="room-settings__basic">
            <div className="room-settings__basic__body">
                <EditableText label="Room name" text={roomName} subClass="room-settings__basic__name" canEdit={canEditName} saveFunc={saveName} validation={(value) => stringSize(value) <= 255} />
                <EditableText multiline label="Room topic" text={roomTopic} subClass="settings__panel__group__options" canEdit={canEditTopic} saveFunc={saveTopic}/>
            </div>
            <div className="room__icon__crop">
                <RoomIcon room={room} />
            </div>
        </div>
        
        <Section name="Visibility">
            <DropDownRow label="Join rule" value={roomVisibility} options={visibilityMap} canEdit={canEditJoinRules} saveFunc={saveVisibility} />
            <Toggle label="Publish this room to the public room directory" value={!!roomIsPublished} canEdit={canEditAliases && roomIsPublished !== null} saveFunc={saveIsPublished} />
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


const getBans = (room: Room) => room.getMembersWithMembership("ban");

function Bans({room}: {room: Room}) {
    const [bannedMembers, setBannedMembers] = useState(getBans(room));
    const bannedMembersFallback = useRef(bannedMembers);

    const [loadingRef, setLoadingRef] = useState<HTMLDivElement>();
    const loaded = useScrollPaginate(loadingRef, 30)

    const unban = useCallback((userId) => {
        const newValue = [...bannedMembers.filter((member) => member.userId !== userId)]
        setBannedMembers(newValue);

        global.matrix.unban(room.roomId, userId)
        .then(() => {
            bannedMembersFallback.current = newValue;
        })
        .catch(() => {
            setBannedMembers(bannedMembersFallback.current)
        })

    }, [room, bannedMembers, bannedMembersFallback]);

    // Calculate whether the user has the power level needed to ban users
    const powerLevelEvent = getPowerLevels(room);
    const minBanPowerLevel = powerLevelEvent.ban || 50;
    const myPowerLevel = getMember(room.roomId, global.matrix.getUserId()).powerLevel;
    const canEditBans = myPowerLevel >= minBanPowerLevel;

    return (
        <Section name={`Banned Users (${bannedMembers.length})`}>
            {
                bannedMembers.slice(0, loaded).map((member) => {
                    const user = global.matrix.getUser(member.userId);
                    const banEvent = member.events.member.getContent();

                    const senderId = member.events.member.getSender();
                    const sender = getMember(room.roomId, senderId);

                    return (
                        <div className="settings__row" key={member.userId}>
                            { user &&
                                <Avatar user={user} subClass="room-settings__members__avatar" />
                            }
                            <div className="settings__row__label">
                                {member.name}

                                <div className="settings__row__label--desc">
                                    {banEvent.reason ? banEvent.reason : null}
                                    {` - ${sender?.name || senderId}`}
                                </div>
                            </div>
                            { canEditBans &&
                                <button className="settings__button--danger" onClick={() => {unban(member.userId)}}>Unban</button>
                            }
                        </div>
                    )
                })
            }
            <div ref={setLoadingRef} style={{height: "1px", width: "100%"}}></div>
        </Section>
    )
}
