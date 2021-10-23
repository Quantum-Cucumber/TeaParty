import "./Navigation.scss";
import { useEffect, useState } from "react";
import { mdiCog, mdiHomeVariant, mdiAccountMultiple, mdiEmail, mdiCheck, mdiClose } from "@mdi/js";
import { Icon } from "@mdi/react";

import { Button, Option, DropDown, Loading } from "../../components/elements";
import { Tooltip, Modal } from "../../components/popups";
import { Resize } from "../../components/wrappers";
import { Avatar } from "../../components/user";

import { getChildRoomsFromGroup, getRootSpaces, getSpaceChildren } from "./navManager";
import { acronym, useBindEscape, classList } from "../../utils/utils";
import { getHomeserver } from "../../utils/matrix-client";

function Navigation({ roomNav, setPage, currentRoom, selectRoom, invites }) {
    const [currentGroup, setGroup] = useState({ name: "Home", key: "home" });
    const [groupRooms, setGroupRooms] = useState(getChildRoomsFromGroup(currentGroup.key))
    // Get the total length of all the value arrays
    const invLen = Object.values(invites).reduce((x, invs) => {return x + invs.length}, 0);

    useEffect(() => {
        setGroupRooms(getChildRoomsFromGroup(currentGroup.key))
    }, [currentGroup])

    return (
        <>
            <div className="column column--groups scroll--hidden">
                {invLen !== 0 && 
                    <>
                    <InvitesIcon invites={invites} invLen={invLen} />
                    <div className="group__seperator"></div>
                    </>
                }
                <GroupList roomNav={roomNav} setGroup={setGroup} currentGroup={currentGroup} />
            </div>
            <Resize initialSize={260} side="right" minSize="60px" collapseSize={100}>
                <div className="column column--rooms">
                    <div className="header column--rooms__label">{currentGroup.name}</div>
                    <div className="column--rooms__holder scroll--hover">
                        {groupRooms ?
                            <RoomList rooms={groupRooms} currentGroup={currentGroup} currentRoom={currentRoom} selectRoom={selectRoom} /> :
                            <div className="column--rooms__holder__loading"><Loading size="30px" /></div>
                        }
                    </div>

                    <div className="client__user-bar">
                        <MyUser />
                        <div className="client__user-bar__options-box">
                            <Button path={mdiCog} clickFunc={() => {setPage("settings")}} subClass="client__user-bar__options" size="24px" tipDir="top" tipText="Settings" />
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
        const icon = space.getAvatarUrl(global.matrix.getHomeserverUrl(), 96, 96, "crop");
        const image = icon ?
            <img className="room__icon" src={icon} alt={acronym(space.name)} /> :
            <div className="room__icon">{acronym(space.name)}</div>;

        groups.push(
            <Group {...props}
                groupName={space.name}
                key={key} k={key}
            >
                {image}
            </Group>
        );
    })

    return groups;
}
function Group({ roomNav, setGroup, currentGroup, groupName, k, children, builtin = false }) {
    const read = true;
    const notifications = 0;

    return (
        <div className="group__holder">
            <Tooltip text={groupName} dir="right">
                <div
                    className={classList("group", {"group--default": builtin}, {"group--selected": currentGroup.key === k})}
                    onClick={() => {
                        if (k !== currentGroup.key) {
                            setGroup({ name: groupName, key: k })
                            roomNav.current.groupSelected(k);
                        }
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

function getRoomIcon(room, isDm = false) {
    var icon = room.getAvatarUrl(global.matrix.getHomeserverUrl(), 96, 96, "crop");

    if (!icon && isDm) {
        const user = global.matrix.getUser(room.guessDMUserId());
        icon = <Avatar subClass="room__icon" user={user} />
    } else {
        icon = icon ?
               <img className="room__icon" src={icon} alt={acronym(room.name)} /> :
               <div className="room__icon">{acronym(room.name)}</div>;
    }

    return icon;
}

function RoomList({ rooms, currentGroup, currentRoom, selectRoom }) {
    const elements = rooms.map((room) => {
        const key = room.roomId;
        const icon = (
            <div className="room__icon__crop">
                {getRoomIcon(room, currentGroup.key === "directs")}
            </div>
        );
        const notifications = 0;
        const unreadDot = false;

        if (room.isSpaceRoom()) {
            const children = getSpaceChildren(room);

            return (
                <DropDown key={key} icon={icon} text={room.name}>
                    <RoomList rooms={children} currentGroup={currentGroup} currentRoom={currentRoom} selectRoom={selectRoom} /> 
                </DropDown>
            )
        }
        else {
            return (
                <Option key={key} k={key} text={room.name} selected={currentRoom} select={selectRoom} 
                        unread={unreadDot} notification={notifications}>
                    {icon}
                </Option>
            )
        }
    });

    return elements.length !== 0 ? elements : "Nothing here :(";
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
                    <span className="user__text user__homeserver">{getHomeserver(user)}</span>
                </div>
            </Tooltip>
    </>);
}

function InvitesIcon({ invLen, invites }) {
    const [showModal, setShowModal] = useState(false);

    return (
        <div className="group__holder">
            <Tooltip text="Invites" dir="right">
                <div className="group group--default" onClick={() => setShowModal(true)}>
                    <Icon path={mdiEmail} color="var(--text)" size="100%" />
                    <div className="group__notification">{invLen}</div>
                </div> 
            </Tooltip>
            {showModal && <Invites setShowModal={setShowModal} invitedRooms={invites}/>}
        </div>
    );    
}

function Invites({ setShowModal, invitedRooms }) {
    if (invitedRooms.length === 0) {setShowModal(false)}
    useBindEscape(setShowModal, false);

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
        <Modal title="Invites" hide={() => setShowModal(false)}>
            {holders}
        </Modal>
    )
}

function InviteEntry({ invite, direct }) {
    const [status, setStatus] = useState(null);
    const { inviter, room } = invite;

    const icon = getRoomIcon(room);

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
            <div className="invite-entry__icon">{icon}</div>
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
