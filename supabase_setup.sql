-- Sakhi (सखी) — Supabase PostgreSQL Database Setup
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Create Users Table
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "email" TEXT UNIQUE NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "ageRange" TEXT,
    "typicalCycleLength" INTEGER DEFAULT 28,
    "typicalPeriodLength" INTEGER DEFAULT 5,
    "onboardingCompleted" BOOLEAN DEFAULT false,
    "isDemo" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Cycles Table
CREATE TABLE IF NOT EXISTS "Cycle" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "startDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "endDate" TIMESTAMP WITH TIME ZONE,
    "cycleEndDate" TIMESTAMP WITH TIME ZONE,
    "lengthDays" INTEGER,
    "periodDays" INTEGER,
    "isOngoing" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_cycle_user_start" ON "Cycle"("userId", "startDate");

-- 3. Create Daily Logs Table
CREATE TABLE IF NOT EXISTS "DailyLog" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "date" TIMESTAMP WITH TIME ZONE NOT NULL,
    "isPeriodDay" BOOLEAN DEFAULT false,
    "flowIntensity" TEXT,
    "crampSeverity" INTEGER,
    "moodPrimary" TEXT,
    "moodIntensity" INTEGER,
    "energyLevel" TEXT,
    "sleepHours" REAL,
    "sleepQuality" INTEGER,
    "bedTime" TEXT,
    "wakeTime" TEXT,
    "waterIntakeMl" INTEGER,
    "exerciseMinutes" INTEGER,
    "exerciseType" TEXT,
    "caffeineCups" INTEGER,
    "stressLevel" INTEGER,
    "mealsStatus" TEXT,
    "bloodPressureStatus" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "unique_user_date" UNIQUE ("userId", "date")
);

-- 4. Create Log Symptoms Table
CREATE TABLE IF NOT EXISTS "LogSymptom" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "dailyLogId" TEXT NOT NULL REFERENCES "DailyLog"("id") ON DELETE CASCADE,
    "symptomName" TEXT NOT NULL,
    "severity" INTEGER DEFAULT 1
);

-- 5. Create Detected Patterns Table
CREATE TABLE IF NOT EXISTS "DetectedPattern" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "observation" TEXT NOT NULL,
    "severity" TEXT DEFAULT 'NORMAL',
    "detectedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN DEFAULT true,
    "metadata" TEXT
);

-- 6. Create Conversations & Messages Table
CREATE TABLE IF NOT EXISTS "Conversation" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "title" TEXT DEFAULT 'Wellness Discussion',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Message" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "conversationId" TEXT NOT NULL REFERENCES "Conversation"("id") ON DELETE CASCADE,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "structuredJson" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Create Blood Pressure Logs Table
CREATE TABLE IF NOT EXISTS "BloodPressureLog" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "date" DATE NOT NULL,
    "time" TEXT NOT NULL,
    "systolic" INTEGER NOT NULL,
    "diastolic" INTEGER NOT NULL,
    "pulse" INTEGER,
    "feltFluctuations" BOOLEAN DEFAULT false,
    "fluctuationType" TEXT DEFAULT 'none',
    "symptoms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "posture" TEXT DEFAULT 'Sitting',
    "notes" TEXT,
    "category" TEXT NOT NULL,
    "cycleDay" INTEGER,
    "cyclePhase" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_bp_user_date" ON "BloodPressureLog"("userId", "date");

