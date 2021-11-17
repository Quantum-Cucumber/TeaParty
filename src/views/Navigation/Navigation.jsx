import "./Navigation.scss";
import { useContext, useEffect, useState } from "react";
import { useHistory } from "react-router-dom";

import { Button, Option, OptionDropDown, Loading, RoomIcon } from "../../components/elements";
import { Tooltip, Modal, modalCtx, ContextMenu, popupCtx } from "../../components/popups";
import { Resize } from "../../components/wrappers";
import { Avatar } from "../../components/user";
import useRoomStates, { useGroupBreadcrumbs, getChildRoomsFromGroup, roomInGroup } from "./RoomStates";

import { getRootSpaces, getSpaceChildren } from "../../utils/roomFilters";
import { useOnKeypress } from "../../utils/hooks";
import { classList } from "../../utils/utils";
import { getHomeserver } from "../../utils/matrix-client";
import Settings from "../../utils/settings";

import { mdiCog, mdiHomeVariant, mdiAccountMultiple, mdiEmail, mdiCheck, mdiClose, mdiContentCopy } from "@mdi/js";
import { Icon } from "@mdi/react";


function Navigation({ currentRoom, selectRoom, hideRoomListState }) {
    const history = useHistory();
    // Name will be displayed above the room list and can't (always) be inferred from the key
    const [currentGroup, setGroup] = useState({ name: "Home", key: "home" });
    const [groupRooms, setGroupRooms] = useState(getChildRoomsFromGroup(currentGroup.key))
    const [showRoomSeperate, setShowRoomSeperate] = useState(null);
    
    const [collapseGroups, setCollapseGroups] = useState();
    useEffect(() => {
        setCollapseGroups(hideRoomListState[0] && Settings.get("collapseGroups"))
    }, [hideRoomListState])

    const [roomStates, invitedRooms] = useRoomStates({currentGroup, setGroupRooms});  // Manages room and invite updating
    useGroupBreadcrumbs({currentGroup, currentRoom, selectRoom});  // Select the relevant room when a group is selected
    

    // Get the total length of all the value arrays
    const invLen = Object.values(invitedRooms).reduce((x, invs) => {return x + invs.length}, 0);

    // When a group is selected, load its rooms
    useEffect(() => {
        setGroupRooms(getChildRoomsFromGroup(currentGroup.key))
    }, [currentGroup])

    // If the current room isn't in the room list, add an entry above the groups list to represent the selected room
    useEffect(() => {
        const room = global.matrix.getRoom(currentRoom);
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

                <GroupList setGroup={setGroup} currentGroup={currentGroup} roomStates={roomStates} />
            </div>
            <Resize side="right" initialSize={260} collapseSize={collapseGroups ? 170 : 100} collapseState={hideRoomListState}>
                <div className="column column--rooms">
                    <div className="header column--rooms__label-holder">
                        <div className="column--rooms__label">
                            {currentGroup.name}
                        </div>
                    </div>
                    <div className="column--rooms__holder scroll--hover">
                        <RoomList rooms={groupRooms} currentGroup={currentGroup} roomStates={roomStates} currentRoom={currentRoom} selectRoom={selectRoom} />
                    </div>

                    <div className="client__user-bar">
                        <MyUser />
                        <div className="client__user-bar__options-box">
                            <Button path={mdiCog} clickFunc={() => {history.push("/settings/client")}} subClass="client__user-bar__options" size="24px" tipDir="top" tipText="Settings" />
                        </div>
                    </div>
                </div>
            </Resize>
        </>
    );
}

function GroupList(props) {
    var groups = [
        <Group {...props} groupName="Home" key="home" k="home" builtin>
            <Icon path={mdiHomeVariant} color="var(--text)" size="100%" />
        </Group>,
        <Group {...props} groupName="Direct Messages" key="directs" k="directs" path={mdiHomeVariant} builtin>
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

    return groups;
}
function Group({ setGroup = ()=>{}, currentGroup, roomStates, groupName, k, children, builtin = false }) {
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
                            <RoomOptions roomId={k} parent={e.target} mouseEvent={e} />
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

function RoomList({ rooms, currentGroup, roomStates, currentRoom, selectRoom }) {
    const setPopup = useContext(popupCtx);
    const showRoomIcons = Settings.get("showRoomIcons");

    const elements = rooms.map((room) => {
        const key = room.roomId;
        const icon = showRoomIcons ? (
                                        <div className="room__icon__crop">
                                            <RoomIcon room={room} />
                                        </div>
                                     ) 
                                   : null;

        const roomState = roomStates[room.roomId];
        const unreadDot = roomState ? !roomState.read : false;
        const notifications = roomState ? roomState.notifications : 0;

        if (room.isSpaceRoom()) {
            const children = getSpaceChildren(room);

            return (
                <OptionDropDown key={key} icon={icon} text={room.name} notifications={notifications} unread={unreadDot}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPopup(
                            <RoomOptions roomId={key} parent={e.target} mouseEvent={e} />
                        )
                    }}
                >
                    <RoomList rooms={children} currentGroup={currentGroup} roomStates={roomStates} currentRoom={currentRoom} selectRoom={selectRoom} /> 
                </OptionDropDown>
            )
        }
        else {
            return (
                <Option key={key} k={key} text={room.name} selected={currentRoom} select={selectRoom} 
                    unread={unreadDot} notifications={notifications}
            
                    onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPopup(
                            <RoomOptions roomId={key} parent={e.target} mouseEvent={e} />
                        )
                    }}
                >
                    {icon}
                </Option>
            )
        }
    });

    return elements.length !== 0 ? elements : (<div className="room__placeholder">No joined rooms</div>);
}

