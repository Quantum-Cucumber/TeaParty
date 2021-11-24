import "./MemberList.scss";
import { useState, useEffect, memo, useReducer, useContext } from "react";
import { Member, UserPopup } from "../../components/user";
import { popupCtx } from "../../components/popups";
import { useScrollPaginate } from "../../utils/hooks";

const membersPerPage = 30;
const memberEvents = ["RoomMember.membership", "RoomMember.name", "RoomMember.powerLevel"];


function filterName(name) {
    // matches all ASCII punctuation: !"#$%&'()*+,-./:;<=>?@[\]^_`{|}~
    const SORT_REGEX = /[\x21-\x2F\x3A-\x40\x5B-\x60\x7B-\x7E]+/g;
    return name.replace(SORT_REGEX, "");
}


function MemberList({ currentRoom }) {
    const setPopup = useContext(popupCtx);
    const [memberList, setMembers] = useState([]);

    const [updateVal, update] = useReducer(false, current => !current);
    const [loadingRef, setLoadingRef] = useState();
    const loadedMembers = useScrollPaginate(loadingRef, membersPerPage);

    // When the room changes, attach a listener to look for member updateevents
    useEffect(() => {
        setMembers([]);  // Reset member list

        function memberUpdated(event, member) {
            if (member.roomId === currentRoom) {
                update();
            }
        }
        for (const e in memberEvents) {
            global.matrix.on(e, memberUpdated);
        }

        return () => {for (const e in memberEvents) {global.matrix.removeListener(e, memberUpdated)}}
    }, [currentRoom]);

    // Sort the members to be loaded
    useEffect(() => {
        if (!currentRoom) {return}
        if (!global.matrix.getRoom(currentRoom)) {return}

        let members = global.matrix.getRoom(currentRoom).getJoinedMembers();

        const collator = Intl.Collator("en", {sensitivity: "base", ignorePunctuation: true})
        members.sort((a, b) => {
            return collator.compare(filterName(a.name), filterName(b.name));
        })
        .sort((a, b) => {
            return b.powerLevel - a.powerLevel;
        });
        setMembers(members);
    }, [updateVal, currentRoom])

    // Convert member objects to elements
    const members = memberList.slice(0, loadedMembers).map((member) => {
        const user = global.matrix.getUser(member.userId);
        function clickFunc(e) {
            setPopup(
                <UserPopup parent={e.target.closest(".member-list__member")} user={user} room={currentRoom} setPopup={setPopup} />
            );
        }

        return (
            <Member member={member} key={member.userId}
                subClass="member-list__member data__user-popup" clickFunc={clickFunc} 
            />
        );
    });

    return (
        <div className="member-list scroll--hover">
            {members}

            { memberList.length > loadedMembers &&
                <div ref={setLoadingRef} style={{height: "1px", width: "100%"}}></div>
            }
        </div>
    );
}


export default memo(MemberList);
