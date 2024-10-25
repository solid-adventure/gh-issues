#!/usr/bin/env node
const { execSync } = require('child_process');
const { Command } = require('commander');
const inquirer = require('inquirer');

const prompt = inquirer.default.prompt || inquirer.prompt;

// Check if gh CLI is installed
const checkGHInstalled = () => {
  try {
    execSync('gh --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    console.error('GitHub CLI (gh) is not installed. Please install it first:');
    console.error('https://cli.github.com/manual/installation');
    process.exit(1);
  }
};

// Get list of collaborators for current repo
const getCollaborators = () => {
  try {
    const collaborators = execSync('gh api repos/:owner/:repo/collaborators --jq ".[].login"', { encoding: 'utf8' })
      .trim()
      .split('\n');
    return collaborators;
  } catch (error) {
    console.error('Failed to fetch collaborators:', error.message);
    return [];
  }
};

const createIssue = async (title, body) => {
  if (!title) {
    const collaborators = getCollaborators();
    const answers = await prompt([
      {
        type: 'input',
        name: 'title',
        message: 'Issue title:',
        validate: input => input.length > 0
      },
      {
        type: 'editor',
        name: 'body',
        message: 'Issue description:'
      },
      {
        type: 'list',
        name: 'assignee',
        message: 'Assign to:',
        choices: ['none', ...collaborators]
      }
    ]);

    title = answers.title;
    body = answers.body;

    try {
      const assigneeFlag = answers.assignee !== 'none' ? `--assignee ${answers.assignee}` : '';
      const command = `gh issue create --title "${title}" --body "${body}" ${assigneeFlag}`;
      const output = execSync(command, { encoding: 'utf8' });
      console.log('Issue created successfully:', output.trim());
    } catch (error) {
      console.error('Failed to create issue:', error.message);
    }
  }
};

// List issues
const listIssues = (state = 'open') => {
  try {
    const command = `gh issue list --state ${state} --limit 30`;
    const output = execSync(command, { encoding: 'utf8' });
    console.log(output);
  } catch (error) {
    console.error('Failed to list issues:', error.message);
  }
};

// View issue details
const viewIssue = (number) => {
  try {
    const command = `gh issue view ${number}`;
    const output = execSync(command, { encoding: 'utf8' });
    console.log(output);
  } catch (error) {
    console.error('Failed to view issue:', error.message);
  }
};

// Comment on an issue
const commentIssue = async (number) => {
  const answers = await prompt([
    {
      type: 'editor',
      name: 'body',
      message: 'Comment:'
    }
  ]);

  try {
    const command = `gh issue comment ${number} --body "${answers.body}"`;
    execSync(command, { stdio: 'inherit' });
    console.log('Comment added successfully!');
  } catch (error) {
    console.error('Failed to add comment:', error.message);
  }
};

// CLI program definition
const cli = new Command();

cli
  .name('ghi')
  .description('Quick GitHub issue management')
  .version('1.0.0');

cli
  .command('create')
  .description('Create a new issue')
  .argument('[title]', 'Issue title')
  .argument('[body]', 'Issue body')
  .action(createIssue);

cli
  .command('list')
  .description('List repository issues')
  .option('-s, --state <state>', 'Issue state (open/closed/all)', 'open')
  .action((options) => listIssues(options.state));

cli
  .command('view')
  .description('View issue details')
  .argument('<number>', 'Issue number')
  .action(viewIssue);

cli
  .command('comment')
  .description('Comment on an issue')
  .argument('<number>', 'Issue number')
  .action(commentIssue);

// Check for gh CLI before running
checkGHInstalled();
cli.parse(process.argv);