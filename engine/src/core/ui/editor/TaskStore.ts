export type EditorTaskCommand = {
  name: string;
  params?: Record<string, any> | null;
};

export type EditorTaskToolCall = {
  name: string;
};

export type EditorTaskMessage = {
  role: string;
  content: unknown;
  toolCalls?: EditorTaskToolCall[];
};

export type EditorTaskItem = {
  id: string;
  status?: string;
  prompt?: string;
  error?: string | null;
  updatedAt?: number | null;
  createdAt?: number | null;
  completedAt?: number | null;
  turn?: number | null;
  agentMode?: boolean;
  terminated?: boolean;
  terminateMessage?: string | null;
  commands?: EditorTaskCommand[];
  conversationHistory?: EditorTaskMessage[];
};

export type EditorTaskSnapshot = {
  tasks: EditorTaskItem[];
  selectedTaskId: string | null;
  selectedTask: EditorTaskItem | null;
  focusTaskId: string | null;
};

export interface EditorTaskStore {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => EditorTaskSnapshot;
  selectTask: (taskId: string | null) => void;
  requestFocus: (taskId: string | null) => void;
  acknowledgeFocus: () => void;
}
