import { Switch, Route } from "react-router-dom";
import ClientSettings from "../../views/Settings/ClientSettings";

import Client from "./Client";

export default function ClientRouter() {
    return (
        <Switch>
            <Route exact path={["/", "/room/:roomId?"]}
                render={({match}) => {
                    return (
                        <Client urlRoom={"roomId" in match.params ? match.params.roomId : null} />
                    )
                }}
            />
            <Route path="/settings">
                <ClientSettings />
            </Route>
        </Switch>
    )
}