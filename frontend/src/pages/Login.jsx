import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

function Login({ setIsAuthenticated }) {
    const navigate = useNavigate();
    const [isSignUp, setIsSignUp] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg('');

        try {
            if (isSignUp) {
                // Sign Up
                const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
                await updateProfile(userCredential.user, { displayName: formData.name });

                // Create user record in Firestore
                await setDoc(doc(db, "users", userCredential.user.uid), {
                    uid: userCredential.user.uid,
                    email: userCredential.user.email,
                    displayName: formData.name,
                    createdAt: serverTimestamp()
                });

                localStorage.setItem('token', userCredential.user.accessToken);
                localStorage.setItem('user', JSON.stringify({
                    id: userCredential.user.uid,
                    email: userCredential.user.email,
                    name: formData.name,
                    picture: ''
                }));

                setIsAuthenticated(true);
                navigate('/dashboard');
            } else {
                // Login
                const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);

                // Update/Sync user record in Firestore on login
                await setDoc(doc(db, "users", userCredential.user.uid), {
                    uid: userCredential.user.uid,
                    email: userCredential.user.email,
                    displayName: userCredential.user.displayName,
                    lastLogin: serverTimestamp()
                }, { merge: true });

                localStorage.setItem('token', userCredential.user.accessToken);
                localStorage.setItem('user', JSON.stringify({
                    id: userCredential.user.uid,
                    email: userCredential.user.email,
                    name: userCredential.user.displayName || userCredential.user.email,
                    picture: userCredential.user.photoURL || ''
                }));

                setIsAuthenticated(true);
                navigate('/dashboard');
            }
        } catch (error) {
            console.error("Authentication Error:", error);
            setErrorMsg(error.message || 'Authentication failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex-center" style={{ minHeight: '100vh', padding: '20px' }}>
            <div className="card-glass animate-fade-in" style={{ padding: '40px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
                <div style={{ marginBottom: '30px' }}>
                    <div style={{
                        width: '64px', height: '64px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, var(--accent-primary) 0%, #c084fc 100%)',
                        margin: '0 auto 20px auto',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 20px var(--accent-glow)'
                    }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                        </svg>
                    </div>
                    <h1 className="gradient-text" style={{ fontSize: '2rem', marginBottom: '10px' }}>ExplainMyRepo</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        {isSignUp ? 'Create a new account' : 'Welcome back'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {isSignUp && (
                        <input
                            type="text"
                            name="name"
                            placeholder="Full Name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            style={{
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(255,255,255,0.05)',
                                color: 'white',
                                outline: 'none'
                            }}
                        />
                    )}

                    <input
                        type="email"
                        name="email"
                        placeholder="Email Address"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        style={{
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.05)',
                            color: 'white',
                            outline: 'none'
                        }}
                    />

                    <input
                        type="password"
                        name="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        style={{
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.05)',
                            color: 'white',
                            outline: 'none'
                        }}
                    />

                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            background: 'var(--accent-primary)',
                            color: 'white',
                            border: 'none',
                            padding: '12px 24px',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            fontWeight: '600',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
                            boxShadow: '0 4px 14px var(--accent-glow)',
                            transition: 'opacity 0.2s',
                            opacity: isLoading ? 0.7 : 1,
                            marginTop: '10px'
                        }}
                    >
                        {isLoading ? (
                            <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                        ) : (
                            isSignUp ? 'Sign Up' : 'Log In'
                        )}
                    </button>
                </form>

                {errorMsg && (
                    <div style={{ marginTop: '16px', padding: '10px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', borderRadius: '8px', fontSize: '0.9rem' }}>
                        {errorMsg}
                    </div>
                )}

                <p style={{ marginTop: '20px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                    {' '}
                    <span
                        onClick={() => { setIsSignUp(!isSignUp); setErrorMsg(''); }}
                        style={{ color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        {isSignUp ? 'Log In' : 'Sign Up'}
                    </span>
                </p>
            </div>
        </div>
    );
}

export default Login;
