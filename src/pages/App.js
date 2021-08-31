import { useState, useEffect } from "react";
import { BrowserRouter, Switch, Route } from "react-router-dom";
import './root.css';
import Login from "./Login";
import { logged_in } from "../client";

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
        <Route path="/app"></Route>
        <Route path="/register"><Login type="Register"/></Route>
        <Route path="/login"><Login /></Route>
      </Switch>
    </BrowserRouter>
  );
}

export default App;
