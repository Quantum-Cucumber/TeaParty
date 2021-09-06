import "./components.scss";
import { get_username, get_homeserver } from "../matrix-client";

export function Avatar({ user, subClass }) {
    // Get mxc:// url 
    const mxc = user.avatarUrl;
    // Convert mxc url to https if it exists
    const url = mxc !== null ? global.matrix.mxcUrlToHttp(mxc, 96, 96, "crop") : "";

    return (
        <div className={"avatar__crop " + subClass}>
            <img alt="Avatar" className="avatar" src={url}></img>
        </div>
    );
}

export function User({ user, subClass, clickFunc }) {
    /* A component containing the user avatar, user localpart/displayname and homeserver */

    return (
        <div className={"user " + subClass} onClick={clickFunc}>
            <Avatar subClass="user__avatar" user={user}></Avatar>
            <div className="user__text-box">
                <span className="user__text user__username">{get_username(user)}</span>
                <span className="user__text user__homeserver">{get_homeserver(user)}</span>
            </div>
        </div>
    );
}
