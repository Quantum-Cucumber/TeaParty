import "./MemberList.scss";
import { Member } from "../../components/user";
import { useState, useEffect, useRef, memo } from "react";

const membersPerPage = 30;
const memberEvents = ["RoomMember.membership", "RoomMember.name", "RoomMember.powerLevel"];


function filterName(name) {
    // matches all ASCII punctuation: !"#$%&'()*+,-./:;<=>?@[\]^_`{|}~
    const SORT_REGEX = /[\x21-\x2F\x3A-\x40\x5B-\x60\x7B-\x7E]+/g;
    return name.replace(SORT_REGEX, "");
}


function MemberList({ currentRoom, setUserPopup }) {
    const [memberList, setMembers] = useState([]);
    const [loadedMembers, setLoadedMembers] = useState(membersPerPage);  // Number of members to load
    const memberScroll = useRef();

    useEffect(() => {
        setLoadedMembers(membersPerPage);  // Reset loaded member count
        setMembers([]);  // Reset member list

        function memberUpdated(event, member) {
            if (member.roomId === currentRoom) {
                setLoadedMembers(l => l);
            }
        }
        for (const e in memberEvents) {
            global.matrix.on(e, memberUpdated);
        }

        return () => {for (const e in memberEvents) {global.matrix.removeListener(e, memberUpdated)}}
    }, [currentRoom]);

    useEffect(() => {
        if (!currentRoom) {return}

        let members = global.matrix.getRoom(currentRoom).getJoinedMembers();
        if (members.length === loadedMembers) {return}

        const collator = Intl.Collator("en", {sensitivity: "base", ignorePunctuation: true})
        members.sort((a, b) => {
            if (a.powerLevel !== b.powerLevel) {
                return  b.powerLevel - a.powerLevel;
            }
            return collator.compare(filterName(a.name), filterName(b.name));
        });
        setMembers(members.slice(0, loadedMembers));
    }, [loadedMembers, currentRoom])
    
    // When at the bottom of the list, load in new members
    function onScroll(e) {
        if (e.target.scrollTop === e.target.scrollHeight - e.target.offsetHeight) {
            setLoadedMembers(loadedMembers => loadedMembers + membersPerPage);
        }
    }

    const members = memberList.map((member) => {
        const user = global.matrix.getUser(member.userId);
        function clickFunc(e) {
            setUserPopup({parent: e.target.closest(".member-list__member"), user: user});
        }

        return (
            <Member member={member} key={member.userId}
                subClass="member-list__member data__user-popup" clickFunc={clickFunc} 
            />
        );
    });

    return (
        <div className="member-list scroll--hover" onScroll={onScroll} ref={memberScroll}>
            {members}
        </div>
    );
}


export default memo(MemberList);
