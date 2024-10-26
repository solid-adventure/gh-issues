#!/usr/bin/env node
const { execSync } = require('child_process');
const { Command } = require('commander');
const inquirer = require('inquirer');
const Anthropic = require('@anthropic-ai/sdk');

const prompt = inquirer.default.prompt || inquirer.prompt;

// Initialize Anthropic client
let anthropic;
try {
  anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
} catch (error) {
  console.error('Failed to initialize Anthropic client:', error.message);
}

// Helper function to escape shell arguments
const escapeShellArg = (arg) => {
  return `'${arg.replace(/'/g, "'\\''")}'`;
};

// Check if gh CLI is installed
const checkGHInstalled = () => {
  try {
    execSync('gh --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    console.error('GitHub CLI (gh) is not installed. Please install it first:');
    console.error('https://cli.github.com');
    process.exit(1);
  }
};

// List issues with formatted output
const listIssues = (state = 'open') => {
  try {
    // Get issues in JSON format for easier parsing
    const command = `gh issue list --state ${state} --limit 30 --json number,title,state,createdAt`;
    const result = execSync(command, { encoding: 'utf8' });
    const issues = JSON.parse(result);

    // Format and print header
    console.log('\n' +
      'DATE       ' +
      'ID    ' +
      'STATE   ' +
      'TITLE'
    );
    console.log('─'.repeat(80));

    // Format and print each issue
    issues.forEach(issue => {
      const date = new Date(issue.createdAt)
        .toISOString()
        .split('T')[0];

      const number = `#${issue.number}`;
      const state = issue.state.toUpperCase();
      const title = issue.title;

      console.log(
        date + '  ' +
        number.padEnd(6) +
        state.padEnd(8) +
        (title.length > 70 ? title.substring(0, 67) + '...' : title)
      );
    });
    console.log(); // Empty line at the end
  } catch (error) {
    console.error('Failed to list issues:', error.message);
  }
};

const viewIssue = (number) => {
  try {
    // First get the URL
    const urlCommand = `gh issue view ${number} --json url`;
    const urlResult = JSON.parse(execSync(urlCommand, { encoding: 'utf8' }));

    // Then get the full issue details
    const command = `gh issue view ${number}`;
    const output = execSync(command, { encoding: 'utf8' });

    console.log(output);
    console.log(`\n--\n${urlResult.url}\n`);
  } catch (error) {
    console.error('Failed to view issue:', error.message);
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

// Generate issue body using Anthropic API
const generateIssueBody = async (title) => {
  if (!anthropic) {
    console.error('Anthropic client not initialized. Please set ANTHROPIC_API_KEY environment variable.');
    return null;
  }

  try {
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: `Write a brief GitHub issue description for the following title: "${title}".
                  Include sections for:
                  - Problem/Feature description
                  - Proposed solution
                  Format in Markdown, but don't wrap in code blocks.`
      }]
    });

    return message.content[0].text;
  } catch (error) {
    console.error('Failed to generate issue body:', error.message);
    return null;
  }
};

const createIssue = async (title, body, options) => {
  let finalBody = body;
  let finalTitle = title;
  const collaborators = getCollaborators();

  try {
    // If title is provided but no body, and --ai flag is set, generate body
    if (title && options.ai) {
      console.log('Generating issue description...');
      finalBody = await generateIssueBody(title);
      if (!finalBody) {
        console.error('Failed to generate issue description. Falling back to manual input.');
      }
    }

    // Always prompt with editor for AI-generated content
    if (options.ai) {
      const questions = [
        {
          type: 'editor',
          name: 'body',
          message: 'Issue description (generated content):',
          default: finalBody || ''
        },
        {
          type: 'list',
          name: 'assignee',
          message: 'Assign to:',
          choices: ['none', ...collaborators]
        }
      ];

      const answers = await prompt(questions);
      finalBody = answers.body;

      const assigneeFlag = answers.assignee !== 'none' ? `--assignee ${answers.assignee}` : '';
      const command = `gh issue create --title ${escapeShellArg(finalTitle)} --body ${escapeShellArg(finalBody)} ${assigneeFlag}`;
      const output = execSync(command, { encoding: 'utf8' });
      console.log('Issue created successfully:', output.trim());
    } else {
      // Handle non-AI case
      if (!finalTitle || !finalBody) {
        const questions = [];

        if (!finalTitle) {
          questions.push({
            type: 'input',
            name: 'title',
            message: 'Issue title:',
            validate: input => input.length > 0
          });
        }

        if (!finalBody) {
          questions.push({
            type: 'editor',
            name: 'body',
            message: 'Issue description:'
          });
        }

        questions.push({
          type: 'list',
          name: 'assignee',
          message: 'Assign to:',
          choices: ['none', ...collaborators]
        });

        const answers = await prompt(questions);

        finalTitle = finalTitle || answers.title;
        finalBody = finalBody || answers.body;

        const assigneeFlag = answers.assignee !== 'none' ? `--assignee ${answers.assignee}` : '';
        const command = `gh issue create --title ${escapeShellArg(finalTitle)} --body ${escapeShellArg(finalBody)} ${assigneeFlag}`;
        const output = execSync(command, { encoding: 'utf8' });
        console.log('Issue created successfully:', output.trim());
      } else {
        const command = `gh issue create --title ${escapeShellArg(finalTitle)} --body ${escapeShellArg(finalBody)}`;
        const output = execSync(command, { encoding: 'utf8' });
        console.log('Issue created successfully:', output.trim());
      }
    }
  } catch (error) {
    console.error('Failed to create issue:', error.message);
  }
};

// Rest of the code remains the same...

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
  .option('--ai', 'Generate issue body using AI')
  .action((title, body, options) => {
    createIssue(title, body, options)
      .catch(error => {
        console.error('Error:', error);
        process.exit(1);
      });
  });

cli
  .command('list')
  .description('List repository issues')
  .argument('[state]', 'Issue state (open/closed/all)', 'open')
  .action((state) => listIssues(state));

cli
  .command('view')
  .description('View issue details')
  .argument('<number>', 'Issue number')
  .action(viewIssue);

// Check for gh CLI before running
checkGHInstalled();
cli.parse(process.argv);

// Prevent the script from exiting before promises resolve
process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
  process.exit(1);
});