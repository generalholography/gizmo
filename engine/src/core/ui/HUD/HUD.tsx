import Crosshair from "../../../../public/point.svg";
import { ActiveQuestsChecklist } from "../stats/ActiveQuestsChecklist";
import Hotbar from "./Hotbar";
import HealthBar from "./HealthBar";
import HeldItemName from "./HeldItemName";
import LookAtInfoText from "./LookAtInfoText";


export default () => {
    return (
        <>
            <div style={{
                position: 'absolute',
                top: 24,
                left: 24,
                zIndex: 10,
                pointerEvents: 'none'
            }}>
                <ActiveQuestsChecklist />
            </div>
            <div
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 0,
                    pointerEvents: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}
            >
                <img src={Crosshair} alt="crosshair" style={{ position: 'relative' }} width={12} height={12} />
                <div style={{
                    position: "absolute",
                    top: "12px",
                }}>
                    <LookAtInfoText />
                </div>
            </div>
            <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 4, pointerEvents: 'none', flexDirection: 'column', width: '100%', justifyContent: 'center', alignItems: 'center' }}>
                <HeldItemName />
                <HealthBar />
                <Hotbar />
            </div>
        </>
    );
};