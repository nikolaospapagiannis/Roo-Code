# Project-Specific Claude Instructions - Roo-Code

## MANDATORY VERIFICATION PROTOCOL - ZERO TOLERANCE

### ABSOLUTE RULES - NO EXCEPTIONS

**Rule #1: NO MOCKS, NO FAKES, NO PLACEHOLDERS**
- If you write `// TODO`, the feature is NOT complete
- If you use in-memory Maps for "database", it's FAKE
- If you use `console.log` for "monitoring", it's NOT REAL
- If you use hardcoded responses for "AI", it's FAKE

**Rule #2: TEST BEFORE CLAIMING**
- You MUST run tests BEFORE saying anything is "complete"
- You MUST show test output, not describe tests
- You MUST verify with REAL services (database, Redis, etc.)
- You MUST check environment BEFORE writing code

**Rule #3: EVIDENCE REQUIRED**
Every completion claim MUST include:
1. Test output showing X/Y passed
2. Database/service verification (queries, docker ps, etc.)
3. Actual error messages if failed
4. Files created with purpose
5. Known limitations

### BEFORE Writing ANY Code:

```bash
# MANDATORY environment check:
docker ps                    # What's running?
docker inspect [container]   # What credentials?
ls -la .env                  # What config exists?
```

### AFTER Writing Code, BEFORE Claiming Completion:

```bash
# MANDATORY verification:
pnpm test [test-file]        # Run the tests
docker exec [db] [query]     # Verify data exists
curl [endpoint]              # Verify API works
```

### FORBIDDEN Phrases (Zero Tolerance):

❌ "This should work..."
❌ "The implementation is complete..."
❌ "I've created the files..."
❌ "The error proves it's working..."
❌ "You just need to set up..."
❌ "It's integrated with..."
❌ "The service is ready..."
❌ "Fortune 100 ready"
❌ "Production ready"
❌ "Enterprise grade"

### REQUIRED Evidence Format:

```markdown
## Feature: [Name]

### Status: ✅ VERIFIED (X/Y tests passing) or ❌ BROKEN

### Test Execution:
```
[paste ACTUAL test command and output]
```

### Service Verification:
```
[paste docker ps / database query / API response]
```

### Files Created:
- [filepath]: [what it does]

### What Actually Works:
- [specific capability with evidence]

### Known Issues:
- [any failures or limitations]
```

### USER COMMANDS - Immediate Compliance Required:

| Command | Your Action |
|---------|-------------|
| **VERIFY** | Stop. Run tests. Show output. No excuses. |
| **PROOF** | Show evidence right now or admit you don't have it. |
| **TEST FIRST** | Check environment, run tests, then report. |
| **ENVIRONMENT** | Run docker ps, inspect, check .env before coding. |
| **HONEST STATUS** | Admit exactly what works vs what's claimed. |
| **ZERO TOLERANCE** | No mocks, no fakes, no TODOs - real implementation only. |

### Completion Checklist (ALL Required):

- [ ] Environment checked (docker ps, services running)
- [ ] Code written
- [ ] Tests written
- [ ] **Tests RUN and output captured**
- [ ] Real services verified (database queries, API calls)
- [ ] Evidence collected (screenshots, command outputs)
- [ ] Limitations documented
- [ ] **THEN and ONLY THEN**: Report to user

### The "Show Me" Test:

Before claiming ANYTHING, ask:

**"If user said 'show me proof RIGHT NOW', what would I show?"**

- "Here are files I created" → ❌ NOT COMPLETE
- "Here's test output: 8/9 passed" → ✅ COMPLETE
- "Let me run tests first..." → ❌ NOT COMPLETE
- "The error indicates..." → ❌ NOT COMPLETE

### Recovery When Caught Lying:

1. **Admit immediately**: "You're right, I didn't test it"
2. **Test immediately**: Run the actual verification
3. **Show output**: Paste full command output
4. **Fix if broken**: No excuses, just fix
5. **Update checklist**: Add scenario to prevent repeating

### Project-Specific Rules for Roo-Code:

**Database Integration:**
- PostgreSQL container: `postgres` (port 5432, password: `password`)
- Redis container: `redis` (port 6379)
- MUST verify with: `docker exec postgres psql -U postgres -d exai_guard -c 'SELECT * FROM users;'`

**Test Execution:**
- MUST run from `src/` directory
- MUST use: `pnpm vitest run [test-file]`
- MUST show pass/fail count

**Bundle Verification:**
- MUST run: `pnpm bundle`
- MUST check size: `ls -lh dist/extension.js`
- Target: < 5MB (currently 31.23MB)

**No Fake Implementations:**
- ❌ Maps for database → ✅ Prisma with PostgreSQL
- ❌ console.log for monitoring → ✅ Prometheus metrics
- ❌ Hardcoded for AI → ✅ Actual model calls
- ❌ setTimeout for queues → ✅ Real Redis/BullMQ
- ❌ In-memory for sessions → ✅ Redis + PostgreSQL

### Enforcement Examples:

**❌ WRONG:**
```
User: Implement caching
Me: I've implemented Redis caching with CacheService. The service integrates with...
```

**✅ CORRECT:**
```
User: Implement caching
Me: Checking environment...
[runs docker ps]
Redis running on port 6379 ✓

Implementing...
[writes code + tests]

Verifying...
```bash
$ pnpm vitest run cache.spec.ts
✓ 5/5 tests passed
```

Redis verification:
```bash
$ docker exec redis redis-cli SET test "works"
OK
$ docker exec redis redis-cli GET test
"works"
```

Files:
- src/services/CacheService.ts (Redis wrapper, 150 lines)
- src/services/__tests__/cache.spec.ts (5 tests)

Status: ✅ VERIFIED COMPLETE
```

### Zero Tolerance Tracking:

If caught making unverified claims:
- **1st time**: Warning + immediate verification
- **2nd time**: Re-verify ALL recent claims
- **3rd time**: Stop and create verification script for that feature type
- **4+ times**: Assume NOTHING works, verify everything from scratch

### The Ultimate Question:

**"Can the user run a single command RIGHT NOW to verify this works?"**

- If NO → Don't claim it's done
- If YES → Provide that command with expected output

---

## Remember:

**"Working" means USER can verify it NOW, not "it will work when..."**

**Evidence first. Claims second. No exceptions.**
