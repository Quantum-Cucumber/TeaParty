import "./login.css";
import { Link, useHistory } from "react-router-dom";
import { useRef } from "react";
import { login_client } from "../client";


function input_valid(target, fieldName) {
    console.log(fieldName);
    const value = target.value;
    if (value === "") {
        target.classList.add("input-error");
        return false;
    } else {
        target.classList.remove("input-error");
        return true;
    }
}


function Login({ type = "Login" }) {
    let history = useHistory();
    // Collect state for form fields
    const usernameRef = useRef(null);
    const homeserverRef = useRef(null);
    const passwordRef = useRef(null);

    function buttonClicked() {
        if (type === "Login") {
            const hs = homeserverRef.current.value ? homeserverRef.current.value : homeserverRef.current.placeholder;
            if (![input_valid(usernameRef.current, "Username"), input_valid(passwordRef.current, "Password")].every(Boolean)) {return};
            login_client(usernameRef.current.value, hs, passwordRef.current.value).then(() => {
                console.log("Redirecting to app");
                history.push("/app")
            });
        }
    }

    // Create the page
    return (
        <div id="modal">
            <div id="label-holder">
                <p>{type}</p>
            </div>
            <div id="input-holder">
                <div id="top">
                    <input autoFocus id="username" type="text" placeholder="Username" ref={usernameRef}></input>
                    <input id="hs" className="prefill" type="text" placeholder="matrix.org" ref={homeserverRef}></input>
                </div>
                <input type="password" placeholder="Password" ref={passwordRef}></input>
            </div>

            <button id="login" onClick={buttonClicked}>{type}</button>
            {type === "Login" ?
                <Link to="/register">Register</Link>
                :
                <Link to="/login">Login</Link>
            }
        </div>
    );
}

export default Login;
