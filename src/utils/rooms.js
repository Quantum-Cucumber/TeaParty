
export function getInvitedRooms() {
    return global.matrix.getVisibleRooms().filter((room) => {
        return room.getMyMembership() === "invite";
    });
}
