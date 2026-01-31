# Quick Enforcement Commands - Zero Tolerance

Copy-paste these commands when you need to enforce verification:

---

## 🚨 EMERGENCY STOP COMMANDS

### `VERIFY`
**Stops AI immediately and forces test execution**

Expected Response:
```bash
Testing now...

$ pnpm test [file]
[actual output]

Status: X/Y passed
```

---

### `PROOF`
**Demands evidence right now, no excuses**

Expected Response:
```markdown
### Test Output:
[paste actual output]

### Service Verification:
[paste database query or docker ps]
```

---

### `TEST FIRST`
**Prevents any claims until tests are run**

Expected Response:
```bash
1. Checking environment...
$ docker ps

2. Running tests...
$ pnpm test

3. Results: [output]
```

---

### `ENVIRONMENT`
**Forces environment check before coding**

Expected Response:
```bash
$ docker ps
[containers running]

$ docker inspect [container] | grep PASSWORD
PASSWORD=xxx

$ cat .env
[configuration]
```

---

### `HONEST STATUS`
**Demands truth about what actually works**

Expected Response:
```markdown
## Honest Assessment

Claimed: Feature X complete
Reality:
✅ Code exists (200 lines)
❌ Tests failing (3/5)
❌ Database not connected

Bottom Line: 40% complete, NOT ready
```

---

### `ZERO TOLERANCE`
**Nuclear option - verify EVERYTHING claimed in session**

Expected Response:
```markdown
Verifying all claims...

Claim 1: "Database integration" → Testing...
❌ FAKE (using Maps, not Prisma)

Claim 2: "Redis caching" → Testing...
✅ VERIFIED (5/5 tests pass)

Claim 3: "Auth middleware" → Testing...
⚠️ PARTIAL (implemented but not tested)

Summary: 1 real, 1 fake, 1 untested
```

---

### `CLEAN SLATE`
**Deletes all fake/mock implementations**

Expected Response:
```bash
Removing fake implementations...

Deleted:
- src/FakeDatabase.ts (Map-based storage)
- src/MockAI.ts (hardcoded responses)
- src/MemoryCache.ts (in-memory cache)

Remaining real implementations:
- src/RealDatabase.ts (Prisma + PostgreSQL)
- src/RedisCache.ts (ioredis)

Status: 2 real services, all fakes removed
```

---

## 📋 QUICK CHECKS

### Before Starting Work:
```bash
docker ps                     # What's running?
docker inspect [container]    # Credentials?
cat .env                      # Configuration?
```

### Before Claiming Complete:
```bash
pnpm test [file]              # Tests pass?
docker exec [db] [query]      # Data exists?
curl [endpoint]               # API works?
```

### When Suspicious:
```bash
grep -r "TODO" src/           # Any TODOs?
grep -r "Map<" src/           # Fake databases?
grep -r "console.log" src/    # Fake monitoring?
```

---

## 🎯 QUICK VERIFICATION TEMPLATE

Use this to quickly verify a feature:

```bash
# 1. Environment
docker ps | grep [service]

# 2. Tests
pnpm test [feature].spec.ts

# 3. Data
docker exec postgres psql -U postgres -d [db] -c "SELECT count(*) FROM [table];"

# 4. API (if applicable)
curl localhost:[port]/[endpoint]

# 5. Logs
docker logs [container] | tail -20
```

---

## 💾 SAVE THESE ALIASES (Optional)

Add to your `.bashrc` or `.zshrc`:

```bash
# Claude verification helpers
alias claude-verify='echo "VERIFY" && pnpm test'
alias claude-proof='docker ps && pnpm test && docker exec postgres psql -U postgres -c "\dt"'
alias claude-env='docker ps && docker inspect postgres | grep PASSWORD && cat .env'
alias claude-clean='find src -name "*Mock*" -o -name "*Fake*" -o -name "*TODO*"'
```

---

## 🔍 DETECTION PATTERNS

### Fake Database:
```bash
grep -r "Map<.*User.*>" src/
grep -r "private.*Map" src/
```

### Fake Monitoring:
```bash
grep -r "console.log" src/ | grep -v test
```

### TODOs:
```bash
grep -r "TODO\|FIXME\|HACK" src/
```

### Hardcoded Values:
```bash
grep -r "if.*hardcoded\|mock\|fake" src/ -i
```

---

## 🚦 TRAFFIC LIGHT SYSTEM

### 🟢 GREEN (Verified)
- Tests run and passed
- Real services connected
- Data persists
- Evidence provided

### 🟡 YELLOW (Suspicious)
- Code exists but not tested
- Tests written but not run
- Claims without evidence
- "Should work" language

### 🔴 RED (Fake)
- Uses Map for database
- console.log for monitoring
- TODO comments
- Hardcoded responses
- No tests at all

---

## 📞 ESCALATION LADDER

### Level 1: Gentle Reminder
```
"Did you test this?"
```

### Level 2: Demand Proof
```
"PROOF"
```

### Level 3: Force Verification
```
"VERIFY"
```

### Level 4: Complete Audit
```
"ZERO TOLERANCE"
```

### Level 5: Nuclear Option
```
"CLEAN SLATE"
```

---

## 🎓 TEACHING MODE

If AI keeps lying, use this:

```markdown
Let's practice the verification protocol.

Task: Implement a simple cache service

Now walk me through:
1. What environment checks will you do FIRST?
2. How will you verify it works?
3. What evidence will you collect?
4. What command can I run to verify it myself?

Only AFTER you answer these, start coding.
```

---

## 🎯 ONE-LINER COMMANDS

Copy-paste these into chat:

```
VERIFY
```
```
PROOF
```
```
TEST FIRST
```
```
ENVIRONMENT
```
```
HONEST STATUS
```
```
ZERO TOLERANCE
```
```
CLEAN SLATE
```

---

## 📊 SESSION AUDIT TEMPLATE

At end of session, paste this:

```markdown
## Session Audit

Features Claimed: [list]

For each feature:
- [ ] Tests run? (show output)
- [ ] Real services? (show docker ps)
- [ ] Data persists? (show query)
- [ ] User can verify? (provide command)

Overall Grade:
✅ Verified: X features
⚠️ Partial: Y features
❌ Fake: Z features
```

---

**Remember: These commands enforce ZERO TOLERANCE for unverified claims.**

Use them liberally. Don't let AI get away with "should work" or "just need to set up".

**Evidence or it didn't happen.**
