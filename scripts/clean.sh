#!/bin/bash
set -e

echo "🧹 Cleaning AEGIS project..."

rm -rf node_modules
rm -rf dist
rm -rf coverage
rm -rf .turbo

echo "✅ Cleaned successfully"