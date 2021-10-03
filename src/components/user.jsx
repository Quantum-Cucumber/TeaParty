import "./components.scss";
import { get_username } from "../utils/matrix-client";
import { getUserColour, acronym } from "../utils/utils";
import { useEffect, useRef, useCallback, useLayoutEffect } from "react";
import { useBindEscape } from '../utils/utils';
import { powerLevelText } from "../utils/matrix-client";

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

export function Member({ user, subClass, clickFunc }) {
    /* A component containing the user avatar, user localpart/displayname and homeserver */

    return (
        <div className={"user " + subClass} onClick={clickFunc}>
            <Avatar subClass="user__avatar" user={user} />
            <div className="user__text-box">
                <span className="user__text user__username">{get_username(user)}</span>
            </div>
        </div>
    );
}



export function UserPopup({ user, parent, room, setUserPopup }) {
    const popupRef = useRef();

    useBindEscape(setUserPopup, {parent: null, user: null});

    const clicked = useCallback((e) => {
        // If anything other than the popup is clicked, or another component that opens the popup was clicked
        if ((!e.target.closest(".user-popup") && !e.target.closest(".data__user-popup")) || (parent === e.target || parent.contains(e.target))) {
            setUserPopup({parent: null, user: null});
        }
    }, [setUserPopup, parent]);

    // useLayoutEffect to set position before render
    useLayoutEffect(() => {
        if (!user || !parent) {return};
        // Want to position at same height at parent, to the right of it while also within window boundaries
        const padding = 10;
        const parentRect = parent.getBoundingClientRect();
        const popup = popupRef.current;

        // Position at same height
        popup.style.top = `${parentRect.y}px`;
        popup.style.bottom = "auto";
        // Position to the right of parent
        popup.style.left = `${parentRect.x + parentRect.width + padding}px`
        popup.style.right = "auto";

        // Constrain to screen height
        const popupRect = popup.getBoundingClientRect();
        if (popupRect.bottom > window.innerHeight) {
            popup.style.top = "auto";
            popup.style.bottom = `${padding}px`;
        }

        // Render on other side of parent if off the screen
        if (popupRect.right > window.innerWidth) {
            popup.style.left = "auto";
            popup.style.right = `${padding + (window.innerWidth - parentRect.left)}px`;
        }

        // Trigger the slide animation
        popupRef.current.style.display = "none";
        void(popupRef.current.offsetHeight);
        popupRef.current.style.display = "block";
    }, [user, parent])

    // Attach click event AFTER render
    useEffect(() => {
        if (!user || !parent) {return};
        // Attach click event to dismiss the popup
        document.addEventListener("click", clicked);
        return () => document.removeEventListener("click", clicked);
    }, [user, parent, clicked]);
    

    if (!user || !parent || !room) {return null};

    return (
        <div className="user-popup" ref={popupRef}>
            <Avatar user={user} subClass="user-popup__avatar" />
            <div className="user-popup__display-name">{user.rawDisplayName}</div>
            <div className="user-popup__text">{user.userId}</div>

            <div className="user-popup__label">Power Level</div>
            <div className="user-popup__text">{powerLevelText(user.userId, room)}</div>
        </div>
    );
}
