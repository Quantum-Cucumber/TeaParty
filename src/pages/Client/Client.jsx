import "./Client.scss";
import { useEffect, useState, useRef } from "react";
import { buildMatrix } from "../../utils/matrix-client";
import { useHistory } from "react-router-dom";

import { contextMenuCtx, Overlay } from "../../components/popups";
import { Loading } from "../../components/elements";
import { UserPopup, userPopupCtx } from "../../components/user";
import { Resize } from "../../components/wrappers";

import Navigation from "../../views/Navigation/Navigation";
import Settings from "../../views/Settings/Settings";
import ChatPanel from "../../views/ChatPanel/ChatPanel";
import navManager from "../../views/Navigation/navManager";
import MemberList from "../../views/MemberList/MemberList";


function Client({ urlRoom }) {
    // On first load, start syncing. Once synced, change state to reload as client
    const [synced, syncState] = useState(false);  // Whether to show the syncing page

    const [page, setPage] = useState();  // Used to set full screen pages
    const [userPopupInfo, setUserPopup] = useState(null);
    const [contextMenu, setContextMenu] = useState();

    const [currentRoom, selectRoom] = useState(urlRoom);  // The currently selected room

    const roomNav = useRef(null);  // Handles populating the groups and room list - navManager instance
    const history = useHistory();  // For altering the url

    const [invites, setInvites] = useState([]);  // Passed into navmanager and navigation pane
    const hideMemberListState = useState(false);

    useEffect(() => {
        if (currentRoom) {
            history.push("/" + currentRoom);
            history.goForward();
        }

        if (roomNav.current) {
            roomNav.current.roomSelected(currentRoom);
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
                    roomNav.current = new navManager(setInvites, selectRoom);
                    syncState(true);
                }
            })
        })

        return () => {
            // roomNav.current.detachListeners();
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
        <contextMenuCtx.Provider value={setContextMenu}>
        <userPopupCtx.Provider value={setUserPopup}>

        <div className="client">
            <Navigation setPage={setPage} currentRoom={currentRoom} selectRoom={selectRoom} roomNav={roomNav} invites={invites} />
            <div className="column column--chat">
                <ChatPanel currentRoom={currentRoom} hideMemberListState={hideMemberListState} />
            </div>
            <Resize side="left" initialSize={300} collapseSize={150} collapseState={hideMemberListState}>
                <div className="column column--right">
                    <MemberList currentRoom={currentRoom} setUserPopup={setUserPopup} />
                </div>
            </Resize>

            
            <Overlay dim={false} render={page === "settings"} mountAnimation="page__zoom-in 0.1s ease 0s 1" unmountAnimation="page__zoom-out 0.1s ease 0s 1">
                <Settings setPage={setPage} />
            </Overlay>
            
            {contextMenu}

            <UserPopup parent={userPopupInfo?.parent} user={userPopupInfo?.user} setUserPopup={setUserPopup} room={currentRoom} />
        </div>

        </userPopupCtx.Provider>
        </contextMenuCtx.Provider>
    );
}


export default Client;
