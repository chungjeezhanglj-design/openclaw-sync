# Errors Log

Records command failures, exceptions, and errors for later analysis and fixes.

## Format

```markdown
## [ERR-YYYYMMDD-XXX] skill_or_command_name

**Logged**: ISO-8601 timestamp
**Priority**: high
**Status**: pending
**Area**: frontend | backend | infra | tests | docs | config

### Summary
Brief description of what failed

### Error
```
Actual error message
```

### Context
- Command/operation attempted
- Input or parameters used

### Suggested Fix
If identifiable

### Metadata
- Reproducible: yes | no | unknown
- Related Files: path/to/file.ext

---
```

## Entries

<!-- New entries appended below -->

---
