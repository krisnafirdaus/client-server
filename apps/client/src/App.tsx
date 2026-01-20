import { useState, useRef, useEffect } from 'react';
import {
  useQuery,
  useMutation,
  useSubscription,
  gql,
  ApolloClient,
} from '@apollo/client';

const GET_MESSAGES = gql`
  query GetMessages($roomId: String!) {
    messages(roomId: $roomId) {
      id
      content
      senderId
      createdAt
    }
  }
`;

const SEND_MESSAGE = gql`
  mutation SendMessage($input: SendMessageInput!) {
    sendMessage(input: $input)
  }
`;

const ON_MESSAGE_SENT = gql`
  subscription OnMessageSent($roomId: String!) {
    messageSent(roomId: $roomId) {
      id
      content
      senderId
      createdAt
    }
  }
`;

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
}

interface GetMessagesData {
  messages: Message[];
}

interface OnMessageSentData {
  messageSent: Message;
}

// Use fixed user ID that exists in database
const generateUserId = () => 'user-1';

function App() {
  const roomId = 'room-1';
  const [senderId] = useState(generateUserId);
  const [content, setContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data, loading, error } = useQuery<GetMessagesData>(GET_MESSAGES, {
    variables: { roomId },
    fetchPolicy: 'cache-and-network',
  });
  const [sendMessage, { loading: sending }] = useMutation(SEND_MESSAGE);

  useSubscription(ON_MESSAGE_SENT, {
    variables: { roomId },
    onData: ({ client, data }: { client: ApolloClient<unknown>; data: { data?: OnMessageSentData } }) => {
      const subscriptionData = data.data;
      if (!subscriptionData) return;

      const newMessage = subscriptionData.messageSent;

      client.cache.modify({
        fields: {
          messages(existingMessages = []) {
            const newMsgRef = client.cache.writeFragment({
              data: newMessage,
              fragment: gql`
                fragment NewMessage on Message {
                  id
                  content
                  senderId
                  createdAt
                }
              `,
            });
            return [...existingMessages, newMsgRef];
          },
        },
      });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.messages]);

  const handleSend = () => {
    if (!content.trim() || sending) return;
    sendMessage({
      variables: {
        input: {
          roomId,
          senderId,
          content,
          idempotencyKey: crypto.randomUUID(),
        },
      },
    })
      .then(() => setContent(''))
      .catch(() => {});
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const getInitials = (id: string) => {
    return id.substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Memuat percakapan...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Koneksi Gagal</h2>
          <p className="text-slate-500 mb-4">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-emerald-500 text-white px-6 py-2 rounded-lg hover:bg-emerald-600 transition-colors font-medium"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100 flex overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col h-full shrink-0">
        {/* Logo Header */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-slate-800">Healthcare CRM</h1>
              <p className="text-xs text-slate-400">Sistem Komunikasi</p>
            </div>
          </div>
        </div>

        {/* User Profile */}
        <div className="p-4 border-b border-slate-100">
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white font-bold">
                {getInitials(senderId)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 truncate">{senderId}</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                  <span className="text-xs text-emerald-600">Online</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Room Info */}
        <div className="flex-1 p-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Ruang Chat Aktif</h3>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-slate-800">{roomId}</p>
                <p className="text-xs text-slate-500">{data?.messages?.length || 0} pesan</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100">
          <p className="text-xs text-slate-400 text-center">Healthcare CRM v1.0</p>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full min-w-0">
        {/* Chat Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h2 className="font-bold text-slate-800 text-lg">Ruang Diskusi</h2>
                <p className="text-sm text-slate-500">{roomId} - Konsultasi Pasien</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
          {data?.messages?.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-600 mb-1">Belum Ada Pesan</h3>
              <p className="text-sm text-slate-400">Mulai percakapan dengan mengirim pesan pertama</p>
            </div>
          )}

          {data?.messages?.map((msg: Message, index: number) => {
            const isOwn = msg.senderId === senderId;
            const showDate = index === 0 ||
              formatDate(msg.createdAt) !== formatDate(data.messages[index - 1].createdAt);

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex items-center justify-center my-6">
                    <span className="bg-slate-200 text-slate-600 text-xs px-4 py-1.5 rounded-full font-medium">
                      {formatDate(msg.createdAt)}
                    </span>
                  </div>
                )}
                <div className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  {!isOwn && (
                    <div className="w-8 h-8 bg-gradient-to-br from-slate-400 to-slate-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {getInitials(msg.senderId)}
                    </div>
                  )}
                  <div className={`max-w-md ${isOwn ? 'order-1' : ''}`}>
                    {!isOwn && (
                      <p className="text-xs text-slate-500 mb-1 ml-1">{msg.senderId}</p>
                    )}
                    <div
                      className={`px-4 py-3 rounded-2xl ${
                        isOwn
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-br-md'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-bl-md shadow-sm'
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    </div>
                    <p className={`text-xs mt-1 ${isOwn ? 'text-right mr-1' : 'ml-1'} text-slate-400`}>
                      {formatTime(msg.createdAt)}
                    </p>
                  </div>
                  {isOwn && (
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {getInitials(senderId)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-slate-200 p-4 shrink-0">
          <div className="flex items-end gap-3">
            <button className="p-3 hover:bg-slate-100 rounded-xl transition-colors flex-shrink-0">
              <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <div className="flex-1 relative">
              <textarea
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-slate-800 placeholder-slate-400"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ketik pesan..."
                rows={1}
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!content.trim() || sending}
              className={`p-3 rounded-xl transition-all flex-shrink-0 ${
                content.trim() && !sending
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-lg hover:shadow-emerald-500/30'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              {sending ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2 text-center">
            Tekan Enter untuk mengirim, Shift + Enter untuk baris baru
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;
