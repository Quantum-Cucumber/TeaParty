import "./RoomExplorer.scss";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useHistory } from "react-router-dom";

import { Modal, modalCtx, Tooltip } from "../../components/popups";
import { FancyText } from "../../components/wrappers";
import { AsyncButton, Button, Loading, ManualTextBox } from "../../components/elements";

import { useOnElementVisible } from "../../utils/hooks";
import { acronym } from "../../utils/utils";
import { aliasRegex, roomIdRegex } from "../../utils/matrix-client";

import { Icon } from "@mdi/react";
import { mdiMagnify } from "@mdi/js";

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
    const setModal = useContext(modalCtx);
    const history = useHistory();

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


    // Manual room joining
    const [roomToJoin, setRoomToJoin] = useState("");
    const [roomIsValid, setRoomIsValid] = useState(true);
    const [manualJoinStatus, setManualJoinStatus] = useState<joinStatus>(joinStatus.canJoin);

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
            Public Room Directory
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


function RoomEntry({room_id, name, avatar_url, topic, canonical_alias = null, num_joined_members}: IPublicRoomsChunkRoom) {
    const [joined, setJoined] = useState(false);
    // When loaded, figure out if the room is joined and set state accordingly
    useEffect(() => {
        const isJoined = global.matrix.getRoom(room_id)?.getMyMembership() === "join" ?? false;
        if (isJoined) {
            setJoined(true);
        }
    }, [])

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
