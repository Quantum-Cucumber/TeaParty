import type { Room } from "matrix-js-sdk";

import { Option, OptionIcon } from "../components/elements";

import { useCatchState } from "../utils/hooks";

import { mdiBellAlert, mdiBellOff, mdiBellOutline, mdiBellRing } from "@mdi/js";

import { ConditionKind, IPushRules, PushRuleActionName, PushRuleKind } from "matrix-js-sdk/lib/@types/PushRules";


export const enum pushStates {
    default,
    muted,
    important,
    all,
}

const notifDisplay = [
    {
        type: pushStates.default,
        icon: mdiBellOutline,
        text: "Default",
    },
    {
        type: pushStates.all,
        icon: mdiBellRing,
        text: "All messages",
    },
    {
        type: pushStates.important,
        icon: mdiBellAlert,
        text: "Mentions & keywords",
    },
    {
        type: pushStates.muted,
        icon: mdiBellOff,
        text: "None",
    },
]

export function getRoomNotifIcon(room: Room) {
    const state = roomNotifSetting(room);

    return notifDisplay.find((element) => {
        return element.type === state;
    })?.icon;
}

function roomNotifSetting(room: Room) {
    // Check overrides for mutes - highest priority
    if (findRoomMuteOverride(room)) {
        return pushStates.muted;
    }

    // Check room settings
    const roomRules = global.matrix.getRoomPushRule("global", room.roomId);
    if (roomRules === undefined || !roomRules.enabled) {return pushStates.default}

    switch (roomRules.actions[0]) {
        case PushRuleActionName.Notify:
        case PushRuleActionName.Coalesce:
            return pushStates.all;
        case PushRuleActionName.DontNotify:  // There is likely an override for mentions that will trump this rule
        default:
            return pushStates.important;
    }
}

function findRoomMuteOverride(room: Room) {
    const pushRules: IPushRules = global.matrix.pushRules;
    const overrides = pushRules.global?.override || [];
    for (const override of overrides) {
        // Override has a condition
        if (override.enabled && override.conditions && override.conditions.length === 1) {
            const condition = override.conditions[0];
            // If condition is for this room
            if (condition.kind === ConditionKind.EventMatch && condition.key === "room_id" && condition.pattern === room.roomId) {
                // If action is to not notify
                if (override.actions.length === 1 && override.actions[0] === PushRuleActionName.DontNotify) {
                    console.log(override)
                    return override;
                }
            }
        }
    }

    return null
}

export function NotificationOptions({ room }: {room: Room}) {
    const [notifSetting, setNotifSetting] = useCatchState(roomNotifSetting(room), setNotifs);

    async function setNotifs(newState: pushStates) {
        switch (newState) {
            case pushStates.default:
                await clearRoomPushRule(room);
                await unmuteRoom(room);
                break;
            case pushStates.all:
            case pushStates.important:
                await setRoomPushRule(room, newState);
                await unmuteRoom(room);
                break;
            case pushStates.muted:
                await muteRoom(room);
                break;
            default:
                throw new Error();
        }
    }

    return (<>{
        notifDisplay.map(({type, icon, text}) => {
            return (
                <Option compact text={text} k={type} selected={notifSetting} select={setNotifSetting} key={type}
                    icon={<OptionIcon path={icon} />}
                />
            )
        })
    }</>)
}


// Actions

async function muteRoom(room: Room) {
    // Set new override rule
    const newRule = {
        actions: [PushRuleActionName.DontNotify],
        conditions: [{
            kind: "event_match",
            key: "room_id",
            pattern: room.roomId,
        }],
    }
    await global.matrix.addPushRule("global", PushRuleKind.Override, room.roomId, newRule)

    // Apply the override first, if that fails, no changes will be made
    // If the next step fails, the override will still apply, so win/win?

    // Clear existing room rules
    const roomRule = global.matrix.getRoomPushRule("global", room.roomId);
    if (roomRule) {
        console.log("remove");
        await global.matrix.deletePushRule("global", PushRuleKind.RoomSpecific, roomRule.rule_id)
    }
}

async function unmuteRoom(room: Room) {
    const roomMuteOverride = findRoomMuteOverride(room);
    if (roomMuteOverride) {
        await global.matrix.deletePushRule("global", PushRuleKind.Override, roomMuteOverride.rule_id);
    }
}

async function setRoomPushRule(room: Room, rule: pushStates.all | pushStates.important) {
    let body: Record<string, [PushRuleActionName]>;
    switch (rule) {
        case pushStates.all:
            body = {
                actions: [PushRuleActionName.Notify],  // This confuses element off and i find that funny
            }
            break;
        case pushStates.important:
            body = {
                actions: [PushRuleActionName.DontNotify],
            }
            break;
        default:  // Won't occur if typing is adhered to
            return;
    }

    await global.matrix.addPushRule("global", PushRuleKind.RoomSpecific, room.roomId, body);
}

async function clearRoomPushRule(room: Room) {
    // Delete the room's push rule - leaving notifications to the defaults
    if (global.matrix.getRoomPushRule("global", room.roomId)) {
        await global.matrix.deletePushRule("global", PushRuleKind.RoomSpecific, room.roomId);
    }
}
