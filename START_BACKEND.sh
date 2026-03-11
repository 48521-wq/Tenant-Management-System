#!/bin/bash
echo "========================================"
echo "  TMS Backend Starting..."
echo "========================================"
cd backend
echo "Installing packages..."
npm install
echo ""
echo "Starting server..."
npm start
