import { useState, useMemo, useEffect } from "react";
import { EventType } from "matrix-js-sdk/lib/@types/event";

import { DropDown, Section, DropDownRow } from "../components";
import { IconButton, ManualTextBox } from "../../../components/elements";
import { MemberAvatar } from "../../../components/user";

import { getMember, userIdRegex } from "../../../utils/matrix-client";
import { asyncDebounce } from "../../../utils/utils";
import { useCatchState } from "../../../utils/hooks";

import {mdiCheck, mdiClose} from "@mdi/js";

import type { Room } from "matrix-js-sdk";


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
        text: "Change all other room settings",
        defaultValue: 50
    },
})

const stateEvents = Object.freeze({
    [EventType.RoomCanonicalAlias]: "Set canonical room aliases",
    [EventType.RoomJoinRules]: "Change this room's join rules",
    [EventType.RoomPowerLevels]: "Change room permissions",
    [EventType.RoomName]: "Change the room name",
    [EventType.RoomTopic]: "Change this room's topic",
    [EventType.RoomAvatar]: "Change the room avatar",
    [EventType.RoomPinnedEvents]: "Pin/unpin events",
    [EventType.RoomServerAcl]: "Modify the room ACL",
    [EventType.RoomGuestAccess]: "Control whether guest users can join this room",
    [EventType.RoomHistoryVisibility]: "Modify event visibility",
    [EventType.RoomEncryption]: "Modify this room's encryption settings",
    [EventType.RoomTombstone]: "Upgrade this room",
});
const stateEventOptions = Object.freeze(
    Object.fromEntries(
        Object.entries(stateEvents)
        .map(([eventType, text]) => {
            return [eventType, {text: text}]
        })
    )
);


type mRoomPowerlevels = {
    events?: {
        [eventType: string]: number,
    },
    users?: {
        [userId: string]: number,
    },
} & {[key: string]: number};

export const getPowerLevels = (room: Room) => room.currentState.getStateEvents(EventType.RoomPowerLevels)[0]?.getContent() as object as mRoomPowerlevels;

