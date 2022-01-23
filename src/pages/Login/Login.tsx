import "./Login.scss";
import { useCallback, useEffect, useMemo, useState } from "react";
import matrixsdk from "matrix-js-sdk";

import { attemptPasswordLogin, attemptTokenLogin } from "../../utils/matrix-client";
import { classList, debounce } from "../../utils/utils";
import { discoverBaseUrl } from "../../utils/matrix-client";

import { A, Button, Loading } from "../../components/elements";
import { Overlay } from "../../components/popups";

import type { MatrixClient } from "matrix-js-sdk";
import { useStableState } from "../../utils/hooks";


type LoginFlows = {
    flows: LoginTypes,
}
type LoginTypes = {
    [k: string]: any,
    type: string,
}[]

function getLoginType(type: string, types: LoginTypes) {
    if (!types) {return}

    for (const i of types) {
        if (i.type === type) {
            return i
        }
    }

    return null;
}

enum StatusState {
    loading,
    error,
}

function getQueryParam(param: string) {
    const queryString = window.location.search;
    const searchParams = new URLSearchParams(queryString);
    return searchParams.get(param);
}

export default function LoginPage() {
    const [status, setStatus] = useState<{state: StatusState, text: string}>(null);
    const [homeserver, setHomeserver] = useState("matrix.org");
    const stableHomeserver = useStableState(homeserver);
    const [tempClient, setTempClient] = useState<MatrixClient>(null);
    const [loginTypes, setLoginTypes] = useState<LoginTypes>(null);


    useEffect(() => {
        const loginToken = getQueryParam("loginToken");  // Get token from url parameter

        if (loginToken) {
            localStorage.setItem("token", loginToken);  // Save extracted token
            const baseUrl = localStorage.getItem("base_url");  // Get base url - if the sso flow was followed, this should be saved. Needed for login

            if (baseUrl) {  // If base url is stored (valid sso flow)
                attemptTokenLogin(baseUrl, loginToken)
                .then(() => {
                    window.location.href = window.location.origin;  // If able to login, reload and let react router redirect to app
                })
                .catch(() => {
                    setStatus({state: StatusState.error, text: "Unable to sign in with SSO token"});
                })
            }
            else {
                setStatus({state: StatusState.error, text: "SSO sign in error: No base url found"});
            }
        }
    },[])


    // Discover homeserver login types
    const discoverHomeserver = useCallback(() => {
        if (!stableHomeserver.current) {return}

        setStatus({state: StatusState.loading, text: "Contacting homeserver"});
        discoverBaseUrl(stableHomeserver.current)  // Get base url
        .then((baseUrl) => {
            const client = matrixsdk.createClient({baseUrl});  // Create a temporary client with that url
            setTempClient(client);  // Save so that SSO (etc) can leverage the homeserver
            setStatus({state: StatusState.loading, text: "Getting login types"});

            client.loginFlows().then((loginFlows: LoginFlows) => {  // Query login flows
                setLoginTypes(loginFlows?.flows || null);
                setStatus(null);
            })
            .catch(() => {
                setStatus({state: StatusState.error, text: "Unable to retrieve login information"});
            })
        })
        .catch(() => {
            setStatus({state: StatusState.error, text: "Unable to connect to homeserver"});
        })
    }, [stableHomeserver])

    const debouncedDiscover = useMemo(() => debounce(() => {
        setLoginTypes(null);
        discoverHomeserver();
    }, 1000), [discoverHomeserver])

    useEffect(() => {
        debouncedDiscover();
    }, [homeserver, debouncedDiscover])

    return (
        <Overlay opacity="1" modalClass="overlay__modal--bg login__modal">
            <div className="overlay__title">Login</div>
            { status?.state === StatusState.loading &&
                <div className="overlay__body">
                    <div className="login__loading">
                        <Loading size="1.2em" /> {status.text}...
                    </div>
                </div>
            }
            { status?.state === StatusState.error &&
                <div className="overlay__body">
                    <div className="login__error-box">{status.text}</div>
                </div>
            }
            <div className="overlay__body">
                <input autoFocus className="login__input" type="text" placeholder="Homeserver"
                    value={homeserver} onChange={(e) => setHomeserver(e.target.value)}
                />
            </div>

            { getLoginType("m.login.password", loginTypes) &&
                <PasswordAuth homeserver={homeserver} status={status} setStatus={setStatus} />
            }
            { getLoginType("m.login.sso", loginTypes) &&
                <SSOAuth tempClient={tempClient} authInfo={getLoginType("m.login.sso", loginTypes)} status={status} setStatus={setStatus} />
            }
        </Overlay>
    )
}


type PasswordAuthProps = {
    homeserver: string,
    status: {state: StatusState, text: string},
    setStatus: ({state: StatusState, text: string}) => void,
}

function PasswordAuth({ homeserver, status, setStatus }: PasswordAuthProps) {
    const [username, setUsername] = useState("");
    const [usernameError, setUsernameError] = useState(false);
    const [password, setPassword] = useState("");
    const [passwordError, setPasswordError] = useState(false);

    useEffect(() => {
        setUsernameError(false);
    }, [username, status, setStatus])

    useEffect(() => {
        setPasswordError(false);
    }, [password, status, setStatus])

    function login() {
        if (status?.state === StatusState.loading) {
            return;
        }
        if (username.trim() === "") {
            setUsernameError(true);
            return;
        } 
        if (password.trim() === "") {
            setPasswordError(true);
            return;
        }

        setStatus({state: StatusState.loading, text: "Logging in"});

        attemptPasswordLogin(username.trim(), homeserver, password.trim())
        .then(() => {
            console.info("Redirecting to app");
            window.location.replace("/");
        })
        .catch((err) => {
            if (typeof err.json === "function") {
                err.json().then((errJSON) => {
                    console.log(errJSON)
                    setStatus({state: StatusState.error, text: errJSON.error});
                });
            } else {
                setStatus({state: StatusState.error, text: err.toString()});
            }
        });
    }

    return (
        <div className="overlay__body">
            <input autoFocus className={classList("login__input", {"login__input--error": usernameError})} type="text" placeholder="Username"
                value={username} onChange={(e) => setUsername(e.target.value)}
            />
            <input className={classList("login__input", {"login__input--error": passwordError})} type="password" placeholder="Password"
                value={password} onChange={(e) => setPassword(e.target.value)}
            />

            <div className="overlay__buttons">
                <Button save onClick={login}>Login</Button>
            </div>
        </div>
    )
}



type SSOAuthProps = {
    tempClient: MatrixClient,
    authInfo: {type: "m.login.sso", identity_providers: {icon?: string, id: string, name: string}[]},
}

function SSOAuth({tempClient, authInfo}: SSOAuthProps) {
    const redirectUrl = window.location.href.split("?")[0];  // Send back to auth page (this url). Remove params in case previous SSO failed

    return (
        <div className="overlay__body">
            <div className="login__sso__container">
                {
                    authInfo.identity_providers.map((provider) => {
                        const icon = tempClient.mxcUrlToHttp(provider.icon) || null;
                        const redirect = tempClient.getSsoLoginUrl(redirectUrl, "sso", provider.id);

                        return (
                            <A className="login__sso__button" href={redirect} key={provider.id}
                                onClick={() => localStorage.setItem("base_url", tempClient.getHomeserverUrl())}  // Store for redirect
                            >
                                { icon ?
                                    <img className="login__sso__button__icon" src={icon} alt={provider.name} title={provider.name} />
                                :
                                    <Button save>Login with {provider.name}</Button>
                                }
                            </A>
                        )
                    })
                }
            </div>
        </div>
    )
}
