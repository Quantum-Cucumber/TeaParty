import "./MemberList.scss";
import { Member } from "../../components/user";
import { useState, useEffect, useRef } from "react";

const membersPerPage = 30;

function filterName(name) {
    // matches all ASCII punctuation: !"#$%&'()*+,-./:;<=>?@[\]^_`{|}~
    const SORT_REGEX = /[\x21-\x2F\x3A-\x40\x5B-\x60\x7B-\x7E]+/g;
    return name.replace(SORT_REGEX, "");
}


function MemberList({ currentRoom, setUserPopup }) {
    const [memberList, setMembers] = useState([]);
    const [loadedMembers, setLoadedMembers] = useState(membersPerPage);  // Number of members to load
    const memberScroll = useRef();

    // When different room selected, reset the loaded members count and scroll to the top of the list
    useEffect(() => {
        setLoadedMembers(membersPerPage);
        memberScroll.current.scrollTop = 0;
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
            <Member user={user} key={member.userId} subClass="member-list__member data__user-popup" clickFunc={clickFunc} />
        );
    });

    return (
        <div className="member-list" onScroll={onScroll} ref={memberScroll}>
            {members}
        </div>
    );
}


export default MemberList;
