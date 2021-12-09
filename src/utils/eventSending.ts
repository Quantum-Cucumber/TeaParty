import { EventType, RelationType } from "matrix-js-sdk/src/@types/event";

import type { MatrixEvent } from "matrix-js-sdk";


export async function addReaction(event: MatrixEvent, emote: string) {
    const newEvent = {
        "m.relates_to": {
            rel_type: RelationType.Annotation,
            event_id: event.getId(),
            key: emote,
        }
    };
    await global.matrix.sendEvent(event.getRoomId(), EventType.Reaction, newEvent)
}
