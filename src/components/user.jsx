import "./user.scss";
import { useState, useEffect, useRef, useLayoutEffect, useContext } from "react";

import { getUserColour, acronym, classList } from "../utils/utils";
import { useBindEscape } from '../utils/hooks';
import { getLocalpart, powerLevelText } from "../utils/matrix-client";

import { ContextMenu, ImagePopup, popupCtx, positionFloating } from "./popups";
import { TextCopy } from "./wrappers";
import { Option } from "./elements";

import Icon from "@mdi/react";
import { mdiContentCopy } from "@mdi/js";


export function Avatar({ user, subClass, ...props }) {
    // Get mxc:// url 
    const mxc = user.avatarUrl;
    // Convert mxc url to https if it exists
    const url = mxc !== null ? global.matrix.mxcUrlToHttp(mxc, 96, 96, "crop") : null;

    // Use a placeholder if need be
    var icon;
    if (url) {
        icon = <img alt={acronym(user.displayName, 1)} className="avatar avatar--img" src={url} />;
    } else {
        icon = (
            <div className="avatar" style={{"backgroundColor": getUserColour(user.userId)}}>
                {acronym(user.displayName, 1)}
            </div>
        );
    }

    return (
        <div className={classList("avatar__crop", subClass)} {...props}>
            {icon}
        </div>
    );
}

export function Member({ member, subClass = null, clickFunc }) {
    /* A component containing the user avatar, user localpart/displayname */
    const setPopup = useContext(popupCtx);
    const user = global.matrix.getUser(member.userId);

    return (
        <div className={classList("user", subClass)} onClick={clickFunc} onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setPopup(
                    <UserOptions parent={e.target} userId={member.userId} x="align-mouse-left" y="align-mouse-top" mouseEvent={e} />
                )
            }}
        >
            <Avatar subClass="user__avatar" user={user} />
            <div className="user__text-box">
                <span className="user__text user__username">{member.name}</span>
            </div>
        </div>
    );
}


export function UserPopup({ user, room, parent, setPopup }) {
    const popupRef = useRef();
    const [showFullImage, setShowFullImage] = useState(false);

    useBindEscape(setPopup, null, !!(user && parent));

    // useLayoutEffect to set position before render
    useLayoutEffect(() => {
        if (!user || !parent) {return};
        // Want to position at same height at parent, to the right of it while also within window boundaries
        const padding = 10;
        const popup = popupRef.current;

        positionFloating(popup, parent, "right", "align-top", padding, undefined, true);

        // Trigger the slide animation
        popupRef.current.style.display = "none";
        void(popupRef.current.offsetHeight);
        popupRef.current.style.display = "block";
    }, [user, parent])

    // Attach click event AFTER render
    useEffect(() => {
        if (!user || !parent) {return};

        setShowFullImage(false);

        function clicked(e) {
            e.stopPropagation();
            // If anything other than the popup is clicked, or another component that opens the popup was clicked
            if ((!e.target.closest(".user-popup") && !e.target.closest(".data__user-popup")) || parent.contains(e.target)) {
                setPopup(null);
            }
        }

        setTimeout(() => {
            document.addEventListener("click", clicked)
        }, 1);
        return () => {
            document.removeEventListener("click", clicked)
        }
    }, [user, parent, setPopup]);
    

    if (!user || !parent) {return null};

    return (
        <div className="user-popup" ref={popupRef}>
            <Avatar user={user} subClass="user-popup__avatar" onClick={user.avatarUrl ? () => {setShowFullImage(true)} : null} />
            { user.avatarUrl &&
                <ImagePopup sourceUrl={global.matrix.mxcUrlToHttp(user.avatarUrl)} render={showFullImage} setRender={setShowFullImage} name="avatar" />
            }
            <div className="user-popup__display-name">{user.rawDisplayName || getLocalpart(user)}</div>
            <div className="user-popup__text">
                <TextCopy text={user.userId} />
            </div>

            <div className="user-popup__label">Power Level</div>
            <div className="user-popup__text">{powerLevelText(user.userId, room)}</div>
        </div>
    );
}


export function UserOptions({ userId, ...props }) {
    /* Context menu for when a user is right clicked */
    const setPopup = useContext(popupCtx);

    return (
        <ContextMenu {...props}>
            <Option compact text="Copy user ID" select={() => {
                    navigator.clipboard.writeText(userId);
                    setPopup();
            }}>
                    <Icon path={mdiContentCopy} size="1em" color="var(--text)" />
            </Option>
        </ContextMenu>
    )
}
