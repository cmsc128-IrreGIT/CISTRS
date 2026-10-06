# CISTRS Quality Checker

The CISTRS project uses automated checks to catch code quality, type, and formatting problems before changes are committed.

Run all checks from the project root:

```powershell
npm run check
```

## Checks

The checker currently runs **5 checks**:

| Check               | Purpose                                          | Auto-fix? |
| ------------------- | ------------------------------------------------ | --------- |
| Frontend ESLint     | Checks frontend code quality and common mistakes | ✅ Some   |
| Backend ESLint      | Checks backend code quality and common mistakes  | ✅ Some   |
| Frontend TypeScript | Checks frontend type errors                      | ❌ Manual |
| Backend TypeScript  | Checks backend type errors                       | ❌ Manual |
| Frontend Build      | Checks whether the frontend builds successfully  | ❌ Manual |
| Backend Build       | Checks whether the backend builds successfully   | ❌ Manual |
| Prettier            | Checks code formatting                           | ✅ Yes    |

---

## ESLint

ESLint checks for code quality problems such as unused variables, undefined variables, and rule violations.

If ESLint reports an error, try the automatic fixer:

```powershell
npm run lint:fix
```

ESLint can only automatically fix issues that are considered safe. Remaining errors must be fixed manually.

---

## TypeScript

Typechecking catches incorrect type usage, such as passing the wrong type to a function or accessing properties that do not exist.

TypeScript errors generally require **manual fixes**.

Read the error message and check the reported file and line.

After fixing:

```powershell
npm run check
```

---

## Builds

Build checks verify that both the frontend and backend can successfully compile for production.

### Frontend Build

The frontend build runs TypeScript compilation and the Vite production build.

### Backend Build

The backend build runs TypeScript compilation.

Build errors generally require **manual fixes**.

---

## Prettier

Prettier automatically formats the project's code consistently.

The project uses **4 spaces for indentation**.

The checker only checks formatting. It does not modify files.

If Prettier reports formatting problems, run:

```powershell
npm run format:write
```

Then verify:

```powershell
npm run check
```

To check formatting only:

```powershell
npm run format:check
```

---

## Useful Commands

### Check everything

```powershell
npm run check
```

Checks all 5 quality requirements without modifying files.

### Fix formatting

```powershell
npm run format:write
```

Automatically formats supported project files with Prettier.

### Fix ESLint issues

```powershell
npm run lint:fix
```

Automatically fixes ESLint issues that can be safely corrected.

### Recommended workflow

```text
1. Make changes
       ↓
2. npm run check
       ↓
3. Fix reported issues
       ↓
4. npm run check
       ↓
5. Commit
```

## Important

`npm run check` is a **check-only command**. It should not modify your code.

Use `format:write` and `lint:fix` explicitly when you want automatic fixes.

Additional checks such as builds, tests, Knip, Prisma validation, and security auditing can be added later.
