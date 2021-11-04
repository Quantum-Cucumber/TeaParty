import { useState, useEffect, useRef, useCallback } from "react";
import { mediaToBlob } from "./utils";


export function useBindEscape(setState, value, bind=true) {
    /* Listen for escape key to hide unread indicator */

    const keyPress = useCallback((e) => {
        if (e.key === "Escape") {
            setState(value);
        }
    }, [setState, value])

    useEffect(() => {
        if (bind) {
            document.addEventListener("keydown", keyPress);
        } else {
            document.removeEventListener("keydown", keyPress);
        }
    }, [keyPress, bind]);

    useEffect(() => {
        return () => {
            document.removeEventListener("keydown", keyPress);
        }
    }, [keyPress])
}

export function useDebouncedState(initial, delay) {
    // The pending state to return
    const [queuedState, queueState] = useState(initial);
    // The final state (when the timeout ends)
    const [debouncedState, saveState] = useState(queuedState);
    // Save the timer ID so we can unmount it on unload
    const timerId = useRef();

    useEffect(() => {
        // When the timer ends, save the queued state and return it, otherwise when a new state is queued, cancel the timeout
        timerId.current = setTimeout(() => {
            saveState(queuedState);
        }, delay);

        return () => {
            clearTimeout(timerId.current);
        }
    }, [queuedState, delay])
    // If component is unmounted, clear the timer
    useEffect(() => {
        return () => {clearTimeout(timerId.current)};
    }, [])

    // Appears like useState. The current state value and the function to add to the queue
    return [debouncedState, queueState];
}

export function useStableState(prop) {
    /* Creates a ref that is updated when the prop changes */
    const stableProp = useRef(prop);

    useEffect(() => {
        stableProp.current = prop;
    }, [prop])

    return stableProp
}

export function useDownloadUrl(url) {
    const [blobUrl, setBlobUrl] = useState();
    function download(e) {
        if (!url || blobUrl) {return}
        e.preventDefault();

        mediaToBlob(url)
        .then((blob) => { 
            setBlobUrl(blob)

            e.target.closest("a").click();
        })

    }
    
    useEffect(() => {
        return () => {
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
            }
        }
    }, [blobUrl])

    return [blobUrl, download];
}


export function useScrollPaginate(element, loadSize) {
    const [loaded, setLoaded] = useState(loadSize);
    const stableLoadSize = useStableState(loadSize);
    
    useEffect(() => {
        setLoaded(stableLoadSize.current);
    }, [stableLoadSize])

    useEffect(() => {
        if (!element) {return}

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                setLoaded(loaded => loaded + stableLoadSize.current);
            }
        })

        observer.observe(element);

        return () => {
            observer.disconnect();
        }
    }, [element, stableLoadSize])

    return loaded;
}

export function useDrag(mouseMoveFunc) {
    /* Fires mouseMoveFunc while the mouse being dragged */
    
    const [dragging, setDragging] = useState(false);

    const mouseDown = useCallback((e) => {
        e.preventDefault();  // Prevent text selection
        setDragging(true);
        mouseMoveFunc(e);  // Fire once in case clicked and no mouse movement
    }, [mouseMoveFunc])


    const mouseUp = useCallback(() => {
        setDragging(false);
    }, [setDragging])

    useEffect(() => {
        if (dragging) {
            document.addEventListener("mousemove", mouseMoveFunc);
            document.addEventListener("mouseup", mouseUp);
        }
        else {
            document.removeEventListener("mousemove", mouseMoveFunc);
            document.removeEventListener("mouseup", mouseUp);
        }
    }, [dragging, mouseMoveFunc, mouseUp])

    useEffect(() => {
        return () => {
            document.removeEventListener("mousemove", mouseMoveFunc);
            document.removeEventListener("mouseup", mouseUp);
        }
    }, [mouseMoveFunc, mouseUp])

    return mouseDown
}
