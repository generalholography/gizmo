import React, { useMemo } from 'react';
import { Button, Empty, Spin, Tag, Typography } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { useSyncExternalStore } from 'react';
import { useEditor } from './EditorContext';
import type { EditorTaskItem, EditorTaskMessage } from './TaskStore';
import { EDITOR_COLORS, EDITOR_RADIUS, EDITOR_SPACING, EDITOR_TYPOGRAPHY } from './styles/tokens';

const { Text } = Typography;

const EMPTY_SNAPSHOT = {
  tasks: [],
  selectedTaskId: null,
  selectedTask: null,
  focusTaskId: null,
};

const fallbackSubscribe = () => () => undefined;

const THINKING_STATUSES = new Set(['pending', 'running', 'queued']);

function isTaskThinking(task?: EditorTaskItem | null) {
  if (!task) return false;
  const status = task.status?.toLowerCase();
  if (status && THINKING_STATUSES.has(status)) return true;
  if (task.agentMode && task.terminated !== true) return true;
  return false;
}

function formatTimestamp(value?: number | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function truncateText(value: string, maxLength = 140): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}

function summarizeContent(content: unknown): string | null {
  if (typeof content === 'string') {
    const trimmed = content.trim();
    return trimmed || null;
  }
  if (Array.isArray(content)) {
    const parts = content
      .map((part: any) => {
        if (typeof part === 'string') return part;
        if (!part || typeof part !== 'object') return '[content]';
        if (part.type === 'text' && typeof part.text === 'string') return part.text;
        if (part.type === 'image_url') return '[image]';
        return `[${String(part.type || 'content')}]`;
      })
      .map((part) => (typeof part === 'string' ? part.trim() : part))
      .filter((part) => part && part !== '[content]');
    if (parts.length === 0) return null;
    const joined = parts.join(' ').trim();
    return joined || null;
  }
  if (content === null || content === undefined) return null;
  if (typeof content === 'object') {
    return String(content);
  }
  const primitive = String(content).trim();
  return primitive || null;
}

function renderMessage(message: EditorTaskMessage, index: number) {
  const contentSummary = summarizeContent(message.content);
  const toolCalls = message.toolCalls ?? [];
  const showToolCalls = message.role === 'assistant' && toolCalls.length > 0;
  if (!contentSummary && !showToolCalls) return null;

  const messageBody = (
    <>
      {contentSummary && (
        <Text style={{ color: EDITOR_COLORS.textSecondary, fontSize: EDITOR_TYPOGRAPHY.fontSizeSm }}>
          {contentSummary}
        </Text>
      )}
      {showToolCalls && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: EDITOR_SPACING.xs }}>
          {toolCalls.map((tool, toolIndex) => (
            <Tag key={`${tool.name}-${toolIndex}`} color="blue">
              {tool.name}
            </Tag>
          ))}
        </div>
      )}
    </>
  );

  if (message.role === 'user') {
    return (
      <div
        key={`message-${index}`}
        style={{
          padding: `${EDITOR_SPACING.xs}px ${EDITOR_SPACING.sm}px`,
          borderRadius: EDITOR_RADIUS.md,
          border: `1px solid ${EDITOR_COLORS.border}`,
          background: EDITOR_COLORS.panelSecondary,
          display: 'flex',
          flexDirection: 'column',
          gap: EDITOR_SPACING.xs,
        }}
      >
        {messageBody}
      </div>
    );
  }

  return (
    <div
      key={`message-${index}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: EDITOR_SPACING.xs,
        padding: `${EDITOR_SPACING.xs}px ${EDITOR_SPACING.sm}px`,
      }}
    >
      {messageBody}
    </div>
  );
}

function TaskListItem({
  task,
  isActive,
  onSelect,
}: {
  task: EditorTaskItem;
  isActive: boolean;
  onSelect: (taskId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(task.id)}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: `${EDITOR_SPACING.sm}px ${EDITOR_SPACING.md}px`,
        borderRadius: EDITOR_RADIUS.md,
        border: `1px solid ${isActive ? EDITOR_COLORS.primary : EDITOR_COLORS.border}`,
        background: isActive ? 'rgba(24, 144, 255, 0.15)' : EDITOR_COLORS.panelSecondary,
        display: 'flex',
        flexDirection: 'column',
        gap: EDITOR_SPACING.xs,
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: EDITOR_SPACING.sm }}>
        <Text style={{ color: EDITOR_COLORS.textPrimary, fontSize: EDITOR_TYPOGRAPHY.fontSizeMd }}>
          {task.prompt ? truncateText(task.prompt, 52) : 'Untitled task'}
        </Text>
        {task.status && <Tag color="blue">{task.status}</Tag>}
      </div>
      <Text style={{ color: EDITOR_COLORS.textMuted, fontSize: EDITOR_TYPOGRAPHY.fontSizeSm }}>
        Updated {formatTimestamp(task.updatedAt)}
      </Text>
    </button>
  );
}

export function TasksPanel() {
  const { taskStore } = useEditor();
  const snapshot = useSyncExternalStore(
    taskStore?.subscribe ?? fallbackSubscribe,
    taskStore?.getSnapshot ?? (() => EMPTY_SNAPSHOT),
    taskStore?.getSnapshot ?? (() => EMPTY_SNAPSHOT),
  );

  const tasks = snapshot.tasks ?? [];
  const selectedTask = snapshot.selectedTask;
  const activeTaskId = snapshot.selectedTaskId;

  const taskSummary = useMemo(() => {
    if (!selectedTask) return null;
    const messages = (selectedTask.conversationHistory ?? []).filter(
      (message) => message.role !== 'tool' && message.role !== 'function',
    );
    return { messages };
  }, [selectedTask]);

  const isThinking = isTaskThinking(selectedTask);

  if (!taskStore) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Empty description="Sign in to view task history." />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {!selectedTask && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: EDITOR_SPACING.sm }}>
          {tasks.length === 0 ? (
            <Empty description="No tasks yet." />
          ) : (
            tasks.map((task) => (
              <TaskListItem
                key={task.id}
                task={task}
                isActive={task.id === activeTaskId}
                onSelect={(taskId) => taskStore.selectTask(taskId)}
              />
            ))
          )}
        </div>
      )}
      {selectedTask && taskSummary && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: EDITOR_SPACING.md }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: EDITOR_SPACING.sm }}>
            <Button size="small" onClick={() => taskStore.selectTask(null)}>
              Back to list
            </Button>
            <Text style={{ color: EDITOR_COLORS.textPrimary, fontSize: EDITOR_TYPOGRAPHY.fontSizeLg }}>
              Task details
            </Text>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: EDITOR_SPACING.sm }}>
            {taskSummary.messages.length === 0 ? (
              <Text style={{ color: EDITOR_COLORS.textMuted, fontSize: EDITOR_TYPOGRAPHY.fontSizeSm }}>
                No messages yet.
              </Text>
            ) : (
              taskSummary.messages.map((message, index) => renderMessage(message, index))
            )}
            {isThinking && taskSummary.messages.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: EDITOR_SPACING.xs,
                  marginTop: EDITOR_SPACING.xs,
                }}
              >
                <Spin indicator={<LoadingOutlined spin />} size="small" />
                <Text style={{ color: EDITOR_COLORS.textMuted, fontSize: EDITOR_TYPOGRAPHY.fontSizeSm }}>
                  working...
                </Text>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
