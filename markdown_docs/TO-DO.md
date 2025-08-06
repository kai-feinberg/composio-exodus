# Priorities

tool switching in new tab

- tool return parsing

only add as connection if it goes through

limit agent switching modal size (display just top 5 and limit width)

1. enable specific tools (ie twitter bookmarks). May require custom DB table with col for toolkit (ie TWITTER) col for tool name/slug(ie TWITTER_BOOKMARKS_BY_USER) and description. Then can have agents with col linking to specific rows in the tools table. Then when getting the tools in composio.ts we can get the tools by their slug
2. add more tool kit options (YT, reddit, etc)
3. configure to give agents access to only specific tools. Dynamic tool loading via a small llm to select what is needed?
4. model switching

Later:

1. model switching and configuration for agents. Check out new models like Kimi2 with great tool calling as well as super fast models and gpt 5. ENABLE REASONING MODELS
2. observability
3. cron job example workflow
4. multi agent capability
5. artifacts/canvas

Tool call parsing:

- just extract the relevant data that you want so the context window is not clogged.
- https://docs.composio.dev/docs/modifiers/after-execution

get tool schemas: slugs, input parameters, output parameters

- https://docs.composio.dev/api-reference/tools/get-tools

Fetching specific tools
https://docs.composio.dev/docs/fetching-tools

Observability:

- langfuse or posthog

Models:

- https://vercel.com/ai-gateway/models

Tell the agent not to be stupid and request too many items otherwise it'll fill up its entire context window.

@ mention agents
RAG test with pinecone

fix mailchimp composio integration

enable vs disable different tools in tool kits and assign tools to agent configs

test running tools on behalf of users
test scheduled workflows (Cron jobs): https://vercel.com/docs/cron-jobs/quickstart

- literally just define an api route and adjust config
- how to protect api routes though?

observability: https://langfuse.com/integrations/frameworks/vercel-ai-sdk

create agents with specific tools enabled (not just toolkits but specific toosl)

create list of tools from tool kits and args/parameters

show enabled tools in chat (and what needs to be enabled)(poe like, does something need to be connected)

- llm switching via llm gateway
- switch to llm gateway rather than anthropic provider to get better rate limits?
  get observability up

make account switcher

upload and chat with text documents

create n8n esc editor in react flow to build out the workflows?

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
