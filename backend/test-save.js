const request = require('supertest');
const app = require('./server');

async function testSaveSadhana() {
  console.log('=== TESTING SAVE SADHANA ===\n');
  
  // First login
  console.log('1. Logging in...');
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'dev@sadhna.com',
      password: 'admin123'
    });
  
  console.log('Login status:', loginRes.statusCode);
  const token = loginRes.body.token;
  console.log('Token received:', token ? 'Yes' : 'No');
  
  if (!token) {
    console.log('Login failed:', loginRes.body);
    return;
  }
  
  // Test data with proper formats
  const testData = {
    date: new Date().toISOString().split('T')[0],
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
  };
  
  console.log('\n2. Sending test data:', JSON.stringify(testData, null, 2));
  
  // Send request
  const response = await request(app)
    .post('/api/sadhana')
    .set('Authorization', `Bearer ${token}`)
    .send(testData);
  
  console.log('\n3. Response status:', response.statusCode);
  console.log('4. Response body:', JSON.stringify(response.body, null, 2));
  
  if (response.statusCode === 500) {
    console.log('\n❌ ERROR DETAILS:');
    console.log('Error message:', response.body.error);
    console.log('SQL Message:', response.body.sqlMessage);
    console.log('SQL:', response.body.sql);
  }
}

testSaveSadhana();
