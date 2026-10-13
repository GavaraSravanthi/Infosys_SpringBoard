import React, { useState, useEffect, useRef } from 'react';
import { aiApi, type AttendanceInsightsData, type WorkforceForecastData } from '../../api/ai';
import { useAuth } from '../../context/AuthContext';
import {
  Sparkles,
  ArrowUp,
  AlertCircle,
  TrendingUp,
  BrainCircuit,
  RotateCcw,
  Copy,
  Check,
  Bot,
  User as UserIcon,
  Calendar,
  Users,
  Clock,
  Award,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  confidence?: number;
  suggestions?: string[];
  data?: any;
  isThinking?: boolean;
  isError?: boolean;
}

export const AIAssistantPage: React.FC = () => {
  const { role, user, employee } = useAuth();

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Automated Insights
  const [insights, setInsights] = useState<AttendanceInsightsData | null>(null);
  const [forecast, setForecast] = useState<WorkforceForecastData | null>(null);
  const [activeTab, setActiveTab] = useState<'assistant' | 'insights' | 'forecast'>('assistant');

  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (role !== 'EMPLOYEE') {
      aiApi.getAttendanceInsights().then(setInsights).catch(() => {});
      aiApi.getWorkforceForecast().then(setForecast).catch(() => {});
    }
  }, [role]);

  // Smooth scroll to bottom strictly within the chat container
  useEffect(() => {
    if (activeTab === 'assistant' && chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTo({
        top: chatScrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, loading, activeTab]);

  const handleAsk = async (questionText?: string) => {
    const q = (questionText || query).trim();
    if (!q || loading) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `assistant-${Date.now() + 1}`;

    const userMessage: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: q,
      timestamp: timeStr,
    };

    const thinkingMessage: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: timeStr,
      isThinking: true,
    };

    // Append user question and thinking assistant bubble to bottom of thread
    setMessages((prev) => [...prev, userMessage, thinkingMessage]);
    setQuery('');
    setLoading(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const res = await aiApi.askAssistant(q);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                content: res.answer,
                confidence: res.confidence,
                suggestions: res.suggestions,
                data: res.data,
                isThinking: false,
              }
            : msg
        )
      );
    } catch (err: any) {
      console.error('AI Query failed:', err);
      const errMsg =
        err.response?.data?.detail ||
        'Unable to process inquiry. Please check query syntax or access permissions.';
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                content: errMsg,
                isThinking: false,
                isError: true,
              }
            : msg
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setQuery('');
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const starterCards =
    role === 'HR'
      ? [
          {
            icon: Users,
            title: 'Department Headcount',
            desc: 'Breakdown of active employees by department',
            prompt: 'How many employees are in each department?',
          },
          {
            icon: Calendar,
            title: 'On-Leave Status',
            desc: 'Check employee absences and approved leaves today',
            prompt: 'How many employees are on leave today?',
          },
          {
            icon: Clock,
            title: 'Overtime Analysis',
            desc: 'Identify departments with elevated overtime hours',
            prompt: 'Which department has the highest overtime?',
          },
          {
            icon: Award,
            title: 'Attendance Benchmark',
            desc: 'Overall attendance and punch-in completion rate',
            prompt: 'What is the overall attendance rate this month?',
          },
        ]
      : role === 'MANAGER'
      ? [
          {
            icon: Users,
            title: 'Team Headcount',
            desc: 'Total active direct reports under your management',
            prompt: 'How many direct reports are in my team?',
          },
          {
            icon: Calendar,
            title: 'Team Absences',
            desc: 'Direct reports with approved leave requests today',
            prompt: 'Who is on leave in my team today?',
          },
          {
            icon: Award,
            title: 'Team Performance',
            desc: 'Average evaluation score across your direct reports',
            prompt: 'What is my team average performance score?',
          },
          {
            icon: Clock,
            title: 'Pending Approvals',
            desc: 'Leave requests awaiting manager authorization',
            prompt: 'How many pending leave requests do I have?',
          },
        ]
      : [
          {
            icon: Calendar,
            title: 'My Leave Balance',
            desc: 'Remaining annual, sick, and casual leave quotas',
            prompt: 'What is my remaining leave balance?',
          },
          {
            icon: Clock,
            title: 'Yesterday Working Hours',
            desc: 'Recorded check-in, check-out, and total hours',
            prompt: 'What was my working hours yesterday?',
          },
          {
            icon: Award,
            title: 'My Shift Schedule',
            desc: 'Current assigned shift timing and requirements',
            prompt: 'What is my assigned shift schedule?',
          },
          {
            icon: Users,
            title: 'Leave Approval Status',
            desc: 'Status of your recent pending leave submissions',
            prompt: 'Are there any pending leave approvals for me?',
          },
        ];

  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-1.5">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <div key={idx} className="h-1" />;
          }
          if (trimmed.startsWith('• ') || trimmed.startsWith('- ')) {
            return (
              <div key={idx} className="flex items-start gap-2 pl-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] mt-2 shrink-0" />
                <span className="text-sm text-[#1E293B] leading-relaxed font-normal">
                  {trimmed.replace(/^[•\-]\s*/, '')}
                </span>
              </div>
            );
          }
          return (
            <p key={idx} className="text-sm text-[#1E293B] leading-relaxed font-normal">
              {line}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] md:h-[calc(100vh-9.5rem)] min-h-[520px] bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
      {/* ChatGPT-style Header Bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#E2E8F0] bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#10A37F] to-[#2563EB] flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#172033] tracking-tight">
                Workforce Intelligence
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                MongoDB Live RAG
              </span>
            </div>
            <p className="text-[11px] text-[#64748B]">
              Natural language workforce assistant &bull; {role} Scope
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {role !== 'EMPLOYEE' && (
            <div className="flex bg-[#F1F5F9] p-1 rounded-xl text-xs font-semibold border border-[#E2E8F0]">
              <button
                onClick={() => setActiveTab('assistant')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer font-medium ${
                  activeTab === 'assistant'
                    ? 'bg-white text-[#2563EB] shadow-xs font-semibold'
                    : 'text-[#64748B] hover:text-[#172033]'
                }`}
              >
                Assistant
              </button>
              <button
                onClick={() => setActiveTab('insights')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer font-medium ${
                  activeTab === 'insights'
                    ? 'bg-white text-[#2563EB] shadow-xs font-semibold'
                    : 'text-[#64748B] hover:text-[#172033]'
                }`}
              >
                Insights
              </button>
              <button
                onClick={() => setActiveTab('forecast')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer font-medium ${
                  activeTab === 'forecast'
                    ? 'bg-white text-[#2563EB] shadow-xs font-semibold'
                    : 'text-[#64748B] hover:text-[#172033]'
                }`}
              >
                Forecast
              </button>
            </div>
          )}

          {activeTab === 'assistant' && (
            <button
              onClick={handleNewChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#475569] hover:text-[#172033] text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
              title="Start a new chat session"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Chat</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: CHATGPT-STYLE CONVERSATIONAL STREAM */}
      {activeTab === 'assistant' && (
        <div className="flex-1 flex flex-col min-h-0 relative bg-white">
          {/* Scrollable Conversation Feed */}
          <div
            ref={chatScrollContainerRef}
            className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-12 py-6 space-y-6"
          >
            {messages.length === 0 ? (
              /* ChatGPT Empty State Landing */
              <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto py-8 text-center animate-in fade-in duration-300">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#10A37F] via-[#0284C7] to-[#2563EB] flex items-center justify-center text-white shadow-md shadow-blue-500/10 mb-4">
                  <Bot className="w-7 h-7" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-[#172033] tracking-tight">
                  How can I help with workforce data today?
                </h3>
                <p className="text-xs sm:text-sm text-[#64748B] mt-1.5 max-w-md">
                  Ask natural language questions about workforce headcount, leave approvals,
                  attendance records, or team metrics.
                </p>

                {/* 2x2 Starter Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 w-full text-left">
                  {starterCards.map((card, idx) => {
                    const CardIcon = card.icon;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAsk(card.prompt)}
                        className="group p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]/80 hover:bg-white hover:border-[#BFDBFE] hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between text-left"
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="p-1.5 rounded-lg bg-blue-50 text-[#2563EB] group-hover:bg-[#2563EB] group-hover:text-white transition-colors">
                            <CardIcon className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs font-semibold text-[#172033] group-hover:text-[#2563EB] transition-colors">
                            {card.title}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#64748B] line-clamp-2">
                          "{card.prompt}"
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Chronological Message Stream: Q1 -> A1 -> Q2 -> A2 -> ... */
              <div className="max-w-3xl mx-auto space-y-6">
                {messages.map((msg) => {
                  if (msg.role === 'user') {
                    return (
                      <div
                        key={msg.id}
                        className="flex items-start justify-end gap-2.5 animate-in fade-in duration-150"
                      >
                        <div className="flex flex-col items-end max-w-[85%] sm:max-w-[75%]">
                          <div className="bg-[#F1F5F9] text-[#172033] px-4 py-2.5 rounded-2xl rounded-tr-xs border border-[#E2E8F0] shadow-2xs">
                            <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">
                              {msg.content}
                            </p>
                          </div>
                          <span className="text-[10px] text-[#94A3B8] mt-1 mr-1">
                            {msg.timestamp}
                          </span>
                        </div>
                        <div className="w-7 h-7 rounded-full bg-[#1E293B] text-white flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">
                          {employee?.first_name?.[0] ||
                            user?.email?.[0]?.toUpperCase() || (
                              <UserIcon className="w-3.5 h-3.5" />
                            )}
                        </div>
                      </div>
                    );
                  }

                  // Assistant Response (rendered below user message)
                  return (
                    <div
                      key={msg.id}
                      className="flex items-start gap-3 animate-in fade-in duration-200"
                    >
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#10A37F] to-[#2563EB] text-white flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5 shadow-xs">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        {msg.isThinking ? (
                          /* ChatGPT Thinking Animation */
                          <div className="flex items-center gap-2 py-2 px-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl w-fit">
                            <div className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-bounce [animation-delay:-0.3s]" />
                              <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-bounce [animation-delay:-0.15s]" />
                              <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-bounce" />
                            </div>
                            <span className="text-xs text-[#64748B] font-medium ml-1">
                              Querying MongoDB records...
                            </span>
                          </div>
                        ) : msg.isError ? (
                          /* Error Notification */
                          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-[#DC2626] text-xs flex items-center gap-2.5 font-medium">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{msg.content}</span>
                          </div>
                        ) : (
                          /* Assistant Answer Body */
                          <div className="space-y-3">
                            <div className="text-sm text-[#1E293B] leading-relaxed">
                              {renderFormattedText(msg.content)}
                            </div>

                            {/* Response Metadata & Action Bar */}
                            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-[#64748B]">
                              {msg.confidence !== undefined && (
                                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  {Math.round(msg.confidence * 100)}% confidence
                                </span>
                              )}

                              <button
                                onClick={() => handleCopy(msg.id, msg.content)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#172033] transition-colors cursor-pointer"
                                title="Copy response"
                              >
                                {copiedId === msg.id ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span className="text-emerald-600 font-medium">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {/* ChatGPT-style Interactive Follow-up Suggestions */}
                            {msg.suggestions && msg.suggestions.length > 0 && (
                              <div className="pt-2 border-t border-[#F1F5F9]">
                                <span className="text-[11px] font-semibold text-[#64748B] block mb-1.5">
                                  Follow-up suggestions:
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {msg.suggestions.map((suggestion, sIdx) => (
                                    <button
                                      key={sIdx}
                                      type="button"
                                      disabled={loading}
                                      onClick={() => handleAsk(suggestion)}
                                      className="text-xs px-3 py-1.5 rounded-full bg-[#F8FAFC] hover:bg-[#EFF6FF] hover:border-[#BFDBFE] hover:text-[#2563EB] text-[#334155] border border-[#E2E8F0] font-medium transition-colors cursor-pointer text-left disabled:opacity-50"
                                    >
                                      {suggestion}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ChatGPT-style Bottom Pinned Input Bar */}
          <div className="p-4 sm:p-5 bg-gradient-to-t from-white via-white to-white/95 border-t border-[#E2E8F0] shrink-0">
            <div className="max-w-3xl mx-auto w-full">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAsk();
                }}
                className="relative flex items-center bg-[#F8FAFC] hover:bg-[#F1F5F9] focus-within:bg-white border border-[#CBD5E1] focus-within:border-[#2563EB] focus-within:ring-2 focus-within:ring-[#2563EB]/20 rounded-2xl sm:rounded-3xl p-1.5 pl-4 sm:pl-5 shadow-xs transition-all"
              >
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAsk();
                    }
                  }}
                  placeholder="Ask Workforce Assistant anything..."
                  className="flex-1 bg-transparent resize-none border-0 outline-none text-xs sm:text-sm text-[#172033] placeholder-[#94A3B8] max-h-28 py-1.5 leading-relaxed"
                />

                <button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className={`p-2 rounded-full transition-all shrink-0 cursor-pointer flex items-center justify-center ${
                    query.trim() && !loading
                      ? 'bg-[#172033] hover:bg-[#2563EB] text-white shadow-xs'
                      : 'bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed opacity-60'
                  }`}
                  title="Send question (Enter)"
                >
                  <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                </button>
              </form>

              <p className="text-[11px] text-[#94A3B8] text-center mt-2 font-normal">
                Workforce AI Assistant queries live MongoDB records with {role} access boundaries.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ATTENDANCE INSIGHTS */}
      {activeTab === 'insights' && (
        <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
            <BrainCircuit className="w-5 h-5 text-[#2563EB]" />
            <div>
              <h3 className="text-sm font-bold text-[#172033]">Automated Attendance Insights</h3>
              <p className="text-[11px] text-[#64748B] font-medium">
                Generated dynamically from current workforce logs and statistical anomalies
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {!insights?.insights || insights.insights.length === 0 ? (
              <p className="text-xs text-[#64748B] py-6 text-center font-medium">
                All attendance patterns are within nominal benchmarks. No urgent alerts detected.
              </p>
            ) : (
              insights.insights.map((ins, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-xl border ${
                    ins.level === 'alert'
                      ? 'bg-red-50/50 border-red-200'
                      : ins.level === 'warning'
                      ? 'bg-amber-50/50 border-amber-200'
                      : 'bg-blue-50/50 border-blue-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-[#64748B]">
                      {ins.category}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        ins.level === 'alert'
                          ? 'bg-[#DC2626] text-white'
                          : ins.level === 'warning'
                          ? 'bg-[#D97706] text-white'
                          : 'bg-[#2563EB] text-white'
                      }`}
                    >
                      {ins.level}
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-[#172033] mt-1.5">{ins.headline}</h4>
                  <p className="text-xs text-[#64748B] mt-1 font-medium">{ins.details}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: WORKFORCE FORECAST */}
      {activeTab === 'forecast' && (
        <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-6">
          <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
            <TrendingUp className="w-5 h-5 text-[#2563EB]" />
            <div>
              <h3 className="text-sm font-bold text-[#172033]">Workforce Headcount Forecasting</h3>
              <p className="text-[11px] text-[#64748B] font-medium">
                Time-series historical velocity and projected headcount growth for next 6 months
              </p>
            </div>
          </div>

          {forecast && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                  <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Projected Attrition Rate
                  </span>
                  <p className="text-2xl font-bold text-[#D97706] mt-1">
                    {(forecast.projected_attrition_rate * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                  <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Forecast Horizon
                  </span>
                  <p className="text-2xl font-bold text-[#2563EB] mt-1">6 Months</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-[#172033] mb-3">Projected Growth Velocity</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={forecast.forecast_next_6_months || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748B' }} stroke="#CBD5E1" />
                      <YAxis tick={{ fontSize: 10, fill: '#64748B' }} stroke="#CBD5E1" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          borderColor: '#E2E8F0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          fontSize: '12px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="projected_headcount"
                        stroke="#2563EB"
                        strokeWidth={2.5}
                        dot={{ fill: '#2563EB', r: 4 }}
                        activeDot={{ r: 6 }}
                        name="Projected Headcount"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

