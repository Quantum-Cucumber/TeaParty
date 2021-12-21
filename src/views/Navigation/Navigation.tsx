import "./Navigation.scss";
import React, { useContext, useEffect, useState } from "react";
import { useHistory } from "react-router-dom";

import { IconButton, Option, OptionDropDown, RoomIcon } from "../../components/elements";
import { Tooltip, popupCtx } from "../../components/popups";
import { Resize } from "../../components/wrappers";
import { UserAvatar } from "../../components/user";
import useRoomStates, { useGroupBreadcrumbs, getChildRoomsFromGroup, roomInGroup, roomStatesType } from "./RoomStates";
import { InvitesIcon } from "./Invites";
import { ExploreIcon } from "./RoomExplorer";
import RoomOptions from "./RoomOptions";

import { getRootSpaces, getSpaceChildren } from "../../utils/roomFilters";
import { classList } from "../../utils/utils";
import Settings, { isSpaceCollapsed, setSpaceCollapsed } from "../../utils/settings";

import { Icon } from "@mdi/react";
import { mdiCog, mdiHomeVariant, mdiAccountMultiple, mdiDotsHorizontal } from "@mdi/js";

import type { Room, User } from "matrix-js-sdk";
import type { groupType } from "./RoomStates";


type NavigationProps = {
    currentRoom: string,
    selectRoom: React.Dispatch<string | null>,
    hideRoomListState: [boolean, React.Dispatch<React.SetStateAction<boolean>>],
}

function Navigation({ currentRoom, selectRoom, hideRoomListState }: NavigationProps) {
    const history = useHistory();
    // Name will be displayed above the room list and can't (always) be inferred from the key
    const [currentGroup, setGroup] = useState<groupType>({ name: "Home", key: "home" });
    const [showRoomSeperate, setShowRoomSeperate] = useState<Room>(null);
    
    const [collapseGroups, setCollapseGroups] = useState<boolean>();
    useEffect(() => {
        setCollapseGroups(hideRoomListState[0] && Settings.get("collapseGroups"))
    }, [hideRoomListState])

    const [roomStates, invitedRooms] = useRoomStates();  // Manages room and invite updating
    useGroupBreadcrumbs({currentGroup, currentRoom, selectRoom});  // Select the relevant room when a group is selected
    

    // Get the total length of all the value arrays
    const invLen: number = Object.values(invitedRooms).reduce((x, invs) => {return x + invs.length}, 0);

    // If the current room isn't in the room list, add an entry above the groups list to represent the selected room
    useEffect(() => {
        const room: Room = global.matrix.getRoom(currentRoom);
        if (room && !roomInGroup(currentGroup.key, room)) {
            setShowRoomSeperate(room);
        }
        else {
            setShowRoomSeperate(null);
        }
    }, [currentRoom, currentGroup])

    return (
        <>
            <div className={classList("scroll--hidden", "column", "column--groups", {"column--groups--collapsed": collapseGroups})}>
                { showRoomSeperate &&
                    <Group currentGroup={currentGroup} roomStates={roomStates} groupName={showRoomSeperate.name} k={currentGroup.key}>
                        <RoomIcon room={showRoomSeperate} />
                    </Group>
                }
                {invLen !== 0 && 
                    <InvitesIcon invites={invitedRooms} invLen={invLen} />
                }
                { (showRoomSeperate || invLen !== 0) &&
                    <div className="group__seperator"></div>
                }

                <GroupList currentGroup={currentGroup} setGroup={setGroup} roomStates={roomStates} />
                
                <div className="group__seperator"></div>
                <ExploreIcon />
            </div>
            <Resize side="right" initialSize={260} collapseSize={collapseGroups ? 170 : 100} collapseState={hideRoomListState}>
                <div className="column column--rooms">
                    <div className="header column--rooms__label-holder">
                        <div className="column--rooms__label">
                            {currentGroup.name}
                        </div>
                    </div>
                    <div className="column--rooms__holder scroll--hover">
                        <RoomList rooms={getChildRoomsFromGroup(currentGroup.key)} roomStates={roomStates} currentRoom={currentRoom} selectRoom={selectRoom} spacePath={[currentGroup.key]} />
                    </div>

                    <div className="client__user-bar">
                        <MyUser />
                        <div className="client__user-bar__options-box">
                            <IconButton path={mdiCog} clickFunc={() => {history.push("/settings/client")}} subClass="client__user-bar__options" size="24px" tipDir="top" tipText="Settings" />
                        </div>
                    </div>
                </div>
            </Resize>
        </>
    );
}

type GroupListProps = Omit<GroupProps, "groupName" | "k" | "builtin" | "children">
function GroupList(props: GroupListProps) {
    const groups = [
        <Group {...props} groupName="Home" key="home" k="home" builtin>
            <Icon path={mdiHomeVariant} color="var(--text)" size="100%" />
        </Group>,
        <Group {...props} groupName="Direct Messages" key="directs" k="directs" builtin>
            <Icon path={mdiAccountMultiple} color="var(--text)" size="100%" />
        </Group>,
    ];

    getRootSpaces().forEach((space) => {
        const key = space.roomId;

        groups.push(
            <Group {...props}
                groupName={space.name}
                key={key} k={key}
            >
                <RoomIcon room={space} />
            </Group>
        );
    })

    return <>{groups}</>;
}

