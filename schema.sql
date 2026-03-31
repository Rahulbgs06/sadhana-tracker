-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    user_role VARCHAR(50) DEFAULT 'devotee',
    user_group VARCHAR(50),
    voice_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create sadhana_entries table
CREATE TABLE IF NOT EXISTS sadhana_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    voice_name VARCHAR(100),
    entry_date DATE NOT NULL,
    wakeup_time TIME,
    rounds INT DEFAULT 0,
    chanting_end_time TIME,
    hearing_minutes INT DEFAULT 0,
    reading_minutes INT DEFAULT 0,
    study_minutes INT DEFAULT 0,
    day_rest_minutes INT DEFAULT 0,
    sleep_time TIME,
    morning_class TINYINT DEFAULT 0,
    mangala_aarti TINYINT DEFAULT 0,
    cleanliness TINYINT DEFAULT 0,
    book_name TEXT,
    reflections TEXT,
    temp_hall_rech TIME,
    time_wasted TIME,
    to_bed INT,
    wake_up INT,
    day_rest_marks INT,
    body_marks INT,
    body_percent INT,
    soul_marks INT,
    soul_percent INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create marks_config table
CREATE TABLE IF NOT EXISTS marks_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    voice_name VARCHAR(100) NOT NULL,
    config_data JSON NOT NULL,
    is_active TINYINT DEFAULT 1,
    created_by INT,
    updated_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Create marks_config_history table
CREATE TABLE IF NOT EXISTS marks_config_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_id INT NOT NULL,
    changed_by INT NOT NULL,
    old_config JSON,
    new_config JSON NOT NULL,
    change_reason TEXT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (config_id) REFERENCES marks_config(id),
    FOREIGN KEY (changed_by) REFERENCES users(id)
);

-- Insert default dev user (for testing)
INSERT INTO users (name, email, password, user_role, voice_name, user_group) 
VALUES ('Dev User', 'dev@sadhna.com', '$2a$10$YourHashHere', 'developer', 'All', 'Sahdev')
ON DUPLICATE KEY UPDATE id=id;

-- Show tables created
SHOW TABLES;
