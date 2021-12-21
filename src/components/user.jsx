import "./user.scss";
import { useState, useEffect, useRef, useLayoutEffect, useContext } from "react";

import { getUserColour, acronym, classList } from "../utils/utils";
import { useOnKeypress } from "../utils/hooks";
import { getLocalpart, powerLevelText } from "../utils/matrix-client";

import { ContextMenu, ImagePopup, popupCtx, positionFloating } from "./popups";
import { TextCopy } from "./wrappers";
import { Option, OptionIcon, Avatar } from "./elements";

import { mdiContentCopy } from "@mdi/js";


export function UserAvatar({ user }) {
    return (
        <Avatar mxcUrl={user.avatarUrl} fallback={acronym(user.displayName, 1)} backgroundColor={getUserColour(user.userId)} />
    );
}
export function MemberAvatar({ member }) {
    return (
            <Avatar mxcUrl={member?.getMxcAvatarUrl()} fallback={acronym(member?.name, 1)} backgroundColor={getUserColour(member?.userId) ?? null} />
    );
}

export function Member({ member, subClass = null, clickFunc }) {
    /* A component containing the user avatar, user localpart/displayname */
    const setPopup = useContext(popupCtx);

    return (
        <div className={classList("user", subClass)} onClick={clickFunc} onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setPopup(
                    <UserOptions parent={e.target} userId={member.userId} x="align-mouse-left" y="align-mouse-top" mouseEvent={e} />
                )
            }}
        >
            <div className="user__avatar">
                <MemberAvatar member={member} />
            </div>
            <div className="user__text-box">
                <span className="user__text user__username">{member.name}</span>
            </div>
        </div>
    );
}


export function UserPopup({ user, room, parent, setPopup }) {
    const popupRef = useRef();
    const [showFullImage, setShowFullImage] = useState(false);

    useOnKeypress("Escape", setPopup, null, !!(user && parent));

    // useLayoutEffect to set position before render
    useLayoutEffect(() => {
        if (!user || !parent) {return}
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
        if (!user || !parent) {return}

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
    

    if (!user || !parent) {return null}

    return (
        <div className="user-popup" ref={popupRef}>
            <div className="user-popup__avatar" onClick={user.avatarUrl ? () => {setShowFullImage(true)} : null}>
                <UserAvatar user={user} />
            </div>
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
            <Option compact text="Copy user ID" 
                select={() => {
                    navigator.clipboard.writeText(userId);
                    setPopup();
                }}
                icon={<OptionIcon path={mdiContentCopy} />}
            />
        </ContextMenu>
    )
}
