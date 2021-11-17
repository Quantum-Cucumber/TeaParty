import { useState } from "react";
import { Switch, Route } from "react-router-dom";

import Client from "./Client";
import ClientSettings from "../../views/Settings/ClientSettings";
import RoomSettings from "../../views/Settings/RoomSettings";
import { popupCtx, modalCtx } from "../../components/popups";


export default function ClientRouter() {
    // These are shared across all pages so need to be created in this router
    const [popup, setPopup] = useState();
    const [modal, setModal] = useState();

    return (
        <popupCtx.Provider value={setPopup}>
        <modalCtx.Provider value={setModal}>


        <Route exact path={["/room/:roomId?", "/"]}
            children={({match}) => {
                return (
                    <Client urlRoom={(match && "roomId" in match.params) ? match.params.roomId : null} />
                )
            }}
        />

        <Switch>
            <Route path="/settings/client">
                <ClientSettings />
            </Route>
            <Route exact path="/settings/room/:roomId"
                render={({match}) => {
                    return (
                        <RoomSettings roomId={match.params.roomId} />
                    )
                }}
            />
        </Switch>


        {modal}
        {popup}
        </modalCtx.Provider>
        </popupCtx.Provider>
    )
}