# Priorities

test mailchimp composio integration

test running tools on behalf of users
test scheduled workflows
create agents with specific tools enabled

show enabled tools in chat (and what needs to be enabled)(poe like, does something need to be connected)
User record should be created right after sign up, not after initial chat message.

- llm switching via llm gateway
- switch to llm gateway rather than anthropic provider to get better rate limits?
  get observability up

make account switcher

upload and chat with text documents

## Features

- let people search via combobox for agents
- let ppl toggle which agents they see
- have a document view where ppl can see their documents and chat with them

  - link documents to chats so they can select the doc and resume (or just have something that just shows doc previews for chat convos with an associated document)

- fix up UI and make it pretty
- add posthog analytics
- add token tracking usage
- make organizations
- Make admin dashboard
- Restrict creation of agents to admin (and give them control over who can use it)

- guest or demo mode without login req

store org id for agent configs

- then for ppl part of the org they can select them
- for admins of the org they can display them `

- add web search tool

## Tasks

- make default general agent if no others are selected
- make sure it says no agents if there are none

1. add indicator as to which agent was used to generate responses in the UI
2. ensure system prompts can be 50+ pages (load in from files stored in vercel blob)
3. @ mention agents within input

# Bugs

Agent switch in artifact page
