---
description: Fetch Dubai weather and create an SVG weather card (adapted from claude-code-best-practice)
---

# Weather Orchestrator Command

Fetch the current temperature for Dubai, UAE and create a visual SVG weather card.
This is an OpenCode adaptation of the claude-code-best-practice orchestration demo
(Command -> Agent -> Skill pattern).

## Execution Contract (non-negotiable)

You MUST complete this command by delegating to the `weather-agent` subagent via the
**subagent tool**. You are forbidden from:

- Fetching weather data yourself via webfetch, bash, or any HTTP/API tool
- Skipping Step 1 (the user's unit preference is required input to the agent)
- Calling `weather-svg-creator` before the agent returns a temperature

If you cannot invoke the subagent tool, stop and report the error to the user. Do not improvise.

## Workflow

### Step 1: Ask User Preference

Use the **question tool** to ask the user whether they want the temperature in Celsius or
Fahrenheit. Capture the selected unit before proceeding.

### Step 2: Fetch Weather Data via Subagent

Use the **subagent** tool to invoke the weather agent:

- agent: `weather-agent`
- description: Fetch Dubai weather data
- prompt: Fetch the current temperature for Dubai, UAE in [unit requested by user]. Return
  the numeric temperature value and unit. The agent loads the detailed instructions from the
  `weather-fetcher` skill.

Wait for the agent to complete and capture the returned temperature value and unit.

**Fail-closed guardrail**: If the agent does not return a numeric temperature and unit, DO
NOT proceed to Step 3. Report the failure to the user and stop. No silent fallback.

### Step 3: Create SVG Weather Card

Use the **skill tool** to load the `weather-svg-creator` skill, then follow it:

- skill id: `weather-svg-creator`

The skill will use the temperature value and unit from Step 2 (available in the current
context) to create the SVG card and write output files.

## Output Summary

Provide a clear summary to the user showing:

- Temperature unit requested
- Temperature fetched from Dubai
- SVG card created at `orchestration-workflow/weather.svg`
- Summary written to `orchestration-workflow/output.md`
