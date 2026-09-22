import fetch from 'node-fetch';

const testData = {
  title: 'Mr',
  first_name: 'Sardar Muhammad Hassan',
  surname: 'Zaman',
  middle_name: 'Test',
  preferred_name: 'Hassan',
  date_of_birth: '1990-01-01',
  nationality: 'Pakistani',
  ni_number: 'AB 12 34 56 C',
  personal_email: 'sardar@example.com',
  work_email: 'sardar@evereco.com',
  mobile_number: '+44 7000 000000',
  home_telephone: '+44 1234 567890',
  address_line_1: '123 Main Street',
  address_line_2: 'Apt 4',
  city_town: 'London',
  postcode: 'SW1A 1AA',
  country: 'United Kingdom'
};

async function test() {
  try {
    const response = await fetch('http://localhost:5000/api/employees/1/personal', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBldmVyZWNvLmNvbSIsIm5hbWUiOiJBZG1pbiIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTcyMjAxNjk4Nn0.4x6BLa72L9qZp0z1VVqKVQv8jVcQs9E1rkT7jfCqQ0s'
      },
      body: JSON.stringify(testData)
    });

    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Response:', text);
    
    try {
      const json = JSON.parse(text);
      console.log('Parsed JSON:', JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('Response body (raw):', text);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
