import "./client.css";
import { build_matrix } from "../matrix-client";
import { User } from "../components/user";
import { useEffect, useState } from "react";
import { Button } from "../components/interface";
import { Icon } from "@mdi/react";
import { mdiCog, mdiHomeVariant } from "@mdi/js";
import { RoomState } from "matrix-js-sdk";

function Client() {
    // On first load, start syncing. Once synced, change state to reload as client
    const [synced, syncState] = useState(false);
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
        return (<span>Syncing...</span>);
    }


    return (
        <div className="client">
            <div className="column column--groups">
                <GroupList />
            </div>
            <div className="column column--rooms">
                <div className="column--rooms__holder">
                    <RoomList />
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

function RoomList() {
    const [currentRoom, selectRoom] = useState();

    var rooms = [];
    global.matrix.getRooms().forEach((room) => {
        const key = room.roomId;
        rooms.push(
            <div
                className={"room " + (currentRoom === key ? "room--selected" : "")}
                key={key}
                onClick={() => { selectRoom(key) }}
            >{room.name}</div>
        );
    });

    return rooms;
}

function GroupList() {
    const [currentGroup, selectGroup] = useState("home");

    var groups = [
        (<div
            className={"group group--default " + (currentGroup === "home" ? "group--selected" : "")}
            key="home" onClick={() => { selectGroup("home") }}
        >
            <Icon path={mdiHomeVariant} color="var(--text-greyed)" size="100%" />
        </div>)
    ];

    return groups;
}

export default Client;
