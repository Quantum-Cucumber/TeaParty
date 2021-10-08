import "./components.scss";
import { get_username } from "../utils/matrix-client";
import { getUserColour, acronym, classList } from "../utils/utils";
import { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import { useBindEscape } from '../utils/utils';
import { powerLevelText } from "../utils/matrix-client";
import { Button, positionFloating } from "./interface";
import { mdiContentCopy } from "@mdi/js";

export function Avatar({ user, subClass, clickFunc }) {
    // Get mxc:// url 
    const mxc = user.avatarUrl;
    // Convert mxc url to https if it exists
    const url = mxc !== null ? global.matrix.mxcUrlToHttp(mxc, 96, 96, "crop") : null;

    // Use a placeholder if need be
    var icon;
    if (url) {
        icon = <img alt={acronym(user.displayName, 1)} style={{"backgroundColor": getUserColour(user.userId)}} className="avatar" src={url} />;
    } else {
        icon = (
            <div className="avatar" style={{"backgroundColor": getUserColour(user.userId)}}>
                {acronym(user.displayName, 1)}
            </div>
        );
    }

    return (
        <div className={classList("avatar__crop", subClass)} onClick={clickFunc} >
            {icon}
        </div>
    );
}

export function Member({ user, subClass, clickFunc }) {
    /* A component containing the user avatar, user localpart/displayname and homeserver */

    return (
        <div className={classList("user", subClass)} onClick={clickFunc}>
            <Avatar subClass="user__avatar" user={user} />
            <div className="user__text-box">
                <span className="user__text user__username">{get_username(user)}</span>
            </div>
        </div>
    );
}



export function UserPopup({ user, parent, room, setUserPopup }) {
    const popupRef = useRef();
    const [idCopyText, setIdCopyText] = useState("Copy");

    useBindEscape(setUserPopup, null);

    const clicked = useCallback((e) => {
        // If anything other than the popup is clicked, or another component that opens the popup was clicked
        if ((!e.target.closest(".user-popup") && !e.target.closest(".data__user-popup")) || (parent === e.target || parent.contains(e.target))) {
            setUserPopup(null);
        }
    }, [setUserPopup, parent]);

    // useLayoutEffect to set position before render
    useLayoutEffect(() => {
        if (!user || !parent) {return};
        // Want to position at same height at parent, to the right of it while also within window boundaries
        const padding = 10;
        const popup = popupRef.current;

        positionFloating(popup, parent, "right", "align-top", padding);

        // Constrain to screen height
        const popupRect = popup.getBoundingClientRect();
        if (popupRect.bottom > window.innerHeight) {
            popup.style.top = "auto";
            popup.style.bottom = `${padding}px`;
        }

        // Render on other side of parent if off the screen
        if (popupRect.right > window.innerWidth) {
            positionFloating(popup, parent, "left", "align-top", padding);
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

    function copyUserId() {
        navigator.clipboard.writeText(user.userId);
        setIdCopyText("Copied");
        setTimeout(() => setIdCopyText("Copy"), 1000);
    }

    return (
        <div className="user-popup" ref={popupRef}>
            <Avatar user={user} subClass="user-popup__avatar" />
            <div className="user-popup__display-name">{user.rawDisplayName}</div>
            <div className="user-popup__text">
                {user.userId}&nbsp;
                <Button path={mdiContentCopy} size="100%" tipDir="top" tipText={idCopyText} subClass="user-popup__text__copy" clickFunc={copyUserId} />
            </div>

            <div className="user-popup__label">Power Level</div>
            <div className="user-popup__text">{powerLevelText(user.userId, room)}</div>
        </div>
    );
}
