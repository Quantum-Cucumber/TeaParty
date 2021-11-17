import "./Client.scss";
import { useEffect, useState } from "react";
import { buildMatrix } from "../../utils/matrix-client";
import { useHistory } from "react-router-dom";

import { popupCtx, modalCtx } from "../../components/popups";
import { Loading } from "../../components/elements";
import { Resize } from "../../components/wrappers";

import Navigation from "../../views/Navigation/Navigation";
import ChatPanel from "../../views/ChatPanel/ChatPanel";
import MemberList from "../../views/MemberList/MemberList";


function Client({ urlRoom }) {
    // On first load, start syncing. Once synced, change state to reload as client
    const [synced, syncState] = useState(false);  // Whether to show the syncing page

    const [popup, setPopup] = useState();
    const [modal, setModal] = useState();
    const hideMemberListState = useState(false);
    const hideRoomListState = useState(false);

    const [currentRoom, selectRoom] = useState(urlRoom);  // The currently selected room

    const history = useHistory();  // For altering the url


    // Change url to match selected room
    useEffect(() => {
        if (currentRoom) {
            history.push("/room/" + currentRoom);
        }
    }, [currentRoom, history])
    useEffect(() => {
        // If the url changes, select the room in the url
        selectRoom(urlRoom);

        // Set the title of the page
        if (urlRoom) {
            const room = global.matrix?.getRoom(urlRoom);
            document.title = room ? `${room.name} | TeaParty` : "TeaParty";
        }
    }, [urlRoom])

    useEffect(() => {
        buildMatrix().then(() => {
            global.matrix.once("sync", (state, oldState) => {
                if (oldState === null && state === "PREPARED") {
                    syncState(true);
                }
            })
        })

        return () => {
            global.matrix.stopClient();
        }
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

    return (
        <popupCtx.Provider value={setPopup}>
        <modalCtx.Provider value={setModal}>

        <div className="client">
            <Navigation currentRoom={currentRoom} selectRoom={selectRoom} hideRoomListState={hideRoomListState} />
            <div className="column column--chat">
                <ChatPanel currentRoom={currentRoom} hideMemberListState={hideMemberListState} hideRoomListState={hideRoomListState} />
            </div>
            <Resize side="left" initialSize={300} collapseSize={150} collapseState={hideMemberListState}>
                <div className="column column--right">
                    <MemberList currentRoom={currentRoom} />
                </div>
            </Resize>
            
            {modal}
            {popup}
        </div>

        </modalCtx.Provider>
        </popupCtx.Provider>
    );
}


export default Client;
