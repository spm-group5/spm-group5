import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button/Button';
import Input from '../components/common/Input/Input';
import Card from '../components/common/Card/Card';
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
      <div className={styles.loginBox}>
        <Card>
          <Card.Header>
            <h1 className={styles.title}>Task Management System</h1>
            <p className={styles.subtitle}>Sign in to your account</p>
          </Card.Header>
          <Card.Body>
            <form onSubmit={handleSubmit} className={styles.form}>
              <Input
                label="Username"
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
              />
              <Input
                label="Password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
              {(formError || error) && (
                <div className={styles.error}>
                  {formError || error}
                </div>
              )}
              <Button
                type="submit"
                variant="primary"
                size="large"
                disabled={loading}
                className={styles.submitButton}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}

export default LoginPage;