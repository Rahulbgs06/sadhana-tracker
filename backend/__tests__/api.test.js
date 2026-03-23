process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../server');
describe('Sadhana Tracker API Tests', () => {
  
  // Test 1: Health Check
  test('GET /api/health - should return OK', async () => {
    const response = await request(app).get('/api/health');
    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('OK');
  });

  // Test 2: Login with valid credentials
  test('POST /api/auth/login - valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'dev@sadhna.com',
        password: 'admin123'
      });
    expect(response.statusCode).toBe(200);
    expect(response.body.token).toBeDefined();
  });

  // Test 3: Login with invalid password
  test('POST /api/auth/login - invalid password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'dev@sadhna.com',
        password: 'wrongpassword'
      });
    expect(response.statusCode).toBe(401);
  });

  // Test 4: Register new user
  test('POST /api/auth/register - new user', async () => {
    const uniqueEmail = `test${Date.now()}@test.com`;
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: uniqueEmail,
        password: 'password123',
        voice: 'Vrindavan',
        group: 'Yudhisthir'
      });
    expect(response.statusCode).toBe(201);
  });

  // Test 5: Duplicate registration
  test('POST /api/auth/register - duplicate email', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'dev@sadhna.com',
        password: 'password123',
        voice: 'Vrindavan',
        group: 'Yudhisthir'
      });
    expect(response.statusCode).toBe(400);
  });

  // Test 6: Get voices list
  test('GET /api/voices - should return voices', async () => {
    const response = await request(app).get('/api/voices');
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  // Test 7: Get groups list
  test('GET /api/groups - should return groups', async () => {
    const response = await request(app).get('/api/groups');
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  // Test 8: Save sadhana entry with cleanup
test('POST /api/sadhana - valid entry', async () => {
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'dev@sadhna.com',
      password: 'admin123'
    });
  
  const token = loginRes.body.token;
  const today = new Date().toISOString().split('T')[0];
  
  // Cleanup any existing entry for today
  await request(app)
    .delete(`/api/sadhana?date=${today}`)
    .set('Authorization', `Bearer ${token}`);
  
  // Now insert new entry
  const response = await request(app)
    .post('/api/sadhana')
    .set('Authorization', `Bearer ${token}`)
    .send({
      date: today,
      wakeup: '04:30:00',
      rounds: 16,
      chantEnd: '06:30:00',
      hearing: 30,
      reading: 20,
      study: 10,
      dayRestMinutes: 15,
      sleep: '21:30:00',
      temp_hall_rech: '05:00:00',
      time_wasted: 10,
      morning_class: '1',
      mangala_aarti: '1',
      cleanliness: '1',
      book_name: 'Test Book',
      reflections: 'Test reflections'
    });
  
  expect(response.statusCode).toBe(200);
  expect(response.body.success).toBe(true);
});
  // Test 9: Get dashboard report
  test('GET /api/dashboard/report - weekly', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'dev@sadhna.com',
        password: 'admin123'
      });
    
    const token = loginRes.body.token;
    
    const response = await request(app)
      .get('/api/dashboard/report?voice=All&type=weekly')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  // Test 10: Group report
  test('GET /api/reports/group - All voices', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'dev@sadhna.com',
        password: 'admin123'
      });
    
    const token = loginRes.body.token;
    const startDate = '2024-01-01';
    const endDate = '2024-12-31';
    
    const response = await request(app)
      .get(`/api/reports/group?voice=All&start=${startDate}&end=${endDate}`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.statusCode).toBe(200);
  });

  // Test 11: Leaderboard
  test('GET /api/leaderboard - current month', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'dev@sadhna.com',
        password: 'admin123'
      });
    
    const token = loginRes.body.token;
    
    const response = await request(app)
      .get('/api/leaderboard?month=current')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.statusCode).toBe(200);
  });

  // Test 12: Search sadhana
  test('GET /api/search - by date', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'dev@sadhna.com',
        password: 'admin123'
      });
    
    const token = loginRes.body.token;
    const today = new Date().toISOString().split('T')[0];
    
    const response = await request(app)
      .get(`/api/search?date=${today}&voice=All`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.statusCode).toBe(200);
  });
});

afterAll(async () => {
  console.log('🧹 Cleaning up...');
  
  // Wait a moment for any pending operations
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Get the pool from app and close it
  const { pool } = require('../server');
  if (pool && pool.end) {
    await pool.end();
    console.log('✅ Database pool closed');
  }
});
