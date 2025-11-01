import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Header from '../components/common/Header/Header';
import Button from '../components/common/Button/Button';
import Card from '../components/common/Card/Card';
import Input from '../components/common/Input/Input';
import Spinner from '../components/common/Spinner/Spinner';
import SearchableSelect from '../components/common/SearchableSelect/SearchableSelect';
import apiService from '../services/api';
import { useNotifications } from '../hooks/useNotifications';
import styles from './ReportsPage.module.css';

function ReportsPage() {
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState('error'); // 'error' or 'warning'
  const { addNotification } = useNotifications();

  // Department list from User model
  const departments = [
    { value: 'hr', label: 'HR' },
    // { value: 'it', label: 'IT' },
    { value: 'sales', label: 'Sales' },
    { value: 'consultancy', label: 'Consultancy' },
    { value: 'systems', label: 'Systems' },
    { value: 'engineering', label: 'Engineering' },
    { value: 'finance', label: 'Finance' },
    { value: 'managing director', label: 'Managing Director' },
  ];

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm({
    defaultValues: {
      reportType: 'user',
      targetId: '',
      department: '',
      startDate: '',
      endDate: '',
      timeframe: 'week',
      format: 'pdf',
    },
  });

  const reportType = watch('reportType');
  const targetId = watch('targetId');
  const department = watch('department');

  // Load users and projects on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [usersResponse, projectsResponse] = await Promise.all([
          apiService.getAllUsers(),
          apiService.getAllProjectsForAdmin(),
        ]);

        setUsers(usersResponse.data || []);
        setProjects(projectsResponse.data || []);
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err.message || 'Failed to load users and projects');
        addNotification(
          err.message || 'Failed to load data for report generation',
          'error'
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [addNotification]);

  // Reset target selection when report type changes
  useEffect(() => {
    setValue('targetId', '');
    setValue('department', '');
  }, [reportType, setValue]);

  const onSubmit = async (data) => {
    try {
      setGenerating(true);
      setError(null);
      setErrorType('error'); // Reset error type

      let result;

      if (data.reportType === 'team-summary') {
        // Team Summary Report - no end date, uses timeframe
        result = await apiService.generateTeamSummaryReport(
          data.targetId,
          data.startDate,
          data.timeframe,
          data.format
        );
      } else if (data.reportType === 'logged-time') {
        // Logged Time Report by Project - no date range needed
        result = await apiService.generateLoggedTimeReport(
          data.targetId,
          data.format
        );
      } else if (data.reportType === 'logged-time-department') {
        // Logged Time Report by Department - no date range needed
        result = await apiService.generateDepartmentLoggedTimeReport(
          data.department,
          data.format
        );
      } else {
        // Task Completion Reports - require start and end dates
        const startDate = new Date(data.startDate);
        const endDate = new Date(data.endDate);

        if (startDate > endDate) {
          throw new Error('Start date cannot be after end date');
        }

        result = await apiService.generateReport(
          data.reportType,
          data.targetId,
          data.startDate,
          data.endDate,
          data.format
        );
      }

      addNotification(
        `Report generated successfully: ${result.filename}`,
        'success'
      );

    } catch (err) {
      console.error('Error generating report:', err);
      
      // Handle "no data" errors differently
      if (err.type === 'NO_DATA_FOUND') {
        setError(err.message);
        setErrorType('warning');
        addNotification(
          err.message,
          'warning'  // Use warning type for no data scenarios
        );
      } else {
        setError(err.message || 'Failed to generate report');
        setErrorType('error');
        addNotification(
          err.message || 'Failed to generate report',
          'error'
        );
      }
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Header />
        <div className="container flex justify-center items-center" style={{ minHeight: '400px' }}>
          <Spinner size="large" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className={`container ${styles.page}`}>
        <div className={styles.header}>
          <h1>Report Generation</h1>
          <p className={styles.subtitle}>
            Generate task completion, logged time, and team summary reports
          </p>
        </div>

        {error && (
          <div className={errorType === 'warning' ? styles.warning : styles.error}>
            {error}
          </div>
        )}

        <Card className={styles.formCard}>
          <Card.Header>
            <h2>Generate Report</h2>
          </Card.Header>
          <Card.Body>
            <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
              {/* Report Type Selection */}
              <div className={styles.radioGroup}>
                <label className={styles.radioGroupLabel}>
                  Report Type <span className={styles.required}>*</span>
                </label>
                <div className={styles.radioOptions}>
                  <label className={styles.radioOption}>
                    <input
                      type="radio"
                      value="user"
                      {...register('reportType', { required: 'Please select a report type' })}
                      className={styles.radioInput}
                    />
                    <span className={styles.radioLabel}>Task Completion Report by User</span>
                  </label>
                  <label className={styles.radioOption}>
                    <input
                      type="radio"
                      value="project"
                      {...register('reportType', { required: 'Please select a report type' })}
                      className={styles.radioInput}
                    />
                    <span className={styles.radioLabel}>Task Completion Report by Project</span>
                  </label>
                  <label className={styles.radioOption}>
                    <input
                      type="radio"
                      value="team-summary"
                      {...register('reportType', { required: 'Please select a report type' })}
                      className={styles.radioInput}
                    />
                    <span className={styles.radioLabel}>Team Summary Report</span>
                  </label>
                  <label className={styles.radioOption}>
                    <input
                      type="radio"
                      value="logged-time"
                      {...register('reportType', { required: 'Please select a report type' })}
                      className={styles.radioInput}
                    />
                    <span className={styles.radioLabel}>Logged Time Report by Project</span>
                  </label>
                  <label className={styles.radioOption}>
                    <input
                      type="radio"
                      value="logged-time-department"
                      {...register('reportType', { required: 'Please select a report type' })}
                      className={styles.radioInput}
                    />
                    <span className={styles.radioLabel}>Logged Time Report by Department</span>
                  </label>
                </div>
                {errors.reportType && (
                  <div className={styles.errorMessage}>{errors.reportType.message}</div>
                )}
              </div>

              {/* Target Selection (User/Project) */}
              {reportType && reportType !== 'logged-time-department' && (
                <div className={styles.targetSelection}>
                  <label className={styles.selectLabel}>
                    Select {reportType === 'user' ? 'User' : 'Project'} <span className={styles.required}>*</span>
                  </label>
                  
                  <SearchableSelect
                    options={reportType === 'user' ? users : projects}
                    value={targetId}
                    onChange={(value) => setValue('targetId', value)}
                    placeholder={`Select ${reportType === 'user' ? 'a user' : 'a project'}`}
                    searchPlaceholder={`Search ${reportType === 'user' ? 'users' : 'projects'}...`}
                    getOptionLabel={(item) => 
                      reportType === 'user' 
                        ? `${item.username} (${item.department})`
                        : item.name
                    }
                    getOptionValue={(item) => item.id || item._id}
                    error={errors.targetId?.message}
                  />
              </div>
              )}

              {/* Department Selection (for Department Logged Time Report) */}
              {reportType === 'logged-time-department' && (
                <div className={styles.targetSelection}>
                  <label className={styles.selectLabel}>
                    Select Department <span className={styles.required}>*</span>
                  </label>
                  
                  <SearchableSelect
                    options={departments}
                    value={department}
                    onChange={(value) => setValue('department', value)}
                    placeholder="Select a department"
                    searchPlaceholder="Search departments..."
                    getOptionLabel={(dept) => dept.label}
                    getOptionValue={(dept) => dept.value}
                    error={errors.department?.message}
                  />
                </div>
              )}              {/* Timeframe Selection (Team Summary Only) */}
              {reportType === 'team-summary' && (
                <div className={styles.radioGroup}>
                  <label className={styles.radioGroupLabel}>
                    Timeframe <span className={styles.required}>*</span>
                  </label>
                  <div className={styles.radioOptions}>
                    <label className={styles.radioOption}>
                      <input
                        type="radio"
                        value="week"
                        {...register('timeframe', { required: 'Please select a timeframe' })}
                        className={styles.radioInput}
                      />
                      <span className={styles.radioLabel}>Week (7 days from start date)</span>
                    </label>
                    <label className={styles.radioOption}>
                      <input
                        type="radio"
                        value="month"
                        {...register('timeframe', { required: 'Please select a timeframe' })}
                        className={styles.radioInput}
                      />
                      <span className={styles.radioLabel}>Month (entire calendar month)</span>
                    </label>
                  </div>
                  {errors.timeframe && (
                    <div className={styles.errorMessage}>{errors.timeframe.message}</div>
                  )}
                </div>
              )}

              {/* Date Range */}
              {reportType !== 'team-summary' && reportType !== 'logged-time' && reportType !== 'logged-time-department' ? (
                <div className={styles.dateRange}>
                  <Input
                    label="Start Date"
                    type="date"
                    {...register('startDate', { required: 'Start date is required' })}
                    error={errors.startDate?.message}
                    required
                  />
                  <Input
                    label="End Date"
                    type="date"
                    {...register('endDate', { required: 'End date is required' })}
                    error={errors.endDate?.message}
                    required
                  />
                </div>
              ) : reportType === 'team-summary' ? (
                <div className={styles.singleDate}>
                  <Input
                    label="Start Date"
                    type="date"
                    {...register('startDate', { required: 'Start date is required' })}
                    error={errors.startDate?.message}
                    required
                  />
                </div>
              ) : null}

              {/* Format Selection */}
              <div className={styles.formatSelection}>
                <label className={styles.selectLabel}>
                  Format <span className={styles.required}>*</span>
                </label>
                <select
                  className={styles.select}
                  {...register('format', { required: 'Please select a format' })}
                >
                  <option value="pdf">PDF</option>
                  <option value="excel">Excel</option>
                </select>
                {errors.format && (
                  <div className={styles.errorMessage}>{errors.format.message}</div>
                )}
              </div>

              {/* Submit Button */}
              <div className={styles.actions}>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting || generating}
                  className={styles.generateButton}
                >
                  {generating ? (
                    <>
                      <Spinner size="small" />
                      Generating Report...
                    </>
                  ) : (
                    'Generate Report'
                  )}
                </Button>
              </div>
            </form>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}

export default ReportsPage;