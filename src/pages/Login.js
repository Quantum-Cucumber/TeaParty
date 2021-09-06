import "./login.scss";
import { Link, useHistory } from "react-router-dom";
import { useRef } from "react";
import { attempt_login } from "../matrix-client";


function input_valid(target, fieldName) {
    const value = target.value;
    if (value === "") {
        target.classList.add("input--error");
        return false;
    } else {
        target.classList.remove("input--error");
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
            attempt_login(usernameRef.current.value, hs, passwordRef.current.value).then(() => {
                console.log("Redirecting to app");
                history.push("/app");
                history.go(0);
            });
        }
    }

    // Create the page
    return (
        <div className="modal__bg">
            <div id="modal">
                <div className="modal__label-holder">
                    <p>{type}</p>
                </div>
                <div className="modal__input-holder">
                    <div id="top">
                        <input autoFocus id="username-input--split" type="text" placeholder="Username" ref={usernameRef}></input>
                        <input id="hs-input--split" className="input--prefill" type="text" placeholder="matrix.org" ref={homeserverRef}></input>
                    </div>
                    <input type="password" placeholder="Password" ref={passwordRef}></input>
                </div>

                <button className="modal__button" onClick={buttonClicked}>{type}</button>
                {type === "Login" ?
                    <Link to="/register">Register</Link>
                    :
                    <Link to="/login">Login</Link>
                }
            </div>
        </div>
    );
}

export default Login;
