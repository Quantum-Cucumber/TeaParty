import { DateTime } from "luxon";

export function dtToTime(date) {
    // Convert to luxon dt
    const dt = DateTime.fromJSDate(date, "UTC").toLocal();
    return dt.toLocaleString(DateTime.TIME_24_SIMPLE);
}

export function dtToWeekdayDate(date) {
    const dt = DateTime.fromJSDate(date, "UTC").toLocal();
    return dt.toLocaleString(DateTime.DATE_HUGE);
}

export function dtToDate(date) {
    const dt = DateTime.fromJSDate(date, "UTC").toLocal();
    return dt.toLocaleString(DateTime.DATE_FULL);
}


export function dayBorder(nextMsg, lastMsg) {
    if (!nextMsg || !lastMsg) {return null}
    // Get local DT from the utc date
    const nextLocal = DateTime.fromJSDate(nextMsg.getDate(), "UTC").toLocal();
    const lastLocal = DateTime.fromJSDate(lastMsg.getDate(), "UTC").toLocal();
    // Check whether dates are the same
    if (nextLocal.day !== lastLocal.day) {
        // Check if the next message is today
        const now = DateTime.local();
        if (nextLocal.hasSame(now, "day")) {
            return "Today";
        } 
        // Check if next message was yesterday
        else if (nextLocal.hasSame(now.minus({days: 1}), "day")) {
            return "Yesterday";
        }
        // Return just the date
        else {
            return nextLocal.toLocaleString(DateTime.DATE_FULL);
        }

    } else {
        return null
    }
}

export function msToDate(ms) {
    if (!ms) {return ""};

    const dt = DateTime.fromMillis(ms, {locale: "UTC"}).toLocal();
    const now = DateTime.local();

    if (dt.hasSame(now, "day")) {
        return dt.toLocaleString(DateTime.TIME_24_SIMPLE);
    } else {
        return dt.toLocaleString(DateTime.DATE_FULL);
    }
}
