// After random-shot-probe.js and a reload: *Continue* brings the memory of recent shots back from the save.
const results = [];
const report = (ok, what, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${what}${detail ? `  (${detail})` : ''}`);
await until(() => w.__start().begun, 10000);
await wait(500);
const before = JSON.parse(localStorage.getItem('random-shot-probe') ?? '[]');
localStorage.removeItem('random-shot-probe');
const now = w.__save.recentShots();
report(now.length === 4 && JSON.stringify(now) === JSON.stringify(before), 'continued: the memory as saved', `${now.length} shots`);
return results;
