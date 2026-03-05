import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, Github, Layout, Clock, Activity, LogOut, Trash2, AlertCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:8000' : 'https://explainmyrepo-backend.onrender.com');

function Dashboard() {
    const [repoUrl, setRepoUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [recentRepos, setRecentRepos] = useState([]);
    const navigate = useNavigate();

    const [user, setUser] = useState(null);

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (storedUser) {
            setUser(storedUser);
            fetchRecentRepos(storedUser.id);
        }
    }, []);

    const fetchRecentRepos = async (userId) => {
        try {
            const response = await axios.get(`${API_URL}/repos/?userId=${userId}`);
            setRecentRepos(response.data);
        } catch (error) {
            console.error("Failed to fetch repos", error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!repoUrl) return;

        setIsSubmitting(true);
        try {
            const response = await axios.post(`${API_URL}/repos/`, {
                url: repoUrl,
                userId: user?.id
            });
            navigate(`/repo/${response.data.id}`);
        } catch (error) {
            console.error("Failed to submit repo", error);
            alert("Failed to submit repository. Check console.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (e, repoId) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this analysis? This will free up storage space.")) return;

        try {
            await axios.delete(`${API_URL}/repos/${repoId}`);
            setRecentRepos(recentRepos.filter(r => r.id !== repoId));
        } catch (error) {
            console.error("Delete failed", error);
            alert("Failed to delete repository.");
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <div style={{ padding: '40px 0' }}>
            <header className="container flex-between" style={{ marginBottom: '60px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '40px', height: '40px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, var(--accent-primary) 0%, #c084fc 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Layout size={20} color="white" />
                    </div>
                    <h2 className="gradient-text" style={{ margin: 0 }}>ExplainMyRepo</h2>
                </div>
                <button className="btn-secondary" onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}>
                    <LogOut size={16} /> Logout
                </button>
            </header>

            <main className="container animate-fade-in">
                <section style={{ textAlign: 'center', marginBottom: '60px' }}>
                    <h1 style={{ fontSize: '3rem', marginBottom: '20px' }}>
                        Understand any codebase in <span className="gradient-text">seconds.</span>
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto 40px auto' }}>
                        Paste a GitHub repository URL below to auto-generate architecture diagrams, file analyses, and an interactive Q&A assistant.
                    </p>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '12px', maxWidth: '800px', margin: '0 auto', background: 'var(--bg-surface-glass)', padding: '8px', borderRadius: '16px', border: '1px solid var(--border-color)', backdropFilter: 'blur(10px)' }}>
                        <div style={{ position: 'relative', flexGrow: 1, display: 'flex', alignItems: 'center' }}>
                            <Github size={20} color="var(--accent-secondary)" style={{ position: 'absolute', left: '16px' }} />
                            <input
                                type="url"
                                className="input-glass"
                                placeholder="Paste GitHub Repository URL (e.g., https://github.com/facebook/react)"
                                style={{ paddingLeft: '48px', width: '100%', fontSize: '1rem', height: '48px' }}
                                value={repoUrl}
                                onChange={(e) => setRepoUrl(e.target.value)}
                                required
                            />
                        </div>
                        <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ padding: '0 24px', height: '48px', borderRadius: '12px' }}>
                            {isSubmitting ? 'Analyzing...' : <><Search size={18} /> Analyze Repository</>}
                        </button>
                    </form>
                </section>

                <section>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                        <Clock size={20} color="var(--accent-primary)" />
                        <h3>Recent Analyses</h3>
                    </div>

                    {recentRepos.length === 0 ? (
                        <div className="card-glass flex-center" style={{ padding: '60px', color: 'var(--text-secondary)', flexDirection: 'column', gap: '16px' }}>
                            <Activity size={48} opacity={0.3} />
                            <p>No repositories analyzed yet. Submit one above to get started!</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                            {recentRepos.map(repo => (
                                <div
                                    key={repo.id}
                                    className="card-glass"
                                    style={{ padding: '24px', cursor: 'pointer' }}
                                    onClick={() => navigate(`/repo/${repo.id}`)}
                                >
                                    <div className="flex-between" style={{ marginBottom: '16px' }}>
                                        <h4 style={{ margin: 0, color: 'var(--accent-secondary)' }}>{repo.name}</h4>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                padding: '4px 10px',
                                                borderRadius: '20px',
                                                background: repo.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                                color: repo.status === 'completed' ? 'var(--success)' : 'var(--warning)',
                                                border: `1px solid ${repo.status === 'completed' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`
                                            }}>
                                                {repo.status.charAt(0).toUpperCase() + repo.status.slice(1)}
                                            </span>
                                            <button className="btn-icon" onClick={(e) => handleDelete(e, repo.id)} style={{ color: 'var(--error)', padding: '4px' }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {repo.url}
                                    </p>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        {repo.description || 'Analysis in progress...'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}

export default Dashboard;
