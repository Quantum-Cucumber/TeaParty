import "./Reactions.scss";
import { useReducer, useEffect, useState } from "react";

import { Option } from "../../../../components/elements";
import { Tooltip } from "../../../../components/popups"
import { Member } from "../../../../components/user";

import { getMember } from "../../../../utils/matrix-client";
import { classList, friendlyList } from "../../../../utils/utils";

function getEventRelations(event, relationType, eventType) {
    /* A simple wrapper for EventTimelineSet.getRelationsForEvent, taking the event object as an arg */
    const room = global.matrix.getRoom(event.getRoomId());
    const timelineSet = room.getLiveTimeline().getTimelineSet();
    return timelineSet.getRelationsForEvent(event.getId(), relationType, eventType);
}
export function getEventReactions(event) {
    // MSC2677: https://github.com/matrix-org/matrix-doc/pull/2677
    const relations = getEventRelations(event, "m.annotation", "m.reaction");
    return relations;
}

function getReacted(relation) {
    let output = {};

    relation.getSortedAnnotationsByKey().forEach(([emote, eventSet]) => {
        const count = eventSet.size;  // Number of reactions to be displayed
        if (!count) {return} // Ignore if no reactions for that emote
        let me = false;  // Whether the user has selected this reaction

        // Produce the list of people who have reacted 
        const members = [...eventSet].filter((event) => {
            if (event.getSender() === global.matrix.getUserId() && !event.isRedacted())  {
                me = true;
            }
            return !event.isRedacted();  // Don't show redacted reactions
        }).map((event) => {
            return getMember(event.getSender(), event.getRoomId());
        })

        output[emote] = {count: count, me: me, members: members};
    });

    return output;
}


/* Reaction detection/processing heavily inspired by matrix-org/matrix-react-sdk */
export default function Reactions({ reactionsRelation }) {
    // eslint-disable-next-line no-unused-vars
    const [ignored, forceUpdate] = useReducer((current) => !current, false);
    
    // Listen for changes to the relations object
    useEffect(() => {
        reactionsRelation.on("Relations.add", forceUpdate);
        reactionsRelation.on("Relations.remove", forceUpdate);
        reactionsRelation.on("Relations.redaction", forceUpdate);
        
        return () => {
            reactionsRelation.removeListener("Relations.add", forceUpdate);
            reactionsRelation.removeListener("Relations.remove", forceUpdate);
            reactionsRelation.removeListener("Relations.redaction", forceUpdate);
        }
    }, [reactionsRelation])
    
    // Calculate the <Reaction> components 
    if (!reactionsRelation) {return null};
    const reactions = getReacted(reactionsRelation);

    return (
        <div className="event__reactions">
            {
                Object.keys(reactions).map((emote) => {
                    return (
                        <Reaction emote={emote} {...reactions[emote]} key={emote} />
                    )
                })
            }
        </div>
    );
}
function Reaction({ emote, me, count, members }) {
    const [selected, setSelected] = useState(me);
    useEffect(() => {
        setSelected(me);
    }, [me])

    const userNames = members.map((member) => {return member.name});
    const hover = friendlyList(userNames, 3) + " reacted with " + emote;

    return (
        <Tooltip dir="top" text={hover} delay={0.3}>
            <div className={classList("event__reactions__reaction", {"event__reactions__reaction--selected": selected})}
                /*onClick={toggleSelected}*/>
                {emote}{" "}{count}
            </div>
        </Tooltip>
    )
}

export function ReactionViewer({ reactions, setUserPopup }) {
    const reacted = getReacted(reactions);
    const [selected, select] = useState(Object.keys(reacted)[0]);

    return (<>
        <div className="overlay__modal--reacts__emotes scroll--hover">
            {Object.keys(reacted).map((emote) => {
                return (
                    <Option text={emote} selected={selected} select={select} k={emote} key={emote} />
                )
            })}
        </div>
        <div className="overlay__modal--reacts__users">
            {reacted[selected].members.map((member) => {
                const user = global.matrix.getUser(member.userId);
                return (
                    <Member member={member} key={member.userId} subClass="data__user-popup" clickFunc={
                        (e) => {
                            setUserPopup({user: user, parent: e.target.closest(".user")});
                        }
                    } />
                )
            })}
        </div>
    </>)
}
