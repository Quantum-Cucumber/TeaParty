import "./client.scss";
import { build_matrix } from "../matrix-client";
import { User } from "../components/user";
import { useEffect, useState } from "react";
import { Button, Loading } from "../components/interface";
import { Icon } from "@mdi/react";
import { mdiCog, mdiHomeVariant, mdiAccountMultiple } from "@mdi/js";

function Client() {
    // On first load, start syncing. Once synced, change state to reload as client
    const [synced, syncState] = useState(false);
    const [roomPanel, setRooms] = useState([]);
    const [currentGroup, setGroup] = useState({name: "Home", key: "home"});

    useEffect(() => {
        build_matrix().then(() => {
            global.matrix.once("sync", (state, prevState, data) => {
                if (prevState === null && state === "PREPARED") {
                    syncState(true);
                    setRooms(filter_orphan_rooms());
                }
            })
        });
    }, []);
    if (!synced) {
        return (
            <div className="loading">
                <div className="loading__holder">
                    <Loading size="70px" />
                    <div className="loading__text"> Syncing...</div>
                </div>
            </div>
        );
    }

    function selectGroup(rooms) {
        setRooms(null);
        Promise.resolve(rooms).then((result) => setRooms(result));
    }


    return (
        <div className="client">
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
                        <Button path={mdiCog} clickFunc={() => { }} subClass="client__user-bar__options" size="24px" />
                    </div>
                </div>
            </div>
            <div className="column column--chat"></div>
            <div className="column column--right"></div>
        </div>
    );
}

function MyUser({ user }) {
    function click() {
        navigator.clipboard.writeText(user.userId);
    }

    return (
        <User user={user} subClass="client__user-bar__profile" clickFunc={click} />
    );
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

function GroupList({ roomSelect, setGroup, currentGroup }) {

    // Placed here so we can inherit roomSelect, currentGroup and selectGroup
    function Group({ groupName, k, roomList, children, builtin=false }) {
        return (
            <div
                className={"group " + (builtin ? "group--default " : "") +  (currentGroup.key === k ? "group--selected" : "")}
                key={k}
                onClick={() => {
                    setGroup({name: groupName, key: k})
                    roomSelect(roomList());
                }}
            >
                {children}
            </div>
        );
    }

    var groups = [
        <Group groupName="Home" k="home" roomList={filter_orphan_rooms} builtin>
            <Icon path={mdiHomeVariant} color="var(--text)" size="100%" />
        </Group>,
        <Group groupName="Direct Messages" k="directs" path={mdiHomeVariant} roomList={() => get_directs(true)} builtin>
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
                    k={key} 
                    roomList={() => get_joined_space_rooms(key)}
                >
                    {image}
                </Group>
            );
        }
    })

    return groups;
}


function acronym(text, len = 3) {
    return text.match(/\b([a-z0-9])/gi).slice(0, len).join("").toUpperCase()
}


function filter_orphan_rooms() {
    /* Finds all rooms that are not DMs and that are not a part of a space */
    var rooms = [];
    var directs = get_directs(false);
    global.matrix.getVisibleRooms().forEach((room) => {
        // Check if room is a space
        const state = room.currentState;
        if (room.isSpaceRoom() ||
            state.getStateEvents("m.space.child").length !== 0 ||
            state.getStateEvents("m.space.parent").length !== 0
        ) { return };

        // Check if a DM
        if (directs.includes(room.roomId)) { return }

        rooms.push(room)
    });
    return rooms;
}

function get_directs(asRoomObj) {
    // Get all direct rooms
    var rooms = []
    const directs = global.matrix.getAccountData("m.direct").getContent();
    Object.values(directs).forEach((directRooms) => {
        rooms = rooms.concat(directRooms);
    })

    // Convert to room objects
    if (asRoomObj) {
        rooms = rooms.map((roomId) => {
            return global.matrix.getRoom(roomId);
        });
    }

    return rooms;
}

async function get_joined_space_rooms(spaceId) {
    var promise = new Promise((resolve) => {
        var rooms = [];
        global.matrix.getRoomHierarchy(spaceId).then((result) => {
            result.rooms.forEach((room) => {
                const roomObj = global.matrix.getRoom(room.room_id);
                if (global.matrix.getRoom(room.room_id) && room.room_id !== spaceId) {
                    rooms.push(roomObj)
                }
            });
            resolve(rooms);
        });
    });

    return promise;
}

export default Client;
