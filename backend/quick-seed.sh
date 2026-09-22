#!/bin/bash

# Quick manual seed using curl
API="http://localhost:5000/api"

# Login and get token
echo "🔐 Logging in..."
LOGIN=$(curl -s -X POST $API/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@evereco.com","password":"Change123!"}')

TOKEN=$(echo $LOGIN | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "✅ Got token"

# Employee 1: Sardar Muhammad Hassan Zaman (ID 1)
echo "📝 Seeding Sardar Muhammad Hassan Zaman..."
curl -s -X PUT "$API/employees/1/employment" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "employment_type": "Full-time",
    "employment_start_date": "2023-01-15",
    "employment_end_date": "",
    "contracted_weekly_hours": 37.5,
    "normal_working_days": "Mon-Fri",
    "normal_working_hours": "09:00-17:30",
    "annual_leave_entitlement": 28,
    "probation_period": "3 months",
    "notice_period": "1 month",
    "normal_place_of_work": "Head Office",
    "job_title": "Operations Executive",
    "department": "Operations",
    "job_description": "Responsible for operational management and day-to-day business activities.",
    "employment_status": "Active",
    "annual_salary": 34000,
    "hourly_rate": "",
    "payment_frequency": "Monthly",
    "salary_effective_date": "2023-01-15"
  }' | grep -q "error" && echo "❌ Error" || echo "✅ Success"

# Employee 2: Muhammad Nabeel (ID 2)
echo "📝 Seeding Muhammad Nabeel..."
curl -s -X PUT "$API/employees/2/employment" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "employment_type": "Full-time",
    "employment_start_date": "2023-03-20",
    "employment_end_date": "",
    "contracted_weekly_hours": 37.5,
    "normal_working_days": "Mon-Fri",
    "normal_working_hours": "09:00-17:30",
    "annual_leave_entitlement": 28,
    "probation_period": "3 months",
    "notice_period": "1 month",
    "normal_place_of_work": "Head Office",
    "job_title": "Compliance Coordinator",
    "department": "HR & Compliance",
    "job_description": "Manages HR compliance and regulatory requirements across the organization.",
    "employment_status": "Active",
    "annual_salary": 36000,
    "hourly_rate": "",
    "payment_frequency": "Monthly",
    "salary_effective_date": "2023-03-20"
  }' | grep -q "error" && echo "❌ Error" || echo "✅ Success"

echo "🎉 Seeding complete!"
