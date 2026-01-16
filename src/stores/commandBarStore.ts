import { create } from 'zustand';
import { AgentExecutor } from '../services/agent';
import type { AgentExecutionState, ConfirmationRequest, AIMessageWithTools } from '../types/agent';
import type { PreviewJob } from '../components/JobFinder';
import type { AppSettings } from '../types';

/** Search result from agent's find_external_jobs tool */
export interface AgentSearchResult extends PreviewJob {
  matchExplanation?: string;
}

interface ToolCallEntry {
  id: string;
  name: string;
  status: 'pending' | 'executing' | 'complete' | 'error' | 'declined';
  result?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

type CommandBarState = 'empty' | 'typing' | 'processing' | 'confirming' | 'complete' | 'error';

interface CommandBarStore {
  // State
  isOpen: boolean;
  state: CommandBarState;
  inputValue: string;
  toolCalls: ToolCallEntry[];
  response: string | null;
  error: string | null;
  agentState: AgentExecutionState | null;
  pendingConfirmation: ConfirmationRequest | null;

  // Conversation history
  chatHistory: ChatMessage[];
  agentMessages: AIMessageWithTools[];

  // Search results from agent (for preview links)
  searchResults: AgentSearchResult[];

  // Internal promise resolvers for confirmation
  confirmationResolver: ((confirmed: boolean) => void) | null;

