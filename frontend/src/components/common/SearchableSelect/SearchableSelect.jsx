import { useState, useRef, useEffect } from 'react';
import styles from './SearchableSelect.module.css';

function SearchableSelect({ 
  options = [], 
  value, 
  onChange, 
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  getOptionLabel,
  getOptionValue,
  error,
  disabled = false,
  className = ""
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Get display text for selected value
  const getDisplayText = () => {
    if (!value) return '';
    const selectedOption = options.find(opt => getOptionValue(opt) === value);
    return selectedOption ? getOptionLabel(selectedOption) : '';
  };

  // Filter options based on search term (match from start, case-insensitive)
  const filteredOptions = searchTerm
    ? options.filter(option => {
        const label = getOptionLabel(option).toLowerCase();
        return label.startsWith(searchTerm.toLowerCase());
      })
    : options;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option) => {
    onChange(getOptionValue(option));
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleInputClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        // Focus input when opening
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    }
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    if (!isOpen) setIsOpen(true);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
    setIsOpen(false);
  };

  return (
    <div 
      className={`${styles.container} ${className} ${error ? styles.hasError : ''}`} 
      ref={containerRef}
    >
      <div className={styles.inputWrapper} onClick={handleInputClick}>
        <input
          ref={inputRef}
          type="text"
          className={`${styles.input} ${disabled ? styles.disabled : ''}`}
          placeholder={isOpen ? searchPlaceholder : placeholder}
          value={isOpen ? searchTerm : getDisplayText()}
          onChange={handleInputChange}
          disabled={disabled}
          readOnly={!isOpen}
        />
        <div className={styles.indicators}>
          {value && !disabled && (
            <button
              type="button"
              className={styles.clearButton}
              onClick={handleClear}
              tabIndex={-1}
            >
              ×
            </button>
          )}
          <span className={`${styles.arrow} ${isOpen ? styles.arrowOpen : ''}`}>
            ▼
          </span>
        </div>
      </div>

      {isOpen && (
        <div className={styles.dropdown}>
          {filteredOptions.length > 0 ? (
            <ul className={styles.optionsList}>
              {filteredOptions.map((option, index) => {
                const optionValue = getOptionValue(option);
                const optionLabel = getOptionLabel(option);
                const isSelected = optionValue === value;

                return (
                  <li
                    key={optionValue || index}
                    className={`${styles.option} ${isSelected ? styles.selected : ''}`}
                    onClick={() => handleSelect(option)}
                  >
                    {optionLabel}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className={styles.noResults}>
              No results found
            </div>
          )}
        </div>
      )}

      {error && <div className={styles.errorMessage}>{error}</div>}
    </div>
  );
}

export default SearchableSelect;
