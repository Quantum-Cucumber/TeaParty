import { Switch, Route } from "react-router-dom";

import Client from "./Client";
import ClientSettings from "../../views/Settings/ClientSettings";
import RoomSettings from "../../views/Settings/RoomSettings";


export default function ClientRouter() {
    return (<>
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
    </>)
}