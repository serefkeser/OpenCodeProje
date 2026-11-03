---
description: Displays the current time in Pakistan Standard Time (PKT, UTC+5) via the time-agent subagent (adapted from claude-code-best-practice)
subtask: true
agent: time-agent
---

Display the current date and time in Pakistan Standard Time (PKT, UTC+5).

Run this exact bash command and return its output:

```
TZ='Asia/Karachi' date '+%Y-%m-%d %H:%M:%S %Z'
```

Return the result in this format:

```
Current Time in Pakistan (PKT): YYYY-MM-DD HH:MM:SS PKT
```

Requirements: always use the `Asia/Karachi` timezone (UTC+5), 24-hour format, include the
date alongside the time, keep the output concise. No other side effects.
