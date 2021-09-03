import "./client.css";
import { build_matrix } from "../matrix-client";
import { User } from "../components/user";
import { useEffect, useState } from "react";
import { Button } from "../components/interface";
import { mdiCog } from "@mdi/js";

function Client() {
    const [synced, syncState] = useState(false);

    // On first load, start syncing. Once synced, change state to reload as client
    useEffect(() => {
        build_matrix().then(() => {
            global.matrix.once("sync", (state, prevState, data) => {
                if (prevState === null && state === "PREPARED") {
                    syncState(true);
                }
            })
        });
    }, []);

    if (!synced) {
        return (<span>Syncing...</span>);
    }

    return (
        <div className="client">
            <div className="column column--left"></div>
            <div className="column column--rooms">
                <div className="client__user-bar">
                    <MyUser user={global.matrix.getUser(global.matrix.getUserId())} />
                    <div className="client__user-bar__options-box">
                        <Button path={mdiCog} clickFunc={() => {}} subClass="client__user-bar__options" size="24px" />
                    </div>
                </div>
            </div>
            <div className="column column--chat"></div>
            <div className="column column--right"></div>
        </div>
    );
}

function MyUser({ user }) {
    function click() {
        navigator.clipboard.writeText(user.userId);
    }

    return (
        <User user={user} subClass="client__user-bar__profile" clickFunc={click} />
    );
}

export default Client;
