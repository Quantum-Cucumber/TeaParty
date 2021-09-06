import "./Navigation.scss";
import { useState } from "react";
import { mdiCog, mdiHomeVariant, mdiAccountMultiple } from "@mdi/js";
import { Icon } from "@mdi/react";
import { Button, Tooltip, Loading } from "../../components/interface";
import { User } from "../../components/user";
import { filter_orphan_rooms, get_directs, get_joined_space_rooms } from "../../utils/rooms";

function Navigation({ setRooms, roomPanel, setPage }) {
    const [currentGroup, setGroup] = useState({ name: "Home", key: "home" });

    function selectGroup(rooms) {
        setRooms(null);
        Promise.resolve(rooms).then((result) => setRooms(result));
    }

    return (
        <>
            <div className="column column--groups">
                <GroupList roomSelect={selectGroup} setGroup={setGroup} currentGroup={currentGroup} />
            </div>
            <div className="column column--rooms">
                <div className="column--rooms__label">{currentGroup.name}</div>
                <div className="column--rooms__holder">
                    {roomPanel ?
                        <RoomList rooms={roomPanel} currentGroup={currentGroup} /> :
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


function acronym(text, len = 3) {
    return text.match(/\b([a-z0-9])/gi).slice(0, len).join("").toUpperCase()
}

function GroupList({ roomSelect, setGroup, currentGroup }) {

    // Placed here so we can inherit roomSelect, currentGroup and selectGroup
    function Group({ groupName, k, roomList, children, builtin = false }) {
        return (
            <div style={{ position: "relative" }} key={k}>
                <Tooltip text={groupName} dir="right">
                    <div
                        className={"group " + (builtin ? "group--default " : "") + (currentGroup.key === k ? "group--selected" : "")}
                        onClick={() => {
                            setGroup({ name: groupName, key: k })
                            roomSelect(roomList());
                        }}
                    >
                        {children}
                    </div>
                </Tooltip>
            </div>
        );
    }

    var groups = [
        <Group groupName="Home" key="home" k="home" roomList={filter_orphan_rooms} builtin>
            <Icon path={mdiHomeVariant} color="var(--text)" size="100%" />
        </Group>,
        <Group groupName="Direct Messages" key="directs" k="directs" path={mdiHomeVariant} roomList={() => get_directs(true)} builtin>
            <Icon path={mdiAccountMultiple} color="var(--text)" size="100%" />
        </Group>,
    ];

    global.matrix.getVisibleRooms().forEach((room) => {
        if (room.isSpaceRoom()) {
            const key = room.roomId;
            const icon = room.getAvatarUrl(global.matrix.getHomeserverUrl(), 96, 96, "crop");
            const image = icon ?
                <img className="room__icon" src={icon} alt={acronym(room.name)} /> :
                <div className="room__icon">{acronym(room.name)}</div>;

            groups.push(
                <Group
                    groupName={room.name}
                    key={key} k={key}
                    roomList={() => get_joined_space_rooms(key)}
                >
                    {image}
                </Group>
            );
        }
    })

    return groups;
}

function RoomList({ rooms, currentGroup }) {
    const [currentRoom, selectRoom] = useState();

    var elements = [];
    rooms.forEach((room) => {
        const key = room.roomId;
        var icon = room.getAvatarUrl(global.matrix.getHomeserverUrl(), 96, 96, "crop");

        if (!icon && currentGroup.key === "directs") {
            icon = global.matrix.getUser(room.guessDMUserId())?.avatarUrl;
            if (icon) {
                icon = global.matrix.mxcUrlToHttp(icon, 96, 96, "crop");
            }
        }

        const image = icon ?
            <img className="room__icon" src={icon} alt={acronym(room.name)} /> :
            <div className="room__icon">{acronym(room.name)}</div>;

        elements.push(
            <div
                className={"room " + (currentRoom === key ? "room--selected" : "")}
                key={key}
                onClick={() => { selectRoom(key) }}
            >
                <div className="room__icon__crop">
                    {image}
                </div>
                <div className="room__label">{room.name}</div>
            </div>
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


export default Navigation;
