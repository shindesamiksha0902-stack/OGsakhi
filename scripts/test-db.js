const { createClient } = require('@supabase/supabase-js');

const url = 'https://onvuybestyadmekdzmws.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9udXV5YmVzdHlhZG1la2R6bXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5Mzc2OTYsImV4cCI6MjEwNjUxMzY5Nn0.q3WqdQfIl1YahzobNRIrLVgmvAezeo3HV2ZmrHp1hHc';

const supabase = createClient(url, anonKey);

async function test() {
  try {
    console.log('Testing Supabase connection...');
    const { data, error } = await supabase.from('User').select('*').limit(1);
    if (error) {
      console.log('Supabase responded with code:', error.code, 'message:', error.message, 'details:', error);
    } else {
      console.log('Connection successful! Query data:', data);
    }
  } catch (err) {
    console.error('Fetch error:', err, 'cause:', err.cause);
  }
  process.exit(0);
}

test();
