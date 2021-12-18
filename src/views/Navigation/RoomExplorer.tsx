import "./RoomExplorer.scss";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useHistory } from "react-router-dom";

import { Modal, modalCtx, Tooltip } from "../../components/popups";
import { FancyText } from "../../components/wrappers";
import { AsyncButton, Button, IconButton, Loading, ManualTextBox } from "../../components/elements";

import { useOnElementVisible, useStableState } from "../../utils/hooks";
import { acronym, debounce } from "../../utils/utils";
import { aliasRegex, roomIdRegex } from "../../utils/matrix-client";

import { Icon } from "@mdi/react";
import { mdiClose, mdiMagnify } from "@mdi/js";

import type { IPublicRoomsChunkRoom, Room } from "matrix-js-sdk";


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


enum joinStatus {
    canJoin,
    loading,
    error,
}

function ExploreModal() {
    const history = useHistory();
    const setModal = useContext(modalCtx);

    // Manual room joining
    const [roomToJoin, setRoomToJoin] = useState("");
    const [roomIsValid, setRoomIsValid] = useState(true);
    const [manualJoinStatus, setManualJoinStatus] = useState(joinStatus.canJoin);

    useEffect(() => {
        setRoomIsValid(true);
        setManualJoinStatus((current) => current === joinStatus.error ? joinStatus.canJoin : current);
    }, [roomToJoin])

    async function manualJoin() {
        const cleanedRoom = roomToJoin.trim();
        if (aliasRegex.test(cleanedRoom) || roomIdRegex.test(cleanedRoom)) {
            setRoomIsValid(true);
            setManualJoinStatus(joinStatus.loading);
            try {
                const room: Room = await global.matrix.joinRoom(cleanedRoom);
                // Close modal and navigate to the room
                history.push("/room/" + room.roomId);
                setModal(null);
            }
            catch {
                setManualJoinStatus(joinStatus.error);
                setRoomIsValid(false);
            }
        }
        else {
            setRoomIsValid(false);
        }
    }


    return (
        <Modal title="Join Room" hide={() => setModal(null)} modalClass="room-list">
            <form className="textbox room-list__manual" onSubmit={(e) => {e.preventDefault(); manualJoin()}}>
                <ManualTextBox placeholder="Room ID or Alias" value={roomToJoin} setValue={setRoomToJoin} valid={roomIsValid} />
                { manualJoinStatus === joinStatus.loading ?
                    <Loading size="1.5em" />
                :
                    <Button save onClick={manualJoin}>Join</Button>
                }
            </form>
            { manualJoinStatus === joinStatus.error &&
                <div className="room-list__manual__error">Unable to join room</div>
            }

            <br />
            <RoomDirectory />
        </Modal>
    )
}


enum directoryStatus {
    loading,  // Able to load new entries
    loaded,  // Has loaded all available entries
    error,  // Error occured gettting entries
}

export function RoomDirectory() {
    const [publicRooms, setPublicRooms] = useState<IPublicRoomsChunkRoom[]>([]);
    // string is a token exists, null if no more entries, undefined if no token aquired
    const paginateToken = useRef<string | null | undefined>(undefined);

    const loading = useRef(false);
    const loadingRef = useRef<HTMLDivElement>();

    const [status, setStatus] = useState(directoryStatus.loading);

    const [searchTerm, setSearchTerm] = useState("");
    const stableSearchTerm = useStableState(searchTerm);

    const loadMore = useCallback(async () => {
        if (loading.current) {return}  // Don't double up on pending requests
        loading.current = true;
        if (paginateToken.current === null) {return}  // No more results to load

        const search = stableSearchTerm.current ? {filter: {generic_search_term: stableSearchTerm.current}} : {};

        try {
            const result = await global.matrix.publicRooms({limit: ROOMPAGESIZE, since: paginateToken.current, ...search});

            const newToken = result.next_batch ?? null;
            paginateToken.current = newToken;  // If no token provided, set as null
            if (newToken === null) {
                setStatus(directoryStatus.loaded);
            }
            else {
                setStatus(directoryStatus.loading);
            }

            setPublicRooms((current) => [...current, ...result.chunk]);
        }
        catch {
            setStatus(directoryStatus.error);
        }
        finally {
            loading.current = false;
        }
    }, [stableSearchTerm])

    useOnElementVisible(loadingRef.current, loadMore);

    // When search term is changed, after 1s, update the results
    const search = useMemo(() => debounce(() => {
        paginateToken.current = undefined;
        setPublicRooms([]);
        loadMore();
    }, 800), [loadMore])

    // Will also fire when mounted
    useEffect(() => {
        search();
    }, [searchTerm, search])

    return (<>
        <div className="room-list__title">Public Room Directory</div>
        <div className="room-list__search">
            <ManualTextBox placeholder="Search rooms" value={searchTerm} setValue={setSearchTerm} />
            { searchTerm ?
                <IconButton path={mdiClose} clickFunc={() => {setSearchTerm("")}} size="1em" />
            :
                <Icon path={mdiMagnify} size="1em" color="var(--text-greyed)" />
            }
        </div>
        {
            publicRooms.map((room) => {
                return (
                    <RoomEntry {...room} key={room.room_id} />
                )
            })
        }
        { status === directoryStatus.error &&
            <>Error loading rooms</>
        }
        { status === directoryStatus.loading &&
            <div className="room-list__loading" ref={loadingRef}><Loading size="2.5em"/></div>
        }
    </>)
}


function RoomEntry({room_id, name, avatar_url, topic, canonical_alias = null, num_joined_members}: IPublicRoomsChunkRoom) {
    const [joined, setJoined] = useState(false);
    // When loaded, figure out if the room is joined and set state accordingly
    useEffect(() => {
        const isJoined = global.matrix.getRoom(room_id)?.getMyMembership() === "join" ?? false;
        if (isJoined) {
            setJoined(true);
        }
    }, [room_id])

    const httpUrl: string = global.matrix.mxcUrlToHttp(avatar_url, 96, 96, "crop");

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
                { joined ?
                    "Joined"
                :
                    <AsyncButton activeText="Join" successText="Joined"
                        func={async () => {
                            await global.matrix.joinRoom(room_id)
                        }}
                    />
                }
            </div>
        </div>
    )
}
