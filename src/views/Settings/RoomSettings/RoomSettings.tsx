import "./RoomSettings.scss";
import React, { useCallback, useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { EventType } from "matrix-js-sdk/lib/@types/event";

import SettingsPage from "../Settings"
import RoomPermissions, { getPowerLevels } from "./RoomPermissions";
import { Section, Toggle, DropDownRow, ImageUpload } from "../components";
import { Button, IconButton, EditableText, AsyncButton } from "../../../components/elements";
import { MemberAvatar } from "../../../components/user";
import Settings from "../../../utils/settings";

import { classList, stringSize } from "../../../utils/utils";
import { useCatchState, useScrollPaginate } from "../../../utils/hooks";
import { aliasRegex, getMember } from "../../../utils/matrix-client";

import { mdiChatQuestion, mdiCheck, mdiClose, mdiEarth, mdiEmail, mdiGavel, mdiHammerWrench, mdiShield, mdiText } from "@mdi/js"

import type { FormEvent } from "react";
import type { Room, RoomMember } from "matrix-js-sdk";
import type { Visibility } from "matrix-js-sdk/lib/@types/partials";
import type {pagesType} from "../Settings";


export default function RoomSettings({ roomId }: {roomId: string}) {
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
        },
    },
    {
        title: "Advanced",
        icon: mdiHammerWrench,
        condition: () => Settings.get("devMode"),
        render: ({ room }) => {
            return (
                <Advanced room={room} />
            )
        },
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

const getTopic = (room: Room) => room.currentState.getStateEvents(EventType.RoomTopic)[0]?.getContent().topic as string;
const getJoinRule = (room: Room) => room.currentState.getStateEvents(EventType.RoomJoinRules)[0]?.getContent().join_rule as keyof typeof visibilityMap as string;

function Overview({ room }: {room: Room}) {
    const [roomName, setName] = useState(room.name);
    const [roomTopic, setTopic] = useState(getTopic(room));
    const [roomVisibility, setVisibility] = useState(getJoinRule(room));
    const [canonicalAlias, setCanonicalAlias] = useCatchState(() => room.getCanonicalAlias(), saveCanonicalAlias);
    const [roomAliases, setAliases] = useCatchState<string[]>(null, saveAliases);
    const [roomIsPublished, setIsPublished] = useState<boolean>(null);  // Start as null to indicate the true value hasn't loaded

    const [newAlias, setNewAlias] = useState("");
    const [newAliasValid, setNewAliasValid] = useState(true);


    // Determine what state events can be sent
    const canEditName = room.currentState.maySendStateEvent(EventType.RoomName, global.matrix.getUserId());
    const canEditTopic = room.currentState.maySendStateEvent(EventType.RoomTopic, global.matrix.getUserId());
    const canEditAvatar = room.currentState.maySendStateEvent(EventType.RoomAvatar, global.matrix.getUserId());
    const canEditJoinRules = room.currentState.maySendStateEvent(EventType.RoomJoinRules, global.matrix.getUserId());
    const canEditAliases = room.currentState.maySendStateEvent(EventType.RoomCanonicalAlias, global.matrix.getUserId());


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
        global.matrix.sendStateEvent(room.roomId, EventType.RoomJoinRules, content, "")
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

    async function saveCanonicalAlias(newAlias: string) {
        // Get current state event
        const oldEvent = room.currentState.getStateEvents(EventType.RoomCanonicalAlias, "")?.getContent() || {};
        // Create new event
        const newEvent = {alias: newAlias, alt_aliases: "alt_aliases" in oldEvent ? oldEvent.alt_aliases : []};
        // Send event
        await global.matrix.sendStateEvent(room.roomId, EventType.RoomCanonicalAlias, newEvent, "");
    }

    async function saveAliases(_newAliases: string[], alias: {action: "add" | "remove", alias: string}) {
        switch (alias.action) {
            case "add":
                await global.matrix.createAlias(alias.alias, room.roomId);
                break;
            case "remove":
                await global.matrix.deleteAlias(alias.alias)
                break;
            default:
                break;
        }
    }

    async function changeAvatar(newMxcUrl: string) {
        await global.matrix.sendStateEvent(room.roomId, EventType.RoomAvatar, newMxcUrl ? {url: newMxcUrl} : {}, "");
    }


    // Fetch whether the room is published to the HS's directory
    useEffect(() => {
        global.matrix.getRoomDirectoryVisibility(room.roomId)
        .then((response: {visibility: Visibility}) => {
            setIsPublished(response.visibility === "public");
        });
    }, [room])

    function loadAliases() {
        global.matrix.unstableGetLocalAliases(room.roomId)
        .then((response: {aliases: string[]}) => {
            setAliases(response.aliases, null, true);
        })
    }


    const options = {};
    if (canonicalAlias) {
        options[canonicalAlias] = {text: canonicalAlias};
    }
    roomAliases?.forEach((alias) => {
        options[alias] = {text: alias}
    })

    function submitAlias(e: MouseEvent | FormEvent) {
        e.preventDefault();
        // Validate new user ID
        if (!aliasRegex.test(newAlias)) {
            setNewAliasValid(false);
            return;
        }

        const newAliases = [...roomAliases, newAlias];
        setAliases(newAliases, {action: "add", alias: newAlias})

        setNewAlias("");
    }


    return (<>
        <div className="room-settings__basic">
            <div className="room-settings__basic__body">
                <EditableText label="Room name" text={roomName} subClass="room-settings__basic__name" canEdit={canEditName} saveFunc={saveName} validation={(value) => stringSize(value) <= 255} />
                <EditableText multiline label="Room topic" text={roomTopic} subClass="settings__panel__group__body" canEdit={canEditTopic} saveFunc={saveTopic}/>
            </div>
            <ImageUpload mxcUrl={room.getMxcAvatarUrl()} canEdit={canEditAvatar} onSelect={changeAvatar} />
        </div>
        
        <Section name="Visibility">
            <DropDownRow label="Join rule" value={roomVisibility} options={visibilityMap} canEdit={canEditJoinRules} saveFunc={saveVisibility} />
            <Toggle label="Publish this room to the public room directory" value={!!roomIsPublished} canEdit={canEditAliases && roomIsPublished !== null} saveFunc={saveIsPublished} />
            <div className="settings__row settings__row__label">
                <Section name="Room Aliases">
                    <DropDownRow label="Canonical Alias" value={canonicalAlias} options={options} placeholder="None" saveFunc={setCanonicalAlias} canEdit={canEditAliases && !!roomAliases} allowNull />
                    <div className="settings__row">
                        <div className="settings__row__label">
                            { roomAliases ?
                                <Section name="Local aliases" description={`Local aliases can be used by anyone to find this room via ${global.matrix.getDomain()}`}>
                                    {
                                        roomAliases.map((alias) => {
                                            return (
                                                <div className="settings__row" key={alias}>
                                                    <div className="settings__row__label">
                                                        {alias}
                                                    </div>
                                                    { canEditAliases &&
                                                        <IconButton path={mdiClose} size="1em" 
                                                            clickFunc={() => {
                                                                const newAliases = [...roomAliases.filter((a) => a !== alias)]
                                                                setAliases(newAliases, {action: "remove", alias: alias});
                                                            }}
                                                        />
                                                    }
                                                </div>
                                            )
                                        })
                                    }
                                    { canEditAliases &&
                                        <div className="settings__row settings__row__label">
                                            <form className="room-settings__new-alias" onSubmit={submitAlias}>
                                                <input placeholder="Add alias" type="text"
                                                    className={classList("textbox__input", {"textbox__input--error": !newAliasValid})}
                                                    value={newAlias} onChange={(e) => {setNewAlias(e.target.value); setNewAliasValid(true)}} 
                                                />
                                            </form>
                                            <IconButton path={mdiCheck} subClass="settings__row__action" size="1em" clickFunc={submitAlias}/>
                                        </div>
                                    }
                                </Section>
                            :
                                <Button link onClick={loadAliases}>Load aliases</Button>
                            }
                        </div>
                    </div>
                </Section>
            </div>
        </Section>
    </>)
}


const getBans = (room: Room) => room.getMembersWithMembership("ban");

function Bans({room}: {room: Room}) {
    const [bannedMembers, setBannedMembers] = useState<RoomMember[]>(getBans(room));

    const [loadingRef, setLoadingRef] = useState<HTMLDivElement>();
    const loaded = useScrollPaginate(loadingRef, 30)


    const member = getMember(room.roomId, global.matrix.getUserId());
    // Calculate whether the user has the power level needed to ban users
    const powerLevelEvent = getPowerLevels(room);
    const minBanPowerLevel = powerLevelEvent.ban || 50;
    const myPowerLevel = member.powerLevel;
    const canEditBans = myPowerLevel >= minBanPowerLevel;

    return (
        <Section name={`Banned Users (${bannedMembers.length})`}>
            {
                bannedMembers.slice(0, loaded).map((member) => {
                    const banEvent = member.events.member.getContent();

                    const senderId = member.events.member.getSender();
                    const sender = getMember(room.roomId, senderId);

                    return (
                        <div className="settings__row" key={member.userId}>
                            { member &&
                                <div className="room-settings__members__avatar">
                                    <MemberAvatar member={member} />
                                </div>
                            }
                            <div className="settings__row__label">
                                {member.name}

                                <div className="settings__row__label--desc">
                                    {banEvent.reason ? banEvent.reason : null}
                                    {` - ${sender?.name || senderId}`}
                                </div>
                            </div>
                            { canEditBans &&
                                <AsyncButton activeText="Unban" successText="Success"
                                    func={async () => {
                                        const newBanList = bannedMembers.filter((m) => m.userId !== member.userId);
                                        await global.matrix.ban(room.roomId, member.userId);
                                        setBannedMembers(newBanList);
                                    }}
                                />
                            }
                        </div>
                    )
                })
            }
            <div ref={setLoadingRef} style={{height: "1px", width: "100%"}}></div>
        </Section>
    )
}

function Advanced({ room }: {room: Room}) {
    return (
        <Section name="Advanced">
            <div className="settings__row">
                <div className="settings__row__label">Room ID:</div>
                { room.roomId }
            </div>
            <div className="settings__row">
                <div className="settings__row__label">Room Version:</div>
                { room.getVersion() }
            </div>
        </Section>
    )
}
