import "./Navigation.scss";
import { useState, useEffect } from "react";
import { mdiCog, mdiHomeVariant, mdiAccountMultiple, mdiEmail, mdiCheck, mdiClose } from "@mdi/js";
import { Icon } from "@mdi/react";
import { Button, Tooltip, Loading, Option, Overlay } from "../../components/interface";
import { Avatar, User } from "../../components/user";
import { acronym } from "../../utils/utils";

function Navigation({ groupList, roomPanel, setPage, currentRoom, selectRoom, roomNav, invites }) {
    const [currentGroup, setGroup] = useState({ name: "Home", key: "home" });
    // Get the total length of all the value arrays
    const invLen = Object.values(invites).reduce((x, invs) => {return x + invs.length}, 0);

    return (
        <>
            <div className="column column--groups">
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
                <div className="column--rooms__holder">
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

function GroupList({ roomNav, setGroup, currentGroup, groupList }) {

    // Placed here so we can inherit roomNav, currentGroup and selectGroup
    function Group({ groupName, k, children, builtin = false, notification = null, unread = false }) {
        return (
            <div className="group__holder">
                <Tooltip text={groupName} dir="right">
                    <div
                        className={"group " + (builtin ? "group--default " : "") + (currentGroup.key === k ? "group--selected" : "")}
                        onClick={() => {
                            if (k !== currentGroup.key) {
                                setGroup({ name: groupName, key: k })
                                roomNav.current.groupSelected(k);
                            }
                        }}
                    >
                        {children}
                        {notification !== null && <div className="group__notification">{notification}</div>}
                    </div>
                </Tooltip>
                <div className="group__unread" style={{display: unread ? "block" : "none"}}></div>
            </div>
        );
    }

    var groups = [
        <Group groupName="Home" key="home" k="home" builtin>
            <Icon path={mdiHomeVariant} color="var(--text)" size="100%" />
        </Group>,
        <Group groupName="Direct Messages" key="directs" k="directs" path={mdiHomeVariant} builtin>
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
            <Group
                groupName={room.name}
                key={key} k={key}
            >
                {image}
            </Group>
        );
    })

    return groups;
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
    rooms.forEach((element) => {
        const room = element.room;
        const key = room.roomId;
        const icon = getRoomIcon(room, currentGroup.key === "directs");


        elements.push(
            <Option key={key} k={key} text={room.name} selected={currentRoom} select={selectRoom}>
                <div className="room__icon__crop">
                    {icon}
                </div>
            </Option>
        );
    });

    return elements;
}

function MyUser({ user }) {
    function click() {
        navigator.clipboard.writeText(user.userId);
    }

    return (
        <User user={user} subClass="client__user-bar__profile" clickFunc={click} />
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

    /* Listen for escape key to close menu */
    useEffect(() => {
        document.addEventListener("keydown", keyPress);

        return () => {
            document.removeEventListener("keydown", keyPress);
        };
    });
    function keyPress(e) {
        if (e.key === "Escape") {
            setShowModal(false);
        }
    }

    // Make a holder for each invite type and populate with its values
    const holders = Object.keys(invitedRooms).reduce((holders, name) => {
        if (invitedRooms[name].length === 0) {return holders}
        const invites = invitedRooms[name].map((invite) => {
            return (
                <InviteEntry invite={invite} key={invite.roomId} />
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
                <div className="invites__modal__label">
                    Invites:

                    <Icon className="invites__modal__close" 
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

function InviteEntry({ invite }) {
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
