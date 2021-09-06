import { useState, useEffect } from "react";
import { BrowserRouter, Switch, Route, Redirect } from "react-router-dom";
import './root.css';
import Login from "./Login/Login";
import Client from "./Client/Client";
import { logged_in } from "../utils/matrix-client";

function App() {
  // Colour theme
  const [theme, setTheme] = useState("dark");
  useEffect(() => {
    document.body.classList.add(theme);

    return () => {document.body.classList.remove(theme)};
  }, [theme]);

  return (
    <BrowserRouter>
      <Switch>
        <Route path="/app">
          {logged_in() ? <Client /> : <Redirect to="/login" />}
        </Route>
        <Route path="/register">
          {logged_in() ? <Redirect to="/app" /> : <Login type="Register"/>}
          </Route>
        <Route path="/login">
          {logged_in() ? <Redirect to="/app" /> : <Login />}
        </Route>
      </Switch>
    </BrowserRouter>
  );
}

export default App;
