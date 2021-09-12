import "./Client.scss";
import { useEffect, useState, useRef } from "react";
import { buildMatrix } from "../../utils/matrix-client";
import { Loading } from "../../components/interface";
import Navigation from "../../views/Navigation/Navigation";
import Settings from "../../views/Settings/Settings";
import Chat from "../../views/Chat/Chat";
import navManager from "../../views/Navigation/navManager";

function Client() {
    // On first load, start syncing. Once synced, change state to reload as client
    const [synced, syncState] = useState(false);  // Whether to show the syncing page
    const [roomPanel, setRooms] = useState([]);  // Populate the room list
    const [groupList, setGroups] = useState([]);  // Populate the group list
    const [page, setPage] = useState();  // Used to set full screen pages
    const [currentRoom, selectRoom] = useState();  // The currently selected room
    const roomNav = useRef(null);  // Handles populating the groups and room list

    useEffect(() => {
        buildMatrix().then(() => {
            global.matrix.once("sync", (state, oldState) => {
                if (oldState === null && state === "PREPARED") {
                    roomNav.current = new navManager(setGroups, setRooms);
                    syncState(true);
                }
            })
        })

        return () => {roomNav.current.detachListeners()}
    }, []);
    if (!synced) {
        return (
            <div className="page--loading">
                <div className="loading__holder">
                    <Loading size="70px" />
                    <div className="loading__text"> Syncing...</div>
                </div>
            </div>
        );
    }

    if (page === "settings") {
        return (<Settings setPage={setPage} />);
    };

    return (
        <div className="client">
            <Navigation groupList={groupList} roomPanel={roomPanel} setPage={setPage} 
             currentRoom={currentRoom} selectRoom={selectRoom} roomNav={roomNav}
            />
            <div className="column column--chat">
                <Chat currentRoom={currentRoom} />
            </div>
            <div className="column column--right"></div>
        </div>
    );
}


export default Client;
