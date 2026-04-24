import React from "react";
import { Button, Typography } from "antd";

type TextModalProps = {
    text: string;
    onClose: () => void;
};

const TextModal: React.FC<TextModalProps> = ({ text, onClose }) => {
    return (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "calc(var(--vh, 1vh) * 100)", zIndex: 100 }}>
            <div
                style={{
                    pointerEvents: 'auto',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: -1,
                }}
                onClick={onClose}
            >
                <div
                    style={{
                        background: 'rgba(20, 20, 20, 0.95)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        padding: '24px',
                        maxWidth: '500px',
                        minWidth: '300px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.6)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <Typography.Text style={{ fontSize: '16px', lineHeight: '1.5', color: '#ffffff', whiteSpace: 'pre-line' }}>
                        {text}
                    </Typography.Text>
                    <Button
                        type="primary"
                        onClick={onClose}
                        style={{ alignSelf: 'flex-end' }}
                    >
                        OK
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default TextModal;