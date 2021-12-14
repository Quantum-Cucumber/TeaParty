import "./RoomExplorer.scss";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { Modal, modalCtx, Tooltip } from "../../components/popups";
import { FancyText } from "../../components/wrappers";

import { Icon } from "@mdi/react";
import { mdiMagnify } from "@mdi/js";
import { IPublicRoomsChunkRoom } from "matrix-js-sdk";
import { Button, Loading } from "../../components/elements";
import { useOnElementVisible } from "../../utils/hooks";
import { acronym } from "../../utils/utils";


const ROOMPAGESIZE = 20;


export function ExploreIcon() {
    const setModal = useContext(modalCtx);
    function showExploreModal() {
        setModal(
            <ExploreModal />
        )
    }

    return (
        <div className="group__holder">
            <Tooltip text="Join room" dir="right">
                <div className="group group--default" onClick={showExploreModal}>
                    <Icon path={mdiMagnify} color="var(--text-greyed)" size="100%" />
                </div>
            </Tooltip>
        </div>
    )
}

function ExploreModal() {
    const setModal = useContext(modalCtx);
    const [publicRooms, setPublicRooms] = useState<IPublicRoomsChunkRoom[]>([]);
    // string is a token exists, null if no more entries, undefined if no token aquired
    const paginateToken = useRef<string | null | undefined>(undefined);
    const loadingRef = useRef<HTMLDivElement>();

    const loadMore = useCallback(() => {
        if (paginateToken.current === null) {return}

        global.matrix.publicRooms({limit: ROOMPAGESIZE, since: paginateToken.current})
        .then((result) => {
            paginateToken.current = result.next_batch as string;
            setPublicRooms((current) => [...current, ...result.chunk]);
        })
    }, [])

    // When component mounts, load one page of rooms
    useEffect(() => {
        loadMore();
    }, [loadMore])

    useOnElementVisible(loadingRef.current, loadMore);

    return (
        <Modal title="Join Room" hide={() => setModal(null)}>
            {
                publicRooms.map((room) => {
                    return (
                        <RoomEntry {...room} key={room.room_id} />
                    )
                })
            }
            { paginateToken.current !== null &&
                <div className="room-list__loading" ref={loadingRef}><Loading size="2.5em"/></div>
            }
        </Modal>
    )
}


enum roomEntryState {
    canJoin,
    loading,
    joined,
    error,
}

function RoomEntry({room_id, name, avatar_url, topic, canonical_alias = null, num_joined_members}: IPublicRoomsChunkRoom) {
    const [statusState, setStatusState] = useState<roomEntryState>(roomEntryState.canJoin);

    // When loaded, figure out if the room is joined and set state accordingly
    useEffect(() => {
        const isJoined = global.matrix.getRoom(room_id)?.getMyMembership() === "join" ?? false;
        if (isJoined) {
            setStatusState(roomEntryState.joined);
        }
    }, [])
    

    const httpUrl: string = global.matrix.mxcUrlToHttp(avatar_url, 96, 96, "crop");

    let status: JSX.Element;
    switch (statusState) {
        case roomEntryState.canJoin:
            status = (
                <Button save
                    onClick={() => {
                        setStatusState(roomEntryState.loading);
                        global.matrix.joinRoom(room_id)
                        .then(() => { setStatusState(roomEntryState.joined) })
                        .catch(() => { setStatusState(roomEntryState.error) })
                    }}
                >
                    Join
                </Button>
            );
            break;
        case roomEntryState.joined:
            status = (
                <Button disabled>Joined</Button>
            );
            break;
        case roomEntryState.loading:
            status = (
                <Loading size="1em" />
            );
            break;
        case roomEntryState.error:
            status = (
                <>Error</>
            );
            break;
    }

    return (
        <div className="room-list__room">
            <div className="avatar room-list__room__avatar">
                { httpUrl ?
                    <img className="avatar avatar--img" src={httpUrl} alt={name} />
                : 
                    <div className="avatar">
                        {acronym(name, 3)}
                    </div>
                }
            </div>
            <div className="room-list__room__body">
                <div className="room-list__room__name">{name}</div>
                <div className="room-list__room__details">
                    {canonical_alias && `${canonical_alias} -`} {num_joined_members?.toLocaleString()} members
                </div>
                { topic && 
                    <FancyText>
                        <div className="room-list__room__body--topic">{topic}</div>
                    </FancyText>
                }
            </div>
            <div className="room-list__room__button">
                {status}
            </div>
        </div>
    )
}
