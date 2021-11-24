import "./RoomSettings.scss";
import { useCallback, useEffect, useState, useRef } from "react";
import { useHistory } from "react-router-dom";

import SettingsPage from "./Settings"
import { EditableText, DropDown, Section, Toggle, DropDownRow } from "./components";
import { Button, RoomIcon } from "../../components/elements";
import { Avatar } from "../../components/user";

import { getMember, userIdRegex } from "../../utils/matrix-client";
import { classList, stringSize } from "../../utils/utils";

import { mdiChatQuestion, mdiCheck, mdiClose, mdiEarth, mdiEmail, mdiShield, mdiText } from "@mdi/js"

import type { IContent, Room } from "matrix-js-sdk";
import type {pagesType} from "./Settings";
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
                <PowerLevels room={room} />
            )
        },
    },
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

const getPowerLevels = (room: Room) => room.currentState.getStateEvents("m.room.power_levels")[0]?.getContent();

function PowerLevels({ room }: {room: Room}) {
    const [powerLevelState, setPowerLevels] = useState(getPowerLevels(room));
    const canEditPowerLevels = room.currentState.maySendStateEvent("m.room.power_levels", global.matrix.getUserId());


    const savePowerLevels = useCallback((key: string, value: number) => {
        const newState = {...powerLevelState, [key]: value};
        setPowerLevels(newState);
        global.matrix.sendStateEvent(room.roomId, "m.room.power_levels", newState, "")
        .catch(() => {
            setPowerLevels(powerLevelState);
        })
    }, [powerLevelState, room]);


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

    const member = getMember(room.roomId, global.matrix.getUserId());
    const maxPowerLevel = member ? member.powerLevel : defaultPowerLevel;

    return (<>
        <Section name="Permissions">
            {
                Object.entries(powerLevelContent).map(([key, {text, defaultValue}]) => {
                    return (
                        <DropDownRow key={key} label={text} value={key in powerLevelState ? powerLevelState[key] : defaultValue}
                            options={powerLevelOptions} allowCustom number canEdit={canEditPowerLevels} min={0} max={maxPowerLevel}
                            saveFunc={(value) => {savePowerLevels(key, value)}}
                        />
                    )
                })
            }
        </Section>
        <Section name="Members">
            <MemberPowerLevels room={room} maxPowerLevel={maxPowerLevel} powerLevelOptions={powerLevelOptions} />
        </Section>
    </>)
}


type MemberPowerLevelsProps = {
    room: Room,
    maxPowerLevel: number,
    powerLevelOptions: {
        [key: number]: {
            text: string,
        },
    },
}

function MemberPowerLevels({ room, maxPowerLevel, powerLevelOptions }: MemberPowerLevelsProps) {
    const powerLevelEvent = useRef<IContent>();
    const [powerLevelUsers, setPowerLevelUsers] = useState<{[userId: string]: number}>({});
    // New power level entry field trackers
    const [newUserId, setNewUserId] = useState("");
    const [newUserIdValid, setNewUserIdValid] = useState(true);
    const [newPowerLevel, setNewPowerlevel] = useState(0);

    useEffect(() => {
        const event = getPowerLevels(room);
        powerLevelEvent.current = event;
        setPowerLevelUsers(event.users || {});
    }, [room])

    const canEditPowerLevels = room.currentState.maySendStateEvent("m.room.power_levels", global.matrix.getUserId());

    const save = useCallback(() => {
        const newState = {...powerLevelEvent.current};
        newState.users = powerLevelUsers;

        global.matrix.sendStateEvent(room.roomId, "m.room.power_levels", newState, "")
        .catch(() => {
            setPowerLevelUsers(powerLevelEvent.current.users || {});
        })
    }, [room, powerLevelUsers])

    return (<>
        {
            Object.entries(powerLevelUsers)
            .sort((a, b) => b[1] - a[1])  // Sort by power level
            .map(([userId, powerLevel]) => {
                const member = getMember(room.roomId, userId);
                const user = global.matrix.getUser(userId);

                return (
                    <div className="settings__row" key={userId}>
                        { user &&
                            <Avatar user={user} subClass="room-settings__members__avatar" />
                        }
                        <div className="settings__row__label">
                            {member ? member.name : userId}
                        </div>

                        <DropDown value={powerLevel} options={powerLevelOptions} allowCustom number canEdit={canEditPowerLevels} min={0} max={maxPowerLevel}
                            saveFunc={(value) => {
                                setPowerLevelUsers((current) => {
                                    const newMapping = {...current};
                                    newMapping[userId] = value;
                                    return newMapping;
                                })
                            }}
                        />

                        { canEditPowerLevels &&
                            <Button path={mdiClose} subClass="settings__row__action" size="1em" 
                                clickFunc={() => {
                                    setPowerLevelUsers((current) => {
                                        const newMapping = {...current};
                                        delete newMapping[userId];
                                        return newMapping;
                                    })
                                }}
                            />
                        }
                    </div>
                )
            })
        }

        { canEditPowerLevels && <>
            <div className="settings__row settings__row__label">
                <input placeholder="User ID" type="text"
                    className={classList("textbox__input", "room-settings__members__input", {"textbox__input--error": !newUserIdValid})}
                    value={newUserId} onChange={(e) => {setNewUserId(e.target.value.trim()); setNewUserIdValid(true)}} 
                />
                <DropDown value={newPowerLevel} options={powerLevelOptions} allowCustom number saveFunc={setNewPowerlevel} min={0} max={maxPowerLevel} />
                <Button path={mdiCheck} subClass="settings__row__action" size="1em"
                    clickFunc={() => {
                        // Validate new user ID
                        if (!userIdRegex.test(newUserId)) {
                            setNewUserIdValid(false);
                            return;
                        }

                        setPowerLevelUsers((current) => {
                            const newMapping = {...current};
                            newMapping[newUserId] = newPowerLevel;
                            return newMapping;
                        });
                        setNewUserId("");
                        setNewPowerlevel(0);
                    }}
                />
            </div>
            <button className="settings__button room-settings__members__save" onClick={save}>Save</button>
        </>}
    </>)
}


