import "./login.css";
import { Link } from "react-router-dom";
import { useState } from "react"

function Login({ type = "Login" }) {
    // Collect state for form fields
    const [username, setUsername] = useState();
    function updateUsername(e) { setUsername(e.target.value) };
    const [homeserver, setHomeserver] = useState();
    function updateHomeserver(e) { setHomeserver(e.target.value ? e.target.value : e.target.placeholder) };
    const [password, setPassword] = useState();
    function updatePassword(e) { setPassword(e.target.value) };

    // Create the page
    return (
        <div id="modal">
            <div id="label-holder">
                <p>{type}</p>
            </div>
            <div id="input-holder">
                <div id="top">
                    <UsernameBox placeholder="Username" method={updateUsername} />
                    <HomeserverBox method={updateHomeserver} />
                </div>
                <PasswordBox method={updatePassword} />
            </div>

            <button className="big-button" id="login">{type}</button>
            {type == "Login" ?
                <Link to="/register">Register</Link>
                :
                <Link to="/login">Login</Link>
            }
        </div>
    );
}

function UsernameBox({ placeholder, method }) {
    return (
        <input id="username" type="text" placeholder={placeholder} onChange={method}></input>
    );
}

function PasswordBox({ method }) {
    return (
        <input type="password" placeholder="Password" onChange={method}></input>
    );
}

function HomeserverBox({ method }) {
    return (
        <input id="hs" className="prefill" type="text" placeholder="matrix.org" onChange={method}></input>
    );
}


export default Login;
