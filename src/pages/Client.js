import "./client.css";
import { build_matrix } from "../matrix-client";
import { User } from "../components/user";
import { useEffect, useState } from "react";
import { Button } from "../components/interface";
import { Icon } from "@mdi/react";
import { mdiCog, mdiHomeVariant, mdiLoading } from "@mdi/js";

function Client() {
    // On first load, start syncing. Once synced, change state to reload as client
    const [synced, syncState] = useState(false);
    const [roomPanel, setRooms] = useState([]);
    console.log("Reload", roomPanel)
    useEffect(() => {
        build_matrix().then(() => {
            global.matrix.once("sync", (state, prevState, data) => {
                if (prevState === null && state === "PREPARED") {
                    syncState(true);
                }
            })
        });
    }, []);
    if (!synced) {
        return (
            <div className="loading">
                <div className="loading__holder">
                    <Icon path={mdiLoading} color="var(--content)" size="70px" spin={1.2}/>
                    <div className="loading__text"> Syncing...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="client">
            <div className="column column--groups">
                <GroupList roomSelect={setRooms} />
            </div>
            <div className="column column--rooms">
                <div className="column--rooms__holder">
                    <RoomList rooms={roomPanel} />
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

function RoomList({ rooms }) {
    const [currentRoom, selectRoom] = useState();

    var elements = [];
    rooms.forEach((room) => {
        const key = room.roomId;
        elements.push(
            <div
                className={"room " + (currentRoom === key ? "room--selected" : "")}
                key={key}
                onClick={() => { selectRoom(key) }}
            >{room.name}</div>
        );
    });

    return elements;
}

function GroupList({ roomSelect }) {
    const [currentGroup, selectGroup] = useState("home");

    var groups = [
        (<div
            className={"group group--default " + (currentGroup === "home" ? "group--selected" : "")}
            key="home" onClick={() => { 
                selectGroup("home"); 
                console.log(filter_orphan_rooms());
                roomSelect(filter_orphan_rooms()) }}
        >
            <Icon path={mdiHomeVariant} color="var(--text)" size="100%" />
        </div>)
    ];

    global.matrix.getVisibleRooms().forEach((room) => {
        if (room.isSpaceRoom()) {
            const key = room.roomId;
            const icon = room.getAvatarUrl(global.matrix.getHomeserverUrl(), 96, 96, "crop");
            const image = icon ? 
                <img className="group__icon" src={icon} alt={room.name} /> : 
                <div className="group__icon">{acronym(room.name)}</div>;

            groups.push(
                <div
                    className={"group " + (currentGroup === key ? "group--selected" : "")}
                    key={key}
                    onClick={() => { selectGroup(key); roomSelect(get_joined_space_rooms(key))}}
                >{image}</div>
            );
        }
    })

    return groups;
}

function acronym(text, len=3) {
    return text.match(/\b([a-z0-9])/gi).slice(0, len).join("").toUpperCase()
}


function filter_orphan_rooms() {
    /* Finds all rooms that are not DMs and that are not a part of a space */
    var rooms = [];
    global.matrix.getVisibleRooms().forEach((room) => {
        // Check if room is a space
        const state = room.currentState;
        if ( room.isSpaceRoom() || 
             state.getStateEvents("m.space.child").length !== 0 || 
             state.getStateEvents("m.space.parent").length !== 0
           ) {return};

        // Check if a DM
        rooms.push(room)
    });
    return rooms;
}

function get_joined_space_rooms(spaceId) {
    var rooms = [];
    global.matrix.getRoomHierarchy(spaceId).then((result) => {
        result.rooms.forEach((room) => {
            const roomObj = global.matrix.getRoom(room.room_id);
            if (global.matrix.getRoom(room.room_id)) {
                rooms.push(roomObj)
            }
        })
    })
    return rooms;
}

export default Client;
