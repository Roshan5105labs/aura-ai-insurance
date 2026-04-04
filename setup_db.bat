@echo off
set PGPASSWORD=root
set PAGER=
set PSQL=C:\Program Files\PostgreSQL\16\bin\psql.exe

echo === Checking existing users ===
"%PSQL%" -U postgres -h localhost -p 5432 -c "\du" 2>&1

echo.
echo === Creating aura_user if not exists ===
"%PSQL%" -U postgres -h localhost -p 5432 -c "DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='aura_user') THEN CREATE USER aura_user WITH PASSWORD 'root'; END IF; END $$;"

echo.
echo === Creating aura_db if not exists ===
"%PSQL%" -U postgres -h localhost -p 5432 -c "SELECT 1 FROM pg_database WHERE datname='aura_db'" | findstr "1 row" >nul 2>&1
if errorlevel 1 (
    "%PSQL%" -U postgres -h localhost -p 5432 -c "CREATE DATABASE aura_db OWNER aura_user;"
    echo aura_db created.
) else (
    echo aura_db already exists.
)

echo.
echo === Granting privileges ===
"%PSQL%" -U postgres -h localhost -p 5432 -d aura_db -c "GRANT ALL PRIVILEGES ON DATABASE aura_db TO aura_user;"
"%PSQL%" -U postgres -h localhost -p 5432 -d aura_db -c "GRANT ALL ON SCHEMA public TO aura_user;"

echo.
echo === Testing aura_user connection ===
set PGPASSWORD=root
"%PSQL%" -U aura_user -h localhost -p 5432 -d aura_db -c "SELECT 'Connection OK' as status;"

echo.
echo === DONE ===
