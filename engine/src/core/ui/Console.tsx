import React, { useState, useEffect, useRef } from 'react';
import type { ConsoleCommand } from '../..';

export interface ConsoleCommands {
    [key: string]: ConsoleCommand;
}

interface ConsoleProps {
    commands: ConsoleCommands;
    isOpen: boolean;
    onClose: () => void;
}

/**
 * Utility function to extract parameter names from a function.
 * Works with regular functions, async functions, and arrow functions.
 * 
 * @param func - The function to inspect
 * @returns An array of parameter names
 */
function getParamNames(func: ConsoleCommand) {
    const funcString = func.toString();

    // Handle different function formats
    // 1. Regular or async function: function(...) or async function(...)
    // 2. Arrow function: (...) => or param =>
    let paramStr = '';

    if (funcString.includes('(')) {
        // Extract parameters inside parentheses
        const paramMatch = funcString.match(/(?:function|async\s+function)?\s*\w*\s*\(([^)]*)\)/);
        if (paramMatch && paramMatch[1]) {
            paramStr = paramMatch[1];
        } else {
            // Check for arrow function
            const arrowMatch = funcString.match(/\(([^)]*)\)\s*=>/);
            if (arrowMatch && arrowMatch[1]) {
                paramStr = arrowMatch[1];
            } else {
                // Check for single parameter arrow function without parentheses
                const singleParamMatch = funcString.match(/^\s*(\w+)\s*=>/);
                if (singleParamMatch && singleParamMatch[1]) {
                    paramStr = singleParamMatch[1];
                }
            }
        }
    }

    return paramStr
        ? paramStr.split(',').map(param => param.trim()).filter(param => param)
        : [];
}

const Console: React.FC<ConsoleProps> = ({ commands, isOpen, onClose }) => {
    const [command, setCommand] = useState('');
    const [log, setLog] = useState<string[]>([]);
    const [isAsyncCommandPending, setIsAsyncCommandPending] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const logRef = useRef<HTMLDivElement>(null);

    // Focus the input when console opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100); // Small delay to allow animation to start
        }
    }, [isOpen]);

    // Parse input looking for quoted strings
    const parseCommand = (input: string): string[] => {
        const args: string[] = [];
        let currentArg = '';
        let inQuotes = false;

        for (let i = 0; i < input.length; i++) {
            const char = input[i];

            if (char === '"' && (i === 0 || input[i - 1] !== '\\')) {
                inQuotes = !inQuotes;
                continue;
            }

            if (char === ' ' && !inQuotes) {
                if (currentArg) {
                    args.push(currentArg);
                    currentArg = '';
                }
                continue;
            }

            currentArg += char;
        }

        if (currentArg) args.push(currentArg);
        return args;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (command.trim()) {
            // Parse the command
            const trimmed = command.trim();
            // Check if this is a command with the / prefix
            if (trimmed.startsWith('/')) {
                const args = parseCommand(trimmed.slice(1)); // Remove leading slash
                const commandName = args.shift() || ''; // Extract command name

                if (commandName && commands[commandName]) {
                    try {
                        if (commands[commandName].length !== args.length) {
                            // If the number of arguments doesn't match, show usage
                            const paramNames = getParamNames(commands[commandName]);

                            setLog(prev => [...prev, `Usage: /${commandName}` + (paramNames.length > 0 ? ` <${paramNames.join("> <")}>` : '')]);
                        } else {
                            const res = commands[commandName](...args);
                            if (res instanceof Promise) {
                                setIsAsyncCommandPending(true);
                                res.then(result => {
                                    setLog(prev => [...prev, `>>> ${result}`]);
                                    setIsAsyncCommandPending(false);
                                }).catch(error => {
                                    setLog(prev => [...prev, `Error executing /${commandName}: ${error}`]);
                                    setIsAsyncCommandPending(false);
                                });
                            } else {
                                setLog(prev => [...prev, `>>> ${res}`]);
                            }
                        }
                    } catch (error) {
                        setLog(prev => [...prev, `Error executing /${commandName}: ${error}`]);
                    }
                } else {
                    setLog(prev => [...prev, `Unknown command: /${commandName}`]);
                }
            } else {
                // Not a command, handle as regular input if needed
                setLog(prev => [...prev, "Type a command starting with / (e.g. /help)"]);
            }

            setCommand('');

            // Scroll history to bottom after rendering
            setTimeout(() => {
                if (logRef.current) {
                    logRef.current.scrollTop = logRef.current.scrollHeight;
                }
            }, 50);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            style={{
                position: 'absolute',
                bottom: '20px',
                left: '20px',
                right: '20px',
                maxWidth: '800px',
                margin: '0 auto',
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                borderRadius: '8px',
                zIndex: 1000,
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '300px',
                pointerEvents: 'auto',
            }}
        >
            {/* History area */}
            <div
                ref={logRef}
                style={{
                    overflowY: 'auto',
                    maxHeight: '200px',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    color: '#888',
                    scrollBehavior: 'smooth'
                }}
            >
                {log.map((cmd, index) => (
                    <div key={index} style={{ padding: '2px 0' }}>
                        <span style={{ color: '#666', marginRight: '8px' }}>{'>'}</span>
                        {cmd}
                    </div>
                ))}
            </div>

            {/* Input area */}
            <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ color: '#aaa', marginRight: '8px' }}>{'>'}</span>
                    {isAsyncCommandPending ? (
                        <div style={{ flex: 1, color: '#ccc', fontFamily: 'monospace' }}>Processing...</div>
                    ) : (
                        <input
                            ref={inputRef}
                            value={command}
                            onChange={(e) => setCommand(e.target.value)}
                            disabled={isAsyncCommandPending}
                            style={{
                                flex: 1,
                                background: 'transparent',
                                border: 'none',
                                color: '#ccc',
                                fontSize: '16px',
                                fontFamily: 'monospace',
                                outline: 'none',
                                opacity: isAsyncCommandPending ? 0.5 : 1,
                            }}
                            placeholder="Enter command..."
                        />
                    )}
                </div>
            </form>
        </div>
    );
};

export default Console;
