# CTR Development Environment Setup Guide

## 🚀 Quick Setup

### Prerequisites
1. **Node.js** (v18 or higher)
2. **Python** (v3.8 or higher)
3. **Git** (for version control)

## 📦 Installation Steps

### 1. Install Node.js
```bash
# Download from https://nodejs.org/
# Or use a package manager:

# Windows (Chocolatey)
choco install nodejs

# Windows (Scoop)
scoop install nodejs

# macOS (Homebrew)
brew install node

# Linux (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Install Python
```bash
# Download from https://python.org/
# Or use a package manager:

# Windows (Chocolatey)
choco install python

# Windows (Scoop)
scoop install python

# macOS (Homebrew)
brew install python

# Linux (Ubuntu/Debian)
sudo apt-get install python3 python3-pip
```

### 3. Install Dependencies
```bash
# Install Node.js dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt
```

## 🧪 Testing the Setup

### Run the Test Script
```bash
node test_setup.js
```

### Test Individual Components
```bash
# Test the demo
npm run demo

# Test the CLI
npm run cli -- --help

# Test key generation (requires Python)
npm run keys:generate
```

## 🔧 Environment Verification

### Check Node.js
```bash
node --version
npm --version
```

### Check Python
```bash
python --version
pip --version
```

### Check Dependencies
```bash
# Node.js dependencies
npm list

# Python dependencies
pip list
```

## 🐛 Troubleshooting

### Common Issues

#### Node.js not found
- Ensure Node.js is installed and in PATH
- Restart terminal after installation
- Check with `where node` (Windows) or `which node` (Unix)

#### Python not found
- Ensure Python is installed and in PATH
- Try `python3` instead of `python`
- Check with `where python` (Windows) or `which python` (Unix)

#### Permission Errors
- Run as administrator (Windows)
- Use `sudo` (Unix/Linux)
- Check file permissions

#### Module Not Found Errors
- Run `npm install` again
- Clear npm cache: `npm cache clean --force`
- Delete `node_modules` and reinstall

## 📁 Project Structure
```
CTR/
├── contracts/           # Smart contracts
├── test/               # Test files
├── integration/        # Integration components
├── ctr_registry.ts     # Local registry
├── edai_issuer.ts     # EDAI issuer
├── ctr_fallback_log.ts # Fallback logging
├── registry_cli.ts     # CLI interface
├── ctr_registry_key.py # Key management
├── demo-dashboard.js   # Demo application
├── package.json        # Node.js dependencies
└── requirements.txt    # Python dependencies
```

## 🎯 Ready to Use

Once setup is complete, you can:

1. **Run the demo**: `npm run demo`
2. **Use the CLI**: `npm run cli -- submit -r "test" -b "breach" -h "hash"`
3. **Generate keys**: `npm run keys:generate`
4. **Test contracts**: `npm run test`
5. **Compile contracts**: `npm run compile`

## 📞 Support

If you encounter issues:
1. Check this guide first
2. Verify all prerequisites are installed
3. Run `node test_setup.js` for diagnostics
4. Check the console output for specific error messages 