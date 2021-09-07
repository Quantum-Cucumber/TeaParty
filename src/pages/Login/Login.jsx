import "./Login.scss";
import { Link, useHistory } from "react-router-dom";
import { useRef, useState } from "react";
import { attemptLogin } from "../../utils/matrix-client";


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
    const [errorMsg, showError] = useState(null);
    const history = useHistory();
    // Collect state for form fields
    const usernameRef = useRef(null);
    const homeserverRef = useRef(null);
    const passwordRef = useRef(null);

    function buttonClicked() {
        showError(null);

        if (type === "Login") {
            const hs = homeserverRef.current.value ? homeserverRef.current.value : homeserverRef.current.placeholder;
            if (![input_valid(usernameRef.current, "Username"), input_valid(passwordRef.current, "Password")].every(Boolean)) {return};
            attemptLogin(usernameRef.current.value, hs, passwordRef.current.value).then(() => {
                console.info("Redirecting to app");
                history.push("/app");
                history.go(0);
            }).catch((err) => {
                var errText;
                if (typeof err.json === "function") {
                    err.json().then((errJSON) => {
                        console.log(errJSON)
                        errText = errJSON.error;
                    });
                } else {
                    errText = err.toString()  // Not too user friendly
                }
                showError(errText ? errText : "An unknown error occured");
            });
        }
    }

    // Create the page
    return (
        <div className="modal__bg">
            <div className="modal">
                <div className="modal__label-holder">
                    <p>{type}</p>
                </div>
                {errorMsg && <div className="modal__error">{errorMsg}</div>}
                <div className="modal__input-holder">
                    <div className="input-split__holder">
                        <input autoFocus className="input-split--username" type="text" placeholder="Username" ref={usernameRef}></input>
                        <input className="input-split--hs input--prefill" type="text" placeholder="matrix.org" ref={homeserverRef}></input>
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
