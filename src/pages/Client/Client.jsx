import "./Client.scss";
import { useEffect, useState } from "react";
import { build_matrix } from "../../utils/matrix-client";
import { Loading } from "../../components/interface";
import Navigation from "../../views/navigation/navigation";
import { filter_orphan_rooms } from "../../utils/rooms";

function Client() {
    // On first load, start syncing. Once synced, change state to reload as client
    const [synced, syncState] = useState(false);
    const [roomPanel, setRooms] = useState([]);

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

    return (
        <div className="client">
            <Navigation roomPanel={roomPanel} setRooms={setRooms}/>
            <div className="column column--chat"></div>
            <div className="column column--right"></div>
        </div>
    );
}


export default Client;
