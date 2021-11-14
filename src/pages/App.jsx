import { BrowserRouter, Switch, Route, Redirect } from "react-router-dom";
import './root.scss';
import Login from "./Login/Login";
import Client from "./Client/Client";
import { logged_in } from "../utils/matrix-client";

function App() {
    return (
        <BrowserRouter>
            <Switch>
                {/*<Route path="/register">
                    {logged_in() ? <Redirect to="/app" /> : <Login type="Register" />}
                </Route>*/}
                <Route path="/login">
                    {logged_in() ? <Redirect to="/app" /> : <Login />}
                </Route>


                <Route path="/:roomId?" exact children={({ match }) => {
                    return (
                        logged_in() ? <Client urlRoom={match.params.roomId} /> : <Redirect to="/login" />
                    )
                }}>
                </Route>
            </Switch>
        </BrowserRouter>
    );
}

export default App;
