# GitHub Issues CLI

An unofficial command-line tool creating GitHub issues with AI descriptions.

## Features

- Create issues for the GitHub repo of your current directory
- Optional + Editable AI descriptions using Claude 3.5 Sonnet
- List open, closed, or all issues
- View detailed issue information
- Assign issues to collaborators

## Prerequisites

- Node.js v16 or higher
- GitHub CLI (`gh`) installed and authenticated
- Anthropic API key (optional, for AI-generated descriptions)

## Installation

1. Clone the repository:
```bash
gh repo clone solid-adventure/gh-issues
cd gh-issues
```

2. Install dependencies:
```bash
npm install
```

3. Make the CLI executable:
```bash
chmod +x index.js
```

4. Set up your Anthropic API key and alias by adding these lines to your `~/.zshrc` (or equivalent shell config):
```bash

# To use the Anthropic API for AI-generated descriptions, set your API key
export ANTHROPIC_API_KEY='your-api-key-here'

# Add the ghi alias
# To learn your path, run `pwd` in the gh-issues directory
alias ghi='node /path/to/gh-issues/index.js'

```
Then reload your shell configuration:
```bash
source ~/.zshrc
```


## Usage

List open issues:
```bash
# Default is open issues
ghi list
```
```
DATE       ID    STATE   TITLE
────────────────────────────────────────────────────────────────────────────────
2024-10-25  #3    OPEN    Second Demo Issue
2024-10-25  #1    OPEN    demo

```

List closed issues:
```bash
ghi list closed
```

List all issues:
```bash
ghi list all
```


Create an issue with an AI-generated starter description:
```bash
# Your text editor will open with a description generated for you
ghi create "Issue title" --ai
```

Basic issue creation:
```bash
# Your text editor will open with a blank description
ghi create "Issue title"
```


### View Issue Details

```bash
ghi view <issue-number>
```

### Support
This project is not associated or authorized in any by GitHub or Anthropic. If you need help, please open an issue in this repository and we'll try to give you a hand as (limited) time allows. If only there were a CLI tool for that...



## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
