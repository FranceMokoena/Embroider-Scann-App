import axios from 'axios';

const BASE_URL = 'http://localhost:5001/api';

async function testSetup() {
  console.log('🧪 Testing Desktop Backend Setup...\n');

  try {
    // Test 1: Health Check
    console.log('1. Testing health check...');
    const healthResponse = await axios.get('http://localhost:5001/');
    console.log('✅ Health check passed:', healthResponse.data.status);
    console.log('   Version:', healthResponse.data.version);
    console.log('   Timestamp:', healthResponse.data.timestamp);
    console.log('');

    // Test 2: Admin Login
    console.log('2. Testing admin login...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    console.log('✅ Admin login successful');
    console.log('   Username:', loginResponse.data.user.username);
    console.log('   Role:', loginResponse.data.user.role);
    console.log('   Token received:', loginResponse.data.token ? 'Yes' : 'No');
    console.log('');

    const token = loginResponse.data.token;

    // Test 3: Get Profile
    console.log('3. Testing profile retrieval...');
    const profileResponse = await axios.get(`${BASE_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Profile retrieval successful');
    console.log('   Username:', profileResponse.data.user.username);
    console.log('   Email:', profileResponse.data.user.email);
    console.log('');

    // Test 4: Test admin routes (without mobile token - should fail gracefully)
    console.log('4. Testing admin routes (without mobile backend token)...');
    try {
      await axios.get(`${BASE_URL}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Admin route protection working correctly');
        console.log('   Expected error: Mobile backend token required');
      } else {
        console.log('❌ Unexpected error:', error.response?.data);
      }
    }
    console.log('');

    // Test 5: Test messaging routes
    console.log('5. Testing messaging routes...');
    const unreadResponse = await axios.get(`${BASE_URL}/messaging/unread-count`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Messaging routes accessible');
    console.log('   Unread messages:', unreadResponse.data.unreadMessages);
    console.log('   Unread notifications:', unreadResponse.data.unreadNotifications);
    console.log('');

    console.log('🎉 All tests passed! Desktop backend is working correctly.');
    console.log('');
    console.log('📋 Next steps:');
    console.log('   1. Configure your mobile backend API key in .env');
    console.log('   2. Ensure your mobile backend is running on the configured URL');
    console.log('   3. Test with actual mobile backend token');
    console.log('   4. Start building your desktop admin frontend');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('');
      console.log('🔧 Troubleshooting:');
      console.log('   1. Make sure the desktop backend is running: npm run dev');
      console.log('   2. Check if port 5001 is available');
      console.log('   3. Verify the server started without errors');
    }
    
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Error:', error.response.data.error);
    }
  }
}

// Run the test
testSetup();

