-- Drop tables if they exist (clean slate)
DROP TABLE IF EXISTS marks_config;
DROP TABLE IF EXISTS sadhana_entries;
DROP TABLE IF EXISTS users;

-- Create users table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    user_role VARCHAR(50) DEFAULT 'devotee',
    user_group VARCHAR(50) DEFAULT 'Yudhisthir',
    voice_name VARCHAR(100) DEFAULT 'Vrindavan',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create sadhana_entries table
CREATE TABLE sadhana_entries (
    id INT PRIMARY KEY AUTO_INCREMENT,
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
    book_name VARCHAR(255),
    reflections TEXT,
    temp_hall_rech TIME,
    time_wasted TIME,
    to_bed INT DEFAULT 0,
    wake_up INT DEFAULT 0,
    day_rest_marks INT DEFAULT 0,
    body_marks INT DEFAULT 0,
    body_percent INT DEFAULT 0,
    soul_marks INT DEFAULT 0,
    soul_percent INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_date (user_id, entry_date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create marks_config table
CREATE TABLE marks_config (
    id INT PRIMARY KEY AUTO_INCREMENT,
    voice_name VARCHAR(100) NOT NULL UNIQUE,
    config_data JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
