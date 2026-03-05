import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    ArrowLeft, Box, FolderTree, MessageSquare,
    FileCode, Send, LayoutTemplate, Activity, FileText,
    ShieldCheck, HelpCircle, BookOpen, Terminal, Gauge,
    RefreshCw, Zap, Rocket, ShieldAlert, Cpu, Trash2
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:8000' : 'https://explainmyrepo-backend.onrender.com');

function RepoAnalysis() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [repo, setRepo] = useState(null);
    const [activeTab, setActiveTab] = useState('architecture');
    const [loading, setLoading] = useState(true);

    // Elite Feature states
    const [readme, setReadme] = useState('');
    const [testSuite, setTestSuite] = useState('');
    const [infra, setInfra] = useState('');
    const [migration, setMigration] = useState('');
    const [eliteSubTab, setEliteSubTab] = useState('');
    const [isEliteLoading, setIsEliteLoading] = useState(false);

    // Interview states
    const [questions, setQuestions] = useState([]);
    const [patterns, setPatterns] = useState([]);
    const [isInterviewLoading, setIsInterviewLoading] = useState(false);

    // Chat State
    const [chatInput, setChatInput] = useState('');
    const [chatHistory, setChatHistory] = useState([
        { role: 'ai', content: "Hello! I'm your repo assistant. Ask me anything about the implementation or architecture." }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const chatEndRef = useRef(null);

    useEffect(() => {
        fetchRepoData();
        const interval = setInterval(() => {
            if (loading || (repo && repo.status !== 'completed')) {
                fetchRepoData();
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [id]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    const fetchRepoData = async () => {
        try {
            const response = await axios.get(`${API_URL}/repos/${id}`);
            setRepo(response.data);
            if (response.data.status === 'completed' || response.data.status === 'failed') {
                setLoading(false);
            }
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    const fetchInterviewPrep = async (forceRefresh = false) => {
        if (!forceRefresh && questions.length > 0) {
            setActiveTab('interview');
            return;
        }
        setIsInterviewLoading(true);
        setActiveTab('interview');
        try {
            const [qRes, pRes] = await Promise.all([
                axios.get(`${API_URL}/repos/${id}/interview-questions`),
                axios.get(`${API_URL}/repos/${id}/patterns`)
            ]);
            setQuestions(qRes.data.questions);
            setPatterns(pRes.data.patterns);
        } catch (error) {
            console.error("Feature fetch failed", error);
        } finally {
            setIsInterviewLoading(false);
        }
    };

    const fetchEliteInsight = async (type) => {
        setIsEliteLoading(true);
        setActiveTab('elite');
        setEliteSubTab(type);
        try {
            let res;
            if (type === 'readme') res = await axios.get(`${API_URL}/repos/${id}/readme`);
            if (type === 'test') res = await axios.get(`${API_URL}/repos/${id}/test-suite`);
            if (type === 'infra') res = await axios.get(`${API_URL}/repos/${id}/infra`);
            if (type === 'migration') res = await axios.get(`${API_URL}/repos/${id}/migration`);

            if (type === 'readme') setReadme(res.data.readme);
            if (type === 'test') setTestSuite(res.data.test_suite);
            if (type === 'infra') setInfra(res.data.infra);
            if (type === 'migration') setMigration(res.data.migration);
        } catch (e) {
            console.error(e);
        } finally {
            setIsEliteLoading(false);
        }
    };

    const handleChatSubmit = async (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        const userMessage = chatInput.trim();
        setChatInput('');
        setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsTyping(true);

        try {
            const response = await fetch(`${API_URL}/chat/stream`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repo_id: id, message: userMessage })
            });

            if (!response.body) throw new Error("No response body");
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let aiResponse = "";
            setChatHistory(prev => [...prev, { role: 'ai', content: '' }]);

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                aiResponse += chunk;
                setChatHistory(prev => {
                    const newHistory = [...prev];
                    newHistory[newHistory.length - 1].content = aiResponse;
                    return newHistory;
                });
            }
        } catch (error) {
            setChatHistory(prev => [...prev.slice(0, -1), { role: 'ai', content: "Error connecting to AI chat service." }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Delete this analysis? This cannot be undone.")) return;
        try {
            await axios.delete(`${API_URL}/repos/${id}`);
            navigate('/dashboard');
        } catch (error) {
            console.error(error);
            alert("Delete failed");
        }
    };

    if (loading || !repo) {
        return (
            <div className="flex-center" style={{ height: '100vh', flexDirection: 'column', gap: '20px' }}>
                <div className="spinner"></div>
                <p style={{ color: 'var(--accent-primary)', fontWeight: '600' }}>{repo?.status?.replace('_', ' ') || 'Starting...'}</p>
                <p style={{ color: 'var(--text-secondary)', marginTop: '-10px' }}>{repo?.description || 'Preparing analysis engine...'}</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <header className="flex-between" style={{ padding: '16px 30px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <button onClick={() => navigate('/dashboard')} className="btn-icon">
                        <ArrowLeft size={18} /> Dashboard
                    </button>
                    <div style={{ height: '24px', width: '1px', background: 'var(--border-color)' }}></div>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <LayoutTemplate size={20} color="var(--accent-primary)" />
                        {repo.name}
                    </h2>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn-icon" onClick={handleDelete} style={{ color: 'var(--error)', marginRight: '12px' }} title="Delete Analysis">
                        <Trash2 size={18} />
                    </button>
                    <button className="btn-secondary" onClick={() => fetchInterviewPrep()}>
                        <ShieldCheck size={18} /> Interview Prep
                    </button>
                    <button className="btn-primary" onClick={() => fetchEliteInsight('readme')}>
                        <Rocket size={18} /> Elite Insights
                    </button>
                </div>
            </header>

            <div style={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
                <aside style={{ width: '280px', borderRight: '1px solid var(--border-color)', padding: '20px 0', background: 'var(--bg-surface-glass)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 12px' }}>
                        <TabButton active={activeTab === 'architecture'} icon={<Box size={18} />} label="Full Architecture" onClick={() => setActiveTab('architecture')} />
                        <TabButton active={activeTab === 'tree'} icon={<FolderTree size={18} />} label="Repository Tree" onClick={() => setActiveTab('tree')} />
                        <TabButton active={activeTab === 'metrics'} icon={<Activity size={18} />} label="Code Health" onClick={() => setActiveTab('metrics')} />
                        <TabButton active={activeTab === 'chat'} icon={<MessageSquare size={18} />} label="Architect Chat" onClick={() => setActiveTab('chat')} />
                        <TabButton active={activeTab === 'interview'} icon={<HelpCircle size={18} />} label="Interview Mastery" onClick={() => fetchInterviewPrep()} />
                        <TabButton active={activeTab === 'elite'} icon={<Zap size={18} />} label="Elite Insights" onClick={() => setActiveTab('elite')} />
                    </div>
                </aside>

                <main style={{ flexGrow: 1, overflow: 'auto', padding: '40px' }}>

                    {/* Elite Insights Tab */}
                    {activeTab === 'elite' && (
                        <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
                            <div className="flex-between" style={{ marginBottom: '30px' }}>
                                <h1 style={{ margin: 0 }}>Elite Engineering Insights</h1>
                                {isEliteLoading && <div className="spinner-small"></div>}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '40px' }}>
                                <EliteCard icon={<FileText color="var(--accent-primary)" />} label="Smart README" onClick={() => fetchEliteInsight('readme')} active={eliteSubTab === 'readme'} />
                                <EliteCard icon={<ShieldAlert color="#10b981" />} label="Test Suite" onClick={() => fetchEliteInsight('test')} active={eliteSubTab === 'test'} />
                                <EliteCard icon={<Cpu color="#f59e0b" />} label="Infrastructure" onClick={() => fetchEliteInsight('infra')} active={eliteSubTab === 'infra'} />
                                <EliteCard icon={<Zap color="#8b5cf6" />} label="Migration Guide" onClick={() => fetchEliteInsight('migration')} active={eliteSubTab === 'migration'} />
                            </div>

                            <div className="card-glass" style={{ padding: '40px', minHeight: '400px' }}>
                                {isEliteLoading ? (
                                    <div className="flex-center" style={{ height: '300px' }}><div className="spinner"></div></div>
                                ) : (
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {eliteSubTab === 'readme' ? readme :
                                            eliteSubTab === 'test' ? testSuite :
                                                eliteSubTab === 'infra' ? infra :
                                                    eliteSubTab === 'migration' ? migration :
                                                        "Select a module to generate elite architectural insights."}
                                    </ReactMarkdown>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Interview Mastery */}
                    {activeTab === 'interview' && (
                        <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
                            <div className="flex-between" style={{ marginBottom: '30px' }}>
                                <h1 style={{ margin: 0 }}>Interview Mastery</h1>
                                <button className="btn-secondary" onClick={() => fetchInterviewPrep(true)} disabled={isInterviewLoading}>
                                    <RefreshCw size={16} className={isInterviewLoading ? 'spin' : ''} /> Refresh Q&A
                                </button>
                            </div>

                            {isInterviewLoading ? (
                                <div className="flex-center" style={{ padding: '100px' }}><div className="spinner"></div></div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                                    <section>
                                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                            <HelpCircle color="var(--accent-primary)" /> Technical Challenge Questions
                                        </h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            {questions.map((q, i) => (
                                                <div key={i} className="card-glass" style={{ padding: '24px' }}>
                                                    <h4 style={{ color: 'var(--accent-secondary)', marginBottom: '12px' }}>Q: {q.question}</h4>
                                                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Expert-Level Response:</span>
                                                        <p style={{ margin: '8px 0 0 0' }}>{q.answer}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    <section>
                                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                            <BookOpen color="var(--accent-secondary)" /> Infrastructure & Patterns
                                        </h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                            {patterns.map((p, i) => (
                                                <div key={i} className="card-glass" style={{ padding: '24px' }}>
                                                    <div style={{ fontWeight: '700', fontSize: '1.2rem', color: 'var(--accent-primary)' }}>{p.pattern}</div>
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 12px 0' }}>Implementation: {p.location}</div>
                                                    <p style={{ fontSize: '0.95rem' }}>{p.explanation}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Chat with Markdown */}
                    {activeTab === 'chat' && (
                        <div className="animate-fade-in" style={{ height: '100%', maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
                            <div className="card-glass" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                <div style={{ flexGrow: 1, overflowY: 'auto', padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {chatHistory.map((msg, idx) => (
                                        <div key={idx} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                                            <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                                            </div>
                                        </div>
                                    ))}
                                    {isTyping && <div className="typing">Assistant is formulating response...</div>}
                                    <div ref={chatEndRef} />
                                </div>
                                <div style={{ padding: '24px', borderTop: '1px solid var(--border-color)' }}>
                                    <form onSubmit={handleChatSubmit} style={{ display: 'flex', gap: '12px' }}>
                                        <input type="text" className="input-glass" style={{ flexGrow: 1 }} placeholder="Deep dive into any component..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} />
                                        <button type="submit" className="btn-primary" disabled={!chatInput.trim() || isTyping}><Send size={18} /></button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Architecture */}
                    {activeTab === 'architecture' && (
                        <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
                            <h1 style={{ fontSize: '2.5rem', marginBottom: '30px' }}>Repository Architecture</h1>
                            {repo.architecture_structured ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                    <div className="card-glass" style={{ padding: '24px' }}>
                                        <h3 style={{ color: 'var(--accent-secondary)', marginBottom: '16px' }}><Terminal size={20} /> Tech Stack</h3>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                            {repo.architecture_structured.tech_stack.map(tech => (
                                                <span key={tech} className="badge">{tech}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                        {repo.architecture_structured.main_components.map((comp, idx) => (
                                            <div key={idx} className="card-glass" style={{ padding: '24px' }}>
                                                <h4>{comp.name}</h4>
                                                <p style={{ color: 'var(--text-secondary)' }}>{comp.purpose}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="card-glass" style={{ padding: '30px' }}>
                                        <h3 style={{ marginBottom: '16px' }}>Interaction Flow</h3>
                                        <p>{repo.architecture_structured.data_flow}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="card-glass" style={{ padding: '40px' }}>{repo.architecture_summary}</div>
                            )}
                        </div>
                    )}

                    {/* Tree View */}
                    {activeTab === 'tree' && (
                        <div className="animate-fade-in"><FileTree repo={repo} /></div>
                    )}

                    {/* Metrics */}
                    {activeTab === 'metrics' && (
                        <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                            {repo.files.map(f => <MetricCard key={f.id} file={f} />)}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

function EliteCard({ icon, label, onClick, active }) {
    return (
        <button className="card-glass" onClick={onClick} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '20px',
            cursor: 'pointer', border: active ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
            background: active ? 'rgba(139,92,246,0.1)' : 'transparent'
        }}>
            {icon}
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{label}</span>
        </button>
    );
}

function FileTree({ repo }) {
    const buildTree = () => {
        const root = { name: repo.name, children: {}, type: 'folder' };
        repo.files.forEach(file => {
            const parts = file.path.split('/');
            let current = root;
            parts.forEach((part, i) => {
                if (i === parts.length - 1) {
                    current.children[part] = { name: part, type: 'file', data: file };
                } else {
                    if (!current.children[part]) current.children[part] = { name: part, type: 'folder', children: {} };
                    current = current.children[part];
                }
            });
        });
        return root;
    };

    const renderNode = (node, depth = 0) => {
        if (node.type === 'file') {
            return (
                <div key={node.name} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', paddingLeft: `${depth * 20}px` }}>
                    <FileCode size={16} color="var(--accent-secondary)" />
                    <span>{node.name}</span>
                </div>
            );
        }
        return (
            <div key={node.name}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', paddingLeft: `${depth * 20}px`, fontWeight: '600', color: 'var(--accent-primary)' }}>
                    <FolderTree size={18} />
                    <span>{node.name}</span>
                </div>
                {Object.values(node.children).map(child => renderNode(child, depth + 1))}
            </div>
        );
    };

    return <div className="card-glass" style={{ padding: '30px' }}>{renderNode(buildTree())}</div>;
}

function MetricCard({ file }) {
    const metrics = file.metrics || { lines: 0, complexity_score: 0 };
    const score = metrics.complexity_score;
    const color = score < 15 ? '#10b981' : score < 40 ? '#f59e0b' : '#ef4444';

    return (
        <div className="card-glass" style={{ padding: '20px' }}>
            <div className="flex-between" style={{ marginBottom: '16px' }}>
                <h4 style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</h4>
                <Gauge size={16} color={color} />
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>LOC: {metrics.lines}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>Complexity: {score}</div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
                <div style={{ height: '100%', width: `${Math.min(score * 2, 100)}%`, background: color, borderRadius: '2px' }} />
            </div>
        </div>
    );
}

function TabButton({ active, icon, label, onClick }) {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 20px',
                background: active ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                border: 'none', borderLeft: `4px solid ${active ? 'var(--accent-primary)' : 'transparent'}`,
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: '0.95rem', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s ease'
            }}
        >
            {icon} {label}
        </button>
    );
}

export default RepoAnalysis;
