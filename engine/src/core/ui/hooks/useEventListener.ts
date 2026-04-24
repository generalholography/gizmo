import { useEffect, useState } from "react";
import { IEventEmitter } from "../../../utils/eventEmitter";


export default function useEventListener<T>(
    emitter: IEventEmitter<T>,
    eventKey: string
): T | undefined {
    const [value, setValue] = useState<T>();

    useEffect(() => {
        const listener = (data: T) => {
            setValue(typeof data === 'object' ? { ...data } : data);
        };
        emitter.on(eventKey, listener);

        return () => {
            emitter.off(eventKey, listener);
        };
    }, [emitter, eventKey]);

    return value;
}