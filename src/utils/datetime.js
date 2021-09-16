import { DateTime } from "luxon";

function _jsDateToLocal(date) {
    /* Convert a utc js date object into a luxon DateTime in the browser's local time */
    return DateTime.fromJSDate(date, "UTC").toLocal();
}

function _relativeDate(date) {
    /* Return today/yesterday/a date string by comparing to the current date */
    // Check if the next message is today
    const now = DateTime.local();
    if (date.hasSame(now, "day")) {
        return "Today";
    } 
    // Check if next message was yesterday
    else if (date.hasSame(now.minus({days: 1}), "day")) {
        return "Yesterday";
    }
    // Return just the date
    else {
        return date.toLocaleString(DateTime.DATE_MED);
    }}


export function dateToTime(date) {
    const dt = _jsDateToLocal(date);
    return dt.toLocaleString(DateTime.TIME_24_SIMPLE);
}

export function messageTimestamp(date) {
    const dt = _jsDateToLocal(date);
    const dateStr = _relativeDate(dt);
    const timeStr = dateToTime(date);
    
    if (dateStr === "Today") {
        return timeStr;
    } else {
        return `${dateStr} ${timeStr}`;
    }
}

export function dateToWeekdayDate(date) {
    const dt = _jsDateToLocal(date);
    return dt.toLocaleString(DateTime.DATE_HUGE);
}

export function dateToDateStr(date) {
    const dt = _jsDateToLocal(date);
    return dt.toLocaleString(DateTime.DATE_FULL);
}


export function dayBorder(nextMsg, lastMsg) {
    if (!nextMsg || !lastMsg) {return null}
    // Get local DT from the utc date
    const nextLocal = _jsDateToLocal(nextMsg.getDate());
    const lastLocal = _jsDateToLocal(lastMsg.getDate());
    // Check whether dates are the same
    if (nextLocal.day !== lastLocal.day) {
        return _relativeDate(nextLocal);
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
