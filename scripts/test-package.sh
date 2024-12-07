#!/bin/bash

# test-package.sh - Test package installation in clean environment
set -e

# Create temporary directory
TEMP_DIR=$(mktemp -d)
echo "Created temp directory: $TEMP_DIR"

cleanup() {
    echo "Cleaning up temporary directory..."
    rm -rf "$TEMP_DIR"
}

trap cleanup EXIT

# Copy package files to temp directory
echo "Copying package files..."
cp -r ./* "$TEMP_DIR/"

# Create test project
TEST_DIR="$TEMP_DIR/test-project"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# Initialize test project
echo "Initializing test project..."
npm init -y

# Install the package
echo "Installing package from parent directory..."
npm install "$TEMP_DIR"

# Create test file
echo "Creating test file..."
cat > test.js << EOL
const { SearchEngine } = require('@obinexuscomputing/nexus-search');

async function test() {
    const engine = new SearchEngine({
        name: 'test-engine',
        version: 1,
        fields: ['title', 'content']
    });

    try {
        await engine.initialize();
        console.log('Successfully initialized SearchEngine');
        return true;
    } catch (error) {
        console.error('Failed to initialize SearchEngine:', error);
        return false;
    }
}

test().then(success => process.exit(success ? 0 : 1));
EOL

# Run test
echo "Running test..."
node test.js