function RoomOptions({ roomId, ...props }) {
    const setPopup = useContext(popupCtx);
    const history = useHistory();

    return (
        <ContextMenu {...props} x="align-mouse-left" y="align-mouse-top">
            <Option compact text="Copy Room ID" select={() => {
                    navigator.clipboard.writeText(roomId);
                    setPopup();
                }}
            >
                <Icon path={mdiContentCopy} size="1em" color="var(--text)" />
            </Option>
            <Option compact text="Settings" select={() => {
                    history.push("/settings/room/" + roomId);
                    setPopup();
                }}
            >
                <Icon path={mdiCog} size="1em" color="var(--text)" />
            </Option>
        </ContextMenu>
    )
}


function MyUser() {
    const defaultText = "Copy user ID";
    const clickedText = "Copied";
    const [tooltipText, setTooltipText] = useState(defaultText);

    const user = global.matrix.getUser(global.matrix.getUserId());

    function click() {
        navigator.clipboard.writeText(user.userId);
        setTooltipText(clickedText);
        setTimeout(() => setTooltipText(defaultText), 1000);
    }

    return (<>
            <Avatar subClass="user__avatar" user={user}></Avatar>
            <Tooltip text={tooltipText} dir="top" x="mouse" delay={0.5}>
                <div className="user__text-box" onClick={click}>
                    <span className="user__text user__username">{user.displayName}</span>
                    <span className="user__text user__homeserver">{getHomeserver(user.userId)}</span>
                </div>
            </Tooltip>
    </>);
}

function InvitesIcon({ invLen, invites }) {
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

function Invites({ invitedRooms }) {
    const setModal = useContext(modalCtx);
    function hide() {
        setModal();
    }

    if (invitedRooms.length === 0) {hide()};
    useOnKeypress("Escape", hide);

    // Make a holder for each invite type and populate with its values
    const holders = Object.keys(invitedRooms).reduce((holders, name) => {
        if (invitedRooms[name].length === 0) {return holders}
        const invites = invitedRooms[name].map((invite) => {
            return (
                <InviteEntry invite={invite} key={invite.room.roomId} direct={name === "Direct messages"} />
            );
        })

        return holders.concat([
            <div className="invites__modal__holder" key={name}>
                {name}
                {invites}
            </div>
        ]);
    }, []);

    return (
        <Modal title="Invites" hide={hide}>
            {holders}
        </Modal>
    )
}

function InviteEntry({ invite, direct }) {
    const [status, setStatus] = useState(null);
    const { inviter, room } = invite;

    function acceptInvite() {
        setStatus(<Loading size="1.5rem"/>);
        global.matrix.joinRoom(room.roomId).then(() => {
            setStatus("Joined");
        }).catch(() => {
            setStatus("Error")
        });

        if (direct) {
            // Update account data
            const directs = global.matrix.getAccountData("m.direct")?.getContent() || {};
            directs[inviter] = room.roomId;
            try {
                global.matrix.setAccountData("m.direct", directs);
            } catch (e) {
                console.warn(e);
            }
        }
    }

    function declineInvite() {
        setStatus(<Loading size="1.5rem"/>);
        global.matrix.leave(room.roomId).then(() => {
            setStatus("Declined");
        }).catch(() => {
            setStatus("Error")
        });
    }

    return (
        <div className="invite-entry">
            <div className="invite-entry__icon">
                <RoomIcon room={room} />
            </div>
            <div className="invite-entry__label">
                <div className="invite-entry__label--name">{room.name}</div>
                <div className="invite-entry__label--inviter">{inviter}</div>
            </div>
            { status === null ?
                <div className="invite-entry__buttons">
                    <div style={{"--button": "var(--error)"}} onClick={declineInvite}>
                        <Icon path={mdiClose} size="100%" />
                    </div>
                    <div style={{"--button": "var(--success)"}} onClick={acceptInvite}>
                        <Icon path={mdiCheck} size="100%" />
                    </div>
                </div>
            :
            <div className="invite-entry__status">{status}</div>
            }
        </div>
    )
}


export default Navigation;
