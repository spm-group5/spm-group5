import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button/Button';
import Input from '../components/common/Input/Input';
import styles from './LoginPage.module.css';

function LoginPage() {
  const { login, isAuthenticated, loading, error } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [formError, setFormError] = useState('');

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.username || !formData.password) {
      setFormError('Please fill in all fields');
      return;
    }

    const result = await login(formData.username, formData.password);
    if (!result.success) {
      setFormError(result.error);
    }
  };

  return (
    <div className={styles.container}>
      {/* Left Panel - Branding & Info */}
      <div className={styles.leftPanel}>
        <div className={styles.brandingContent}>
          <div className={styles.logoSection}>
            <div className={styles.logoIcon}>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5M12 12H15M12 16H15M9 12H9.01M9 16H9.01"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 className={styles.companyName}>All-In-One</h1>
          </div>

          <div className={styles.heroSection}>
            <h2 className={styles.heroTitle}>
              <span className={styles.heroLine}>Transform Your</span>
              <span className={styles.heroLine}>Workflow With</span>
              <span className={styles.heroLine}>Intelligent</span>
              <span className={styles.heroHighlight}>Task Management</span>
            </h2>

            <div className={styles.features}>
              <div className={styles.feature}>
                <div className={styles.featureIcon}>
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 10V3L4 14h7v7l9-11h-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className={styles.featureText}>
                  <h3>Streamline Operations</h3>
                  <p>Empower your teams with cloud-based collaboration tools designed for modern businesses</p>
                </div>
              </div>

              <div className={styles.feature}>
                <div className={styles.featureIcon}>
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className={styles.featureText}>
                  <h3>Enhance Productivity</h3>
                  <p>Integrated solutions that adapt to your organization's unique workflow requirements</p>
                </div>
              </div>

              <div className={styles.feature}>
                <div className={styles.featureIcon}>
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className={styles.featureText}>
                  <h3>Scale Globally</h3>
                  <p>Supporting businesses across Southeast Asia with enterprise-grade digital transformation</p>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.footer}>
            <p>Trusted by leading organizations across Singapore, Malaysia, Indonesia, Vietnam, and Hong Kong</p>
          </div>
        </div>

        {/* Animated Background Elements */}
        <div className={styles.backgroundElements}>
          <div className={styles.floatingShape1}></div>
          <div className={styles.floatingShape2}></div>
          <div className={styles.floatingShape3}></div>
          <div className={styles.gridPattern}></div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className={styles.rightPanel}>
        <div className={styles.loginBox}>
          <div className={styles.loginHeader}>
            <h2 className={styles.loginTitle}>Welcome Back</h2>
            <p className={styles.loginSubtitle}>Sign in to access your workspace</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <Input
                label="Username"
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <Input
                label="Password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            {(formError || error) && (
              <div className={styles.error}>
                <svg className={styles.errorIcon} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{formError || error}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="large"
              disabled={loading}
              className={styles.submitButton}
            >
              {loading ? (
                <>
                  <span className={styles.spinner}></span>
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <svg className={styles.arrowIcon} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </>
              )}
            </Button>
          </form>

          <div className={styles.securityBadge}>
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Secure Enterprise Authentication</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;