-- Insert test users
INSERT INTO users (id, name, email, password, user_role, user_group, voice_name) VALUES 
(1, 'System Developer', 'dev@sadhna.com', '$2b$10$N9qo8uLOickgx2ZMRZoMy.MrAJqLqY5ZR3qXcXqXcXqXcXqXcXqX', 'developer', 'Sahdev', 'All'),
(2, 'Test Devotee', 'test@test.com', '$2b$10$N9qo8uLOickgx2ZMRZoMy.MrAJqLqY5ZR3qXcXqXcXqXcXqXcXqX', 'devotee', 'Yudhisthir', 'Vrindavan');

-- Insert default marks configuration
INSERT INTO marks_config (voice_name, config_data) VALUES ('all', '{
    "rules": {
        "soul": [
            {"id": "hearing", "name": "Hearing", "type": "boolean", "maxMarks": 5, "conditions": [{"operator": ">", "value": 0, "marks": 5}]},
            {"id": "reading", "name": "Reading", "type": "boolean", "maxMarks": 5, "conditions": [{"operator": ">", "value": 0, "marks": 5}]},
            {"id": "cleanliness", "name": "Cleanliness", "type": "boolean", "maxMarks": 5, "conditions": [{"operator": "=", "value": 1, "marks": 5}]},
            {"id": "morningClass", "name": "Morning Class", "type": "boolean", "maxMarks": 5, "conditions": [{"operator": "=", "value": 1, "marks": 5}]},
            {"id": "mangalaArti", "name": "Mangala Arti", "type": "boolean", "maxMarks": 5, "conditions": [{"operator": "=", "value": 1, "marks": 5}]},
            {"id": "chantingEnd", "name": "Chanting End", "type": "time", "maxMarks": 25, "conditions": [
                {"operator": "<=", "value": "06:45", "marks": 25},
                {"operator": "<=", "value": "09:00", "marks": 20},
                {"operator": "<=", "value": "13:00", "marks": 15},
                {"operator": "<=", "value": "16:00", "marks": 10},
                {"operator": "<=", "value": "20:00", "marks": 5}
            ]}
        ],
        "body": [
            {"id": "earlyWakeup", "name": "Early Wakeup", "type": "time", "maxMarks": 25, "conditions": [
                {"operator": "<=", "value": "04:30", "marks": 25},
                {"operator": "<=", "value": "05:00", "marks": 20},
                {"operator": "<=", "value": "05:30", "marks": 15},
                {"operator": "<=", "value": "06:00", "marks": 10},
                {"operator": "<=", "value": "06:30", "marks": 5}
            ]},
            {"id": "earlyToBed", "name": "Early to Bed", "type": "time", "maxMarks": 25, "conditions": [
                {"operator": "<=", "value": "21:30", "marks": 25},
                {"operator": "<=", "value": "22:00", "marks": 20},
                {"operator": "<=", "value": "22:30", "marks": 15},
                {"operator": "<=", "value": "23:00", "marks": 10},
                {"operator": "<=", "value": "23:30", "marks": 5}
            ]},
            {"id": "dayRest", "name": "Day Rest", "type": "duration", "maxMarks": 25, "conditions": [
                {"operator": "<=", "value": 30, "marks": 25},
                {"operator": "<=", "value": 45, "marks": 20},
                {"operator": "<=", "value": 60, "marks": 15},
                {"operator": "<=", "value": 75, "marks": 10},
                {"operator": "<=", "value": 90, "marks": 5}
            ]}
        ],
        "japa": [
            {"id": "japaRounds", "name": "Japa Rounds", "type": "slab", "maxMarks": 25, "conditions": [
                {"operator": ">=", "value": 16, "marks": 25},
                {"operator": ">=", "value": 15, "marks": 20},
                {"operator": ">=", "value": 14, "marks": 15},
                {"operator": ">=", "value": 13, "marks": 10},
                {"operator": ">=", "value": 12, "marks": 5}
            ]}
        ]
    }
}');
