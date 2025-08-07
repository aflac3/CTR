# Contributing to CivicTrustRegistry

Thank you for your interest in contributing to the CivicTrustRegistry project! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contributing Guidelines](#contributing-guidelines)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Security](#security)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Create a new branch for your feature/fix
4. Make your changes
5. Test your changes
6. Submit a pull request

## Development Setup

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Python 3.8+ (for some scripts)
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/civic-trust-registry.git
cd civic-trust-registry

# Install dependencies
npm install

# Copy environment file
cp env.example .env

# Compile contracts
npm run compile
```

### Environment Configuration

1. Copy `env.example` to `.env`
2. Update the environment variables with your configuration
3. Never commit the `.env` file to version control

## Contributing Guidelines

### Before You Start

1. Check existing issues and pull requests
2. Discuss major changes in an issue first
3. Ensure your changes align with the project's goals

### Commit Messages

Use conventional commit messages:

```
feat: add new feature
fix: resolve bug
docs: update documentation
style: formatting changes
refactor: code refactoring
test: add or update tests
chore: maintenance tasks
```

### Branch Naming

Use descriptive branch names:

- `feature/description-of-feature`
- `fix/description-of-bug`
- `docs/description-of-docs`
- `refactor/description-of-refactor`

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- test/CivicTrustRegistry.test.js

# Run with coverage
npm run coverage
```

### Writing Tests

- Write tests for all new functionality
- Ensure tests cover edge cases
- Use descriptive test names
- Follow the existing test patterns

## Pull Request Process

1. **Update Documentation**: Update README.md and other relevant documentation
2. **Add Tests**: Ensure new code is covered by tests
3. **Check Style**: Run linting and formatting checks
4. **Update CHANGELOG**: Add entry to CHANGELOG.md
5. **Submit PR**: Create pull request with clear description

### PR Checklist

- [ ] Code follows the style guidelines
- [ ] Self-review completed
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] CHANGELOG updated
- [ ] No breaking changes (or documented if necessary)

## Code Style

### TypeScript/JavaScript

- Use TypeScript for new code
- Follow ESLint configuration
- Use Prettier for formatting
- Prefer `const` over `let`
- Use meaningful variable names

### Solidity

- Follow Solidity style guide
- Use NatSpec comments
- Implement proper access control
- Add events for important state changes
- Use SafeMath or Solidity 0.8+ arithmetic

### General

- Write clear, readable code
- Add comments for complex logic
- Keep functions small and focused
- Use meaningful names for variables and functions

## Security

### Security Guidelines

- Never commit private keys or sensitive data
- Follow security best practices
- Use proper access controls
- Implement proper validation
- Consider gas optimization

### Reporting Security Issues

If you discover a security vulnerability, please:

1. **Do not** create a public issue
2. Email security@civictrust.org
3. Include detailed information about the vulnerability
4. Allow time for response before public disclosure

## Getting Help

- Check existing documentation
- Search existing issues
- Create a new issue if needed
- Join our community discussions

## License

By contributing to this project, you agree that your contributions will be licensed under the MIT License. 