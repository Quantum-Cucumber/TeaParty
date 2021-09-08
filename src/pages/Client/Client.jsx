import "./Client.scss";
import { useEffect, useState } from "react";
import { buildMatrix } from "../../utils/matrix-client";
import { Loading } from "../../components/interface";
import Navigation from "../../views/Navigation/Navigation";
import Settings from "../../views/Settings/Settings";
import { filter_orphan_rooms } from "../../utils/rooms";
import Chat from "../../views/Chat/Chat";

function Client() {
    // On first load, start syncing. Once synced, change state to reload as client
    const [synced, syncState] = useState(false);
    const [roomPanel, setRooms] = useState([]);
    const [page, setPage] = useState();  // Used to set full screen pages
    const [currentRoom, selectRoom] = useState();

    useEffect(() => {
        buildMatrix().then(() => {
            global.matrix.once("sync", (state, oldState) => {
                if (oldState === null && state === "PREPARED") {
                    syncState(true);
                    setRooms(filter_orphan_rooms());
                }
            })
        })
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
            <Navigation roomPanel={roomPanel} setRooms={setRooms} setPage={setPage} 
             currentRoom={currentRoom} selectRoom={selectRoom} 
            />
            <div className="column column--chat">
                <Chat currentRoom={currentRoom} />
            </div>
            <div className="column column--right"></div>
        </div>
    );
}


export default Client;
