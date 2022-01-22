import "./Login.scss";
import { useEffect, useState } from "react";

import { attemptLogin } from "../../utils/matrix-client";

import { Button, Loading } from "../../components/elements";
import { Overlay } from "../../components/popups";


function input_valid(target, _fieldName) {
    const value = target.value;
    if (value === "") {
        return false;
    } else {
        return true;
    }
}


export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [homeserver, setHomeserver] = useState("");

    const [error, setError] = useState(null);
    const [showLoading, setShowLoading] = useState(false);

    useEffect(() => {
        setError(null);
    }, [username, password, homeserver])

    function login() {
        setError(null);

        if (![input_valid(username, "Username"), input_valid(password, "Password")].every(Boolean)) {return}
        setShowLoading(true);

        attemptLogin(username, homeserver || "matrix.org", password)
        .then(() => {
            console.info("Redirecting to app");
            window.location.replace("/");
        })
        .catch((err) => {
            setShowLoading(false);
            if (typeof err.json === "function") {
                err.json().then((errJSON) => {
                    console.log(errJSON)
                    setError(errJSON.error);
                });
            } else {
                setError(err.toString())  // Not too user friendly
            }
        });
    }


    if (showLoading) {
        return (
            <Overlay>
                <Loading size="4em" />
            </Overlay>
        )
    }

    return (
        <Overlay opacity="1" modalClass="overlay__modal--bg login__modal">
            <div className="overlay__title">Login</div>
            { error &&
                <div className="overlay__body">
                    <div className="login__error">{error}</div>
                </div>
            }
            <div className="overlay__body">
                <div className="login__split">
                    <input autoFocus className="login__input--username" type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
                    <input className="login__input--homeserver" type="text" placeholder="matrix.org" value={homeserver} onChange={(e) => setHomeserver(e.target.value)}/>
                </div>
                <input className="login__input--password" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />

                <div className="overlay__buttons">
                    <Button save onClick={login}>Login</Button>
                </div>
            </div>
        </Overlay>
    )
}
