import './themes.scss';
import './root.scss';
import { BrowserRouter, Switch, Route, Redirect, HashRouter } from "react-router-dom";
import Login from "./Login/Login";
import ClientRouter from "./Client/ClientRouter";
import { logged_in } from "../utils/matrix-client";

function App() {
    return (
        <HashRouter>
            <Switch>
                {/*<Route path="/register">
                    {logged_in() ? <Redirect to="/app" /> : <Login type="Register" />}
                </Route>*/}
                <Route path="/login">
                    {logged_in() ? <Redirect to="/app" /> : <Login />}
                </Route>


                <Route path="/">
                        {logged_in() ? <ClientRouter /> : <Redirect to="/login" />}
                </Route>
            </Switch>
        </HashRouter>
    );
}

export default App;
