import "./Reactions.scss";
import { useReducer, useEffect, useState, useContext, useCallback } from "react";
import { EventType, RelationType } from "matrix-js-sdk/lib/@types/event";

import { Option } from "../../../../components/elements";
import { popupCtx, Tooltip } from "../../../../components/popups"
import { Member, UserPopup } from "../../../../components/user";
import { FancyText } from "../../../../components/wrappers";

import { getMember } from "../../../../utils/matrix-client";
import { classList, friendlyList } from "../../../../utils/utils";
import { useCatchState } from "../../../../utils/hooks";
import { addReaction } from "../../../../utils/eventSending";

import type { MatrixEvent, Room, RoomMember } from "matrix-js-sdk";
import type { Relations } from "matrix-js-sdk/lib/models/relations";


function getEventRelations(event: MatrixEvent, relationType:  RelationType, eventType: string) {
    /* A simple wrapper for EventTimelineSet.getRelationsForEvent, taking the event object as an arg */
    const room: Room = global.matrix.getRoom(event.getRoomId());
    const timelineSet = room.getLiveTimeline().getTimelineSet();
    return timelineSet.getRelationsForEvent(event.getId(), relationType, eventType);
}
export function getEventReactions(event: MatrixEvent) {
    // MSC2677: https://github.com/matrix-org/matrix-doc/pull/2677
    const relations = getEventRelations(event, RelationType.Annotation, EventType.Reaction);
    return relations;
}

function getReacted(relation: Relations) {
    const output: {[key: string]: {count: number, myReact: MatrixEvent, members: RoomMember[]}} = {};

    relation.getSortedAnnotationsByKey()
    // Sort by count, then by age
    .sort((a, b) => {
        const aEvents = a[1];
        const aDates = [...aEvents].map((ev) => ev.getAge());
        const bEvents = b[1];
        const bDates = [...bEvents].map((ev) => ev.getAge());
        return Math.max(...bDates) - Math.max(...aDates);
    })
    .forEach(([emote, eventSet]) => {
        const count = eventSet.size;  // Number of reactions to be displayed
        if (!count) {return} // Ignore if no reactions for that emote
        let myReact = null;  // Whether the user has selected this reaction

        // Produce the list of people who have reacted 
        const members = [...eventSet].filter((event) => {
            if (event.getSender() === global.matrix.getUserId() && !event.isRedacted())  {
                myReact = event;
            }
            return !event.isRedacted();  // Don't show redacted reactions
        }).map((event) => {
            return getMember(event.getRoomId(), event.getSender());
        }).filter(member => Boolean(member))

        output[emote] = {count: count, myReact: myReact, members: members};
    });

    return output;
}


/* Reaction detection/processing heavily inspired by matrix-org/matrix-react-sdk */
export default function Reactions({ event, reactionsRelation }: {event: MatrixEvent, reactionsRelation: Relations}) {
    const [, forceUpdate] = useReducer((current) => !current, false);
    
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


    const room: Room = global.matrix.getRoom(event.getRoomId());
    const canReact = room.currentState.maySendEvent(EventType.Reaction, global.matrix.getUserId());
    
    // Calculate the <Reaction> components 
    if (!reactionsRelation) {return null}
    const reactions = getReacted(reactionsRelation);

    return (
        <div className="event__reactions">
            {
                Object.keys(reactions).map((emote) => {
                    return (
                        <Reaction event={event} emote={emote} canEdit={canReact} {...reactions[emote]} key={emote} />
                    )
                })
            }
        </div>
    );
}

type ReactionProps = {
    event: MatrixEvent,
    emote: string,
    myReact: MatrixEvent,
    count: number,
    members: RoomMember[],
    canEdit?: boolean,
}
function Reaction({ event, emote, myReact, count, members, canEdit = true }: ReactionProps) {
    const react = useCallback(async (react: boolean) => {
        // Wants to add reaction, and no reaction event
        if (react && !myReact) {
            await addReaction(event, emote);
        }
        // Wants to remove reaction and there is a reaction event
        else if (!react && myReact) {
            await global.matrix.redactEvent(myReact.getRoomId(), myReact.getId());
        }
        else {
            throw new Error();
        }
    }, [myReact, event, emote])
    
    const [selected, setSelected] = useCatchState(!!myReact, react);
    useEffect(() => {
        setSelected(!!myReact, null, true);
    }, [myReact, setSelected])


    const userNames = members.map((member) => {return member?.name});
    const hover = friendlyList(userNames, 3) + " reacted with " + emote;

    return (
        <Tooltip dir="top" text={hover} delay={0.3}>
            <div className={classList("event__reactions__reaction", {"event__reactions__reaction--selected": selected}, {"event__reactions__reaction--disabled": !canEdit})}
                onClick={canEdit ? () => setSelected(!selected) : null}
            >
                <FancyText className="event__reactions__reaction__twemoji" links={false}>
                    {emote}
                </FancyText>
                {" "}{count}
            </div>
        </Tooltip>
    )
}


export function ReactionViewer({ event, reactions }: {event: MatrixEvent, reactions: Relations}) {
    const setPopup: (popup: JSX.Element) => void = useContext(popupCtx);
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
                const user = global.matrix.getUser(member?.userId);
                if (!user) {return null}
                return (
                    <Member member={member} key={member.userId} subClass="data__user-popup" clickFunc={
                        (e) => {
                            setPopup(
                                <UserPopup parent={e.target.closest(".user")} user={user} room={event.getRoomId()} setPopup={setPopup} />
                            );
                        }
                    } />
                )
            })}
        </div>
    </>)
}
