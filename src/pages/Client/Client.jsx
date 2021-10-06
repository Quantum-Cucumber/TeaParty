import "./Client.scss";
import { useEffect, useState, useRef } from "react";
import { buildMatrix } from "../../utils/matrix-client";
import { Loading, Overlay } from "../../components/interface";
import { UserPopup } from "../../components/user";
import Navigation from "../../views/Navigation/Navigation";
import Settings from "../../views/Settings/Settings";
import ChatPanel from "../../views/ChatPanel/ChatPanel";
import navManager from "../../views/Navigation/navManager";
import MemberList from "../../views/MemberList/MemberList";

function Client() {
    // On first load, start syncing. Once synced, change state to reload as client
    const [synced, syncState] = useState(false);  // Whether to show the syncing page
    const [roomPanel, setRooms] = useState([]);  // Populate the room list
    const [groupList, setGroups] = useState([]);  // Populate the group list
    const [page, setPage] = useState();  // Used to set full screen pages
    const [currentRoom, selectRoom] = useState();  // The currently selected room
    const roomNav = useRef(null);  // Handles populating the groups and room list
    const [invites, setInvites] = useState([]);  // Passed into navmanager and navigation pane
    const [userPopupInfo, setUserPopup] = useState({parent: null, user: null});  // Manage how the userpopup is displayed


    useEffect(() => {
        if (roomNav.current) {
            roomNav.current.roomSelected(currentRoom);
        }
    }, [currentRoom])

    useEffect(() => {
        buildMatrix().then(() => {
            global.matrix.once("sync", (state, oldState) => {
                if (oldState === null && state === "PREPARED") {
                    roomNav.current = new navManager(setGroups, setRooms, setInvites, selectRoom);
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

    return (
        <div className="client">
            <Navigation groupList={groupList} roomPanel={roomPanel} setPage={setPage} 
             currentRoom={currentRoom} selectRoom={selectRoom} roomNav={roomNav} invites={invites}
            />
            <div className="column column--chat">
                <ChatPanel currentRoom={currentRoom} setUserPopup={setUserPopup} />
            </div>
            <div className="column column--right">
                <MemberList currentRoom={currentRoom} setUserPopup={setUserPopup} />
            </div>
            <UserPopup parent={userPopupInfo?.parent} user={userPopupInfo?.user} setUserPopup={setUserPopup} room={currentRoom} />
            
            <Overlay dim={false} render={page === "settings"} mountAnimation="page__zoom-in 0.1s ease 0s 1" unmountAnimation="page__zoom-out 0.1s ease 0s 1">
                <Settings setPage={setPage} />
            </Overlay>
        </div>
    );
}


export default Client;