  // Actions
  open: () => void;
  close: () => void;
  reset: () => void;
  clearHistory: () => void;
  setInput: (value: string) => void;
  submit: () => Promise<void>;
  confirmAction: () => void;
  cancelAction: () => void;
  setSearchResults: (results: AgentSearchResult[]) => void;
  initializeFromSettings: (settings: AppSettings) => void;
}

export const useCommandBarStore = create<CommandBarStore>((set, get) => ({
  // Initial state
  isOpen: false,
  state: 'empty',
  inputValue: '',
  toolCalls: [],
  response: null,
  error: null,
  agentState: null,
  pendingConfirmation: null,
  chatHistory: [],
  agentMessages: [],
  searchResults: [],
  confirmationResolver: null,

  open: () => set({ isOpen: true, state: get().chatHistory.length > 0 ? 'complete' : 'empty' }),

  close: () => {
    const { confirmationResolver } = get();
    // If waiting for confirmation, treat close as cancel
    if (confirmationResolver) {
      confirmationResolver(false);
    }
    // Keep conversation history when closing, only reset transient state
    set({
      isOpen: false,
      state: 'empty',
      inputValue: '',
      toolCalls: [],
      error: null,
      agentState: null,
      pendingConfirmation: null,
      confirmationResolver: null,
    });
  },

  reset: () => set({
    state: 'empty',
    inputValue: '',
    toolCalls: [],
    response: null,
    error: null,
    agentState: null,
    pendingConfirmation: null,
    confirmationResolver: null,
    // Keep chatHistory and agentMessages for continuing conversation
  }),

  clearHistory: () => {
    set({
      state: 'empty',
      inputValue: '',
      toolCalls: [],
      response: null,
      error: null,
      agentState: null,
      pendingConfirmation: null,
      confirmationResolver: null,
      chatHistory: [],
      agentMessages: [],
    });
    // Persist cleared state
    saveAgentChatToSettings();
  },

  setInput: (value: string) => {
    const { chatHistory } = get();
    set({
      inputValue: value,
      state: value.trim() ? 'typing' : (chatHistory.length > 0 ? 'complete' : 'empty'),
    });
  },

  submit: async () => {
    const { inputValue, agentMessages, chatHistory } = get();
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();

    // Add user message to chat history immediately
    set({
      state: 'processing',
      toolCalls: [],
      response: null,
      error: null,
      inputValue: '',
      chatHistory: [...chatHistory, { role: 'user' as const, content: userMessage }],
    });

    const executor = new AgentExecutor({
      initialMessages: agentMessages,
      onStateChange: (agentState) => {
        set({ agentState });

        // Track tool calls
        if (agentState.currentTool && agentState.status === 'executing_tool') {
          set((state) => {
            const existingCall = state.toolCalls.find(
              (tc) => tc.name === agentState.currentTool && tc.status === 'pending'
            );
            if (existingCall) {
              return {
                toolCalls: state.toolCalls.map((tc) =>
                  tc.name === agentState.currentTool && tc.status === 'pending'
                    ? { ...tc, status: 'executing' as const }
                    : tc
                ),
              };
            }
            return {
              toolCalls: [
                ...state.toolCalls,
                { id: Date.now().toString(), name: agentState.currentTool!, status: 'executing' as const },
              ],
            };
          });
        }

        // Mark completed tools
        if (agentState.toolsExecuted.length > 0) {
          set((state) => ({
            toolCalls: state.toolCalls.map((tc) =>
              agentState.toolsExecuted.includes(tc.name) && tc.status === 'executing'
                ? { ...tc, status: 'complete' as const }
                : tc
            ),
          }));
        }
      },

      onConfirmationRequest: async (request) => {
        return new Promise<boolean>((resolve) => {
          set({
            state: 'confirming',
            pendingConfirmation: request,
            confirmationResolver: resolve,
          });
        });
      },
    });

    try {
      const response = await executor.run(userMessage);

      // Get updated messages for conversation continuity
      const newAgentMessages = executor.getMessages();

      set((state) => ({
        state: 'complete',
        response,
        pendingConfirmation: null,
        confirmationResolver: null,
        agentMessages: newAgentMessages,
        chatHistory: [...state.chatHistory, { role: 'assistant' as const, content: response }],
      }));

      // Persist chat to settings
      saveAgentChatToSettings();
    } catch (error) {
      set({
        state: 'error',
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        pendingConfirmation: null,
        confirmationResolver: null,
      });
    }
  },

  confirmAction: () => {
    const { confirmationResolver, pendingConfirmation } = get();
    if (confirmationResolver) {
      // Mark the tool as executing
      if (pendingConfirmation) {
        set((state) => ({
          toolCalls: state.toolCalls.map((tc) =>
            tc.name === pendingConfirmation.toolName && tc.status === 'pending'
              ? { ...tc, status: 'executing' as const }
              : tc
          ),
        }));
      }
      confirmationResolver(true);
      set({
        state: 'processing',
        pendingConfirmation: null,
        confirmationResolver: null,
      });
    }
  },

  cancelAction: () => {
    const { confirmationResolver, pendingConfirmation } = get();
    if (confirmationResolver) {
      // Mark the tool as declined
      if (pendingConfirmation) {
        set((state) => ({
          toolCalls: state.toolCalls.map((tc) =>
            tc.name === pendingConfirmation.toolName && tc.status === 'pending'
              ? { ...tc, status: 'declined' as const }
              : tc
          ),
        }));
      }
      confirmationResolver(false);
      set({
        state: 'processing',
        pendingConfirmation: null,
        confirmationResolver: null,
      });
    }
  },

  setSearchResults: (results) => set({ searchResults: results }),

  initializeFromSettings: (settings) => {
    if (settings.agentChatHistory || settings.agentMessages) {
      set({
        chatHistory: settings.agentChatHistory || [],
        agentMessages: settings.agentMessages || [],
        state: settings.agentChatHistory?.length ? 'complete' : 'empty',
      });
    }
  },
}));

// Helper to persist agent chat to settings
const saveAgentChatToSettings = async () => {
  const { chatHistory, agentMessages } = useCommandBarStore.getState();
  // Dynamic import to avoid circular dependency
  const { useAppStore } = await import('./appStore');
  const { updateSettings } = useAppStore.getState();
  await updateSettings({
    agentChatHistory: chatHistory,
    agentMessages: agentMessages,
  });
};

// Export for use in store actions
export { saveAgentChatToSettings };
