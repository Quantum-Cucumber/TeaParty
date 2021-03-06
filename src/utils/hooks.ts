import React, { useState, useEffect, useRef, useCallback } from "react";
import { mediaToBlob } from "./utils";

export function useOnKeypress<T>(key: string, setState: (value?: T) => void, value?: T, bind=true) {
    const keyPress = useCallback((e: KeyboardEvent) => {
        if (e.key === key) {
            setState(value);
        }
    }, [setState, value, key])

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

export function useDebouncedState<T>(initial: T, delay: number): [T, React.Dispatch<React.SetStateAction<T>>] {
    // The pending state to return
    const [queuedState, queueState] = useState(initial);
    // The final state (when the timeout ends)
    const [debouncedState, saveState] = useState(queuedState);
    // Save the timer ID so we can unmount it on unload
    const timerId = useRef<number>();

    useEffect(() => {
        // When the timer ends, save the queued state and return it, otherwise when a new state is queued, cancel the timeout
        timerId.current = setTimeout(() => {
            saveState(queuedState);
        }, delay) as unknown as number;

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

export function useStableState<T>(prop: T) {
    /* Creates a ref that is updated when the prop changes */
    const stableProp = useRef(prop);

    useEffect(() => {
        stableProp.current = prop;
    }, [prop])

    return stableProp
}


export function useDownloadUrl(url: string): [string, (e: React.MouseEvent) => void] {
    const [blobUrl, setBlobUrl] = useState<string>("");
    function download(e: any) {
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


export function useOnElementVisible(element: HTMLElement, callback: () => void) {
    useEffect(() => {
        if (!element) {return}

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                callback();
            }
        })

        observer.observe(element);
        return () => {
            observer.disconnect();
        }
    }, [element, callback])
}

export function useScrollPaginate(element: HTMLElement, loadSize: number) {
    const [loaded, setLoaded] = useState(loadSize);
    const stableLoadSize = useStableState(loadSize);
    
    useEffect(() => {
        setLoaded(stableLoadSize.current);
    }, [stableLoadSize])

    useOnElementVisible(element, () => setLoaded(loaded => loaded + stableLoadSize.current));

    return loaded;
}

export function useDrag(mouseMoveFunc: (event: MouseEvent) => void) {
    /* Fires mouseMoveFunc while the mouse being dragged */
    
    const [dragging, setDragging] = useState(false);

    const mouseDown = useCallback((e: MouseEvent) => {
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

export function useCatchState<T>(value: (() => T) | T, tryFunc: (newState: T, tryValue?: any) => Promise<void>, catchFunc?: (e: unknown) => void): 
                                [T, (newState: T, tryValue?: any, setRaw?: boolean) => Promise<void>] {
    /* A modified useState that tries tryFunc and reverts the value on error */
    const [state, setState] = useState(value);

    const dispatch = useCallback(async (newState: T, tryValue?: any, setRaw = false) => {
        setState(newState);
        if (!setRaw) {
            try {
                await tryFunc(newState, tryValue)
            }
            catch (e) {
                console.warn(e)
                setState(value);
                catchFunc?.(e);
            }
        }
    }, [tryFunc, value, catchFunc]);

    return [state, dispatch];
}