export default function RoomPermissions({ room }: {room: Room}) {
    // Inline function has to be defined before useCatchState
    const save = useMemo(() => asyncDebounce(async (newState: mRoomPowerlevels) => {
        await global.matrix.sendStateEvent(room.roomId, EventType.RoomPowerLevels, newState, "")
    }, 2500), [room]);

    const [powerLevelState, setPowerLevels] = useCatchState(() => getPowerLevels(room), save);  // The local view of the power levels
    
    const [newStateOverride, setNewStateOverride] = useState(null);
    const [newStateOverridePL, setNewStateOverridePL] = useState(0);

    const canEditPowerLevels = room.currentState.maySendStateEvent(EventType.RoomPowerLevels, global.matrix.getUserId());

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
    const maxPowerLevel = (member ? member.powerLevel : defaultPowerLevel) - 1;  // -1 to disallow altering own powerlevel

    const stateEventDefault = powerLevelState.state_default || 50;

    return (<>
        <Section name="Permissions">
            {
                Object.entries(powerLevelContent).map(([key, {text, defaultValue}]) => {
                    const value = key in powerLevelState ? powerLevelState[key] : defaultValue;
                    return (
                        <DropDownRow key={key} label={text} value={value}
                            options={powerLevelOptions} allowCustom number canEdit={canEditPowerLevels && value <= maxPowerLevel} min={0} max={maxPowerLevel}
                            saveFunc={(value) => {
                                const newState = {...powerLevelState, [key]: value};
                                setPowerLevels(newState);
                            }}
                        />
                    )
                })
            }
        </Section>
        <Section name="Room Event Overrides">
            {
                Object.entries(powerLevelState.events as {[key: string]: number} || {})
                .filter(([eventType]) => eventType in stateEvents)  // Only list known events
                .filter(([, powerLevel]) => powerLevel !== stateEventDefault)  // Only show overrides, i.e. those with different PL to the state default
                .map(([eventType, powerLevel]) => {
                    const text = stateEvents[eventType]
                    return (
                        <DropDownRow key={eventType} label={text} value={powerLevel}
                            options={powerLevelOptions} allowCustom number canEdit={canEditPowerLevels && powerLevel <= maxPowerLevel} min={0} max={maxPowerLevel}
                            saveFunc={(value) => {
                                const newState = {...powerLevelState};
                                newState.events = {...newState.events, [eventType]: value};
                                setPowerLevels(newState);
                            }}
                        />
                    )
                })
            }
            { canEditPowerLevels &&
                <div className="settings__row settings__row__label">
                    <div style={{flex: "1 1 auto"}}>
                        <DropDown placeholder="Add override" value={newStateOverride} options={stateEventOptions} allowCustom saveFunc={setNewStateOverride} />
                    </div>
                    <DropDown value={newStateOverridePL} options={powerLevelOptions} allowCustom number canEdit={canEditPowerLevels} min={0} max={maxPowerLevel}saveFunc={setNewStateOverridePL}/>
                    
                    <IconButton path={mdiCheck} subClass="settings__row__action" size="1em"
                        clickFunc={() => {
                            // Validate new user ID
                            if (!newStateOverride) {
                                return;
                            }

                            const newState = {...powerLevelState};
                            newState.events = {...newState.events, [newStateOverride]: newStateOverridePL};
                            setPowerLevels(newState);
                            setNewStateOverride(null);
                            setNewStateOverridePL(0);
                        }}
                    />
                </div>
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
    const save = useMemo(() => asyncDebounce(async (newState: ReturnType<typeof getPowerLevels>) => {
        await global.matrix.sendStateEvent(room.roomId, EventType.RoomPowerLevels, newState, "")
    }, 2500), [room])
    const [powerLevelEvent, setPowerLevelEvent] = useCatchState(() => getPowerLevels(room), save);

    // New power level entry field trackers
    const [newUserId, setNewUserId] = useState("");
    const [newUserIdValid, setNewUserIdValid] = useState(true);
    const [newPowerLevel, setNewPowerlevel] = useState(0);
    // When user id is edited, clear invalid state
    useEffect(() => {
        setNewUserIdValid(true);
    }, [newUserId])

    const canEditPowerLevels = room.currentState.maySendStateEvent(EventType.RoomPowerLevels, global.matrix.getUserId());

    return (<>
        {
            Object.entries(powerLevelEvent.users)
            .sort((a, b) => b[1] - a[1])  // Sort by power level
            .map(([userId, powerLevel]) => {
                const member = getMember(room.roomId, userId);

                return (
                    <div className="settings__row" key={userId}>
                        { member &&
                            <div className="room-settings__members__avatar">
                                <MemberAvatar member={member} />
                            </div>
                        }
                        <div className="settings__row__label">
                            {member ? member.name : userId}
                        </div>

                        <DropDown value={powerLevel} options={powerLevelOptions} allowCustom number min={0} max={maxPowerLevel}
                            canEdit={canEditPowerLevels && powerLevel <= maxPowerLevel}
                            saveFunc={(value) => {
                                const newEvent = {...powerLevelEvent};
                                newEvent.users = {...newEvent.users, [userId]: value};
                                setPowerLevelEvent(newEvent);
                            }}
                        />

                        { (canEditPowerLevels && powerLevel <= maxPowerLevel) &&
                            <IconButton path={mdiClose} subClass="settings__row__action" size="1em" 
                                clickFunc={() => {
                                    const newEvent = {...powerLevelEvent};
                                    newEvent.users = {...newEvent.users};  // copy .users to not modify the SDK's state object
                                    delete newEvent.users[userId];
                                    setPowerLevelEvent(newEvent);
                                }}
                            />
                        }
                    </div>
                )
            })
        }

        { canEditPowerLevels && <>
            <div className="settings__row settings__row__label">
                <ManualTextBox placeholder="User ID" valid={newUserIdValid} value={newUserId} setValue={setNewUserId} />
                <DropDown value={newPowerLevel} options={powerLevelOptions} allowCustom number saveFunc={setNewPowerlevel} min={0} max={maxPowerLevel} />
                <IconButton path={mdiCheck} subClass="settings__row__action" size="1em"
                    clickFunc={() => {
                        // Validate new user ID
                        if (!userIdRegex.test(newUserId)) {
                            setNewUserIdValid(false);
                            return;
                        }

                        const newEvent = {...powerLevelEvent};
                        newEvent.users = {...newEvent.users, [newUserId.trim()]: newPowerLevel};
                        setPowerLevelEvent(newEvent);

                        setNewUserId("");
                        setNewPowerlevel(0);
                    }}
                />
            </div>
        </>}
    </>)
}