type GroupProps = {
    setGroup?: (group: groupType) => void,
    currentGroup: groupType,
    roomStates: roomStatesType,
    groupName: string,
    k: string,
    children: React.ReactNode,
    builtin?: boolean,
}
function Group({ setGroup = () => {}, currentGroup, roomStates, groupName, k, children, builtin = false }: GroupProps) {
    const setPopup = useContext(popupCtx);

    const roomState = roomStates[k];
    const read = roomState ? roomState.read : true;
    const notifications = roomState ? roomState.notifications : 0;

    return (
        <div className="group__holder">
            <Tooltip text={groupName} dir="right">
                <div
                    className={classList("group", {"group--default": builtin}, {"group--selected": currentGroup.key === k})}
                    onClick={() => {
                        if (k !== currentGroup.key) {
                            setGroup({ name: groupName, key: k })
                        }
                    }}
                    onContextMenu={builtin ? null : (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPopup(
                            <RoomOptions roomId={k} parent={e.target as HTMLElement} mouseEvent={e} />
                        )
                    }}
                >
                    {children}
                    {notifications > 0 && <div className="group__notification">{notifications}</div>}
                </div>
            </Tooltip>
            <div className="group__unread" style={{display: read ? "none" : "block"}}></div>
        </div>
    );
}

type RoomListProps = {
    rooms: Room[],
    roomStates: roomStatesType,
    currentRoom: string,
    selectRoom: React.Dispatch<string>,
    spacePath?: string[],  // details the path to the parent subspace
}
function RoomList({ rooms, roomStates, currentRoom, selectRoom, spacePath = [] }: RoomListProps) {
    const setPopup = useContext(popupCtx);
    const showRoomIcons: boolean = Settings.get("showRoomIcons");

    const elements = rooms.map((room) => {
        const key = room.roomId;
        const icon = showRoomIcons ? <RoomIcon room={room} /> : null;

        const roomState = roomStates[room.roomId];
        const unreadDot = roomState ? !roomState.read : false;
        const notifications = roomState ? roomState.notifications : 0;

        const indicator = (<>
            {
                notifications ?
                <div className="option__notification">{notifications}</div>
            : unreadDot &&
                <div className="option__unread" />
            }
            <IconButton path={mdiDotsHorizontal} subClass="option__options" size="1.2em"
                clickFunc={(e: React.MouseEvent<HTMLElement>) => {
                    e.stopPropagation();
                    setPopup(
                        <RoomOptions roomId={key} parent={e.target as HTMLElement} mouseEvent={e} read={!!notifications || !unreadDot} />
                    )
                }}
            />
        </>)

        if (room.isSpaceRoom()) {
            const children = getSpaceChildren(room);
            const newSpacePath = [...spacePath, room.roomId];

            return (
                <OptionDropDown key={key} icon={icon} text={room.name}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPopup(
                            <RoomOptions roomId={key} parent={e.target} mouseEvent={e} read={!!notifications || !unreadDot} />
                        )
                    }}
                    indicator={indicator}
                    startOpen={!isSpaceCollapsed(newSpacePath)}
                    onToggle={(open) => setSpaceCollapsed(newSpacePath, !open)}
                >
                    <RoomList rooms={children} roomStates={roomStates} currentRoom={currentRoom} selectRoom={selectRoom} spacePath={newSpacePath} /> 
                </OptionDropDown>
            )
        }
        else {
            return (
                <Option key={key} k={key} text={room.name} icon={icon} selected={currentRoom} select={selectRoom} 
                    onContextMenu={(e: React.MouseEvent<HTMLElement>) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPopup(
                            <RoomOptions roomId={key} parent={e.target as HTMLElement} mouseEvent={e} read={!!notifications || !unreadDot} />
                        )
                    }}
                >
                    {indicator}
                </Option>
            )
        }
    });

    return elements.length !== 0 ? <>{elements}</> : (<div className="room__placeholder">No joined rooms</div>);
}


const getUser = () => global.matrix.getUser(global.matrix.getUserId()) as User;

function MyUser() {
    const defaultText = "Copy user ID";
    const clickedText = "Copied";
    const [tooltipText, setTooltipText] = useState(defaultText);

    function click() {
        navigator.clipboard.writeText(global.matrix.getUserId());
        setTooltipText(clickedText);
        setTimeout(() => setTooltipText(defaultText), 1000);
    }


    const [myDisplayName, setMyDisplayName] = useState(getUser().displayName);

    // user.displayName doesn't necessarily hold the right display name apparantly?
    useEffect(() => {
        global.matrix.getProfileInfo(global.matrix.getUserId(), "displayname")
        .then(({ displayname }) => {
            setMyDisplayName(displayname);
        })
    }, [])

    return (<>
            <div className="user__avatar">
                <UserAvatar user={getUser()} />
            </div>
            <Tooltip text={tooltipText} dir="top" x="mouse" delay={0.2}>
                <div className="user__text-box" onClick={click}>
                    <span className="user__text user__username">{myDisplayName}</span>
                    <span className="user__text user__homeserver">{global.matrix.getDomain()}</span>
                </div>
            </Tooltip>
    </>);
}


export default Navigation;
