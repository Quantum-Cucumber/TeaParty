import "./components.scss";
import { get_username } from "../utils/matrix-client";
import { getUserColour, acronym } from "../utils/utils";

export function Avatar({ user, subClass, clickFunc }) {
    // Get mxc:// url 
    const mxc = user.avatarUrl;
    // Convert mxc url to https if it exists
    const url = mxc !== null ? global.matrix.mxcUrlToHttp(mxc, 96, 96, "crop") : null;

    // Use a placeholder if need be
    var icon;
    if (url) {
        icon = <img alt="Avatar" className="avatar" src={url} />;
    } else {
        icon = (
            <div className="avatar" style={{"backgroundColor": getUserColour(user.userId)}}>
                {acronym(user.displayName, 1)}
            </div>
        );
    }

    return (
        <div className={"avatar__crop " + subClass} onClick={clickFunc} >
            {icon}
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
            </div>
        </div>
    );
}
