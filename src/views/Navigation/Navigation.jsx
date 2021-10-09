import "./Navigation.scss";
import { useState } from "react";
import { mdiCog, mdiHomeVariant, mdiAccountMultiple, mdiEmail, mdiCheck, mdiClose } from "@mdi/js";
import { Icon } from "@mdi/react";
import { Button, Tooltip, Loading, Option, Overlay } from "../../components/interface";
import { Avatar } from "../../components/user";
import { acronym, useBindEscape, classList } from "../../utils/utils";
import { get_username, get_homeserver } from "../../utils/matrix-client";

function Navigation({ groupList, roomPanel, setPage, currentRoom, selectRoom, roomNav, invites }) {
    const [currentGroup, setGroup] = useState({ name: "Home", key: "home" });
    // Get the total length of all the value arrays
    const invLen = Object.values(invites).reduce((x, invs) => {return x + invs.length}, 0);

    return (
        <>
            <div className="column column--groups scroll--hidden">
                {invLen !== 0 && 
                    <>
                    <InvitesIcon invites={invites} invLen={invLen} />
                    <div className="group__seperator"></div>
                    </>
                }
                <GroupList roomNav={roomNav} setGroup={setGroup} groupList={groupList} currentGroup={currentGroup} />
            </div>
            <div className="column column--rooms">
                <div className="column--rooms__label">{currentGroup.name}</div>
                <div className="column--rooms__holder scroll--hover">
                    {roomPanel ?
                        <RoomList rooms={roomPanel} currentGroup={currentGroup} currentRoom={currentRoom} selectRoom={selectRoom} /> :
                        <div className="column--rooms__holder__loading"><Loading size="30px" /></div>
                    }
                </div>

                <div className="client__user-bar">
                    <MyUser user={global.matrix.getUser(global.matrix.getUserId())} />
                    <div className="client__user-bar__options-box">
                        <Button path={mdiCog} clickFunc={() => {setPage("settings")}} subClass="client__user-bar__options" size="24px" tipDir="top" tipText="Settings" />
                    </div>
                </div>
            </div>
        </>
    );
}

function GroupList(props) {
    // props = groupList, roomNav, setGroup, currentGroup
    const { groupList } = props;

    var groups = [
        <Group {...props} groupName="Home" key="home" k="home" builtin>
            <Icon path={mdiHomeVariant} color="var(--text)" size="100%" />
        </Group>,
        <Group {...props} groupName="Direct Messages" key="directs" k="directs" path={mdiHomeVariant} builtin>
            <Icon path={mdiAccountMultiple} color="var(--text)" size="100%" />
        </Group>,
    ];

    groupList.forEach((room) => {
        const key = room.roomId;
        const icon = room.getAvatarUrl(global.matrix.getHomeserverUrl(), 96, 96, "crop");
        const image = icon ?
            <img className="room__icon" src={icon} alt={acronym(room.name)} /> :
            <div className="room__icon">{acronym(room.name)}</div>;

        groups.push(
            <Group {...props}
                groupName={room.name}
                key={key} k={key}
            >
                {image}
            </Group>
        );
    })

    return groups;
}
function Group({ roomNav, setGroup, currentGroup, groupName, k, children, builtin = false }) {
    const roomState = roomNav.current.groupUnreads(k);
    const {read, notifications} = roomState;

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
    var elements = [];
    rooms.forEach((roomState) => {
        const room = roomState.room;
        const key = room.roomId;
        const icon = getRoomIcon(room, currentGroup.key === "directs");
        const notifications = roomState.notifications;
        const unreadDot = !roomState.read || notifications > 0;


        elements.push(
            <Option key={key} k={key} text={room.name} selected={currentRoom} select={selectRoom} 
                    unread={unreadDot} notification={notifications}>
                <div className="room__icon__crop">
                    {icon}
                </div>
            </Option>
        );
    });

    return elements;
}

function MyUser({ user }) {
    const defaultText = "Copy user ID";
    const clickedText = "Copied";
    const [tooltipText, setTooltipText] = useState(defaultText);

    function click() {
        navigator.clipboard.writeText(user.userId);
        setTooltipText(clickedText);
        setTimeout(() => setTooltipText(defaultText), 1000);
    }

    return (
        <div className="user client__user-bar__profile" onClick={click}>
            <Avatar subClass="user__avatar" user={user}></Avatar>
            <Tooltip text={tooltipText} dir="top" x="mouse" delay={0.5}>
                <div className="user__text-box">
                    <span className="user__text user__username">{get_username(user)}</span>
                    <span className="user__text user__homeserver">{get_homeserver(user)}</span>
                </div>
            </Tooltip>
        </div>
    );
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
                <InviteEntry invite={invite} key={invite.roomId} direct={name === "Direct messages"} />
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
        <Overlay opacity="60%" click={() => setShowModal(false)}>
            <div className="invites__modal">
                <div className="overlay__title">
                    Invites:

                    <Icon className="overlay__close" 
                        path={mdiClose} 
                        size="20px" 
                        color="var(--text-greyed)" 
                        onClick={() => setShowModal(false)}
                    />
                </div>
                {holders}
            </div>
        </Overlay>
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
